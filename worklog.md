---
Task ID: 1
Agent: Main
Task: Fix super admin menu permissions API & attendance sheet text sizes, push to GitHub

Work Log:
- Investigated the "Only superadmins can manage menu permissions" error
- Root cause: Stale `.next` cache causing Prisma Client to return incorrect data
- Cleared `.next` directory and regenerated Prisma Client with `npx prisma generate`
- Added debug logging to `/api/admin-menu-permissions` PUT route (console.log for requesterId, lookup result, access denied)
- Added `requesterRole` field to frontend request body for additional verification context
- Added client-side validation for `user?.id` before making API calls (shows helpful toast if missing)
- Tested API through Caddy gateway - confirmed 200 OK with correct response
- Fixed attendance sheet text sizes:
  - Subsequent pages heading: changed from 15px to 14px (viewport)
  - Extra employees table headers: added text-[13px] to match main table headers
  - Verified PDF/print CSS already correct: table 12px, th 13px, main heading 16px/14px
- Ran ESLint - no errors
- Committed and pushed to GitHub (commit 9fd74ca)

Stage Summary:
- Super admin menu permissions now working correctly after cache clear
- Attendance sheet text sizes standardized: 12px table contents, 13px headers, 16px first page heading, 14px subsequent pages heading
- Code pushed to GitHub: https://github.com/JYOTHILALREJI/ASM.git

---
Task ID: 2
Agent: Main
Task: Make Employee ID field editable (auto-generate only when left empty)

Work Log:
- Changed `openAddDialog` to set `employeeId: ''` instead of `employeeId: generateAutoId()` so the field starts empty
- Updated Employee ID label to include hint: "(Leave empty to auto-generate)"
- Updated Employee ID input placeholder to "Leave empty to auto-generate (e.g. ASM-2025-001)"
- Updated backend `/api/employees/route.ts` to handle empty/whitespace-only employeeId strings: `(body.employeeId && body.employeeId.trim()) || (await generateEmployeeId())`
- Ran ESLint — no errors

Stage Summary:
- Employee ID field is now editable: users can type a custom ID or leave it empty for auto-generation
- Backend properly handles empty string, whitespace-only, null, and undefined values for employeeId

---
Task ID: 3
Agent: Main
Task: Fix Admin Menu Permissions System, Add Profile Page with Password Update, Add Logout Confirmation Dialog

Work Log:

### Task 1: Fix Admin Menu Permissions System (CRITICAL BUG)
- Added `AdminMenuPermission` model to Prisma schema with `userId`, `menuKey`, `allowed` fields and unique compound index on `userId_menuKey`
- Fixed Prisma datasource provider from `postgresql` to `sqlite` to match the actual database
- Ran `db:push` to sync schema changes and regenerated Prisma Client
- Created `/api/menu-permissions/route.ts` with GET (fetch permissions for a user), POST (upsert a permission), and DELETE (remove all permissions for a user) endpoints
- Updated `admin-page.tsx`:
  - Added "Manage Access" button (KeyRound icon) for each regular admin row
  - Added permissions dialog with Switch toggles for 6 configurable menus: employees, sites, attendance, leave_requests, cancellation_requests, notifications
  - Dashboard and Uniform Registry shown as always visible (not configurable)
  - Access column now shows dynamic permission badges fetched from API instead of hardcoded "Dashboard, Uniform Registry"
  - Added `adminAccessMap` state that maps admin IDs to their allowed menu labels
  - Toggles save immediately via API and refresh the access display
  - Updated create admin dialog description to mention configurable access after creation
- Updated `app-sidebar.tsx`:
  - Added `adminPermissions` state fetched from `/api/menu-permissions` API for admin users
  - Changed `filteredNavItems` logic: items without `roles` prop are always visible, items with `roles: ['super_admin']` are visible to admins only if `adminPermissions.includes(item.id)`
  - Permissions refresh every 30 seconds
- Updated `page.tsx`:
  - Removed hardcoded `ADMIN_ALLOWED_VIEWS` and `SUPER_ADMIN_ONLY_VIEWS` constants
  - Removed hardcoded `isViewAllowedForRole` function
  - Added dynamic `adminPermissions` state fetched from `/api/menu-permissions` API for admin users
  - New `isViewAllowed` function: super_admin sees everything, admin sees always-visible views (dashboard, uniform_registry, profile) + explicitly permitted restricted views
  - Permissions refresh every 30 seconds
  - Added `profile` case to renderView switch statement

