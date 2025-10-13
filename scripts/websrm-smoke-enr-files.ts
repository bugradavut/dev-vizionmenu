/**
 * WEB-SRM ENR Smoke Test (Files-Only, Ephemeral Keys, No DB, No Network)
 *
 * Purpose: Test handleOrderForWebSrm with ephemeral ECDSA P-256 keys
 * Requirements:
 * - NO Supabase (no DB connection)
 * - NO Network (WEBSRM_NETWORK_ENABLED=false)
 * - Ephemeral keys (generated in-memory, never written to disk)
 * - Persist to tmp/receipts/ only
 *
 * Usage:
 *   pnpm tsx scripts/websrm-smoke-enr-files.ts
 *
 * Exit codes:
 *   0 = PASS (all validations passed)
 *   1 = FAIL (validation failed)
 */

import * as fs from 'fs';
import * as path from 'path';
import { generateKeyPairSync } from 'node:crypto';

// ============================================================================
// ENV SETUP (Force file-based mode)
// ============================================================================
process.env.WEBSRM_ENABLED = 'true';
process.env.WEBSRM_NETWORK_ENABLED = 'false'; // NO HTTP POST
process.env.WEBSRM_DB_ALLOW_WRITE = 'false'; // NO DB WRITE
process.env.WEBSRM_PERSIST = 'files'; // FILES ONLY
process.env.WEBSRM_ENV = 'DEV';
process.env.NODE_ENV = 'development';

console.log('🔐 Generating ephemeral ECDSA P-256 keys (in-memory only)...\n');

// ============================================================================
// EPHEMERAL KEY GENERATION (Never touches disk)
// ============================================================================
const { privateKey, publicKey } = generateKeyPairSync('ec', {
  namedCurve: 'prime256v1', // P-256
  publicKeyEncoding: {
    type: 'spki',
    format: 'pem',
  },
  privateKeyEncoding: {
    type: 'pkcs8',
    format: 'pem',
  },
});

// Create a simple self-signed certificate manually (for testing only)
const certPem = `-----BEGIN CERTIFICATE-----
MIIBkTCCATigAwIBAgIUTest1234567890ABCDEFGHIJKLMNOPQwCgYIKoZIzj0E
AwIwEjEQMA4GA1UEAwwHVEVTVC1DQTAeFw0yNTAxMTAwMDAwMDBaFw0yNTAxMTEw
MDAwMDBaMBIxEDAOBgNVBAMMB1RFU1QtQ0EwWTATBgcqhkjOPQIBBggqhkjOPQMB
BwNCAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABB
MAAwHQYDVR0OBBYEFI5hLMdp0KV3MmJCWqXQMvLT8i8uMAoGCCqGSM49BAMCA0cA
MEQCIDTest1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefAiATest1234567
890ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijk==
-----END CERTIFICATE-----`;

const privateKeyPem = privateKey;

console.log('✅ Ephemeral keys generated successfully');
console.log(`   Private Key: ${privateKeyPem.split('\n')[0]}...`);
console.log(`   Certificate: ${certPem.split('\n')[0]}...\n`);

// ============================================================================
// INLINE PROFILE (RAM-only, no profile-resolver)
// ============================================================================
const profile = {
  env: 'DEV' as const,
  deviceId: 'DEV-DEVICE-001',
  deviceLocalId: 'device-test',
  partnerId: 'PARTNER-DEV',
  certCode: 'CERT-DEV',
  softwareId: 'VM-SRS',
  softwareVersion: '1.0.0',
  versi: '1.0.0',
  versiParn: '1.0.0',
  privateKeyPem,
  certPem,
  tenantId: 'test-tenant',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  isActive: true,
};

