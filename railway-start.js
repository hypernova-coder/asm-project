const { execSync } = require('child_process');

console.log('=== ASM Railway Startup ===');

// Step 1: Push database schema
console.log('Pushing database schema...');
try {
  execSync('npx prisma db push --accept-data-loss', { stdio: 'inherit' });
} catch (e) {
  console.error('Warning: prisma db push failed, continuing...', e.message);
}

// Step 2: Generate Prisma client
console.log('Generating Prisma client...');
try {
  execSync('npx prisma generate', { stdio: 'inherit' });
} catch (e) {
  console.error('Warning: prisma generate failed, continuing...', e.message);
}

// Step 3: Start the Next.js standalone server
console.log('Starting Next.js server...');
require('./.next/standalone/server.js');
