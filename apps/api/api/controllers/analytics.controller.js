/**
 * Analytics Controller
 * Handles HTTP requests for analytics functionality
 */

const analyticsService = require('../services/analytics.service');
const { handleControllerError } = require('../helpers/error-handler');

class AnalyticsController {
  /**
   * Get chain analytics data
   * GET /api/v1/reports/analytics
   */
  async getChainAnalytics(req, res) {
    try {
      const {
        chainId,
        period = '7d',
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

      // Validate period parameter
      const validPeriods = ['7d', '30d', '90d', 'custom'];
      if (!validPeriods.includes(period)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid period. Must be one of: 7d, 30d, 90d, custom'
        });
      }

      // Validate custom date range
      if (period === 'custom') {
        if (!startDate || !endDate) {
          return res.status(400).json({
            success: false,
            error: 'Start date and end date are required for custom period'
          });
        }

        // Basic date format validation
        const startDateObj = new Date(startDate);
        const endDateObj = new Date(endDate);

        if (isNaN(startDateObj.getTime()) || isNaN(endDateObj.getTime())) {
          return res.status(400).json({
            success: false,
            error: 'Invalid date format. Use YYYY-MM-DD'
          });
        }

        if (startDateObj >= endDateObj) {
          return res.status(400).json({
            success: false,
            error: 'Start date must be before end date'
          });
        }
      }

      // Authorization context - CRITICAL SECURITY CHECK
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

      // Get analytics data
      const analyticsData = await analyticsService.getChainAnalytics({
        chainId,
        period,
        startDate,
        endDate
      });

      return res.status(200).json({
        success: true,
        data: analyticsData
      });

    } catch (error) {
      console.error('Error in getChainAnalytics:', error);
      return handleControllerError(res, error);
    }
  }
}

module.exports = new AnalyticsController();