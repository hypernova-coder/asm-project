import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/working-hours?month=YYYY-MM&empId=...
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const month = searchParams.get('month'); // YYYY-MM
    const empId = searchParams.get('empId');

    const where: Record<string, unknown> = {
      isDeleted: false,
    };

    if (month) {
      where.month = month;
    }

    if (empId) {
      where.empId = empId;
    }

    const workingHours = await db.totalEmployeeWorkingHours.findMany({
      where,
      orderBy: [{ month: 'desc' }, { empName: 'asc' }],
    });

    return NextResponse.json({
      success: true,
      data: {
        workingHours: workingHours.map((w) => ({
          ...w,
          createdAt: w.createdAt.toISOString(),
          updatedAt: w.updatedAt.toISOString(),
        })),
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

// POST /api/working-hours — Create or update working hours record
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { empId, empName, month, totalWorkingHours, rtPerHour, isCustom } = body;

    if (!empId || !month) {
      return NextResponse.json(
        { success: false, error: 'empId and month (YYYY-MM) are required' },
        { status: 400 }
      );
    }

    // Verify employee exists
    const employee = await db.employee.findUnique({ where: { id: empId } });
    if (!employee) {
      return NextResponse.json(
        { success: false, error: 'Employee not found' },
        { status: 404 }
      );
    }

    // Check if record already exists for empId + month
    const existing = await db.totalEmployeeWorkingHours.findUnique({
      where: {
        empId_month: {
          empId,
          month,
        },
      },
    });

    if (existing && !existing.isDeleted) {
      // Update existing record
      const resolvedRtPerHour = isCustom ? (rtPerHour ?? existing.rtPerHour) : (rtPerHour ?? 2.5);

      const workingHour = await db.totalEmployeeWorkingHours.update({
        where: { id: existing.id },
        data: {
          totalWorkingHours: totalWorkingHours ?? existing.totalWorkingHours,
          rtPerHour: resolvedRtPerHour,
          isCustom: isCustom ?? existing.isCustom,
          empName: empName || existing.empName,
        },
      });

      return NextResponse.json({
        success: true,
        data: {
          workingHour: {
            ...workingHour,
            createdAt: workingHour.createdAt.toISOString(),
            updatedAt: workingHour.updatedAt.toISOString(),
          },
        },
      });
    } else if (existing && existing.isDeleted) {
      // Reactivate soft-deleted record
      const workingHour = await db.totalEmployeeWorkingHours.update({
        where: { id: existing.id },
        data: {
          totalWorkingHours: totalWorkingHours ?? 0,
          rtPerHour: rtPerHour ?? 2.5,
          isCustom: isCustom ?? false,
          empName: empName || existing.empName,
          isDeleted: false,
        },
      });

      return NextResponse.json({
        success: true,
        data: {
          workingHour: {
            ...workingHour,
            createdAt: workingHour.createdAt.toISOString(),
            updatedAt: workingHour.updatedAt.toISOString(),
          },
        },
      });
    } else {
      // Create new record
      const workingHour = await db.totalEmployeeWorkingHours.create({
        data: {
          empId,
          empName: empName || employee.fullName,
          month,
          totalWorkingHours: totalWorkingHours ?? 0,
          rtPerHour: rtPerHour ?? 2.5,
          isCustom: isCustom ?? false,
          isDeleted: false,
        },
      });

      return NextResponse.json(
        {
          success: true,
          data: {
            workingHour: {
              ...workingHour,
              createdAt: workingHour.createdAt.toISOString(),
              updatedAt: workingHour.updatedAt.toISOString(),
            },
          },
        },
        { status: 201 }
      );
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
