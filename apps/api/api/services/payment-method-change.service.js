// =====================================================
// PAYMENT METHOD CHANGE SERVICE
// Handle payment method changes for orders
// Case FO-116: Step 1 - Change payment method
// =====================================================

const { createClient } = require('@supabase/supabase-js');
const { queueWebsrmRefund } = require('./websrm-queue.service');
const { queueWebsrmTransaction } = require('./websrm-queue.service');
const stripeService = require('./stripe.service');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

class PaymentMethodChangeService {
  /**
   * Validate payment method change eligibility
   * @param {string} orderId - Order ID
   * @param {string} newPaymentMethod - New payment method (cash, card, online)
   * @param {string} branchId - Branch ID
   * @returns {Object} Validation result
   */
  async validatePaymentMethodChange(orderId, newPaymentMethod, branchId) {
    try {
      console.log(`🔍 Validating payment method change:`, {
        orderId: orderId.substring(0, 8),
        newPaymentMethod,
        branchId: branchId ? branchId.substring(0, 8) : 'undefined'
      });

      // Get order details
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .select(`
          id,
          branch_id,
          total_amount,
          payment_method,
          payment_status,
          payment_method_changed,
          original_payment_method,
          order_status,
          created_at,
          gst_amount,
          qst_amount,
          payment_intent_id,
          commission_amount
        `)
        .eq('id', orderId)
        .eq('branch_id', branchId)
        .single();

      if (orderError) {
        console.error('❌ Order query error:', orderError);
      }

      if (!order) {
        console.error('❌ Order not found with branch_id filter');
        // Try without branch_id to see if order exists
        const { data: orderWithoutBranch } = await supabase
          .from('orders')
          .select('id, branch_id')
          .eq('id', orderId)
          .single();

        if (orderWithoutBranch) {
          console.error(`❌ Order exists but belongs to different branch:`, {
            orderBranchId: orderWithoutBranch.branch_id?.substring(0, 8),
            requestedBranchId: branchId?.substring(0, 8)
          });
        }
      }

      if (orderError || !order) {
        throw new Error('Order not found or access denied');
      }

      // Check order is paid
      // Online: check payment_status === 'succeeded' (Stripe confirmation)
      // Cash/Card: check status in ['preparing', 'ready', 'completed'] (counter payment made)
      const isOnlinePayment = order.payment_method === 'online';
      const isCashCardPayment = ['cash', 'card'].includes(order.payment_method);

      if (isOnlinePayment && order.payment_status !== 'succeeded') {
        throw new Error('Cannot change payment method for unpaid online orders');
      }

      if (isCashCardPayment && !['preparing', 'ready', 'completed'].includes(order.order_status)) {
        throw new Error('Cannot change payment method - order not yet paid at counter');
      }

      // Check if already changed
      if (order.payment_method_changed) {
        throw new Error('Payment method has already been changed for this order');
      }

      // Check order age (7 days maximum)
      const orderDate = new Date(order.created_at);
      const daysDifference = Math.floor((new Date() - orderDate) / (1000 * 60 * 60 * 24));
      if (daysDifference > 7) {
        throw new Error('Order too old - payment method change only allowed within 7 days');
      }

      // Validate payment method change logic
      const currentMethod = order.payment_method;
      const allowed = this.isPaymentMethodChangeAllowed(currentMethod, newPaymentMethod);

      if (!allowed.isAllowed) {
        throw new Error(allowed.reason);
      }

      return {
        eligible: true,
        order,
        changeType: allowed.changeType,
        requiresStripeRefund: allowed.requiresStripeRefund,
        requiresWebsrmTransactions: allowed.requiresWebsrmTransactions
      };
    } catch (error) {
      console.error('Error validating payment method change:', error);
      throw error;
    }
  }

