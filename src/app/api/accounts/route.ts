import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// Helper: Calculate RT/HR with team leader and supervisor support
function calcRtPerHour(
  totalWorkingHours: number,
  isTeamLeaderForSite: boolean,
  isSupervisorForSite: boolean,
  isCustom: boolean,
  customRtPerHour: number
): number {
  if (isCustom) return customRtPerHour;
  const hasBonus = isTeamLeaderForSite || isSupervisorForSite;
  if (totalWorkingHours >= 1000) {
    return hasBonus ? 5.5 : 5.0;
  }
  return hasBonus ? 3.0 : 2.5;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month'); // YYYY-MM format
    const yearParam = searchParams.get('year'); // integer

    if (!month) {
      return NextResponse.json(
        { success: false, error: 'month query parameter is required (YYYY-MM format)' },
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

    const year = yearParam ? parseInt(yearParam, 10) : parseInt(month.split('-')[0], 10);
    if (isNaN(year)) {
      return NextResponse.json(
        { success: false, error: 'year must be a valid integer' },
        { status: 400 }
      );
    }

    // 1. Get all active sites
    const activeSites = await db.site.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });

    // 2. For each site, get distinct employees from EmpCountSitePerMonth
    const siteResults = await Promise.all(
      activeSites.map(async (site) => {
        // Get distinct employee records for this site and month where not deleted
        const empRecords = await db.empCountSitePerMonth.findMany({
          where: {
            siteId: site.id,
            month,
            deletedDate: null,
          },
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
                isSupervisor: true,
                supervisorSiteId: true,
                currentSite: true,
              },
            },
          },
          orderBy: { empName: 'asc' },
        });

        // Deduplicate by empId
        const seenEmpIds = new Set<string>();
        const uniqueEmployees: typeof empRecords = [];
        for (const record of empRecords) {
          if (!seenEmpIds.has(record.empId)) {
            seenEmpIds.add(record.empId);
            uniqueEmployees.push(record);
          }
        }

        const employeeCount = uniqueEmployees.length;

        // 3. For each employee, get salary record and working hours
        const employeesWithSalary = await Promise.all(
          uniqueEmployees.map(async (empRecord) => {
            const emp = empRecord.employee;

            // Get salary record for this employee+site+month+year
            const salaryRecord = await db.salaryRecord.findUnique({
              where: {
                empId_siteId_month_year: {
                  empId: empRecord.empId,
                  siteId: site.id,
                  month,
                  year,
                },
              },
            });

            // Get working hours for RT/HR calculation
            const workingHours = await db.totalEmployeeWorkingHours.findUnique({
              where: { empId: empRecord.empId },
            });

            // Calculate RT/HR with supervisor support
            const isTeamLeaderForSite = emp.isTeamLeader && emp.teamLeaderSiteId === site.id;
            const isSupervisorForSite = emp.isSupervisor && emp.supervisorSiteId === site.id;

            let rtPerHour = 2.5;
            if (workingHours) {
              rtPerHour = calcRtPerHour(
                workingHours.totalWorkingHours,
                isTeamLeaderForSite,
                isSupervisorForSite,
                workingHours.isCustom,
                workingHours.rtPerHour
              );
            } else {
              // No working hours record yet, use basic calculation
              const hasBonus = isTeamLeaderForSite || isSupervisorForSite;
              rtPerHour = hasBonus ? 3.0 : 2.5;
            }

            return {
              empId: empRecord.empId,
              empName: empRecord.empName,
              employeeCode: emp.employeeId,
              nationality: emp.nationality || '',
              trade: emp.trade || '',
              isTeamLeader: isTeamLeaderForSite,
              isSupervisor: isSupervisorForSite,
              salaryRecord: salaryRecord
                ? {
                    ...salaryRecord,
                    createdAt: salaryRecord.createdAt.toISOString(),
                    updatedAt: salaryRecord.updatedAt.toISOString(),
                  }
                : null,
              workingHours: workingHours
                ? {
                    id: workingHours.id,
                    empId: workingHours.empId,
                    empName: workingHours.empName,
                    totalWorkingHours: workingHours.totalWorkingHours,
                    rtPerHour: workingHours.rtPerHour,
                    isCustom: workingHours.isCustom,
                    calculatedRtPerHour: rtPerHour,
                  }
                : {
                    empId: empRecord.empId,
                    empName: empRecord.empName,
                    totalWorkingHours: 0,
                    rtPerHour: 2.5,
                    isCustom: false,
                    calculatedRtPerHour: rtPerHour,
                  },
            };
          })
        );

        // 4. Also include any SalaryRecord entries that have siteId matching
        // but might not be in EmpCountSitePerMonth (for manually added entries)
        const manualSalaryRecords = await db.salaryRecord.findMany({
          where: {
            siteId: site.id,
            month,
            year,
            isDeleted: false,
            empId: { notIn: Array.from(seenEmpIds) },
          },
        });

        for (const manualRecord of manualSalaryRecords) {
          // Get working hours for this employee too
          const workingHours = await db.totalEmployeeWorkingHours.findUnique({
            where: { empId: manualRecord.empId },
          });

          // Get employee info
          const empInfo = await db.employee.findUnique({
            where: { id: manualRecord.empId },
            select: {
              employeeId: true,
              nationality: true,
              trade: true,
              isTeamLeader: true,
              teamLeaderSiteId: true,
              isSupervisor: true,
              supervisorSiteId: true,
            },
          });

          const isTeamLeaderForSite = empInfo?.isTeamLeader && empInfo?.teamLeaderSiteId === site.id;
          const isSupervisorForSite = empInfo?.isSupervisor && empInfo?.supervisorSiteId === site.id;

          let rtPerHour = 2.5;
          if (workingHours) {
            rtPerHour = calcRtPerHour(
              workingHours.totalWorkingHours,
              isTeamLeaderForSite,
              isSupervisorForSite,
              workingHours.isCustom,
              workingHours.rtPerHour
            );
          }

          employeesWithSalary.push({
            empId: manualRecord.empId,
            empName: manualRecord.empName,
            employeeCode: manualRecord.employeeCode || empInfo?.employeeId || '',
            nationality: manualRecord.nationality || empInfo?.nationality || '',
            trade: manualRecord.trade || empInfo?.trade || '',
            isTeamLeader: isTeamLeaderForSite,
            isSupervisor: isSupervisorForSite,
            salaryRecord: {
              ...manualRecord,
              createdAt: manualRecord.createdAt.toISOString(),
              updatedAt: manualRecord.updatedAt.toISOString(),
            },
            workingHours: workingHours
              ? {
                  id: workingHours.id,
                  empId: workingHours.empId,
                  empName: workingHours.empName,
                  totalWorkingHours: workingHours.totalWorkingHours,
                  rtPerHour: workingHours.rtPerHour,
                  isCustom: workingHours.isCustom,
                  calculatedRtPerHour: rtPerHour,
                }
              : {
                  empId: manualRecord.empId,
                  empName: manualRecord.empName,
                  totalWorkingHours: 0,
                  rtPerHour: 2.5,
                  isCustom: false,
                  calculatedRtPerHour: rtPerHour,
                },
          });
        }

        // 5. Calculate totals
        const totalHours = employeesWithSalary.reduce(
          (sum, e) => sum + (e.salaryRecord?.totalHours || 0),
          0
        );
        const totalSalary = employeesWithSalary.reduce(
          (sum, e) => sum + (e.salaryRecord?.totalSalary || 0),
          0
        );
        const totalDeductions = employeesWithSalary.reduce(
          (sum, e) => sum + (e.salaryRecord?.deduction || 0),
          0
        );
        const totalAdvances = employeesWithSalary.reduce(
          (sum, e) => sum + (e.salaryRecord?.advance || 0),
          0
        );
        const totalBalanceSalary = employeesWithSalary.reduce(
          (sum, e) => sum + (e.salaryRecord?.balanceSalary || 0),
          0
        );

        return {
          site: {
            id: site.id,
            name: site.name,
            clientName: site.clientName,
            projectName: site.projectName,
          },
          employeeCount: employeeCount + manualSalaryRecords.length,
          totalHours,
          totalSalary,
          totalDeductions,
          totalAdvances,
          totalBalanceSalary,
          employees: employeesWithSalary,
        };
      })
    );

    // Filter out sites with no employees for this month
    const sitesWithEmployees = siteResults.filter((s) => s.employeeCount > 0);

    // Grand totals
    const grandTotals = {
      totalSites: sitesWithEmployees.length,
      totalEmployees: sitesWithEmployees.reduce((sum, s) => sum + s.employeeCount, 0),
      totalHours: sitesWithEmployees.reduce((sum, s) => sum + s.totalHours, 0),
      totalSalary: sitesWithEmployees.reduce((sum, s) => sum + s.totalSalary, 0),
      totalDeductions: sitesWithEmployees.reduce((sum, s) => sum + s.totalDeductions, 0),
      totalAdvances: sitesWithEmployees.reduce((sum, s) => sum + s.totalAdvances, 0),
      totalBalanceSalary: sitesWithEmployees.reduce((sum, s) => sum + s.totalBalanceSalary, 0),
    };

    return NextResponse.json({
      success: true,
      data: {
        month,
        year,
        sites: sitesWithEmployees,
        grandTotals,
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
