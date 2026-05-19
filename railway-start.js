const { execSync, spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('=== ASM Railway Startup ===');

// Step 0: Switch to PostgreSQL provider for Railway
console.log('Switching Prisma to PostgreSQL provider...');
try {
  execSync('node scripts/switch-db.js postgresql', { stdio: 'inherit' });
  console.log('Successfully switched to PostgreSQL provider');
} catch (e) {
  console.error('ERROR: switch-db failed:', e.message);
  // Continue - schema may already be set to postgresql
}

// Step 1: Push database schema - THIS IS CRITICAL, MUST SUCCEED
console.log('Pushing database schema to PostgreSQL...');
try {
  execSync('npx prisma db push --accept-data-loss', { stdio: 'inherit', timeout: 60000 });
  console.log('Successfully pushed database schema');
} catch (e) {
  console.error('ERROR: prisma db push failed:', e.message);
  console.error('This means the database tables may not exist. The app will likely have errors.');
  // Don't exit - try to continue, the tables might already exist from a previous deploy
}

// Step 2: Generate Prisma client
console.log('Generating Prisma client...');
try {
  execSync('npx prisma generate', { stdio: 'inherit' });
  console.log('Successfully generated Prisma client');
} catch (e) {
  console.error('ERROR: prisma generate failed:', e.message);
  // Continue - client may already be generated from build
}

// Step 3: Start the Next.js server
const port = process.env.PORT || 3000;

// Check if standalone build exists
const standalonePath = path.join(__dirname, '.next', 'standalone', 'server.js');
if (fs.existsSync(standalonePath)) {
  console.log(`Starting Next.js standalone server on port ${port}...`);

  // Set HOSTNAME to 0.0.0.0 so it listens on all interfaces (required for Railway)
  process.env.HOSTNAME = '0.0.0.0';
  process.env.PORT = port;

  // Spawn the standalone server as a child process
  const server = spawn('node', [standalonePath], {
    stdio: 'inherit',
    env: { ...process.env },
    cwd: path.join(__dirname, '.next', 'standalone')
  });

  server.on('error', (err) => {
    console.error('Failed to start server:', err);
    process.exit(1);
  });

  server.on('exit', (code) => {
    console.log(`Server exited with code ${code}`);
    process.exit(code || 0);
  });
} else {
  console.log('Standalone build not found, falling back to npx next start...');
  try {
    execSync(`npx next start -p ${port}`, { stdio: 'inherit' });
  } catch (e) {
    console.error('Failed to start Next.js server:', e.message);
    process.exit(1);
  }
}
