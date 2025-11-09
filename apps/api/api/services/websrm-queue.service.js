// =====================================================
// WEBSRM QUEUE SERVICE
// Simple JavaScript wrapper for WebSRM transaction queueing
// SW-78 FO-106: Queue transactions for Quebec SRS certification
// =====================================================

const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

// Create Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Queue WebSRM transaction for an order
 *
 * Best practice implementation:
 * - Direct database insert (no TypeScript dependencies)
 * - Idempotency check (prevent duplicates)
 * - Non-blocking (promise-based)
 * - Minimal dependencies
 *
 * @param {string} orderId - Order UUID
 * @param {string} branchId - Branch UUID (used as tenant_id)
 * @returns {Promise<{success: boolean, queueId?: string, message: string}>}
 */
async function queueWebsrmTransaction(orderId, branchId) {
  try {
    // Validate inputs
    if (!orderId || !branchId) {
      return {
        success: false,
        message: 'Missing orderId or branchId'
      };
    }

    // Check if already queued (idempotency)
    const { data: existing } = await supabase
      .from('websrm_transaction_queue')
      .select('id, status')
      .eq('order_id', orderId)
      .eq('tenant_id', branchId)
      .maybeSingle();

    if (existing) {
      console.log(`[WEB-SRM] Order ${orderId} already queued with status: ${existing.status}`);
      return {
        success: false,
        queueId: existing.id,
        message: `Already queued: ${existing.status}`
      };
    }

    // Verify order exists
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, total_amount, branch_id')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      console.error('[WEB-SRM] Order not found:', orderId);
      return {
        success: false,
        message: 'Order not found'
      };
    }

    // Generate idempotency key
    const idempotencyKey = crypto
      .createHash('sha256')
      .update(`${branchId}|${orderId}|${new Date().toISOString()}`, 'utf8')
      .digest('hex');

    console.log('[WEB-SRM] Inserting transaction to queue:', {
      orderId: orderId.substring(0, 8),
      branchId: branchId.substring(0, 8),
      idempotencyKey: idempotencyKey.substring(0, 16) + '...'
    });

    // Insert into queue
    const { data: queueItem, error: insertError } = await supabase
      .from('websrm_transaction_queue')
      .insert({
        tenant_id: branchId,
        order_id: orderId,
        idempotency_key: idempotencyKey,
        status: 'pending',
        canonical_payload_hash: '0'.repeat(64), // Placeholder - updated during processing
        max_retries: 5,
        retry_count: 0,
        scheduled_at: new Date().toISOString()
      })
      .select()
      .single();

    if (insertError || !queueItem) {
      console.error('[WEB-SRM] Failed to insert queue item:', insertError?.message);
      return {
        success: false,
        message: `Failed to enqueue: ${insertError?.message}`
      };
    }

    console.log('[WEB-SRM] Transaction queued successfully:', {
      queueId: queueItem.id.substring(0, 8),
      orderId: orderId.substring(0, 8),
      status: queueItem.status
    });

    return {
      success: true,
      queueId: queueItem.id,
      message: 'Transaction queued successfully'
    };

  } catch (error) {
    console.error('[WEB-SRM] Unexpected error in queueWebsrmTransaction:', error.message);
    return {
      success: false,
      message: `Unexpected error: ${error.message}`
    };
  }
}

/**
 * Queue WebSRM refund transaction (REM type)
 * Case FO-116: Step 2, 3, 4 - Refund transactions
 *
 * @param {string} orderId - Order UUID
 * @param {string} refundId - Counter refund ID or Stripe refund ID
 * @param {string} branchId - Branch UUID (used as tenant_id)
 * @param {string} refundType - 'counter' or 'online'
 * @param {Object} metadata - Additional refund metadata
 * @returns {Promise<{success: boolean, queueId?: string, message: string}>}
 */
async function queueWebsrmRefund(orderId, refundId, branchId, refundType, metadata = {}) {
  try {
    // Validate inputs
    if (!orderId || !refundId || !branchId) {
      return {
        success: false,
        message: 'Missing orderId, refundId, or branchId'
      };
    }

    // Check if already queued (idempotency by refundId)
    const { data: existing } = await supabase
      .from('websrm_transaction_queue')
      .select('id, status')
      .eq('order_id', orderId)
      .eq('metadata->>refund_id', refundId)
      .maybeSingle();

    if (existing) {
      console.log(`[WEB-SRM] Refund ${refundId} already queued with status: ${existing.status}`);
      return {
        success: false,
        queueId: existing.id,
        message: `Already queued: ${existing.status}`
      };
    }

    // Verify order exists
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, total_amount, branch_id')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      console.error('[WEB-SRM] Order not found:', orderId);
      return {
        success: false,
        message: 'Order not found'
      };
    }

    // Generate idempotency key (unique per refund)
    const idempotencyKey = crypto
      .createHash('sha256')
      .update(`${branchId}|${orderId}|refund|${refundId}|${new Date().toISOString()}`, 'utf8')
      .digest('hex');

    console.log('[WEB-SRM] Inserting REFUND transaction to queue:', {
      orderId: orderId.substring(0, 8),
      refundId: refundId.substring(0, 8),
      branchId: branchId.substring(0, 8),
      refundType,
      idempotencyKey: idempotencyKey.substring(0, 16) + '...'
    });

    // Insert into queue with refund metadata
    // IMPORTANT: Use original_payment_method from metadata (not order.payment_method)
    // For payment changes, order may already be updated with new payment method
    const { data: queueItem, error: insertError } = await supabase
      .from('websrm_transaction_queue')
      .insert({
        tenant_id: branchId,
        order_id: orderId,
        idempotency_key: idempotencyKey,
        status: 'pending',
        canonical_payload_hash: '0'.repeat(64), // Placeholder - updated during processing
        max_retries: 5,
        retry_count: 0,
        scheduled_at: new Date().toISOString(),
        metadata: {
          transaction_type: 'REM', // Refund type (negative closing receipt)
          refund_id: refundId,
          refund_type: refundType, // 'counter' or 'online' or 'payment_change'
          ...metadata // Contains original_payment_method for payment changes
        }
      })
      .select()
      .single();

    if (insertError || !queueItem) {
      console.error('[WEB-SRM] Failed to insert refund queue item:', insertError?.message);
      return {
        success: false,
        message: `Failed to enqueue refund: ${insertError?.message}`
      };
    }

    console.log('[WEB-SRM] Refund transaction queued successfully:', {
      queueId: queueItem.id.substring(0, 8),
      orderId: orderId.substring(0, 8),
      refundId: refundId.substring(0, 8),
      status: queueItem.status
    });

    return {
      success: true,
      queueId: queueItem.id,
      message: 'Refund transaction queued successfully'
    };

  } catch (error) {
    console.error('[WEB-SRM] Unexpected error in queueWebsrmRefund:', error.message);
    return {
      success: false,
      message: `Unexpected error: ${error.message}`
    };
  }
}

module.exports = {
  queueWebsrmTransaction,
  queueWebsrmRefund
};
