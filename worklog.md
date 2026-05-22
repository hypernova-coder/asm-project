# ASM Workforce Management — Worklog

---
Task ID: 1
Agent: Main Agent
Task: Implement cross-site monthly hour allocation engine with cumulative threshold

Work Log:
- Read and analyzed the entire codebase: allocation-engine.ts, bulk-save/route.ts, accounts/route.ts, accounts-page.tsx, consolidated-salary-sheet.tsx
- Identified key gap: allocation engine only used current-month hours for split, not cumulative across all months
- Identified deletion bug root cause: bulk-save was soft-deleting split records before allocation engine could recalculate
- Identified accounts page save handler bug: sending totalHours as standard record + highRateHours as premium record, causing double-counting when allocation engine sums rawHours
- Identified accounts GET endpoint bug: using aggregate hours (currentMonthHours) instead of per-site hours for new entries

Stage Summary:
- Upgraded allocation engine (allocation-engine.ts) to use cumulative threshold from previous months
  - Now computes previousCumulative from TotalEmployeeWorkingHours for all months before current
  - consumedThreshold starts at min(previousCumulative, threshold) before walking sites
  - Added computeAllocationSplit() utility function for previewing splits without DB writes
  - Added previousCumulative and currentMonthTotal to EmployeeAllocation output
- Fixed bulk-save API to not soft-delete records when runAllocation=true
  - When allocation engine runs, it is the single source of truth for record lifecycle
  - Soft-delete step only runs when runAllocation=false (manual mode)
  - Returns ALL non-deleted records for affected employees after allocation
- Fixed accounts GET endpoint split algorithm
  - Uses cumulative threshold (previousAggregate) instead of per-month aggregate
  - For entries with existing salary records: uses them directly (preserves user edits)
  - For new entries without salary records: defaults to 0 hours at basic rate
  - Tracks consumedThreshold correctly across sites with existing records
- Fixed accounts page save handler
  - Now sends totalHours (full site total) as standard record, not lowRateHours
  - Sends existing premium record with 0 hours (allocation engine will handle it)
  - Allocation engine recalculates the split correctly
- Fixed consolidated salary sheet save handler (same approach)
  - Sends totalHours as standard record
  - Only sends premium record if one already exists (with 0 hours)
- Fixed consolidated salary sheet table alignment
  - Changed from table-fixed to auto layout with min-width constraints
  - Added whitespace-nowrap to prevent header wrapping
  - Increased min-widths for better column proportions
- Fixed input field sizes in consolidated salary sheet
  - Reduced input height from h-8 to h-7 for compact look
  - Changed text-sm to text-xs for inputs
  - Added px-1.5 padding for better content fit
  - Removed min-w-[80px] constraints that caused overflow issues
