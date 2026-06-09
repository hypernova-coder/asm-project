import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/salary-records?siteId=xxx&month=YYYY-MM&year=YYYY
// If siteId is not provided, returns all records for the month (for consolidated view)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const siteId = searchParams.get('siteId');
    const month = searchParams.get('month'); // YYYY-MM
    const yearStr = searchParams.get('year');

    if (!month) {
      return NextResponse.json(
        { success: false, error: 'month query parameter is required' },
        { status: 400 }
      );
    }

    const yearNum = yearStr ? parseInt(yearStr, 10) : parseInt(month.split('-')[0], 10);

    const where: Record<string, unknown> = {
      month,
      year: yearNum,
      isDeleted: false,
    };

    if (siteId) {
      where.siteId = siteId;
    }

    const records = await db.salaryRecord.findMany({
      where,
      orderBy: [{ slNo: 'asc' }, { empName: 'asc' }],
      include: {
        employee: {
          select: {
            id: true,
            fullName: true,
            employeeId: true,
            currentSite: true,
            trade: true,
            nationality: true,
          },
        },
      },
    });

    // If no siteId filter, also compute site summaries for consolidated view
    let siteSummaries: Array<{
      siteId: string;
      siteName: string;
      clientName: string | null;
      employeeCount: number;
      totalHours: number;
      totalSalary: number;
      totalDeductions: number;
      totalAdvances: number;
      netBalance: number;
      paidCount: number;
      totalRecords: number;
      employees: typeof records;
    }> = [];

    let totals: {
      totalSites: number;
      totalEmployees: number;
      totalHours: number;
      totalSalary: number;
      totalDeductions: number;
      totalAdvances: number;
      netBalance: number;
      paidCount: number;
      totalRecords: number;
    } | null = null;

    if (!siteId) {
      // Group records by site
      const siteMap = new Map<string, typeof records>();
      for (const record of records) {
        const key = record.siteId;
        if (!siteMap.has(key)) {
          siteMap.set(key, []);
        }
        siteMap.get(key)!.push(record);
      }

      // Fetch site details
      const sites = await db.site.findMany({
        where: { id: { in: Array.from(siteMap.keys()) } },
        select: { id: true, name: true, clientName: true },
      });
      const siteInfoMap = new Map(sites.map(s => [s.id, s]));

      // Build site summaries
      for (const [sId, sRecords] of siteMap) {
        const siteInfo = siteInfoMap.get(sId);
        siteSummaries.push({
          siteId: sId,
          siteName: siteInfo?.name || sRecords[0]?.siteName || 'Unknown',
          clientName: siteInfo?.clientName || null,
          employeeCount: sRecords.length,
          totalHours: sRecords.reduce((sum, r) => sum + r.totalHours, 0),
          totalSalary: sRecords.reduce((sum, r) => sum + r.totalSalary, 0),
          totalDeductions: sRecords.reduce((sum, r) => sum + r.deduction, 0),
          totalAdvances: sRecords.reduce((sum, r) => sum + r.advance, 0),
          netBalance: sRecords.reduce((sum, r) => sum + r.balanceSalary, 0),
          paidCount: sRecords.filter(r => r.isPaid).length,
          totalRecords: sRecords.length,
          employees: sRecords,
        });
      }

      // Sort by site name
      siteSummaries.sort((a, b) => a.siteName.localeCompare(b.siteName));

      // Grand totals
      totals = {
        totalSites: siteSummaries.length,
        totalEmployees: records.length,
        totalHours: records.reduce((sum, r) => sum + r.totalHours, 0),
        totalSalary: records.reduce((sum, r) => sum + r.totalSalary, 0),
        totalDeductions: records.reduce((sum, r) => sum + r.deduction, 0),
        totalAdvances: records.reduce((sum, r) => sum + r.advance, 0),
        netBalance: records.reduce((sum, r) => sum + r.balanceSalary, 0),
        paidCount: records.filter(r => r.isPaid).length,
        totalRecords: records.length,
      };
    }

    return NextResponse.json({
      success: true,
      data: { records, siteSummaries, totals },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

// POST /api/salary-records - Generate salary records from attendance
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { siteId, siteName, month, year, generateFromAttendance } = body;

    if (!siteId || !siteName || !month || !year) {
      return NextResponse.json(
        { success: false, error: 'siteId, siteName, month, and year are required' },
        { status: 400 }
      );
    }

    if (!generateFromAttendance) {
      return NextResponse.json(
        { success: false, error: 'Only generateFromAttendance mode is supported' },
        { status: 400 }
      );
    }

    // Find the site to get its name for matching employees
    const site = await db.site.findUnique({ where: { id: siteId } });
    if (!site) {
      return NextResponse.json(
        { success: false, error: 'Site not found' },
        { status: 404 }
      );
    }

    // Get all active employees at this site
    const employees = await db.employee.findMany({
      where: {
        currentSite: site.name,
        status: 'active',
      },
      orderBy: { employeeId: 'asc' },
    });

    if (employees.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No active employees found at this site' },
        { status: 400 }
      );
    }

    // Delete any existing salary records for this site+month (soft delete)
    await db.salaryRecord.updateMany({
      where: {
        siteId,
        month,
        year,
        isDeleted: false,
      },
      data: { isDeleted: true },
    });

    // Get working hours for employees at this site for this month
    const workingHours = await db.totalEmployeeWorkingHours.findMany({
      where: {
        month,
        isDeleted: false,
      },
    });

    const workingHoursMap = new Map<string, { totalWorkingHours: number; rtPerHour: number; isCustom: boolean }>();
    for (const wh of workingHours) {
      workingHoursMap.set(wh.empId, {
        totalWorkingHours: wh.totalWorkingHours,
        rtPerHour: wh.rtPerHour,
        isCustom: wh.isCustom,
      });
    }

    // Get attendance-based hours calculation for employees at this site
    const attendanceRecords = await db.attendance.findMany({
      where: {
        date: { startsWith: month },
        isHidden: false,
      },
    });

    // Calculate total hours per employee from attendance
    const attendanceHoursMap = new Map<string, { presentDays: number; overtimeHours: number; absentDays: number }>();
    for (const att of attendanceRecords) {
      const existing = attendanceHoursMap.get(att.employeeId) || { presentDays: 0, overtimeHours: 0, absentDays: 0 };
      if (att.status === 'present') {
        existing.presentDays += 1;
      } else if (att.status === 'overtime') {
        existing.overtimeHours += att.overtimeHours || 0;
        existing.presentDays += 1; // overtime also counts as present
      } else if (att.status === 'absent') {
        existing.absentDays += 1;
      }
      attendanceHoursMap.set(att.employeeId, existing);
    }

    // Calculate cumulative hours for rate tier determination
    const allWorkingHours = await db.totalEmployeeWorkingHours.findMany({
      where: { isDeleted: false },
      orderBy: { month: 'asc' },
    });

    // Map of empId -> total cumulative hours up to but not including this month
    const cumulativeHoursMap = new Map<string, number>();
    for (const wh of allWorkingHours) {
      if (wh.month < month) {
        cumulativeHoursMap.set(wh.empId, (cumulativeHoursMap.get(wh.empId) || 0) + wh.totalWorkingHours);
      }
    }

    // Create salary records
    let created = 0;
    let slNo = 1;

    for (const emp of employees) {
      // Get total hours: prefer working hours table, fallback to attendance calculation
      const whData = workingHoursMap.get(emp.id);
      const attData = attendanceHoursMap.get(emp.id);

      let totalHours = 0;
      let rtPerHour = 2.5; // default rate

      if (whData) {
        totalHours = whData.totalWorkingHours;
        rtPerHour = whData.rtPerHour;
      } else if (attData) {
        // Estimate: each present day = 8 hours + overtime hours
        totalHours = attData.presentDays * 8 + attData.overtimeHours;
      }

      // Determine rate tier based on cumulative hours
      const cumulativeHours = cumulativeHoursMap.get(emp.id) || 0;
      const totalCumulative = cumulativeHours + totalHours;
      const rateTier = totalCumulative > emp.hoursThreshold ? 'premium' : 'standard';

      // Adjust rate based on tier if not custom
      if (!whData?.isCustom) {
        if (rateTier === 'premium') {
          // Premium rate: could be higher (e.g., 3.5 instead of 2.5)
          rtPerHour = Math.max(rtPerHour, 3.5);
        }
      }

      const totalSalary = totalHours * rtPerHour;
      const deduction = 0;
      const advance = 0;
      const balanceSalary = totalSalary - deduction - advance;

      await db.salaryRecord.create({
        data: {
          empId: emp.id,
          empName: emp.fullName,
          siteId,
          siteName: site.name,
          month,
          year,
          nationality: emp.nationality || '',
          trade: emp.trade || emp.position || '',
          employeeCode: emp.employeeId,
          slNo,
          totalHours,
          rtPerHour,
          totalSalary,
          deduction,
          advance,
          balanceSalary,
          isPaid: false,
          rateTier,
        },
      });

      created++;
      slNo++;
    }

    return NextResponse.json({
      success: true,
      data: {
        created,
        message: `${created} salary records generated for ${site.name}`,
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

// PUT /api/salary-records - Update individual salary record
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, deduction, advance, rtPerHour, isPaid } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Record id is required' },
        { status: 400 }
      );
    }

    const existing = await db.salaryRecord.findUnique({ where: { id } });
    if (!existing || existing.isDeleted) {
      return NextResponse.json(
        { success: false, error: 'Salary record not found' },
        { status: 404 }
      );
    }

    const updateData: Record<string, unknown> = {};

    if (typeof deduction === 'number') {
      updateData.deduction = Math.max(0, deduction);
    }
    if (typeof advance === 'number') {
      updateData.advance = Math.max(0, advance);
    }
    if (typeof rtPerHour === 'number') {
      updateData.rtPerHour = Math.max(0, rtPerHour);
    }
    if (typeof isPaid === 'boolean') {
      updateData.isPaid = isPaid;
    }

    // Recalculate totalSalary and balanceSalary
    const newRtPerHour = typeof rtPerHour === 'number' ? Math.max(0, rtPerHour) : existing.rtPerHour;
    const newDeduction = typeof deduction === 'number' ? Math.max(0, deduction) : existing.deduction;
    const newAdvance = typeof advance === 'number' ? Math.max(0, advance) : existing.advance;

    const totalSalary = existing.totalHours * newRtPerHour;
    const balanceSalary = totalSalary - newDeduction - newAdvance;

    updateData.totalSalary = totalSalary;
    updateData.balanceSalary = balanceSalary;

    const updated = await db.salaryRecord.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      data: { record: updated },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
