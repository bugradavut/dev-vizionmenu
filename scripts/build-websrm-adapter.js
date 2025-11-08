#!/usr/bin/env node
/**
 * Build WebSRM Adapter: Compile TypeScript to JavaScript
 *
 * Purpose: Transpile WebSRM adapter TypeScript files to CommonJS
 * for production use in Node.js API server
 *
 * Why: TypeScript can't be required() at runtime without tsx/ts-node
 * Solution: Pre-compile to JavaScript for reliable production deployment
 */

const { buildSync } = require('esbuild');
const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '../apps/api/services/websrm-adapter');
const outDir = path.join(__dirname, '../apps/api/api/services/websrm-compiled');

console.log('🔨 Building WebSRM Adapter...');
console.log('📂 Source:', srcDir);
console.log('📂 Output:', outDir);

// Ensure output directory exists
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

// Get all TypeScript files
const tsFiles = fs.readdirSync(srcDir)
  .filter(file => file.endsWith('.ts'))
  .map(file => path.join(srcDir, file));

console.log(`📝 Found ${tsFiles.length} TypeScript files`);

try {
  // Build all files with bundling (to include @vizionmenu/websrm-core)
  buildSync({
    entryPoints: tsFiles,
    bundle: true,
    platform: 'node',
    target: 'node18',
    format: 'cjs',
    outdir: outDir,
    sourcemap: false,
    minify: false,
    keepNames: true,
    logLevel: 'info',
    external: [
      // Node.js built-ins
      'crypto',
      'path',
      'fs',
      'url',
      'https',
      'http',
      // External dependencies (not bundled)
      '@supabase/supabase-js',
      'p-limit',
      'qrcode',
    ],
    // Resolve workspace package alias
    alias: {
      '@vizionmenu/websrm-core': path.join(__dirname, '../packages/websrm-core/dist/index.js'),
    },
  });

  console.log('✅ Build complete!');
  console.log('📦 Compiled files in:', outDir);

  // List generated files
  const jsFiles = fs.readdirSync(outDir).filter(f => f.endsWith('.js'));
  console.log(`✨ Generated ${jsFiles.length} JavaScript files:`);
  jsFiles.forEach(file => console.log(`   - ${file}`));

} catch (error) {
  console.error('❌ Build failed:', error);
  process.exit(1);
}
