// =====================================================
// WEBSRM QUEUE CONTROLLER
// API endpoint for processing WebSRM transaction queue
// Best Practice: RESTful endpoint, auth required, production-ready
// =====================================================

const { processQueueBatch } = require('../services/websrm-queue-processor.service');

/**
 * Process pending WebSRM transactions
 *
 * POST /api/v1/websrm/process-queue
 *
 * Best Practice:
 * - Authentication required (admin/system only)
 * - Idempotent (safe to call multiple times)
 * - Production-ready (Vercel Cron compatible)
 * - Rate limiting friendly (processes batch then exits)
 *
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
async function processQueue(req, res) {
  try {
    console.log('[WebSRM Queue] Processing request from:', req.user?.email || 'system');

    // Optional: Limit batch size from request
    const batchSize = parseInt(req.query.limit) || 20;

    if (batchSize > 100) {
      return res.status(400).json({
        success: false,
        error: 'Batch size too large (max: 100)'
      });
    }

    // Process queue
    const result = await processQueueBatch(batchSize);

    // Return summary
    return res.status(200).json({
      success: true,
      data: {
        processed: result.processed,
        completed: result.completed,
        failed: result.failed,
        pending: result.pending,
        items: result.items.map(item => ({
          orderId: item.orderId,
          status: item.status,
          message: item.message
        }))
      },
      meta: {
        timestamp: new Date().toISOString(),
        batchSize
      }
    });

  } catch (error) {
    console.error('[WebSRM Queue] Error:', error.message);

    return res.status(500).json({
      success: false,
      error: 'Failed to process queue',
      message: error.message
    });
  }
}

/**
 * Get queue statistics
 *
 * GET /api/v1/websrm/queue-stats
 *
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
async function getQueueStats(req, res) {
  try {
    const { getQueueStatistics } = require('../services/websrm-queue-processor.service');

    const stats = await getQueueStatistics();

    return res.status(200).json({
      success: true,
      data: stats,
      meta: {
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('[WebSRM Queue] Stats error:', error.message);

    return res.status(500).json({
      success: false,
      error: 'Failed to get queue statistics'
    });
  }
}

module.exports = {
  processQueue,
  getQueueStats
};
