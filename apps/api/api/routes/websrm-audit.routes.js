// =====================================================
// WEBSRM AUDIT LOG ROUTES
// SW-78 FO-107: Display WEB-SRM error messages (Branch Staff Access)
// =====================================================

const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth.middleware');
const websrmAuditController = require('../controllers/websrm-audit.controller');

/**
 * GET /api/v1/websrm/audit-log
 * Get WebSRM audit logs with filtering and pagination
 * Requires branch staff authentication
 *
 * Query params:
 * - branch_id: Branch ID (required if not in req.user)
 * - start_date: Filter by start date (ISO format)
 * - end_date: Filter by end date (ISO format)
 * - error_only: Only show errors (true/false)
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 50, max: 100)
 */
router.get(
  '/audit-log',
  requireAuth,
  websrmAuditController.getAuditLogs
);

/**
 * GET /api/v1/websrm/audit-log/order/:orderId
 * Get WebSRM audit logs for a specific order
 * Requires branch staff authentication
 */
router.get(
  '/audit-log/order/:orderId',
  requireAuth,
  websrmAuditController.getAuditLogsByOrderId
);

/**
 * GET /api/v1/websrm/transaction-status/:orderId
 * Get WebSRM transaction queue status for an order
 * Useful for order detail page to show current transaction status
 * Requires branch staff authentication
 */
router.get(
  '/transaction-status/:orderId',
  requireAuth,
  websrmAuditController.getTransactionStatus
);

/**
 * GET /api/v1/websrm/error-stats
 * Get error statistics for dashboard
 * Requires branch staff authentication
 *
 * Query params:
 * - branch_id: Branch ID (required if not in req.user)
 * - start_date: Filter by start date (ISO format)
 * - end_date: Filter by end date (ISO format)
 */
router.get(
  '/error-stats',
  requireAuth,
  websrmAuditController.getErrorStatistics
);

module.exports = router;
