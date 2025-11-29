// =====================================================
// DASHBOARD CONTROLLER
// Dashboard statistics and analytics endpoints
// =====================================================

const dashboardService = require('../services/dashboard.service');
const { handleControllerError } = require('../helpers/error-handler');

/**
 * GET /api/v1/dashboard/stats
 * Get dashboard statistics for the authenticated user's branch
 */
const getDashboardStats = async (req, res) => {
  try {
    const userBranch = req.userBranch;

    if (!userBranch || !userBranch.branch_id) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Branch context is required'
        }
      });
    }

    const [stats, salesChartData, previousWeekTotal, recentOrders, popularItems] = await Promise.all([
      dashboardService.getBranchDashboardStats(userBranch.branch_id),
      dashboardService.getSalesChartData(userBranch.branch_id),
      dashboardService.getPreviousWeekSalesTotal(userBranch.branch_id),
      dashboardService.getRecentOrders(userBranch.branch_id),
      dashboardService.getPopularItems(userBranch.branch_id)
    ]);

    // Calculate week total (last 7 days)
    const weekTotal = salesChartData.reduce((sum, day) => sum + day.sales, 0);

    // Calculate week-over-week change percent
    // Compare: Last 7 days vs Previous 7 days (days 8-14 ago)
    let weekChangePercent = 0;
    if (previousWeekTotal > 0) {
      weekChangePercent = ((weekTotal - previousWeekTotal) / previousWeekTotal) * 100;
    } else if (weekTotal > 0) {
      // Previous week had no sales, current week has sales = 100% increase
      weekChangePercent = 100;
    } else {
      // Both weeks have no sales = 0% change
      weekChangePercent = 0;
    }

    res.json({
      success: true,
      data: {
        ...stats,
        salesChart: {
          data: salesChartData,
          weekTotal,
          changePercent: weekChangePercent
        },
        recentOrders,
        popularItems
      }
    });

  } catch (error) {
    handleControllerError(error, 'fetch dashboard stats', res);
  }
};

module.exports = {
  getDashboardStats
};
