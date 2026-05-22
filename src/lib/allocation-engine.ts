import { db } from '@/lib/db';

// ---------------------------------------------------------------------------
// Cross-Site Monthly Hour Allocation Engine (Shared Module)
// ---------------------------------------------------------------------------
// Business Rules:
//   For each employee in a given month:
//     | Hours Range    | Employee Rate | TL/Supervisor Rate |
//     | First N hrs    | 2.5           | 3.0                |
//     | Above N hrs    | 5.0           | 5.5                |
//   Where N = employee's hoursThreshold (default 1000).
//
//   Sequential Allocation:
//     1. Sort employee's sites alphabetically by site name
//     2. Walk sites sequentially, consuming the threshold
//     3. Split each site's hours into lowRate (standard) and highRate (premium)
// ---------------------------------------------------------------------------

export interface SiteAllocation {
  siteId: string;
  siteName: string;
  rawHours: number;
  lowRateHours: number;
  highRateHours: number;
  lowRate: number;
  highRate: number;
}

export interface EmployeeAllocation {
  empId: string;
  empName: string;
  threshold: number;
  totalRawHours: number;
  sites: SiteAllocation[];
  validation: {
    totalLowRateHours: number;
    totalHighRateHours: number;
    lowRateHoursWithinThreshold: boolean;
    hoursMatch: boolean;
  };
}

export interface AllocationResult {
  month: string;
  year: number;
  employeesProcessed: number;
  allocations: EmployeeAllocation[];
}

/**
 * Run the allocation engine for a specific month+year.
 *
 * This function:
 * 1. Fetches all non-deleted salary records for the given month+year
 * 2. Groups them by employee
 * 3. For each employee, applies sequential allocation across sites
 * 4. Creates/updates/soft-deletes salary records (standard & premium tiers)
 * 5. Updates TotalEmployeeWorkingHours for each processed employee
 * 6. Returns allocation results
 */
