const { createClient } = require('@supabase/supabase-js');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

class RefundsService {
  // Validate if an order is eligible for refund (7-day window)
  async validateRefundEligibility(orderId, branchId) {
    try {
      // Get order details
      const { data: order, error } = await supabase
        .from('orders')
        .select(`
          id,
          order_number,
          total_amount,
          commission_rate,
          payment_status,
          payment_intent_id,
          total_refunded,
          created_at,
          branches!inner(
            id,
            restaurant_chain_id,
            stripe_accounts(stripe_account_id)
          )
        `)
        .eq('id', orderId)
        .eq('branches.id', branchId)
        .single();

      if (error || !order) {
        throw new Error('Order not found or access denied');
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

      // Check if payment was processed online (has payment_intent_id)
      if (!order.payment_intent_id) {
        throw new Error('Cannot refund counter payments through this system');
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
        stripeAccountId: order.branches.stripe_accounts?.[0]?.stripe_account_id
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
          order_number,
          total_amount,
          commission_rate,
          payment_status,
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
        .not('payment_intent_id', 'is', null)
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
  async processRefund(orderId, refundAmount, reason, initiatedBy, branchId) {
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
            commission_refund: commissionRefund.toString()
          }
        };

        // If restaurant has connected Stripe account, process through their account
        if (stripeAccountId) {
          refundOptions.reverse_transfer = true; // Take money back from restaurant
          refundOptions.refund_application_fee = true; // Refund commission to platform
          stripeRefund = await stripe.refunds.create(refundOptions, {
            stripeAccount: stripeAccountId
          });
        } else {
          // Process directly through platform account
          stripeRefund = await stripe.refunds.create(refundOptions);
        }

        console.log('Stripe refund created:', stripeRefund.id);
      } catch (stripeError) {
        console.error('Stripe refund error:', stripeError);
        throw new Error(`Payment refund failed: ${stripeError.message}`);
      }

      // Record refund in database
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
          initiated_by: initiatedBy,
          stripe_account_id: stripeAccountId
        }])
        .select()
        .single();

      if (refundError) {
        console.error('Database refund record error:', refundError);
        // Continue anyway - refund was processed in Stripe
      }

      // Update order totals
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
        console.error('Order update error:', orderUpdateError);
      }

      return {
        refundId: stripeRefund.id,
        amount: refundAmount,
        commissionRefund,
        status: stripeRefund.status,
        orderId,
        orderNumber: order.order_number,
        newTotalRefunded,
        remainingRefundable: parseFloat((maxRefundable - refundAmount).toFixed(2))
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
            order_number,
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