### Task 2: Add Profile Page with Password Update
- Added `'profile'` to `AppView` type union in `app-store.ts`
- Created `/components/auth/profile-page.tsx`:
  - Shows user avatar, name, email, and role badge
  - Password change form with current password, new password, and confirm password fields
  - Show/hide password toggle buttons for each field
  - Client-side validation: all fields required, new password min 6 chars, confirm must match
  - Calls `/api/user/password` PUT endpoint
  - Success toast and form reset on completion
- Created `/api/user/password/route.ts`:
  - PUT endpoint validates all fields, checks new password length
  - Verifies current password with `comparePassword` from auth lib
  - Hashes and saves new password
  - Returns success/error responses
- Updated `app-header.tsx`:
  - Profile dropdown item now navigates to profile view via `useAppStore.getState().setCurrentView('profile')`
  - Added 'Profile' to `viewTitles` map
- Updated `page.tsx` renderView with `profile` case rendering `<ProfilePage />`

### Task 3: Add Logout Confirmation Dialog
- Updated `app-header.tsx`:
  - Replaced direct `logout()` call with `handleLogoutClick()` that opens an AlertDialog
  - AlertDialog shows "Are you sure you want to log out?" with Cancel and Log out buttons
  - Only calls `logout()` when user confirms
  - Uses shadcn/ui AlertDialog component matching dark theme
- Updated `app-sidebar.tsx`:
  - Replaced direct `logout()` call with `handleLogout()` that opens an AlertDialog
  - Same confirmation dialog as header with Cancel and Log out buttons
  - Only calls `logout()` and `onNavigate()` when user confirms

### Verification
- Ran `bun run lint` — no errors
- Tested `/api/menu-permissions` GET endpoint — returns 200 with correct data
- Tested `/api/menu-permissions` POST endpoint — correctly rejects super_admin, works for admin users

Stage Summary:
- Admin menu permissions are now fully dynamic: super_admin can toggle menu access per admin via "Manage Access" button
- Sidebar and main layout respect dynamic permissions fetched from API
- Profile page with password change functionality added
- Logout now requires confirmation via AlertDialog on both header and sidebar

---
Task ID: 4
Agent: Main
Task: Update Dashboard Page - Add Idle Workers Card, Team Leaders/Supervisors Pills, and API Enhancements

Work Log:

### Dashboard Page Updates (`src/components/dashboard/dashboard-page.tsx`)
- Added `UserX`, `ArrowRight`, `Crown`, `ShieldCheck` icon imports from lucide-react
- Added `useAppStore` import from `@/store/app-store` for navigation
- Added new state variables: `idleCount`, `teamLeaderCount`, `supervisorCount`
- Added `setCurrentView` from `useAppStore` for programmatic navigation
- Updated `fetchEmployees` to extract `idleCount`, `teamLeaderCount`, `supervisorCount` from API response
- Added "Idle Workers" as 5th metric card:
  - Amber/yellow theme (text-amber-400, bg-amber-500/10) matching absent card style
  - UserX icon
  - Subtitle shows percentage of total workforce that's idle (e.g., "12.5% of workforce")
  - Clickable card with cursor-pointer and hover:border-amber-500/40 effect
  - "View All →" indicator with ArrowRight icon in the value area
  - On click: sets `localStorage.setItem('asm_idle_filter', '1')` and navigates to employees view
- Changed metrics grid from `lg:grid-cols-4` to `lg:grid-cols-5` (keeps `sm:grid-cols-2`)
- Added Team Leaders & Supervisors stat pills between header and metrics cards:
  - Team Leaders pill: amber theme with Crown icon, count badge
  - Supervisors pill: emerald theme with ShieldCheck icon, count badge
  - Both show "..." while loading

### API Enhancements (`src/app/api/employees/route.ts`)
- Added `teamLeaderCount` and `supervisorCount` to the GET response data
- Uses `Promise.all` for parallel counting of team leaders and supervisors
- Both counts filter out deleted employees

### Verification
- Ran `bun run lint` — no errors

