import { db } from '@/lib/db';

// ---------------------------------------------------------------------------
// Recalculation Engine — Direct Hourly Rates (PRD v2.0)
// ---------------------------------------------------------------------------
//
// Rate Table (DIRECT — no divisors):
//   | Role            | Rate below 1000h | Rate at/above 1000h |
//   | Standard        | 2.5              | 5.0                  |
//   | Team Leader     | 3.0              | 5.5                  |
//   | Supervisor      | 3.0              | 5.5                  |
//   | Custom (per emp)| Overrides both   | Overrides both       |
//
// Priority: employee.customHourlyRate > role-based rates
//
// Cumulative hours span ALL years (no yearly reset).
// When editing past hours, recalculate from the edited month onward.
// ---------------------------------------------------------------------------

/**
 * Get the direct hourly rates for an employee based on their role or custom rate.
 */
export function getEmployeeRates(employee: {
  customHourlyRate: number | null;
  role: string;
  isTeamLeader: boolean;
  isSupervisor: boolean;
}): { lowRate: number; highRate: number; isCustom: boolean } {
  if (employee.customHourlyRate !== null && employee.customHourlyRate !== undefined) {
    return {
      lowRate: employee.customHourlyRate,
      highRate: employee.customHourlyRate,
      isCustom: true,
    };
  }

  const isLeader = employee.isTeamLeader || employee.isSupervisor || employee.role === 'Team Leader' || employee.role === 'Supervisor';
  return {
    lowRate: isLeader ? 3.0 : 2.5,
    highRate: isLeader ? 5.5 : 5.0,
    isCustom: false,
  };
}

/**
 * Compute the below/above threshold split for a single month's hours.
 */
export function computeMonthSplit(
  monthHours: number,
  cumulativeBefore: number,
  threshold: number,
): { belowHours: number; aboveHours: number } {
  if (cumulativeBefore < threshold) {
    const remaining = threshold - cumulativeBefore;
    const below = Math.min(monthHours, remaining);
    const above = monthHours - below;
    return { belowHours: below, aboveHours: above };
  }
  return { belowHours: 0, aboveHours: monthHours };
}

/**
 * Recalculate an employee's cumulative hours and salary records
 * starting from a given month onward.
 *
 * This is the core propagation function. When hours are edited for month M,
 * all months from M onward need their cumulative values and salary splits
 * recomputed.
 *
 * @param employeeId - The employee's internal ID (cuid)
 * @param fromYear - The year to start recalculation from
 * @param fromMonth - The month (1-12) to start recalculation from
 */
