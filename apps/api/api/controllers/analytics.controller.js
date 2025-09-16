/**
 * Analytics Controller
 * Handles HTTP requests for analytics functionality
 */

const analyticsService = require('../services/analytics.service');
const { handleControllerError } = require('../helpers/error-handler');
const { logger } = require('../utils/logger');
const {
  ValidationError,
  AuthorizationError
} = require('../errors/custom-errors');

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

      // Log request start
      logger.info('Analytics request received', {
        req,
        meta: {
          chainId,
          period,
          startDate,
          endDate,
          userRole: req.userRole,
          userChainId: req.userChainId
        }
      });

      // Validate required parameters
      if (!chainId) {
        throw new ValidationError('Chain ID is required');
      }

      // Validate period parameter
      const validPeriods = ['7d', '30d', '90d', 'custom'];
      if (!validPeriods.includes(period)) {
        throw new ValidationError(
          'Invalid period. Must be one of: 7d, 30d, 90d, custom',
          { validPeriods, providedPeriod: period }
        );
      }

      // Validate custom date range
      if (period === 'custom') {
        if (!startDate || !endDate) {
          throw new ValidationError(
            'Start date and end date are required for custom period',
            { period, startDate, endDate }
          );
        }

        // Basic date format validation
        const startDateObj = new Date(startDate);
        const endDateObj = new Date(endDate);

        if (isNaN(startDateObj.getTime()) || isNaN(endDateObj.getTime())) {
          throw new ValidationError(
            'Invalid date format. Use YYYY-MM-DD',
            { startDate, endDate }
          );
        }

        if (startDateObj >= endDateObj) {
          throw new ValidationError(
            'Start date must be before end date',
            { startDate, endDate }
          );
        }
      }

      // Authorization context - CRITICAL SECURITY CHECK
      const isPlatformAdmin = req.userRole === 'platform_admin';
      const isChainOwner = req.userRole === 'chain_owner';
      const userBranch = req.userBranch;

      if (!isPlatformAdmin && !isChainOwner) {
        // For non-admin/owner, branch context is required
        if (!userBranch || !userBranch.branch_id) {
          throw new AuthorizationError(
            'Access denied: missing branch context',
            { userRole: req.userRole, hasBranch: !!userBranch }
          );
        }
      }

      // Chain owner must only access their own chain
      if (isChainOwner) {
        if (!req.userChainId || chainId !== String(req.userChainId)) {
          throw new AuthorizationError(
            'Access denied: chain mismatch',
            { userChainId: req.userChainId, requestedChainId: chainId }
          );
        }
      }

      // Get analytics data
      const analyticsData = await analyticsService.getChainAnalytics({
        chainId,
        period,
        startDate,
        endDate
      });

      // Log successful response
      logger.info('Analytics data retrieved successfully', {
        req,
        meta: {
          chainId,
          period,
          dataKeys: Object.keys(analyticsData)
        }
      });

      return res.status(200).json({
        success: true,
        data: analyticsData
      });

    } catch (error) {
      return handleControllerError(error, 'getChainAnalytics', res, req);
    }
  }
}

module.exports = new AnalyticsController();