import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET: Get monthly hours data for a specific employee and year
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const empId = searchParams.get('empId');
    const yearParam = searchParams.get('year');

    if (!empId) {
      return NextResponse.json(
        { success: false, error: 'empId is required' },
        { status: 400 }
      );
    }

    const year = yearParam ? parseInt(yearParam, 10) : new Date().getFullYear();
    if (isNaN(year)) {
      return NextResponse.json(
        { success: false, error: 'year must be a valid integer' },
        { status: 400 }
      );
    }

    // Get employee info
    const employee = await db.employee.findUnique({
      where: { id: empId },
      select: {
        id: true,
        fullName: true,
        employeeId: true,
        isTeamLeader: true,
        isSupervisor: true,
      },
    });

    if (!employee) {
      return NextResponse.json(
        { success: false, error: 'Employee not found' },
        { status: 404 }
      );
    }

    // Get all monthly working hours records for this employee for the given year
    const yearPrefix = `${year}-`;
    const monthlyRecords = await db.totalEmployeeWorkingHours.findMany({
      where: {
        empId,
        month: { startsWith: yearPrefix },
        isDeleted: false,
      },
      orderBy: { month: 'asc' },
    });

    // Get aggregate total across all years for RT/HR calculation
    const allRecords = await db.totalEmployeeWorkingHours.findMany({
      where: { empId, isDeleted: false },
      select: { totalWorkingHours: true, rtPerHour: true, isCustom: true, month: true },
    });
    const aggregateTotalHours = allRecords.reduce((sum, r) => sum + r.totalWorkingHours, 0);

    // Get the latest custom status and rate
    const hasCustom = allRecords.some(r => r.isCustom);
    const latestRate = allRecords.length > 0
      ? allRecords[allRecords.length - 1].rtPerHour
      : 2.5;

    // Auto-calculate the aggregate rate
    const hasBonus = employee.isTeamLeader || employee.isSupervisor;
    const autoRate = aggregateTotalHours >= 1000 ? (hasBonus ? 5.5 : 5.0) : (hasBonus ? 3.0 : 2.5);

    // Build monthly data for all 12 months
    const monthlyData = [];
    for (let m = 0; m < 12; m++) {
      const monthStr = `${year}-${String(m + 1).padStart(2, '0')}`;
      const record = monthlyRecords.find((r) => r.month === monthStr);

      monthlyData.push({
        month: monthStr,
        totalHours: record?.totalWorkingHours ?? 0,
        rtPerHour: record?.rtPerHour ?? (hasCustom ? latestRate : autoRate),
        recordId: record?.id || null,
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        monthlyData,
        employeeInfo: {
          isTeamLeader: employee.isTeamLeader,
          isSupervisor: employee.isSupervisor,
          totalWorkingHours: aggregateTotalHours,
          rtPerHour: hasCustom ? latestRate : autoRate,
          isCustom: hasCustom,
        },
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    console.error('[employee-monthly GET] Error:', message);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

// PUT: Update monthly hours for a specific employee
// This endpoint handles saving per-month hours to TotalEmployeeWorkingHours
// and bidirectionally syncing with SalaryRecord
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { empId, year, monthlyData } = body;

    if (!empId || !year || !monthlyData || !Array.isArray(monthlyData)) {
      return NextResponse.json(
        { success: false, error: 'empId, year, and monthlyData are required' },
        { status: 400 }
      );
    }

    // Get employee info
    const employee = await db.employee.findUnique({
      where: { id: empId },
      select: {
        id: true,
        fullName: true,
        employeeId: true,
        isTeamLeader: true,
        isSupervisor: true,
        currentSite: true,
      },
    });

    if (!employee) {
      return NextResponse.json(
        { success: false, error: 'Employee not found' },
        { status: 404 }
      );
    }

    const results = [];
    const errors = [];

    for (const monthEntry of monthlyData) {
      const { month, totalHours, rtPerHour } = monthEntry;

      // Validate each entry
      if (!month || typeof month !== 'string') {
        errors.push({ month, error: 'Invalid month value' });
        continue;
      }

      const numTotalHours = typeof totalHours === 'number' ? totalHours : 0;
      const numRtPerHour = typeof rtPerHour === 'number' ? rtPerHour : 2.5;

      try {
        // Upsert into TotalEmployeeWorkingHours (per employee per month)
        const upserted = await db.totalEmployeeWorkingHours.upsert({
          where: {
            empId_month: { empId, month },
          },
          update: {
            totalWorkingHours: numTotalHours,
            rtPerHour: numRtPerHour,
            empName: employee.fullName,
            isDeleted: false,
          },
          create: {
            empId,
            empName: employee.fullName,
            month,
            totalWorkingHours: numTotalHours,
            rtPerHour: numRtPerHour,
            isCustom: false,
          },
        });
        results.push({ month, action: 'upserted', id: upserted.id, totalWorkingHours: upserted.totalWorkingHours });

        // Bidirectional sync: update SalaryRecord if records exist for this month
        const existingSalaryRecords = await db.salaryRecord.findMany({
          where: { empId, month, year: parseInt(String(year), 10), isDeleted: false },
        });

        const totalSalary = numTotalHours * numRtPerHour;

        if (existingSalaryRecords.length > 0) {
          // Update existing salary records
          for (const sr of existingSalaryRecords) {
            await db.salaryRecord.update({
              where: { id: sr.id },
              data: {
                totalHours: numTotalHours,
                rtPerHour: numRtPerHour,
                totalSalary,
                balanceSalary: totalSalary - sr.deduction - sr.advance,
              },
            });
          }
        } else if (numTotalHours > 0) {
          // Try to create salary record if we can find a site
          const siteRecords = await db.empCountSitePerMonth.findMany({
            where: { empId, month, deletedDate: null },
            include: { site: { select: { id: true, name: true } } },
          });

          let siteId: string | null = null;
          let siteName = '';

          if (siteRecords.length > 0) {
            siteId = siteRecords[0].siteId;
            siteName = siteRecords[0].site.name;
          } else if (employee.currentSite) {
            const site = await db.site.findUnique({ where: { id: employee.currentSite } });
            if (site) {
              siteId = site.id;
              siteName = site.name;
            }
          }

          if (!siteId) {
            // Try any historical site assignment
            const anySiteRecord = await db.empCountSitePerMonth.findFirst({
              where: { empId },
              include: { site: { select: { id: true, name: true } } },
              orderBy: { createdDate: 'desc' },
            });
            if (anySiteRecord) {
              siteId = anySiteRecord.siteId;
              siteName = anySiteRecord.site.name;
            }
          }

          if (siteId) {
            const salaryYear = parseInt(month.split('-')[0], 10);
            await db.salaryRecord.create({
              data: {
                empId,
                empName: employee.fullName,
                siteId,
                siteName,
                month,
                year: salaryYear,
                nationality: '',
                trade: '',
                employeeCode: employee.employeeId,
                slNo: 0,
                totalHours: numTotalHours,
                rtPerHour: numRtPerHour,
                totalSalary,
                deduction: 0,
                advance: 0,
                balanceSalary: totalSalary,
                isPaid: false,
              },
            });
          }
        }
      } catch (monthError: unknown) {
        const errMsg = monthError instanceof Error ? monthError.message : 'Unknown error';
        console.error(`[employee-monthly PUT] Error saving month ${month}:`, errMsg);
        errors.push({ month, error: errMsg });
      }
    }

    // Calculate aggregate total working hours across all months
    const allRecords = await db.totalEmployeeWorkingHours.findMany({
      where: { empId, isDeleted: false },
      select: { totalWorkingHours: true },
    });
    const aggregateTotalHours = allRecords.reduce((sum, r) => sum + r.totalWorkingHours, 0);

    return NextResponse.json({
      success: true,
      data: {
        updated: results.length,
        results,
        errors: errors.length > 0 ? errors : undefined,
        totalWorkingHours: aggregateTotalHours,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    console.error('[employee-monthly PUT] Error:', message);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
