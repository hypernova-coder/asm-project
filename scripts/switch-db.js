#!/usr/bin/env node
/**
 * Switch Prisma schema database provider between SQLite and PostgreSQL.
 * Usage:
 *   node scripts/switch-db.js postgresql  - Switch to PostgreSQL (for Railway deployment)
 *   node scripts/switch-db.js sqlite      - Switch to SQLite (for local development)
 */
const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, '..', 'prisma', 'schema.prisma');
const targetProvider = process.argv[2];

if (!targetProvider || !['sqlite', 'postgresql'].includes(targetProvider)) {
  console.error('Usage: node scripts/switch-db.js <sqlite|postgresql>');
  process.exit(1);
}

let schema = fs.readFileSync(schemaPath, 'utf-8');

// Replace the provider line
schema = schema.replace(
  /provider\s*=\s*"(sqlite|postgresql)"/,
  `provider = "${targetProvider}"`
);

fs.writeFileSync(schemaPath, schema);
console.log(`Switched Prisma provider to "${targetProvider}"`);