export async function recalcEmployeeFromMonth(
  employeeId: string,
  fromYear: number,
  fromMonth: number,
): Promise<{
  monthsRecalculated: number;
  employeeId: string;
}> {
  const employee = await db.employee.findUnique({
    where: { id: employeeId },
    select: {
      id: true,
      fullName: true,
      employeeId: true,
      role: true,
      isTeamLeader: true,
      isSupervisor: true,
      customHourlyRate: true,
      hoursThreshold: true,
      nationality: true,
      trade: true,
    },
  });

  if (!employee) {
    throw new Error(`Employee not found: ${employeeId}`);
  }

  const { lowRate, highRate, isCustom } = getEmployeeRates(employee);
  const threshold = employee.hoursThreshold || 1000;

  // Fetch all non-deleted work logs for this employee, sorted chronologically
  const allLogs = await db.workLog.findMany({
    where: { employeeId, deletedAt: null },
    orderBy: [{ year: 'asc' }, { month: 'asc' }],
  });

  // Compute cumulative hours BEFORE the fromMonth
  let cumulative = 0;
  for (const log of allLogs) {
    if (log.year < fromYear || (log.year === fromYear && log.month < fromMonth)) {
      cumulative += log.hoursWorked;
    }
  }

  // Also consider salary records for months before fromMonth that don't have work logs
  // (for backward compatibility with existing data)
  const allSalaryRecords = await db.salaryRecord.findMany({
    where: { empId: employeeId, isDeleted: false },
    orderBy: [{ year: 'asc' }, { month: 'asc' }],
  });

  // Recalculate cumulative from all data sources
  // Use work logs as primary source; fall back to salary records for months without work logs
  const logMonthSet = new Set(allLogs.map(l => `${l.year}-${String(l.month).padStart(2, '0')}`));
  
  // Recompute cumulative properly from ALL months
  cumulative = 0;
  const allMonthsData: Array<{
    monthKey: string;
    year: number;
    month: number;
    hoursWorked: number;
    siteHours: Array<{ siteId: string; siteName: string; hours: number }>;
  }> = [];

  // Build a map of work logs by year-month
  const logsByMonth = new Map<string, typeof allLogs>();
  for (const log of allLogs) {
    const key = `${log.year}-${String(log.month).padStart(2, '0')}`;
    if (!logsByMonth.has(key)) logsByMonth.set(key, []);
    logsByMonth.get(key)!.push(log);
  }

  // Build a map of salary records by year-month
  const salaryByMonth = new Map<string, typeof allSalaryRecords>();
  for (const sr of allSalaryRecords) {
    if (!salaryByMonth.has(sr.month)) salaryByMonth.set(sr.month, []);
    salaryByMonth.get(sr.month)!.push(sr);
  }

  // Collect all unique months from both sources
  const allMonthKeys = new Set([...logsByMonth.keys(), ...salaryByMonth.keys()]);
  const sortedMonthKeys = Array.from(allMonthKeys).sort();

  for (const monthKey of sortedMonthKeys) {
    const [yearStr, monthStr] = monthKey.split('-');
    const yr = parseInt(yearStr, 10);
    const mo = parseInt(monthStr, 10);

    // Get total hours for this month
    const monthLogs = logsByMonth.get(monthKey) || [];
    const monthSalaryRecords = salaryByMonth.get(monthKey) || [];

    let totalHours = 0;
    const siteHours: Array<{ siteId: string; siteName: string; hours: number }> = [];

    if (monthLogs.length > 0) {
      // Work logs are the source of truth
      for (const log of monthLogs) {
        totalHours += log.hoursWorked;
        const site = await db.site.findUnique({ where: { id: log.siteId }, select: { name: true } });
        siteHours.push({
          siteId: log.siteId,
          siteName: site?.name || '',
          hours: log.hoursWorked,
        });
      }
    } else if (monthSalaryRecords.length > 0) {
      // Fall back to salary records (backward compatibility)
      totalHours = monthSalaryRecords.reduce((sum, sr) => sum + sr.totalHours, 0);
      // Group by site
      const siteMap = new Map<string, { siteName: string; hours: number }>();
      for (const sr of monthSalaryRecords) {
        const existing = siteMap.get(sr.siteId);
        if (existing) {
          existing.hours += sr.totalHours;
        } else {
          siteMap.set(sr.siteId, { siteName: sr.siteName, hours: sr.totalHours });
        }
      }
      for (const [siteId, data] of siteMap) {
        siteHours.push({ siteId, siteName: data.siteName, hours: data.hours });
      }
    }

    allMonthsData.push({
      monthKey,
      year: yr,
      month: mo,
      hoursWorked: totalHours,
      siteHours,
    });
  }

  // Now recalculate from fromMonth onward
  // First, compute cumulative before fromMonth
  cumulative = 0;
  for (const md of allMonthsData) {
    if (md.year < fromYear || (md.year === fromYear && md.month < fromMonth)) {
      cumulative += md.hoursWorked;
    }
  }

  let monthsRecalculated = 0;

  for (const md of allMonthsData) {
    // Skip months before fromMonth
    if (md.year < fromYear || (md.year === fromYear && md.month < fromMonth)) {
      continue;
    }

    if (md.hoursWorked <= 0) {
      // No hours this month — skip but advance cumulative
      continue;
    }

    const { belowHours, aboveHours } = computeMonthSplit(md.hoursWorked, cumulative, threshold);

    if (isCustom) {
      // Custom rate: all hours at the custom rate as a single "standard" record
      const totalSalary = md.hoursWorked * lowRate; // lowRate == highRate for custom
      const blendedRate = md.hoursWorked > 0 ? totalSalary / md.hoursWorked : 0;

      // Update TotalEmployeeWorkingHours
      await db.totalEmployeeWorkingHours.upsert({
        where: { empId_month: { empId: employeeId, month: md.monthKey } },
        update: {
          totalWorkingHours: md.hoursWorked,
          rtPerHour: blendedRate,
          isDeleted: false,
        },
        create: {
          empId: employeeId,
          empName: employee.fullName,
          month: md.monthKey,
          totalWorkingHours: md.hoursWorked,
          rtPerHour: blendedRate,
          isCustom: true,
        },
      });

      // For custom rate, put all hours in a single salary record per site
      for (const sh of md.siteHours) {
        const siteSalary = sh.hours * lowRate;
        // Check for existing records
        const existingStd = await db.salaryRecord.findUnique({
          where: {
            empId_siteId_month_year_rateTier: {
              empId: employeeId,
              siteId: sh.siteId,
              month: md.monthKey,
              year: md.year,
              rateTier: 'standard',
            },
          },
        });
        const existingPrem = await db.salaryRecord.findUnique({
          where: {
            empId_siteId_month_year_rateTier: {
              empId: employeeId,
              siteId: sh.siteId,
              month: md.monthKey,
              year: md.year,
              rateTier: 'premium',
            },
          },
        });

        // Soft-delete premium record if it exists
        if (existingPrem && !existingPrem.isDeleted) {
          await db.salaryRecord.update({
            where: { id: existingPrem.id },
            data: { isDeleted: true },
          });
        }

        // Upsert standard record with all hours
        const existingDeduction = existingStd?.deduction ?? 0;
        const existingAdvance = existingStd?.advance ?? 0;
        const existingIsPaid = existingStd?.isPaid ?? existingPrem?.isPaid ?? false;

        await db.salaryRecord.upsert({
          where: {
            empId_siteId_month_year_rateTier: {
              empId: employeeId,
              siteId: sh.siteId,
              month: md.monthKey,
              year: md.year,
              rateTier: 'standard',
            },
          },
          update: {
            empName: employee.fullName,
            siteName: sh.siteName,
            nationality: employee.nationality || '',
            trade: employee.trade || '',
            employeeCode: employee.employeeId || '',
            totalHours: sh.hours,
            rtPerHour: lowRate,
            totalSalary: siteSalary,
            balanceSalary: siteSalary - existingDeduction - existingAdvance,
            deduction: existingDeduction,
            advance: existingAdvance,
            isPaid: existingIsPaid,
            isDeleted: false,
          },
          create: {
            empId: employeeId,
            empName: employee.fullName,
            siteId: sh.siteId,
            siteName: sh.siteName,
            month: md.monthKey,
            year: md.year,
            nationality: employee.nationality || '',
            trade: employee.trade || '',
            employeeCode: employee.employeeId || '',
            slNo: 0,
            totalHours: sh.hours,
            rtPerHour: lowRate,
            totalSalary: siteSalary,
            deduction: 0,
            advance: 0,
            balanceSalary: siteSalary,
            isPaid: false,
            rateTier: 'standard',
          },
        });
      }
    } else {
      // Role-based rates: split into below/above threshold
      const belowSalary = belowHours * lowRate;
      const aboveSalary = aboveHours * highRate;
      const totalSalary = belowSalary + aboveSalary;
      const blendedRate = md.hoursWorked > 0 ? totalSalary / md.hoursWorked : 0;

      // Update TotalEmployeeWorkingHours
      await db.totalEmployeeWorkingHours.upsert({
        where: { empId_month: { empId: employeeId, month: md.monthKey } },
        update: {
          totalWorkingHours: md.hoursWorked,
          rtPerHour: blendedRate,
          isDeleted: false,
        },
        create: {
          empId: employeeId,
          empName: employee.fullName,
          month: md.monthKey,
          totalWorkingHours: md.hoursWorked,
          rtPerHour: blendedRate,
          isCustom: false,
        },
      });

      // Distribute below/above hours across sites proportionally
      const totalSiteHours = md.siteHours.reduce((s, sh) => s + sh.hours, 0);

      for (const sh of md.siteHours) {
        const siteProportion = totalSiteHours > 0 ? sh.hours / totalSiteHours : 0;
        const siteBelow = belowHours * siteProportion;
        const siteAbove = aboveHours * siteProportion;

        // Get existing records for carry-forward of deduction/advance/isPaid
        const existingStd = await db.salaryRecord.findUnique({
          where: {
            empId_siteId_month_year_rateTier: {
              empId: employeeId,
              siteId: sh.siteId,
              month: md.monthKey,
              year: md.year,
              rateTier: 'standard',
            },
          },
        });
        const existingPrem = await db.salaryRecord.findUnique({
          where: {
            empId_siteId_month_year_rateTier: {
              empId: employeeId,
              siteId: sh.siteId,
              month: md.monthKey,
              year: md.year,
              rateTier: 'premium',
            },
          },
        });

        const existingIsPaid = existingStd?.isPaid || existingPrem?.isPaid || false;

        // Standard (below threshold) record
        if (siteBelow > 0.001) {
          const stdSalary = siteBelow * lowRate;
          const stdDeduction = existingStd?.deduction ?? 0;
          const stdAdvance = existingStd?.advance ?? 0;

          await db.salaryRecord.upsert({
            where: {
              empId_siteId_month_year_rateTier: {
                empId: employeeId,
                siteId: sh.siteId,
                month: md.monthKey,
                year: md.year,
                rateTier: 'standard',
              },
            },
            update: {
              empName: employee.fullName,
              siteName: sh.siteName,
              nationality: employee.nationality || '',
              trade: employee.trade || '',
              employeeCode: employee.employeeId || '',
              totalHours: parseFloat(siteBelow.toFixed(2)),
              rtPerHour: lowRate,
              totalSalary: parseFloat(stdSalary.toFixed(2)),
              balanceSalary: parseFloat((stdSalary - stdDeduction - stdAdvance).toFixed(2)),
              deduction: stdDeduction,
              advance: stdAdvance,
              isPaid: existingIsPaid,
              isDeleted: false,
            },
            create: {
              empId: employeeId,
              empName: employee.fullName,
              siteId: sh.siteId,
              siteName: sh.siteName,
              month: md.monthKey,
              year: md.year,
              nationality: employee.nationality || '',
              trade: employee.trade || '',
              employeeCode: employee.employeeId || '',
              slNo: 0,
              totalHours: parseFloat(siteBelow.toFixed(2)),
              rtPerHour: lowRate,
              totalSalary: parseFloat(stdSalary.toFixed(2)),
              deduction: 0,
              advance: 0,
              balanceSalary: parseFloat(stdSalary.toFixed(2)),
              isPaid: false,
              rateTier: 'standard',
            },
          });
        } else if (existingStd && !existingStd.isDeleted) {
          // No below-threshold hours — soft-delete the standard record
          await db.salaryRecord.update({
            where: { id: existingStd.id },
            data: { isDeleted: true },
          });
        }

        // Premium (above threshold) record
        if (siteAbove > 0.001) {
          const premSalary = siteAbove * highRate;
          const premDeduction = existingPrem?.deduction ?? 0;
          const premAdvance = existingPrem?.advance ?? 0;

          await db.salaryRecord.upsert({
            where: {
              empId_siteId_month_year_rateTier: {
                empId: employeeId,
                siteId: sh.siteId,
                month: md.monthKey,
                year: md.year,
                rateTier: 'premium',
              },
            },
            update: {
              empName: employee.fullName,
              siteName: sh.siteName,
              nationality: employee.nationality || '',
              trade: employee.trade || '',
              employeeCode: employee.employeeId || '',
              totalHours: parseFloat(siteAbove.toFixed(2)),
              rtPerHour: highRate,
              totalSalary: parseFloat(premSalary.toFixed(2)),
              balanceSalary: parseFloat((premSalary - premDeduction - premAdvance).toFixed(2)),
              deduction: premDeduction,
              advance: premAdvance,
              isPaid: existingIsPaid,
              isDeleted: false,
            },
            create: {
              empId: employeeId,
              empName: employee.fullName,
              siteId: sh.siteId,
              siteName: sh.siteName,
              month: md.monthKey,
              year: md.year,
              nationality: employee.nationality || '',
              trade: employee.trade || '',
              employeeCode: employee.employeeId || '',
              slNo: 0,
              totalHours: parseFloat(siteAbove.toFixed(2)),
              rtPerHour: highRate,
              totalSalary: parseFloat(premSalary.toFixed(2)),
              deduction: 0,
              advance: 0,
              balanceSalary: parseFloat(premSalary.toFixed(2)),
              isPaid: false,
              rateTier: 'premium',
            },
          });
        } else if (existingPrem && !existingPrem.isDeleted) {
          // No above-threshold hours — soft-delete the premium record
          await db.salaryRecord.update({
            where: { id: existingPrem.id },
            data: { isDeleted: true },
          });
        }
      }
    }

    cumulative += md.hoursWorked;
    monthsRecalculated++;
  }

  return { monthsRecalculated, employeeId };
}

