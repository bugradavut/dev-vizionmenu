const refundsService = require('../services/refunds.service');

// Get all refund-eligible orders for the current branch (last 7 days)
const getEligibleOrders = async (req, res) => {
  try {
    const { branchId } = req.user;
    
    if (!branchId) {
      return res.status(403).json({ 
        error: 'Access denied - branch context required' 
      });
    }

    const eligibleOrders = await refundsService.getEligibleOrders(branchId);
    
    res.json({
      success: true,
      data: eligibleOrders,
      count: eligibleOrders.length,
      message: `Found ${eligibleOrders.length} refund-eligible orders`
    });
  } catch (error) {
    console.error('Error fetching eligible orders:', error);
    res.status(500).json({ 
      error: 'Failed to fetch eligible orders',
      details: error.message 
    });
  }
};

// Process a refund for a specific order
const processRefund = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { amount, reason } = req.body;
    const { branchId, userId, email } = req.user;

    if (!branchId) {
      return res.status(403).json({ 
        error: 'Access denied - branch context required' 
      });
    }

    // Validate input
    if (!amount || amount <= 0) {
      return res.status(400).json({ 
        error: 'Valid refund amount is required' 
      });
    }

    if (!orderId) {
      return res.status(400).json({ 
        error: 'Order ID is required' 
      });
    }

    console.log(`Processing refund request: Order ${orderId}, Amount: $${amount}, User: ${email}`);

    const refund = await refundsService.processRefund(
      orderId,
      parseFloat(amount),
      reason || 'requested_by_customer',
      `user:${userId}`,
      branchId
    );

    res.json({
      success: true,
      data: refund,
      message: `Refund of $${refund.amount} processed successfully for order ${refund.orderNumber}`
    });
  } catch (error) {
    console.error('Error processing refund:', error);
    res.status(500).json({ 
      error: 'Failed to process refund',
      details: error.message 
    });
  }
};

// Get refund history for the current branch
const getRefundHistory = async (req, res) => {
  try {
    const { branchId } = req.user;
    const { limit = 50 } = req.query;
    
    if (!branchId) {
      return res.status(403).json({ 
        error: 'Access denied - branch context required' 
      });
    }

    const refundHistory = await refundsService.getRefundHistory(branchId, parseInt(limit));
    
    res.json({
      success: true,
      data: refundHistory,
      count: refundHistory.length
    });
  } catch (error) {
    console.error('Error fetching refund history:', error);
    res.status(500).json({ 
      error: 'Failed to fetch refund history',
      details: error.message 
    });
  }
};

// Get refund status from Stripe
const getRefundStatus = async (req, res) => {
  try {
    const { refundId } = req.params;
    const { branchId } = req.user;
    
    if (!branchId) {
      return res.status(403).json({ 
        error: 'Access denied - branch context required' 
      });
    }

    if (!refundId) {
      return res.status(400).json({ 
        error: 'Refund ID is required' 
      });
    }

    const refundStatus = await refundsService.getRefundStatus(refundId);
    
    res.json({
      success: true,
      data: refundStatus
    });
  } catch (error) {
    console.error('Error fetching refund status:', error);
    res.status(500).json({ 
      error: 'Failed to fetch refund status',
      details: error.message 
    });
  }
};

// Get refund analytics for the current branch
const getRefundAnalytics = async (req, res) => {
  try {
    const { branchId } = req.user;
    const { days = 30 } = req.query;
    
    if (!branchId) {
      return res.status(403).json({ 
        error: 'Access denied - branch context required' 
      });
    }

    const analytics = await refundsService.getRefundAnalytics(branchId, parseInt(days));
    
    res.json({
      success: true,
      data: analytics
    });
  } catch (error) {
    console.error('Error fetching refund analytics:', error);
    res.status(500).json({ 
      error: 'Failed to fetch refund analytics',
      details: error.message 
    });
  }
};

// Validate refund eligibility for a specific order
const validateRefundEligibility = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { branchId } = req.user;
    
    if (!branchId) {
      return res.status(403).json({ 
        error: 'Access denied - branch context required' 
      });
    }

    const validation = await refundsService.validateRefundEligibility(orderId, branchId);
    
    res.json({
      success: true,
      data: {
        eligible: validation.eligible,
        maxRefundable: validation.maxRefundable,
        alreadyRefunded: validation.alreadyRefunded,
        orderAge: validation.orderAge,
        orderNumber: validation.order.order_number,
        totalAmount: validation.order.total_amount,
        commissionRate: validation.order.commission_rate
      }
    });
  } catch (error) {
    console.error('Error validating refund eligibility:', error);
    res.status(400).json({ 
      error: 'Refund validation failed',
      details: error.message 
    });
  }
};

module.exports = {
  getEligibleOrders,
  processRefund,
  getRefundHistory,
  getRefundStatus,
  getRefundAnalytics,
  validateRefundEligibility
};