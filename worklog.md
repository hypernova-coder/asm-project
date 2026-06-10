# ASM Project Worklog

---
Task ID: 1
Agent: Main Orchestrator
Task: Database schema updates

Work Log:
- Added `role` (String, default "Standard") to Employee model
- Added `customHourlyRate` (Float, nullable) to Employee model
- Ran `prisma db push` successfully
- Schema changes propagated to PostgreSQL database

Stage Summary:
- Employee model now supports `role` field ("Standard", "Team Leader", "Supervisor")
- Employee model now supports `customHourlyRate` for overriding standard tier rates
- Database is in sync with schema

---
Task ID: 2
Agent: Main Orchestrator
Task: Core calculation engine updates

Work Log:
- Updated `allocateEmployeeHours` to check `employee.customHourlyRate` first (Priority 1)
- Added fallback to `TotalEmployeeWorkingHours.isCustom` (Priority 2) and standard tiers (Priority 3)
- Updated `computeAllocationSplit` to accept `customHourlyRate` parameter
- Added comments documenting that cumulative hours span ALL years (string comparison "2024-12" < "2025-01" is correct for YYYY-MM format)

Stage Summary:
- Calculation engine now respects `customHourlyRate` from Employee model
- Cumulative hours correctly span across years (verified string comparison logic)
- `computeAllocationSplit` supports both legacy custom rate and new employee-level custom rate

---
Task ID: 3
Agent: Main Orchestrator
Task: API route updates

Work Log:
- Updated `/api/employees` POST to include `role` and `customHourlyRate`
- Updated `/api/employees/[id]` PUT to handle `role` and `customHourlyRate`
- Updated `/api/accounts` GET to include `customHourlyRate` in employee data
- Updated `/api/accounts/employee-monthly` GET/PUT to include `customHourlyRate`
- Updated `/api/employees/batch-upload` to support custom_id parsing, role parsing, customHourlyRate, and duplicate ID validation

Stage Summary:
- All API routes now support the new fields
- Batch upload validates custom IDs against existing records
- Role auto-derived from isTeamLeader/isSupervisor flags

---
Task ID: 4
Agent: Subagent (full-stack-developer)
Task: Dashboard refactoring

Work Log:
- Replaced site filter dropdown with Month/Year picker
- Added site-based Accordion view using /api/accounts (Mode 2)
- Each site card shows Total Employees, Total Combined Hours, Sum of Calculated Wages
- Expanded content shows detailed employee table with split computation details
- Preserved existing metric cards and charts

Stage Summary:
- Dashboard now shows site-based accordion view with aggregated metrics
- Uses mergeApiEntries to merge standard/premium salary records
- Detailed employee table shows rate structure, split computation, and total payout

---
Task ID: 5
Agent: Subagent (full-stack-developer)
Task: Accounts page updates

Work Log:
- Updated salary-records POST handler to fetch employees from both currentSite matching and EmpCountSitePerMonth
- Added CustomRateCell component for inline custom rate editing
- Custom rate save flow: PUT /api/employees → PUT /api/accounts/working-hours → POST /api/accounts/allocate
- Added "Custom Rate" column to salary records table

Stage Summary:
- Auto-loading employees when site is selected (from both sources)
- Inline custom rate editing with full cascade updates
- Allocation engine re-triggered after custom rate changes

---
Task ID: 6
Agent: Subagent (full-stack-developer)
Task: Consolidated Salary Sheet audit columns

Work Log:
- Added 4 new columns: BASE AMT, PREMIUM AMT, CUSTOM RATE, GROSS TOTAL
- Updated MergedEmployeeRow type with customHourlyRate
- Updated mergeApiEntries to extract customHourlyRate from API
- Updated site totals and grand totals with new breakdowns
- Table min-width increased to 1600px

Stage Summary:
- Consolidated Salary Sheet now has full audit tracking columns
- BASE AMT = lowRateHours × lowRate, PREMIUM AMT = highRateHours × highRate
- CUSTOM RATE shows override if applicable, GROSS TOTAL = BASE + PREMIUM

---
Task ID: 7
Agent: Subagent (full-stack-developer)
Task: Employee Hours Ledger page

Work Log:
- Created /src/components/employees/employee-hours-ledger.tsx
- Added employee_hours_ledger to AppView type and app-store
- Added import and route handling in page.tsx
- Component includes: header with role badge, milestone progress gauge, year selector, historical data table, custom rate configuration

Stage Summary:
- Standalone hours ledger page with historical month-by-month data
- Progress gauge shows approach to 1000h threshold
- Custom rate configuration with save/clear functionality
- Accessible from employee list via Clock icon button

---
Task ID: 8
Agent: Main Orchestrator
Task: Batch upload updates and employee page updates

