---
Task ID: 1
Agent: Main Agent
Task: Fix employee update not working for employeeId and refactor accounts page

Work Log:
- Identified that `employeeId` was not in the `updatableFields` list in PUT `/api/employees/[id]/route.ts`
- Added `employeeId` to the updatable fields list
- Added validation to prevent empty employeeId values
- Added uniqueness check for employeeId updates (returns 409 if duplicate)
- Added cascade update to salary records' `employeeCode` field when employeeId changes
- Created new API endpoint `/api/accounts/sites-for-month` that returns sites with activity for a given month/year
- Refactored accounts page component:
  - Removed the initial site selection requirement (no more "Select a Site" prompt card)
  - Changed flow: Month/Year are the primary filters, sites are dynamically loaded based on selected month/year
  - Sites are fetched from `/api/accounts/sites-for-month` API which checks salary records, EmpCountSitePerMonth, and SiteMonthActivation
  - Sites displayed as clickable cards when no site is selected
  - Site dropdown filter in header shows only sites with activity for the selected month/year
  - When a site is selected, employees for that site+month/year combo are displayed in the salary records table

Stage Summary:
- Employee ID update fix: `employeeId` is now in updatable fields with validation and cascade update
- New API: `/api/accounts/sites-for-month` returns sites filtered by month/year
- Accounts page refactored: month/year primary, sites loaded dynamically, site cards for selection
