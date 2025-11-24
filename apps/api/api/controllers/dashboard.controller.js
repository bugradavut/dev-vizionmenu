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

    const [stats, salesChartData, recentOrders, popularItems] = await Promise.all([
      dashboardService.getBranchDashboardStats(userBranch.branch_id),
      dashboardService.getSalesChartData(userBranch.branch_id),
      dashboardService.getRecentOrders(userBranch.branch_id),
      dashboardService.getPopularItems(userBranch.branch_id)
    ]);

    // Calculate week total and change percent for chart
    const weekTotal = salesChartData.reduce((sum, day) => sum + day.sales, 0);

    res.json({
      success: true,
      data: {
        ...stats,
        salesChart: {
          data: salesChartData,
          weekTotal,
          changePercent: stats.todaySales.changePercent
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
