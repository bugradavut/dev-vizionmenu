/**
 * Analytics Service
 * Handles business logic for analytics functionality
 */

const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

class AnalyticsService {
  /**
   * Get analytics data for a restaurant chain
   * @param {Object} params - Analytics parameters
   * @param {string} params.chainId - Restaurant chain ID
   * @param {string} params.period - Time period (7d, 30d, 90d, custom)
   * @param {string} params.startDate - Custom start date (YYYY-MM-DD)
   * @param {string} params.endDate - Custom end date (YYYY-MM-DD)
   * @returns {Object} Analytics data
   */
  async getChainAnalytics({ chainId, period = '7d', startDate, endDate }) {
    try {
      // Calculate date range based on period
      const dateRange = this.calculateDateRange(period, startDate, endDate);

      // Get revenue by date
      const revenueByDate = await this.getRevenueByDate(chainId, dateRange);

      // Get orders by date
      const ordersByDate = await this.getOrdersByDate(chainId, dateRange);

      // Get source breakdown
      const sourceBreakdown = await this.getSourceBreakdown(chainId, dateRange);

      // Calculate summary statistics
      const summary = this.calculateSummary(revenueByDate, ordersByDate, sourceBreakdown);

      return {
        summary,
        revenueByDate,
        ordersByDate,
        sourceBreakdown
      };

    } catch (error) {
      console.error('Error in getChainAnalytics:', error);
      throw error;
    }
  }

  /**
   * Calculate date range based on period
   */
  calculateDateRange(period, startDate, endDate) {
    const now = new Date();
    let start, end;

    if (period === 'custom' && startDate && endDate) {
      start = new Date(startDate);
      end = new Date(endDate);
    } else {
      end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

      switch (period) {
        case '7d':
          start = new Date(now);
          start.setDate(now.getDate() - 7);
          break;
        case '30d':
          start = new Date(now);
          start.setDate(now.getDate() - 30);
          break;
        case '90d':
          start = new Date(now);
          start.setDate(now.getDate() - 90);
          break;
        default:
          start = new Date(now);
          start.setDate(now.getDate() - 7);
      }
    }

    return {
      start: start.toISOString(),
      end: end.toISOString()
    };
  }

  /**
   * Get revenue data grouped by date
   */
  async getRevenueByDate(chainId, dateRange) {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          created_at,
          total_amount,
          branches!inner(chain_id)
        `)
        .eq('branches.chain_id', chainId)
        .gte('created_at', dateRange.start)
        .lte('created_at', dateRange.end)
        .in('order_status', ['completed', 'preparing', 'scheduled', 'ready', 'delivered']) // Include test data
        .order('created_at');

      if (error) throw error;

      // Group by date and sum revenue
      const revenueByDate = {};

      data.forEach(order => {
        const date = order.created_at.split('T')[0]; // Get YYYY-MM-DD format

        if (!revenueByDate[date]) {
          revenueByDate[date] = 0;
        }

        revenueByDate[date] += parseFloat(order.total_amount || 0);
      });

      // Convert to array format
      return Object.entries(revenueByDate).map(([date, revenue]) => ({
        date,
        revenue: Math.round(revenue * 100) / 100 // Round to 2 decimal places
      }));

    } catch (error) {
      console.error('Error getting revenue by date:', error);
      throw error;
    }
  }

  /**
   * Get order count data grouped by date
   */
  async getOrdersByDate(chainId, dateRange) {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          created_at,
          branches!inner(chain_id)
        `)
        .eq('branches.chain_id', chainId)
        .gte('created_at', dateRange.start)
        .lte('created_at', dateRange.end)
        .in('order_status', ['completed', 'preparing', 'scheduled', 'ready', 'delivered'])
        .order('created_at');

      if (error) throw error;

      // Group by date and count orders
      const ordersByDate = {};

      data.forEach(order => {
        const date = order.created_at.split('T')[0];

        if (!ordersByDate[date]) {
          ordersByDate[date] = 0;
        }

        ordersByDate[date] += 1;
      });

      // Convert to array format
      return Object.entries(ordersByDate).map(([date, order_count]) => ({
        date,
        order_count
      }));

    } catch (error) {
      console.error('Error getting orders by date:', error);
      throw error;
    }
  }

  /**
   * Get revenue and order breakdown by source
   */
  async getSourceBreakdown(chainId, dateRange) {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          order_source,
          total_amount,
          branches!inner(chain_id)
        `)
        .eq('branches.chain_id', chainId)
        .gte('created_at', dateRange.start)
        .lte('created_at', dateRange.end)
        .in('order_status', ['completed', 'preparing', 'scheduled', 'ready', 'delivered'])
        .order('order_source');

      if (error) throw error;

      // Group by source
      const sourceBreakdown = {};

      data.forEach(order => {
        const source = order.order_source || 'unknown';

        if (!sourceBreakdown[source]) {
          sourceBreakdown[source] = {
            revenue: 0,
            order_count: 0
          };
        }

        sourceBreakdown[source].revenue += parseFloat(order.total_amount || 0);
        sourceBreakdown[source].order_count += 1;
      });

      // Convert to array format
      return Object.entries(sourceBreakdown).map(([source, data]) => ({
        source,
        revenue: Math.round(data.revenue * 100) / 100,
        order_count: data.order_count
      }));

    } catch (error) {
      console.error('Error getting source breakdown:', error);
      throw error;
    }
  }

  /**
   * Calculate summary statistics
   */
  calculateSummary(revenueByDate, ordersByDate, sourceBreakdown) {
    const totalRevenue = revenueByDate.reduce((sum, item) => sum + item.revenue, 0);
    const totalOrders = ordersByDate.reduce((sum, item) => sum + item.order_count, 0);

    const dayCount = revenueByDate.length || 1;
    const averagePerDay = totalRevenue / dayCount;
    const dailyAverage = totalOrders / dayCount;

    // Find best performing platform
    let bestPlatform = 'N/A';
    let highestRevenue = 0;

    sourceBreakdown.forEach(source => {
      if (source.revenue > highestRevenue) {
        highestRevenue = source.revenue;
        bestPlatform = source.source;
      }
    });

    // Calculate growth percent (comparing first and last day if we have enough data)
    let growthPercent = null;
    if (revenueByDate.length >= 2) {
      const firstDay = revenueByDate[0].revenue;
      const lastDay = revenueByDate[revenueByDate.length - 1].revenue;

      if (firstDay > 0) {
        growthPercent = Math.round(((lastDay - firstDay) / firstDay) * 100);
      }
    }

    return {
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      growthPercent,
      averagePerDay: Math.round(averagePerDay * 100) / 100,
      totalOrders,
      dailyAverage: Math.round(dailyAverage * 100) / 100,
      bestPlatform,
      peakHour: null // TODO: Implement peak hour analysis if needed
    };
  }
}

module.exports = new AnalyticsService();