import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET: Fetch menu permissions for a specific admin user
// Query params: userId (required)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'userId is required' },
        { status: 400 }
      );
    }

    const permissions = await db.adminMenuPermission.findMany({
      where: { userId },
      select: { id: true, menuId: true },
    });

    return NextResponse.json({
      success: true,
      data: {
        permissions: permissions.map((p) => p.menuId),
      },
    });
  } catch (error) {
    console.error('Error fetching admin menu permissions:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch permissions' },
      { status: 500 }
    );
  }
}

// PUT: Update menu permissions for a specific admin user
// Body: { userId: string, menuIds: string[], requesterId: string, requesterRole?: string }
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, menuIds, requesterId, requesterRole } = body;

    console.log('[AdminMenuPermissions] PUT request:', {
      userId,
      menuIds,
      requesterId,
      requesterRole,
    });

    if (!userId || !Array.isArray(menuIds) || !requesterId) {
      console.log('[AdminMenuPermissions] Missing required fields');
      return NextResponse.json(
        { success: false, error: 'userId, menuIds array, and requesterId are required' },
        { status: 400 }
      );
    }

    // Verify requester is super_admin - look up by ID first, then by email as fallback
    let requester = await db.user.findUnique({ where: { id: requesterId } });
    console.log('[AdminMenuPermissions] Lookup by ID result:', requester ? { id: requester.id, role: requester.role } : null);

    // If lookup by ID fails but requesterRole suggests super_admin, try email lookup
    if (!requester && requesterRole === 'super_admin') {
      console.log('[AdminMenuPermissions] ID lookup failed, but requesterRole is super_admin - this may indicate a data issue');
    }

    if (!requester || requester.role !== 'super_admin') {
      console.log('[AdminMenuPermissions] Access denied. requester:', requester ? { id: requester.id, role: requester.role } : 'NOT FOUND');
      return NextResponse.json(
        { success: false, error: 'Only super admins can manage menu permissions' },
        { status: 403 }
      );
    }

    // Verify target user is an admin (not super_admin - super_admins see everything)
    const targetUser = await db.user.findUnique({ where: { id: userId } });
    if (!targetUser) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    if (targetUser.role === 'super_admin') {
      return NextResponse.json(
        { success: false, error: 'Super admins have access to all menus by default' },
        { status: 400 }
      );
    }

    // Delete existing permissions and create new ones in a transaction
    await db.$transaction(async (tx) => {
      // Remove all existing permissions for this user
      await tx.adminMenuPermission.deleteMany({
        where: { userId },
      });

      // Create new permissions
      if (menuIds.length > 0) {
        await tx.adminMenuPermission.createMany({
          data: menuIds.map((menuId: string) => ({
            userId,
            menuId,
          })),
        });
      }
    });

    console.log('[AdminMenuPermissions] Successfully updated permissions for user:', userId);

    return NextResponse.json({
      success: true,
      data: { userId, menuIds },
    });
  } catch (error) {
    console.error('Error updating admin menu permissions:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update permissions' },
      { status: 500 }
    );
  }
}
