/**
 * Activity Logs Controller
 * Handles HTTP requests for activity logs functionality
 */

const activityLogsService = require('../services/activity-logs.service');
const { handleControllerError } = require('../helpers/error-handler');

class ActivityLogsController {
  /**
   * Get activity logs for a restaurant chain
   * GET /api/v1/reports/activity-logs
   */
  async getActivityLogs(req, res) {
    try {
      const {
        chainId,
        page = 1,
        limit = 20,
        actionType,
        entityType,
        userId,
        startDate,
        endDate
      } = req.query;

      // Validate required parameters
      if (!chainId) {
        return res.status(400).json({
          success: false,
          error: 'Chain ID is required'
        });
      }

      // Validate pagination parameters
      const pageNum = parseInt(page);
      const limitNum = parseInt(limit);

      if (pageNum < 1 || limitNum < 1 || limitNum > 100) {
        return res.status(400).json({
          success: false,
          error: 'Invalid pagination parameters'
        });
      }

      // Validate date parameters
      let parsedStartDate = null;
      let parsedEndDate = null;

      if (startDate) {
        parsedStartDate = new Date(startDate);
        if (isNaN(parsedStartDate.getTime())) {
          return res.status(400).json({
            success: false,
            error: 'Invalid start date format'
          });
        }
      }

      if (endDate) {
        parsedEndDate = new Date(endDate);
        if (isNaN(parsedEndDate.getTime())) {
          return res.status(400).json({
            success: false,
            error: 'Invalid end date format'
          });
        }
      }

      // Authorization context
      const isPlatformAdmin = req.userRole === 'platform_admin';
      const isChainOwner = req.userRole === 'chain_owner';
      const userBranch = req.userBranch;

      if (!isPlatformAdmin && !isChainOwner) {
        // For non-admin/owner, branch context is required
        if (!userBranch || !userBranch.branch_id) {
          return res.status(403).json({
            success: false,
            error: 'Access denied: missing branch context'
          });
        }
      }

      // Chain owner must only access their own chain
      if (isChainOwner) {
        if (!req.userChainId || chainId !== String(req.userChainId)) {
          return res.status(403).json({
            success: false,
            error: 'Access denied: chain mismatch'
          });
        }
      }

      // Get activity logs
      const result = await activityLogsService.getActivityLogs(chainId, {
        page: pageNum,
        limit: limitNum,
        actionType,
        entityType,
        userId,
        startDate: parsedStartDate?.toISOString(),
        endDate: parsedEndDate?.toISOString()
      });

      if (!result.success) {
        return res.status(500).json(result);
      }

      return res.status(200).json(result);

    } catch (error) {
      console.error('ActivityLogsController.getActivityLogs error:', error);
      return res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  /**
   * Create a new activity log entry
   * POST /api/v1/reports/activity-logs
   */
  async createActivityLog(req, res) {
    try {
      const {
        restaurantChainId,
        branchId,
        actionType,
        entityType,
        entityId,
        entityName,
        changes
      } = req.body;

      // Validate required fields
      if (!restaurantChainId || !actionType || !entityType) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: restaurantChainId, actionType, entityType'
        });
      }

      // Validate action type
      const validActionTypes = ['create', 'update', 'delete'];
      if (!validActionTypes.includes(actionType)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid action type. Must be one of: create, update, delete'
        });
      }

      // Check user authorization for this chain
      const authResult = await validateChainOwnership(req.user, restaurantChainId);
      if (!authResult.success) {
        return res.status(authResult.statusCode || 403).json({
          success: false,
          error: authResult.error
        });
      }

      // Get client IP and user agent
      const ipAddress = req.ip || req.connection.remoteAddress;
      const userAgent = req.get('User-Agent');

      // Create activity log
      const result = await activityLogsService.createActivityLog({
        userId: req.currentUserId,
        restaurantChainId,
        branchId,
        actionType,
        entityType,
        entityId,
        entityName,
        changes,
        ipAddress,
        userAgent
      });

      if (!result.success) {
        return res.status(500).json(result);
      }

      return res.status(201).json(result);

    } catch (error) {
      console.error('ActivityLogsController.createActivityLog error:', error);
      return res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  /**
   * Get activity statistics for a restaurant chain
   * GET /api/v1/reports/activity-logs/stats
   */
  async getActivityStats(req, res) {
    try {
      const { chainId, startDate, endDate } = req.query;

      // Validate required parameters
      if (!chainId) {
        return res.status(400).json({
          success: false,
          error: 'Chain ID is required'
        });
      }

      // Authorization context
      const isPlatformAdmin = req.userRole === 'platform_admin';
      const isChainOwner = req.userRole === 'chain_owner';
      const userBranch = req.userBranch;

      if (!isPlatformAdmin && !isChainOwner) {
        if (!userBranch || !userBranch.branch_id) {
          return res.status(403).json({
            success: false,
            error: 'Access denied: missing branch context'
          });
        }
      }

      if (isChainOwner) {
        if (!req.userChainId || chainId !== String(req.userChainId)) {
          return res.status(403).json({
            success: false,
            error: 'Access denied: chain mismatch'
          });
        }
      }

      // Validate date parameters
      let parsedStartDate = null;
      let parsedEndDate = null;

      if (startDate) {
        parsedStartDate = new Date(startDate);
        if (isNaN(parsedStartDate.getTime())) {
          return res.status(400).json({
            success: false,
            error: 'Invalid start date format'
          });
        }
      }

      if (endDate) {
        parsedEndDate = new Date(endDate);
        if (isNaN(parsedEndDate.getTime())) {
          return res.status(400).json({
            success: false,
            error: 'Invalid end date format'
          });
        }
      }

      // Get activity statistics (v2 - returns frontend-aligned shape)
      const result = await activityLogsService.getActivityStats2(chainId, {
        startDate: parsedStartDate?.toISOString(),
        endDate: parsedEndDate?.toISOString()
      });

      if (!result.success) {
        return res.status(500).json(result);
      }

      return res.status(200).json(result);

    } catch (error) {
      console.error('ActivityLogsController.getActivityStats error:', error);
      return res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  /**
   * Get available filter options for activity logs
   * GET /api/v1/reports/activity-logs/filters
   */
  async getFilterOptions(req, res) {
    try {
      const { chainId } = req.query;

      // Validate required parameters
      if (!chainId) {
        return res.status(400).json({
          success: false,
          error: 'Chain ID is required'
        });
      }

      // Authorization context
      const isPlatformAdmin = req.userRole === 'platform_admin';
      const isChainOwner = req.userRole === 'chain_owner';
      const userBranch = req.userBranch;

      if (!isPlatformAdmin && !isChainOwner) {
        if (!userBranch || !userBranch.branch_id) {
          return res.status(403).json({
            success: false,
            error: 'Access denied: missing branch context'
          });
        }
      }

      if (isChainOwner) {
        if (!req.userChainId || chainId !== String(req.userChainId)) {
          return res.status(403).json({
            success: false,
            error: 'Access denied: chain mismatch'
          });
        }
      }

      // Get filter options
      const result = await activityLogsService.getFilterOptions(chainId);

      if (!result.success) {
        return res.status(500).json(result);
      }

      return res.status(200).json(result);

    } catch (error) {
      console.error('ActivityLogsController.getFilterOptions error:', error);
      return res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }
}

module.exports = new ActivityLogsController();
