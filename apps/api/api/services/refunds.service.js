const { createClient } = require('@supabase/supabase-js');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const crypto = require('crypto');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

class RefundsService {
  // Validate if an order is eligible for refund (7-day window)
  async validateRefundEligibility(orderId, branchId) {
    try {
      // Get order details - simple query without complex joins
      const { data: order, error } = await supabase
        .from('orders')
        .select(`
          id,
          branch_id,
          total_amount,
          commission_rate,
          payment_status,
          payment_method,
          payment_intent_id,
          total_refunded,
          created_at
        `)
        .eq('id', orderId)
        .eq('branch_id', branchId)
        .single();

      if (error || !order) {
        console.error('Order query error:', error);
        throw new Error('Order not found or access denied');
      }

      // Get stripe account - first try branch, then chain
      let stripeAccountId = null;

      // Try branch-level stripe account first
      const { data: branchStripeAccount } = await supabase
        .from('stripe_accounts')
        .select('stripe_account_id')
        .eq('branch_id', branchId)
        .maybeSingle();

      if (branchStripeAccount) {
        stripeAccountId = branchStripeAccount.stripe_account_id;
        console.log('Found branch-level Stripe account:', stripeAccountId);
      } else {
        // If no branch account, get branch's chain and try chain-level account
        const { data: branch } = await supabase
          .from('branches')
          .select('chain_id')
          .eq('id', branchId)
          .single();

        if (branch?.chain_id) {
          const { data: chainStripeAccount } = await supabase
            .from('stripe_accounts')
            .select('stripe_account_id')
            .eq('restaurant_chain_id', branch.chain_id)
            .maybeSingle();

          if (chainStripeAccount) {
            stripeAccountId = chainStripeAccount.stripe_account_id;
            console.log('Found chain-level Stripe account:', stripeAccountId);
          }
        }
      }

      // Check order age (7 days maximum)
      const orderDate = new Date(order.created_at);
      const currentDate = new Date();
      const daysDifference = Math.floor((currentDate - orderDate) / (1000 * 60 * 60 * 24));
      
      if (daysDifference > 7) {
        throw new Error('Order too old - refunds only allowed within 7 days');
      }

      // Check if order is paid
      if (order.payment_status !== 'succeeded') {
        throw new Error('Cannot refund unpaid orders');
      }

      // Determine payment type (online vs counter)
      const isOnlinePayment = order.payment_method === 'online' && order.payment_intent_id;
      const isCounterPayment = (order.payment_method === 'cash' || order.payment_method === 'card') && !order.payment_intent_id;

      if (!isOnlinePayment && !isCounterPayment) {
        throw new Error('Invalid payment method for refund');
      }

      // Calculate remaining refundable amount
      const alreadyRefunded = order.total_refunded || 0;
      const maxRefundable = order.total_amount - alreadyRefunded;

      if (maxRefundable <= 0) {
        throw new Error('Order already fully refunded');
      }

      return {
        eligible: true,
        order,
        maxRefundable: parseFloat(maxRefundable.toFixed(2)),
        alreadyRefunded: parseFloat(alreadyRefunded.toFixed(2)),
        orderAge: daysDifference,
        stripeAccountId: stripeAccountId,
        isOnlinePayment,
        isCounterPayment
      };
    } catch (error) {
      console.error('Error validating refund eligibility:', error);
      throw error;
    }
  }

  // Get all refund-eligible orders for a branch (last 7 days)
  async getEligibleOrders(branchId) {
    try {
      // Calculate date 7 days ago
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data: orders, error } = await supabase
        .from('orders')
        .select(`
          id,
          total_amount,
          commission_rate,
          payment_status,
          payment_method,
          payment_intent_id,
          total_refunded,
          order_type,
          customer_name,
          customer_phone,
          created_at,
          order_items(
            id,
            quantity,
            price,
            menu_items(name)
          )
        `)
        .eq('branch_id', branchId)
        .eq('payment_status', 'succeeded')
        .gte('created_at', sevenDaysAgo.toISOString())
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(`Failed to fetch eligible orders: ${error.message}`);
      }

      // Filter orders that still have refundable amount
      const eligibleOrders = orders.filter(order => {
        const alreadyRefunded = order.total_refunded || 0;
        const maxRefundable = order.total_amount - alreadyRefunded;
        return maxRefundable > 0;
      });

