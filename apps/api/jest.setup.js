/**
 * Jest Setup - Phase 5.5 Security
 *
 * CRITICAL: Database write protection for Phase 5.5
 * - NO real database access allowed during migration testing
 * - Only offline testing with pg-mem
 * - Prevents accidental writes to production/staging databases
 */

// Security Check: Block all real database access during Phase 5.5
if (process.env.DB_WRITE_BLOCK === 'true') {
  console.log('🔒 [SECURITY] Database write protection is ACTIVE');
  console.log('   Phase 5.5: Offline migration testing only (pg-mem)');
  console.log('   Real database access is BLOCKED\n');

  // Block supabase-js imports (fail fast if accidentally imported)
  const originalRequire = require('module').prototype.require;
  require('module').prototype.require = function (id) {
    if (id === '@supabase/supabase-js' || id.includes('supabase')) {
      throw new Error(
        '[DB_WRITE_BLOCK] Supabase imports are blocked in Phase 5.5.\n' +
        'Use pg-mem for offline migration testing only.\n' +
        'Remove DB_WRITE_BLOCK=true to enable real database access.'
      );
    }
    return originalRequire.apply(this, arguments);
  };
}

// Set test timeout
jest.setTimeout(10000);