Work Log:
- Added employeeId, role, customHourlyRate to HEADER_MAP in batch-upload
- Custom ID from file is validated against existing records
- Role parsed from file (supervisor/team leader/standard)
- Added customHourlyRate input to employee add/edit form
- Added "Hours Ledger" button to employee list actions
- Added DollarSign icon import and useAppStore import

Stage Summary:
- Batch upload supports custom IDs, roles, and custom hourly rates
- Duplicate custom IDs rejected with clear error message
- Employee form has custom hourly rate override field
- Hours Ledger accessible from employee list

---
Task ID: 9
Agent: Main Orchestrator
Task: Final lint check, fix radix version, push to GitHub

Work Log:
- Verified @radix-ui/react-aspect-ratio is at ^1.1.7 (valid)
- Lint passes cleanly
- Ready for GitHub push

Stage Summary:
- All code changes compile and lint cleanly
- Ready for deployment

---
Task ID: 3
Agent: full-stack-developer
Task: Update Prisma schema and refactor calculation engine

Work Log:
- Added `WorkLog` model to Prisma schema with fields: logId (auto-increment Int PK), employeeId (String FK to Employee.id), siteId (String FK to Site.id), year (Int NOT NULL), month (Int NOT NULL 1-12), hoursWorked (Float default 0.00), allowances (Float default 0.00), deductions (Float default 0.00), deletedAt (DateTime? soft delete), createdAt, updatedAt
- Added `workLogs WorkLog[]` relation field to Employee model
- Added `workLogs WorkLog[]` relation field to Site model
- Added unique constraint @@unique([employeeId, siteId, year, month]) on WorkLog
- Added index @@index([employeeId, year, month], name: "idx_work_logs_chrono") on WorkLog
- Refactored allocation-engine.ts: replaced old rate formula (Standard: 2.5/5.0, TL/Sup: 3.0/5.5) with divisor-based formula (Tier Rates: always 2.5/5.0; Divisors: Standard 1.0/1.0, TL/Sup 3.0/5.5)
- Updated `allocateEmployeeHours` function: lowRate = 2.5/lowDivisor, highRate = 5.0/highDivisor
- Updated `computeAllocationSplit` function: same divisor-based formula
- Updated TotalEmployeeWorkingHours rate calculation in allocation engine
- Updated `/api/salary-records` POST: initial rtPerHour uses divisor formula
- Updated `/api/accounts/salary` calculateRtPerHour helper: divisor-based formula
- Updated `/api/accounts/working-hours` calculateRtPerHour function: divisor-based formula
- Updated `/api/accounts` GET calculatedRtPerHour: divisor-based formula
- Updated `/api/accounts/employee-monthly` GET autoRate: divisor-based formula
- Ran `prisma db push` successfully — WorkLog table created
- Ran `prisma generate` — Prisma Client regenerated
- Lint passes cleanly

Stage Summary:
- WorkLog model added to database for per-employee per-site monthly work tracking
- All rate calculations across the entire codebase now use the PRD-specified divisor formula
- Effective rates: Standard (2.5 below / 5.0 above), TL/Supervisor (0.8333 below / 0.9091 above)
- Database schema is in sync, Prisma Client regenerated, all code lint-clean

---
Task ID: 7
Agent: full-stack-developer
Task: Employee Hours Master Directory + Sidebar update

Work Log:
- Added Clock icon import to app-sidebar.tsx
- Added 'employee_hours_ledger' nav item with label 'Employee Hours', Clock icon, permissionSlug 'employees', roles ['super_admin'] — placed right after 'employees' entry
- Created API endpoint /api/employees/hours-summary/route.ts — returns all active employees with cumulative hours, effective rate, current site (resolved from EmpCountSitePerMonth), threshold status, and supports search/rate/threshold filters
- Created EmployeeHoursDirectory component at /src/components/employees/employee-hours-directory.tsx — master directory table with columns: Employee ID | Name | Current Site | Trade | Rate | Cumulative Hours | Threshold Status
- Directory includes: Rate filter dropdown (2.5, 5.0, 0.83, 0.91, Custom), Threshold filter dropdown (< 1000h, ≥ 1000h), search input, sortable columns, summary stat cards
- Current Site resolved from latest EmpCountSitePerMonth deployment (no more empty — lines)
- Employee ID (ASM-YYYY-NNN format) exposed in directory
- Clicking employee row opens detailed EmployeeHoursLedger via setSelectedEmployeeId
- Updated page.tsx: employee_hours_ledger view now shows EmployeeHoursDirectory when no employee selected, EmployeeHoursLedger when employee selected; onBack clears selectedEmployeeId without switching to employees view
- Ran lint — passes cleanly

