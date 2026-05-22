# Accounts API Routes - Work Record

## Task
Create three API routes for the Accounts feature in the ASM workforce management Next.js project.

## Files Created

### 1. `/src/app/api/accounts/route.ts` - GET accounts data
- **Endpoint**: `GET /api/accounts?month=YYYY-MM&year=INTEGER`
- Fetches all active sites for the given month
- For each site: gets distinct employees from EmpCountSitePerMonth (where deletedDate is null)
- For each employee: gets salary record and working hours with calculated RT/HR
- Includes manually added salary records not in EmpCountSitePerMonth
- Returns aggregated data with site-level and grand totals

### 2. `/src/app/api/accounts/salary/route.ts` - Salary CRUD
- **POST**: Create new salary record (or restore soft-deleted record)
- **PUT**: Update salary record by id (totalHours, rtPerHour, totalSalary, deduction, advance, balanceSalary, isPaid, totalWorkingHours)
- **DELETE**: Soft-delete salary record (set isDeleted=true)
- Handles unique constraint (empId + siteId + month + year)
- Optionally updates TotalEmployeeWorkingHours when totalWorkingHours is provided

### 3. `/src/app/api/accounts/working-hours/route.ts` - Working Hours CRUD
- **GET**: List all working hours records with optional search, or single record by empId
- **POST**: Create or upsert working hours record with auto RT/HR calculation
- **PUT**: Update working hours by id or empId with auto RT/HR recalculation
- RT/HR auto-calculation logic:
  - Basic: 2.5 for everyone
  - ≥1000 hours: 5.0
  - Team Leader bonus: +0.5 (3.0 basic, 5.5 after 1000hrs)
  - Custom rate overrides calculation when isCustom=true

## Coding Standards Followed
- Uses `import { db } from '@/lib/db'` for database access
- Uses NextRequest/NextResponse from 'next/server'
- Consistent JSON responses: `{ success: true, data: {...} }` or `{ success: false, error: 'message' }`
- Proper error handling with try/catch
- TypeScript types throughout
- Follows existing project code style (matches sites/route.ts, etc.)
- Lint passes cleanly
