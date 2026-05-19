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

    // Find user by email
    const user = await db.user.findUnique({
      where: { email: email.toLowerCase() },
      include: { menuPermissions: { select: { menuId: true } } },
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

    // For admin users, include their allowed menus
    if (user.role === 'admin') {
      responseUser.allowedMenus = user.menuPermissions.map((p) => p.menuId);
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