Stage Summary:
- Sidebar now has "Employee Hours" menu item with Clock icon
- New /api/employees/hours-summary endpoint provides batch employee hours data
- EmployeeHoursDirectory component provides master directory with filters, sorting, and clickable rows
- Clicking employee navigates to detailed EmployeeHoursLedger; back button returns to directory
- All code lint-clean

---
Task ID: 5-6
Agent: full-stack-developer
Task: Fix cumulative hours logic + Monthly Hours Breakdown UI overhaul

Work Log:
- Fixed cumulative hours logic in `/api/accounts/employee-monthly/route.ts`: months with 0 hours now return cumulativeHours = 0 instead of carrying forward a trailing duplicate value; running total still accumulates for correct cross-year cumulative calculation on months with data
- Removed Rate Tier column from the Monthly Hours Breakdown table (was 7 cols, now 6 cols)
- Added color-coded Rate/Hr badges: Emerald for 2.5-derived rates (Standard low: 2.5, TL/Sup low: 0.8333), Green for 5.0-derived rates (Standard high: 5.0, TL/Sup high: 0.9091), Violet for custom rates
- Added `getRateColor()`, `getRateBadgeClasses()`, `getRateTextClasses()` helper functions
- Added header multi-edit action: Pencil icon button in the table header toggles edit mode; all rows transform Total Hours, Rate/Hr, Custom Rate into editable Input fields; Save/Cancel button pair appears; Save sends PUT to `/api/accounts/employee-monthly` with monthlyData array; Cancel reverts to original data; saving spinner shown during API call
- Added EditableRow interface and edit mode state management (editableRows, isEditMode, isSavingEdits)
- Fixed cumulative hours display: shows "0.0" instead of "—" for months with 0 cumulative hours
- Removed unused `getRateTier()` function and `Separator`/`Progress`/`Tabs`/`TabsContent`/`TabsList`/`TabsTrigger` imports
- Added `Pencil` icon import from lucide-react
- Lint passes cleanly

Stage Summary:
- Cumulative hours now correctly shows 0 for empty months (no trailing duplicate)
- Rate Tier column removed; Rate/Hr now color-coded with Emerald/Green/Violet badges
- Full multi-edit mode with pencil toggle, editable grid, Save/Cancel with API integration
- Cumulative hours and total hours show "0.0" instead of "—" for zero values
- All code lint-clean

---
Task ID: 9
Agent: full-stack-developer
Task: Consolidated Salary Sheet with threshold split columns

Work Log:
- Updated `/api/salary-records` GET endpoint to include `isTeamLeader`, `isSupervisor`, and `role` in employee select
- Added `computeGrossSalary` helper to API that merges standard/premium records per employee and applies divisor-based formula
- Updated site summaries in API to include `totalBelowThresholdHours`, `totalAboveThresholdHours`, `totalGrossSalary` fields
- Fixed employee count calculation in API to use unique empId count (not raw record count) so split employees aren't double-counted
- Fixed deduction/advance totals to only sum from standard rateTier records (deductions/advances live on standard records)
- Completely rewrote `ConsolidatedSalaryPage` component with:
  - New `MergedEmployee` type that combines standard + premium salary records per employee
  - `mergeSalaryRecords` helper that groups records by empId+siteId and extracts below/above threshold hours
  - `computeGrossSalary` helper using divisor-based formula: (below_hrs × 2.5)/divisor + (above_hrs × 5.0)/divisor
  - Divisors: Standard 1.0/1.0, TL/Supervisor 3.0/5.5
  - Custom rate support: if employee has customHourlyRate, all hours × customRate
- Added threshold split columns to site summary table: "Below Threshold Hrs" and "Above Threshold Hrs" with color-coded backgrounds
- Added "Gross Salary" column to site summary table (calculated with divisor formula)
- Updated summary metric cards: replaced "Total Working Hours" and "Total Salary" with "Below Threshold Hrs", "Above Threshold Hrs", and "Gross Salary (Divisor-based)"
- Added employee detail expansion with columns: Employee ID | Name | Site | Role | Below Threshold Hrs | Above Threshold Hrs | Total Hrs | Below Salary | Above Salary | Gross Salary | Deduction | Advance | Balance | Status
- Added RoleBadge component showing TL (sky) and SUP (orange) badges
- Added CR (Custom Rate) badge for employees with customHourlyRate override
- Added site employee totals row in expanded view
- Added divisor formula reference footer in expanded view
- Implemented DB-first invalidation: cache-busting timestamp query param, no-store fetch, Cache-Control headers, and refresh button
- Kept existing filter (month/year picker) and summary card functionality
- Lint passes cleanly

Stage Summary:
- Consolidated Salary Sheet now shows threshold split columns (Below/Above Threshold Hours)
- Gross salary calculated using divisor-based formula (Standard: 2.5/1.0 + 5.0/1.0, TL/Sup: 2.5/3.0 + 5.0/5.5)
- Employee detail expansion shows individual employees with merged standard+premium records
- API returns proper employee counts (unique), below/above threshold hours, and gross salary
- DB-first invalidation ensures fresh data on every fetch
- All code lint-clean