export async function allocateEmployeeHours(
  month: string,
  year: number,
): Promise<AllocationResult> {
  // ------------------------------------------------------------------
  // 1. Fetch all non-deleted salary records for the given month+year
  // ------------------------------------------------------------------
  const salaryRecords = await db.salaryRecord.findMany({
    where: {
      month,
      year,
      isDeleted: false,
    },
  });

  // ------------------------------------------------------------------
  // 2. Group by employee (empId)
  // ------------------------------------------------------------------
  const employeeMap = new Map<string, typeof salaryRecords>();
  for (const record of salaryRecords) {
    if (!employeeMap.has(record.empId)) {
      employeeMap.set(record.empId, []);
    }
    employeeMap.get(record.empId)!.push(record);
  }

  // ------------------------------------------------------------------
  // 3. Process each employee
  // ------------------------------------------------------------------
  const allocations: EmployeeAllocation[] = [];

  for (const [empId, records] of employeeMap) {
    // 3a. Fetch employee details
    const employee = await db.employee.findUnique({
      where: { id: empId },
      select: {
        id: true,
        fullName: true,
        employeeId: true,
        isTeamLeader: true,
        isSupervisor: true,
        hoursThreshold: true,
        nationality: true,
        trade: true,
      },
    });

    // Skip if employee not found
    if (!employee) continue;

    const threshold = employee.hoursThreshold || 1000;
    const hasBonus = employee.isTeamLeader || employee.isSupervisor;
    const lowRate = hasBonus ? 3.0 : 2.5;
    const highRate = hasBonus ? 5.5 : 5.0;

    // 3b. Group by site, calculate rawHours per site
    const siteMap = new Map<
      string,
      {
        siteId: string;
        siteName: string;
        rawHours: number;
        existingStandard: (typeof records)[0] | undefined;
        existingPremium: (typeof records)[0] | undefined;
      }
    >();

    for (const record of records) {
      if (!siteMap.has(record.siteId)) {
        siteMap.set(record.siteId, {
          siteId: record.siteId,
          siteName: record.siteName,
          rawHours: 0,
          existingStandard: undefined,
          existingPremium: undefined,
        });
      }
      const siteData = siteMap.get(record.siteId)!;
      siteData.rawHours += record.totalHours;

      // Track existing records by rateTier for carry-forward
      if (record.rateTier === 'standard') {
        siteData.existingStandard = record;
      } else if (record.rateTier === 'premium') {
        siteData.existingPremium = record;
      }
    }

    // 3c. Sort by site name (alphabetically)
    const sortedSites = Array.from(siteMap.values()).sort((a, b) =>
      a.siteName.localeCompare(b.siteName),
    );

    // 3d. Calculate total raw hours across all sites
    const totalRawHours = sortedSites.reduce((sum, s) => sum + s.rawHours, 0);

    // 3e. Apply sequential allocation algorithm
    let consumedThreshold = 0;
    const siteAllocations: SiteAllocation[] = [];

    for (const site of sortedSites) {
      const remainingThreshold = threshold - consumedThreshold;
      let lowRateHours = 0;
      let highRateHours = 0;

      if (site.rawHours <= 0) {
        lowRateHours = 0;
        highRateHours = 0;
      } else if (remainingThreshold >= site.rawHours) {
        lowRateHours = site.rawHours;
        highRateHours = 0;
        consumedThreshold += site.rawHours;
      } else if (remainingThreshold > 0) {
        lowRateHours = remainingThreshold;
        highRateHours = site.rawHours - remainingThreshold;
        consumedThreshold = threshold;
      } else {
        lowRateHours = 0;
        highRateHours = site.rawHours;
      }

      siteAllocations.push({
        siteId: site.siteId,
        siteName: site.siteName,
        rawHours: site.rawHours,
        lowRateHours,
        highRateHours,
        lowRate,
        highRate,
      });
    }

    // 3f. Create / update / soft-delete salary records
    for (let i = 0; i < sortedSites.length; i++) {
      const siteData = sortedSites[i];
      const alloc = siteAllocations[i];

      // --- Standard (lowRate) record ---
      if (alloc.lowRateHours > 0) {
        const totalSalary = alloc.lowRateHours * lowRate;
        const carryDeduction = siteData.existingStandard?.deduction ?? 0;
        const carryAdvance = siteData.existingStandard?.advance ?? 0;
        const carryIsPaid = siteData.existingStandard?.isPaid ?? false;
        const balanceSalary = totalSalary - carryDeduction - carryAdvance;

        await db.salaryRecord.upsert({
          where: {
            empId_siteId_month_year_rateTier: {
              empId,
              siteId: alloc.siteId,
              month,
              year,
              rateTier: 'standard',
            },
          },
          update: {
            empName: employee.fullName,
            siteName: alloc.siteName,
            nationality: employee.nationality || '',
            trade: employee.trade || '',
            employeeCode: employee.employeeId || '',
            totalHours: alloc.lowRateHours,
            rtPerHour: lowRate,
            totalSalary,
            deduction: carryDeduction,
            advance: carryAdvance,
            balanceSalary,
            isPaid: carryIsPaid,
            isDeleted: false,
          },
          create: {
            empId,
            empName: employee.fullName,
            siteId: alloc.siteId,
            siteName: alloc.siteName,
            month,
            year,
            nationality: employee.nationality || '',
            trade: employee.trade || '',
            employeeCode: employee.employeeId || '',
            slNo: 0,
            totalHours: alloc.lowRateHours,
            rtPerHour: lowRate,
            totalSalary,
            deduction: carryDeduction,
            advance: carryAdvance,
            balanceSalary,
            isPaid: carryIsPaid,
            rateTier: 'standard',
          },
        });
      } else {
        // lowRateHours is 0 — soft-delete the standard record if it exists
        const existing = await db.salaryRecord.findUnique({
          where: {
            empId_siteId_month_year_rateTier: {
              empId,
              siteId: alloc.siteId,
              month,
              year,
              rateTier: 'standard',
            },
          },
        });
        if (existing && !existing.isDeleted) {
          await db.salaryRecord.update({
            where: { id: existing.id },
            data: { isDeleted: true },
          });
        }
      }

      // --- Premium (highRate) record ---
      if (alloc.highRateHours > 0) {
        const totalSalary = alloc.highRateHours * highRate;
        const carryDeduction = siteData.existingPremium?.deduction ?? 0;
        const carryAdvance = siteData.existingPremium?.advance ?? 0;
        const carryIsPaid = siteData.existingPremium?.isPaid ?? false;
        const balanceSalary = totalSalary - carryDeduction - carryAdvance;

        await db.salaryRecord.upsert({
          where: {
            empId_siteId_month_year_rateTier: {
              empId,
              siteId: alloc.siteId,
              month,
              year,
              rateTier: 'premium',
            },
          },
          update: {
            empName: employee.fullName,
            siteName: alloc.siteName,
            nationality: employee.nationality || '',
            trade: employee.trade || '',
            employeeCode: employee.employeeId || '',
            totalHours: alloc.highRateHours,
            rtPerHour: highRate,
            totalSalary,
            deduction: carryDeduction,
            advance: carryAdvance,
            balanceSalary,
            isPaid: carryIsPaid,
            isDeleted: false,
          },
          create: {
            empId,
            empName: employee.fullName,
            siteId: alloc.siteId,
            siteName: alloc.siteName,
            month,
            year,
            nationality: employee.nationality || '',
            trade: employee.trade || '',
            employeeCode: employee.employeeId || '',
            slNo: 0,
            totalHours: alloc.highRateHours,
            rtPerHour: highRate,
            totalSalary,
            deduction: carryDeduction,
            advance: carryAdvance,
            balanceSalary,
            isPaid: carryIsPaid,
            rateTier: 'premium',
          },
        });
      } else {
        // highRateHours is 0 — soft-delete the premium record if it exists
        const existing = await db.salaryRecord.findUnique({
          where: {
            empId_siteId_month_year_rateTier: {
              empId,
              siteId: alloc.siteId,
              month,
              year,
              rateTier: 'premium',
            },
          },
        });
        if (existing && !existing.isDeleted) {
          await db.salaryRecord.update({
            where: { id: existing.id },
            data: { isDeleted: true },
          });
        }
      }
    }

    // 3g. Validation checks
    const totalLowRateHours = siteAllocations.reduce(
      (sum, s) => sum + s.lowRateHours,
      0,
    );
    const totalHighRateHours = siteAllocations.reduce(
      (sum, s) => sum + s.highRateHours,
      0,
    );

    const perSiteMatch = siteAllocations.every(
      (s) => Math.abs(s.lowRateHours + s.highRateHours - s.rawHours) < 0.01,
    );

    const totalMatch =
      Math.abs(totalLowRateHours + totalHighRateHours - totalRawHours) < 0.01;

    const noNegative = siteAllocations.every(
      (s) => s.lowRateHours >= 0 && s.highRateHours >= 0 && s.rawHours >= 0,
    );

    allocations.push({
      empId,
      empName: employee.fullName,
      threshold,
      totalRawHours,
      sites: siteAllocations,
      validation: {
        totalLowRateHours,
        totalHighRateHours,
        lowRateHoursWithinThreshold: totalLowRateHours <= threshold + 0.01,
        hoursMatch: perSiteMatch && totalMatch && noNegative,
      },
    });
  }

  // ------------------------------------------------------------------
  // 4. Update TotalEmployeeWorkingHours for each processed employee
  // ------------------------------------------------------------------
  for (const allocation of allocations) {
    const updatedSalaryRecords = await db.salaryRecord.findMany({
      where: {
        empId: allocation.empId,
        month,
        year,
        isDeleted: false,
      },
    });

    const totalHoursFromSalary = updatedSalaryRecords.reduce(
      (sum, sr) => sum + sr.totalHours,
      0,
    );

    // Fetch all working-hours records (all months) to compute aggregate
    const allWorkingHours = await db.totalEmployeeWorkingHours.findMany({
      where: { empId: allocation.empId, isDeleted: false },
    });

    // Aggregate total = sum of all months except current + current month total
    const previousAggregate = allWorkingHours
      .filter((r) => r.month !== month)
      .reduce((sum, r) => sum + r.totalWorkingHours, 0);
    const aggregateTotal = previousAggregate + totalHoursFromSalary;

    // Find existing record for current month to preserve isCustom / custom rate
    const currentMonthRecord = allWorkingHours.find((r) => r.month === month);

    // Calculate rtPerHour based on aggregate and employee type
    const empInfo = await db.employee.findUnique({
      where: { id: allocation.empId },
      select: {
        isTeamLeader: true,
        isSupervisor: true,
        hoursThreshold: true,
      },
    });

    const empHasBonus =
      empInfo?.isTeamLeader || empInfo?.isSupervisor || false;
    const empThreshold = empInfo?.hoursThreshold || 1000;

    const calculatedRt =
      aggregateTotal >= empThreshold
        ? empHasBonus
          ? 5.5
          : 5.0
        : empHasBonus
          ? 3.0
          : 2.5;

    const isCustom = currentMonthRecord?.isCustom ?? false;
    const effectiveRt = isCustom
      ? (currentMonthRecord?.rtPerHour ?? calculatedRt)
      : calculatedRt;

    await db.totalEmployeeWorkingHours.upsert({
      where: {
        empId_month: { empId: allocation.empId, month },
      },
      update: {
        totalWorkingHours: totalHoursFromSalary,
        empName: allocation.empName,
        rtPerHour: effectiveRt,
        isCustom,
        isDeleted: false,
      },
      create: {
        empId: allocation.empId,
        empName: allocation.empName,
        month,
        totalWorkingHours: totalHoursFromSalary,
        rtPerHour: effectiveRt,
        isCustom: false,
      },
    });
  }

  return {
    month,
    year,
    employeesProcessed: allocations.length,
    allocations,
  };
}
