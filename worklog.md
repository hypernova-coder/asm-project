# ASM Project Worklog

---
Task ID: 1
Agent: Main Agent
Task: Database Schema - Add trade, isSupervisor, supervisorSiteId to Employee; Create Permission & AdminPermission models; Seed default permissions

Work Log:
- Added `trade` field to Employee model (VARCHAR, nullable)
- Added `isSupervisor` Boolean and `supervisorSiteId` String to Employee model
- Added indexes on trade, isTeamLeader, isSupervisor, currentSite
- Created Permission model with name, slug, group fields
- Created AdminPermission pivot model with adminId, permissionId
- Added User → AdminPermission relation
- Seeded 12 default permissions in 3 groups (general, workforce, admin)
- Pushed schema to database with force-reset

Stage Summary:
- Database schema updated with all new fields and models
- 12 permissions seeded: Dashboard, Employees, Sites, Attendance, Uniform Registry, Leave Requests, Cancellations, Notifications, Admin Management, Settings, Payroll, Reports
- Schema supports both SQLite (dev) and PostgreSQL (production)

---
Task ID: 2
Agent: Main Agent
Task: API Routes - Update employees API with advanced filters; Add TL/Supervisor assignment endpoints; Add permissions CRUD API

Work Log:
- Updated GET /api/employees to support trade, idle, teamLeaders, supervisors, site filters
- Added idleCount, trades, teamLeaderCount, supervisorCount to employee list response
- Updated POST /api/employees to handle trade, isSupervisor, supervisorSiteId
- Updated PUT /api/employees/[id] to handle supervisor fields and force replace
- Added forceReplaceTeamLeader and forceReplaceSupervisor API params
- Created /api/permissions route with GET (list+check), POST (toggle), PUT (bulk update)
- Permission API syncs changes to both AdminPermission and AdminMenuPermission tables

Stage Summary:
- Full advanced filtering support in employees API
- TL/Supervisor assignment with conflict detection (409) and force replace
- Permission CRUD API with backward compatibility via AdminMenuPermission sync

---
Task ID: 3
Agent: Subagent (full-stack-developer)
Task: Dashboard - Add Idle Workers analytics card with navigation

Work Log:
- Added 5th metric card "Idle Workers" with amber theme
- Card shows idle count and percentage of workforce
- Clickable: navigates to employees with idle filter via localStorage
- Added Team Leaders and Supervisors stat pills below header
- Changed grid from 4 to 5 columns on lg screens

Stage Summary:
- Idle Workers card with UserX icon, amber theme, percentage display
- Click → sets localStorage('asm_idle_filter', '1') → navigates to employees
- Team Leaders (Crown/amber) and Supervisors (ShieldCheck/emerald) stat pills

---
Task ID: 4
Agent: Subagent (full-stack-developer)
Task: Employee Page - Trade System & Advanced Filters

Work Log:
- Renamed all Position → Trade in UI labels, headers, form tabs
- Created SearchableTradeSelect with 20 common trades + custom entry
- Added advanced filter bar: Trade dropdown, Site dropdown, Idle/TL/Supervisor toggles
- Added active filter chips with clear all button
- Added Supervisor badges (ShieldCheck, violet theme)
- Added auto-activate idle filter from localStorage
- Added trade, isSupervisor, supervisorSiteId to Employee interface and formData

Stage Summary:
- Complete Trade system replacing Position throughout UI
- Searchable trade dropdown with 20 preset trades
- 6 advanced filters with visual filter chips
- Supervisor badge system with violet/amber theme
- Idle filter auto-activation from dashboard navigation

---
Task ID: 5
Agent: Subagent (full-stack-developer)
Task: Sites Page - Team Leader & Supervisor Assignment

