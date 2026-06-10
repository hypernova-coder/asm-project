---
Task ID: 1
Agent: main
Task: Pull latest code and implement all user requirements

Work Log:
- Pulled latest code from GitHub repo (f9f3864)
- Analyzed complete codebase: Prisma schema (15+ models), 48+ API routes, 12+ UI views
- Identified key issue: employees added to sites don't appear in accounts tab (no EmpCountSitePerMonth record created)
- Identified WorkLog sync gap: accounts page saves to SalaryRecord but not WorkLog, so ledger doesn't reflect changes

Stage Summary:
- Codebase fully analyzed and understood
- Key gaps identified for all 5 user requirements

---
Task ID: 2
Agent: main
Task: Backend - Employee-site sync, accounts visibility, WorkLog sync

Work Log:
- Updated Employee PUT API: When currentSite changes, creates/updates EmpCountSitePerMonth record for current month
- Updated Employee PUT API: Also creates WorkLog entry (0 hours) when employee assigned to site
- Updated Employee PUT API: Sets removedDate on EmpCountSitePerMonth when employee removed from site
- Updated Accounts API: Added currentSite-based employee inclusion (for current month)
- Updated Accounts API: Added same-day add/remove filtering (isSameDayAddRemove helper)
- Updated Bulk-save API: Added WorkLog sync after saving salary records
- Updated Bulk-save API: Added recalculation trigger for affected employees after save
- Added @@unique([empId, siteId, month]) constraint to EmpCountSitePerMonth in Prisma schema

Stage Summary:
- Employees added to sites now appear in accounts tab via EmpCountSitePerMonth records
- Same-day add/remove filtered out from accounts display
- WorkLog entries synced when saving from accounts page, keeping ledger in sync
- Recalculation triggered after bulk-save to keep all data consistent

---
Task ID: 3
Agent: main
Task: Frontend - Salary formula display (hours × rate = salary)

Work Log:
- Updated accounts-page.tsx: Salary cell now shows formula breakdown (e.g., "200.0 × 2.5 + 50.0 × 5.0 = 750.00")
- Updated consolidated-salary-page.tsx: Gross salary cell shows formula with rate tier details
- Updated employee-hours-ledger.tsx: Both edit mode and view mode salary cells show formula
- All three views support custom rates, split tiers, standard, and premium display

Stage Summary:
- All salary displays now show "hours × rate = salary" format
- Formula shows breakdown for split rate tiers (below + above)
- Custom rates displayed as single multiplication

---
Task ID: 4
Agent: main
Task: Push code to GitHub

Work Log:
- Committed all changes with descriptive message
- Pushed to origin/main (commit fb3e6e1)
- PostgreSQL schema verified and pushed
- Railway deployment will use its own DATABASE_URL

Stage Summary:
- All code pushed to GitHub successfully
- 7 files changed, 368 insertions, 16 deletions

---
Task ID: 5
Agent: main
Task: Fix save hours error from user screenshot

Work Log:
- Analyzed user screenshot showing accounts page with 2 employees (NPC-SHARJA site)
- Identified root cause: DATABASE_URL system env variable set to SQLite URL, overriding .env PostgreSQL URL
- Fixed start-pg.sh to export DATABASE_URL="postgresql://z@localhost:5432/myproject"
- Fixed package.json dev script to also export DATABASE_URL
- Found 4 critical bugs via code review subagent:
  1. savedRecords type missing totalHours/empName/siteName/rtPerHour - caused WorkLog sync to save 0 hours and TotalEmployeeWorkingHours creation to fail on null empName
  2. WorkLog sync used pre-allocation data (savedRecords) instead of post-allocation salary records
  3. Recalculation engine used proportional allocation (inconsistent with allocation engine's sequential allocation)
  4. String/number comparison bug in recalcEmployeeFull (comparing YYYY-MM string with number)
- All 4 bugs fixed in bulk-save/route.ts and recalculation.ts
- Tested bulk-save API locally - returns 200 with correct data
- Verified SalaryRecord, WorkLog, and TotalEmployeeWorkingHours all correctly created

Stage Summary:
- DATABASE_URL override issue fixed (start-pg.sh + package.json)
- 4 critical bugs fixed in save flow
- Save operation tested and verified working
- Lint check passes
