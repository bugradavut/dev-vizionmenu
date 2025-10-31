// =====================================================
// WEBSRM AUDIT LOG CONTROLLER
// SW-78 FO-107: Display WEB-SRM error messages
// =====================================================

const websrmAuditService = require('../services/websrm-audit.service');
const { handleControllerError } = require('../helpers/error-handler');

/**
 * Get WebSRM audit logs with filtering and pagination
 * GET /api/v1/websrm/audit-log
 * Requires authentication (branch staff)
 */
async function getAuditLogs(req, res) {
  try {
    // Get branch_id from authenticated user
    const branchId = req.user?.branch_id || req.query.branch_id;

    if (!branchId) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'Branch ID is required' }
      });
    }

    // Parse query parameters
    const filters = {
      startDate: req.query.start_date || null,
      endDate: req.query.end_date || null,
      errorOnly: req.query.error_only === 'true',
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 50,
    };

    // Fetch audit logs
    const result = await websrmAuditService.getAuditLogs(branchId, filters);

    res.json({
      data: {
        logs: result.logs,
        total: result.pagination.total,
        totalPages: result.pagination.totalPages,
        page: result.pagination.page,
      },
      meta: {
        message: 'WebSRM audit logs retrieved successfully',
        timestamp: new Date().toISOString(),
      },
    });

  } catch (error) {
    console.error('Get audit logs error:', error);
    handleControllerError(error, 'get WebSRM audit logs', res);
  }
}

/**
 * Get WebSRM audit logs for a specific order
 * GET /api/v1/websrm/audit-log/order/:orderId
 * Requires authentication
 */
async function getAuditLogsByOrderId(req, res) {
  try {
    const { orderId } = req.params;
    const branchId = req.user?.branch_id || req.query.branch_id;

    if (!orderId) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'Order ID is required' }
      });
    }

    if (!branchId) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'Branch ID is required' }
      });
    }

    // Fetch audit logs for this order
    const logs = await websrmAuditService.getAuditLogsByOrderId(orderId, branchId);

    res.json({
      data: {
        order_id: orderId,
        logs,
        count: logs.length,
      },
      meta: {
        message: 'Order audit logs retrieved successfully',
        timestamp: new Date().toISOString(),
      },
    });

  } catch (error) {
    console.error('Get order audit logs error:', error);
    handleControllerError(error, 'get order audit logs', res);
  }
}

/**
 * Get WebSRM transaction status for an order
 * GET /api/v1/websrm/transaction-status/:orderId
 * Requires authentication
 */
async function getTransactionStatus(req, res) {
  try {
    const { orderId } = req.params;
    const branchId = req.user?.branch_id || req.query.branch_id;

    if (!orderId) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'Order ID is required' }
      });
    }

    if (!branchId) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'Branch ID is required' }
      });
    }

    // Fetch transaction status
    const status = await websrmAuditService.getTransactionStatus(orderId, branchId);

    if (!status) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'WebSRM transaction not found for this order' }
      });
    }

    res.json({
      data: {
        order_id: orderId,
        status: status.status,
        websrm_transaction_id: status.websrm_transaction_id,
        response_code: status.response_code,
        error_message: status.error_message,
        retry_count: status.retry_count,
        max_retries: status.max_retries,
        created_at: status.created_at,
        completed_at: status.completed_at,
        last_error_at: status.last_error_at,
      },
      meta: {
        message: 'Transaction status retrieved successfully',
        timestamp: new Date().toISOString(),
      },
    });

  } catch (error) {
    console.error('Get transaction status error:', error);
    handleControllerError(error, 'get transaction status', res);
  }
}

/**
 * Get error statistics for dashboard
 * GET /api/v1/websrm/error-stats
 * Requires authentication
 */
async function getErrorStatistics(req, res) {
  try {
    const branchId = req.user?.branch_id || req.query.branch_id;

    if (!branchId) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'Branch ID is required' }
      });
    }

    const filters = {
      startDate: req.query.start_date || null,
      endDate: req.query.end_date || null,
    };

    const stats = await websrmAuditService.getErrorStatistics(branchId, filters);

    res.json({
      data: stats,
      meta: {
        message: 'Error statistics retrieved successfully',
        timestamp: new Date().toISOString(),
      },
    });

  } catch (error) {
    console.error('Get error statistics error:', error);
    handleControllerError(error, 'get error statistics', res);
  }
}

module.exports = {
  getAuditLogs,
  getAuditLogsByOrderId,
  getTransactionStatus,
  getErrorStatistics,
};
