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

    // Get working hours record
    const workingHours = await db.totalEmployeeWorkingHours.findUnique({
      where: { empId },
    });

    // Get all salary records for this employee for the given year
    const salaryRecords = await db.salaryRecord.findMany({
      where: {
        empId,
        year,
        isDeleted: false,
      },
      orderBy: { month: 'asc' },
    });

    // Build monthly data for all 12 months
    const monthlyData = [];
    for (let m = 0; m < 12; m++) {
      const monthStr = `${year}-${String(m + 1).padStart(2, '0')}`;
      const record = salaryRecords.find((sr) => sr.month === monthStr);

      monthlyData.push({
        month: monthStr,
        totalHours: record?.totalHours || 0,
        rtPerHour: record?.rtPerHour || workingHours?.rtPerHour || 2.5,
        salaryRecordId: record?.id || null,
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        monthlyData,
        employeeInfo: {
          isTeamLeader: employee.isTeamLeader,
          isSupervisor: employee.isSupervisor,
          totalWorkingHours: workingHours?.totalWorkingHours || 0,
          rtPerHour: workingHours?.rtPerHour || 2.5,
          isCustom: workingHours?.isCustom || false,
        },
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

// PUT: Update monthly hours for a specific employee and year
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
      },
    });

    if (!employee) {
      return NextResponse.json(
        { success: false, error: 'Employee not found' },
        { status: 404 }
      );
    }

    const results = [];

    for (const monthEntry of monthlyData) {
      const { month, totalHours, rtPerHour } = monthEntry;

      // For each month, we need to update/create salary records for ALL sites this employee works at
      // First, find all EmpCountSitePerMonth records for this employee+month
      const siteRecords = await db.empCountSitePerMonth.findMany({
        where: {
          empId,
          month,
          deletedDate: null,
        },
        include: {
          site: { select: { id: true, name: true } },
        },
      });

      // Also find any existing salary records for this employee+month
      const existingSalaryRecords = await db.salaryRecord.findMany({
        where: {
          empId,
          month,
          year,
          isDeleted: false,
        },
      });

      // Calculate total salary and balance
      const totalSalary = totalHours * rtPerHour;

      if (siteRecords.length > 0) {
        // Update salary records for each site
        for (const siteRecord of siteRecords) {
          const existingSalary = existingSalaryRecords.find(
            (sr) => sr.siteId === siteRecord.siteId
          );

          if (existingSalary) {
            // Update existing salary record
            const updated = await db.salaryRecord.update({
              where: { id: existingSalary.id },
              data: {
                totalHours,
                rtPerHour,
                totalSalary,
                balanceSalary: totalSalary - existingSalary.deduction - existingSalary.advance,
              },
            });
            results.push({ month, siteId: siteRecord.siteId, action: 'updated', id: updated.id });
          } else {
            // Create new salary record
            const created = await db.salaryRecord.create({
              data: {
                empId,
                empName: employee.fullName,
                siteId: siteRecord.siteId,
                siteName: siteRecord.site.name,
                month,
                year,
                nationality: '',
                trade: '',
                employeeCode: employee.employeeId,
                slNo: 0,
                totalHours,
                rtPerHour,
                totalSalary,
                deduction: 0,
                advance: 0,
                balanceSalary: totalSalary,
                isPaid: false,
              },
            });
            results.push({ month, siteId: siteRecord.siteId, action: 'created', id: created.id });
          }
        }
      } else if (existingSalaryRecords.length > 0) {
        // Update existing salary records even if no site records found
        for (const existingSalary of existingSalaryRecords) {
          const updated = await db.salaryRecord.update({
            where: { id: existingSalary.id },
            data: {
              totalHours,
              rtPerHour,
              totalSalary,
              balanceSalary: totalSalary - existingSalary.deduction - existingSalary.advance,
            },
          });
          results.push({ month, siteId: existingSalary.siteId, action: 'updated', id: updated.id });
        }
      }
    }

    // Update TotalEmployeeWorkingHours - recalculate total from all months
    // Sum up all salary record hours across all years
    const allSalaryHours = await db.salaryRecord.findMany({
      where: {
        empId,
        isDeleted: false,
      },
      select: { totalHours: true },
    });
    const totalWorkingHours = allSalaryHours.reduce((sum, sr) => sum + sr.totalHours, 0);

    // Get the latest rtPerHour from the monthly data
    const latestRtPerHour = monthlyData.length > 0 ? monthlyData[monthlyData.length - 1].rtPerHour : 2.5;

    await db.totalEmployeeWorkingHours.upsert({
      where: { empId },
      update: {
        totalWorkingHours,
        rtPerHour: latestRtPerHour,
        empName: employee.fullName,
      },
      create: {
        empId,
        empName: employee.fullName,
        totalWorkingHours,
        rtPerHour: latestRtPerHour,
        isCustom: false,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        updated: results.length,
        results,
        totalWorkingHours,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
