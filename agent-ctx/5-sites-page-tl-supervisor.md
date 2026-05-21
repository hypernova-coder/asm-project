# Task 5 - Sites Page Team Leader & Supervisor Assignment

## Summary
Updated the Sites page (`src/components/sites/sites-page.tsx`) to support Team Leader and Supervisor assignment, display, and management within the site employee view.

## Changes Made

### Interface Updates
- `SiteEmployee`: Added `isSupervisor`, `supervisorSiteId`, `trade` fields
- `AllEmployee`: Added `trade` field

### New Imports
- `ShieldCheck`, `MoreHorizontal` from lucide-react
- AlertDialog components from shadcn/ui
- DropdownMenu components from shadcn/ui

### Header Display
- Both Team Leader (Crown/amber) and Supervisor (ShieldCheck/violet) shown in site header
- Uses `currentTeamLeader` and `currentSupervisor` useMemo values

### Employee Table
- Supervisor badge (violet) alongside Team Leader badge (amber)
- Subtle row tinting: amber bg for TL, violet for Supervisor
- New "Actions" column with dropdown menu per row
- Dropdown: "Assign as Team Leader" / "Assign as Supervisor" options (hidden if already assigned)
- "Position" column renamed to "Trade", displays `emp.trade || emp.position || '—'`

### Confirmation Dialogs
- AlertDialog for Team Leader replacement (shows existing TL name)
- AlertDialog for Supervisor replacement (shows existing Supervisor name)
- Both with Cancel/Replace actions

### API Integration
- `handleAssignTeamLeader`: sends `isTeamLeader: true, teamLeaderSiteId: siteId`, handles 409 conflict
- `handleAssignSupervisor`: sends `isSupervisor: true, supervisorSiteId: siteId`, handles 409 conflict
- `handleConfirmReplaceTL`: sends `forceReplaceTeamLeader: true`
- `handleConfirmReplaceSupervisor`: sends `forceReplaceSupervisor: true`

### Remove Employee Fix
- Now also clears `isSupervisor: false, supervisorSiteId: null` when removing a Supervisor from site

### Sort Order
- Team Leaders first, then Supervisors, then rest

## Verification
- ESLint: no errors
