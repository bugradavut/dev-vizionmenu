// =====================================================
// COUNTER REFUNDS SERVICE
// Handle refunds for counter payments (cash/card)
// Case FO-116: Step 2, 3, 4
// =====================================================

const { createClient } = require('@supabase/supabase-js');
const { queueWebsrmRefund } = require('./websrm-queue.service');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

class CounterRefundsService {
  /**
   * Process counter payment refund (cash or card)
   * @param {string} orderId - Order ID
   * @param {number} refundAmount - Amount to refund
   * @param {string} refundType - 'full', 'partial', or 'correction'
   * @param {string} reason - Refund reason
   * @param {string} initiatedBy - User ID who initiated refund
   * @param {string} branchId - Branch ID
   * @param {Array} refundedItems - Array of {itemId, quantity, amount}
   * @returns {Object} Refund result
   */
  async processCounterRefund(orderId, refundAmount, refundType, reason, initiatedBy, branchId, refundedItems = []) {
    try {
      // Get order details
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .select(`
          id,
          branch_id,
          total_amount,
          payment_method,
          payment_status,
          total_refunded,
          created_at,
          gst_amount,
          qst_amount
        `)
        .eq('id', orderId)
        .eq('branch_id', branchId)
        .single();

      if (orderError || !order) {
        throw new Error('Order not found or access denied');
      }

      // Validate order is counter payment
      if (order.payment_method !== 'cash' && order.payment_method !== 'card') {
        throw new Error(`Cannot process counter refund for payment method: ${order.payment_method}`);
      }

      // Check order is paid
      if (order.payment_status !== 'succeeded') {
        throw new Error('Cannot refund unpaid orders');
      }

      // Check order age (7 days maximum)
      const orderDate = new Date(order.created_at);
      const daysDifference = Math.floor((new Date() - orderDate) / (1000 * 60 * 60 * 24));
      if (daysDifference > 7) {
        throw new Error('Order too old - refunds only allowed within 7 days');
      }

      // Validate refund amount
      const alreadyRefunded = parseFloat(order.total_refunded || 0);
      const maxRefundable = parseFloat(order.total_amount) - alreadyRefunded;

      if (refundAmount > maxRefundable) {
        throw new Error(`Refund amount ($${refundAmount}) exceeds maximum refundable: $${maxRefundable}`);
      }

      if (refundAmount <= 0) {
        throw new Error('Refund amount must be greater than 0');
      }

      console.log(`💵 Processing counter refund: $${refundAmount} (${order.payment_method})`);

      // Calculate proportional tax refund
      const refundRatio = refundAmount / parseFloat(order.total_amount);
      const gstRefund = parseFloat((parseFloat(order.gst_amount || 0) * refundRatio).toFixed(2));
      const qstRefund = parseFloat((parseFloat(order.qst_amount || 0) * refundRatio).toFixed(2));

      console.log(`📊 Tax refunds - GST: $${gstRefund}, QST: $${qstRefund}`);

      // Record counter refund in database
      const { data: counterRefund, error: refundError } = await supabase
        .from('counter_refunds')
        .insert([{
          order_id: orderId,
          amount: refundAmount,
          payment_method: order.payment_method,
          refund_type: refundType,
          refunded_items: refundedItems,
          initiated_by: initiatedBy,
          reason: reason || 'requested_by_customer',
          websrm_status: 'pending'
        }])
        .select()
        .single();

      if (refundError) {
        console.error('⚠️ Failed to record counter refund:', refundError);
        throw new Error(`Failed to record refund: ${refundError.message}`);
      }

      console.log(`✅ Counter refund recorded: ${counterRefund.id}`);

      // Update order totals
      const newTotalRefunded = alreadyRefunded + refundAmount;
      const newRefundCount = (order.refund_count || 0) + 1;

      const { error: orderUpdateError } = await supabase
        .from('orders')
        .update({
          total_refunded: newTotalRefunded,
          refund_count: newRefundCount,
          last_refund_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId);

      if (orderUpdateError) {
        console.error('⚠️ Failed to update order totals:', orderUpdateError);
      }

      // Update order_items if refunding specific items
      if (refundedItems && refundedItems.length > 0) {
        console.log(`📦 Updating ${refundedItems.length} refunded items...`);

        for (const item of refundedItems) {
          const { error: itemUpdateError } = await supabase
            .from('order_items')
            .update({
              refunded_quantity: item.quantity,
              refund_amount: item.amount
            })
            .eq('id', item.itemId)
            .eq('order_id', orderId);

          if (itemUpdateError) {
            console.error(`⚠️ Failed to update item ${item.itemId}:`, itemUpdateError);
          } else {
            console.log(`✅ Item ${item.itemId} marked as refunded`);
          }
        }
      }

      // Queue WEB-SRM REM (Refund) transaction
      // Case FO-116: Step 2, 3, 4 - Send refund to Quebec
      const websrmResult = await queueWebsrmRefund(
        orderId,
        counterRefund.id,
        order.branch_id,
        'counter',
        {
          amount: refundAmount,
          refund_type: refundType,
          payment_method: order.payment_method,
          gst_refund: gstRefund,
          qst_refund: qstRefund
        }
      );

      if (websrmResult.success) {
        console.log('✅ WEB-SRM REM transaction queued:', websrmResult.queueId);
        // Update counter_refund with queue ID
        await supabase
          .from('counter_refunds')
          .update({ websrm_transaction_id: websrmResult.queueId })
          .eq('id', counterRefund.id);
      } else {
        console.warn('⚠️ Failed to queue WEB-SRM REM transaction:', websrmResult.message);
        // Don't fail the refund if WEB-SRM queueing fails - it can be retried later
      }

      return {
        success: true,
        refundId: counterRefund.id,
        amount: refundAmount,
        refundType,
        paymentMethod: order.payment_method,
        orderId,
        orderNumber: orderId.substring(0, 8).toUpperCase(),
        newTotalRefunded,
        remainingRefundable: parseFloat((maxRefundable - refundAmount).toFixed(2)),
        gstRefund,
        qstRefund
      };
    } catch (error) {
      console.error('❌ Error processing counter refund:', error);
      throw error;
    }
  }

  /**
   * Get counter refund history for a branch
   * @param {string} branchId - Branch ID
   * @param {number} limit - Number of records to return
   * @returns {Array} Counter refund history
   */
  async getCounterRefundHistory(branchId, limit = 50) {
    try {
      const { data: refunds, error } = await supabase
        .from('counter_refunds')
        .select(`
          id,
          amount,
          payment_method,
          refund_type,
          reason,
          websrm_status,
          created_at,
          orders!inner(
            id,
            customer_name,
            customer_phone,
            branch_id
          )
        `)
        .eq('orders.branch_id', branchId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        throw new Error(`Failed to fetch counter refund history: ${error.message}`);
      }

      return refunds.map(refund => ({
        ...refund,
        amount: parseFloat(refund.amount)
      }));
    } catch (error) {
      console.error('Error fetching counter refund history:', error);
      throw error;
    }
  }

  /**
   * Get counter refund analytics for a branch
   * @param {string} branchId - Branch ID
   * @param {number} days - Number of days to analyze
   * @returns {Object} Analytics data
   */
  async getCounterRefundAnalytics(branchId, days = 30) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data: refunds, error } = await supabase
        .from('counter_refunds')
        .select(`
          amount,
          payment_method,
          refund_type,
          created_at,
          orders!inner(branch_id)
        `)
        .eq('orders.branch_id', branchId)
        .gte('created_at', startDate.toISOString());

      if (error) {
        throw new Error(`Failed to fetch counter refund analytics: ${error.message}`);
      }

      const totalRefunds = refunds.reduce((sum, r) => sum + parseFloat(r.amount), 0);
      const refundCount = refunds.length;

      const byPaymentMethod = refunds.reduce((acc, r) => {
        acc[r.payment_method] = (acc[r.payment_method] || 0) + parseFloat(r.amount);
        return acc;
      }, {});

      const byRefundType = refunds.reduce((acc, r) => {
        acc[r.refund_type] = (acc[r.refund_type] || 0) + 1;
        return acc;
      }, {});

      return {
        totalRefunds: parseFloat(totalRefunds.toFixed(2)),
        refundCount,
        averageRefundAmount: refundCount > 0 ? parseFloat((totalRefunds / refundCount).toFixed(2)) : 0,
        byPaymentMethod,
        byRefundType,
        period: `${days} days`
      };
    } catch (error) {
      console.error('Error fetching counter refund analytics:', error);
      throw error;
    }
  }
}

module.exports = new CounterRefundsService();
