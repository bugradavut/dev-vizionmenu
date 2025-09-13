// =====================================================
// REAL-TIME NOTIFICATIONS ROUTES
// Server-Sent Events (SSE) endpoints
// =====================================================

const express = require('express');
const router = express.Router();
const notificationsController = require('../controllers/notifications.controller');
const { requireAuth } = require('../middleware/auth.middleware');
const { requirePlatformAdmin } = require('../middleware/platform-admin.middleware');

// Apply authentication to all notification routes
router.use(requireAuth);

// =====================================================
// SSE STREAM ENDPOINT
// =====================================================

/**
 * @route   GET /api/v1/notifications/stream
 * @desc    Establish SSE connection for real-time notifications
 * @access  Private (All authenticated users)
 */
router.get('/stream', notificationsController.streamNotifications);

// =====================================================
// NOTIFICATION MANAGEMENT
// =====================================================

/**
 * @route   GET /api/v1/notifications/stats
 * @desc    Get active connection statistics
 * @access  Private (Platform admin only)
 */
router.get('/stats', requirePlatformAdmin, notificationsController.getConnectionStats);

/**
 * @route   POST /api/v1/notifications/test
 * @desc    Send test notification (development/testing)
 * @access  Private (Platform admin only)
 */
router.post('/test', requirePlatformAdmin, notificationsController.sendTestNotification);

module.exports = router;