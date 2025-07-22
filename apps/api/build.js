const { exec } = require('child_process');
const path = require('path');

// Find TypeScript compiler in node_modules
const tscPath = path.join(__dirname, 'node_modules', '.bin', 'tsc');
const fallbackTscPath = path.join(__dirname, '..', '..', 'node_modules', '.bin', 'tsc');

console.log('🔨 Starting TypeScript compilation...');

// Try local tsc first, then root tsc
const command = `"${tscPath}" -p tsconfig.json || "${fallbackTscPath}" -p tsconfig.json || npx tsc -p tsconfig.json`;

exec(command, (error, stdout, stderr) => {
  if (error) {
    console.error('❌ Build failed:', error.message);
    process.exit(1);
  }
  
  if (stderr) {
    console.warn('⚠️ Warnings:', stderr);
  }
  
  if (stdout) {
    console.log(stdout);
  }
  
  console.log('✅ TypeScript compilation completed successfully!');
});