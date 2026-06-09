import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const sites = await db.site.findMany({
      select: { id: true, name: true, clientName: true, projectName: true, isActive: true, createdAt: true },
      orderBy: { name: 'asc' },
    });

    // Get employee counts per site
    const employeesBySite = await db.employee.groupBy({
      by: ['currentSite'],
      where: {
        currentSite: { not: null },
        status: { not: 'deleted' },
      },
      _count: {
        currentSite: true,
      },
    });

    const countMap = new Map<string, number>();
    for (const row of employeesBySite) {
      if (row.currentSite) {
        countMap.set(row.currentSite, row._count.currentSite);
      }
    }

    const sitesWithCounts = sites.map((site) => ({
      ...site,
      createdAt: site.createdAt.toISOString(),
      employeeCount: countMap.get(site.name) || 0,
    }));

    return NextResponse.json({
      success: true,
      data: { sites: sitesWithCounts },
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
    const { name, clientName, projectName, isActive } = body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Site name is required' },
        { status: 400 }
      );
    }

    const trimmedName = name.trim();

    // Check uniqueness
    const existing = await db.site.findUnique({
      where: { name: trimmedName },
    });

    if (existing) {
      return NextResponse.json(
        { success: false, error: 'Site with this name already exists' },
        { status: 409 }
      );
    }

    const site = await db.site.create({
      data: {
        name: trimmedName,
        clientName: typeof clientName === 'string' ? clientName.trim() : undefined,
        projectName: typeof projectName === 'string' ? projectName.trim() : undefined,
        isActive: typeof isActive === 'boolean' ? isActive : true,
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          site: {
            ...site,
            createdAt: site.createdAt.toISOString(),
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

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, name, clientName, projectName, isActive } = body;

    if (!id || !name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Site id and new name are required' },
        { status: 400 }
      );
    }

    const trimmedName = name.trim();

    // Check site exists
    const existing = await db.site.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Site not found' },
        { status: 404 }
      );
    }

    // Check uniqueness (excluding current site)
    const duplicate = await db.site.findFirst({
      where: {
        name: trimmedName,
        id: { not: id },
      },
    });

    if (duplicate) {
      return NextResponse.json(
        { success: false, error: 'A site with this name already exists' },
        { status: 409 }
      );
    }

    const oldName = existing.name;

    // Build update data
    const updateData: Record<string, unknown> = { name: trimmedName };

    if (clientName !== undefined) {
      updateData.clientName = typeof clientName === 'string' ? clientName.trim() : null;
    }
    if (projectName !== undefined) {
      updateData.projectName = typeof projectName === 'string' ? projectName.trim() : null;
    }
    if (isActive !== undefined) {
      updateData.isActive = typeof isActive === 'boolean' ? isActive : true;
    }

    // Update site
    const site = await db.site.update({
      where: { id },
      data: updateData,
    });

    // Update all employees who were assigned to the old site name
    if (oldName !== trimmedName) {
      await db.employee.updateMany({
        where: { currentSite: oldName },
        data: { currentSite: trimmedName },
      });
    }

    // When site is being deactivated, unassign all employees and clean up roles/history
    if (isActive === false && existing.isActive === true) {
      const siteNameForCleanup = trimmedName;

      await db.$transaction(async (tx) => {
        // Find all employees currently assigned to this site
        const assignedEmployees = await tx.employee.findMany({
          where: {
            currentSite: siteNameForCleanup,
            status: { not: 'deleted' },
          },
        });

        for (const emp of assignedEmployees) {
          const empUpdateData: Record<string, unknown> = { currentSite: null };

          // If they were team leader of this site, clear team leader role
          if (emp.isTeamLeader && emp.teamLeaderSiteId === id) {
            empUpdateData.isTeamLeader = false;
            empUpdateData.teamLeaderSiteId = null;
          }

          // If they were supervisor of this site, clear supervisor role
          if (emp.isSupervisor && emp.supervisorSiteId === id) {
            empUpdateData.isSupervisor = false;
            empUpdateData.supervisorSiteId = null;
          }

          await tx.employee.update({
            where: { id: emp.id },
            data: empUpdateData,
          });

          // Close any open EmpCountSitePerMonth records for this employee+site
          await tx.empCountSitePerMonth.updateMany({
            where: {
              empId: emp.id,
              siteId: id,
              removedDate: null,
            },
            data: {
              removedDate: new Date(),
            },
          });
        }
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        site: {
          ...site,
          createdAt: site.createdAt.toISOString(),
        },
        oldName,
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

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, name } = body;

    if (!id && !name) {
      return NextResponse.json(
        { success: false, error: 'Site id or name is required' },
        { status: 400 }
      );
    }

    // Find the site
    const site = id
      ? await db.site.findUnique({ where: { id } })
      : await db.site.findUnique({ where: { name } });

    if (!site) {
      return NextResponse.json(
        { success: false, error: 'Site not found' },
        { status: 404 }
      );
    }

    // Unassign all employees from this site (set currentSite to null)
    await db.employee.updateMany({
      where: { currentSite: site.name },
      data: { currentSite: null },
    });

    // Delete the site
    await db.site.delete({ where: { id: site.id } });

    return NextResponse.json({
      success: true,
      data: { message: `Site "${site.name}" deleted successfully. Employees have been unassigned.` },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
