const express = require('express');
const router = express.Router();
const paymentMethodChangeController = require('../controllers/payment-method-change.controller');
const { requireAuthWithBranch } = require('../middleware/auth.middleware');

// Apply authentication middleware to all payment method change routes
router.use(requireAuthWithBranch);

// Validate payment method change eligibility for a specific order
router.get('/orders/:orderId/eligibility', paymentMethodChangeController.validatePaymentMethodChangeEligibility);

// Change payment method for a specific order
router.post('/orders/:orderId/change', paymentMethodChangeController.changePaymentMethod);

// Get payment method change history for current branch
router.get('/history', paymentMethodChangeController.getPaymentMethodChangeHistory);

// Get payment method change analytics for current branch
router.get('/analytics', paymentMethodChangeController.getPaymentMethodChangeAnalytics);

module.exports = router;