Work Log:
- Added isSupervisor, supervisorSiteId, trade to SiteEmployee interface
- Added Crown (TL) and ShieldCheck (Supervisor) badges in employee table
- Added dropdown menu with "Assign as Team Leader" / "Assign as Supervisor"
- Added AlertDialog confirmation for replacing existing TL/Supervisor
- Added force replace API integration (forceReplaceTeamLeader/forceReplaceSupervisor)
- Added Supervisor clearing when removing employee from site
- Renamed Position → Trade column header
- Sorted: Team Leaders first, Supervisors second, then rest

Stage Summary:
- TL/Supervisor assignment with dropdown menu per employee
- Confirmation modals with existing role holder names
- Force replace API integration for conflict resolution
- Badge display for TL (amber) and Supervisor (violet)

---
Task ID: 6
Agent: Main Agent
Task: Admin Page - Enhanced Permission Management

Work Log:
- Updated handleManageAccess to use new /api/permissions endpoint
- Added PermissionItem interface and PERMISSION_GROUPS constant
- Added allPermissions and permSearch state
- Replaced Manage Access dialog with grouped permission view
- Added permission summary progress bar
- Added searchable permission filter
- Added Select All / Clear All per group
- Added group color coding (slate/emerald/amber)
- Updated togglePermission to use new permissions API

Stage Summary:
- Grouped permission dialog: General, Workforce, Administration
- Progress bar showing X/Y permissions granted
- Search filter for quick permission lookup
- Select All / Clear All per permission group
- Synced with both AdminPermission and AdminMenuPermission tables

---
Task ID: 8
Agent: Main Agent
Task: Push code to GitHub

Work Log:
- Committed all changes with descriptive message
- Pushed to https://github.com/hypernova-coder/asm-project.git main branch

Stage Summary:
- All changes pushed successfully to GitHub
- Commit: feat: Enterprise RBAC + Workforce Management Enhancements

---
Task ID: 9
Agent: Main Agent
Task: Consolidate RBAC - Sidebar menu permission toggles for admin accounts

Work Log:
- Updated /api/permissions route.ts with auto-seed (PERMISSION_SEEDS) and stale permission cleanup
- Added isAlwaysVisible field to Permission API response for Dashboard/Uniform Registry
- Updated /api/menu-permissions route.ts to read from both AdminPermission and AdminMenuPermission (merge strategy)
- Updated app-sidebar.tsx to fetch permissions from /api/permissions (new system) with fallback to /api/menu-permissions
- Sidebar now dynamically shows/hides menus based on granted permissions for admin users
- Super admins always see all menus; Admins see only granted + always-visible menus
- Rewrote admin-page.tsx with enhanced permission management:
  - SIDEBAR_MENUS constant mirrors sidebar items with icons
  - Permission toggle dialog shows each menu with its icon and "Always On" badge for dashboard/uniform
  - Quick actions: Grant All / Revoke All buttons
  - Group-level Select All / Clear All
  - Grouped by General, Workforce, Administration with color coding
  - Admin table shows menu access badges (green for always-on, blue for granted)
- Updated page.tsx (MainLayout) to use /api/permissions for view-level access control
- Fixed Prisma schema datasource from postgresql to sqlite to match .env
- Cleaned up stale permissions (Settings, Reports, Payroll) from database
- Permission refresh interval set to 15 seconds for snappier updates

Stage Summary:
- Full RBAC system: Permission table (9 items) + AdminPermission pivot table
- Super Admin grants/revokes sidebar menu access for normal Admins via toggle UI
- Sidebar dynamically shows/hides based on permissions (refreshes every 15s)
- View-level guard in page.tsx prevents URL-based access to restricted views
- Always-visible menus: Dashboard, Uniform Registry
- Configurable menus: Employees, Sites, Attendance, Leave Requests, Cancellations, Notifications, Admin Management
- Legacy AdminMenuPermission kept in sync for backward compatibility
- All lint checks pass

---
Task ID: 10
Agent: Main Agent
Task: Inline menu toggles per admin + SweetAlert2 replacement

