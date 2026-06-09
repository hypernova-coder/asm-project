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

---
Task ID: 2
Agent: Main Agent
Task: Switch database from SQLite to PostgreSQL and fix data display/creation issues

Work Log:
- Installed PostgreSQL 17 via apt-get download + dpkg-deb extract (no root access available)
- Initialized PostgreSQL data directory at /home/z/.local/pgdata with auth=trust
- Configured PostgreSQL on port 5432 with unix socket at /home/z/.local/pgdata
- Created database "myproject" in PostgreSQL
- Changed Prisma schema provider from "sqlite" to "postgresql"
- Updated .env DATABASE_URL to postgres://z@localhost:5432/myproject
- Pushed schema to PostgreSQL with `prisma db push`
- Regenerated Prisma Client for PostgreSQL
- Migrated all data from old SQLite database (custom.db) to PostgreSQL using custom migration scripts
  - 1 User (admin@asm.com)
  - 2 Sites (NPC - SHARJAH, NPC - Umm Al Quain)
  - 3 Employees (Jyothilal Reji, TEST 2, test employee)
  - 1 SalaryRecord, 2 UniformRegistry, 2 TotalEmployeeWorkingHours, 3 EmpCountSitePerMonth, 3 SiteMonthActivation
  - 10 Permissions (already seeded in PG), 1 AdminMenuPermission
- Created PostgreSQL startup script at scripts/start-pg.sh
- Updated .zscripts/dev.sh to start PostgreSQL and set DATABASE_URL before running Next.js
- Updated package.json scripts: removed SQLite-specific db:push:pg and build switch-db steps
- Updated railway-start.js to remove switch-db.js step (PostgreSQL is now default)
- Updated railway.toml build command to remove switch-db.js step
- Fixed stale Prisma Client issue causing "Unknown argument 'trade'" error by regenerating with PostgreSQL provider
- Verified employee GET API returns all 3 employees from PostgreSQL
- Verified employee POST (creation) works correctly with PostgreSQL including the `trade` field

Stage Summary:
- **Database switched**: From SQLite to PostgreSQL 17 (local instance at /home/z/.local/pgdata)
- **All data migrated**: Complete migration from SQLite to PostgreSQL preserving all records
- **Employee creation fixed**: The "Unknown argument 'trade'" error was caused by stale Prisma Client generated from SQLite schema
- **Dev workflow updated**: PostgreSQL auto-starts via scripts/start-pg.sh, DATABASE_URL set automatically
- **Deployment config updated**: railway.toml and railway-start.js no longer need switch-db.js
