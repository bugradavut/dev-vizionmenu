// =====================================================
// WAITER CALLS ROUTES - SIMPLIFIED
// QR table waiter call system - minimal endpoints
// =====================================================

const express = require('express');
const waiterCallsController = require('../controllers/waiter-calls.controller');
const { requireAuth, requireAuthWithBranch } = require('../middleware/auth.middleware');

const router = express.Router();

/**
 * Create new waiter call (Public - for QR customers)
 * POST /api/v1/waiter-calls
 *
 * Body: {
 *   branch_id: string (required),
 *   table_number: number (required),
 *   zone: string (optional)
 * }
 */
router.post('/', waiterCallsController.createWaiterCall);

/**
 * Get pending waiter calls for user's branch (Protected)
 * GET /api/v1/waiter-calls/pending
 */
router.get('/pending', requireAuthWithBranch, waiterCallsController.getPendingWaiterCalls);

/**
 * Resolve waiter call (Protected)
 * DELETE /api/v1/waiter-calls/:id
 */
router.delete('/:id', requireAuth, waiterCallsController.resolveWaiterCall);

module.exports = router;