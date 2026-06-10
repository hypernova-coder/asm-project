# ASM Project Worklog

---
Task ID: 1
Agent: Main Agent
Task: Fix employee ID update bug and package.json version fix

Work Log:
- Diagnosed employee ID update bug: the frontend `handleSubmit` function was converting empty strings to `null` which could interfere with `employeeId` if the value was accidentally empty
- Fixed by explicitly setting `employeeId: formData.employeeId?.trim() || null` in the payload and excluding `employeeId` from the empty-string-to-null conversion
- Fixed `@radix-ui/react-aspect-ratio` version from `^1.1.7` (doesn't exist) to `^1.2.0` in package.json

Stage Summary:
- Employee ID update fix applied to `/home/z/my-project/src/components/employees/employee-page.tsx`
- Package.json version fix applied

---
Task ID: 2
Agent: Subagent (full-stack-developer)
Task: Rewrite Accounts Page - Remove site selection, show all sites as dropdown, Excel-sheet format with specific columns

Work Log:
- Completely rewrote `/home/z/my-project/src/components/accounts/accounts-page.tsx`
- Removed the SiteFilter component and selectedSiteId state
- Changed data source from per-site `/api/salary-records` to consolidated `/api/accounts?month=YYYY-MM&year=YYYY`
- Implemented collapsible site sections with color-coded headers (8 rotating color schemes)
- Added required columns: SL No., Name, Emp Code, Trade, Total Hrs, Rate 2.5/3 (cyan-tinted), Rate 5/5.5 (amber-tinted), Salary (DHS), Advance, Deduction, Total Salary, Status
- Implemented merge logic for standard + premium rateTier entries into single rows per employee
- Added Excel-like edit mode with inline editing for totalHours, lowRateHours, highRateHours, advance, deduction, empName, employeeCode, trade
- Save via `/api/accounts/salary/bulk-save`, toggle paid via `/api/accounts/salary/toggle-paid`
- Added summary cards at top and grand totals card at bottom
- Added cross-site employee search with highlighting

Stage Summary:
- Complete accounts page rewrite with new column format and Excel-like editing
- File: `/home/z/my-project/src/components/accounts/accounts-page.tsx` (1434 lines)

---
Task ID: 3
Agent: Subagent (full-stack-developer)
Task: Rewrite Consolidated Salary Sheet with same fields as accounts page

Work Log:
- Completely rewrote `/home/z/my-project/src/components/accounts/consolidated-salary-sheet.tsx`
- New column format matching accounts page: SL No., Name, Emp Code, Trade, Total Hrs, Rate 2.5/3 HRS, Rate 5/5.5 HRS, Salary (DHS), Advance, Deduction, Total Salary, Status
- Removed old columns: NATIONALITY, BASE AMT, PREMIUM AMT, GROSS TOTAL, CUSTOM RATE, BALANCE
- Implemented divisor-based salary formula via `computeSalary()` function
- Added merged entries (standard + premium rateTier combined into single rows)
- Added Excel-like edit mode with inline editing
- Color-coded columns: Cyan for Rate 2.5/3, Amber for Rate 5/5.5, Emerald for Salary
- Added per-site totals row and grand totals bar
- Added role badges (TL, SUP, CR) and search highlighting

Stage Summary:
- Complete consolidated salary sheet rewrite with matching column format
- File: `/home/z/my-project/src/components/accounts/consolidated-salary-sheet.tsx` (1301 lines)

---
Task ID: 4
Agent: Subagent (full-stack-developer)
Task: Make Employee Hours Directory and Ledger fully editable (Excel-like)

Work Log:
- Updated `/home/z/my-project/src/components/employees/employee-hours-directory.tsx`
  - Added prominent "Edit Directory" button with emerald styling
  - All fields become editable in edit mode: Employee ID, Full Name, Current Site, Trade, Custom Rate, Cumulative Hours, Hours Threshold
  - Change tracking with highlighted rows for modified entries
  - Edit mode banner showing number of pending changes
  - Save via PUT /api/employees/{id} for each changed row
  - Cancel reverts to original data
  - Excel-like grid lines with compact row padding

- Updated `/home/z/my-project/src/components/employees/employee-hours-ledger.tsx`
  - Enhanced edit mode with prominent "Edit Ledger" button
  - All fields editable: Total Hours, Rate/Hr, Custom Rate
  - Change tracking with `changedMonths` Set
  - Changed rows highlighted with emerald background
  - Edit mode banner with amber styling
  - Excel-like grid lines between all cells
  - Real-time Est. Salary computed from editable values
  - Cancel reverts to original data

Stage Summary:
- Both employee hours components updated with Excel-like editing
- Directory: 854 lines, Ledger: 1016 lines
- Files: employee-hours-directory.tsx, employee-hours-ledger.tsx

---
Task ID: 6
Agent: Subagent (full-stack-developer)
Task: Update Consolidated Salary Sheet — Direct Rates, Same Columns as Accounts

Work Log:
- Updated constants: removed `DIVISOR_STANDARD_BELOW`, `DIVISOR_STANDARD_ABOVE`, `DIVISOR_TL_BELOW`, `DIVISOR_TL_ABOVE`; replaced with `RATE_STANDARD_BELOW=2.5`, `RATE_STANDARD_ABOVE=5.0`, `RATE_TL_BELOW=3.0`, `RATE_TL_ABOVE=5.5`
- Replaced `computeGrossSalary` function: changed from divisor-based formula `(belowHours * RATE_BELOW) / divisor` to direct rates formula `belowHours * lowRate + aboveHours * highRate` (PRD v2.0)
- Updated page header subtitle from "Divisor-based formula" to "Direct rate formula"
- Updated Gross Salary metric card subtitle from "Divisor-based" to "Direct rates"
- Replaced expanded employee details table columns to match accounts page:
  - Old: #, Employee ID, Name, Site, Role, Below Threshold Hrs, Above Threshold Hrs, Total Hrs, Below Salary, Above Salary, Gross Salary, Deduction, Advance, Balance, Status (15 cols)
  - New: #, Emp Code, Name, Trade, Total Hrs, Rate 2.5/3.0, Rate 5.0/5.5, Salary (DHS), Advance, Deduction, Total Salary, Status (12 cols)
- Removed columns: Site, Role (as separate column), Below Salary, Above Salary, Gross Salary, Balance
- Added columns: Trade, Total Salary (= Salary - Deduction - Advance)
- Renamed: Employee ID → Emp Code, Below Threshold Hrs → Rate 2.5/3.0, Above Threshold Hrs → Rate 5.0/5.5, Gross Salary → Salary (DHS)
- Updated site employee totals row: changed colSpan from 5 to 4, reordered data cells to match new column layout
- Updated formula reference at bottom from divisor syntax to direct rate syntax:
  - Standard: `(below_hrs x 2.5)/1.0 + (above_hrs x 5.0)/1.0` → `below_hrs × 2.5 + above_hrs × 5.0`
  - TL/Supervisor: `(below_hrs x 2.5)/3.0 + (above_hrs x 5.0)/5.5` → `below_hrs × 3.0 + above_hrs × 5.5`
- Kept all existing features: CR badge, RoleBadge (TL/SUP), dark theme styling, search, expand/collapse, metric cards, month/year selector, refresh button
- Lint check passed with no errors

Stage Summary:
- Consolidated salary sheet updated to use direct hourly rates (PRD v2.0)
- Columns now match accounts page format (12 columns)
- File: `/home/z/my-project/src/components/consolidated-salary/consolidated-salary-page.tsx`

---
Task ID: 7
Agent: Main Agent
Task: Update Employee Hours Directory — Show Effective Rate and Cumulative Hours with Direct Rates (PRD v2.0)

Work Log:
- Updated API route `/api/employees/hours-summary/route.ts`:
  - Replaced divisor-based rate calculation (`5.0 / highDivisor`, `2.5 / lowDivisor`) with direct rate lookup
  - New rate table: Standard (2.5 below / 5.0 above), TL/Supervisor (3.0 below / 5.5 above), Custom (overrides both)
  - Updated `effectiveRate` and `rateLabel` to return direct rates (e.g., "3.0", "5.5") instead of divisor results ("0.83", "0.91")
  - Updated server-side filter: replaced `0.83`/`0.91` filter values with `3.0`/`5.5`

- Updated frontend `/home/z/my-project/src/components/employees/employee-hours-directory.tsx`:
  - Added `getEffectiveRate()` helper that computes direct rate from employee role and threshold status
  - Updated `RateBadge` to display direct rates (2.5, 3.0, 5.0, 5.5) with correct color coding:
    - emerald for below-threshold rates (2.5/3.0)
    - amber for above-threshold rates (5.0/5.5)
    - violet for custom rates
  - Custom rate badge now shows "Custom (value)" for clarity
  - Renamed "Rate" column header to "Effective Rate"
  - Updated rate filter dropdown options from 0.83/0.91 to 3.0/5.5 with descriptive labels:
    - "2.5 (Std Below)", "3.0 (TL Below)", "5.0 (Std Above)", "5.5 (TL Above)", "Custom"
  - Enhanced threshold status column with:
    - Clear "< 1000h" / "≥ 1000h" badges with swapped colors (below = emerald, above = amber to match rate badge colors)
    - Progress bar showing percentage toward threshold
    - Percentage text below progress bar
  - Maintained all existing features: edit directory mode, click-through to employee hours ledger, search, sorting

Stage Summary:
- Switched from divisor-based salary formulas to direct hourly rates (PRD v2.0)
- API: direct rates 2.5/3.0 (below threshold), 5.0/5.5 (above threshold)
- Frontend: Effective Rate column with color-coded badges, progress bar toward threshold, updated filters
- Lint: passed with no errors
- Files: `/home/z/my-project/src/app/api/employees/hours-summary/route.ts`, `/home/z/my-project/src/components/employees/employee-hours-directory.tsx`

---
Task ID: 4
Agent: Subagent (full-stack-developer)
Task: Update Accounts Page — Replace divisor-based rates with direct hourly rates (PRD v2.0)

Work Log:
- Updated `mergeApiEntries` function in `/home/z/my-project/src/components/accounts/accounts-page.tsx`:
  - Moved `customHourlyRate`, `previousCumulativeHours`, `hoursThreshold`, `isCustomRate` extraction BEFORE rate calculation
  - Updated rate computation: `lowRate = customHourlyRate ?? (hasBonus ? 3.0 : 2.5)` and `highRate = customHourlyRate ?? (hasBonus ? 5.5 : 5.0)` — direct rates with custom override
  - Updated merged push: `lowRate: customHourlyRate ?? standardEntry?.salaryRecord?.rtPerHour ?? lowRate` and `highRate: customHourlyRate ?? premiumEntry?.salaryRecord?.rtPerHour ?? highRate` — ensures custom rate overrides both tiers

- Updated column headers:
  - `Rate 2.5/3` → `Rate 2.5/3.0` (explicit decimal for direct rate)
  - `Rate 5/5.5` → `Rate 5.0/5.5` (explicit decimal for direct rate)

- Updated table comments:
  - `{/* Rate 2.5/3 - Low Rate Hours */}` → `{/* Rate 2.5/3.0 - Low Rate Hours */}`
  - `{/* Rate 5/5.5 - High Rate Hours */}` → `{/* Rate 5.0/5.5 - High Rate Hours */}`

- Updated `tradeDisplay` function:
  - Added `/CR` suffix for custom rate employees (before `/SUPV` and `/TL`)

- Verified salary calculations:
  - `handleCellChange` uses `u.lowRateHours * u.lowRate + u.highRateHours * u.highRate` — direct rate multiplication, NO divisors
  - No divisor calculations (like dividing by 3.0 or 5.5) found anywhere in the file
  - All existing functionality preserved: edit mode, save, soft delete, search, expand/collapse, paid/unpaid toggle

- Lint: passed with no errors

Stage Summary:
- Accounts page updated to use direct hourly rates per PRD v2.0
- Rate table: Standard (2.5/5.0), TL/Supervisor (3.0/5.5), Custom (overrides both)
- Column headers now explicitly show direct rates with decimal notation
- Custom rate employees properly override both lowRate and highRate
- File: `/home/z/my-project/src/components/accounts/accounts-page.tsx`

---
Task ID: 5
Agent: Subagent (full-stack-developer)
Task: Update Employee Hours Ledger — Use WorkLog API and Direct Rates (PRD v2.0)

Work Log:
- Completely rewrote `/home/z/my-project/src/components/employees/employee-hours-ledger.tsx`
- Replaced data source from `/api/accounts/employee-monthly` to the new WorkLog API:
  - GET `/api/employees/[id]/worklogs?year=YYYY` for fetching monthly data
  - PUT `/api/employees/[id]/worklogs` for saving edits with `{ entries: [...], force }` payload
- Updated TypeScript types:
  - New `WorkLogEntry` interface matching the WorkLog API response (monthKey, hoursWorked, cumulativeBefore, cumulativeAfter, lowRate, highRate, belowHours, aboveHours, belowSalary, aboveSalary, totalSalary, blendedRate, isPaid, etc.)
  - New `EmployeeInfo` interface with lowRate, highRate, isCustom, currentTier fields
  - Simplified `EditableRow` — only `totalHours` is editable now (rates computed server-side)
- Updated rate display to use DIRECT rates:
  - Rate badges show 2.5, 3.0, 5.0, 5.5 (NOT divisor-based 0.8333, 0.9091)
  - `getDirectRate()` helper determines the primary rate to display per row
  - Custom rate shows the custom value directly
- Updated rate color helper:
  - Removed divisor-based comparison logic (`Math.abs(rtPerHour - 2.5 / 3.0) < 0.01`)
  - Uses direct rate comparison: 2.5 or 3.0 = emerald (below threshold), 5.0 or 5.5 = green (above threshold), custom = violet
- Updated table columns:
  - Month
  - Total Hours (editable)
  - Cumulative Hrs
  - Rate/Hr (direct rate: 2.5, 3.0, 5.0, 5.5, or custom)
  - Below Threshold Hrs
  - Above Threshold Hrs
  - Est. Salary (below*lowRate + above*highRate, computed server-side)
- Added paid-month warning:
  - AlertDialog component for confirmation when editing months with `isPaid: true`
  - If confirmed, sends `force: true` in the request body
  - Handles API 409 response with `isPaidWarning` flag
- Updated save/edit logic:
  - Only `totalHours` is editable in edit mode (rates and salary computed server-side)
  - Save sends entries array to PUT `/api/employees/[id]/worklogs`
  - API triggers automatic recalculation from the edited month onward
  - After save, refreshes data to show updated cumulative values
- Built a 12-month grid (`monthlyGrid`) for the selected year, filling in missing months with placeholder rows
- Added "Paid" badge next to month names for months that have `isPaid: true`
- Updated summary cards: Rate card shows "lowRate / highRate" for non-custom, and custom value for custom
- Header now shows rate as "2.5 / 5.0 AED/hr" for standard role, "3.0 / 5.5 AED/hr" for TL/Sup, or custom rate
- Yearly total row now includes Below/Above threshold hour totals
- Kept existing features: Edit/Save toggle, custom rate input, milestone progress gauge, year selector
- Lint: passed with no errors

Stage Summary:
- Complete ledger rewrite to use WorkLog API and direct rates per PRD v2.0
- File: `/home/z/my-project/src/components/employees/employee-hours-ledger.tsx` (~710 lines)
- Data source: WorkLog API instead of employee-monthly
- Rates: Direct (2.5/3.0/5.0/5.5) instead of divisor-based
- Save: PUT /api/employees/[id]/worklogs with auto-recalculation
- Paid-month warning dialog added
- New table columns: Below Threshold Hrs, Above Threshold Hrs
