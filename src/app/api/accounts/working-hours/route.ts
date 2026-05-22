import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// Helper: Calculate RT/HR based on working hours and team leader status
function calculateRtPerHour(
  totalWorkingHours: number,
  isTeamLeader: boolean,
  isCustom: boolean,
  customRtPerHour: number
): number {
  // If custom, use the custom rate
  if (isCustom) {
    return customRtPerHour;
  }

  // Basic rate: 2.5 for everyone
  // If totalWorkingHours >= 1000: rate becomes 5.0
  // If employee is Team Leader: add 0.5 to both (3.0 basic, 5.5 after 1000hrs)
  if (totalWorkingHours >= 1000) {
    return isTeamLeader ? 5.5 : 5.0;
  }
  return isTeamLeader ? 3.0 : 2.5;
}

// GET: Get all working hours records (with optional search)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const empId = searchParams.get('empId');

    // If a specific empId is requested, return that single record
    if (empId) {
      const record = await db.totalEmployeeWorkingHours.findUnique({
        where: { empId },
        include: {
          employee: {
            select: {
              id: true,
              fullName: true,
              employeeId: true,
              trade: true,
              nationality: true,
              isTeamLeader: true,
              teamLeaderSiteId: true,
              currentSite: true,
            },
          },
        },
      });

      if (!record) {
        return NextResponse.json(
          { success: false, error: 'Working hours record not found for this employee' },
          { status: 404 }
        );
      }

      const calculatedRtPerHour = calculateRtPerHour(
        record.totalWorkingHours,
        record.employee.isTeamLeader,
        record.isCustom,
        record.rtPerHour
      );

      return NextResponse.json({
        success: true,
        data: {
          record: {
            id: record.id,
            empId: record.empId,
            empName: record.empName,
            totalWorkingHours: record.totalWorkingHours,
            rtPerHour: record.rtPerHour,
            isCustom: record.isCustom,
            calculatedRtPerHour,
            createdAt: record.createdAt.toISOString(),
            updatedAt: record.updatedAt.toISOString(),
            employee: {
              ...record.employee,
            },
          },
        },
      });
    }

    // Build where clause for search
    const whereClause: Record<string, unknown> = {};

    if (search) {
      whereClause.OR = [
        { empName: { contains: search } },
        { empId: { contains: search } },
        {
          employee: {
            OR: [
              { fullName: { contains: search } },
              { employeeId: { contains: search } },
              { trade: { contains: search } },
              { nationality: { contains: search } },
            ],
          },
        },
      ];
    }

    const records = await db.totalEmployeeWorkingHours.findMany({
      where: whereClause,
      include: {
        employee: {
          select: {
            id: true,
            fullName: true,
            employeeId: true,
            trade: true,
            nationality: true,
            isTeamLeader: true,
            teamLeaderSiteId: true,
            currentSite: true,
          },
        },
      },
      orderBy: { empName: 'asc' },
    });

    const formattedRecords = records.map((record) => {
      const calculatedRtPerHour = calculateRtPerHour(
        record.totalWorkingHours,
        record.employee.isTeamLeader,
        record.isCustom,
        record.rtPerHour
      );

      return {
        id: record.id,
        empId: record.empId,
        empName: record.empName,
        totalWorkingHours: record.totalWorkingHours,
        rtPerHour: record.rtPerHour,
        isCustom: record.isCustom,
        calculatedRtPerHour,
        createdAt: record.createdAt.toISOString(),
        updatedAt: record.updatedAt.toISOString(),
        employee: {
          ...record.employee,
        },
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        records: formattedRecords,
        total: formattedRecords.length,
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

// POST: Create a new working hours record (or update if exists for empId)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { empId, empName, totalWorkingHours, rtPerHour, isCustom } = body;

    if (!empId || !empName) {
      return NextResponse.json(
        { success: false, error: 'empId and empName are required' },
        { status: 400 }
      );
    }

    // Check if employee exists
    const employee = await db.employee.findUnique({
      where: { id: empId },
      select: {
        id: true,
        fullName: true,
        employeeId: true,
        trade: true,
        nationality: true,
        isTeamLeader: true,
        teamLeaderSiteId: true,
        currentSite: true,
      },
    });

    if (!employee) {
      return NextResponse.json(
        { success: false, error: 'Employee not found' },
        { status: 404 }
      );
    }

    // Calculate RT/HR
    const parsedTotalHours = typeof totalWorkingHours === 'number' ? totalWorkingHours : 0;
    const parsedIsCustom = typeof isCustom === 'boolean' ? isCustom : false;
    const parsedRtPerHour = typeof rtPerHour === 'number' ? rtPerHour : 2.5;

    const calculatedRtPerHour = calculateRtPerHour(
      parsedTotalHours,
      employee.isTeamLeader,
      parsedIsCustom,
      parsedRtPerHour
    );

    // Upsert: create or update if empId already exists
    const record = await db.totalEmployeeWorkingHours.upsert({
      where: { empId },
      update: {
        empName,
        totalWorkingHours: parsedTotalHours,
        rtPerHour: parsedIsCustom ? parsedRtPerHour : calculatedRtPerHour,
        isCustom: parsedIsCustom,
      },
      create: {
        empId,
        empName,
        totalWorkingHours: parsedTotalHours,
        rtPerHour: parsedIsCustom ? parsedRtPerHour : calculatedRtPerHour,
        isCustom: parsedIsCustom,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        record: {
          id: record.id,
          empId: record.empId,
          empName: record.empName,
          totalWorkingHours: record.totalWorkingHours,
          rtPerHour: record.rtPerHour,
          isCustom: record.isCustom,
          calculatedRtPerHour,
          createdAt: record.createdAt.toISOString(),
          updatedAt: record.updatedAt.toISOString(),
          employee,
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

// PUT: Update a working hours record by empId or id
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, empId, totalWorkingHours, rtPerHour, isCustom, empName } = body;

    if (!id && !empId) {
      return NextResponse.json(
        { success: false, error: 'Either id or empId is required' },
        { status: 400 }
      );
    }

    // Find existing record
    let existing;
    if (empId) {
      existing = await db.totalEmployeeWorkingHours.findUnique({
        where: { empId },
        include: {
          employee: {
            select: {
              id: true,
              fullName: true,
              employeeId: true,
              trade: true,
              nationality: true,
              isTeamLeader: true,
              teamLeaderSiteId: true,
              currentSite: true,
            },
          },
        },
      });
    } else {
      existing = await db.totalEmployeeWorkingHours.findUnique({
        where: { id },
        include: {
          employee: {
            select: {
              id: true,
              fullName: true,
              employeeId: true,
              trade: true,
              nationality: true,
              isTeamLeader: true,
              teamLeaderSiteId: true,
              currentSite: true,
            },
          },
        },
      });
    }

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Working hours record not found' },
        { status: 404 }
      );
    }

    // Build update data
    const updateData: Record<string, unknown> = {};
    if (typeof empName === 'string') updateData.empName = empName;
    if (typeof totalWorkingHours === 'number') updateData.totalWorkingHours = totalWorkingHours;

    const finalIsCustom = typeof isCustom === 'boolean' ? isCustom : existing.isCustom;
    updateData.isCustom = finalIsCustom;

    // Calculate or set RT/HR
    const finalTotalHours =
      typeof totalWorkingHours === 'number' ? totalWorkingHours : existing.totalWorkingHours;
    const finalCustomRtPerHour =
      typeof rtPerHour === 'number' ? rtPerHour : existing.rtPerHour;

    if (finalIsCustom) {
      // Use the custom rtPerHour value
      updateData.rtPerHour = typeof rtPerHour === 'number' ? rtPerHour : existing.rtPerHour;
    } else {
      // Auto-calculate based on total hours and team leader status
      const isTeamLeader = existing.employee?.isTeamLeader || false;
      const calculatedRt = calculateRtPerHour(finalTotalHours, isTeamLeader, false, finalCustomRtPerHour);
      updateData.rtPerHour = calculatedRt;
    }

    const updated = await db.totalEmployeeWorkingHours.update({
      where: { id: existing.id },
      data: updateData,
      include: {
        employee: {
          select: {
            id: true,
            fullName: true,
            employeeId: true,
            trade: true,
            nationality: true,
            isTeamLeader: true,
            teamLeaderSiteId: true,
            currentSite: true,
          },
        },
      },
    });

    const calculatedRtPerHour = calculateRtPerHour(
      updated.totalWorkingHours,
      updated.employee.isTeamLeader,
      updated.isCustom,
      updated.rtPerHour
    );

    return NextResponse.json({
      success: true,
      data: {
        record: {
          id: updated.id,
          empId: updated.empId,
          empName: updated.empName,
          totalWorkingHours: updated.totalWorkingHours,
          rtPerHour: updated.rtPerHour,
          isCustom: updated.isCustom,
          calculatedRtPerHour,
          createdAt: updated.createdAt.toISOString(),
          updatedAt: updated.updatedAt.toISOString(),
          employee: updated.employee,
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
