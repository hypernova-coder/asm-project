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