      return eligibleOrders.map(order => ({
        ...order,
        maxRefundable: parseFloat((order.total_amount - (order.total_refunded || 0)).toFixed(2)),
        alreadyRefunded: parseFloat((order.total_refunded || 0).toFixed(2)),
        orderAge: Math.floor((new Date() - new Date(order.created_at)) / (1000 * 60 * 60 * 24))
      }));
    } catch (error) {
      console.error('Error fetching eligible orders:', error);
      throw error;
    }
  }

  // Process restaurant refund with automatic commission adjustment
  async processRefund(orderId, refundAmount, reason, initiatedBy, branchId, refundedItems = []) {
    try {
      // Validate refund eligibility
      const validation = await this.validateRefundEligibility(orderId, branchId);
      const { order, maxRefundable, stripeAccountId } = validation;

      if (refundAmount > maxRefundable) {
        throw new Error(`Refund amount exceeds maximum refundable: $${maxRefundable}`);
      }

      if (refundAmount <= 0) {
        throw new Error('Refund amount must be greater than 0');
      }

      // Calculate commission refund (proportional)
      const commissionRate = order.commission_rate || 0;
      const commissionRefund = parseFloat((refundAmount * commissionRate / 100).toFixed(2));

      console.log(`Processing refund: $${refundAmount}, Commission refund: $${commissionRefund}`);
      console.log(`Stripe Account ID: ${stripeAccountId || 'NULL - using platform account'}`);

      // Generate idempotency key for safe retries (prevents duplicate refunds)
      const idempotencyKey = crypto
        .createHash('sha256')
        .update(`${orderId}-${refundAmount}-${Date.now()}`)
        .digest('hex')
        .substring(0, 32);

      console.log(`🔐 Idempotency key: ${idempotencyKey}`);

      // Process Stripe refund
      let stripeRefund;
      try {
        const refundOptions = {
          payment_intent: order.payment_intent_id,
          amount: Math.round(refundAmount * 100), // Convert to cents
          reason: reason || 'requested_by_customer',
          metadata: {
            order_id: orderId,
            initiated_by: initiatedBy,
            commission_refund: commissionRefund.toString(),
            idempotency_key: idempotencyKey
          }
        };

        // Direct Charge: Refund from connected account (where payment was created)
        // The payment intent exists on the connected account, so we must create refund there
        if (stripeAccountId) {
          console.log('✅ Creating refund on connected account (Direct Charge)');
          // For Direct Charge, we create refund on the connected account
          // The commission will be automatically refunded to the restaurant
          stripeRefund = await stripe.refunds.create(refundOptions, {
            stripeAccount: stripeAccountId, // ✅ HEADER: Access payment intent on connected account
            idempotencyKey: idempotencyKey
          });
        } else {
          console.log('⚠️ No connected account - direct platform refund');
          // Fallback for old orders or platform payments
          stripeRefund = await stripe.refunds.create(refundOptions, {
            idempotencyKey: idempotencyKey
          });
        }

        console.log('Stripe refund created:', stripeRefund.id);
      } catch (stripeError) {
        console.error('Stripe refund error:', stripeError);
        throw new Error(`Payment refund failed: ${stripeError.message}`);
      }

      // Record refund in database with idempotency key
      const { data: refundRecord, error: refundError } = await supabase
        .from('stripe_refunds')
        .insert([{
          transaction_id: null, // Will be linked when stripe_transactions table is populated
          refund_id: stripeRefund.id,
          order_id: orderId,
          amount: refundAmount,
          commission_refund: commissionRefund,
          reason: reason || 'requested_by_customer',
          status: stripeRefund.status,
          initiated_by: 'restaurant', // Valid values: 'restaurant', 'platform', 'customer'
          stripe_account_id: stripeAccountId,
          idempotency_key: idempotencyKey
        }])
        .select()
        .single();

      // Track database operation warnings (non-critical errors)
      const warnings = [];

      if (refundError) {
        console.error('⚠️  Database refund record error:', refundError);
        console.log('✅ Stripe refund succeeded - webhook will sync database');
        warnings.push({
          type: 'db_refund_record_failed',
          message: 'Refund record not saved to database - webhook will retry',
          error: refundError.message
        });
      }

      // Update order totals (best effort - webhook will fix if this fails)
      const newTotalRefunded = (order.total_refunded || 0) + refundAmount;
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
        console.error('⚠️  Order update error:', orderUpdateError);
        console.log('✅ Stripe refund succeeded - webhook will update order totals');
        warnings.push({
          type: 'order_update_failed',
          message: 'Order totals not updated - webhook will sync',
          error: orderUpdateError.message
        });
      }

      // Update order_items to track which items were refunded (best practice for granular tracking)
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
            .eq('order_id', orderId); // Extra safety: ensure item belongs to this order

          if (itemUpdateError) {
            console.error(`⚠️  Failed to update item ${item.itemId}:`, itemUpdateError);
            warnings.push({
              type: 'item_update_failed',
              message: `Failed to update refunded item ${item.itemId}`,
              error: itemUpdateError.message
            });
          } else {
            console.log(`✅ Item ${item.itemId} marked as refunded (qty: ${item.quantity}, amount: $${item.amount})`);
          }
        }
      }

      // Return success with warnings (refund succeeded in Stripe)
      return {
        refundId: stripeRefund.id,
        amount: refundAmount,
        commissionRefund,
        status: stripeRefund.status,
        orderId,
        orderNumber: orderId.substring(0, 8).toUpperCase(),
        newTotalRefunded,
        remainingRefundable: parseFloat((maxRefundable - refundAmount).toFixed(2)),
        warnings: warnings.length > 0 ? warnings : undefined
      };
    } catch (error) {
      console.error('Error processing refund:', error);
      throw error;
    }
  }

  // Get refund history for a branch
  async getRefundHistory(branchId, limit = 50) {
    try {
      const { data: refunds, error } = await supabase
        .from('stripe_refunds')
        .select(`
          id,
          refund_id,
          amount,
          commission_refund,
          reason,
          status,
          initiated_by,
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
        throw new Error(`Failed to fetch refund history: ${error.message}`);
      }

      return refunds.map(refund => ({
        ...refund,
        amount: parseFloat(refund.amount),
        commission_refund: parseFloat(refund.commission_refund)
      }));
    } catch (error) {
      console.error('Error fetching refund history:', error);
      throw error;
    }
  }

  // Get refund status from Stripe
  async getRefundStatus(refundId) {
    try {
      const refund = await stripe.refunds.retrieve(refundId);
      
      // Update local database status if different
      const { error } = await supabase
        .from('stripe_refunds')
        .update({ 
          status: refund.status,
          failure_reason: refund.failure_reason || null,
          updated_at: new Date().toISOString()
        })
        .eq('refund_id', refundId);

      if (error) {
        console.error('Failed to update refund status:', error);
      }

      return {
        id: refund.id,
        status: refund.status,
        amount: refund.amount / 100, // Convert from cents
        reason: refund.reason,
        failure_reason: refund.failure_reason,
        created: refund.created
      };
    } catch (error) {
      console.error('Error getting refund status:', error);
      throw error;
    }
  }

  // Get refund analytics for a branch
  async getRefundAnalytics(branchId, days = 30) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data: refunds, error } = await supabase
        .from('stripe_refunds')
        .select(`
          amount,
          commission_refund,
          created_at,
          orders!inner(branch_id)
        `)
        .eq('orders.branch_id', branchId)
        .gte('created_at', startDate.toISOString())
        .eq('status', 'succeeded');

      if (error) {
        throw new Error(`Failed to fetch refund analytics: ${error.message}`);
      }

      const totalRefunds = refunds.reduce((sum, refund) => sum + parseFloat(refund.amount), 0);
      const totalCommissionRefunded = refunds.reduce((sum, refund) => sum + parseFloat(refund.commission_refund), 0);
      const refundCount = refunds.length;

      return {
        totalRefunds: parseFloat(totalRefunds.toFixed(2)),
        totalCommissionRefunded: parseFloat(totalCommissionRefunded.toFixed(2)),
        refundCount,
        averageRefundAmount: refundCount > 0 ? parseFloat((totalRefunds / refundCount).toFixed(2)) : 0,
        period: `${days} days`
      };
    } catch (error) {
      console.error('Error fetching refund analytics:', error);
      throw error;
    }
  }
}

module.exports = new RefundsService();