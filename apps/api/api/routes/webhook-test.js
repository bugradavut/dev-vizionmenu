// =====================================================
// WEBHOOK TESTING ROUTES
// For testing webhook reliability and error scenarios
// =====================================================

const express = require('express');
const router = express.Router();
const webhookTestController = require('../controllers/webhook-test.controller');
const { requireAuth } = require('../middleware/auth.middleware');
const { requirePlatformAdmin } = require('../middleware/platform-admin.middleware');

// Apply platform admin auth to all webhook test routes
router.use(requirePlatformAdmin);

// =====================================================
// WEBHOOK TESTING ENDPOINTS
// =====================================================

/**
 * @route   POST /api/v1/webhook-test/simulate
 * @desc    Simulate webhook events for testing
 * @access  Private (Platform admin only)
 */
router.post('/simulate', webhookTestController.simulateWebhookEvent);

/**
 * @route   GET /api/v1/webhook-test/stats
 * @desc    Get webhook processing statistics
 * @access  Private (Platform admin only)
 */
router.get('/stats', webhookTestController.getWebhookStats);

/**
 * @route   GET /api/v1/webhook-test/health
 * @desc    Test webhook endpoint health
 * @access  Private (Platform admin only)
 */
router.get('/health', webhookTestController.testWebhookHealth);

module.exports = router;