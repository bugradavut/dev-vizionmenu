/**
 * WEB-SRM ESSAI Offline Smoke Test
 *
 * Purpose: Test ESSAI profile with ephemeral keys (offline mode)
 * Use Case: Before receiving real PEM keys from Revenu Québec
 *
 * Environment:
 *   WEBSRM_ENV=ESSAI
 *   WEBSRM_ENABLED=true
 *   WEBSRM_NETWORK_ENABLED=false  (offline)
 *   WEBSRM_DB_ALLOW_WRITE=true
 *   WEBSRM_PERSIST=files
 *
 * Exit Codes:
 *   0 = PASS
 *   1 = FAIL
 */

import * as fs from 'fs';
import * as path from 'path';
import { generateKeyPairSync } from 'node:crypto';

// ENV setup
process.env.WEBSRM_ENABLED = 'true';
process.env.WEBSRM_NETWORK_ENABLED = 'false'; // OFFLINE
process.env.WEBSRM_DB_ALLOW_WRITE = 'true';
process.env.WEBSRM_PERSIST = 'files';
process.env.WEBSRM_ENV = 'ESSAI';
process.env.WEBSRM_CASESSAI = '000.000';
process.env.NODE_ENV = 'development';

console.log('🧪 WEB-SRM ESSAI Offline Smoke Test\n');
console.log('Mode: OFFLINE (ephemeral keys, no network)\n');

// Generate ephemeral ECDSA P-256 keys (temporary until real keys arrive)
console.log('🔐 Generating ephemeral ECDSA P-256 keys...');
const { privateKey, publicKey } = generateKeyPairSync('ec', {
  namedCurve: 'prime256v1',
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
});

// Mock certificate (temporary)
const certPem = `-----BEGIN CERTIFICATE-----
MIIBkTCCATigAwIBAgIUTest1234567890ABCDEFGHIJKLMNOPQwCgYIKoZIzj0E
AwIwEjEQMA4GA1UEAwwHVEVTVC1DQTAeFw0yNTAxMTAwMDAwMDBaFw0yNTAxMTEw
MDAwMDBaMBIxEDAOBgNVBAMMB1RFU1QtQ0EwWTATBgcqhkjOPQIBBggqhkjOPQMB
BwNCAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABB
MAAwHQYDVR0OBBYEFI5hLMdp0KV3MmJCWqXQMvLT8i8uMAoGCCqGSM49BAMCA0cA
MEQCIDTest1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefAiATest1234567
890ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijk==
-----END CERTIFICATE-----`;

console.log('✅ Ephemeral keys generated\n');

// ESSAI profile (inline, using RQ credentials)
const profile = {
  env: 'ESSAI' as const,
  deviceId: '0000-0000-0000',               // Temporary, until enrolment
  partnerId: '0000000000001FF2',            // IDPARTN (from RQ)
  certCode: 'FOB201999999',                 // CODCERTIF (from RQ)
  softwareId: '0000000000003973',           // IDSEV (from RQ)
  softwareVersion: '00000000000045D6',      // IDVERSI (from RQ)
  versi: '0.1.0',                           // VERSI (protocol version)
  versiParn: '1.0.0',                       // VERSIPARN
  casEssai: '000.000',                      // CASESSAI
  authorizationCode: 'W7V7-K8W9',           // AUTH_CODE (for enrolment)
  privateKeyPem: privateKey,                // Ephemeral (temp)
  certPem,                                  // Mock (temp)
  id: 'essai-profile-offline',
  tenant_id: 'essai-tenant',
  created_at: new Date(),
  updated_at: new Date(),
  is_active: true,
  encryption_algorithm: 'none' as const,
  encryption_key_id: null,
  iv: null,
  auth_tag: null,
};

console.log('📋 ESSAI Profile (Revenu Québec Credentials):');
console.log(`  IDPARTN: ${profile.partnerId}`);
console.log(`  IDSEV: ${profile.softwareId}`);
console.log(`  IDVERSI: ${profile.softwareVersion}`);
console.log(`  CODCERTIF: ${profile.certCode}`);
console.log(`  VERSI: ${profile.versi}`);
console.log(`  CASESSAI: ${profile.casEssai}`);
console.log(`  IDAPPRL: ${profile.deviceId} (temporary, awaiting enrolment)`);
console.log(`  AUTH_CODE: ${profile.authorizationCode} (for enrolment)\n`);

// Create mock order
function createMockOrder() {
  const orderId = `essai-offline-${Date.now()}`;
  const now = new Date().toISOString();
  return {
    id: orderId,
    branch_id: 'essai-branch',
    order_type: 'dine_in' as const,
    order_status: 'completed' as const,
    payment_method: 'credit_card' as const,
    items_subtotal: 50.00,
    discount_amount: 0.00,
    gst_amount: 2.50,
    qst_amount: 4.99,
    tip_amount: 7.50,
    total_amount: 64.99,
    items: [
      {
        id: 'item-1',
        menu_item_id: 'menu-1',
        menu_item_name: 'ESSAI Test Item',
        menu_item_price: 50.00,
        quantity: 1,
        item_total: 50.00,
        category: 'Test',
        modifiers: [],
      },
    ],
    created_at: now,
    updated_at: now,
    completed_at: now,
    customer_name: null,
    customer_phone: null,
    table_number: null,
    notes: 'ESSAI offline smoke test',
  };
}