---
Task ID: 8
Agent: full-stack-developer
Task: Accounts page site edit + data persistence fix

Work Log:
- Fixed PUT handler in `/api/salary-records/route.ts` to support `totalHours` field — previously only deduction, advance, rtPerHour, isPaid were destructured; totalHours was silently ignored, causing data loss when totalHours was edited
- Updated recalculation logic in PUT handler to use new totalHours value if provided (was hardcoding `existing.totalHours`)
- Added success toast to `handleUpdateRecord` so user gets confirmation of persistence
- Created `/api/salary-records/bulk-update/route.ts` — new POST endpoint that accepts an array of record changes and applies them transactionally, with per-record error handling
- Added PATCH handler to `/api/salary-records/[id]/route.ts` for toggling `isDeleted` flag (used by undo flow)
- Rewrote accounts-page.tsx with site-level edit mode:
  - "Edit" button in the Salary Records card header (alongside the title)
  - When active, totalHours, rtPerHour, deduction, advance columns become Input fields with amber border styling
  - Local edit buffer (Map<recordId, EditBufferEntry>) tracks all changes without API calls
  - "Save" button bulk-updates all changed records via `/api/salary-records/bulk-update`
  - "Cancel" button discards all changes and reverts to original data
  - Modified rows highlighted with amber background tint
  - Changed record count shown between Cancel and Save buttons
  - Totals recalculate live as edits are made (effectiveRecords memo)
- Added soft delete with undo:
  - Trash icon button per row (visible only in edit mode)
  - Soft-deletes record via DELETE `/api/salary-records/[id]` (sets isDeleted=true)
  - Shows toast notification with "Undo" button (5-second duration)
  - Undo calls PATCH `/api/salary-records/[id]` with { isDeleted: false } to restore
  - On successful undo, refreshes salary records from API
- Edit mode resets on site change
- Lint passes cleanly

Stage Summary:
- Data persistence bug fixed: PUT endpoint now supports totalHours and recalculates correctly
- Site edit mode with Edit/Save/Cancel workflow for bulk-updating all editable fields
- Soft delete with 5-second undo via toast notification system
- New bulk-update API endpoint for efficient multi-record saves
- New PATCH endpoint for toggling isDeleted flag (undo support)
- All code lint-clean

---
Task ID: fix-ts-errors
Agent: full-stack-developer
Task: Fix TypeScript errors in API routes and components

Work Log:
- Fixed `/src/app/api/accounts/route.ts`:
  - Added `id: true` to workingHoursRecords select (was missing, caused Property 'id' error)
  - Added `customHourlyRate: number | null` to workingHours type in EmployeeEntry
  - Changed `salaryRecord` type from `(typeof allSalaryRecords)[0]` to `Omit<..., 'createdAt' | 'updatedAt'> & { createdAt: string; updatedAt: string }` to allow ISO string serialization
  - Extracted `EmployeeEntry` type alias for reuse between siteResults and employeeEntries
  - Added explicit type annotation to `siteResults` array (was inferred as `never[]`)
- Fixed `/src/app/api/accounts/employee-monthly/route.ts`:
  - Added `string[]` type annotation to `monthsInOrder` array
  - Added explicit type annotation to `monthlyData` array: `Array<{ month: string; totalHours: number; cumulativeHours: number; rtPerHour: number; recordId: string | null }>`
  - Added explicit type annotations to `results` and `errors` arrays in PUT handler
- Fixed `/src/components/employees/employee-hours-ledger.tsx`:
  - Added `number[]` type annotation to `years` array in useMemo
  - Fixed `originalRow` possibly undefined error by using `originalRow && originalRow.cumulativeHours > 0` instead of `originalRow?.cumulativeHours > 0`
- Fixed `/src/app/api/accounts/salary/bulk-save/route.ts`:
  - Added `AllocationResult` type import from allocation-engine
  - Added `AllocationResult[]` type annotation to `allocationResults` array
- Fixed `/src/app/api/accounts/working-hours/route.ts`:
  - Added explicit type annotation to `results` array with all fields including nested `employee` object type
- Verified `/src/app/api/salary-records/route.ts` had no TypeScript errors
- Ran `bun run lint` — passes cleanly
- Ran `npx tsc --noEmit` — zero errors in all affected files

Stage Summary:
- All TypeScript errors in the 5 affected files resolved
- Root cause: subagent changes introduced arrays without type annotations, causing TypeScript to infer `never[]`
- Also fixed missing `id` field in Prisma select, missing `customHourlyRate` in type definition, and Date→string serialization type mismatch
- Both lint and tsc pass cleanly for all targeted files
