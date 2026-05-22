import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// Helper: Calculate RT/HR with team leader and supervisor support
function calcRtPerHour(
  totalWorkingHours: number,
  isTeamLeaderForSite: boolean,
  isSupervisorForSite: boolean,
  isCustom: boolean,
  customRtPerHour: number
): number {
  if (isCustom) return customRtPerHour;
  const hasBonus = isTeamLeaderForSite || isSupervisorForSite;
  if (totalWorkingHours >= 1000) {
    return hasBonus ? 5.5 : 5.0;
  }
  return hasBonus ? 3.0 : 2.5;
}

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

    // 1. Get all active sites
    const activeSites = await db.site.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });

    // 2. Get activated sites from SiteMonthActivation for this month/year
    const activatedSites = await db.siteMonthActivation.findMany({
      where: { month, year },
      include: { site: { select: { id: true, name: true, clientName: true, projectName: true, isActive: true } } },
    });
    const activatedSiteIds = new Set(activatedSites.map(a => a.siteId));

    // Combine: include all active sites + any activated sites (even if site is somehow not in active list)
    const allSiteIds = new Set([...activeSites.map(s => s.id), ...activatedSiteIds]);
    const sitesToProcess = activeSites.filter(s => allSiteIds.has(s.id));

    // 3. For each site, get distinct employees from EmpCountSitePerMonth
    const siteResults = await Promise.all(
      sitesToProcess.map(async (site) => {
        // Get distinct employee records for this site and month where not deleted
        const empRecords = await db.empCountSitePerMonth.findMany({
          where: {
            siteId: site.id,
            month,
            deletedDate: null,
          },
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
                currentSite: true,
              },
            },
          },
          orderBy: { empName: 'asc' },
        });

        // Deduplicate by empId
        const seenEmpIds = new Set<string>();
        const uniqueEmployees: typeof empRecords = [];
        for (const record of empRecords) {
          if (!seenEmpIds.has(record.empId)) {
            seenEmpIds.add(record.empId);
            uniqueEmployees.push(record);
          }
        }

        const employeeCount = uniqueEmployees.length;

        // 4. For each employee, get salary record and working hours
        const employeesWithSalary = await Promise.all(
          uniqueEmployees.map(async (empRecord) => {
            const emp = empRecord.employee;

            // Get salary record for this employee+site+month+year
            const salaryRecord = await db.salaryRecord.findUnique({
              where: {
                empId_siteId_month_year: {
                  empId: empRecord.empId,
                  siteId: site.id,
                  month,
                  year,
                },
              },
            });

            // Get working hours for RT/HR calculation (aggregate from all monthly records)
            const workingHoursRecords = await db.totalEmployeeWorkingHours.findMany({
              where: { empId: empRecord.empId },
            });
            const aggregateTotalHours = workingHoursRecords.reduce((sum, r) => sum + r.totalWorkingHours, 0);
            const hasCustomRate = workingHoursRecords.some(r => r.isCustom);
            const latestRtPerHour = workingHoursRecords.length > 0
              ? workingHoursRecords[workingHoursRecords.length - 1].rtPerHour
              : 2.5;

            // Calculate RT/HR with supervisor support
            const isTeamLeaderForSite = emp.isTeamLeader && emp.teamLeaderSiteId === site.id;
            const isSupervisorForSite = emp.isSupervisor && emp.supervisorSiteId === site.id;

            let rtPerHour = 2.5;
            if (workingHoursRecords.length > 0) {
              rtPerHour = calcRtPerHour(
                aggregateTotalHours,
                isTeamLeaderForSite,
                isSupervisorForSite,
                hasCustomRate,
                latestRtPerHour
              );
            } else {
              // No working hours record yet, use basic calculation
              const hasBonus = isTeamLeaderForSite || isSupervisorForSite;
              rtPerHour = hasBonus ? 3.0 : 2.5;
            }

            return {
              empId: empRecord.empId,
              empName: empRecord.empName,
              employeeCode: emp.employeeId,
              nationality: emp.nationality || '',
              trade: emp.trade || '',
              isTeamLeader: isTeamLeaderForSite,
              isSupervisor: isSupervisorForSite,
              salaryRecord: salaryRecord
                ? {
                    ...salaryRecord,
                    createdAt: salaryRecord.createdAt.toISOString(),
                    updatedAt: salaryRecord.updatedAt.toISOString(),
                  }
                : null,
              workingHours: workingHoursRecords.length > 0
                ? {
                    id: workingHoursRecords[0].id,
                    empId: empRecord.empId,
                    empName: empRecord.empName,
                    totalWorkingHours: aggregateTotalHours,
                    rtPerHour: hasCustomRate ? latestRtPerHour : rtPerHour,
                    isCustom: hasCustomRate,
                    calculatedRtPerHour: rtPerHour,
                  }
                : {
                    empId: empRecord.empId,
                    empName: empRecord.empName,
                    totalWorkingHours: 0,
                    rtPerHour: 2.5,
                    isCustom: false,
                    calculatedRtPerHour: rtPerHour,
                  },
            };
          })
        );

        // 5. Also include any SalaryRecord entries that have siteId matching
        // but might not be in EmpCountSitePerMonth (for manually added entries)
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
          // Get working hours for this employee too (aggregate from monthly records)
          const whRecords = await db.totalEmployeeWorkingHours.findMany({
            where: { empId: manualRecord.empId },
          });
          const whTotal = whRecords.reduce((sum, r) => sum + r.totalWorkingHours, 0);
          const whHasCustom = whRecords.some(r => r.isCustom);
          const whLatestRt = whRecords.length > 0 ? whRecords[whRecords.length - 1].rtPerHour : 2.5;

          // Get employee info
          const empInfo = await db.employee.findUnique({
            where: { id: manualRecord.empId },
            select: {
              employeeId: true,
              nationality: true,
              trade: true,
              isTeamLeader: true,
              teamLeaderSiteId: true,
              isSupervisor: true,
              supervisorSiteId: true,
            },
          });

          const isTeamLeaderForSite = empInfo?.isTeamLeader && empInfo?.teamLeaderSiteId === site.id;
          const isSupervisorForSite = empInfo?.isSupervisor && empInfo?.supervisorSiteId === site.id;

          let rtPerHour = 2.5;
          if (whRecords.length > 0) {
            rtPerHour = calcRtPerHour(
              whTotal,
              isTeamLeaderForSite,
              isSupervisorForSite,
              whHasCustom,
              whLatestRt
            );
          }

          employeesWithSalary.push({
            empId: manualRecord.empId,
            empName: manualRecord.empName,
            employeeCode: manualRecord.employeeCode || empInfo?.employeeId || '',
            nationality: manualRecord.nationality || empInfo?.nationality || '',
            trade: manualRecord.trade || empInfo?.trade || '',
            isTeamLeader: isTeamLeaderForSite,
            isSupervisor: isSupervisorForSite,
            salaryRecord: {
              ...manualRecord,
              createdAt: manualRecord.createdAt.toISOString(),
              updatedAt: manualRecord.updatedAt.toISOString(),
            },
            workingHours: whRecords.length > 0
              ? {
                  id: whRecords[0].id,
                  empId: manualRecord.empId,
                  empName: manualRecord.empName,
                  totalWorkingHours: whTotal,
                  rtPerHour: whHasCustom ? whLatestRt : rtPerHour,
                  isCustom: whHasCustom,
                  calculatedRtPerHour: rtPerHour,
                }
              : {
                  empId: manualRecord.empId,
                  empName: manualRecord.empName,
                  totalWorkingHours: 0,
                  rtPerHour: 2.5,
                  isCustom: false,
                  calculatedRtPerHour: rtPerHour,
                },
          });
        }

        // 6. Calculate totals
        const totalHours = employeesWithSalary.reduce(
          (sum, e) => sum + (e.salaryRecord?.totalHours || 0),
          0
        );
        const totalSalary = employeesWithSalary.reduce(
          (sum, e) => sum + (e.salaryRecord?.totalSalary || 0),
          0
        );
        const totalDeductions = employeesWithSalary.reduce(
          (sum, e) => sum + (e.salaryRecord?.deduction || 0),
          0
        );
        const totalAdvances = employeesWithSalary.reduce(
          (sum, e) => sum + (e.salaryRecord?.advance || 0),
          0
        );
        const totalBalanceSalary = employeesWithSalary.reduce(
          (sum, e) => sum + (e.salaryRecord?.balanceSalary || 0),
          0
        );

        const isActiveForMonth = activatedSiteIds.has(site.id);
        const totalEmpCount = employeeCount + manualSalaryRecords.length;

        return {
          site: {
            id: site.id,
            name: site.name,
            clientName: site.clientName,
            projectName: site.projectName,
          },
          employeeCount: totalEmpCount,
          totalHours,
          totalSalary,
          totalDeductions,
          totalAdvances,
          totalBalanceSalary,
          employees: employeesWithSalary,
          isActivated: isActiveForMonth, // flag to indicate this site was manually activated
        };
      })
    );

    // Include sites that have employees OR are activated for this month
    const sitesToShow = siteResults.filter((s) => s.employeeCount > 0 || s.isActivated);

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