Work Log:
- Installed sweetalert2@11.26.24 package
- Completely rewrote admin-page.tsx with major UX changes:
  - Replaced table-based admin list with expandable card layout
  - Each admin card has a "Manage Menu Access" section that expands inline when clicked
  - All hidden menus listed with toggle switches to grant/revoke permission
  - Always-visible menus (Dashboard, Uniform Registry) shown with "Always On" badge
  - Configurable menus show Eye/EyeOff icons indicating visibility state
  - Progress bar showing granted/total permissions per admin
  - Grant All / Revoke All quick actions per admin
  - Group-level Select All / Clear All (General, Workforce, Administration)
  - Removed separate permissions dialog - now inline expandable
- Replaced all useToast() with SweetAlert2:
  - swalSuccess(): top-end toast with success icon, auto-dismiss
  - swalError(): top-end toast with error icon
  - swalConfirm(): centered confirmation dialog with warning icon
  - Dark theme config matching app's slate color scheme
  - Permission grant shows success toast, revoke shows info toast
- Permissions pre-fetched for all admins on page load for instant expand
- Lint passes cleanly

Stage Summary:
- Admin cards now expand inline to show menu access toggles
- SweetAlert2 replaces all toast/confirm dialogs with beautiful dark-themed alerts
- All 7 configurable menus have toggle switches per admin
- Always-on menus shown with green "Always On" badge (non-toggleable)
- Visual feedback: Eye/EyeOff icons, blue highlight when granted, dimmed when revoked

---
Task ID: 11
Agent: Main Agent
Task: Fix uniform registry creation, cascade soft-deletion, employee PDF generation

Work Log:
- Fixed "Failed to create uniform registry entry" bug:
  - The uniformId Int @unique field was not being set during POST creation
  - Added auto-increment logic for uniformId (find max + 1)
- Implemented cascade soft-deletion when employee is deleted:
  - Attendance: isHidden = true
  - Uniform Registry: isDeleted = true
  - Notifications: isHidden = true
  - Warnings: isHidden = true
  - Fines: isHidden = true
  - Leave Requests: isHidden = true
  - Cancellation Requests: isHidden = true
- Added isHidden: false filter to all GET routes:
  - /api/attendance, /api/warnings, /api/fines
  - /api/leave-requests, /api/cancellation-requests
  - /api/notifications (including unread count query)
- Implemented employee PDF generation (A4, single page):
  - Professional two-column CV format with company header
  - Left column: Profile photo, Contact info, Trade & Skills
  - Right column: Name header bar, Employee Information grid, Employment Status
  - Footer with generation timestamp
  - Uses jsPDF library
- Added Share via WhatsApp button using Web Share API with fallback
- Added Download PDF button for direct download as EMPLOYEE_DATA.pdf
- Pushed to GitHub

Stage Summary:
- Uniform registry creation fixed (uniformId auto-increment)
- Full cascade soft-deletion for all employee-related records
- All list APIs filter out hidden/deleted records
- Professional A4 single-page employee PDF with company header
- WhatsApp sharing via Web Share API + download fallback

---
Task ID: 12
Agent: Main Agent
Task: Uniform registry filtering - show latest entry per employee + fix creation error

Work Log:
- Added `latestOnly` query parameter to GET /api/uniform-registry
- When latestOnly=true, API fetches all matching entries, deduplicates by keeping only the latest per employeeId
- Added employeeEntryCount field to API response (counts total entries per employee)
- Updated uniform-registry-page.tsx frontend to pass latestOnly=true
- Added entry count badge ("N entries") when employee has multiple entries
- Added employee ID display below employee name in both desktop and mobile views
- Updated subtitle: "Showing latest entry per employee — click to view all entries"
- Updated pagination text from "entries" to "employees"
- Fixed "Failed to create uniform registry entry" error: caused by stale SQLite file descriptors after DB file was recreated
- Restarted dev server to pick up current database file
- Verified cascade soft-deletion already implemented in DELETE /api/employees/[id]
- Updated PDF filename from EMPLOYEE_DATA.pdf to employee_data.pdf per user request
- Improved WhatsApp fallback message

