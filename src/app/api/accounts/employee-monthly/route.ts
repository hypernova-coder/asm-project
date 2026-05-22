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

    for (const monthEntry of monthlyData) {
      const { month, totalHours, rtPerHour } = monthEntry;

      // Skip months with no data change needed
      if (typeof totalHours !== 'number' || typeof rtPerHour !== 'number') continue;

      // Find existing salary records for this employee+month+year
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

      if (existingSalaryRecords.length > 0) {
        // Update all existing salary records for this month
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
      } else if (totalHours > 0) {
        // No existing salary records for this month, but hours were entered
        // Find site assignments for this employee+month
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

        if (siteRecords.length > 0) {
          // Create salary records for each site
          for (const siteRecord of siteRecords) {
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
        } else {
          // No site assignment found - try to use the employee's current site
          if (employee.currentSite) {
            const site = await db.site.findUnique({
              where: { id: employee.currentSite },
              select: { id: true, name: true },
            });
            if (site) {
              const created = await db.salaryRecord.create({
                data: {
                  empId,
                  empName: employee.fullName,
                  siteId: site.id,
                  siteName: site.name,
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
              results.push({ month, siteId: site.id, action: 'created', id: created.id });
            }
          } else {
            // Fallback: find any site the employee has ever been assigned to
            const anySiteRecord = await db.empCountSitePerMonth.findFirst({
              where: { empId },
              include: { site: { select: { id: true, name: true } } },
              orderBy: { createdDate: 'desc' },
            });
            if (anySiteRecord) {
              const created = await db.salaryRecord.create({
                data: {
                  empId,
                  empName: employee.fullName,
                  siteId: anySiteRecord.siteId,
                  siteName: anySiteRecord.site.name,
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
              results.push({ month, siteId: anySiteRecord.siteId, action: 'created', id: created.id });
            }
          }
        }
      }
    }

    // Update TotalEmployeeWorkingHours - recalculate total from ALL salary records
    const allSalaryHours = await db.salaryRecord.findMany({
      where: {
        empId,
        isDeleted: false,
      },
      select: { totalHours: true, rtPerHour: true },
    });
    const totalWorkingHours = allSalaryHours.reduce((sum, sr) => sum + sr.totalHours, 0);

    // Use the latest non-zero rtPerHour from salary records, or the one from monthlyData
    const latestRtPerHour = monthlyData
      .filter((m: { rtPerHour: number }) => m.rtPerHour > 0)
      .pop()?.rtPerHour || allSalaryHours
      .filter((sr) => sr.rtPerHour > 0)
      .pop()?.rtPerHour || 2.5;

    // Calculate auto rate based on total hours and TL/Supervisor status
    const hasBonus = employee.isTeamLeader || employee.isSupervisor;
    const autoRate = totalWorkingHours >= 1000 ? (hasBonus ? 5.5 : 5.0) : (hasBonus ? 3.0 : 2.5);

    // Get current working hours record to check if custom
    const currentWH = await db.totalEmployeeWorkingHours.findUnique({
      where: { empId },
    });

    const finalRtPerHour = currentWH?.isCustom ? latestRtPerHour : autoRate;

    await db.totalEmployeeWorkingHours.upsert({
      where: { empId },
      update: {
        totalWorkingHours,
        rtPerHour: finalRtPerHour,
        empName: employee.fullName,
      },
      create: {
        empId,
        empName: employee.fullName,
        totalWorkingHours,
        rtPerHour: finalRtPerHour,
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
