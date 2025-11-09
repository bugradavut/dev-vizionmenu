const paymentMethodChangeService = require('../services/payment-method-change.service');
const { logActivity } = require('../helpers/audit-logger');

// Validate payment method change eligibility
const validatePaymentMethodChangeEligibility = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { newPaymentMethod } = req.query;
    const branchId = req.userBranch?.branch_id;

    if (!branchId) {
      return res.status(403).json({
        error: 'Access denied - branch context required'
      });
    }

    if (!newPaymentMethod) {
      return res.status(400).json({
        error: 'New payment method is required'
      });
    }

    const validation = await paymentMethodChangeService.validatePaymentMethodChange(
      orderId,
      newPaymentMethod,
      branchId
    );

    res.json({
      success: true,
      data: {
        eligible: validation.eligible,
        changeType: validation.changeType,
        requiresStripeRefund: validation.requiresStripeRefund,
        requiresWebsrmTransactions: validation.requiresWebsrmTransactions,
        orderNumber: validation.order.id.substring(0, 8).toUpperCase(),
        currentPaymentMethod: validation.order.payment_method,
        newPaymentMethod,
        totalAmount: validation.order.total_amount
      }
    });
  } catch (error) {
    console.error('Error validating payment method change eligibility:', error);
    res.status(400).json({
      error: 'Validation failed',
      details: error.message
    });
  }
};

// Change payment method for an order
const changePaymentMethod = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { newPaymentMethod, reason } = req.body;
    const branchId = req.userBranch?.branch_id;
    const userId = req.currentUserId;

    if (!branchId) {
      return res.status(403).json({
        error: 'Access denied - branch context required'
      });
    }

    if (!newPaymentMethod) {
      return res.status(400).json({
        error: 'New payment method is required'
      });
    }

    if (!orderId) {
      return res.status(400).json({
        error: 'Order ID is required'
      });
    }

    console.log(`Processing payment method change request: Order ${orderId}, User: ${userId}`, {
      newPaymentMethod,
      reason: reason || 'customer_request'
    });

    const result = await paymentMethodChangeService.changePaymentMethod(
      orderId,
      newPaymentMethod,
      reason || 'customer_request',
      userId,
      branchId
    );

    const response = {
      success: true,
      data: result,
      message: `Payment method changed successfully from ${result.originalPaymentMethod} to ${result.newPaymentMethod} for order ${result.orderNumber}`
    };

    // Comprehensive audit log: payment method changed
    await logActivity({
      req,
      action: 'update',
      entity: 'order',
      entityId: orderId,
      entityName: result.orderNumber,
      branchId: branchId,
      changes: {
        orderId: orderId,
        changeId: result.changeId,
        originalPaymentMethod: result.originalPaymentMethod,
        newPaymentMethod: result.newPaymentMethod,
        changeType: result.changeType,
        reason: reason,
        websrmRefundQueued: result.websrmRefundQueued,
        websrmNewQueued: result.websrmNewQueued
      }
    });

    res.json(response);
  } catch (error) {
    console.error('Error changing payment method:', error);

    // Provide user-friendly error messages
    const errorMessages = {
      'Order not found or access denied': {
        status: 404,
        error: 'Order not found',
        message: 'The order you are trying to change was not found or you do not have permission to change it.'
      },
      'Order too old': {
        status: 400,
        error: 'Change window expired',
        message: 'This order is older than 7 days and can no longer have its payment method changed.'
      },
      'Cannot change payment method for unpaid orders': {
        status: 400,
        error: 'Order not paid',
        message: 'This order has not been paid yet and cannot have its payment method changed.'
      },
      'Payment method has already been changed': {
        status: 400,
        error: 'Already changed',
        message: 'This order has already had its payment method changed.'
      },
      'Cannot change from counter payment': {
        status: 400,
        error: 'Invalid change',
        message: 'Cannot change from counter payment (cash/card) to online payment.'
      },
      'New payment method must be different': {
        status: 400,
        error: 'Same payment method',
        message: 'The new payment method must be different from the current payment method.'
      }
    };

    // Find matching error message
    let response = {
      status: 500,
      error: 'Change failed',
      message: 'An unexpected error occurred while changing the payment method. Please try again.',
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

// Get payment method change history for the current branch
const getPaymentMethodChangeHistory = async (req, res) => {
  try {
    const branchId = req.userBranch?.branch_id;
    const { limit = 50 } = req.query;

    if (!branchId) {
      return res.status(403).json({
        error: 'Access denied - branch context required'
      });
    }

    const history = await paymentMethodChangeService.getPaymentMethodChangeHistory(
      branchId,
      parseInt(limit)
    );

    res.json({
      success: true,
      data: history,
      count: history.length
    });
  } catch (error) {
    console.error('Error fetching payment method change history:', error);
    res.status(500).json({
      error: 'Failed to fetch payment method change history',
      details: error.message
    });
  }
};

// Get payment method change analytics for the current branch
const getPaymentMethodChangeAnalytics = async (req, res) => {
  try {
    const branchId = req.userBranch?.branch_id;
    const { days = 30 } = req.query;

    if (!branchId) {
      return res.status(403).json({
        error: 'Access denied - branch context required'
      });
    }

    const analytics = await paymentMethodChangeService.getPaymentMethodChangeAnalytics(
      branchId,
      parseInt(days)
    );

    res.json({
      success: true,
      data: analytics
    });
  } catch (error) {
    console.error('Error fetching payment method change analytics:', error);
    res.status(500).json({
      error: 'Failed to fetch payment method change analytics',
      details: error.message
    });
  }
};

module.exports = {
  validatePaymentMethodChangeEligibility,
  changePaymentMethod,
  getPaymentMethodChangeHistory,
  getPaymentMethodChangeAnalytics
};