Stage Summary:
- Main uniform registry view now shows only the latest entry per employee (deduplication)
- Purple badge shows "N entries" when employee has multiple entries
- Detailed view (UniformEntryDetails) already shows all entries per employee
- Creation error fixed by server restart (stale DB file descriptor)
- Cascade soft-deletion confirmed working for all 7 related record types
- PDF filename standardized to employee_data.pdf

---
Task ID: 13
Agent: Main Agent
Task: Fix attendance P button bulk mark - error marking and filtered employees

Work Log:
- Diagnosed two bugs in the bulk mark present functionality:
  1. Attendance refresh URL after bulk mark was wrong: `month=${monthStr}` (just "03") instead of `month=${yearStr}-${monthStr}` ("2025-03"). This caused the API to fail parsing and return stale/empty data.
  2. Bulk-mark API always marked ALL active employees, ignoring any filters applied on the page.
- Fixed `/api/attendance/bulk-mark/route.ts`:
  - Added `employeeIds` optional parameter to the request body
  - When `employeeIds` is provided (array of IDs), only those employees are marked
  - When not provided, falls back to marking all active employees (backward compatible)
- Fixed `attendance-page.tsx`:
  - `handleBulkMarkPresent` now extracts `employeeIds` from the currently displayed (filtered) employees array
  - Passes `employeeIds` to the bulk-mark API so only filtered employees get marked
  - Fixed attendance refresh URL: uses `month=${yearStr}-${monthStr}` format matching the initial fetch
  - Confirmation dialog now shows filter context (site name, search term) when applicable
  - Added `searchDebounce` and `selectedSite` to useCallback dependency array
- Pushed to GitHub (commit a1b0343)

Stage Summary:
- P button bulk mark now works correctly: marks only currently displayed employees as present
- When site filter or search is active, only those filtered employees are marked
- Attendance data properly refreshes after bulk mark (fixed API URL format)
- Confirmation dialog clearly shows which employees will be affected

---
Task ID: 2-3-4
Agent: Backend Agent
Task: Backend API changes for site employee history tracking

Work Log:
- Updated PUT /api/sites/route.ts: When a site is set to inactive (isActive: false), added transactional logic to:
  - Find all employees currently assigned to the site (currentSite === site.name, status !== 'deleted')
  - Set each employee's currentSite to null (makes them Idle)
  - Clear isTeamLeader/teamLeaderSiteId if they were TL of this site
  - Clear isSupervisor/supervisorSiteId if they were supervisor of this site
  - Close any open EmpCountSitePerMonth records (set removedDate to now) for each employee+site
- Updated PUT /api/employees/[id]/route.ts: When currentSite changes, added EmpCountSitePerMonth tracking:
  - Case A (adding to site): Create new EmpCountSitePerMonth record with empId, empName, siteId, siteName, month (YYYY-MM), createdDate=now, removedDate=null
  - Case A (moving sites): Also close open EmpCountSitePerMonth record for the OLD site
  - Case B (removing from site, currentSite set to null): Close all open EmpCountSitePerMonth records for the employee
- Created new GET /api/site-history/route.ts:
  - Accepts siteId query parameter (required)
  - Returns all EmpCountSitePerMonth records for the site where deletedDate is null
  - Ordered by empName ascending, then createdDate ascending
  - Includes employee relation for employeeId (the code like "EMP001")
  - Returns siteClosedDate (site.createdAt if inactive, null if active) at both record and data level
  - All date fields serialized as ISO strings
- All lint checks pass cleanly

Stage Summary:
- Site deactivation now cascades: unassigns employees, clears TL/Supervisor roles, closes EmpCountSitePerMonth records
- Employee site changes now create/close EmpCountSitePerMonth records for full audit trail
- New /api/site-history endpoint provides historical employee records per site for reporting

---
Task ID: 5
Agent: Frontend Agent
Task: Add View All Employees Worked Here button and history dialog

