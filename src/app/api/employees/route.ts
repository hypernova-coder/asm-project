import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { encrypt, decrypt } from '@/lib/crypto';

// Helper: decrypt sensitive fields on read
function decryptEmployee(employee: Record<string, unknown>) {
  if (employee.passportNumber) {
    employee.passportNumber = decrypt(employee.passportNumber as string);
  }
  if (employee.idNumber) {
    employee.idNumber = decrypt(employee.idNumber as string);
  }
  return employee;
}

// Generate auto employeeId: ASM-YYYY-NNN
async function generateEmployeeId(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `ASM-${year}-`;

  // Find existing employees with this year prefix
  const employees = await db.employee.findMany({
    where: {
      employeeId: {
        startsWith: prefix,
      },
    },
    select: { employeeId: true },
    orderBy: { employeeId: 'desc' },
  });

  let nextNum = 1;
  if (employees.length > 0) {
    const lastId = employees[0].employeeId;
    const lastNum = parseInt(lastId.split('-')[2], 10);
    nextNum = lastNum + 1;
  }

  return `${prefix}${String(nextNum).padStart(3, '0')}`;
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {
      status: { not: 'deleted' },
    };

    if (status && status !== 'all') {
      where.status = status;
    }

    const siteFilter = searchParams.get('site') || '';
    if (siteFilter) {
      where.currentSite = siteFilter;
    }

    if (search) {
      where.OR = [
        { fullName: { contains: search } },
        { employeeId: { contains: search } },
        { nationality: { contains: search } },
        { phone: { contains: search } },
        { position: { contains: search } },
        { companyName: { contains: search } },
      ];
    }

    const [employees, total] = await Promise.all([
      db.employee.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      db.employee.count({ where }),
    ]);

    const decryptedEmployees = employees.map((emp) =>
      decryptEmployee({ ...emp, dateOfBirth: emp.dateOfBirth?.toISOString() || null, joinDate: emp.joinDate?.toISOString() || null, createdAt: emp.createdAt.toISOString(), updatedAt: emp.updatedAt.toISOString() })
    );

    return NextResponse.json({
      success: true,
      data: {
        employees: decryptedEmployees,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.fullName) {
      return NextResponse.json(
        { success: false, error: 'Full name is required' },
        { status: 400 }
      );
    }

    // Generate employee ID if not provided
    const employeeId = (body.employeeId && body.employeeId.trim()) || (await generateEmployeeId());

    // Check uniqueness
    const existing = await db.employee.findUnique({
      where: { employeeId },
    });

    if (existing) {
      return NextResponse.json(
        { success: false, error: 'Employee ID already exists' },
        { status: 409 }
      );
    }

    // Validate team leader assignment
    const isTeamLeader = body.isTeamLeader === true;
    const teamLeaderSiteId = body.teamLeaderSiteId || null;

    if (isTeamLeader && teamLeaderSiteId) {
      const existingLeader = await db.employee.findFirst({
        where: {
          isTeamLeader: true,
          teamLeaderSiteId,
          status: { not: 'deleted' },
        },
      });
      if (existingLeader) {
        return NextResponse.json(
          { success: false, error: `Another employee (${existingLeader.fullName}) is already team leader of this site. Remove them first.` },
          { status: 409 }
        );
      }
    }

    // Encrypt sensitive fields
    const data: Record<string, unknown> = {
      fullName: body.fullName,
      employeeId,
      nationality: body.nationality || null,
      dateOfBirth: body.dateOfBirth ? new Date(body.dateOfBirth) : null,
      phone: body.phone || null,
      email: body.email || null,
      address: body.address || null,
      emergencyContact: body.emergencyContact || null,
      position: body.position || null,
      joinDate: body.joinDate ? new Date(body.joinDate) : null,
      companyName: body.companyName || null,
      passportStatus: body.passportStatus || null,
      idStatus: body.idStatus || null,
      currentSite: body.currentSite || null,
      rating: 5,
      status: 'active',
      photo: body.photo || null,
      isTeamLeader,
      teamLeaderSiteId: isTeamLeader ? teamLeaderSiteId : null,
    };

    if (body.passportNumber) {
      data.passportNumber = encrypt(body.passportNumber);
    }

    if (body.idNumber) {
      data.idNumber = encrypt(body.idNumber);
    }

    const employee = await db.employee.create({
      data: data as Parameters<typeof db.employee.create>[0]['data'],
    });

    const decrypted = decryptEmployee({
      ...employee,
      dateOfBirth: employee.dateOfBirth?.toISOString() || null,
      joinDate: employee.joinDate?.toISOString() || null,
      createdAt: employee.createdAt.toISOString(),
      updatedAt: employee.updatedAt.toISOString(),
    });

    return NextResponse.json(
      { success: true, data: { employee: decrypted } },
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
