const refundsService = require('../services/refunds.service');
const counterRefundsService = require('../services/counter-refunds.service');
const { logActivity } = require('../helpers/audit-logger');

// Get all refund-eligible orders for the current branch (last 7 days)
const getEligibleOrders = async (req, res) => {
  try {
    const branchId = req.userBranch?.branch_id;

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
    const { amount, reason, refundedItems } = req.body;
    const branchId = req.userBranch?.branch_id;
    const userId = req.currentUserId;

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

    console.log(`Processing refund request: Order ${orderId}, Amount: $${amount}, User: ${userId}`, {
      refundedItemsCount: refundedItems?.length || 0
    });

    // Validate refund eligibility first to determine payment type
    const validation = await refundsService.validateRefundEligibility(orderId, branchId);
    const { isOnlinePayment, isCounterPayment } = validation;

    let refund;

    // Route to appropriate refund service based on payment type
    if (isOnlinePayment) {
      console.log('💳 Processing online payment refund (Stripe)');
      refund = await refundsService.processRefund(
        orderId,
        parseFloat(amount),
        reason || 'requested_by_customer',
        userId,
        branchId,
        refundedItems || []
      );
    } else if (isCounterPayment) {
      console.log('💵 Processing counter payment refund (cash/card)');

      // Determine refund type
      const orderTotal = parseFloat(validation.order.total_amount);
      const refundAmountParsed = parseFloat(amount);
      const alreadyRefunded = parseFloat(validation.alreadyRefunded);
      const willBeFullyRefunded = (alreadyRefunded + refundAmountParsed) >= orderTotal;

      let refundType = 'partial';
      if (willBeFullyRefunded) {
        refundType = 'full';
      } else if (refundAmountParsed <= 5.00) {
        // Small amount likely correction
        refundType = 'correction';
      }

      refund = await counterRefundsService.processCounterRefund(
        orderId,
        refundAmountParsed,
        refundType,
        reason || 'requested_by_customer',
        userId,
        branchId,
        refundedItems || []
      );
    } else {
      throw new Error('Invalid payment method for refund');
    }

    const response = {
      success: true,
      data: refund,
      message: `Refund of $${refund.amount} processed successfully for order ${refund.orderNumber}`,
      warnings: refund.warnings // Include any database sync warnings
    };

    // Comprehensive audit log: refund processed
    await logActivity({
      req,
      action: 'create',
      entity: 'refund',
      entityId: refund?.refundId || orderId,
      entityName: refund?.orderNumber || undefined,
      branchId: branchId,
      changes: {
        orderId: orderId,
        refundId: refund?.refundId,
        amount: refund?.amount || amount,
        commissionRefund: refund?.commissionRefund,
        reason: reason,
        status: refund?.status,
        totalRefunded: refund?.newTotalRefunded,
        remainingRefundable: refund?.remainingRefundable,
        warnings: refund?.warnings ? refund.warnings.map(w => w.type) : []
      }
    });

    res.json(response);
  } catch (error) {
    console.error('Error processing refund:', error);

    // Provide user-friendly error messages
    const errorMessages = {
      'Order not found or access denied': {
        status: 404,
        error: 'Order not found',
        message: 'The order you are trying to refund was not found or you do not have permission to refund it.'
      },
      'Order too old': {
        status: 400,
        error: 'Refund window expired',
        message: 'This order is older than 7 days and can no longer be refunded.'
      },
      'Cannot refund unpaid orders': {
        status: 400,
        error: 'Order not paid',
        message: 'This order has not been paid yet and cannot be refunded.'
      },
      'Invalid payment method for refund': {
        status: 400,
        error: 'Invalid payment method',
        message: 'This order has an invalid payment method and cannot be refunded.'
      },
      'Order already fully refunded': {
        status: 400,
        error: 'Already refunded',
        message: 'This order has already been fully refunded.'
      },
      'Payment refund failed': {
        status: 500,
        error: 'Payment gateway error',
        message: 'The refund could not be processed by Stripe. Please try again or contact support.'
      }
    };

    // Find matching error message
    let response = {
      status: 500,
      error: 'Refund failed',
      message: 'An unexpected error occurred while processing the refund. Please try again.',
      details: error.message
    };

    for (const [key, value] of Object.entries(errorMessages)) {
      if (error.message.includes(key)) {
        response = { ...value, details: error.message };
        break;
      }
    }

    res.status(response.status).json({
      error: response.error,
      message: response.message,
      details: response.details
    });
  }
};

// Get refund history for the current branch
const getRefundHistory = async (req, res) => {
  try {
    const branchId = req.userBranch?.branch_id;
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
    const branchId = req.userBranch?.branch_id;

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
    const branchId = req.userBranch?.branch_id;
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
    const branchId = req.userBranch?.branch_id;

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
        orderNumber: validation.order.id.substring(0, 8).toUpperCase(),
        totalAmount: validation.order.total_amount,
        commissionRate: validation.order.commission_rate,
        paymentMethod: validation.order.payment_method,
        isOnlinePayment: validation.isOnlinePayment,
        isCounterPayment: validation.isCounterPayment
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