async function runTest() {
  try {
    const { handleOrderForWebSrm } = await import(
      '../apps/api/services/websrm-adapter/runtime-adapter'
    );

    console.log('📦 Creating mock order...');
    const order = createMockOrder();
    console.log(`  Order ID: ${order.id}`);
    console.log(`  Total: $${order.total_amount.toFixed(2)}\n`);

    console.log('⚙️  Running handleOrderForWebSrm (offline mode)...');
    const result = await handleOrderForWebSrm(order, profile, {
      persist: 'files',
      previousActu: '='.repeat(88),
    });

    console.log('✅ Transaction processed successfully\n');

    // Validations
    console.log('🔍 Validations:');
    const validations = [
      { name: 'signa_actu length', expected: 88, actual: result.sigs.actu.length },
      { name: 'payload_hash length', expected: 64, actual: result.sigs.sha256Hex.length },
      { name: 'QR length', expected: '<=2048', actual: result.qr.length, check: result.qr.length <= 2048 },
      { name: 'SIGNATRANSM length', expected: 88, actual: result.headers.SIGNATRANSM.length },
      { name: 'EMPRCERTIFTRANSM length', expected: 40, actual: result.headers.EMPRCERTIFTRANSM.length },
    ];

    console.log('┌────────────────────────────┬──────────┬────────┬────────┐');
    console.log('│ Check                      │ Expected │ Actual │ Status │');
    console.log('├────────────────────────────┼──────────┼────────┼────────┤');

    let allPassed = true;
    validations.forEach(v => {
      const passed = v.check !== undefined ? v.check : v.expected === v.actual;
      const status = passed ? '✅ PASS' : '❌ FAIL';
      if (!passed) allPassed = false;

      console.log(
        `│ ${v.name.padEnd(26)} │ ${String(v.expected).padEnd(8)} │ ${String(v.actual).padEnd(6)} │ ${status} │`
      );
    });

    console.log('└────────────────────────────┴──────────┴────────┴────────┘\n');

    // Headers check
    console.log('📋 ESSAI Headers:');
    console.log(`  ENVIRN: ${result.headers.ENVIRN}`);
    console.log(`  IDAPPRL: ${result.headers.IDAPPRL}`);
    console.log(`  IDSEV: ${result.headers.IDSEV}`);
    console.log(`  IDVERSI: ${result.headers.IDVERSI}`);
    console.log(`  CODCERTIF: ${result.headers.CODCERTIF}`);
    console.log(`  IDPARTN: ${result.headers.IDPARTN}`);
    console.log(`  VERSI: ${result.headers.VERSI}`);
    console.log(`  VERSIPARN: ${result.headers.VERSIPARN}`);
    console.log(`  CASESSAI: ${result.headers.CASESSAI || 'N/A'}\n`);

    // Output files
    console.log('📁 Output Files:');
    const receiptsDir = path.join(process.cwd(), 'tmp', 'receipts');
    const files = fs.readdirSync(receiptsDir)
      .filter(f => f.includes(order.id))
      .sort((a, b) => {
        const aStat = fs.statSync(path.join(receiptsDir, a));
        const bStat = fs.statSync(path.join(receiptsDir, b));
        return bStat.mtime.getTime() - aStat.mtime.getTime();
      });

    if (files.length > 0) {
      files.forEach(file => {
        const filePath = path.join(receiptsDir, file);
        const stats = fs.statSync(filePath);
        console.log(`  📄 ${file}`);
        console.log(`     Path: ${filePath}`);
        console.log(`     Size: ${stats.size} bytes`);
        console.log(`     Modified: ${stats.mtime.toISOString()}`);
      });
    } else {
      console.log('  ⚠️  No files found (check WEBSRM_PERSIST setting)');
    }

    console.log('');

    if (allPassed) {
      console.log('═══════════════════════════════════════════════════════════════════');
      console.log('✅ ESSAI OFFLINE SMOKE TEST PASSED');
      console.log('═══════════════════════════════════════════════════════════════════\n');
      console.log('Next Steps:');
      console.log('  1. Wait for real PEM keys from Revenu Québec');
      console.log('  2. Set WEBSRM_ESSAI_PRIVATE_KEY_ENCRYPTED env var');
      console.log('  3. Set WEBSRM_ESSAI_CERT_ENCRYPTED env var');
      console.log('  4. Set WEBSRM_ENCRYPTION_KEY (64 hex chars)');
      console.log('  5. Run enrolment: POST /certificates/enrolment');
      console.log('  6. Update deviceId with response from enrolment');
      console.log('  7. Set WEBSRM_NETWORK_ENABLED=true');
      console.log('  8. Run online ESSAI tests (ENR/DUP/ANN/MOD)');
      console.log('');
      process.exit(0);
    } else {
      console.log('❌ VALIDATION FAILED\n');
      process.exit(1);
    }
  } catch (error: any) {
    console.error('❌ Test failed:', error.message);
    console.error('\nStack:', error.stack);
    process.exit(1);
  }
}

runTest();
