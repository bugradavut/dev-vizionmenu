/**
 * WEB-SRM ESSAI Smoke Test - ANN (Annulation/Cancellation)
 *
 * Purpose: Test cancellation flow (ENR → ANN)
 * Expected: ANN.signaPreced === ENR.signaActu (signature chain)
 *
 * Usage:
 *   WEBSRM_ENABLED=true WEBSRM_NETWORK_ENABLED=true WEBSRM_ENV=ESSAI \
 *   tsx scripts/websrm-smoke-ann.ts
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
  annOrderId?: string;
  enrSignaActu?: string;
  annSignaPreced?: string;
  chainValid?: boolean;
  error?: string;
}

async function runAnnSmokeTest(): Promise<SmokeTestResult> {
  console.log('🧪 [ESSAI SMOKE] Starting ANN (Cancellation) Test...\n');

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
        customer_name: 'ESSAI ANN Test',
        customer_phone: '514-555-0102',
        order_type: 'pickup',
        order_status: 'preparing',
        payment_status: 'paid',
        payment_method: 'card',
        items_subtotal: 25.00,
        gst_amount: 1.25,
        qst_amount: 2.49,
        total_amount: 28.74,
        subtotal: 25.00,
        tax_amount: 3.74,
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
      menu_item_name: 'Burger Deluxe',
      menu_item_price: 25.00,
      quantity: 1,
      item_total: 25.00,
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
    // STEP 2: Create and process ANN (cancellation) transaction
    // ========================================
    console.log('📝 Step 2: Creating cancellation (ANN)...\n');

    // Create cancellation order (negative amounts)
    const { data: annOrder, error: annOrderError } = await supabase
      .from('orders')
      .insert({
        branch_id: branchId,
        customer_name: 'ESSAI ANN Test',
        customer_phone: '514-555-0102',
        order_type: 'pickup',
        order_status: 'cancelled',
        payment_status: 'refunded',
        payment_method: 'card',
        items_subtotal: -25.00, // Negative amounts for cancellation
        gst_amount: -1.25,
        qst_amount: -2.49,
        total_amount: -28.74,
        subtotal: -25.00,
        tax_amount: -3.74,
        order_source: 'web',
      })
      .select()
      .single();

    if (annOrderError || !annOrder) {
      throw new Error(`Failed to create ANN order: ${annOrderError?.message}`);
    }

    console.log(`✅ ANN Order created: ${annOrder.id}`);

    // Create order items (negative)
    await supabase.from('order_items').insert({
      order_id: annOrder.id,
      menu_item_name: 'Burger Deluxe',
      menu_item_price: -25.00,
      quantity: 1,
      item_total: -25.00,
    });

    // Enqueue ANN
    const annEnqueueResult = await enqueueOrder(annOrder.id, tenantId);
    if (!annEnqueueResult.success) {
      throw new Error(`Failed to enqueue ANN: ${annEnqueueResult.message}`);
    }

    console.log(`✅ ANN Enqueued: ${annEnqueueResult.queueId}\n`);

    // Process ANN
    console.log('⏳ Processing ANN transaction...\n');
    const annProcessResult = await processQueueItem(annEnqueueResult.queueId!);

    if (annProcessResult.status !== 'completed') {
      throw new Error(`ANN transaction failed: ${annProcessResult.message}`);
    }

    console.log(`✅ ANN Transaction completed\n`);

    // Get ANN receipt
    const { data: annReceipt } = await supabase
      .from('receipts')
      .select('*')
      .eq('order_id', annOrder.id)
      .single();

    if (!annReceipt) {
      throw new Error('ANN receipt not found');
    }

    console.log(`📋 ANN Receipt:`);
    console.log(`   Signa Preced:  ${annReceipt.signa_preced?.substring(0, 20)}...`);
    console.log(`   Signa Actu:    ${annReceipt.signa_actu?.substring(0, 20)}...`);
    console.log(`   Payload Hash:  ${annReceipt.payload_hash?.substring(0, 20)}...`);
    console.log(`   Transaction:   ${annReceipt.websrm_transaction_id || 'N/A'}\n`);

    // ========================================
    // STEP 3: Validate signature chain
    // ========================================
    console.log('🔗 Step 3: Validating signature chain...\n');

    const chainValid = annReceipt.signa_preced === enrReceipt.signa_actu;

    console.log('═══════════════════════════════════════════════');
    console.log('📋 ESSAI SMOKE TEST SUMMARY - ANN');
    console.log('═══════════════════════════════════════════════');
    console.log(`ENR Order ID:      ${enrOrder.id}`);
    console.log(`ENR Signa Actu:    ${enrReceipt.signa_actu?.substring(0, 40)}...`);
    console.log(`ENR Transaction:   ${enrReceipt.websrm_transaction_id || 'N/A'}`);
    console.log(`─────────────────────────────────────────────────`);
    console.log(`ANN Order ID:      ${annOrder.id}`);
    console.log(`ANN Signa Preced:  ${annReceipt.signa_preced?.substring(0, 40)}...`);
    console.log(`ANN Signa Actu:    ${annReceipt.signa_actu?.substring(0, 40)}...`);
    console.log(`ANN Transaction:   ${annReceipt.websrm_transaction_id || 'N/A'}`);
    console.log(`─────────────────────────────────────────────────`);
    console.log(`Signature Chain:   ${chainValid ? '✅ VALID' : '❌ INVALID'}`);
    console.log(`Chain Match:       ${chainValid ? 'ANN.preced === ENR.actu' : 'MISMATCH!'}`);
    console.log('═══════════════════════════════════════════════');

    if (chainValid) {
      console.log('✅ ANN Test PASSED - Signature chain validated\n');
      return {
        success: true,
        enrOrderId: enrOrder.id,
        annOrderId: annOrder.id,
        enrSignaActu: enrReceipt.signa_actu,
        annSignaPreced: annReceipt.signa_preced,
        chainValid: true,
      };
    } else {
      console.log('❌ ANN Test FAILED - Signature chain invalid\n');
      return {
        success: false,
        enrOrderId: enrOrder.id,
        annOrderId: annOrder.id,
        enrSignaActu: enrReceipt.signa_actu,
        annSignaPreced: annReceipt.signa_preced,
        chainValid: false,
        error: 'Signature chain mismatch',
      };
    }
  } catch (error: any) {
    console.error('❌ ANN Test FAILED - Error:', error.message);
    return {
      success: false,
      error: error.message,
    };
  }
}

// Run smoke test
runAnnSmokeTest()
  .then((result) => {
    process.exit(result.success ? 0 : 1);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