Stage Summary:
- Dashboard now shows 5 metric cards including clickable "Idle Workers" card
- Idle Workers card navigates to employees page with idle filter via localStorage
- Team Leaders and Supervisors count pills displayed on dashboard
- Employees API returns teamLeaderCount and supervisorCount alongside idleCount

---
Task ID: 5
Agent: Main
Task: Update Employee Page - Trade System & Advanced Filters

Work Log:

### 1. Renamed Position → Trade Throughout UI
- Changed all UI labels from "Position" to "Trade" across the employee page:
  - Desktop table column header: "Position" → "Trade"
  - Mobile card label: "Position" → "Trade"
  - Search placeholder: "position" → "trade"
  - Form tab label: "Professional" → "Work"
  - Form field label: "Position" → "Trade"
  - Details dialog: "Position" → "Trade"
- Kept the `position` field in the Employee interface and formData for backward compatibility
- When submitting forms, both `trade` and `position` are sent with the same value for backward compat
- Display logic uses `emp.trade || emp.position` to show trade, falling back to position for legacy data

### 2. Added SearchableTradeSelect Component
- Created `SearchableTradeSelect` component (modeled after existing `SearchableNationalitySelect`)
- Includes 20 common trades: Mason, Electrician, Welder, Carpenter, Helper, Plumber, HVAC Technician, Steel Fixer, Painter, Crane Operator, Rigger, Scaffolder, Foreman, Driver, Mechanic, Laborer, Cleaner, Security Guard, Surveyor, Heavy Equipment Operator
- Searchable dropdown with text input
- Allows custom trade entry (like nationality custom entry)
- Shows Briefcase icon for each option
- Placed in the "Work" tab of the employee form (replaced the plain text input)

### 3. Added Advanced Filter System
- Added filter state variables: `tradeFilter`, `idleFilter`, `teamLeaderFilter`, `supervisorFilter`, `siteFilter`
- Added `trades` state populated from API response `trades` array
- Added `activeFilterCount` computed value for tracking active filters
- Pass filter params to API as query params: `trade`, `idle`, `teamLeaders`, `supervisors`, `site`
- Added filter UI components:
  - Trade dropdown (populated from distinct trades in DB)
  - Site dropdown (populated from sites list)
  - Idle Workers toggle button (amber theme)
  - Team Leaders toggle button (amber theme)
  - Supervisors toggle button (violet theme)
  - Active filter chips below the search bar (removable by clicking)
  - "Clear All Filters" button when any filters are active
- Updated `resetFilters` to clear all new filter states
- Updated `hasFilters` to include all new filter states
- Updated `fetchEmployees` useCallback dependencies to include new filter states
- Added page reset effect for all new filter states

### 4. Added Supervisor Badges
- Desktop table: Added Supervisor badge next to Team Leader badge using ShieldCheck icon with violet/purple color scheme
- Mobile cards: Same Supervisor badge
- Details dialog header: Added Supervisor badge next to Team Leader badge
- Added "Supervises: {site name}" sub-text under employee name in table (similar to "Leads: {site name}" for team leaders)
- Added Supervisor section in details dialog with violet-themed card

### 5. Auto-activate Idle Filter from Dashboard
- Added useEffect on component mount that checks `localStorage.getItem('asm_idle_filter')`
- If '1', sets `idleFilter` to true and clears the localStorage item
- This enables navigation from the dashboard idle workers card

### 6. Updated Employee Interface & formData
- Added to Employee interface: `trade: string | null`, `isSupervisor: boolean`, `supervisorSiteId: string | null`
- Added to formData state: `trade: ''`, `isSupervisor: false`, `supervisorSiteId: ''`
- Updated `openEditDialog` to populate `trade` from `employee.trade || employee.position`
- Updated `openEditDialog` to populate `isSupervisor` and `supervisorSiteId`
- Added Supervisor section in the Work tab of the form with Switch toggle and site selector
- Updated `handleSubmit` to send `trade`, `position` (both with same value), `isSupervisor`, `supervisorSiteId`
- Updated empty-string cleanup to preserve `isSupervisor` boolean

### New Imports
- Added `ShieldCheck` from lucide-react (for Supervisor badge)
- Added `Filter` from lucide-react (for filter chips section)
- Added `UserX` from lucide-react (for Idle Workers button)

### Verification
- Ran `bun run lint` — no errors

