import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { recalcEmployeeFromMonth, recalcEmployeeFull, getEmployeeRates, computeSalaryBreakdown } from '@/lib/recalculation';

// GET /api/employees/[id]/worklogs
// Get all WorkLog entries for an employee
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const year = searchParams.get('year');

    const where: Record<string, unknown> = { employeeId: id, deletedAt: null };
    if (year) {
      where.year = parseInt(year, 10);
    }

    const workLogs = await db.workLog.findMany({
      where,
      orderBy: [{ year: 'asc' }, { month: 'asc' }],
      include: {
        site: { select: { id: true, name: true } },
      },
    });

    // Get employee info for rate calculations
    const employee = await db.employee.findUnique({
      where: { id },
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
      return NextResponse.json(
        { success: false, error: 'Employee not found' },
        { status: 404 }
      );
    }

    const { lowRate, highRate, isCustom } = getEmployeeRates(employee);
    const threshold = employee.hoursThreshold || 1000;

    // Compute cumulative hours and salary breakdown for each month
    let cumulative = 0;
    const allLogs = await db.workLog.findMany({
      where: { employeeId: id, deletedAt: null },
      orderBy: [{ year: 'asc' }, { month: 'asc' }],
    });

    // Compute cumulative before each log entry
    const cumulativeMap = new Map<string, number>();
    let runningTotal = 0;
    for (const log of allLogs) {
      const key = `${log.year}-${String(log.month).padStart(2, '0')}`;
      cumulativeMap.set(key, runningTotal);
      runningTotal += log.hoursWorked;
    }

    // Also get existing salary records for paid status and deduction/advance
    const salaryRecords = await db.salaryRecord.findMany({
      where: {
        empId: id,
        isDeleted: false,
        ...(year ? { year: parseInt(year, 10) } : {}),
      },
    });

    // Build monthly data with cumulative info
    const monthlyData = workLogs.map(log => {
      const monthKey = `${log.year}-${String(log.month).padStart(2, '0')}`;
      const cumulativeBefore = cumulativeMap.get(monthKey) || 0;
      const breakdown = computeSalaryBreakdown(
        log.hoursWorked,
        cumulativeBefore,
        threshold,
        isCustom ? lowRate : lowRate,
        isCustom ? highRate : highRate,
      );

      // Find matching salary records for this month
      const monthSalaryRecords = salaryRecords.filter(
        sr => sr.month === monthKey && sr.siteId === log.siteId
      );

      const stdRecord = monthSalaryRecords.find(sr => sr.rateTier === 'standard');
      const premRecord = monthSalaryRecords.find(sr => sr.rateTier === 'premium');

      const deduction = stdRecord?.deduction ?? premRecord?.deduction ?? 0;
      const advance = stdRecord?.advance ?? premRecord?.advance ?? 0;
      const isPaid = (stdRecord?.isPaid ?? false) || (premRecord?.isPaid ?? false);

      return {
        logId: log.logId,
        employeeId: log.employeeId,
        siteId: log.siteId,
        siteName: log.site?.name || '',
        year: log.year,
        month: log.month,
        monthKey,
        hoursWorked: log.hoursWorked,
        allowances: log.allowances,
        deductions: log.deductions,
        cumulativeBefore,
        cumulativeAfter: cumulativeBefore + log.hoursWorked,
        // Rate info
        lowRate,
        highRate,
        isCustom,
        // Salary breakdown
        belowHours: breakdown.belowHours,
        aboveHours: breakdown.aboveHours,
        belowSalary: breakdown.belowSalary,
        aboveSalary: breakdown.aboveSalary,
        totalSalary: breakdown.totalSalary,
        blendedRate: breakdown.blendedRate,
        // Financial
        deduction,
        advance,
        balanceSalary: parseFloat((breakdown.totalSalary - deduction - advance).toFixed(2)),
        isPaid,
        // Record IDs for updates
        standardRecordId: stdRecord?.id ?? null,
        premiumRecordId: premRecord?.id ?? null,
        // Timestamps
        createdAt: log.createdAt.toISOString(),
        updatedAt: log.updatedAt.toISOString(),
      };
    });

    // Aggregate totals
    const aggregateTotalHours = allLogs.reduce((sum, l) => sum + l.hoursWorked, 0);

    return NextResponse.json({
      success: true,
      data: {
        workLogs: monthlyData,
        employeeInfo: {
          id: employee.id,
          fullName: employee.fullName,
          employeeId: employee.employeeId,
          role: employee.role,
          isTeamLeader: employee.isTeamLeader,
          isSupervisor: employee.isSupervisor,
          customHourlyRate: employee.customHourlyRate,
          hoursThreshold: threshold,
          nationality: employee.nationality,
          trade: employee.trade,
          lowRate,
          highRate,
          isCustom,
          totalWorkingHours: aggregateTotalHours,
          currentTier: aggregateTotalHours >= threshold ? 'premium' : 'standard',
        },
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    console.error('[worklogs GET] Error:', message);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

// POST /api/employees/[id]/worklogs
// Add or update a work log entry (upsert by employee+site+year+month)
// Triggers recalculation from the affected month onward
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { siteId, year, month, hoursWorked, allowances, deductions, force } = body;

    if (!siteId || !year || !month || hoursWorked === undefined) {
      return NextResponse.json(
        { success: false, error: 'siteId, year, month, and hoursWorked are required' },
        { status: 400 }
      );
    }

    const yearNum = parseInt(String(year), 10);
    const monthNum = parseInt(String(month), 10);
    const hours = parseFloat(String(hoursWorked));

    if (monthNum < 1 || monthNum > 12) {
      return NextResponse.json(
        { success: false, error: 'month must be between 1 and 12' },
        { status: 400 }
      );
    }

    // Check if employee exists
    const employee = await db.employee.findUnique({ where: { id } });
    if (!employee) {
      return NextResponse.json(
        { success: false, error: 'Employee not found' },
        { status: 404 }
      );
    }

    // Check if site exists
    const site = await db.site.findUnique({ where: { id: siteId } });
    if (!site) {
      return NextResponse.json(
        { success: false, error: 'Site not found' },
        { status: 404 }
      );
    }

    // Check if any salary record for this month is already paid
    const monthKey = `${yearNum}-${String(monthNum).padStart(2, '0')}`;
    const paidRecords = await db.salaryRecord.findMany({
      where: {
        empId: id,
        siteId,
        month: monthKey,
        year: yearNum,
        isPaid: true,
        isDeleted: false,
      },
    });

    if (paidRecords.length > 0 && !force) {
      return NextResponse.json(
        {
          success: false,
          error: 'This month has already been marked as paid. Set force=true to override.',
          isPaidWarning: true,
          paidRecordIds: paidRecords.map(r => r.id),
        },
        { status: 409 }
      );
    }

    // Upsert the work log
    const workLog = await db.workLog.upsert({
      where: {
        employeeId_siteId_year_month: {
          employeeId: id,
          siteId,
          year: yearNum,
          month: monthNum,
        },
      },
      update: {
        hoursWorked: hours,
        allowances: allowances ? parseFloat(String(allowances)) : 0,
        deductions: deductions ? parseFloat(String(deductions)) : 0,
        deletedAt: null, // un-soft-delete if previously deleted
      },
      create: {
        employeeId: id,
        siteId,
        year: yearNum,
        month: monthNum,
        hoursWorked: hours,
        allowances: allowances ? parseFloat(String(allowances)) : 0,
        deductions: deductions ? parseFloat(String(deductions)) : 0,
      },
    });

    // Trigger recalculation from this month onward
    const recalcResult = await recalcEmployeeFromMonth(id, yearNum, monthNum);

    return NextResponse.json({
      success: true,
      data: {
        workLog: {
          ...workLog,
          createdAt: workLog.createdAt.toISOString(),
          updatedAt: workLog.updatedAt.toISOString(),
        },
        recalculation: recalcResult,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    console.error('[worklogs POST] Error:', message);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

// PUT /api/employees/[id]/worklogs
// Batch update multiple work log entries (for the hours ledger save)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { entries, force } = body;

    if (!Array.isArray(entries) || entries.length === 0) {
      return NextResponse.json(
        { success: false, error: 'entries must be a non-empty array' },
        { status: 400 }
      );
    }

    const employee = await db.employee.findUnique({ where: { id } });
    if (!employee) {
      return NextResponse.json(
        { success: false, error: 'Employee not found' },
        { status: 404 }
      );
    }

    // Check for paid months
    if (!force) {
      for (const entry of entries) {
        const monthKey = `${entry.year}-${String(entry.month).padStart(2, '0')}`;
        const paidRecords = await db.salaryRecord.findMany({
          where: {
            empId: id,
            month: monthKey,
            year: entry.year,
            isPaid: true,
            isDeleted: false,
          },
        });
        if (paidRecords.length > 0) {
          return NextResponse.json(
            {
              success: false,
              error: `Month ${monthKey} has already been marked as paid. Set force=true to override.`,
              isPaidWarning: true,
              month: monthKey,
            },
            { status: 409 }
          );
        }
      }
    }

    const results: Array<{ month: string; action: string }> = [];
    let earliestYear = Infinity;
    let earliestMonth = 13;

    for (const entry of entries) {
      const { siteId, year, month, hoursWorked, allowances, deductions } = entry;
      const yearNum = parseInt(String(year), 10);
      const monthNum = parseInt(String(month), 10);
      const hours = parseFloat(String(hoursWorked ?? 0));
      const effectiveSiteId = siteId || employee.currentSite;

      if (!effectiveSiteId) {
        results.push({ month: `${yearNum}-${String(monthNum).padStart(2, '0')}`, action: 'skipped_no_site' });
        continue;
      }

      // Track earliest month for recalculation
      if (yearNum < earliestYear || (yearNum === earliestYear && monthNum < earliestMonth)) {
        earliestYear = yearNum;
        earliestMonth = monthNum;
      }

      // Upsert work log
      await db.workLog.upsert({
        where: {
          employeeId_siteId_year_month: {
            employeeId: id,
            siteId: effectiveSiteId,
            year: yearNum,
            month: monthNum,
          },
        },
        update: {
          hoursWorked: hours,
          allowances: allowances ? parseFloat(String(allowances)) : 0,
          deductions: deductions ? parseFloat(String(deductions)) : 0,
          deletedAt: hours > 0 ? null : new Date(), // soft-delete if hours = 0
        },
        create: {
          employeeId: id,
          siteId: effectiveSiteId,
          year: yearNum,
          month: monthNum,
          hoursWorked: hours,
          allowances: allowances ? parseFloat(String(allowances)) : 0,
          deductions: deductions ? parseFloat(String(deductions)) : 0,
        },
      });

      results.push({ month: `${yearNum}-${String(monthNum).padStart(2, '0')}`, action: 'upserted' });
    }

    // Trigger recalculation from the earliest changed month
    let recalcResult = null;
    if (earliestYear < Infinity) {
      recalcResult = await recalcEmployeeFromMonth(id, earliestYear, earliestMonth);
    }

    return NextResponse.json({
      success: true,
      data: {
        updated: results.length,
        results,
        recalculation: recalcResult,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    console.error('[worklogs PUT] Error:', message);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

// DELETE /api/employees/[id]/worklogs
// Soft-delete a work log entry (set deletedAt)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const logId = searchParams.get('logId');
    const siteId = searchParams.get('siteId');
    const year = searchParams.get('year');
    const month = searchParams.get('month');

    if (!logId && (!siteId || !year || !month)) {
      return NextResponse.json(
        { success: false, error: 'Either logId or siteId+year+month is required' },
        { status: 400 }
      );
    }

    // Find the work log
    let workLog;
    if (logId) {
      workLog = await db.workLog.findFirst({
        where: { logId: parseInt(logId, 10), employeeId: id },
      });
    } else {
      workLog = await db.workLog.findUnique({
        where: {
          employeeId_siteId_year_month: {
            employeeId: id,
            siteId: siteId!,
            year: parseInt(year!, 10),
            month: parseInt(month!, 10),
          },
        },
      });
    }

    if (!workLog) {
      return NextResponse.json(
        { success: false, error: 'Work log not found' },
        { status: 404 }
      );
    }

    // Check for paid salary records
    const monthKey = `${workLog.year}-${String(workLog.month).padStart(2, '0')}`;
    const paidRecords = await db.salaryRecord.findMany({
      where: {
        empId: id,
        siteId: workLog.siteId,
        month: monthKey,
        year: workLog.year,
        isPaid: true,
        isDeleted: false,
      },
    });

    const force = searchParams.get('force') === 'true';
    if (paidRecords.length > 0 && !force) {
      return NextResponse.json(
        {
          success: false,
          error: 'This month has been marked as paid. Set force=true to override.',
          isPaidWarning: true,
        },
        { status: 409 }
      );
    }

    // Soft delete
    await db.workLog.update({
      where: { logId: workLog.logId },
      data: { deletedAt: new Date() },
    });

    // Trigger recalculation from this month onward
    const recalcResult = await recalcEmployeeFromMonth(id, workLog.year, workLog.month);

    return NextResponse.json({
      success: true,
      data: {
        deleted: true,
        logId: workLog.logId,
        month: monthKey,
        recalculation: recalcResult,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    console.error('[worklogs DELETE] Error:', message);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
