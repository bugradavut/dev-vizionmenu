/**
 * WEB-SRM ESSAI Smoke Test - ENR (Basic Sale)
 *
 * Purpose: Test basic sale transaction (ENR - Enregistrement)
 * Expected: OK - Transaction completed successfully
 *
 * Usage:
 *   WEBSRM_ENABLED=true WEBSRM_NETWORK_ENABLED=true WEBSRM_ENV=ESSAI \
 *   ts-node scripts/websrm-smoke-enr.ts
 */

import { createClient } from '@supabase/supabase-js';
import { enqueueOrder, processQueueItem } from '../apps/api/services/websrm-adapter/queue-worker';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface SmokeTestResult {
  success: boolean;
  queueId?: string;
  orderId?: string;
  status?: string;
  codRetour?: string;
  auditId?: string;
  error?: string;
}

async function runEnrSmokeTest(): Promise<SmokeTestResult> {
  console.log('🧪 [ESSAI SMOKE] Starting ENR (Basic Sale) Test...\n');

  // 1) Create test order (simple sale)
  const testOrder = {
    customer: {
      name: 'ESSAI Test Customer',
      phone: '514-555-0100',
      email: 'essai@test.local',
    },
    items: [
      {
        name: 'Pizza Margherita',
        price: 15.99,
        quantity: 1,
        special_instructions: null,
      },
    ],
    orderType: 'pickup',
    paymentMethod: 'card',
    source: 'web',
    pricing: {
      itemsTotal: 15.99,
      discountAmount: 0,
      deliveryFee: 0,
      gst: 0.80, // 5%
      qst: 1.59, // 9.975%
      tipAmount: 0,
      finalTotal: 18.38,
    },
  };

  try {
    // 2) Create order in database
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        branch_id: process.env.WEBSRM_TEST_BRANCH_ID || 'test-branch-essai',
        customer_name: testOrder.customer.name,
        customer_phone: testOrder.customer.phone,
        customer_email: testOrder.customer.email,
        order_type: testOrder.orderType,
        order_status: 'preparing',
        payment_status: 'paid',
        payment_method: testOrder.paymentMethod,
        items_subtotal: testOrder.pricing.itemsTotal,
        discount_amount: testOrder.pricing.discountAmount,
        delivery_fee: testOrder.pricing.deliveryFee,
        gst_amount: testOrder.pricing.gst,
        qst_amount: testOrder.pricing.qst,
        tip_amount: testOrder.pricing.tipAmount,
        total_amount: testOrder.pricing.finalTotal,
        subtotal: testOrder.pricing.itemsTotal,
        tax_amount: testOrder.pricing.gst + testOrder.pricing.qst,
        order_source: 'web',
        commission_rate: 0.03,
        commission_amount: (testOrder.pricing.finalTotal * 0.03),
        net_amount: (testOrder.pricing.finalTotal * 0.97),
      })
      .select()
      .single();

    if (orderError || !order) {
      throw new Error(`Failed to create order: ${orderError?.message}`);
    }

    console.log(`✅ Order created: ${order.id}`);

    // 3) Create order items
    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(
        testOrder.items.map((item) => ({
          order_id: order.id,
          menu_item_name: item.name,
          menu_item_price: item.price,
          quantity: item.quantity,
          item_total: item.price * item.quantity,
          special_instructions: item.special_instructions,
        }))
      );

    if (itemsError) {
      throw new Error(`Failed to create order items: ${itemsError.message}`);
    }

    console.log(`✅ Order items created\n`);

    // 4) Enqueue for WEB-SRM
    const tenantId = process.env.WEBSRM_TEST_TENANT_ID || 'essai-tenant';
    const enqueueResult = await enqueueOrder(order.id, tenantId);

    if (!enqueueResult.success) {
      throw new Error(`Failed to enqueue: ${enqueueResult.message}`);
    }

    console.log(`✅ Enqueued: ${enqueueResult.queueId}\n`);

    // 5) Process queue item
    console.log('⏳ Processing queue item...\n');
    const processResult = await processQueueItem(enqueueResult.queueId!);

    console.log(`📊 Process Result:`);
    console.log(`   Status: ${processResult.status}`);
    console.log(`   Message: ${processResult.message}\n`);

    // 6) Get queue item details
    const { data: queueItem } = await supabase
      .from('websrm_transaction_queue')
      .select('*')
      .eq('id', enqueueResult.queueId)
      .single();

    // 7) Get audit log
    const { data: auditLog } = await supabase
      .from('websrm_audit_log')
      .select('*')
      .eq('order_id', order.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    // 8) Get receipt
    const { data: receipt } = await supabase
      .from('receipts')
      .select('*')
      .eq('order_id', order.id)
      .single();

    // 9) Print summary
    console.log('═══════════════════════════════════════════════');
    console.log('📋 ESSAI SMOKE TEST SUMMARY - ENR');
    console.log('═══════════════════════════════════════════════');
    console.log(`Order ID:          ${order.id}`);
    console.log(`Queue ID:          ${enqueueResult.queueId}`);
    console.log(`Queue Status:      ${queueItem?.status || 'N/A'}`);
    console.log(`Response Code:     ${queueItem?.response_code || 'N/A'}`);
    console.log(`Retry Count:       ${queueItem?.retry_count || 0}`);
    console.log(`─────────────────────────────────────────────────`);
    console.log(`Audit Log ID:      ${auditLog?.id || 'N/A'}`);
    console.log(`HTTP Status:       ${auditLog?.response_status || 'N/A'}`);
    console.log(`Cod Retour:        ${auditLog?.cod_retour || 'N/A'}`);
    console.log(`Duration:          ${auditLog?.duration_ms || 'N/A'}ms`);
    console.log(`Error Code:        ${auditLog?.error_code || 'OK'}`);
    console.log(`─────────────────────────────────────────────────`);
    console.log(`Receipt ID:        ${receipt?.id || 'N/A'}`);
    console.log(`Signa Actu:        ${receipt?.signa_actu?.substring(0, 20) || 'N/A'}...`);
    console.log(`Payload Hash:      ${receipt?.payload_hash?.substring(0, 20) || 'N/A'}...`);
    console.log(`QR Length:         ${receipt?.qr_data?.length || 0} chars`);
    console.log(`Device ID:         ${receipt?.device_id || 'N/A'}`);
    console.log(`Environment:       ${receipt?.env || 'N/A'}`);
    console.log('═══════════════════════════════════════════════');

    // Validate CASESSAI (if ESSAI env)
    if (process.env.WEBSRM_ENV === 'ESSAI' && process.env.WEBSRM_CASESSAI) {
      console.log(`\n🔍 CASESSAI Validation:`);
      console.log(`   Expected:          ${process.env.WEBSRM_CASESSAI}`);
      console.log(`   Status:            ✅ ESSAI mode active\n`);
    }

    if (processResult.status === 'completed') {
      console.log('✅ ENR Test PASSED - Transaction completed successfully\n');
      return {
        success: true,
        queueId: enqueueResult.queueId,
        orderId: order.id,
        status: queueItem?.status,
        codRetour: auditLog?.cod_retour || undefined,
        auditId: auditLog?.id,
      };
    } else {
      console.log('❌ ENR Test FAILED - Transaction not completed\n');
      return {
        success: false,
        queueId: enqueueResult.queueId,
        orderId: order.id,
        status: queueItem?.status,
        codRetour: auditLog?.cod_retour || undefined,
        error: processResult.message,
      };
    }
  } catch (error: any) {
    console.error('❌ ENR Test FAILED - Error:', error.message);
    return {
      success: false,
      error: error.message,
    };
  }
}

// Run smoke test
runEnrSmokeTest()
  .then((result) => {
    process.exit(result.success ? 0 : 1);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
