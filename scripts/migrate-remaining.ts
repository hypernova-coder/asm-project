import { db } from '../src/lib/db';

const SQLITE3 = '/home/z/.local/sqlite3-extract/usr/bin/sqlite3';
const DB_PATH = '/home/z/my-project/db/custom.db';
const { execSync } = require('child_process');

function sqliteQuery(sql: string): any[] {
  const result = execSync(`${SQLITE3} "${DB_PATH}" -json "${sql}"`, { encoding: 'utf-8' });
  if (!result.trim()) return [];
  return JSON.parse(result);
}

async function migrate() {
  // UniformRegistry
  const uniforms = sqliteQuery('SELECT * FROM UniformRegistry');
  console.log(`Found ${uniforms.length} uniform records`);
  for (const u of uniforms) {
    try {
      await db.uniformRegistry.upsert({
        where: { id: u.id },
        update: {},
        create: {
          id: u.id,
          uniformId: Number(u.uniformId),
          tokenNumber: Number(u.tokenNumber),
          employeeName: u.employeeName,
          employeeId: u.employeeId,
          documentType: u.documentType,
          documentNumber: u.documentNumber,
          items: u.items,
          siteName: u.siteName || null,
          teamLeaderName: u.teamLeaderName || null,
          isRenewal: u.isRenewal === 1 || u.isRenewal === true,
          previousTokenId: u.previousTokenId || null,
          isDeleted: u.isDeleted === 1 || u.isDeleted === true,
          isHidden: u.isHidden === 1 || u.isHidden === true,
          createdAt: new Date(Number(u.createdAt)),
          renewalDate: new Date(Number(u.renewalDate)),
        },
      });
      console.log(`  ✓ Uniform: ${u.employeeName} token#${u.tokenNumber}`);
    } catch (e: any) {
      console.error(`  ✗ Uniform: ${e.message}`);
    }
  }

  // TotalEmployeeWorkingHours
  const hours = sqliteQuery('SELECT * FROM TotalEmployeeWorkingHours');
  console.log(`\nFound ${hours.length} working hours records`);
  for (const h of hours) {
    try {
      await db.totalEmployeeWorkingHours.upsert({
        where: { id: h.id },
        update: {},
        create: {
          id: h.id,
          empId: h.empId,
          empName: h.empName,
          month: h.month,
          totalWorkingHours: Number(h.totalWorkingHours) || 0,
          rtPerHour: Number(h.rtPerHour) || 2.5,
          isCustom: h.isCustom === 1 || h.isCustom === true,
          isDeleted: h.isDeleted === 1 || h.isDeleted === true,
          createdAt: new Date(Number(h.createdAt)),
          updatedAt: new Date(Number(h.updatedAt)),
        },
      });
      console.log(`  ✓ WorkingHours: ${h.empName} - ${h.month}`);
    } catch (e: any) {
      console.error(`  ✗ WorkingHours: ${e.message}`);
    }
  }

  // EmpCountSitePerMonth
  const empCounts = sqliteQuery('SELECT * FROM EmpCountSitePerMonth');
  console.log(`\nFound ${empCounts.length} emp count records`);
  for (const ec of empCounts) {
    try {
      await db.empCountSitePerMonth.upsert({
        where: { id: ec.id },
        update: {},
        create: {
          id: ec.id,
          empId: ec.empId,
          empName: ec.empName,
          siteId: ec.siteId,
          siteName: ec.siteName,
          month: ec.month,
          createdDate: new Date(Number(ec.createdDate)),
          removedDate: ec.removedDate ? new Date(Number(ec.removedDate)) : null,
          updatedDate: new Date(Number(ec.updatedDate)),
          deletedDate: ec.deletedDate ? new Date(Number(ec.deletedDate)) : null,
        },
      });
      console.log(`  ✓ EmpCount: ${ec.empName} - ${ec.siteName} - ${ec.month}`);
    } catch (e: any) {
      console.error(`  ✗ EmpCount: ${e.message}`);
    }
  }

  // SiteMonthActivation
  const activations = sqliteQuery('SELECT * FROM SiteMonthActivation');
  console.log(`\nFound ${activations.length} site activation records`);
  for (const a of activations) {
    try {
      await db.siteMonthActivation.upsert({
        where: { id: a.id },
        update: {},
        create: {
          id: a.id,
          siteId: a.siteId,
          month: a.month,
          year: Number(a.year),
          createdAt: new Date(Number(a.createdAt)),
        },
      });
      console.log(`  ✓ Activation: ${a.siteId} - ${a.month}`);
    } catch (e: any) {
      console.error(`  ✗ Activation: ${e.message}`);
    }
  }

  console.log('\n✅ Remaining tables migrated!');
}

migrate()
  .catch((e) => { console.error('Migration failed:', e); process.exit(1); })
  .finally(async () => { await db.$disconnect(); });
