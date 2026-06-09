# Task: Create AccountsPage Component

## Status: COMPLETED

## What was done:
Created `/home/z/my-project/src/components/accounts/accounts-page.tsx` (1124 lines)

## Component Structure:

### Exports:
- `AccountsPage` - Main component exported as named export

### Sub-components:
1. **ManageWorkingHoursPage** - Full page sub-view for managing employee working hours
2. **SiteSalarySheet** - Excel-style salary sheet for each site

### Features Implemented:

1. **Header**: Title "Accounts Management" with site count, Grand Total badge (AED), and "Manage Employee Hours" button

2. **Year Selector**: shadcn Select dropdown with current year and 5 years back

3. **Month Row**: 12 buttons (JAN-DEC) in a single row, active month has emerald background

4. **Sites List**: Expandable accordion-style cards (NOT modals) with:
   - Collapsed view: site name, employee count, total hours, total salary, chevron icon
   - Expanded view: Full salary sheet with Excel-style editable cells

5. **Salary Sheet** per site:
   - Title row with site name (bold, centered)
   - "TIMESHEET FOR THE MONTH OF {MONTH} {YEAR}" subtitle
   - Table with columns: SL.NO, NATIONALITY, NAME, TRADE, EMP ID, TOTAL HOUR, RT/HR, TOTAL SALARY, DEDUCTION, ADVANCE, BALANCE SALARY, PAID, delete
   - Trade display: "{TRADE}/TL" for team leaders, "{TRADE}/SUPERVISOR" for supervisors
   - Auto-calculation: TOTAL SALARY = TOTAL HOUR × RT/HR, BALANCE SALARY = TOTAL SALARY - DEDUCTION - ADVANCE
   - PAID toggle button (green when paid)
   - Footer row with totals
   - Add Row, Delete Last Row, Save buttons

6. **Manage Employee Hours** sub-view:
   - Back button to return to main accounts page
   - Search filter
   - Table with: Name, EMP ID, Trade, Nationality, Total Working Hours (editable), RT/HR (editable when custom), Custom Rate toggle (Switch)
   - Auto-calculation rules shown: 2.5 basic, 5.0 after 1000 hrs, +0.5 for team leaders
   - Save All button

### API Integration:
- `GET /api/accounts?month=YYYY-MM&year=YYYY` - Fetch sites and employee data
- `GET /api/accounts/working-hours` - Fetch all working hours records
- `POST /api/accounts/salary` - Create new salary record
- `PUT /api/accounts/salary` - Update existing salary record
- `PUT /api/accounts/working-hours` - Update working hours

### Styling:
- Dark theme (slate-900 backgrounds, slate-800 cards)
- Emerald accent colors for active states and positive values
- Amber for warnings/custom rates
- Responsive design with flex-wrap for month buttons
- Editable cells as small Input fields (h-7, text-xs)

### Lint: PASSED (clean, no errors)