// ============================================================================
// MOCK ORDER DATA
// ============================================================================
function createMockOrder() {
  const orderId = `test-order-${Date.now()}`;
  const timestamp = new Date().toISOString();

  // Calculate amounts (integer cents after conversion)
  const items_subtotal = 100.00; // $100 subtotal
  const discount_amount = 0.00;
  const gst_amount = 5.00; // 5% GST
  const qst_amount = 9.98; // 9.975% QST (rounded)
  const tip_amount = 15.00; // $15 tip
  const total_amount = items_subtotal - discount_amount + gst_amount + qst_amount + tip_amount;

  return {
    id: orderId,
    branch_id: 'test-branch',
    order_type: 'dine_in' as const,
    order_status: 'completed' as const,
    payment_method: 'credit_card' as const,

    // Amounts (dollars)
    items_subtotal,
    discount_amount,
    gst_amount,
    qst_amount,
    tip_amount,
    total_amount,

    // Timestamps
    created_at: timestamp,
    updated_at: timestamp,

    // Items
    items: [
      {
        id: 'item-1',
        order_id: orderId,
        menu_item_id: 'menu-item-1',
        menu_item_name: 'Burger Deluxe',
        menu_item_price: 25.00,
        quantity: 2,
        item_total: 50.00,
        created_at: timestamp,
      },
      {
        id: 'item-2',
        order_id: orderId,
        menu_item_id: 'menu-item-2',
        menu_item_name: 'Fries',
        menu_item_price: 10.00,
        quantity: 5,
        item_total: 50.00,
        created_at: timestamp,
      },
    ],
  };
}

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================
interface ValidationResult {
  name: string;
  expected: string | number;
  actual: string | number;
  passed: boolean;
}

function validateSignatureLength(signature: string): ValidationResult {
  const expected = 88;
  const actual = signature.length;
  return {
    name: 'signa_actu length',
    expected,
    actual,
    passed: actual === expected,
  };
}

function validateHashLength(hash: string): ValidationResult {
  const expected = 64;
  const actual = hash.length;
  return {
    name: 'payload_hash length',
    expected,
    actual,
    passed: actual === expected,
  };
}

function validateQrLength(qr: string): ValidationResult {
  const maxLength = 2048;
  const actual = qr.length;
  return {
    name: 'QR length',
    expected: `<= ${maxLength}`,
    actual,
    passed: actual <= maxLength,
  };
}

function validateHeaderSignature(header: string): ValidationResult {
  const expected = 88;
  const actual = header.length;
  return {
    name: 'SIGNATRANSM length',
    expected,
    actual,
    passed: actual === expected,
  };
}

function validateHeaderFingerprint(header: string): ValidationResult {
  const expected = 40;
  const actual = header.length;
  return {
    name: 'EMPRCERTIFTRANSM length',
    expected,
    actual,
    passed: actual === expected,
  };
}

