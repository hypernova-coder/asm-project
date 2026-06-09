import { db } from '../src/lib/db';
import { encrypt } from '../src/lib/crypto';

// Simple SQLite reader using Node.js built-in approach
// We'll use the sqlite3 CLI tool to export data as JSON

const SQLITE3 = '/home/z/.local/sqlite3-extract/usr/bin/sqlite3';
const DB_PATH = '/home/z/my-project/db/custom.db';

const { execSync } = require('child_process');

function sqliteQuery(sql: string): any[] {
  const result = execSync(`${SQLITE3} "${DB_PATH}" -json "${sql}"`, { encoding: 'utf-8' });
  if (!result.trim()) return [];
  return JSON.parse(result);
}

async function migrate() {
  console.log('Starting SQLite to PostgreSQL migration...\n');

  // 1. Migrate Users
  const users = sqliteQuery('SELECT * FROM User');
  console.log(`Found ${users.length} users to migrate`);
  for (const u of users) {
    try {
      await db.user.upsert({
        where: { id: u.id },
        update: {},
        create: {
          id: u.id,
          email: u.email,
          name: u.name,
          password: u.password,
          role: u.role,
          theme: u.theme || 'dark',
          createdAt: new Date(Number(u.createdAt)),
          updatedAt: new Date(Number(u.updatedAt)),
        },
      });
      console.log(`  ✓ User: ${u.email}`);
    } catch (e: any) {
      console.error(`  ✗ User ${u.email}: ${e.message}`);
    }
  }

  // 2. Migrate Sites
  const sites = sqliteQuery('SELECT * FROM Site');
  console.log(`\nFound ${sites.length} sites to migrate`);
  for (const s of sites) {
    try {
      await db.site.upsert({
        where: { id: s.id },
        update: {},
        create: {
          id: s.id,
          name: s.name,
          clientName: s.clientName || null,
          projectName: s.projectName || null,
          isActive: s.isActive === 1 || s.isActive === true,
          createdAt: new Date(Number(s.createdAt)),
        },
      });
      console.log(`  ✓ Site: ${s.name}`);
    } catch (e: any) {
      console.error(`  ✗ Site ${s.name}: ${e.message}`);
    }
  }

  // 3. Migrate Employees
  const employees = sqliteQuery('SELECT * FROM Employee');
  console.log(`\nFound ${employees.length} employees to migrate`);
  for (const e of employees) {
    try {
      await db.employee.upsert({
        where: { id: e.id },
        update: {},
        create: {
          id: e.id,
          fullName: e.fullName,
          employeeId: e.employeeId,
          nationality: e.nationality || null,
          dateOfBirth: e.dateOfBirth ? new Date(Number(e.dateOfBirth)) : null,
          phone: e.phone || null,
          email: e.email || null,
          address: e.address || null,
          emergencyContact: e.emergencyContact || null,
          position: e.position || null,
          trade: e.trade || null,
          joinDate: e.joinDate ? new Date(Number(e.joinDate)) : null,
          companyName: e.companyName || null,
          passportNumber: e.passportNumber || null,
          passportStatus: e.passportStatus || null,
          idNumber: e.idNumber || null,
          idStatus: e.idStatus || null,
          currentSite: e.currentSite || null,
          rating: Number(e.rating) || 0,
          status: e.status || 'active',
          photo: e.photo || null,
          isTeamLeader: e.isTeamLeader === 1 || e.isTeamLeader === true,
          teamLeaderSiteId: e.teamLeaderSiteId || null,
          isSupervisor: e.isSupervisor === 1 || e.isSupervisor === true,
          supervisorSiteId: e.supervisorSiteId || null,
          hoursThreshold: Number(e.hoursThreshold) || 1000,
          createdAt: new Date(Number(e.createdAt)),
          updatedAt: new Date(Number(e.updatedAt)),
        },
      });
      console.log(`  ✓ Employee: ${e.fullName} (${e.employeeId})`);
    } catch (err: any) {
      console.error(`  ✗ Employee ${e.fullName}: ${err.message}`);
    }
  }

  // 4. Migrate Permissions
  const permissions = sqliteQuery('SELECT * FROM Permission');
  console.log(`\nFound ${permissions.length} permissions to migrate`);
  for (const p of permissions) {
    try {
      await db.permission.upsert({
        where: { id: p.id },
        update: {},
        create: {
          id: p.id,
          name: p.name,
          slug: p.slug,
          group: p.group || 'general',
          createdAt: new Date(Number(p.createdAt)),
          updatedAt: new Date(Number(p.updatedAt)),
        },
      });
      console.log(`  ✓ Permission: ${p.name}`);
    } catch (e: any) {
      console.error(`  ✗ Permission ${p.name}: ${e.message}`);
    }
  }

  // 5. Migrate AdminPermissions
  const adminPerms = sqliteQuery('SELECT * FROM AdminPermission');
  console.log(`\nFound ${adminPerms.length} admin permissions to migrate`);
  for (const ap of adminPerms) {
    try {
      await db.adminPermission.upsert({
        where: { id: ap.id },
        update: {},
        create: {
          id: ap.id,
          adminId: ap.adminId,
          permissionId: ap.permissionId,
          createdAt: new Date(Number(ap.createdAt)),
        },
      });
      console.log(`  ✓ AdminPermission: ${ap.id}`);
    } catch (e: any) {
      console.error(`  ✗ AdminPermission: ${e.message}`);
    }
  }

  // 6. Migrate AdminMenuPermissions
  const menuPerms = sqliteQuery('SELECT * FROM AdminMenuPermission');
  console.log(`\nFound ${menuPerms.length} menu permissions to migrate`);
  for (const mp of menuPerms) {
    try {
      await db.adminMenuPermission.upsert({
        where: { id: mp.id },
        update: {},
        create: {
          id: mp.id,
          userId: mp.userId,
          menuKey: mp.menuKey,
          allowed: mp.allowed === 1 || mp.allowed === true,
          createdAt: new Date(Number(mp.createdAt)),
          updatedAt: new Date(Number(mp.updatedAt)),
        },
      });
      console.log(`  ✓ MenuPermission: ${mp.menuKey}`);
    } catch (e: any) {
      console.error(`  ✗ MenuPermission: ${e.message}`);
    }
  }

  // 7. Migrate SalaryRecords
  const salaryRecords = sqliteQuery('SELECT * FROM SalaryRecord');
  console.log(`\nFound ${salaryRecords.length} salary records to migrate`);
  for (const sr of salaryRecords) {
    try {
      await db.salaryRecord.upsert({
        where: { id: sr.id },
        update: {},
        create: {
          id: sr.id,
          empId: sr.empId,
          empName: sr.empName,
          siteId: sr.siteId,
          siteName: sr.siteName,
          month: sr.month,
          year: Number(sr.year),
          nationality: sr.nationality || '',
          trade: sr.trade || '',
          employeeCode: sr.employeeCode || '',
          slNo: Number(sr.slNo) || 0,
          totalHours: Number(sr.totalHours) || 0,
          rtPerHour: Number(sr.rtPerHour) || 2.5,
          totalSalary: Number(sr.totalSalary) || 0,
          deduction: Number(sr.deduction) || 0,
          advance: Number(sr.advance) || 0,
          balanceSalary: Number(sr.balanceSalary) || 0,
          isPaid: sr.isPaid === 1 || sr.isPaid === true,
          isDeleted: sr.isDeleted === 1 || sr.isDeleted === true,
          rateTier: sr.rateTier || 'standard',
          createdAt: new Date(Number(sr.createdAt)),
          updatedAt: new Date(Number(sr.updatedAt)),
        },
      });
      console.log(`  ✓ SalaryRecord: ${sr.empName} - ${sr.month}`);
    } catch (e: any) {
      console.error(`  ✗ SalaryRecord: ${e.message}`);
    }
  }

  // 8. Migrate other tables...
  const tables = [
    'Attendance', 'Notification', 'Warning', 'Fine',
    'LeaveRequest', 'CancellationRequest', 'UniformRegistry',
    'TotalEmployeeWorkingHours', 'EmpCountSitePerMonth', 'SiteMonthActivation'
  ];
  
  for (const table of tables) {
    const rows = sqliteQuery(`SELECT * FROM ${table}`);
    console.log(`\nFound ${rows.length} ${table} records to migrate`);
    if (rows.length > 0) {
      console.log(`  (Skipping ${table} - handle manually if needed)`);
    }
  }

  console.log('\n✅ Migration completed!');
}

migrate()
  .catch((e) => {
    console.error('Migration failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