Work Log:
- Added `History` icon import from lucide-react
- Added `onViewHistory` prop to `SiteCardsGrid` component with type `(site: Site) => void`
- Added "View All Employees Worked Here" button on inactive site cards only (`!site.isActive`), with amber/violet color scheme (`bg-amber-500/10 border-amber-500/30 text-amber-300 hover:bg-violet-600`)
- Added `HistoryRecord` interface matching the `/api/site-history` response format
- Added `showHistoryDialog`, `historySite`, `historyRecords`, `loadingHistory` state variables to `SitesPage`
- Created `handleViewHistory` callback that sets dialog state, fetches from `/api/site-history?siteId=${site.id}`, and populates `historyRecords`
- Created `handleCloseHistory` callback that closes dialog and resets all history state
- Created `SiteEmployeeHistoryDialog` component inline with:
  - Dialog title "Employees Worked at {siteName}" with History icon
  - Table with columns: SL.NO, Name, EMP ID, Start Date, End Date, Site Closed Date
  - SL.NO as simple incrementing counter (index + 1)
  - Dates formatted as "Mar 15, 2025" style
  - End Date shows "Still Active" in green when removedDate is null
  - Site Closed Date shows "N/A" in gray when null
  - Loading state with Loader2 spinner
  - Empty state with Users icon and message
  - Close button in dialog footer
- Wired up `onViewHistory={handleViewHistory}` prop to both `<SiteCardsGrid>` instances (active and inactive tabs)
- Added `<SiteEmployeeHistoryDialog>` render at the end of the SitesPage JSX
- All lint checks pass cleanly

Stage Summary:
- Inactive site cards now show a "View All Employees Worked Here" button with History icon
- Clicking the button opens a dialog showing historical employee records from EmpCountSitePerMonth
- Dialog displays employee name, EMP ID, start date, end date, and site closed date
- Still Active employees highlighted in green; N/A values in slate/gray
- Both active and inactive SiteCardsGrid instances receive the onViewHistory prop (button only renders for inactive sites)

---
Task ID: 14
Agent: Main Agent
Task: Site employee history tracking + auto-idle on deactivation

Work Log:
- Added EmpCountSitePerMonth model to Prisma schema with FK references to Employee and Site
- Fields: id, empId, empName, siteId, siteName, month (YYYY-MM), createdDate, removedDate, updatedDate, deletedDate
- Fixed Prisma datasource provider from postgresql to sqlite to match .env DATABASE_URL
- Pushed schema to database with db:push
- Updated sites API PUT handler: when site set to inactive, all employees removed from site and set to Idle, TL/Supervisor roles cleared, open EmpCountSitePerMonth records closed (removedDate set)
- Updated employee PUT API: when currentSite changes, creates new EmpCountSitePerMonth record on site add, sets removedDate on site remove, handles transfers (close old + create new)
- Created /api/site-history GET route: returns all history records for a site, ordered by empName asc then createdDate asc, includes employee relation for employeeId
- Frontend: Added "View All Employees Worked Here" button on inactive site cards with amber/violet styling
- Frontend: Added SiteEmployeeHistoryDialog component with table (SL.NO, Name, EMP ID, Start Date, End Date, Site Closed Date)
- Consecutive rows for same employee ordered by oldest first (API ordering handles this)
- Pushed to GitHub (commit b45f1a6)

Stage Summary:
- New EmpCountSitePerMonth table tracks full employee-site assignment history
- Site deactivation automatically unassigns all employees and marks them Idle
- Employee site transfers tracked with start/end dates
- Inactive sites show "View All Employees Worked Here" button with history dialog
- Foreign key references work correctly (Employee → siteHistory, Site → employeeHistory)
---
Task ID: 1
Agent: main
Task: Enhance Accounts Management with edit mode, add employee, monthly detail view, supervisor rates, and bidirectional sync

