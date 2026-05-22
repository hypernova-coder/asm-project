import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { encrypt, decrypt } from '@/lib/crypto';

function decryptEmployee(employee: Record<string, unknown>) {
  if (employee.passportNumber) {
    employee.passportNumber = decrypt(employee.passportNumber as string);
  }
  if (employee.idNumber) {
    employee.idNumber = decrypt(employee.idNumber as string);
  }
  return employee;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const employee = await db.employee.findUnique({
      where: { id },
      include: {
        attendance: {
          orderBy: { date: 'desc' },
        },
        warnings: {
          orderBy: { createdAt: 'desc' },
        },
        fines: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!employee) {
      return NextResponse.json(
        { success: false, error: 'Employee not found' },
        { status: 404 }
      );
    }

    const decrypted = decryptEmployee({
      ...employee,
      dateOfBirth: employee.dateOfBirth?.toISOString() || null,
      joinDate: employee.joinDate?.toISOString() || null,
      createdAt: employee.createdAt.toISOString(),
      updatedAt: employee.updatedAt.toISOString(),
      attendance: employee.attendance.map((a: { createdAt: Date; updatedAt: Date }) => ({
        ...a,
        createdAt: a.createdAt.toISOString(),
        updatedAt: a.updatedAt.toISOString(),
      })),
      warnings: employee.warnings.map((w: { createdAt: Date; updatedAt: Date }) => ({
        ...w,
        createdAt: w.createdAt.toISOString(),
        updatedAt: w.updatedAt.toISOString(),
      })),
      fines: employee.fines.map((f: { createdAt: Date; updatedAt: Date }) => ({
        ...f,
        createdAt: f.createdAt.toISOString(),
        updatedAt: f.updatedAt.toISOString(),
      })),
    });

    return NextResponse.json({
      success: true,
      data: { employee: decrypted },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const existing = await db.employee.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Employee not found' },
        { status: 404 }
      );
    }

    const data: Record<string, unknown> = {};

    const updatableFields = [
      'fullName', 'nationality', 'phone', 'email', 'address',
      'emergencyContact', 'position', 'trade', 'companyName', 'passportStatus',
      'idStatus', 'currentSite', 'photo', 'status', 'employeeId', 'hoursThreshold',
    ];

    for (const field of updatableFields) {
      if (body[field] !== undefined) {
        data[field] = body[field];
      }
    }

    // Check employeeId uniqueness if it's being changed
    if (body.employeeId !== undefined && body.employeeId !== existing.employeeId) {
      const duplicate = await db.employee.findUnique({
        where: { employeeId: body.employeeId },
      });
      if (duplicate) {
        return NextResponse.json(
          { success: false, error: 'Employee ID already exists' },
          { status: 409 }
        );
      }
    }

    // Sync trade to position for backward compat
    if (body.trade !== undefined) {
      data.trade = body.trade;
      data.position = body.trade; // Keep position in sync
    }

    if (body.dateOfBirth) {
      data.dateOfBirth = new Date(body.dateOfBirth);
    }
    if (body.joinDate) {
      data.joinDate = new Date(body.joinDate);
    }
    if (body.rating !== undefined) {
      data.rating = body.rating;
    }

    // Handle team leader fields
    if (body.isTeamLeader !== undefined) {
      if (body.isTeamLeader === true) {
        const teamLeaderSiteId = body.teamLeaderSiteId || null;
        if (teamLeaderSiteId) {
          // Check if another employee is already team leader of this site
          const existingLeader = await db.employee.findFirst({
            where: {
              isTeamLeader: true,
              teamLeaderSiteId,
              id: { not: id },
              status: { not: 'deleted' },
            },
          });
          if (existingLeader) {
            return NextResponse.json(
              { success: false, error: `Another employee (${existingLeader.fullName}) is already team leader of this site.`, existingLeader: { id: existingLeader.id, fullName: existingLeader.fullName } },
              { status: 409 }
            );
          }
        }
        data.isTeamLeader = true;
        data.teamLeaderSiteId = teamLeaderSiteId;
      } else {
        data.isTeamLeader = false;
        data.teamLeaderSiteId = null;
      }
    } else if (body.teamLeaderSiteId !== undefined) {
      data.teamLeaderSiteId = body.teamLeaderSiteId || null;
    }

    // Handle supervisor fields
    if (body.isSupervisor !== undefined) {
      if (body.isSupervisor === true) {
        const supervisorSiteId = body.supervisorSiteId || null;
        if (supervisorSiteId) {
          // Check if another employee is already supervisor of this site
          const existingSupervisor = await db.employee.findFirst({
            where: {
              isSupervisor: true,
              supervisorSiteId,
              id: { not: id },
              status: { not: 'deleted' },
            },
          });
          if (existingSupervisor) {
            return NextResponse.json(
              { success: false, error: `Another employee (${existingSupervisor.fullName}) is already supervisor of this site.`, existingSupervisor: { id: existingSupervisor.id, fullName: existingSupervisor.fullName } },
              { status: 409 }
            );
          }
        }
        data.isSupervisor = true;
        data.supervisorSiteId = supervisorSiteId;
      } else {
        data.isSupervisor = false;
        data.supervisorSiteId = null;
      }
    } else if (body.supervisorSiteId !== undefined) {
      data.supervisorSiteId = body.supervisorSiteId || null;
    }

    // Handle force replace for team leader
    if (body.forceReplaceTeamLeader && body.teamLeaderSiteId) {
      // Remove existing team leader of this site
      await db.employee.updateMany({
        where: {
          isTeamLeader: true,
          teamLeaderSiteId: body.teamLeaderSiteId,
          id: { not: id },
        },
        data: {
          isTeamLeader: false,
          teamLeaderSiteId: null,
        },
      });
      data.isTeamLeader = true;
      data.teamLeaderSiteId = body.teamLeaderSiteId;
    }

    // Handle force replace for supervisor
    if (body.forceReplaceSupervisor && body.supervisorSiteId) {
      // Remove existing supervisor of this site
      await db.employee.updateMany({
        where: {
          isSupervisor: true,
          supervisorSiteId: body.supervisorSiteId,
          id: { not: id },
        },
        data: {
          isSupervisor: false,
          supervisorSiteId: null,
        },
      });
      data.isSupervisor = true;
      data.supervisorSiteId = body.supervisorSiteId;
    }

    // Encrypt sensitive fields
    if (body.passportNumber !== undefined) {
      data.passportNumber = body.passportNumber ? encrypt(body.passportNumber) : null;
    }
    if (body.idNumber !== undefined) {
      data.idNumber = body.idNumber ? encrypt(body.idNumber) : null;
    }

    const employee = await db.employee.update({
      where: { id },
      data: data as Parameters<typeof db.employee.update>[0]['data'],
    });

    // Cascade update employeeId (business ID) across all referencing tables
    if (body.employeeId !== undefined && body.employeeId !== existing.employeeId) {
      const newEmployeeId = body.employeeId as string;

      // 1. Update SalaryRecord.employeeCode for all records of this employee
      await db.salaryRecord.updateMany({
        where: { empId: id, employeeCode: existing.employeeId },
        data: { employeeCode: newEmployeeId },
      });

      // 2. Update TotalEmployeeWorkingHours.empName if fullName also changed
      // (employeeCode is not stored here, but empName might need syncing)
    }

    // Cascade update fullName across all referencing tables
    if (body.fullName !== undefined && body.fullName !== existing.fullName) {
      const newFullName = body.fullName as string;

      // Update empName in TotalEmployeeWorkingHours
      await db.totalEmployeeWorkingHours.updateMany({
        where: { empId: id },
        data: { empName: newFullName },
      });

      // Update empName in SalaryRecord
      await db.salaryRecord.updateMany({
        where: { empId: id },
        data: { empName: newFullName },
      });

      // Update empName in EmpCountSitePerMonth
      await db.empCountSitePerMonth.updateMany({
        where: { empId: id },
        data: { empName: newFullName },
      });

      // Update employeeName in UniformRegistry
      await db.uniformRegistry.updateMany({
        where: { employeeId: id },
        data: { employeeName: newFullName },
      });
    }

    // Cascade update trade and nationality across referencing tables
    if (body.trade !== undefined && body.trade !== existing.trade) {
      const newTrade = body.trade as string;
      await db.salaryRecord.updateMany({
        where: { empId: id },
        data: { trade: newTrade },
      });
    }

    if (body.nationality !== undefined && body.nationality !== existing.nationality) {
      const newNationality = body.nationality as string;
      await db.salaryRecord.updateMany({
        where: { empId: id },
        data: { nationality: newNationality || '' },
      });
    }

    // Cascade update TL/Supervisor status changes to related tables
    const tlChanged = body.isTeamLeader !== undefined && body.isTeamLeader !== existing.isTeamLeader;
    const supChanged = body.isSupervisor !== undefined && body.isSupervisor !== existing.isSupervisor;
    if (tlChanged || supChanged) {
      const newIsTeamLeader = body.isTeamLeader ?? existing.isTeamLeader;
      const newIsSupervisor = body.isSupervisor ?? existing.isSupervisor;
      const hasBonus = newIsTeamLeader || newIsSupervisor;

      // Recalculate and update rates in SalaryRecord for this employee
      const salaryRecords = await db.salaryRecord.findMany({
        where: { empId: id, isDeleted: false },
      });

      for (const sr of salaryRecords) {
        const newRate = sr.rateTier === 'premium'
          ? (hasBonus ? 5.5 : 5.0)
          : (hasBonus ? 3.0 : 2.5);
        const newTotalSalary = sr.totalHours * newRate;

        await db.salaryRecord.update({
          where: { id: sr.id },
          data: {
            rtPerHour: newRate,
            totalSalary: newTotalSalary,
            balanceSalary: newTotalSalary - sr.deduction - sr.advance,
          },
        });
      }

      // Recalculate and update rates in TotalEmployeeWorkingHours
      const whRecords = await db.totalEmployeeWorkingHours.findMany({
        where: { empId: id, isDeleted: false },
      });

      for (const wh of whRecords) {
        if (!wh.isCustom) {
          // Get aggregate total for this employee
          const aggregateTotal = whRecords.reduce((s, r) => s + r.totalWorkingHours, 0);
          const autoRate = aggregateTotal >= 1000
            ? (hasBonus ? 5.5 : 5.0)
            : (hasBonus ? 3.0 : 2.5);

          await db.totalEmployeeWorkingHours.update({
            where: { id: wh.id },
            data: { rtPerHour: autoRate },
          });
        }
      }
    }

    // Track EmpCountSitePerMonth when currentSite changes
    if (body.currentSite !== undefined && body.currentSite !== existing.currentSite) {
      const now = new Date();
      const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      const newSite = body.currentSite; // null means removed from site

      if (newSite) {
        // Case A: Adding employee to a site (or moving to a different site)
        const site = await db.site.findFirst({ where: { name: newSite } });

        if (site) {
          // If employee was previously at a DIFFERENT site, close old open records
          if (existing.currentSite && existing.currentSite !== newSite) {
            const oldSite = await db.site.findFirst({ where: { name: existing.currentSite } });
            if (oldSite) {
              await db.empCountSitePerMonth.updateMany({
                where: {
                  empId: id,
                  siteId: oldSite.id,
                  removedDate: null,
                },
                data: {
                  removedDate: now,
                },
              });
            }
          }

          // Create new EmpCountSitePerMonth record
          await db.empCountSitePerMonth.create({
            data: {
              empId: employee.id,
              empName: employee.fullName,
              siteId: site.id,
              siteName: site.name,
              month,
              createdDate: now,
              removedDate: null,
            },
          });
        }
      } else {
        // Case B: Removing employee from a site (currentSite set to null)
        await db.empCountSitePerMonth.updateMany({
          where: {
            empId: id,
            removedDate: null,
          },
          data: {
            removedDate: now,
          },
        });
      }
    }

    const decrypted = decryptEmployee({
      ...employee,
      dateOfBirth: employee.dateOfBirth?.toISOString() || null,
      joinDate: employee.joinDate?.toISOString() || null,
      createdAt: employee.createdAt.toISOString(),
      updatedAt: employee.updatedAt.toISOString(),
    });

    return NextResponse.json({
      success: true,
      data: { employee: decrypted },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const existing = await db.employee.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Employee not found' },
        { status: 404 }
      );
    }

    if (existing.status === 'pending_deletion') {
      return NextResponse.json(
        { success: false, error: 'Employee is pending deletion. Please use the delete request approval workflow.' },
        { status: 400 }
      );
    }

    const employee = await db.employee.update({
      where: { id },
      data: { status: 'deleted' },
    });

    // Cascade soft-deletion to all related records

    // 1. Mark all uniform registry records for this employee as deleted
    await db.uniformRegistry.updateMany({
      where: { employeeId: id, isDeleted: false },
      data: { isDeleted: true },
    });

    // 2. Hide all attendance records
    await db.attendance.updateMany({
      where: { employeeId: id, isHidden: false },
      data: { isHidden: true },
    });

    // 3. Hide all warnings
    await db.warning.updateMany({
      where: { employeeId: id, isHidden: false },
      data: { isHidden: true },
    });

    // 4. Hide all fines
    await db.fine.updateMany({
      where: { employeeId: id, isHidden: false },
      data: { isHidden: true },
    });

    // 5. Hide all leave requests
    await db.leaveRequest.updateMany({
      where: { employeeId: id, isHidden: false },
      data: { isHidden: true },
    });

    // 6. Hide all cancellation requests
    await db.cancellationRequest.updateMany({
      where: { employeeId: id, isHidden: false },
      data: { isHidden: true },
    });

    // 7. Soft-delete all TotalEmployeeWorkingHours records
    await db.totalEmployeeWorkingHours.updateMany({
      where: { empId: id, isDeleted: false },
      data: { isDeleted: true },
    });

    // 8. Soft-delete all SalaryRecord entries
    await db.salaryRecord.updateMany({
      where: { empId: id, isDeleted: false },
      data: { isDeleted: true },
    });

    // 9. Soft-delete all EmpCountSitePerMonth records
    await db.empCountSitePerMonth.updateMany({
      where: { empId: id, deletedDate: null },
      data: { deletedDate: new Date() },
    });

    return NextResponse.json({
      success: true,
      data: { employee: { id: employee.id, status: employee.status } },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
