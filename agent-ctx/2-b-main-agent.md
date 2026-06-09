# Task 2-b: Theme System & Sidebar Update

## Agent
Main Agent

## Task
Update the theme system and sidebar to support black theme, DB-stored theme preference, and AdminMenuPermission integration.

## Work Completed

### Files Modified
1. **`/home/z/my-project/src/app/globals.css`** - Complete theme overhaul
   - Dark theme: pure black background (#000000), white primary (#ffffff), card (#111111), borders (#222222)
   - Light theme: white background (#ffffff), black primary (#000000), card (#f5f5f5), borders (#e5e5e5)
   - Chart colors preserved (blue, green, amber, cyan, red)
   - Scrollbar styles for both dark and light modes

2. **`/home/z/my-project/src/store/auth-store.ts`** - Added `theme: string` to UserSession interface

3. **`/home/z/my-project/src/app/api/menu-permissions/route.ts`** - New API route
   - GET: Fetches allowed menu keys for a userId from AdminMenuPermission table

4. **`/home/z/my-project/src/app/api/user/theme/route.ts`** - New API route
   - PUT: Updates user theme preference in database (dark/light), returns updated user

5. **`/home/z/my-project/src/components/layout/app-sidebar.tsx`** - Major update
   - All blue-500 references → white/black theme
   - AdminMenuPermission: admin users only see menus with explicit permission (except dashboard + uniform_registry)
   - Theme toggle button (Sun/Moon) in user info section
   - Admin avatar: bg-white/10 instead of bg-blue-500/20
   - Notification badge: white bg with black text

6. **`/home/z/my-project/src/app/page.tsx`** - Updated
   - Loading screen: black bg with white logo
   - AdminMenuPermission-based view access checking
   - Theme class application from user preference
   - Dynamic permission-based navigation instead of hardcoded arrays

7. **`/home/z/my-project/src/app/layout.tsx`** - Added data-theme attribute, defaults to dark

8. **`/home/z/my-project/src/components/attendance/attendance-page.tsx`** - Fixed pre-existing syntax error

## Lint Status
✅ All lint checks pass with zero errors
