# Task 4: SiteSalarySheet Fix — Work Record

## Summary
Updated the `SiteSalarySheet` component in `/home/z/my-project/src/components/accounts/accounts-page.tsx` to fix the deletion bug, add split columns, and use the bulk-save API.

## Changes Made

### 1. Added `MergedEmployeeRow` interface (after existing types, before constants)
- New interface with fields: `empId`, `empName`, `nationality`, `trade`, `employeeCode`, `isTeamLeader`, `isSupervisor`, `slNo`, `totalHours`, `lowRateHours`, `highRateHours`, `lowRate`, `highRate`, `totalSalary`, `deduction`, `advance`, `balanceSalary`, `isPaid`, `standardRecordId`, `premiumRecordId`, `rateTier`
- The `rateTier` is now `'standard' | 'premium' | 'split'` (added 'split')

### 2. Added `mergeSplitEntries()` helper function
- Groups `EmployeeSalaryData[]` by `empId`
- Merges standard and premium entries for the same employee into a single `MergedEmployeeRow`
- Computes `lowRateHours`, `highRateHours`, `lowRate`, `highRate`, `totalSalary`, `balanceSalary`

### 3. Rewrote `SiteSalarySheet` component
- Uses `MergedEmployeeRow[]` state instead of `EmployeeSalaryData[]`
- Initializes via `mergeSplitEntries(site.employees)` 
- Syncs on `site.employees` changes
- `handleCellChange` recalculates split allocation (lowRateHours/highRateHours) and totals
- `handleSave` uses bulk-save API (`/api/accounts/salary/bulk-save`) with `runAllocation: true`
- Table columns: SL.NO | NATIONALITY | NAME | TRADE | EMP ID | TOTAL HOUR | **2.5/3 HRS** | **5/5.5 HRS** | TOTAL SALARY | DEDUCTION | ADVANCE | BALANCE SALARY | PAID | (delete)
- Input fields upgraded from `h-7 text-xs` to `h-8 text-sm` with `min-w-[80px]`
- Split columns (2.5/3 HRS, 5/5.5 HRS) are read-only with `bg-slate-800/40` background
- Delete row: removes from local state; on save, missing salaryRecordIds won't be in the payload
- Add row: creates a `MergedEmployeeRow` with `rateTier: 'standard'` and temp empId

## No other components were modified
- `ManageWorkingHoursPage`, `EmployeeDetailPage`, `AddEmployeeDialog`, `AddNewSitesDialog`, `AccountsPage` all remain unchanged

## Lint & Build
- `bun run lint` passes with no errors
- Dev server running successfully
