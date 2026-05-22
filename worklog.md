---
Task ID: 1
Agent: Main Agent
Task: Fix salary splitting bug - 250@5 instead of 150@2.5 + 100@5, make all fields editable, sync updates

Work Log:
- Analyzed the full data flow: allocation engine → accounts GET API → UI display
- Found root cause: allocation engine computed `previousCumulative` from TotalEmployeeWorkingHours which had stale/inconsistent data
- Fixed allocation engine to compute `previousCumulative` from salary records directly (source of truth)
- Fixed allocation engine step 4 to also use salary records for aggregate totals and fix previous months' TotalEmployeeWorkingHours
- Fixed accounts GET endpoint to ALWAYS recalculate the split from scratch instead of blindly using saved records
- Made low/high rate hours and rates EDITABLE in both site salary sheet and consolidated salary sheet
- Changed display format from "150 @ 2.5" to "150 × 2.5" (using × instead of @)
- Added `previousCumulativeHours` field to MergedEmployeeRow for proper client-side split calculation
- Updated save handlers to send proper standard and premium records with correct split data
- Added handlers for lowRateHours, highRateHours, lowRate, highRate changes in both UI components
- Updated allocation engine to preserve user-edited custom rates when recalculating splits

Stage Summary:
- **Root cause fixed**: `previousCumulative` now computed from salary records, not TotalEmployeeWorkingHours
- **Split always recalculated**: Accounts GET endpoint always recalculates split from cumulative data
- **All rate fields editable**: Both site salary sheet and consolidated salary sheet now have editable hours × rate inputs
- **Custom rates preserved**: Allocation engine preserves user-edited rates that differ from defaults
- **Display format updated**: Uses "×" instead of "@" for rate display (e.g., "150 × 2.5")
- **Bidirectional sync**: Save handlers send proper standard/premium records; allocation engine updates all related tables
