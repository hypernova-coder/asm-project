import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// Helper: Calculate RT/HR based on working hours and team leader/supervisor status
async function calculateRtPerHour(
  empId: string,
  siteId: string
): Promise<number> {
  // Get all monthly working hours records for aggregate total
  const workingHoursRecords = await db.totalEmployeeWorkingHours.findMany({
    where: { empId },
  });
  const totalHrs = workingHoursRecords.reduce((sum, r) => sum + r.totalWorkingHours, 0);
  const hasCustom = workingHoursRecords.some(r => r.isCustom);
  const latestRt = workingHoursRecords.length > 0 ? workingHoursRecords[workingHoursRecords.length - 1].rtPerHour : 2.5;

  if (hasCustom) return latestRt;

  const employee = await db.employee.findUnique({
    where: { id: empId },
    select: { isTeamLeader: true, teamLeaderSiteId: true, isSupervisor: true, supervisorSiteId: true },
  });

  const isTeamLeaderForSite =
    employee?.isTeamLeader && employee?.teamLeaderSiteId === siteId;
  const isSupervisorForSite =
    employee?.isSupervisor && employee?.supervisorSiteId === siteId;
  const hasBonus = isTeamLeaderForSite || isSupervisorForSite;

  if (totalHrs >= 1000) {
    return hasBonus ? 5.5 : 5.0;
  }
  return hasBonus ? 3.0 : 2.5;
}

