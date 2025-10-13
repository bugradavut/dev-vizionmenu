/**
 * WEB-SRM Dry-Run Script
 * Local testing script that generates WEB-SRM payload, headers, and QR code from a fake order
 *
 * This script:
 * - Creates a fake order with realistic data
 * - Maps it to WEB-SRM format using @vizionmenu/websrm-core
 * - Generates headers and QR code
 * - Writes outputs to tmp/ directory for inspection
 *
 * NO network calls, NO database access, NO production impact.
 *
 * Run: pnpm -w websrm:dryrun
 */

import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { createHash } from 'crypto';

import {
  mapOrderToReqTrans,
  buildHeaders,
  buildReceiptQr,
  formatAmount,
  toQuebecLocalIso,
  computeSignaTransm,
  type OrderShape,
  type TransactionRegistrationResponse,
} from '@vizionmenu/websrm-core';

/**
 * Create a fake order for testing
 * Simulates a completed dine-in order with multiple items
 */
function createFakeOrder(): OrderShape {
  const now = new Date().toISOString();

  return {
    id: 'ORD-DRYRUN-001',
    branch_id: 'BR-001',
    customer_name: 'Jean Tremblay',
    customer_phone: '+15145551234',
    customer_email: 'jean.tremblay@example.com',
    order_type: 'dine_in',
    order_status: 'completed',
    payment_method: 'credit_card',

    // Amounts in CAD dollars (will be converted to cents)
    items_subtotal: 24.50,
    discount_amount: 0,
    gst_amount: 1.23,     // 5% GST
    qst_amount: 2.44,     // 9.975% QST
    tip_amount: 2.50,
    total_amount: 30.67,

    // Optional fields
    tip_type: 'fixed',
    tip_value: 2.50,
    served_by_user_id: 'EMP-001',
    receipt_print_mode: 'paper',
    receipt_format: 'detailed',

    // Timestamps
    created_at: now,
    updated_at: now,

    // Line items
    items: [
      {
        id: 'ITEM-001',
        menu_item_name: 'Margherita Pizza',
        menu_item_price: 14.50,
        quantity: 1,
        item_total: 14.50,
        special_instructions: 'Extra basil',
      },
      {
        id: 'ITEM-002',
        menu_item_name: 'Espresso',
        menu_item_price: 5.00,
        quantity: 2,
        item_total: 10.00,
      },
    ],
  };
}

/**
 * Create a fake WEB-SRM response for QR generation
 * Simulates what the API would return after successful registration
 */
function createFakeResponse(transactionId: string): TransactionRegistrationResponse {
  const now = toQuebecLocalIso(new Date().toISOString());

  return {
    idTrans: transactionId,
    idTransSrm: `SRM-${Date.now()}`,
    codeQR: `https://websrm.revenuquebec.ca/verify/${transactionId}`,
    urlRecu: `https://websrm.revenuquebec.ca/receipt/${transactionId}`,
    dtConfirmation: now,
  };
}

/**
 * Compute SHA-256 hash of payload for verification
 */
function computeSha256(data: string): string {
  return createHash('sha256').update(data, 'utf8').digest('hex');
}

/**
 * Main execution
 */
