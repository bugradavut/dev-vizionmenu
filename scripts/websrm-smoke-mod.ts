/**
 * WEB-SRM ESSAI Smoke Test - MOD (Modification/Correction)
 *
 * Purpose: Test correction flow (ENR → MOD)
 * Expected: MOD.signaPreced === ENR.signaActu, MOD.payloadHash ≠ ENR.payloadHash
 *
 * Usage:
 *   WEBSRM_ENABLED=true WEBSRM_NETWORK_ENABLED=true WEBSRM_ENV=ESSAI \
 *   tsx scripts/websrm-smoke-mod.ts
 */

import { createClient } from '@supabase/supabase-js';
import { enqueueOrder, processQueueItem } from '../apps/api/services/websrm-adapter/queue-worker';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface SmokeTestResult {
  success: boolean;
  enrOrderId?: string;
  modOrderId?: string;
  enrSignaActu?: string;
  modSignaPreced?: string;
  enrPayloadHash?: string;
  modPayloadHash?: string;
  chainValid?: boolean;
  hashDifferent?: boolean;
  error?: string;
}

async function runModSmokeTest(): Promise<SmokeTestResult> {
  console.log('🧪 [ESSAI SMOKE] Starting MOD (Correction) Test...\n');

  const tenantId = process.env.WEBSRM_TEST_TENANT_ID || 'essai-tenant';
  const branchId = process.env.WEBSRM_TEST_BRANCH_ID || 'test-branch-essai';

  try {
    // ========================================
    // STEP 1: Create and process original ENR transaction
    // ========================================
    console.log('📝 Step 1: Creating original sale (ENR)...\n');

    const { data: enrOrder, error: enrOrderError } = await supabase
      .from('orders')
      .insert({
        branch_id: branchId,
        customer_name: 'ESSAI MOD Test',
        customer_phone: '514-555-0103',
        order_type: 'pickup',
        order_status: 'preparing',
        payment_status: 'paid',
        payment_method: 'card',
        items_subtotal: 30.00,
        gst_amount: 1.50,
        qst_amount: 2.99,
        total_amount: 34.49,
        subtotal: 30.00,
        tax_amount: 4.49,
        order_source: 'web',
      })
      .select()
      .single();

    if (enrOrderError || !enrOrder) {
      throw new Error(`Failed to create ENR order: ${enrOrderError?.message}`);
    }

    console.log(`✅ ENR Order created: ${enrOrder.id}`);

    // Create order items
    await supabase.from('order_items').insert({
      order_id: enrOrder.id,
      menu_item_name: 'Pasta Carbonara',
      menu_item_price: 30.00,
      quantity: 1,
      item_total: 30.00,
    });

    // Enqueue ENR
    const enrEnqueueResult = await enqueueOrder(enrOrder.id, tenantId);
    if (!enrEnqueueResult.success) {
      throw new Error(`Failed to enqueue ENR: ${enrEnqueueResult.message}`);
    }

    console.log(`✅ ENR Enqueued: ${enrEnqueueResult.queueId}\n`);

    // Process ENR
    console.log('⏳ Processing ENR transaction...\n');
    const enrProcessResult = await processQueueItem(enrEnqueueResult.queueId!);

    if (enrProcessResult.status !== 'completed') {
      throw new Error(`ENR transaction failed: ${enrProcessResult.message}`);
    }

    console.log(`✅ ENR Transaction completed\n`);

    // Get ENR receipt
    const { data: enrReceipt } = await supabase
      .from('receipts')
      .select('*')
      .eq('order_id', enrOrder.id)
      .single();

    if (!enrReceipt) {
      throw new Error('ENR receipt not found');
    }

    console.log(`📋 ENR Receipt:`);
    console.log(`   Signa Actu:    ${enrReceipt.signa_actu?.substring(0, 20)}...`);
    console.log(`   Payload Hash:  ${enrReceipt.payload_hash?.substring(0, 20)}...`);
    console.log(`   Transaction:   ${enrReceipt.websrm_transaction_id || 'N/A'}\n`);

    // ========================================
    // STEP 2: Create and process MOD (correction) transaction
    // ========================================
    console.log('📝 Step 2: Creating correction (MOD)...\n');

    // Create correction order (modified amounts - discovered pricing error)
    const { data: modOrder, error: modOrderError } = await supabase
      .from('orders')
      .insert({
        branch_id: branchId,
        customer_name: 'ESSAI MOD Test',
        customer_phone: '514-555-0103',
        order_type: 'pickup',
        order_status: 'completed',
        payment_status: 'paid',
        payment_method: 'card',
        items_subtotal: 32.00, // Corrected price (was 30.00)
        gst_amount: 1.60,
        qst_amount: 3.19,
        total_amount: 36.79, // Corrected total (was 34.49)
        subtotal: 32.00,
        tax_amount: 4.79,
        order_source: 'web',
      })
      .select()
      .single();

    if (modOrderError || !modOrder) {
      throw new Error(`Failed to create MOD order: ${modOrderError?.message}`);
    }

    console.log(`✅ MOD Order created: ${modOrder.id}`);

    // Create order items (corrected price)
    await supabase.from('order_items').insert({
      order_id: modOrder.id,
      menu_item_name: 'Pasta Carbonara',
      menu_item_price: 32.00, // Corrected price (was 30.00)
      quantity: 1,
      item_total: 32.00,
    });

    // Enqueue MOD
    const modEnqueueResult = await enqueueOrder(modOrder.id, tenantId);
    if (!modEnqueueResult.success) {
      throw new Error(`Failed to enqueue MOD: ${modEnqueueResult.message}`);
    }

    console.log(`✅ MOD Enqueued: ${modEnqueueResult.queueId}\n`);

    // Process MOD
    console.log('⏳ Processing MOD transaction...\n');
    const modProcessResult = await processQueueItem(modEnqueueResult.queueId!);

    if (modProcessResult.status !== 'completed') {
      throw new Error(`MOD transaction failed: ${modProcessResult.message}`);
    }

    console.log(`✅ MOD Transaction completed\n`);

    // Get MOD receipt
    const { data: modReceipt } = await supabase
      .from('receipts')
      .select('*')
      .eq('order_id', modOrder.id)
      .single();

    if (!modReceipt) {
      throw new Error('MOD receipt not found');
    }

    console.log(`📋 MOD Receipt:`);
    console.log(`   Signa Preced:  ${modReceipt.signa_preced?.substring(0, 20)}...`);
    console.log(`   Signa Actu:    ${modReceipt.signa_actu?.substring(0, 20)}...`);
    console.log(`   Payload Hash:  ${modReceipt.payload_hash?.substring(0, 20)}...`);
    console.log(`   Transaction:   ${modReceipt.websrm_transaction_id || 'N/A'}\n`);

    // ========================================
    // STEP 3: Validate signature chain and hash difference
    // ========================================
    console.log('🔗 Step 3: Validating signature chain and payload hash...\n');

    const chainValid = modReceipt.signa_preced === enrReceipt.signa_actu;
    const hashDifferent = modReceipt.payload_hash !== enrReceipt.payload_hash;

    console.log('═══════════════════════════════════════════════');
    console.log('📋 ESSAI SMOKE TEST SUMMARY - MOD');
    console.log('═══════════════════════════════════════════════');
    console.log(`ENR Order ID:      ${enrOrder.id}`);
    console.log(`ENR Signa Actu:    ${enrReceipt.signa_actu?.substring(0, 40)}...`);
    console.log(`ENR Payload Hash:  ${enrReceipt.payload_hash?.substring(0, 40)}...`);
    console.log(`ENR Total:         $${enrOrder.total_amount.toFixed(2)}`);
    console.log(`ENR Transaction:   ${enrReceipt.websrm_transaction_id || 'N/A'}`);
    console.log(`─────────────────────────────────────────────────`);
    console.log(`MOD Order ID:      ${modOrder.id}`);
    console.log(`MOD Signa Preced:  ${modReceipt.signa_preced?.substring(0, 40)}...`);
    console.log(`MOD Signa Actu:    ${modReceipt.signa_actu?.substring(0, 40)}...`);
    console.log(`MOD Payload Hash:  ${modReceipt.payload_hash?.substring(0, 40)}...`);
    console.log(`MOD Total:         $${modOrder.total_amount.toFixed(2)}`);
    console.log(`MOD Transaction:   ${modReceipt.websrm_transaction_id || 'N/A'}`);
    console.log(`─────────────────────────────────────────────────`);
    console.log(`Signature Chain:   ${chainValid ? '✅ VALID' : '❌ INVALID'}`);
    console.log(`Chain Match:       ${chainValid ? 'MOD.preced === ENR.actu' : 'MISMATCH!'}`);
    console.log(`Payload Hash:      ${hashDifferent ? '✅ DIFFERENT' : '❌ SAME (unexpected!)'}`);
    console.log(`Hash Match:        ${hashDifferent ? 'MOD.hash ≠ ENR.hash (correct)' : 'MOD.hash === ENR.hash (wrong!)'}`);
    console.log('═══════════════════════════════════════════════');

    if (chainValid && hashDifferent) {
      console.log('✅ MOD Test PASSED - Signature chain valid + payload hash changed\n');
      return {
        success: true,
        enrOrderId: enrOrder.id,
        modOrderId: modOrder.id,
        enrSignaActu: enrReceipt.signa_actu,
        modSignaPreced: modReceipt.signa_preced,
        enrPayloadHash: enrReceipt.payload_hash,
        modPayloadHash: modReceipt.payload_hash,
        chainValid: true,
        hashDifferent: true,
      };
    } else {
      const errors: string[] = [];
      if (!chainValid) errors.push('Signature chain invalid');
      if (!hashDifferent) errors.push('Payload hash unchanged (expected to change)');

      console.log(`❌ MOD Test FAILED - ${errors.join(', ')}\n`);
      return {
        success: false,
        enrOrderId: enrOrder.id,
        modOrderId: modOrder.id,
        enrSignaActu: enrReceipt.signa_actu,
        modSignaPreced: modReceipt.signa_preced,
        enrPayloadHash: enrReceipt.payload_hash,
        modPayloadHash: modReceipt.payload_hash,
        chainValid,
        hashDifferent,
        error: errors.join(', '),
      };
    }
  } catch (error: any) {
    console.error('❌ MOD Test FAILED - Error:', error.message);
    return {
      success: false,
      error: error.message,
    };
  }
}

// Run smoke test
runModSmokeTest()
  .then((result) => {
    process.exit(result.success ? 0 : 1);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