// POST: Create a new salary record
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      empId,
      empName,
      siteId,
      siteName,
      month,
      year,
      nationality,
      trade,
      employeeCode,
      slNo,
      totalHours,
      rtPerHour,
      totalSalary,
      deduction,
      advance,
      balanceSalary,
      isPaid,
      rateTier, // "standard" or "premium"
      totalWorkingHours, // optional: to update TotalEmployeeWorkingHours
      updateWorkingHours, // bidirectional sync flag
    } = body;

    const effectiveRateTier = rateTier || 'standard';

    // Validate required fields
    if (!empId || !empName || !siteId || !siteName || !month || !year) {
      return NextResponse.json(
        { success: false, error: 'empId, empName, siteId, siteName, month, and year are required' },
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

    // Check for unique constraint: empId + siteId + month + year + rateTier
    const existing = await db.salaryRecord.findUnique({
      where: {
        empId_siteId_month_year_rateTier: {
          empId,
          siteId,
          month,
          year: parseInt(String(year), 10),
          rateTier: effectiveRateTier,
        },
      },
    });

    if (existing && !existing.isDeleted) {
      return NextResponse.json(
        { success: false, error: `Salary record already exists for this employee, site, month, and rate tier (${effectiveRateTier})` },
        { status: 409 }
      );
    }

    // If there's a soft-deleted record, we can restore/update it
    if (existing && existing.isDeleted) {
      const updated = await db.salaryRecord.update({
        where: { id: existing.id },
        data: {
          empName,
          siteName,
          nationality: nationality || '',
          trade: trade || '',
          employeeCode: employeeCode || '',
          slNo: typeof slNo === 'number' ? slNo : 0,
          totalHours: typeof totalHours === 'number' ? totalHours : 0,
          rtPerHour: typeof rtPerHour === 'number' ? rtPerHour : 2.5,
          totalSalary: typeof totalSalary === 'number' ? totalSalary : 0,
          deduction: typeof deduction === 'number' ? deduction : 0,
          advance: typeof advance === 'number' ? advance : 0,
          balanceSalary: typeof balanceSalary === 'number' ? balanceSalary : 0,
          isPaid: typeof isPaid === 'boolean' ? isPaid : false,
          rateTier: effectiveRateTier,
          isDeleted: false,
        },
      });

      // Bidirectional sync: update TotalEmployeeWorkingHours for the month
      // Sum ALL salary records for this employee+month (both standard and premium)
      if (updateWorkingHours || typeof totalWorkingHours === 'number') {
        const allSalaryRecords = await db.salaryRecord.findMany({
          where: { empId, month, isDeleted: false },
        });
        const totalHoursFromSalary = allSalaryRecords.reduce((sum, sr) => sum + sr.totalHours, 0);

        await db.totalEmployeeWorkingHours.upsert({
          where: { empId_month: { empId, month } },
          update: {
            totalWorkingHours: totalHoursFromSalary,
            empName,
          },
          create: {
            empId,
            empName,
            month,
            totalWorkingHours: totalHoursFromSalary,
            rtPerHour: 2.5,
            isCustom: false,
          },
        });
      }

      return NextResponse.json({
        success: true,
        data: {
          salaryRecord: {
            ...updated,
            createdAt: updated.createdAt.toISOString(),
            updatedAt: updated.updatedAt.toISOString(),
          },
        },
      });
    }

    // Create new salary record
    const salaryRecord = await db.salaryRecord.create({
      data: {
        empId,
        empName,
        siteId,
        siteName,
        month,
        year: parseInt(String(year), 10),
        nationality: nationality || '',
        trade: trade || '',
        employeeCode: employeeCode || '',
        slNo: typeof slNo === 'number' ? slNo : 0,
        totalHours: typeof totalHours === 'number' ? totalHours : 0,
        rtPerHour: typeof rtPerHour === 'number' ? rtPerHour : 2.5,
        totalSalary: typeof totalSalary === 'number' ? totalSalary : 0,
        deduction: typeof deduction === 'number' ? deduction : 0,
        advance: typeof advance === 'number' ? advance : 0,
        balanceSalary: typeof balanceSalary === 'number' ? balanceSalary : 0,
        isPaid: typeof isPaid === 'boolean' ? isPaid : false,
        rateTier: effectiveRateTier,
      },
    });

    // Bidirectional sync: update TotalEmployeeWorkingHours for the month
    // Sum ALL salary records for this employee+month (both standard and premium)
    if (updateWorkingHours || typeof totalWorkingHours === 'number') {
      const allSalaryRecords = await db.salaryRecord.findMany({
        where: { empId, month, isDeleted: false },
      });
      const totalHoursFromSalary = allSalaryRecords.reduce((sum, sr) => sum + sr.totalHours, 0);

      await db.totalEmployeeWorkingHours.upsert({
        where: { empId_month: { empId, month } },
        update: {
          totalWorkingHours: totalHoursFromSalary,
          empName,
        },
        create: {
          empId,
          empName,
          month,
          totalWorkingHours: totalHoursFromSalary,
          rtPerHour: 2.5,
          isCustom: false,
        },
      });
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          salaryRecord: {
            ...salaryRecord,
            createdAt: salaryRecord.createdAt.toISOString(),
            updatedAt: salaryRecord.updatedAt.toISOString(),
          },
        },
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

// PUT: Update a salary record (by id)
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      id,
      totalHours,
      rtPerHour,
      totalSalary,
      deduction,
      advance,
      balanceSalary,
      isPaid,
      rateTier,
      totalWorkingHours, // optional: to update TotalEmployeeWorkingHours
      updateWorkingHours, // bidirectional sync flag
    } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Salary record id is required' },
        { status: 400 }
      );
    }

    // Check the salary record exists
    const existing = await db.salaryRecord.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Salary record not found' },
        { status: 404 }
      );
    }

    if (existing.isDeleted) {
      return NextResponse.json(
        { success: false, error: 'Cannot update a deleted salary record' },
        { status: 400 }
      );
    }

    // Build update data
    const updateData: Record<string, unknown> = {};
    if (typeof totalHours === 'number') updateData.totalHours = totalHours;
    if (typeof rtPerHour === 'number') updateData.rtPerHour = rtPerHour;
    if (typeof totalSalary === 'number') updateData.totalSalary = totalSalary;
    if (typeof deduction === 'number') updateData.deduction = deduction;
    if (typeof advance === 'number') updateData.advance = advance;
    if (typeof balanceSalary === 'number') updateData.balanceSalary = balanceSalary;
    if (typeof isPaid === 'boolean') updateData.isPaid = isPaid;
    if (typeof rateTier === 'string' && rateTier) updateData.rateTier = rateTier;

    const updated = await db.salaryRecord.update({
      where: { id },
      data: updateData,
    });

    // Bidirectional sync: update TotalEmployeeWorkingHours for the month
    // Sum ALL salary records for this employee+month (both standard and premium)
    if (updateWorkingHours || typeof totalWorkingHours === 'number') {
      const allSalaryRecords = await db.salaryRecord.findMany({
        where: { empId: existing.empId, month: existing.month, isDeleted: false },
      });
      const totalHoursFromSalary = allSalaryRecords.reduce((sum, sr) => sum + sr.totalHours, 0);

      await db.totalEmployeeWorkingHours.upsert({
        where: { empId_month: { empId: existing.empId, month: existing.month } },
        update: {
          totalWorkingHours: totalHoursFromSalary,
        },
        create: {
          empId: existing.empId,
          empName: existing.empName,
          month: existing.month,
          totalWorkingHours: totalHoursFromSalary,
          rtPerHour: 2.5,
          isCustom: false,
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        salaryRecord: {
          ...updated,
          createdAt: updated.createdAt.toISOString(),
          updatedAt: updated.updatedAt.toISOString(),
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

// DELETE: Soft-delete a salary record (set isDeleted=true)
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Salary record id is required' },
        { status: 400 }
      );
    }

    // Check the salary record exists
    const existing = await db.salaryRecord.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Salary record not found' },
        { status: 404 }
      );
    }

    if (existing.isDeleted) {
      return NextResponse.json(
        { success: false, error: 'Salary record is already deleted' },
        { status: 400 }
      );
    }

    // Soft delete
    const updated = await db.salaryRecord.update({
      where: { id },
      data: { isDeleted: true },
    });

    return NextResponse.json({
      success: true,
      data: {
        salaryRecord: {
          ...updated,
          createdAt: updated.createdAt.toISOString(),
          updatedAt: updated.updatedAt.toISOString(),
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