Work Log:
- Rewrote accounts-page.tsx (~1200 lines) with all new features
- Added Edit mode toggle: fields editable only after clicking Edit button
- Without edit mode: Excel-style display (no textboxes visible), with edit mode: show Add Row, Delete Last Row, Save, Delete per row
- Separated total section from table with distinct visual styling
- isPaid toggle: unpaid→paid always allowed; paid→unpaid requires edit mode enabled
- Future months disabled (only up to current month clickable) in both accounts and employee detail views
- Added "Add Employee" button in Manage Employee Hours page with dialog showing employees not yet in TotalEmployeeWorkingHours
- Clicking a record in Manage Employee Hours opens full-page monthly hours detail view (EmployeeDetailPage)
- EmployeeDetailPage has year selector and monthly hours table with all data editable
- Rate changes in employee detail sync to salary table (bidirectional)
- RT/HR calculation updated: Supervisor now gets same +0.5 bonus as Team Leader for both basic (2.5→3.0) and full (5.0→5.5)
- Updated API routes: /api/accounts/working-hours with batch POST and available=true query, /api/accounts/employee-monthly for monthly CRUD
- All API routes updated with supervisor-aware RT/HR calculation
- Bidirectional sync: editing rate/hours in salary table updates TotalEmployeeWorkingHours and vice versa
- Added 'accounts' permission to PERMISSION_SEEDS, SIDEBAR_MENUS, seed-permissions script, and seeded in database

Stage Summary:
- Committed as c3e44d1 and pushed to GitHub
- All lint checks pass
- Key new features: edit mode, add employee dialog, employee monthly detail view, supervisor rate parity, bidirectional sync, future month restriction

---
Task ID: 6
Agent: Main Agent
Task: Continue session - verify all pending tasks from previous session

Work Log:
- Verified Prisma schema already has `month` field in TotalEmployeeWorkingHours with `@@unique([empId, month])` constraint
- Verified API routes properly handle per-month hours saving:
  - `/api/accounts/employee-monthly` (GET/PUT) correctly upserts per-month records
  - `/api/accounts/working-hours` (GET/POST/PUT) handles monthly records with month field
  - `/api/accounts/salary` has bidirectional sync with TotalEmployeeWorkingHours
  - `/api/accounts` (GET/POST/DELETE) handles site activation for months
- Verified EmployeeDetailPage properly saves per-month hours via PUT to `/api/accounts/employee-monthly`
- Verified AddNewSitesDialog component exists with site selection and custom site creation
- Verified "Add New Sites" button exists on Accounts Management main screen
- Investigated potential code corruption (MONTH_FULLonth] / onthStr) - confirmed these are display artifacts, actual file content is correct
- Verified database schema is in sync with Prisma schema (`prisma db push` confirmed)
- Verified all code passes ESLint checks
- Confirmed all changes are committed (7af1568) and pushed to GitHub (up-to-date)

Stage Summary:
- All pending tasks from previous session were already completed
- Schema has month field, API routes handle per-month CRUD, frontend has Add New Sites
- No code corruption found - file content is correct
- Database is in sync, lint passes, everything pushed to GitHub

---
Task ID: 3
Agent: Subagent (full-stack-developer)
Task: Update POST/PUT /api/accounts/salary route to handle rateTier field

Work Log:
- Updated POST handler:
  - Added `rateTier` to destructured request body with default "standard" via `effectiveRateTier`
  - Changed `findUnique` to use new constraint `empId_siteId_month_year_rateTier` including rateTier
  - Updated 409 error message to include the rate tier value
  - Added `rateTier: effectiveRateTier` to both soft-delete restore update and new record create data
  - Updated bidirectional sync: now sums ALL salary records for employee+month (both standard and premium) instead of using single record's totalHours
  - TotalEmployeeWorkingHours upsert now uses aggregated totalHoursFromSalary
- Updated PUT handler:
  - Added `rateTier` to destructured request body
  - Added `if (typeof rateTier === 'string' && rateTier) updateData.rateTier = rateTier` to build update data
  - Replaced two separate bidirectional sync blocks (updateWorkingHours + totalWorkingHours) with single unified block
  - Bidirectional sync now sums ALL salary records for employee+month (both standard and premium)
- DELETE handler left unchanged as specified
- calculateRtPerHour helper kept as-is (less relevant now since rates determined by split logic in GET endpoint)
- All lint checks pass cleanly

