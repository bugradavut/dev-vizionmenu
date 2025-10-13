/**
 * WEB-SRM ESSAI Environment Checker
 *
 * Purpose: Validate all required ENV variables before running tests
 *
 * Usage:
 *   pnpm websrm:check-env
 */

console.log('🔍 WEB-SRM ESSAI Environment Validation\n');

interface EnvCheck {
  name: string;
  required: boolean;
  present: boolean;
  secure: boolean; // Should not be logged
  value?: string;
}

const checks: EnvCheck[] = [
  // Core WEB-SRM flags
  { name: 'WEBSRM_ENABLED', required: true, present: !!process.env.WEBSRM_ENABLED, secure: false, value: process.env.WEBSRM_ENABLED },
  { name: 'WEBSRM_NETWORK_ENABLED', required: true, present: !!process.env.WEBSRM_NETWORK_ENABLED, secure: false, value: process.env.WEBSRM_NETWORK_ENABLED },
  { name: 'WEBSRM_ENV', required: true, present: !!process.env.WEBSRM_ENV, secure: false, value: process.env.WEBSRM_ENV },
  { name: 'WEBSRM_DB_ALLOW_WRITE', required: true, present: !!process.env.WEBSRM_DB_ALLOW_WRITE, secure: false, value: process.env.WEBSRM_DB_ALLOW_WRITE },
  { name: 'NODE_ENV', required: true, present: !!process.env.NODE_ENV, secure: false, value: process.env.NODE_ENV },

  // ESSAI-specific
  { name: 'WEBSRM_CASESSAI', required: true, present: !!process.env.WEBSRM_CASESSAI, secure: false, value: process.env.WEBSRM_CASESSAI },

  // Encryption
  { name: 'WEBSRM_ENCRYPTION_KEY', required: true, present: !!process.env.WEBSRM_ENCRYPTION_KEY, secure: true },

  // ESSAI Credentials (encrypted)
  { name: 'WEBSRM_ESSAI_DEVICE_ID', required: true, present: !!process.env.WEBSRM_ESSAI_DEVICE_ID, secure: false, value: process.env.WEBSRM_ESSAI_DEVICE_ID },
  { name: 'WEBSRM_ESSAI_PARTNER_ID', required: true, present: !!process.env.WEBSRM_ESSAI_PARTNER_ID, secure: false, value: process.env.WEBSRM_ESSAI_PARTNER_ID },
  { name: 'WEBSRM_ESSAI_CERT_CODE', required: true, present: !!process.env.WEBSRM_ESSAI_CERT_CODE, secure: false, value: process.env.WEBSRM_ESSAI_CERT_CODE },
  { name: 'WEBSRM_ESSAI_PRIVATE_KEY_ENCRYPTED', required: true, present: !!process.env.WEBSRM_ESSAI_PRIVATE_KEY_ENCRYPTED, secure: true },
  { name: 'WEBSRM_ESSAI_CERT_ENCRYPTED', required: true, present: !!process.env.WEBSRM_ESSAI_CERT_ENCRYPTED, secure: true },

  // Supabase
  { name: 'SUPABASE_URL', required: true, present: !!process.env.SUPABASE_URL, secure: false, value: process.env.SUPABASE_URL },
  { name: 'SUPABASE_SERVICE_ROLE_KEY', required: true, present: !!process.env.SUPABASE_SERVICE_ROLE_KEY, secure: true },
];

// Print results
console.log('┌─────────────────────────────────────────┬──────────┬────────────────────────┐');
console.log('│ Variable                                │ Status   │ Value                  │');
console.log('├─────────────────────────────────────────┼──────────┼────────────────────────┤');

let allPassed = true;

checks.forEach(check => {
  const status = check.present ? '✅ SET  ' : '❌ MISSING';
  const value = check.secure
    ? (check.present ? '[ENCRYPTED]' : 'NOT SET')
    : (check.value || 'NOT SET');

  const displayValue = value.length > 20 ? value.substring(0, 17) + '...' : value;

  console.log(`│ ${check.name.padEnd(39)} │ ${status} │ ${displayValue.padEnd(22)} │`);

  if (check.required && !check.present) {
    allPassed = false;
  }
});

console.log('└─────────────────────────────────────────┴──────────┴────────────────────────┘\n');

// Validation checks
if (!allPassed) {
  console.log('❌ VALIDATION FAILED: Missing required environment variables\n');
  console.log('Please set all required variables before running ESSAI tests.\n');
  console.log('Example (PowerShell):');
  console.log('  $env:WEBSRM_ENABLED="true"');
  console.log('  $env:WEBSRM_NETWORK_ENABLED="true"');
  console.log('  $env:WEBSRM_ENV="ESSAI"');
  console.log('  ...\n');
  process.exit(1);
}

// Validate WEBSRM_ENV value
if (process.env.WEBSRM_ENV !== 'ESSAI') {
  console.log(`⚠️  WARNING: WEBSRM_ENV is "${process.env.WEBSRM_ENV}" (expected "ESSAI")\n`);
}

// Validate encryption key length (should be 64 hex chars = 32 bytes)
const encKey = process.env.WEBSRM_ENCRYPTION_KEY;
if (encKey) {
  if (encKey.length !== 64) {
    console.log(`❌ ENCRYPTION KEY INVALID: Expected 64 hex chars (32 bytes), got ${encKey.length}\n`);
    process.exit(1);
  }
  console.log(`✅ Encryption key valid (64 hex chars)\n`);
}

// Test decryption (without exposing keys)
console.log('🔐 Testing credential decryption...');
try {
  const { decryptSecret } = require('../apps/api/services/websrm-adapter/secrets');

  if (process.env.WEBSRM_ESSAI_PRIVATE_KEY_ENCRYPTED) {
    const decrypted = decryptSecret(process.env.WEBSRM_ESSAI_PRIVATE_KEY_ENCRYPTED);
    if (decrypted.includes('BEGIN PRIVATE KEY')) {
      console.log('  ✅ Private key decryption successful');
    } else {
      console.log('  ❌ Private key decryption produced invalid format');
      process.exit(1);
    }
  }

  if (process.env.WEBSRM_ESSAI_CERT_ENCRYPTED) {
    const decrypted = decryptSecret(process.env.WEBSRM_ESSAI_CERT_ENCRYPTED);
    if (decrypted.includes('BEGIN CERTIFICATE')) {
      console.log('  ✅ Certificate decryption successful');
    } else {
      console.log('  ❌ Certificate decryption produced invalid format');
      process.exit(1);
    }
  }
} catch (err: any) {
  console.log(`  ❌ Decryption failed: ${err.message}`);
  process.exit(1);
}

console.log('\n═══════════════════════════════════════════════════════════════════');
console.log('✅ ALL ENVIRONMENT CHECKS PASSED');
console.log('═══════════════════════════════════════════════════════════════════\n');
console.log('Ready to run ESSAI tests:');
console.log('  pnpm websrm:smoke:enr    # ENR test');
console.log('  pnpm websrm:smoke:dup    # DUP test');
console.log('  pnpm websrm:smoke:ann    # ANN test');
console.log('  pnpm websrm:smoke:mod    # MOD test');
console.log('  pnpm websrm:monitor      # Check status');
console.log('');
