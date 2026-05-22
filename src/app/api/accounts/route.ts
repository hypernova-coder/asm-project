import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// Helper: Calculate RT/HR with team leader and supervisor support
// Kept for backward compatibility — the split logic below replaces per-employee rate calculation
function calcRtPerHour(
  totalWorkingHours: number,
  isTeamLeaderForSite: boolean,
  isSupervisorForSite: boolean,
  isCustom: boolean,
  customRtPerHour: number,
  threshold: number = 1000
): number {
  if (isCustom) return customRtPerHour;
  const hasBonus = isTeamLeaderForSite || isSupervisorForSite;
  if (totalWorkingHours >= threshold) {
    return hasBonus ? 5.5 : 5.0;
  }
  return hasBonus ? 3.0 : 2.5;
}

// ---------------------------------------------------------------------------
// Types used during the split calculation
// ---------------------------------------------------------------------------

interface RawEmployeeEntry {
  empId: string;
  empName: string;
  employeeCode: string;
  nationality: string;
  trade: string;
  isTeamLeader: boolean;
  isSupervisor: boolean;
  teamLeaderSiteId: string | null;
  supervisorSiteId: string | null;
  hoursThreshold: number;
  siteId: string;
  siteName: string;
  // findMany — there can be "standard" AND "premium" records for the same emp+site+month
  salaryRecords: Awaited<ReturnType<typeof db.salaryRecord.findMany>>;
  isManual: boolean;
}

interface SplitDecision {
  rateTier: 'standard' | 'premium';
  hours: number;
  rate: number;
}

interface FinalEmployeeEntry {
  empId: string;
  empName: string;
  employeeCode: string;
  nationality: string;
  trade: string;
  isTeamLeader: boolean;
  isSupervisor: boolean;
  rateTier: 'standard' | 'premium';
  salaryRecord: Record<string, unknown> | null;
  workingHours: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// GET handler — with basic / premium hour split
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month'); // YYYY-MM format
    const yearParam = searchParams.get('year'); // integer

    if (!month) {
      return NextResponse.json(
        { success: false, error: 'month query parameter is required (YYYY-MM format)' },
        { status: 400 }
      );
    }

    // Validate month format
    const monthRegex = /^\d{4}-\d{2}$/;
    if (!monthRegex.test(month)) {
      return NextResponse.json(
        { success: false, error: 'month must be in YYYY-MM format' },
        { status: 400 }
      );
    }

    const year = yearParam ? parseInt(yearParam, 10) : parseInt(month.split('-')[0], 10);
    if (isNaN(year)) {
      return NextResponse.json(
        { success: false, error: 'year must be a valid integer' },
        { status: 400 }
      );
    }

