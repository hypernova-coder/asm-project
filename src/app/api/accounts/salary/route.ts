import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// Helper: Calculate RT/HR based on working hours and team leader status
async function calculateRtPerHour(
  empId: string,
  siteId: string
): Promise<number> {
  const workingHours = await db.totalEmployeeWorkingHours.findUnique({
    where: { empId },
  });
  const employee = await db.employee.findUnique({
    where: { id: empId },
    select: { isTeamLeader: true, teamLeaderSiteId: true },
  });

  if (workingHours && workingHours.isCustom) {
    return workingHours.rtPerHour;
  }

  const totalHrs = workingHours?.totalWorkingHours || 0;
  const isTeamLeaderForSite =
    employee?.isTeamLeader && employee?.teamLeaderSiteId === siteId;

  if (totalHrs >= 1000) {
    return isTeamLeaderForSite ? 5.5 : 5.0;
  }
  return isTeamLeaderForSite ? 3.0 : 2.5;
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
      totalWorkingHours, // optional: to update TotalEmployeeWorkingHours
    } = body;

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

    // Check for unique constraint: empId + siteId + month + year
    const existing = await db.salaryRecord.findUnique({
      where: {
        empId_siteId_month_year: {
          empId,
          siteId,
          month,
          year: parseInt(String(year), 10),
        },
      },
    });

    if (existing && !existing.isDeleted) {
      return NextResponse.json(
        { success: false, error: 'Salary record already exists for this employee, site, and month' },
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
          isDeleted: false,
        },
      });

      // Update working hours if provided
      if (typeof totalWorkingHours === 'number') {
        await db.totalEmployeeWorkingHours.upsert({
          where: { empId },
          update: {
            totalWorkingHours,
            empName,
          },
          create: {
            empId,
            empName,
            totalWorkingHours,
            rtPerHour: typeof rtPerHour === 'number' ? rtPerHour : 2.5,
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
      },
    });

    // Update working hours if provided
    if (typeof totalWorkingHours === 'number') {
      await db.totalEmployeeWorkingHours.upsert({
        where: { empId },
        update: {
          totalWorkingHours,
          empName,
        },
        create: {
          empId,
          empName,
          totalWorkingHours,
          rtPerHour: typeof rtPerHour === 'number' ? rtPerHour : 2.5,
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
      totalWorkingHours, // optional: to update TotalEmployeeWorkingHours
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

    const updated = await db.salaryRecord.update({
      where: { id },
      data: updateData,
    });

    // Update working hours if provided
    if (typeof totalWorkingHours === 'number') {
      await db.totalEmployeeWorkingHours.upsert({
        where: { empId: existing.empId },
        update: {
          totalWorkingHours,
        },
        create: {
          empId: existing.empId,
          empName: existing.empName,
          totalWorkingHours,
          rtPerHour: existing.rtPerHour,
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