/**
 * Full recalculation for an employee — starts from the earliest month.
 * Used when role, customHourlyRate, or hoursThreshold changes.
 */
export async function recalcEmployeeFull(employeeId: string): Promise<{
  monthsRecalculated: number;
  employeeId: string;
}> {
  // Find the earliest work log or salary record for this employee
  const earliestLog = await db.workLog.findFirst({
    where: { employeeId, deletedAt: null },
    orderBy: [{ year: 'asc' }, { month: 'asc' }],
  });

  const earliestSalary = await db.salaryRecord.findFirst({
    where: { empId: employeeId, isDeleted: false },
    orderBy: [{ year: 'asc' }, { month: 'asc' }],
  });

  let fromYear = 2020;
  let fromMonth = 1;

  if (earliestLog) {
    fromYear = earliestLog.year;
    fromMonth = earliestLog.month;
  }
  if (earliestSalary && (earliestSalary.year < fromYear || (earliestSalary.year === fromYear && earliestSalary.month < fromMonth))) {
    fromYear = earliestSalary.year;
    fromMonth = parseInt(earliestSalary.month.split('-')[1], 10);
  }

  return recalcEmployeeFromMonth(employeeId, fromYear, fromMonth);
}

/**
 * Compute salary breakdown for display purposes (no DB writes).
 * Useful for the frontend to preview calculations.
 */
export function computeSalaryBreakdown(
  monthHours: number,
  cumulativeBefore: number,
  threshold: number,
  lowRate: number,
  highRate: number,
): {
  belowHours: number;
  aboveHours: number;
  belowSalary: number;
  aboveSalary: number;
  totalSalary: number;
  blendedRate: number;
} {
  const { belowHours, aboveHours } = computeMonthSplit(monthHours, cumulativeBefore, threshold);
  const belowSalary = belowHours * lowRate;
  const aboveSalary = aboveHours * highRate;
  const totalSalary = belowSalary + aboveSalary;
  const blendedRate = monthHours > 0 ? totalSalary / monthHours : 0;

  return {
    belowHours,
    aboveHours,
    belowSalary: parseFloat(belowSalary.toFixed(2)),
    aboveSalary: parseFloat(aboveSalary.toFixed(2)),
    totalSalary: parseFloat(totalSalary.toFixed(2)),
    blendedRate: parseFloat(blendedRate.toFixed(4)),
  };
}
