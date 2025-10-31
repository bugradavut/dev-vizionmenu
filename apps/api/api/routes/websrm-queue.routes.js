// =====================================================
// WEBSRM QUEUE ROUTES
// API endpoints for WebSRM transaction queue management
// =====================================================

const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth.middleware');
const websrmQueueController = require('../controllers/websrm-queue.controller');

/**
 * POST /api/v1/websrm/process-queue
 * Process pending WebSRM transactions
 *
 * Best Practice:
 * - Requires authentication
 * - Idempotent (safe to call multiple times)
 * - Production-ready (Vercel Cron compatible)
 *
 * Query params:
 * - limit: Max items to process (default: 20, max: 100)
 *
 * Response:
 * {
 *   success: true,
 *   data: {
 *     processed: 5,
 *     completed: 4,
 *     failed: 1,
 *     pending: 10,
 *     items: [...]
 *   }
 * }
 */
router.post('/process-queue', requireAuth, websrmQueueController.processQueue);

/**
 * GET /api/v1/websrm/queue-stats
 * Get queue statistics
 *
 * Response:
 * {
 *   success: true,
 *   data: {
 *     pending: 10,
 *     processing: 2,
 *     completed: 50,
 *     failed: 3,
 *     total: 65
 *   }
 * }
 */
router.get('/queue-stats', requireAuth, websrmQueueController.getQueueStats);

module.exports = router;
