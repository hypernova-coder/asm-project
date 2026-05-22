# Task 2-3-4: Backend API changes for site employee history tracking

## Summary
Implemented three backend changes for EmpCountSitePerMonth tracking across sites and employees APIs.

## Changes Made

### 1. Sites API PUT handler (`/src/app/api/sites/route.ts`)
- Added cascade logic when site is deactivated (isActive: false from true)
- Transactional: finds all assigned employees, sets currentSite=null, clears TL/Supervisor roles, closes open EmpCountSitePerMonth records

### 2. Employee PUT API (`/src/app/api/employees/[id]/route.ts`)
- Added EmpCountSitePerMonth tracking when currentSite changes
- Case A: Adding to site → create new record; moving sites → also close old record
- Case B: Removing from site → close all open records

### 3. New site-history API (`/src/app/api/site-history/route.ts`)
- GET /api/site-history?siteId=xxx
- Returns EmpCountSitePerMonth records ordered by empName asc, createdDate asc
- Includes employee.employeeId relation
- Returns siteClosedDate (site.createdAt if inactive, null if active)

## Lint Status
All lint checks pass cleanly.
