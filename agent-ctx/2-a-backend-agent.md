# Task 2-a: Backend API Updates for New Prisma Schema

## Agent: Backend Agent

## Summary
Updated all backend API routes to support the new Prisma schema changes including isHidden fields, AdminMenuPermission model, theme field on User, and attendance default status changes.

## Files Modified
1. `/src/app/api/auth/session/route.ts` - Added userId query param, returns theme + menu permissions
2. `/src/app/api/auth/login/route.ts` - Added theme to login response
3. `/src/app/api/auth/signup/route.ts` - Added theme to signup response
4. `/src/app/api/employees/[id]/route.ts` - DELETE: soft-hide instead of hard-delete; GET: isHidden filters on relations
5. `/src/app/api/attendance/route.ts` - isHidden filter + no future month auto-create
6. `/src/app/api/warnings/route.ts` - isHidden filter
7. `/src/app/api/fines/route.ts` - isHidden filter
8. `/src/app/api/notifications/route.ts` - isHidden filter (GET, unread count, markAll)
9. `/src/app/api/leave-requests/route.ts` - isHidden filter
10. `/src/app/api/cancellation-requests/route.ts` - isHidden filter
11. `/src/app/api/uniform-registry/route.ts` - isHidden filter alongside isDeleted
12. `/src/app/api/sites/route.ts` - employeeCount query param, active site filtering

## Files Created
1. `/src/app/api/menu-permissions/route.ts` - GET/POST/DELETE for AdminMenuPermission
2. `/src/app/api/user/theme/route.ts` - GET/PUT for user theme preference

## Key Decisions
- Employee DELETE now uses isHidden: true on all related records instead of hard-deleting
- Notifications referencing deleted employee are hidden by searching title/message for employee name/ID
- Attendance auto-create skips future months entirely (maxDay = 0)
- Sites groupBy only counts employees at active sites
- Session route supports both hasUsers check (signup) and full session data (with userId param)