  /**
   * Check if payment method change is allowed
   * @param {string} currentMethod - Current payment method
   * @param {string} newMethod - New payment method
   * @returns {Object} Validation result
   */
  isPaymentMethodChangeAllowed(currentMethod, newMethod) {
    // Same payment method - not allowed
    if (currentMethod === newMethod) {
      return {
        isAllowed: false,
        reason: 'New payment method must be different from current payment method'
      };
    }

    // Cash/Card → Online: Not allowed (illogical - customer already at counter)
    if ((currentMethod === 'cash' || currentMethod === 'card') && newMethod === 'online') {
      return {
        isAllowed: false,
        reason: 'Cannot change from counter payment (cash/card) to online payment'
      };
    }

    // Online → Cash/Card: Allowed (refund Stripe + new payment)
    if (currentMethod === 'online' && (newMethod === 'cash' || newMethod === 'card')) {
      return {
        isAllowed: true,
        changeType: 'online_to_counter',
        requiresStripeRefund: true,
        requiresWebsrmTransactions: true
      };
    }

    // Cash ↔ Card: Allowed (both counter payments)
    if ((currentMethod === 'cash' && newMethod === 'card') ||
        (currentMethod === 'card' && newMethod === 'cash')) {
      return {
        isAllowed: true,
        changeType: 'counter_to_counter',
        requiresStripeRefund: false,
        requiresWebsrmTransactions: true
      };
    }

    // Invalid combination
    return {
      isAllowed: false,
      reason: `Invalid payment method change: ${currentMethod} → ${newMethod}`
    };
  }