Stage Summary:
- Salary API POST/PUT now fully supports rateTier field with new unique constraint
- Bidirectional sync correctly aggregates hours across all rate tiers (standard + premium)
- Backward compatible: rateTier defaults to "standard" when not provided

---
Task ID: 2
Agent: Main Agent
Task: Update GET /api/accounts route with basic/premium hour split calculation

Work Log:
- Completely rewrote the GET handler in /src/app/api/accounts/route.ts
- Kept calcRtPerHour helper function (no longer used for per-employee rate; split logic replaces it)
- Kept POST and DELETE handlers unchanged
- Architecture: two-phase approach — parallel raw data collection, then cross-site split post-processing
- Phase 1 (data collection):
  - Fetched active sites and activated sites as before
  - Used Promise.all for parallel per-site data collection
  - Changed salary record lookup from findUnique to findMany (supports standard + premium records)
  - Batch-fetched TotalEmployeeWorkingHours for all employees (single query with empId IN)
  - Grouped working hours by empId for efficient lookup
- Phase 2 (split algorithm):
  - Grouped raw entries by employee, sorted sites alphabetically per employee
  - For each employee: calculated aggregateTotal, previousAggregate (months before current), remainingBasic
  - Processed sites in alphabetical order, applying split logic:
    - aggregateTotal ≤ 1000: all hours at basic rate (rateTier = "standard")
    - remainingBasic ≥ siteHours: all at basic, decrement remainingBasic
    - 0 < remainingBasic < siteHours: SPLIT into standard + premium entries
    - remainingBasic ≤ 0: all at premium rate (rateTier = "premium")
  - Rate calculation: basicRate = 2.5 (3.0 for TL/Supervisor), premiumRate = 5.0 (5.5 for TL/Supervisor)
  - Site-specific TL/Supervisor check: employee.isTeamLeader && employee.teamLeaderSiteId === site.id
- Salary record handling for splits:
  - Matching DB record found for rateTier: returned as-is
  - Standard tier without matching record: preserved deduction/advance/isPaid from existing template
  - Premium tier without matching record: 0 deduction/advance, isPaid=false
  - No DB record at all: salaryRecord = null
- SL.NO assignment:
  - Sorted entries by empName, then standard before premium
  - Same SL.NO for split entries of the same employee
  - Incrementing SL.NO per unique employee within each site
- Totals:
  - employeeCount based on unique employees (not entries) per site
  - Grand totals sum across all entries including split ones
- Response format: each entry includes rateTier: "standard" | "premium" field
- All lint checks pass cleanly
- Database schema already in sync (rateTier field already in SalaryRecord model)

Stage Summary:
- GET /api/accounts now implements basic/premium hour split when aggregate hours > 1000
- Cross-site alphabetical ordering ensures consistent split allocation
- Splits create two entries (standard + premium) sharing the same SL.NO
- Existing salary record data (deduction, advance, isPaid) preserved on standard entries
- Premium entries default to 0 deduction/advance
- Batch working-hours query improves performance over per-employee queries

---
Task ID: 4
Agent: Subagent (full-stack-developer)
Task: Update frontend accounts-page.tsx to handle basic/premium rate tier split entries

