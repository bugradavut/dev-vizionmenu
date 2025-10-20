const express = require('express');
const router = express.Router();
const refundsController = require('../controllers/refunds.controller');
const { requireAuthWithBranch } = require('../middleware/auth.middleware');

// Apply authentication middleware to all refund routes
router.use(requireAuthWithBranch);

// Get all refund-eligible orders (last 7 days) for current branch
router.get('/eligible', refundsController.getEligibleOrders);

// Process a refund for a specific order
router.post('/orders/:orderId/refund', refundsController.processRefund);

// Validate refund eligibility for a specific order
router.get('/orders/:orderId/eligibility', refundsController.validateRefundEligibility);

// Get refund history for current branch
router.get('/history', refundsController.getRefundHistory);

// Get refund status from Stripe
router.get('/:refundId/status', refundsController.getRefundStatus);

// Get refund analytics for current branch
router.get('/analytics', refundsController.getRefundAnalytics);

module.exports = router;