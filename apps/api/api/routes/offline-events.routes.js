// =====================================================
// OFFLINE EVENTS ROUTES
// SW-78 FO-105: Track offline mode activation/deactivation
// =====================================================

const express = require('express');
const offlineEventsController = require('../controllers/offline-events.controller');
const { requireAuthWithBranch } = require('../middleware/auth.middleware');

const router = express.Router();

/**
 * Activate offline mode (Public - customer devices)
 * POST /api/v1/offline-events/activate
 *
 * Body: {
 *   branch_id: string (required),
 *   device_info: object (optional),
 *   user_agent: string (optional)
 * }
 */
router.post('/activate', offlineEventsController.activateOfflineMode);

/**
 * Deactivate offline mode (Public - customer devices)
 * POST /api/v1/offline-events/deactivate
 *
 * Body: {
 *   branch_id: string (required)
 * }
 */
router.post('/deactivate', offlineEventsController.deactivateOfflineMode);

/**
 * Increment orders created in current offline session (Public)
 * POST /api/v1/offline-events/increment-orders
 *
 * Body: {
 *   branch_id: string (required)
 * }
 */
router.post('/increment-orders', offlineEventsController.incrementOrdersCreated);

/**
 * Get offline sessions for user's branch (Protected)
 * GET /api/v1/offline-events
 *
 * Query params:
 *   start_date: ISO date string (optional)
 *   end_date: ISO date string (optional)
 *   limit: number (optional, default 50)
 */
router.get('/', requireAuthWithBranch, offlineEventsController.getOfflineSessions);

/**
 * Get active offline sessions (Protected)
 * GET /api/v1/offline-events/active
 *
 * Query params:
 *   branch_id: string (optional, defaults to user's branch)
 */
router.get('/active', requireAuthWithBranch, offlineEventsController.getActiveSessions);

module.exports = router;