Work Log:
- Added `rateTier: 'standard' | 'premium'` field to EmployeeSalaryData interface
- Added `rateTier` field to SiteResult interface employees entries type and salaryRecord type
- Updated fetchAccounts mapping: added `rateTier: e.rateTier || 'standard'` to employee mapping
- Changed handleCellChange from empId-based to index-based identification (critical for split entries where same empId appears twice)
- Changed handlePaidToggle from empId-based to index-based identification (each split entry has independent isPaid status)
- Updated handleAddRow: added `rateTier: 'standard' as const` to new row default
- Updated handleSave: added `rateTier: emp.rateTier` to the save request body
- Updated tradeDisplay function to use let-based string building (consistent style)
- Added isSplitDuplicate helper: detects premium rows that are the second entry of a split (same empId with standard entry earlier)
- Updated table rendering:
  - Changed row key from `emp.empId` to `${emp.empId}-${emp.rateTier}-${index}` for unique keys
  - Added `bg-amber-500/5` background for premium tier rows
  - Premium split rows: Nationality, Name, Trade, EMP ID cells show "—" (em-dash) with dimmed opacity
  - Premium split rows: Deduction and Advance columns show "—" in non-edit mode
  - Premium split rows: Edit mode hides input fields for identity columns (pointer-events-none + opacity-40)
  - Added "Basic" badge next to RT/HR for standard entries: emerald theme (bg-emerald-500/20 text-emerald-400 border-emerald-500/30)
  - Added "Premium" badge next to RT/HR for premium entries: amber theme (bg-amber-500/20 text-amber-400 border-amber-500/30)
  - Both entries share the same SL.NO (from API)
- Total section automatically sums across ALL entries including split ones (works correctly since employees array now includes both entries)
- All lint checks pass cleanly

Stage Summary:
- Frontend fully supports basic/premium rate tier split entries
- Visual distinction: premium rows have amber-tinted background, identity cells dimmed with "—"
- Rate tier badges displayed next to RT/HR column
- Index-based change tracking ensures split entries can be edited independently
- handleSave sends rateTier with each salary record to backend

---
Task ID: 15
Agent: Main Agent
Task: Implement cascade soft-delete for employee deletion - ensure all related data is soft-deleted when employee is deleted

Work Log:
- Analyzed all Employee relations in Prisma schema: Attendance, Warning, Fine, LeaveRequest, CancellationRequest, UniformRegistry, EmpCountSitePerMonth, SalaryRecord, TotalEmployeeWorkingHours
- Added `isDeleted Boolean @default(false)` field to TotalEmployeeWorkingHours model (was missing soft-delete support)
- Added `@@index([isDeleted])` to TotalEmployeeWorkingHours for query performance
- Updated DELETE handler in /api/employees/[id]/route.ts to cascade soft-delete to ALL 9 related tables:
  1. UniformRegistry: isDeleted = true
  2. Attendance: isHidden = true
  3. Warning: isHidden = true
  4. Fine: isHidden = true
  5. LeaveRequest: isHidden = true
  6. CancellationRequest: isHidden = true
  7. TotalEmployeeWorkingHours: isDeleted = true (NEW)
  8. SalaryRecord: isDeleted = true (NEW)
  9. EmpCountSitePerMonth: deletedDate = now (NEW)
- Updated delete-request approval handler (/api/delete-requests/[id]/route.ts) with same cascade logic
- Previously only UniformRegistry was soft-deleted on approval; now all 9 tables are handled
- Removed incorrect Notification hiding from employee DELETE handler (Notification relates to User, not Employee)
- Updated all TotalEmployeeWorkingHours queries across 4 API files to filter isDeleted: false:
  - /api/accounts/working-hours/route.ts: 9 edits (findMany, findFirst, findUnique, upsert)
  - /api/accounts/salary/route.ts: 4 edits (findMany, upsert)
  - /api/accounts/route.ts: 1 edit (findMany)
  - /api/accounts/employee-monthly/route.ts: 4 edits (findMany, upsert)
- For upsert operations: added isDeleted: false to update data (restores soft-deleted records on re-upsert)
- For findUnique: added post-query isDeleted check to return 404 for soft-deleted records
- Pushed schema changes with `bun run db:push`
- All lint checks pass
- Pushed to GitHub (commit 6198c0b)

Stage Summary:
- Complete cascade soft-delete: when an employee is deleted, ALL related data across 9 tables is soft-deleted
- Both direct DELETE and delete-request approval workflows handle all related data
- TotalEmployeeWorkingHours now has isDeleted field with proper query filtering
- No data is permanently removed - all soft-deleted records can be recovered
- Code pushed to GitHub: https://github.com/hypernova-coder/asm-project.git (main branch)
