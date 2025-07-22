const fs = require('fs');
const path = require('path');

console.log('🚀 Preparing Vercel serverless function...');

// Ensure api directory exists (it should already)
const apiDir = path.join(__dirname, 'api');
if (fs.existsSync(path.join(apiDir, 'index.js'))) {
  console.log('✅ Serverless function ready at /api/index.js');
} else {
  console.error('❌ Serverless function not found!');
  process.exit(1);
}

console.log('✅ Build completed! Vercel serverless function is ready.');
console.log('🌐 Endpoints will be available at:');
console.log('   - /');
console.log('   - /health');
console.log('   - /api/v1/health');
console.log('   - /test');