  /**
   * Change payment method for an order
   * @param {string} orderId - Order ID
   * @param {string} newPaymentMethod - New payment method
   * @param {string} reason - Reason for change
   * @param {string} userId - User ID who initiated change
   * @param {string} branchId - Branch ID
   * @returns {Object} Change result
   */
  async changePaymentMethod(orderId, newPaymentMethod, reason, userId, branchId) {
    try {
      // Validate eligibility
      const validation = await this.validatePaymentMethodChange(orderId, newPaymentMethod, branchId);
      const { order, changeType, requiresStripeRefund } = validation;

      console.log(`💱 Changing payment method: ${order.payment_method} → ${newPaymentMethod} (${changeType})`);
      console.log(`📊 Order status: ${order.order_status}`);

      // Determine if WEB-SRM transactions are needed based on order status
      const isPreparing = order.order_status === 'preparing' || order.order_status === 'pending';
      const isCompleted = order.order_status === 'completed';

      if (isPreparing) {
        console.log('🔄 PREPARING status detected - VEN not yet sent to Quebec');
        console.log('✅ Will update database only, no WEB-SRM transactions needed');
      } else if (isCompleted) {
        console.log('✅ COMPLETED status detected - VEN already sent to Quebec');
        console.log('📤 Will send REM (cancel) + VEN (new payment) to Quebec');
      } else {
        console.log(`⚠️ Order status "${order.status}" - proceeding with standard flow`);
      }

      // Record payment method change
      const { data: changeRecord, error: changeError } = await supabase
        .from('payment_method_changes')
        .insert([{
          order_id: orderId,
          original_payment_method: order.payment_method,
          new_payment_method: newPaymentMethod,
          changed_by: userId,
          reason: reason || 'customer_request',
          websrm_status: isPreparing ? 'not_required' : 'pending'
        }])
        .select()
        .single();

      if (changeError) {
        console.error('⚠️ Failed to record payment method change:', changeError);
        throw new Error(`Failed to record change: ${changeError.message}`);
      }

      console.log(`✅ Payment method change recorded: ${changeRecord.id}`);

      let websrmRefundResult = { success: false, message: 'Not required' };
      let websrmNewResult = { success: false, message: 'Not required' };
      let stripeRefundId = null;

      // Only process WEB-SRM transactions for COMPLETED orders
      if (isCompleted) {
        // Handle Stripe refund for online → cash/card
        if (requiresStripeRefund) {
          console.log('💳 Processing Stripe refund for payment method change...');

          if (!order.payment_intent_id) {
            console.warn('⚠️ No Stripe payment intent ID found for order');
            throw new Error('Cannot process Stripe refund - payment intent ID missing');
          }

          try {
            const refundResult = await stripeService.createPaymentMethodChangeRefund(
              order.payment_intent_id,
              parseFloat(order.total_amount),
              'payment_method_change',
              {
                order_id: orderId,
                order_number: orderId.substring(0, 8).toUpperCase(),
                original_payment_method: order.payment_method,
                new_payment_method: newPaymentMethod,
                change_record_id: changeRecord.id
              }
            );

            stripeRefundId = refundResult.refundId;
            console.log(`✅ Stripe refund processed: ${stripeRefundId} - Status: ${refundResult.status}`);

            // Get stripe transaction details for refund record
            const { data: stripeTransaction } = await supabase
              .from('stripe_transactions')
              .select('id, stripe_account_id')
              .eq('payment_intent_id', order.payment_intent_id)
              .single();

            // Record refund in stripe_refunds table
            const { error: refundRecordError } = await supabase
              .from('stripe_refunds')
              .insert({
                refund_id: stripeRefundId,
                transaction_id: stripeTransaction?.id,
                order_id: orderId,
                amount: parseFloat(order.total_amount),
                commission_refund: parseFloat(order.commission_amount || 0),
                reason: 'requested_by_customer',     // Must be: duplicate, fraudulent, requested_by_customer, order_error
                status: refundResult.status,
                stripe_account_id: stripeTransaction?.stripe_account_id,
                initiated_by: 'restaurant'            // Must be: restaurant, platform, customer
              });

            if (refundRecordError) {
              console.warn('⚠️ Failed to record refund in stripe_refunds table:', refundRecordError);
              // Don't fail the entire operation if refund recording fails
            } else {
              console.log('✅ Refund recorded in stripe_refunds table');
            }

          } catch (stripeError) {
            console.error('❌ Stripe refund failed:', stripeError.message);
            throw new Error(`Stripe refund failed: ${stripeError.message}`);
          }
        }

        // Queue WEB-SRM transactions
        // Step 1: REM (Refund/Cancel original transaction)
        console.log('📤 Queueing WEB-SRM REM transaction (cancel original)...');
        websrmRefundResult = await queueWebsrmRefund(
          orderId,
          changeRecord.id,
          branchId,
          'payment_change',
          {
            amount: parseFloat(order.total_amount),
            refund_type: 'payment_change',
            payment_method: order.payment_method,
            gst_refund: parseFloat(order.gst_amount || 0),
            qst_refund: parseFloat(order.qst_amount || 0),
            change_to: newPaymentMethod
          }
        );

        if (websrmRefundResult.success) {
          console.log('✅ WEB-SRM REM transaction queued:', websrmRefundResult.queueId);
          await supabase
            .from('payment_method_changes')
            .update({ websrm_refund_transaction_id: websrmRefundResult.queueId })
            .eq('id', changeRecord.id);
        } else {
          console.warn('⚠️ Failed to queue WEB-SRM REM transaction:', websrmRefundResult.message);
        }

        // Step 2: VEN (New transaction with new payment method)
        console.log('📤 Queueing WEB-SRM VEN transaction (new payment)...');
        websrmNewResult = await queueWebsrmTransaction(orderId, branchId);

        if (websrmNewResult.success) {
          console.log('✅ WEB-SRM VEN transaction queued:', websrmNewResult.queueId);
          await supabase
            .from('payment_method_changes')
            .update({ websrm_new_transaction_id: websrmNewResult.queueId })
            .eq('id', changeRecord.id);
        } else {
          console.warn('⚠️ Failed to queue WEB-SRM VEN transaction:', websrmNewResult.message);
        }

        // Process WEB-SRM transactions immediately (sequential: REM then VEN)
        // Fire-and-forget background processing (same pattern as orders.service.js)
        if (websrmRefundResult.success && websrmNewResult.success) {
          setImmediate(async () => {
            try {
              console.log('[WEB-SRM] Payment method change - processing transactions immediately...');

              // Step 1: Process REM (cancel original transaction)
              console.log('[WEB-SRM] Processing REM transaction (cancel original)...');
              try {
                const { processQueueItem } = require('./websrm-compiled/queue-worker');
                const remResult = await processQueueItem(websrmRefundResult.queueId);
                console.log('[WEB-SRM] ✅ REM transaction processed:', remResult.status, '-', remResult.message);

                // Step 2: Only process VEN if REM succeeded
                if (remResult.status === 'completed') {
                  console.log('[WEB-SRM] REM successful - processing VEN transaction (new payment)...');
                  const venResult = await processQueueItem(websrmNewResult.queueId);
                  console.log('[WEB-SRM] ✅ VEN transaction processed:', venResult.status, '-', venResult.message);

                  // Update payment method change status
                  await supabase
                    .from('payment_method_changes')
                    .update({ websrm_status: 'completed' })
                    .eq('id', changeRecord.id);
                } else {
                  console.error('[WEB-SRM] ❌ REM failed - VEN not sent to maintain Quebec consistency');
                  await supabase
                    .from('payment_method_changes')
                    .update({ websrm_status: 'failed' })
                    .eq('id', changeRecord.id);
                }
              } catch (workerError) {
                // Fallback: Use JavaScript processor
                console.error('[WEB-SRM] ❌ Worker failed:', workerError.message);
                console.log('[WEB-SRM] Falling back to JavaScript processor...');
                const { processQueueItemSimple } = require('./websrm-queue-processor.service');

                // Process REM
                const { data: remQueueItem } = await supabase
                  .from('websrm_transaction_queue')
                  .select('*')
                  .eq('id', websrmRefundResult.queueId)
                  .single();

                if (remQueueItem) {
                  const remResult = await processQueueItemSimple(remQueueItem);
                  console.log('[WEB-SRM] REM processed:', remResult.status, '-', remResult.message);

                  // Process VEN only if REM succeeded
                  if (remResult.status === 'completed') {
                    const { data: venQueueItem } = await supabase
                      .from('websrm_transaction_queue')
                      .select('*')
                      .eq('id', websrmNewResult.queueId)
                      .single();

                    if (venQueueItem) {
                      const venResult = await processQueueItemSimple(venQueueItem);
                      console.log('[WEB-SRM] VEN processed:', venResult.status, '-', venResult.message);

                      await supabase
                        .from('payment_method_changes')
                        .update({ websrm_status: venResult.status === 'completed' ? 'completed' : 'failed' })
                        .eq('id', changeRecord.id);
                    }
                  } else {
                    await supabase
                      .from('payment_method_changes')
                      .update({ websrm_status: 'failed' })
                      .eq('id', changeRecord.id);
                  }
                }
              }
            } catch (error) {
              console.error('[WEB-SRM] Background transaction processing failed:', error.message);
              // Non-critical error - don't block payment method change
            }
          });
        }
      } else {
        console.log('⏭️ Skipping WEB-SRM transactions - order not completed yet');
        console.log('✅ When order completes, VEN will be sent with correct payment method');
      }

      // Update order with new payment method
      const { error: orderUpdateError } = await supabase
        .from('orders')
        .update({
          original_payment_method: order.payment_method,
          payment_method: newPaymentMethod,
          payment_method_changed: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId);

      if (orderUpdateError) {
        console.error('⚠️ Failed to update order:', orderUpdateError);
        throw new Error(`Failed to update order: ${orderUpdateError.message}`);
      }

      console.log('✅ Order payment method updated successfully');

      return {
        success: true,
        changeId: changeRecord.id,
        orderId,
        orderNumber: orderId.substring(0, 8).toUpperCase(),
        originalPaymentMethod: order.payment_method,
        newPaymentMethod,
        changeType,
        orderStatus: order.order_status,
        websrmRequired: isCompleted,
        websrmRefundQueued: websrmRefundResult.success,
        websrmNewQueued: websrmNewResult.success,
        stripeRefundId
      };
    } catch (error) {
      console.error('❌ Error changing payment method:', error);
      throw error;
    }
  }

  /**
   * Get payment method change history for a branch
   * @param {string} branchId - Branch ID
   * @param {number} limit - Number of records to return
   * @returns {Array} Payment method change history
   */
  async getPaymentMethodChangeHistory(branchId, limit = 50) {
    try {
      const { data: changes, error } = await supabase
        .from('payment_method_changes')
        .select(`
          id,
          original_payment_method,
          new_payment_method,
          reason,
          websrm_status,
          created_at,
          orders!inner(
            id,
            customer_name,
            customer_phone,
            branch_id,
            total_amount
          )
        `)
        .eq('orders.branch_id', branchId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        throw new Error(`Failed to fetch payment method change history: ${error.message}`);
      }

      return changes;
    } catch (error) {
      console.error('Error fetching payment method change history:', error);
      throw error;
    }
  }

  /**
   * Get payment method change analytics for a branch
   * @param {string} branchId - Branch ID
   * @param {number} days - Number of days to analyze
   * @returns {Object} Analytics data
   */
  async getPaymentMethodChangeAnalytics(branchId, days = 30) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data: changes, error } = await supabase
        .from('payment_method_changes')
        .select(`
          original_payment_method,
          new_payment_method,
          created_at,
          orders!inner(branch_id)
        `)
        .eq('orders.branch_id', branchId)
        .gte('created_at', startDate.toISOString());

      if (error) {
        throw new Error(`Failed to fetch payment method change analytics: ${error.message}`);
      }

      const changeCount = changes.length;

      const byChangeType = changes.reduce((acc, c) => {
        const key = `${c.original_payment_method}_to_${c.new_payment_method}`;
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {});

      return {
        changeCount,
        byChangeType,
        period: `${days} days`
      };
    } catch (error) {
      console.error('Error fetching payment method change analytics:', error);
      throw error;
    }
  }
}

module.exports = new PaymentMethodChangeService();