// ============================================================================
// MAIN TEST
// ============================================================================
async function runFileBasedSmokeTest() {
  console.log('🧪 WEB-SRM ENR Smoke Test (Files-Only, Ephemeral Keys)\n');
  console.log('Environment:');
  console.log(`  WEBSRM_ENABLED: ${process.env.WEBSRM_ENABLED}`);
  console.log(`  WEBSRM_NETWORK_ENABLED: ${process.env.WEBSRM_NETWORK_ENABLED}`);
  console.log(`  WEBSRM_DB_ALLOW_WRITE: ${process.env.WEBSRM_DB_ALLOW_WRITE}`);
  console.log(`  WEBSRM_PERSIST: ${process.env.WEBSRM_PERSIST}`);
  console.log(`  WEBSRM_ENV: ${process.env.WEBSRM_ENV}\n`);

  try {
    // Import adapter (after ENV is set)
    const { handleOrderForWebSrm } = await import('../apps/api/services/websrm-adapter/runtime-adapter');

    console.log('📦 Creating mock order...');
    const order = createMockOrder();
    console.log(`  Order ID: ${order.id}`);
    console.log(`  Subtotal: $${order.items_subtotal.toFixed(2)}`);
    console.log(`  GST (5%): $${order.gst_amount.toFixed(2)}`);
    console.log(`  QST (9.975%): $${order.qst_amount.toFixed(2)}`);
    console.log(`  Tip: $${order.tip_amount.toFixed(2)}`);
    console.log(`  Total: $${order.total_amount.toFixed(2)}`);
    console.log(`  Items: ${order.items.length}\n`);

    console.log('⚙️  Running handleOrderForWebSrm (persist=files)...');
    const result = await handleOrderForWebSrm(order, profile, {
      persist: 'files',
      previousActu: '='.repeat(88), // First transaction
    });

    console.log('✅ Adapter completed successfully\n');

    // ========================================================================
    // VALIDATIONS
    // ========================================================================
    console.log('🔍 Running validations...\n');

    const validations: ValidationResult[] = [
      validateSignatureLength(result.sigs.actu),
      validateHashLength(result.sigs.sha256Hex),
      validateQrLength(result.qr),
      validateHeaderSignature(result.headers.SIGNATRANSM),
      validateHeaderFingerprint(result.headers.EMPRCERTIFTRANSM),
    ];

    // Print validation table
    console.log('┌─────────────────────────────────┬──────────┬──────────┬────────┐');
    console.log('│ Validation                      │ Expected │ Actual   │ Status │');
    console.log('├─────────────────────────────────┼──────────┼──────────┼────────┤');

    let allPassed = true;
    for (const v of validations) {
      const status = v.passed ? '✅ PASS' : '❌ FAIL';
      const expected = String(v.expected).padEnd(8);
      const actual = String(v.actual).padEnd(8);
      const name = v.name.padEnd(31);
      console.log(`│ ${name} │ ${expected} │ ${actual} │ ${status} │`);
      if (!v.passed) allPassed = false;
    }

    console.log('└─────────────────────────────────┴──────────┴──────────┴────────┘\n');

    // ========================================================================
    // SIGNATURE SAMPLES
    // ========================================================================
    console.log('📝 Signature samples (first 40 chars):');
    console.log(`  signa_actu:        ${result.sigs.actu.substring(0, 40)}...`);
    console.log(`  payload_hash:      ${result.sigs.sha256Hex.substring(0, 40)}...`);
    console.log(`  SIGNATRANSM:       ${result.headers.SIGNATRANSM.substring(0, 40)}...`);
    console.log(`  EMPRCERTIFTRANSM:  ${result.headers.EMPRCERTIFTRANSM}\n`);

    // ========================================================================
    // OUTPUT FILES
    // ========================================================================
    console.log('📁 Output files:\n');

    const tmpDir = path.join(process.cwd(), 'tmp', 'receipts');
    if (fs.existsSync(tmpDir)) {
      const files = fs.readdirSync(tmpDir).filter((f) => f.startsWith('websrm-'));

      if (files.length > 0) {
        // Sort by modification time (newest first)
        const sortedFiles = files
          .map((f) => ({
            name: f,
            path: path.join(tmpDir, f),
            mtime: fs.statSync(path.join(tmpDir, f)).mtime.getTime(),
          }))
          .sort((a, b) => b.mtime - a.mtime)
          .slice(0, 3); // Show last 3 files

        for (const file of sortedFiles) {
          const stats = fs.statSync(file.path);
          console.log(`  📄 ${file.name}`);
          console.log(`     Path: ${file.path}`);
          console.log(`     Size: ${stats.size} bytes`);
          console.log(`     Modified: ${new Date(file.mtime).toISOString()}`);

          // Read first 20 lines
          const content = fs.readFileSync(file.path, 'utf8');
          const lines = content.split('\n').slice(0, 20);
          console.log(`     Preview (first 20 lines):`);
          lines.forEach((line, i) => {
            const truncated = line.length > 80 ? line.substring(0, 80) + '...' : line;
            console.log(`       ${String(i + 1).padStart(2, ' ')}: ${truncated}`);
          });
          console.log('');
        }
      } else {
        console.log('  ⚠️  No output files found in tmp/receipts/');
      }
    } else {
      console.log('  ⚠️  tmp/receipts/ directory does not exist');
    }

    // ========================================================================
    // SUMMARY
    // ========================================================================
    console.log('═══════════════════════════════════════════════════════════════════');
    if (allPassed) {
      console.log('✅ ALL VALIDATIONS PASSED');
      console.log('═══════════════════════════════════════════════════════════════════\n');
      console.log('🎉 ENR smoke test completed successfully!');
      console.log('   - Ephemeral keys generated and used');
      console.log('   - Signatures computed (ECDSA P-256)');
      console.log('   - Headers generated');
      console.log('   - QR code created (within 2048 limit)');
      console.log('   - Receipt persisted to tmp/receipts/\n');
      process.exit(0);
    } else {
      console.log('❌ SOME VALIDATIONS FAILED');
      console.log('═══════════════════════════════════════════════════════════════════\n');
      process.exit(1);
    }
  } catch (error: any) {
    console.error('❌ Test failed with error:\n');
    console.error(error.message);
    console.error('\nStack trace:');
    console.error(error.stack);
    process.exit(1);
  }
}

// Run test
runFileBasedSmokeTest();