    // -----------------------------------------------------------------------
    // 1. Get all active sites + activated sites for the month
    // -----------------------------------------------------------------------
    const activeSites = await db.site.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });

    const activatedSites = await db.siteMonthActivation.findMany({
      where: { month, year },
      include: {
        site: {
          select: { id: true, name: true, clientName: true, projectName: true, isActive: true },
        },
      },
    });
    const activatedSiteIds = new Set(activatedSites.map(a => a.siteId));

    const allSiteIds = new Set([...activeSites.map(s => s.id), ...activatedSiteIds]);
    const sitesToProcess = activeSites.filter(s => allSiteIds.has(s.id));

    // -----------------------------------------------------------------------
    // 2. Collect raw employee data per site (parallel)
    // -----------------------------------------------------------------------
    const siteRawData = await Promise.all(
      sitesToProcess.map(async (site) => {
        const rawEntries: RawEmployeeEntry[] = [];

        // 2a. Get distinct employees from EmpCountSitePerMonth
        const empRecords = await db.empCountSitePerMonth.findMany({
          where: { siteId: site.id, month, deletedDate: null },
          include: {
            employee: {
              select: {
                id: true,
                fullName: true,
                employeeId: true,
                trade: true,
                nationality: true,
                isTeamLeader: true,
                teamLeaderSiteId: true,
                isSupervisor: true,
                supervisorSiteId: true,
                hoursThreshold: true,
              },
            },
          },
          orderBy: { empName: 'asc' },
        });

        const seenEmpIds = new Set<string>();
        for (const record of empRecords) {
          if (seenEmpIds.has(record.empId)) continue;
          seenEmpIds.add(record.empId);

          const emp = record.employee;

          // Use findMany — could have "standard" AND "premium" records
          const salaryRecords = await db.salaryRecord.findMany({
            where: {
              empId: record.empId,
              siteId: site.id,
              month,
              year,
              isDeleted: false,
            },
          });

          rawEntries.push({
            empId: record.empId,
            empName: emp.fullName || record.empName,  // Always use latest from Employee table
            employeeCode: emp.employeeId,
            nationality: emp.nationality || '',
            trade: emp.trade || '',
            isTeamLeader: emp.isTeamLeader,
            isSupervisor: emp.isSupervisor,
            teamLeaderSiteId: emp.teamLeaderSiteId,
            supervisorSiteId: emp.supervisorSiteId,
            hoursThreshold: emp.hoursThreshold || 1000,
            siteId: site.id,
            siteName: site.name,
            salaryRecords,
            isManual: false,
          });
        }

        // 2b. Manual salary records (not in EmpCountSitePerMonth)
        const manualSalaryRecords = await db.salaryRecord.findMany({
          where: {
            siteId: site.id,
            month,
            year,
            isDeleted: false,
            empId: { notIn: Array.from(seenEmpIds) },
          },
        });

        for (const manualRecord of manualSalaryRecords) {
          const empInfo = await db.employee.findUnique({
            where: { id: manualRecord.empId },
            select: {
              fullName: true,
              employeeId: true,
              nationality: true,
              trade: true,
              isTeamLeader: true,
              teamLeaderSiteId: true,
              isSupervisor: true,
              supervisorSiteId: true,
              hoursThreshold: true,
            },
          });

          rawEntries.push({
            empId: manualRecord.empId,
            empName: empInfo?.fullName || manualRecord.empName,  // Always use latest from Employee table
            employeeCode: empInfo?.employeeId || manualRecord.employeeCode || '',
            nationality: empInfo?.nationality || manualRecord.nationality || '',
            trade: empInfo?.trade || manualRecord.trade || '',
            isTeamLeader: empInfo?.isTeamLeader ?? false,
            isSupervisor: empInfo?.isSupervisor ?? false,
            teamLeaderSiteId: empInfo?.teamLeaderSiteId ?? null,
            supervisorSiteId: empInfo?.supervisorSiteId ?? null,
            hoursThreshold: empInfo?.hoursThreshold || 1000,
            siteId: site.id,
            siteName: site.name,
            salaryRecords: [manualRecord],
            isManual: true,
          });
        }

        return { site, rawEntries };
      })
    );

    // -----------------------------------------------------------------------
    // 3. Batch-fetch aggregate working-hours for every employee
    // -----------------------------------------------------------------------
    const allEmpIds = new Set<string>();
    for (const { rawEntries } of siteRawData) {
      for (const entry of rawEntries) {
        allEmpIds.add(entry.empId);
      }
    }

    const allWhRecords = await db.totalEmployeeWorkingHours.findMany({
      where: { empId: { in: Array.from(allEmpIds) }, isDeleted: false },
    });

    // Group working-hours records by empId
    const whByEmpId = new Map<string, typeof allWhRecords>();
    for (const rec of allWhRecords) {
      if (!whByEmpId.has(rec.empId)) whByEmpId.set(rec.empId, []);
      whByEmpId.get(rec.empId)!.push(rec);
    }

    // Build per-employee hours info
    const employeeHoursInfo = new Map<
      string,
      {
        aggregateTotal: number;
        previousAggregate: number;
        currentMonthHours: number;
        allRecords: typeof allWhRecords;
        hasCustomRate: boolean;
        latestRtPerHour: number;
      }
    >();

    for (const empId of allEmpIds) {
      const records = whByEmpId.get(empId) ?? [];
      const aggregateTotal = records.reduce((s, r) => s + r.totalWorkingHours, 0);
      const previousAggregate = records
        .filter(r => r.month < month)
        .reduce((s, r) => s + r.totalWorkingHours, 0);
      const currentMonthHours = records
        .filter(r => r.month === month)
        .reduce((s, r) => s + r.totalWorkingHours, 0);
      const hasCustomRate = records.some(r => r.isCustom);
      const latestRtPerHour = records.length > 0 ? records[records.length - 1].rtPerHour : 2.5;

      employeeHoursInfo.set(empId, {
        aggregateTotal,
        previousAggregate,
        currentMonthHours,
        allRecords: records,
        hasCustomRate,
        latestRtPerHour,
      });
    }

    // -----------------------------------------------------------------------
    // 4. Group raw entries by employee & sort sites alphabetically per employee
    // -----------------------------------------------------------------------
    const employeeEntriesMap = new Map<string, RawEmployeeEntry[]>();
    for (const { rawEntries } of siteRawData) {
      for (const entry of rawEntries) {
        if (!employeeEntriesMap.has(entry.empId)) {
          employeeEntriesMap.set(entry.empId, []);
        }
        employeeEntriesMap.get(entry.empId)!.push(entry);
      }
    }
    // Sort each employee's entries by site name (alphabetical)
    for (const [, entries] of employeeEntriesMap) {
      entries.sort((a, b) => a.siteName.localeCompare(b.siteName));
    }

    // -----------------------------------------------------------------------
    // 5. Apply the basic / premium split algorithm
    //    KEY: The threshold is CUMULATIVE across all months, NOT per-month.
    //    We use previousAggregate hours to determine remaining threshold.
    //    For entries with existing salary records, we use them directly.
    //    For new entries, we apply the sequential allocation algorithm.
    // -----------------------------------------------------------------------
    const employeeSplitDecisions = new Map<string, Map<string, SplitDecision[]>>();

    for (const [empId, entries] of employeeEntriesMap) {
      const hoursInfo = employeeHoursInfo.get(empId);
      if (!hoursInfo) continue;

      // Get the threshold from the first entry (all entries for same emp have same threshold)
      const threshold = entries[0]?.hoursThreshold || 1000;

      const { previousAggregate } = hoursInfo;

      // KEY: Start consumedThreshold from previous cumulative hours
      // If employee has 800 hrs from previous months and threshold is 1000,
      // only 200 more hrs can be at the low rate in this month
      let consumedThreshold = Math.min(previousAggregate, threshold);

      const empDecisions = new Map<string, SplitDecision[]>();

      for (const entry of entries) {
        // TL / Supervisor bonus applies across all sites
        const hasBonus = entry.isTeamLeader || entry.isSupervisor;
        const basicRate = hasBonus ? 3.0 : 2.5;
        const premiumRate = hasBonus ? 5.5 : 5.0;

        // KEY: If salary records exist, use them directly instead of recalculating split
        if (entry.salaryRecords.length > 0) {
          const decisions: SplitDecision[] = entry.salaryRecords.map(sr => ({
            rateTier: (sr.rateTier === 'premium' ? 'premium' : 'standard') as 'standard' | 'premium',
            hours: sr.totalHours,
            rate: sr.rtPerHour,
          }));
          empDecisions.set(entry.siteId, decisions);
          // Update consumedThreshold based on existing records for consistency
          // (even though we're using saved data, we need accurate tracking for other sites)
          const stdRecord = entry.salaryRecords.find(sr => sr.rateTier === 'standard');
          const premRecord = entry.salaryRecords.find(sr => sr.rateTier === 'premium');
          const stdHours = stdRecord?.totalHours ?? 0;
          const premHours = premRecord?.totalHours ?? 0;
          // Only count low-rate hours toward consumed threshold
          consumedThreshold += stdHours;
          if (consumedThreshold > threshold) consumedThreshold = threshold;
          // If there are also premium hours, threshold is fully consumed
          if (premHours > 0) consumedThreshold = threshold;
          continue;
        }

        // No salary records yet — apply sequential allocation for new entries
        // For new entries without salary records, hours are 0 (user hasn't entered yet)
        // Default to basic rate with 0 hours
        const siteHours = 0;

        const decisions: SplitDecision[] = [];
        decisions.push({ rateTier: 'standard', hours: siteHours, rate: basicRate });

        empDecisions.set(entry.siteId, decisions);
      }

      employeeSplitDecisions.set(empId, empDecisions);
    }

    // -----------------------------------------------------------------------
    // 6. Build final per-site employee entries using the split decisions
    //    KEY FIX: When salary records exist, use saved data directly.
    // -----------------------------------------------------------------------
    const siteFinalEntries = new Map<string, FinalEmployeeEntry[]>();

    for (const { site, rawEntries } of siteRawData) {
      const finalEntries: FinalEmployeeEntry[] = [];

      for (const entry of rawEntries) {
        const hoursInfo = employeeHoursInfo.get(entry.empId);
        const empDecisions = employeeSplitDecisions.get(entry.empId);
        const decisions = empDecisions?.get(entry.siteId);

        if (!decisions || !hoursInfo) continue;

        const {
          allRecords: whRecords,
          aggregateTotal,
          hasCustomRate,
          latestRtPerHour,
        } = hoursInfo;

        const hasBonus = entry.isTeamLeader || entry.isSupervisor;
        const threshold = entry.hoursThreshold || 1000;

        for (const decision of decisions) {
          // Skip entries with zero hours (can happen at boundary)
          if (decision.hours <= 0 && entry.salaryRecords.length === 0) continue;

          // Find a matching salary record for this rateTier
          const matchingRecord = entry.salaryRecords.find(
            sr => sr.rateTier === decision.rateTier
          );

          let salaryRecordData: Record<string, unknown> | null = null;

          if (matchingRecord) {
            // KEY FIX: Use saved salary record data directly — do NOT override with split decisions.
            // The user may have manually edited hours/rate, and we must preserve those edits.
            salaryRecordData = {
              ...matchingRecord,
              // Keep all saved values: totalHours, rtPerHour, totalSalary, etc.
              createdAt: matchingRecord.createdAt.toISOString(),
              updatedAt: matchingRecord.updatedAt.toISOString(),
            };
          } else if (decision.rateTier === 'standard' && entry.salaryRecords.length > 0) {
            // No "standard" record in DB yet, but other records exist.
            // Preserve deduction / advance / isPaid from the first available record.
            const template = entry.salaryRecords.find(sr => sr.rateTier === 'standard')
              ?? entry.salaryRecords[0];
            const computedTotalSalary = decision.hours * decision.rate;
            salaryRecordData = {
              ...template,
              rateTier: 'standard' as const,
              totalHours: decision.hours,
              rtPerHour: decision.rate,
              totalSalary: computedTotalSalary,
              deduction: template.deduction,
              advance: template.advance,
              balanceSalary: computedTotalSalary - template.deduction - template.advance,
              isPaid: template.isPaid,
              createdAt: template.createdAt.toISOString(),
              updatedAt: template.updatedAt.toISOString(),
            };
          } else if (decision.rateTier === 'premium') {
            // Premium entry — 0 deduction / advance by default
            const anyRecord = entry.salaryRecords[0];
            if (anyRecord) {
              const computedTotalSalary = decision.hours * decision.rate;
              salaryRecordData = {
                ...anyRecord,
                rateTier: 'premium' as const,
                totalHours: decision.hours,
                rtPerHour: decision.rate,
                totalSalary: computedTotalSalary,
                deduction: 0,
                advance: 0,
                balanceSalary: computedTotalSalary,
                isPaid: false,
                createdAt: anyRecord.createdAt.toISOString(),
                updatedAt: anyRecord.updatedAt.toISOString(),
              };
            }
            // If no record exists at all, salaryRecordData stays null
          }

          // Build workingHours object
          const workingHoursObj: Record<string, unknown> =
            whRecords.length > 0
              ? {
                  id: whRecords[0].id,
                  empId: entry.empId,
                  empName: entry.empName,
                  totalWorkingHours: aggregateTotal,
                  rtPerHour: hasCustomRate ? latestRtPerHour : decision.rate,
                  isCustom: hasCustomRate,
                  calculatedRtPerHour: decision.rate,
                }
              : {
                  empId: entry.empId,
                  empName: entry.empName,
                  totalWorkingHours: 0,
                  rtPerHour: decision.rate,
                  isCustom: false,
                  calculatedRtPerHour: decision.rate,
                };

          finalEntries.push({
            empId: entry.empId,
            empName: entry.empName,
            employeeCode: entry.employeeCode,
            nationality: entry.nationality,
            trade: entry.trade,
            isTeamLeader: entry.isTeamLeader,
            isSupervisor: entry.isSupervisor,
            rateTier: decision.rateTier,
            salaryRecord: salaryRecordData,
            workingHours: workingHoursObj,
          });
        }
      }

      // Sort: by empName, then standard before premium
      finalEntries.sort((a, b) => {
        const nameCmp = a.empName.localeCompare(b.empName);
        if (nameCmp !== 0) return nameCmp;
        return a.rateTier === 'standard' ? -1 : 1;
      });

      // Assign SL.NO — same SL.NO for split entries of the same employee
      let currentSlNo = 0;
      let lastEmpId = '';
      for (const entry of finalEntries) {
        if (entry.empId !== lastEmpId) {
          currentSlNo++;
          lastEmpId = entry.empId;
        }
        if (entry.salaryRecord && typeof entry.salaryRecord === 'object') {
          entry.salaryRecord.slNo = currentSlNo;
        }
      }

      siteFinalEntries.set(site.id, finalEntries);
    }

    // -----------------------------------------------------------------------
    // 7. Build per-site response objects
    // -----------------------------------------------------------------------
    const siteResults = sitesToProcess.map(site => {
      const finalEntries = siteFinalEntries.get(site.id) ?? [];
      const isActiveForMonth = activatedSiteIds.has(site.id);

      // Totals — sum across ALL entries (including split ones)
      const totalHours = finalEntries.reduce(
        (sum, e) => sum + ((e.salaryRecord as Record<string, unknown>)?.totalHours as number ?? 0),
        0
      );
      const totalSalary = finalEntries.reduce(
        (sum, e) => sum + ((e.salaryRecord as Record<string, unknown>)?.totalSalary as number ?? 0),
        0
      );
      const totalDeductions = finalEntries.reduce(
        (sum, e) => sum + ((e.salaryRecord as Record<string, unknown>)?.deduction as number ?? 0),
        0
      );
      const totalAdvances = finalEntries.reduce(
        (sum, e) => sum + ((e.salaryRecord as Record<string, unknown>)?.advance as number ?? 0),
        0
      );
      const totalBalanceSalary = finalEntries.reduce(
        (sum, e) => sum + ((e.salaryRecord as Record<string, unknown>)?.balanceSalary as number ?? 0),
        0
      );

      // Unique employees (not entries) for the employee count
      const uniqueEmpIds = new Set(finalEntries.map(e => e.empId));

      return {
        site: {
          id: site.id,
          name: site.name,
          clientName: site.clientName,
          projectName: site.projectName,
        },
        employeeCount: uniqueEmpIds.size,
        totalHours,
        totalSalary,
        totalDeductions,
        totalAdvances,
        totalBalanceSalary,
        employees: finalEntries,
        isActivated: isActiveForMonth,
      };
    });

    // Include sites that have employees OR are activated for this month
    const sitesToShow = siteResults.filter(s => s.employeeCount > 0 || s.isActivated);

    // Grand totals
    const grandTotals = {
      totalSites: sitesToShow.length,
      totalEmployees: sitesToShow.reduce((sum, s) => sum + s.employeeCount, 0),
      totalHours: sitesToShow.reduce((sum, s) => sum + s.totalHours, 0),
      totalSalary: sitesToShow.reduce((sum, s) => sum + s.totalSalary, 0),
      totalDeductions: sitesToShow.reduce((sum, s) => sum + s.totalDeductions, 0),
      totalAdvances: sitesToShow.reduce((sum, s) => sum + s.totalAdvances, 0),
      totalBalanceSalary: sitesToShow.reduce((sum, s) => sum + s.totalBalanceSalary, 0),
    };

    return NextResponse.json({
      success: true,
      data: {
        month,
        year,
        sites: sitesToShow,
        grandTotals,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    console.error('[accounts GET] Error:', message);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

// POST: Add sites to a specific month (SiteMonthActivation)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { siteIds, month, year, customSiteName, customClientName, customProjectName } = body;

    if (!month || !year) {
      return NextResponse.json(
        { success: false, error: 'month and year are required' },
        { status: 400 }
      );
    }

    const monthRegex = /^\d{4}-\d{2}$/;
    if (!monthRegex.test(month)) {
      return NextResponse.json(
        { success: false, error: 'month must be in YYYY-MM format' },
        { status: 400 }
      );
    }

    const results = [];

    // Handle custom site creation
    if (customSiteName && typeof customSiteName === 'string' && customSiteName.trim()) {
      const trimmedName = customSiteName.trim();

      // Check if site already exists
      let site = await db.site.findUnique({ where: { name: trimmedName } });

      if (!site) {
        // Create the new site
        site = await db.site.create({
          data: {
            name: trimmedName,
            clientName: typeof customClientName === 'string' ? customClientName.trim() : undefined,
            projectName: typeof customProjectName === 'string' ? customProjectName.trim() : undefined,
            isActive: true,
          },
        });
      }

      // Activate this site for the month
      const activation = await db.siteMonthActivation.upsert({
        where: { siteId_month_year: { siteId: site.id, month, year: parseInt(String(year), 10) } },
        update: {},
        create: {
          siteId: site.id,
          month,
          year: parseInt(String(year), 10),
        },
      });

      results.push({ siteId: site.id, siteName: site.name, activationId: activation.id, isNewSite: true });
    }

    // Handle existing site activations
    if (siteIds && Array.isArray(siteIds)) {
      for (const siteId of siteIds) {
        // Verify site exists
        const site = await db.site.findUnique({ where: { id: siteId } });
        if (!site) continue;

        const activation = await db.siteMonthActivation.upsert({
          where: { siteId_month_year: { siteId, month, year: parseInt(String(year), 10) } },
          update: {},
          create: {
            siteId,
            month,
            year: parseInt(String(year), 10),
          },
        });

        results.push({ siteId, siteName: site.name, activationId: activation.id, isNewSite: false });
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        activated: results.length,
        results,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    console.error('[accounts POST] Error:', message);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

// DELETE: Remove a site activation for a specific month
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const siteId = searchParams.get('siteId');
    const month = searchParams.get('month');
    const yearParam = searchParams.get('year');

    if (!siteId || !month || !yearParam) {
      return NextResponse.json(
        { success: false, error: 'siteId, month, and year are required' },
        { status: 400 }
      );
    }

    const year = parseInt(yearParam, 10);

    const activation = await db.siteMonthActivation.findUnique({
      where: { siteId_month_year: { siteId, month, year } },
    });

    if (!activation) {
      return NextResponse.json(
        { success: false, error: 'Site activation not found' },
        { status: 404 }
      );
    }

    await db.siteMonthActivation.delete({
      where: { id: activation.id },
    });

    return NextResponse.json({
      success: true,
      data: { message: 'Site activation removed successfully' },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
