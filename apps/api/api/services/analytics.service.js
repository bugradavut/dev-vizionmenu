/**
 * Analytics Service
 * Handles business logic for analytics functionality
 */

const { createClient } = require('@supabase/supabase-js');
const { logger } = require('../utils/logger');
const {
  ValidationError,
  DatabaseError,
  NotFoundError,
  createErrorFromOriginal
} = require('../errors/custom-errors');
const { fillMissingDates, getDateRange } = require('../utils/date-helpers');

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
    const startTime = Date.now();

    try {
      // Validate input parameters
      if (!chainId) {
        throw new ValidationError('Chain ID is required for analytics');
      }

      // Calculate date range based on period
      const dateRange = getDateRange(period, startDate, endDate);

      // Log analytics operation start
      logger.info('Starting chain analytics retrieval', {
        meta: {
          chainId,
          period,
          dateRange: {
            start: dateRange.startDate,
            end: dateRange.endDate
          }
        }
      });

      // Execute all analytics queries in parallel for better performance
      const [revenueByDate, ordersByDate, sourceBreakdown, aovByDate] = await Promise.all([
        this.getRevenueByDate(chainId, dateRange),
        this.getOrdersByDate(chainId, dateRange),
        this.getSourceBreakdown(chainId, dateRange),
        this.getAOVByDate(chainId, dateRange)
      ]);

      // Fill missing dates for consistent chart display
      const completeRevenueData = fillMissingDates(
        revenueByDate,
        dateRange.startDate,
        dateRange.endDate,
        { revenue: 0 }
      );

      const completeOrdersData = fillMissingDates(
        ordersByDate,
        dateRange.startDate,
        dateRange.endDate,
        { order_count: 0 }
      );

      const completeAOVData = fillMissingDates(
        aovByDate,
        dateRange.startDate,
        dateRange.endDate,
        { aov: 0, order_count: 0, total_revenue: 0 }
      );

      // Calculate summary statistics
      const summary = this.calculateSummary(completeRevenueData, completeOrdersData, sourceBreakdown);

      const result = {
        summary,
        revenueByDate: completeRevenueData,
        ordersByDate: completeOrdersData,
        sourceBreakdown,
        aovByDate: completeAOVData
      };

      // Log successful completion
      const duration = Date.now() - startTime;
      logger.logAnalytics('getChainAnalytics', chainId, { period, dateRange }, result, duration);

      return result;

    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('Error in getChainAnalytics', {
        error,
        meta: {
          chainId,
          period,
          duration: `${duration}ms`
        }
      });

      throw createErrorFromOriginal(error, 'analytics retrieval');
    }
  }


  /**
   * Get revenue data grouped by date
   */
  async getRevenueByDate(chainId, dateRange) {
    const startTime = Date.now();

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
        .in('order_status', ['completed', 'preparing', 'scheduled', 'ready', 'delivered'])
        .order('created_at');

      if (error) {
        throw new DatabaseError('Failed to fetch revenue data', 'getRevenueByDate', {
          supabaseError: error.message,
          chainId,
          dateRange
        });
      }

      // Group by date and sum revenue
      const revenueByDate = {};

      data.forEach(order => {
        const date = order.created_at.split('T')[0];

        if (!revenueByDate[date]) {
          revenueByDate[date] = 0;
        }

        revenueByDate[date] += parseFloat(order.total_amount || 0);
      });

      // Convert to array format
      const result = Object.entries(revenueByDate).map(([date, revenue]) => ({
        date,
        revenue: Math.round(revenue * 100) / 100
      }));

      // Log database operation
      const duration = Date.now() - startTime;
      logger.logDatabase('getRevenueByDate', 'orders', { chainId, resultCount: result.length }, duration);

      return result;

    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('Error getting revenue by date', {
        error,
        meta: { chainId, duration: `${duration}ms` }
      });

      throw createErrorFromOriginal(error, 'revenue data retrieval');
    }
  }

  /**
   * Get order count data grouped by date
   */
  async getOrdersByDate(chainId, dateRange) {
    const startTime = Date.now();

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

      if (error) {
        throw new DatabaseError('Failed to fetch orders data', 'getOrdersByDate', {
          supabaseError: error.message,
          chainId,
          dateRange
        });
      }

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
      const result = Object.entries(ordersByDate).map(([date, order_count]) => ({
        date,
        order_count
      }));

      // Log database operation
      const duration = Date.now() - startTime;
      logger.logDatabase('getOrdersByDate', 'orders', { chainId, resultCount: result.length }, duration);

      return result;

    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('Error getting orders by date', {
        error,
        meta: { chainId, duration: `${duration}ms` }
      });

      throw createErrorFromOriginal(error, 'orders data retrieval');
    }
  }

  /**
   * Get revenue and order breakdown by source
   */
  async getSourceBreakdown(chainId, dateRange) {
    const startTime = Date.now();

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

      if (error) {
        throw new DatabaseError('Failed to fetch source breakdown data', 'getSourceBreakdown', {
          supabaseError: error.message,
          chainId,
          dateRange
        });
      }

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
      const result = Object.entries(sourceBreakdown).map(([source, data]) => ({
        source,
        revenue: Math.round(data.revenue * 100) / 100,
        order_count: data.order_count
      }));

      // Log database operation
      const duration = Date.now() - startTime;
      logger.logDatabase('getSourceBreakdown', 'orders', { chainId, resultCount: result.length }, duration);

      return result;

    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('Error getting source breakdown', {
        error,
        meta: { chainId, duration: `${duration}ms` }
      });

      throw createErrorFromOriginal(error, 'source breakdown data retrieval');
    }
  }

  /**
   * Get Average Order Value (AOV) by date
   */
  async getAOVByDate(chainId, dateRange) {
    const startTime = Date.now();

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
        .in('order_status', ['completed', 'preparing', 'scheduled', 'ready', 'delivered'])
        .order('created_at');

      if (error) {
        throw new DatabaseError('Failed to fetch AOV data', 'getAOVByDate', {
          supabaseError: error.message,
          chainId,
          dateRange
        });
      }

      // Group orders by date and calculate AOV
      const aovByDate = {};

      data.forEach(order => {
        const orderDate = new Date(order.created_at).toISOString().split('T')[0];
        const amount = parseFloat(order.total_amount || 0);

        if (!aovByDate[orderDate]) {
          aovByDate[orderDate] = {
            total_revenue: 0,
            order_count: 0,
            aov: 0
          };
        }

        aovByDate[orderDate].total_revenue += amount;
        aovByDate[orderDate].order_count += 1;
      });

      // Calculate AOV for each date
      Object.keys(aovByDate).forEach(date => {
        const dayData = aovByDate[date];
        dayData.aov = dayData.order_count > 0 ? dayData.total_revenue / dayData.order_count : 0;
      });

      // Convert to array format
      const result = Object.entries(aovByDate).map(([date, data]) => ({
        date,
        aov: Math.round(data.aov * 100) / 100,
        order_count: data.order_count,
        total_revenue: Math.round(data.total_revenue * 100) / 100
      }));

      // Log database operation
      const duration = Date.now() - startTime;
      logger.logDatabase('getAOVByDate', 'orders', { chainId, resultCount: result.length }, duration);

      return result;

    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('Error getting AOV by date', {
        error,
        meta: { chainId, duration: `${duration}ms` }
      });

      throw createErrorFromOriginal(error, 'AOV data retrieval');
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