Stage Summary:
- All "Position" UI labels changed to "Trade" throughout the employee page
- SearchableTradeSelect dropdown with 20 common trades + custom entry
- Advanced filter system with Trade, Site, Idle Workers, Team Leaders, and Supervisors filters
- Removable filter chips and "Clear All Filters" button
- Supervisor badge with ShieldCheck icon and violet/purple color scheme in table, cards, and details
- Auto-activation of idle filter from dashboard via localStorage
- Employee interface and formData updated with trade, isSupervisor, supervisorSiteId fields
- Backward compatibility maintained (position field still sent alongside trade)

---
Task ID: 6
Agent: Main
Task: Update Sites Page - Team Leader & Supervisor Assignment

Work Log:

### 1. Updated Interfaces
- Added `isSupervisor: boolean`, `supervisorSiteId: string | null`, `trade: string | null` to `SiteEmployee` interface
- Added `trade: string | null` to `AllEmployee` interface

### 2. Updated Imports
- Added `ShieldCheck`, `MoreHorizontal` from lucide-react
- Added `AlertDialog`, `AlertDialogAction`, `AlertDialogCancel`, `AlertDialogContent`, `AlertDialogDescription`, `AlertDialogFooter`, `AlertDialogHeader`, `AlertDialogTitle` from `@/components/ui/alert-dialog`
- Added `DropdownMenu`, `DropdownMenuContent`, `DropdownMenuItem`, `DropdownMenuLabel`, `DropdownMenuSeparator`, `DropdownMenuTrigger` from `@/components/ui/dropdown-menu`

### 3. Supervisor Display in Header
- Refactored the header area to show both Team Leader and Supervisor info using `currentTeamLeader` and `currentSupervisor` useMemo values
- Team Leader shown with Crown icon (amber), Supervisor shown with ShieldCheck icon (violet)
- Falls back to created date only when neither is assigned

### 4. Employee Table Badges
- Added Supervisor badge (violet/purple ShieldCheck icon) next to existing Team Leader badge (amber Crown icon)
- Added subtle row background tinting: amber for TL rows, violet for Supervisor rows
- Both badges show inline next to employee name

### 5. Actions Dropdown per Row
- Added a "MoreHorizontal" (⋮) dropdown button to each employee row
- Dropdown contains "Assign Role" section with:
  - "Assign as Team Leader" option (amber, Crown icon) - hidden if already TL
  - "Assign as Supervisor" option (violet, ShieldCheck icon) - hidden if already Supervisor
- Added "Actions" column header to table

### 6. Confirmation AlertDialogs for Replacement
- Added `replaceTLDialog` state and `replaceSupervisorDialog` state with `open`, `emp`, and `existingTL`/`existingSupervisor` fields
- When assigning TL/Supervisor, if API returns 409 (conflict), opens AlertDialog:
  - "Replace Team Leader?" / "Replace Supervisor?" title
  - Shows existing person name and new person name
  - Cancel and Replace buttons
- If confirmed, calls API with `forceReplaceTeamLeader: true` or `forceReplaceSupervisor: true`

### 7. API Integration
- `handleAssignTeamLeader`: calls PUT `/api/employees/[id]` with `isTeamLeader: true, teamLeaderSiteId: viewSite.id`
- `handleAssignSupervisor`: calls PUT `/api/employees/[id]` with `isSupervisor: true, supervisorSiteId: viewSite.id`
- Both handle 409 conflict by opening confirmation dialog
- `handleConfirmReplaceTL`: calls with `forceReplaceTeamLeader: true`
- `handleConfirmReplaceSupervisor`: calls with `forceReplaceSupervisor: true`

### 8. Remove Employee - Clear Supervisor Flags
- Updated `handleRemoveEmployees` to also clear `isSupervisor: false, supervisorSiteId: null` when removing a Supervisor from site (in addition to existing TL flag clearing)

### 9. Position → Trade Rename
- Changed table column header from "Position" to "Trade"
- Changed cell display from `emp.position || '—'` to `emp.trade || emp.position || '—'`
- Updated AddEmployeeCombobox search to also search by `trade`
- Updated combobox subtitle to show `emp.trade ? · trade : emp.position ? · position : ''`

### 10. Sort Order Update
- Updated `filteredEmployees` sort: Team Leaders first, then Supervisors, then rest

### Verification
- Ran `bun run lint` — no errors
