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
