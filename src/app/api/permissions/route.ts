import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET: List all permissions, optionally filtered by group
export async function GET(request: NextRequest) {
  try {
    const group = request.nextUrl.searchParams.get('group') || '';
    const adminId = request.nextUrl.searchParams.get('adminId') || '';

    const where: Record<string, unknown> = {};
    if (group) where.group = group;

    const permissions = await db.permission.findMany({
      where,
      orderBy: [{ group: 'asc' }, { name: 'asc' }],
      include: {
        adminPermissions: adminId ? {
          where: { adminId },
          select: { id: true },
        } : false,
      },
    });

    // If adminId is provided, also get the AdminMenuPermission data for backward compat
    let legacyPermissions: string[] = [];
    if (adminId) {
      const menuPerms = await db.adminMenuPermission.findMany({
        where: { userId: adminId, allowed: true },
        select: { menuKey: true },
      });
      legacyPermissions = menuPerms.map(p => p.menuKey);
    }

    return NextResponse.json({
      success: true,
      data: {
        permissions: permissions.map(p => ({
          id: p.id,
          name: p.name,
          slug: p.slug,
          group: p.group,
          granted: adminId ? p.adminPermissions.length > 0 : undefined,
          createdAt: p.createdAt.toISOString(),
          updatedAt: p.updatedAt.toISOString(),
        })),
        legacyAllowedMenus: legacyPermissions,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// POST: Grant or revoke a permission for an admin
export async function POST(request: NextRequest) {
  try {
    const { adminId, permissionSlug, granted } = await request.json();
    if (!adminId || !permissionSlug || typeof granted !== 'boolean') {
      return NextResponse.json({ success: false, error: 'adminId, permissionSlug, and granted are required' }, { status: 400 });
    }

    // Verify the user is an admin (not super_admin)
    const user = await db.user.findUnique({ where: { id: adminId }, select: { role: true } });
    if (!user || user.role === 'super_admin') {
      return NextResponse.json({ success: false, error: 'Cannot set permissions for super admin' }, { status: 400 });
    }

    // Find the permission by slug
    const permission = await db.permission.findUnique({ where: { slug: permissionSlug } });
    if (!permission) {
      return NextResponse.json({ success: false, error: 'Permission not found' }, { status: 404 });
    }

    if (granted) {
      // Grant permission
      await db.adminPermission.upsert({
        where: { adminId_permissionId: { adminId, permissionId: permission.id } },
        update: {},
        create: { adminId, permissionId: permission.id },
      });
    } else {
      // Revoke permission
      await db.adminPermission.deleteMany({
        where: { adminId, permissionId: permission.id },
      });
    }

    // Also update the legacy AdminMenuPermission for backward compat with sidebar
    await db.adminMenuPermission.upsert({
      where: { userId_menuKey: { userId: adminId, menuKey: permissionSlug } },
      update: { allowed: granted },
      create: { userId: adminId, menuKey: permissionSlug, allowed: granted },
    });

    return NextResponse.json({ success: true, data: { granted } });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// PUT: Bulk update permissions for an admin
export async function PUT(request: NextRequest) {
  try {
    const { adminId, permissionSlugs } = await request.json();
    if (!adminId || !Array.isArray(permissionSlugs)) {
      return NextResponse.json({ success: false, error: 'adminId and permissionSlugs array are required' }, { status: 400 });
    }

    // Verify the user is an admin (not super_admin)
    const user = await db.user.findUnique({ where: { id: adminId }, select: { role: true } });
    if (!user || user.role === 'super_admin') {
      return NextResponse.json({ success: false, error: 'Cannot set permissions for super admin' }, { status: 400 });
    }

    // Delete all existing permissions for this admin
    await db.adminPermission.deleteMany({ where: { adminId } });

    // Grant new permissions
    if (permissionSlugs.length > 0) {
      const permissions = await db.permission.findMany({
        where: { slug: { in: permissionSlugs } },
      });
      await db.adminPermission.createMany({
        data: permissions.map(p => ({ adminId, permissionId: p.id })),
      });
    }

    // Sync legacy AdminMenuPermission
    // First, set all to false
    const allPermissions = await db.permission.findMany({ select: { slug: true } });
    for (const perm of allPermissions) {
      await db.adminMenuPermission.upsert({
        where: { userId_menuKey: { userId: adminId, menuKey: perm.slug } },
        update: { allowed: permissionSlugs.includes(perm.slug) },
        create: { userId: adminId, menuKey: perm.slug, allowed: permissionSlugs.includes(perm.slug) },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
