import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { comparePassword } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Find user by email (without include to avoid stale Prisma cache issues)
    const user = await db.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Compare password
    const isValid = await comparePassword(password, user.password);

    if (!isValid) {
      return NextResponse.json(
        { success: false, error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Build response - include allowedMenus for admin users
    const responseUser: Record<string, unknown> = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    };

    // For admin users, fetch their allowed menus separately
    if (user.role === 'admin') {
      try {
        const permissions = await db.adminMenuPermission.findMany({
          where: { userId: user.id },
          select: { menuId: true },
        });
        responseUser.allowedMenus = permissions.map((p) => p.menuId);
      } catch {
        // If menuPermissions table doesn't exist yet, just continue without menus
        responseUser.allowedMenus = [];
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        user: responseUser,
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
