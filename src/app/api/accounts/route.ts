import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/accounts?siteId=...&month=YYYY-MM&year=...
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const siteId = searchParams.get('siteId');
    const month = searchParams.get('month'); // YYYY-MM
    const year = searchParams.get('year');

    if (!siteId || !month) {
      return NextResponse.json(
        { success: false, error: 'siteId and month (YYYY-MM) query parameters are required' },
        { status: 400 }
      );
    }

    const yearNum = year ? parseInt(year, 10) : parseInt(month.split('-')[0], 10);

    // Fetch site info
    const site = await db.site.findUnique({
      where: { id: siteId },
      select: {
        id: true,
        name: true,
        clientName: true,
      },
    });

    if (!site) {
      return NextResponse.json(
        { success: false, error: 'Site not found' },
        { status: 404 }
      );
    }

    // Fetch all non-deleted salary records for the site+month
    const salaryRecords = await db.salaryRecord.findMany({
      where: {
        siteId,
        month,
        year: yearNum,
        isDeleted: false,
      },
      orderBy: [{ slNo: 'asc' }, { empName: 'asc' }],
    });

    // Count employees at this site (currentSite stores the site name, not ID)
    const totalEmployees = await db.employee.count({
      where: {
        currentSite: site.name,
        status: { not: 'deleted' },
      },
    });

    // Calculate aggregated totals
    const totalHours = salaryRecords.reduce((sum, r) => sum + r.totalHours, 0);
    const totalSalary = salaryRecords.reduce((sum, r) => sum + r.totalSalary, 0);
    const totalDeductions = salaryRecords.reduce((sum, r) => sum + r.deduction, 0);
    const totalAdvances = salaryRecords.reduce((sum, r) => sum + r.advance, 0);
    const totalBalance = salaryRecords.reduce((sum, r) => sum + r.balanceSalary, 0);
    const totalPaid = salaryRecords.filter((r) => r.isPaid).length;
    const totalUnpaid = salaryRecords.filter((r) => !r.isPaid).length;

    return NextResponse.json({
      success: true,
      data: {
        site: {
          id: site.id,
          name: site.name,
          clientName: site.clientName,
        },
        totals: {
          totalEmployees,
          totalSalaryRecords: salaryRecords.length,
          totalHours,
          totalSalary,
          totalDeductions,
          totalAdvances,
          totalBalance,
          totalPaid,
          totalUnpaid,
        },
        salaryRecords: salaryRecords.map((r) => ({
          ...r,
          createdAt: r.createdAt.toISOString(),
          updatedAt: r.updatedAt.toISOString(),
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
