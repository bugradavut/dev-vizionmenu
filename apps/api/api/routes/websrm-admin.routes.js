// =====================================================
// WEB-SRM ADMIN ROUTES - Phase 7
// Admin-only endpoints for WEB-SRM queue management
// =====================================================

const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth.middleware');
const { requirePlatformAdmin } = require('../middleware/platform-admin.middleware');

/**
 * Security: DEV/ESSAI only - Production hard block
 */
function requireNonProduction(req, res, next) {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({
      success: false,
      error: 'WEB-SRM admin endpoints disabled in production',
    });
  }
  next();
}

/**
 * POST /api/v1/admin/websrm/enqueue/:orderId
 * Manually enqueue an order for WEB-SRM processing
 *
 * Security: Platform admin only, DEV/ESSAI only
 */
router.post(
  '/enqueue/:orderId',
  requireAuth,
  requirePlatformAdmin,
  requireNonProduction,
  async (req, res) => {
    try {

      const { orderId } = req.params;
      const { tenantId } = req.body;

      if (!tenantId) {
        return res.status(400).json({
          success: false,
          error: 'tenantId required in request body',
        });
      }

      // Import queue worker
      const { enqueueOrder } = require('../../services/websrm-adapter/queue-worker');

      const result = await enqueueOrder(orderId, tenantId);

      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: result.message,
        });
      }

      return res.status(200).json({
        success: true,
        message: result.message,
        queueId: result.queueId,
      });
    } catch (error) {
      console.error('[WEB-SRM] Enqueue error:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to enqueue order',
      });
    }
  }
);

/**
 * POST /api/v1/admin/websrm/consume-once
 * Process pending queue items (one batch)
 *
 * Query params:
 * - limit: Max items to process (default: 20)
 *
 * Security: Platform admin only, DEV/ESSAI only
 */
router.post(
  '/consume-once',
  requireAuth,
  requirePlatformAdmin,
  requireNonProduction,
  async (req, res) => {
    try {

      const limit = parseInt(req.query.limit) || 20;

      if (limit < 1 || limit > 100) {
        return res.status(400).json({
          success: false,
          error: 'Limit must be between 1 and 100',
        });
      }

      // Import queue worker
      const { consumeQueue } = require('../../services/websrm-adapter/queue-worker');

      const result = await consumeQueue(limit);

      return res.status(200).json({
        success: true,
        summary: {
          processed: result.processed,
          completed: result.completed,
          pending: result.pending,
          failed: result.failed,
        },
        items: result.items,
      });
    } catch (error) {
      console.error('[WEB-SRM] Consume queue error:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to consume queue',
      });
    }
  }
);

/**
 * GET /api/v1/admin/websrm/queue/status
 * Get queue statistics
 *
 * Security: Platform admin only, DEV/ESSAI only
 */
router.get(
  '/queue/status',
  requireAuth,
  requirePlatformAdmin,
  requireNonProduction,
  async (req, res) => {
    try {

      const { createClient } = require('@supabase/supabase-js');
      const supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      );

      // Get status counts
      const { data: statusCounts, error } = await supabase
        .from('websrm_transaction_queue')
        .select('status')
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      // Aggregate counts
      const counts = {
        total: statusCounts.length,
        pending: statusCounts.filter((r) => r.status === 'pending').length,
        processing: statusCounts.filter((r) => r.status === 'processing').length,
        completed: statusCounts.filter((r) => r.status === 'completed').length,
        failed: statusCounts.filter((r) => r.status === 'failed').length,
        cancelled: statusCounts.filter((r) => r.status === 'cancelled').length,
      };

      return res.status(200).json({
        success: true,
        stats: counts,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('[WEB-SRM] Queue status error:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to get queue status',
      });
    }
  }
);

/**
 * GET /api/v1/admin/websrm/audit-logs
 * Get recent audit logs
 *
 * Query params:
 * - limit: Max logs to return (default: 50, max: 200)
 * - orderId: Filter by order ID (optional)
 *
 * Security: Platform admin only, DEV/ESSAI only
 */
router.get(
  '/audit-logs',
  requireAuth,
  requirePlatformAdmin,
  requireNonProduction,
  async (req, res) => {
    try {

      const limit = Math.min(parseInt(req.query.limit) || 50, 200);
      const { orderId } = req.query;

      const { createClient } = require('@supabase/supabase-js');
      const supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      );

      let query = supabase
        .from('websrm_audit_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (orderId) {
        query = query.eq('order_id', orderId);
      }

      const { data: logs, error } = await query;

      if (error) {
        throw error;
      }

      return res.status(200).json({
        success: true,
        logs: logs || [],
        count: logs?.length || 0,
      });
    } catch (error) {
      console.error('[WEB-SRM] Audit logs error:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to get audit logs',
      });
    }
  }
);

module.exports = router;
