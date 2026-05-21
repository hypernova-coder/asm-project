import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET: Fetch menu permissions for a user
export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get('userId');
    if (!userId) {
      return NextResponse.json({ success: false, error: 'userId is required' }, { status: 400 });
    }
    const permissions = await db.adminMenuPermission.findMany({
      where: { userId },
      select: { menuKey: true, allowed: true },
    });
    const allowedMenus = permissions.filter(p => p.allowed).map(p => p.menuKey);
    return NextResponse.json({ success: true, data: { allowedMenus, permissions } });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// POST: Set menu permission for a user
export async function POST(request: NextRequest) {
  try {
    const { userId, menuKey, allowed } = await request.json();
    if (!userId || !menuKey || typeof allowed !== 'boolean') {
      return NextResponse.json({ success: false, error: 'userId, menuKey, and allowed are required' }, { status: 400 });
    }
    // Verify the user is an admin (not super_admin)
    const user = await db.user.findUnique({ where: { id: userId }, select: { role: true } });
    if (!user || user.role === 'super_admin') {
      return NextResponse.json({ success: false, error: 'Cannot set permissions for super admin' }, { status: 400 });
    }
    const permission = await db.adminMenuPermission.upsert({
      where: { userId_menuKey: { userId, menuKey } },
      update: { allowed },
      create: { userId, menuKey, allowed },
    });
    return NextResponse.json({ success: true, data: { permission } });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// DELETE: Remove all permissions for a user
export async function DELETE(request: NextRequest) {
  try {
    const { userId } = await request.json();
    if (!userId) {
      return NextResponse.json({ success: false, error: 'userId is required' }, { status: 400 });
    }
    await db.adminMenuPermission.deleteMany({ where: { userId } });
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
