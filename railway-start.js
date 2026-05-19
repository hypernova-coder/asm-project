const { execSync, spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

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
