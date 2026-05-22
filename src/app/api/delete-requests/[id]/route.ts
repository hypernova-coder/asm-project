import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status, reviewedBy } = body;

    if (!status || !reviewedBy) {
      return NextResponse.json(
        { success: false, error: 'status and reviewedBy are required' },
        { status: 400 }
      );
    }

    const validStatuses = ['approved', 'rejected'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { success: false, error: 'Status must be "approved" or "rejected"' },
        { status: 400 }
      );
    }

    const existing = await db.cancellationRequest.findUnique({
      where: { id },
      include: {
        employee: {
          select: { id: true, fullName: true, employeeId: true },
        },
      },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Delete request not found' },
        { status: 404 }
      );
    }

    if (existing.status !== 'pending') {
      return NextResponse.json(
        { success: false, error: `Delete request is already ${existing.status}` },
        { status: 400 }
      );
    }

    const result = await db.$transaction(async (tx) => {
      // Update the cancellation request
      const updatedRequest = await tx.cancellationRequest.update({
        where: { id },
        data: {
          status,
          reviewedById: reviewedBy,
          reviewedAt: new Date(),
        },
        include: {
          employee: {
            select: { id: true, fullName: true, employeeId: true },
          },
        },
      });

      if (status === 'approved') {
        // Set employee status to deleted
        await tx.employee.update({
          where: { id: existing.employeeId },
          data: { status: 'deleted' },
        });

        // Cascade soft-deletion to all related records

        // 1. Mark all uniform registry records for this employee as deleted
        await tx.uniformRegistry.updateMany({
          where: { employeeId: existing.employeeId, isDeleted: false },
          data: { isDeleted: true },
        });

        // 2. Hide all attendance records
        await tx.attendance.updateMany({
          where: { employeeId: existing.employeeId, isHidden: false },
          data: { isHidden: true },
        });

        // 3. Hide all warnings
        await tx.warning.updateMany({
          where: { employeeId: existing.employeeId, isHidden: false },
          data: { isHidden: true },
        });

        // 4. Hide all fines
        await tx.fine.updateMany({
          where: { employeeId: existing.employeeId, isHidden: false },
          data: { isHidden: true },
        });

        // 5. Hide all leave requests
        await tx.leaveRequest.updateMany({
          where: { employeeId: existing.employeeId, isHidden: false },
          data: { isHidden: true },
        });

        // 6. Hide all cancellation requests
        await tx.cancellationRequest.updateMany({
          where: { employeeId: existing.employeeId, isHidden: false },
          data: { isHidden: true },
        });

        // 7. Soft-delete all TotalEmployeeWorkingHours records
        await tx.totalEmployeeWorkingHours.updateMany({
          where: { empId: existing.employeeId, isDeleted: false },
          data: { isDeleted: true },
        });

        // 8. Soft-delete all SalaryRecord entries
        await tx.salaryRecord.updateMany({
          where: { empId: existing.employeeId, isDeleted: false },
          data: { isDeleted: true },
        });

        // 9. Soft-delete all EmpCountSitePerMonth records
        await tx.empCountSitePerMonth.updateMany({
          where: { empId: existing.employeeId, deletedDate: null },
          data: { deletedDate: new Date() },
        });
      } else {
        // Rejected: restore employee to active
        await tx.employee.update({
          where: { id: existing.employeeId },
          data: { status: 'active' },
        });
      }

      return updatedRequest;
    });

    return NextResponse.json({
      success: true,
      data: {
        deleteRequest: {
          ...result,
          reviewedAt: result.reviewedAt?.toISOString() || null,
          createdAt: result.createdAt.toISOString(),
          updatedAt: result.updatedAt.toISOString(),
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