async function main() {
  console.log('🧪 WEB-SRM Dry-Run Script');
  console.log('========================\n');

  // Ensure tmp/ directory exists
  const tmpDir = join(process.cwd(), 'tmp');
  if (!existsSync(tmpDir)) {
    mkdirSync(tmpDir, { recursive: true });
    console.log('✅ Created tmp/ directory\n');
  }

  // Step 1: Create fake order
  console.log('📦 Creating fake order...');
  const order = createFakeOrder();
  console.log(`   Order ID: ${order.id}`);
  console.log(`   Type: ${order.order_type}`);
  console.log(`   Total: $${order.total_amount.toFixed(2)} CAD`);
  console.log(`   Items: ${order.items.length}\n`);

  // Step 2: Compute signature (STUB - not real HMAC)
  console.log('🔐 Computing signature (STUB)...');
  const partialPayload = {
    idTrans: order.id,
    acti: 'ENR' as const,
    typServ: 'REST' as const,
    montST: formatAmount(order.items_subtotal),
    montTPS: formatAmount(order.gst_amount),
    montTVQ: formatAmount(order.qst_amount),
    montTot: formatAmount(order.total_amount),
  };

  const signature = computeSignaTransm(partialPayload as any, {
    algorithm: 'HMAC-SHA256',
    secret: 'fake-secret-key-for-testing',
    encoding: 'base64',
  });
  console.log(`   Signature: ${signature.substring(0, 40)}...\n`);

  // Step 3: Map order to WEB-SRM payload
  console.log('🔄 Mapping order to WEB-SRM payload...');
  const payload = mapOrderToReqTrans(order, signature);
  console.log(`   Transaction ID: ${payload.idTrans}`);
  console.log(`   Action: ${payload.acti}`);
  console.log(`   Service Type: ${payload.typServ}`);
  console.log(`   Payment Mode: ${payload.modPai}`);
  console.log(`   Subtotal: ${payload.montST} cents`);
  console.log(`   GST: ${payload.montTPS} cents`);
  console.log(`   QST: ${payload.montTVQ} cents`);
  console.log(`   Total: ${payload.montTot} cents`);
  console.log(`   Line Items: ${payload.desc.length}\n`);

  // Step 4: Build headers
  console.log('📋 Building HTTP headers...');
  const headers = buildHeaders({
    certificationCode: 'CERT-DRYRUN-TEST',
    deviceId: 'POS-DEV-001',
    softwareVersion: '1.0.0',
    signature: signature,
    requestId: `req-${Date.now()}`,
  });
  console.log(`   Header keys: ${Object.keys(headers).length}`);
  console.log(`   Authorization: ${headers['Authorization']?.substring(0, 30)}...`);
  console.log(`   Device ID: ${headers['X-Device-ID']}\n`);

  // Step 5: Generate QR code
  console.log('📱 Generating receipt QR code...');
  const fakeResponse = createFakeResponse(order.id);
  const qrString = buildReceiptQr(fakeResponse, { format: 'url' });
  console.log(`   QR Data: ${qrString}`);
  console.log(`   QR Length: ${qrString.length} chars\n`);

  // Step 6: Write outputs to tmp/
  console.log('💾 Writing outputs to tmp/...');

  // Write payload
  const payloadPath = join(tmpDir, 'websrm-payload.json');
  writeFileSync(payloadPath, JSON.stringify(payload, null, 2), 'utf8');
  console.log(`   ✓ ${payloadPath}`);

  // Write headers
  const headersPath = join(tmpDir, 'websrm-headers.json');
  writeFileSync(headersPath, JSON.stringify(headers, null, 2), 'utf8');
  console.log(`   ✓ ${headersPath}`);

  // Write QR code
  const qrPath = join(tmpDir, 'websrm-qr.txt');
  writeFileSync(qrPath, qrString, 'utf8');
  console.log(`   ✓ ${qrPath}\n`);

  // Step 7: Compute checksums
  console.log('🔍 Output summary:');
  const payloadJson = JSON.stringify(payload);
  const payloadSha256 = computeSha256(payloadJson);
  console.log(`   Payload SHA-256: ${payloadSha256.substring(0, 16)}...`);
  console.log(`   Payload size: ${payloadJson.length} bytes`);
  console.log(`   Header count: ${Object.keys(headers).length} keys`);
  console.log(`   QR length: ${qrString.length} chars\n`);

  console.log('✅ Dry-run completed successfully!');
  console.log('   Review outputs in tmp/ directory\n');
}

// Run the script
main().catch((error) => {
  console.error('❌ Dry-run failed:', error);
  process.exit(1);
});
