/**
 * WEB-SRM ESSAI Smoke Test - DUPLICATE
 *
 * Purpose: Test duplicate transaction detection (same idempotency key)
 * Expected: 409 DUPLICATE - Non-retryable failure
 *
 * Usage:
 *   WEBSRM_ENABLED=true WEBSRM_NETWORK_ENABLED=true WEBSRM_ENV=ESSAI \
 *   ts-node scripts/websrm-smoke-dup.ts
 */

import { createClient } from '@supabase/supabase-js';
import { processQueueItem } from '../apps/api/services/websrm-adapter/queue-worker';
import { createHash } from 'crypto';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function runDuplicateSmokeTest(): Promise<{ success: boolean }> {
  console.log('🧪 [ESSAI SMOKE] Starting DUPLICATE Test...\n');

  const tenantId = process.env.WEBSRM_TEST_TENANT_ID || 'essai-tenant';

  try {
    // 1) Create test order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        branch_id: process.env.WEBSRM_TEST_BRANCH_ID || 'test-branch-essai',
        customer_name: 'ESSAI DUP Test',
        customer_phone: '514-555-0101',
        order_type: 'pickup',
        order_status: 'preparing',
        payment_status: 'paid',
        payment_method: 'card',
        items_subtotal: 10.00,
        gst_amount: 0.50,
        qst_amount: 1.00,
        total_amount: 11.50,
        subtotal: 10.00,
        tax_amount: 1.50,
        order_source: 'web',
      })
      .select()
      .single();

    if (orderError || !order) {
      throw new Error(`Failed to create order: ${orderError?.message}`);
    }

    console.log(`✅ Order created: ${order.id}`);

    // 2) Create order items
    await supabase.from('order_items').insert({
      order_id: order.id,
      menu_item_name: 'Test Item DUP',
      menu_item_price: 10.00,
      quantity: 1,
      item_total: 10.00,
    });

    // 3) Create FIRST queue item with specific idempotency key
    const idempotencyKey = createHash('sha256')
      .update(`DUP-TEST-${Date.now()}`, 'utf8')
      .digest('hex');

    const { data: queue1, error: queue1Error } = await supabase
      .from('websrm_transaction_queue')
      .insert({
        tenant_id: tenantId,
        order_id: order.id,
        idempotency_key: idempotencyKey,
        status: 'pending',
        canonical_payload_hash: '0'.repeat(64),
      })
      .select()
      .single();

    if (queue1Error || !queue1) {
      throw new Error(`Failed to create first queue item: ${queue1Error?.message}`);
    }

    console.log(`✅ First queue item created: ${queue1.id}`);
    console.log(`   Idempotency Key: ${idempotencyKey.substring(0, 20)}...\n`);

    // 4) Process FIRST queue item
    console.log('⏳ Processing first queue item...\n');
    const result1 = await processQueueItem(queue1.id);
    console.log(`   First result: ${result1.status} - ${result1.message}\n`);

    // 5) Try to create DUPLICATE queue item (same idempotency key)
    console.log('⏳ Attempting to create duplicate queue item...\n');

    const { data: queue2, error: queue2Error } = await supabase
      .from('websrm_transaction_queue')
      .insert({
        tenant_id: tenantId,
        order_id: order.id,
        idempotency_key: idempotencyKey, // SAME KEY - should fail
        status: 'pending',
        canonical_payload_hash: '0'.repeat(64),
      })
      .select()
      .single();

    // 6) Check results
    console.log('═══════════════════════════════════════════════');
    console.log('📋 ESSAI SMOKE TEST SUMMARY - DUPLICATE');
    console.log('═══════════════════════════════════════════════');
    console.log(`Order ID:          ${order.id}`);
    console.log(`Idempotency Key:   ${idempotencyKey.substring(0, 40)}...`);
    console.log(`─────────────────────────────────────────────────`);
    console.log(`First Queue ID:    ${queue1.id}`);
    console.log(`First Status:      ${result1.status}`);
    console.log(`─────────────────────────────────────────────────`);
    console.log(`Second Insert:     ${queue2Error ? 'FAILED (Expected)' : 'SUCCESS (Unexpected!)'}`);

    if (queue2Error) {
      console.log(`Error Code:        ${queue2Error.code}`);
      console.log(`Error Message:     ${queue2Error.message}`);
    }

    console.log('═══════════════════════════════════════════════');

    // Expected: Second insert should FAIL due to unique constraint
    if (queue2Error && queue2Error.code === '23505') {
      // PostgreSQL unique violation error
      console.log('✅ DUPLICATE Test PASSED - Unique constraint violation detected\n');
      return { success: true };
    } else if (queue2) {
      console.log('❌ DUPLICATE Test FAILED - Duplicate was allowed (should be rejected)\n');
      return { success: false };
    } else {
      console.log('❌ DUPLICATE Test FAILED - Unexpected error\n');
      return { success: false };
    }
  } catch (error: any) {
    console.error('❌ DUPLICATE Test FAILED - Error:', error.message);
    return { success: false };
  }
}

// Run smoke test
runDuplicateSmokeTest()
  .then((result) => {
    process.exit(result.success ? 0 : 1);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
