# Task 2 - Fix Split Rate Row Deletion Bug & Add Bulk-Save Endpoint

## Agent: Backend Engineer
## Task ID: 2

## Summary

Fixed the bug where the second salary record (split rate row) gets deleted on save by creating a new bulk-save endpoint and refactoring the allocation engine into a shared module.

## Problem
When editing the consolidated salary sheet or site-wise salary sheet, if an employee has 2 salary record entries (split rate rows: 2.5/3 standard AND 5/5.5 premium), the second row gets deleted on save. Only the first row survives.

## Root Cause
The current save logic sends each row individually via PUT/POST to `/api/accounts/salary`. The POST handler returns a 409 error when a record already exists for the same unique key, and the frontend doesn't handle this properly for the second row.

## Files Created

### 1. `/src/lib/allocation-engine.ts`
- Extracted the allocation logic from `/api/accounts/allocate/route.ts` into a reusable function
- Exports `allocateEmployeeHours(month, year)` which:
  - Fetches all non-deleted salary records for the given month+year
  - Groups by employee and applies sequential allocation
  - Creates/updates/soft-deletes salary records (standard & premium tiers)
  - Updates TotalEmployeeWorkingHours for each processed employee
  - Returns structured allocation results
- Exports TypeScript interfaces: `SiteAllocation`, `EmployeeAllocation`, `AllocationResult`

### 2. `/src/app/api/accounts/salary/bulk-save/route.ts`
- New POST endpoint: `/api/accounts/salary/bulk-save`
- Accepts an array of salary records and saves them atomically
- For each record:
  - If `salaryRecordId` provided → update by id
  - If no id → check unique key (empId+siteId+month+year+rateTier):
    - Exists & soft-deleted → restore and update
    - Exists & not deleted → update
    - Not exists → create new
- After saving all records:
  - Soft-deletes salary records for the same employee+site+month+year that are NOT in the submitted list
  - If `runAllocation` is true (default), calls the allocation engine to recalculate splits
  - If `runAllocation` is false, manually updates TotalEmployeeWorkingHours
- Returns saved records, soft-delete count, and allocation results

## Files Modified

### 1. `/src/app/api/accounts/allocate/route.ts`
- Refactored to use the shared `allocateEmployeeHours()` function from `@/lib/allocation-engine`
- Now only handles input validation and delegates to the shared function
- Much simpler and avoids code duplication

## How It Fixes the Bug

The bulk-save endpoint fixes the split row deletion bug by:
1. **Atomic saves**: All rows are saved in one request, so there's no race condition between individual PUT/POST calls
2. **No 409 errors**: Instead of returning a 409 when a record already exists, the bulk-save handler updates it
3. **Soft-deleted record restoration**: If a soft-deleted record exists for the same unique key, it's restored rather than failing
4. **Allocation engine integration**: After saving, the allocation engine recalculates splits, ensuring both standard and premium rows are correctly maintained
5. **Orphan cleanup**: Any salary records for the same employee+site+month that aren't in the submitted list are soft-deleted, preventing stale data

## Verification
- `bun run lint` passes with no errors
- Dev server is running without issues
