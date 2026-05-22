# Task 3 - Consolidated Salary Sheet Rewrite

## Task Summary
Completely rewrote the consolidated salary sheet component at `/home/z/my-project/src/components/accounts/consolidated-salary-sheet.tsx`.

## Key Changes Made

### 1. New Data Model - MergedEmployeeRow
- Created `MergedEmployeeRow` interface that merges split rate entries into a single row per employee per site
- Includes: `totalHours` (editable), `lowRateHours` (read-only), `highRateHours` (read-only), `lowRate`, `highRate`, `totalSalary`, `deduction`, `advance`, `balanceSalary`, `isPaid`, `standardRecordId`, `premiumRecordId`, `rateTier`

### 2. Merging Logic
- Added `mergeApiEntries()` function that groups API entries by `empId` per site
- Merges standard and premium entries into a single row
- Correctly computes `totalHours = lowRateHours + highRateHours`
- Determines `rateTier` as 'split', 'standard', or 'premium'

### 3. New Table Columns
- SL | NATIONALITY | NAME | TRADE | EMP ID | TOTAL HRS | 2.5/3 HRS | 5/5.5 HRS | TOTAL SALARY | DEDUCT | ADVANCE | BALANCE | PAID | (delete in edit mode)
- TOTAL HRS: Editable in edit mode
- 2.5/3 HRS: Read-only (from allocation engine), slightly different background
- 5/5.5 HRS: Read-only (from allocation engine), amber-tinted background

### 4. Save Logic - Uses Bulk-Save API
- Now uses `POST /api/accounts/salary/bulk-save` with `runAllocation: true`
- For each merged row, creates separate standard and premium records
- Allocation engine recalculates splits after save
- Properly handles soft-deletion of removed records

### 5. UI Improvements
- Input fields are h-8 with text-sm (not h-7/text-xs)
- Hours and rate inputs have min-width of 80px
- Split columns have different background (bg-slate-800/30 for low rate, bg-amber-900/10 for high rate)
- Table uses `table-fixed` and `min-w-[1100px]`
- Premium hours rows have subtle amber tint
- Cancel edit properly reverts to original data via `originalSiteEmployees`

### 6. Bug Fixes
- Fixed deletion bug: Split rows are now merged into single rows, so deleting removes the entire employee entry
- Fixed alignment: Proper column widths with `table-fixed`
- Fixed save logic: Now uses bulk-save API with allocation engine

## Verification
- Lint passes cleanly (`bun run lint` - no errors)
- Dev server is running and responding to API calls
- Component is properly imported and used in the page
