/**
 * Activity Logs Service
 * Handles user activity tracking and retrieval for restaurant chain owners
 */

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

class ActivityLogsService {
  /**
   * Get activity logs for a restaurant chain with pagination and filters
   * @param {string} chainId - Restaurant chain ID
   * @param {object} options - Query options
   * @returns {Promise<object>} Activity logs with pagination info
   */
  async getActivityLogs(chainId, options = {}) {
    try {
      const {
        page = 1,
        limit = 20,
        actionType = null,
        entityType = null,
        userId = null,
        startDate = null,
        endDate = null
      } = options;

      const offset = (page - 1) * limit;

      // Build the query
      let query = supabase
        .from('activity_logs')
        .select(`
          *,
          user_profiles:user_id (
            full_name,
            email,
            role
          ),
          branches:branch_id (
            id,
            name
          )
        `)
        .eq('restaurant_chain_id', chainId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      // Apply filters
      if (actionType) {
        query = query.eq('action_type', actionType);
      }

      if (entityType) {
        query = query.eq('entity_type', entityType);
      }

      if (userId) {
        query = query.eq('user_id', userId);
      }

      if (startDate) {
        query = query.gte('created_at', startDate);
      }

      if (endDate) {
        query = query.lte('created_at', endDate);
      }

      const { data: logs, error } = await query;

      if (error) {
        console.error('Error fetching activity logs:', error);
        throw new Error('Failed to fetch activity logs');
      }

      // Normalize joined user profile to a unified `user` field for clients
      const normalizedLogs = (logs || []).map((l) => {
        const userProfile = l && l.user_profiles ? l.user_profiles : null;
        const branchInfo = l && l.branches ? l.branches : null;
        return {
          ...l,
          user: userProfile
            ? {
                id: l.user_id,
                full_name: userProfile.full_name || null,
                email: userProfile.email || null,
              }
            : undefined,
          branch: branchInfo
            ? {
                id: l.branch_id || branchInfo.id || null,
                name: branchInfo.name || null,
              }
            : undefined,
        };
      });

      // Get total count for pagination
      let countQuery = supabase
        .from('activity_logs')
        .select('*', { count: 'exact', head: true })
        .eq('restaurant_chain_id', chainId);

      // Apply same filters to count query
      if (actionType) countQuery = countQuery.eq('action_type', actionType);
      if (entityType) countQuery = countQuery.eq('entity_type', entityType);
      if (userId) countQuery = countQuery.eq('user_id', userId);
      if (startDate) countQuery = countQuery.gte('created_at', startDate);
      if (endDate) countQuery = countQuery.lte('created_at', endDate);

      const { count, error: countError } = await countQuery;

      if (countError) {
        console.error('Error getting activity logs count:', countError);
        throw new Error('Failed to get activity logs count');
      }

      const totalPages = Math.ceil(count / limit);

      return {
        success: true,
        data: {
          logs: normalizedLogs,
          pagination: {
            currentPage: page,
            totalPages,
            totalCount: count,
            hasNextPage: page < totalPages,
            hasPreviousPage: page > 1
          }
        }
      };

    } catch (error) {
      console.error('ActivityLogsService.getActivityLogs error:', error);
      return {
        success: false,
        error: error.message || 'Failed to fetch activity logs'
      };
    }
  }

  /**
   * Create a new activity log entry
   * @param {object} logData - Activity log data
   * @returns {Promise<object>} Created log entry
   */
  async createActivityLog(logData) {
    try {
      const {
        userId,
        restaurantChainId,
        branchId = null,
        actionType,
        entityType,
        entityId = null,
        entityName = null,
        changes = null,
        ipAddress = null,
        userAgent = null
      } = logData;

      // Validate required fields
      if (!userId || !restaurantChainId || !actionType || !entityType) {
        throw new Error('Missing required fields for activity log');
      }

      const { data: log, error } = await supabase
        .from('activity_logs')
        .insert([{
          user_id: userId,
          restaurant_chain_id: restaurantChainId,
          branch_id: branchId,
          action_type: actionType,
          entity_type: entityType,
          entity_id: entityId,
          entity_name: entityName,
          changes: changes,
          ip_address: ipAddress,
          user_agent: userAgent
        }])
        .select()
        .single();

      if (error) {
        console.error('Error creating activity log:', error);
        throw new Error('Failed to create activity log');
      }

      return {
        success: true,
        data: log
      };

    } catch (error) {
      console.error('ActivityLogsService.createActivityLog error:', error);
      return {
        success: false,
        error: error.message || 'Failed to create activity log'
      };
    }
  }

  /**
   * Get activity statistics for a restaurant chain
   * @param {string} chainId - Restaurant chain ID
   * @param {object} options - Query options
   * @returns {Promise<object>} Activity statistics
   */
  async getActivityStats(chainId, options = {}) {
    try {
      const {
        startDate = null,
        endDate = null
      } = options;

      // Build base query
      let query = supabase
        .from('activity_logs')
        .select('action_type, entity_type, created_at')
        .eq('restaurant_chain_id', chainId);

      if (startDate) {
        query = query.gte('created_at', startDate);
      }

      if (endDate) {
        query = query.lte('created_at', endDate);
      }

      const { data: logs, error } = await query;

      if (error) {
        console.error('Error fetching activity stats:', error);
        throw new Error('Failed to fetch activity statistics');
      }

      // Calculate statistics
      const stats = {
        totalActivities: logs.length,
        byActionType: {},
        byEntityType: {},
        recentActivitiesCount: 0
      };

      // Count activities by type
      logs.forEach(log => {
        // Count by action type
        stats.byActionType[log.action_type] = (stats.byActionType[log.action_type] || 0) + 1;

        // Count by entity type
        stats.byEntityType[log.entity_type] = (stats.byEntityType[log.entity_type] || 0) + 1;

        // Count recent activities (last 24 hours)
        const logDate = new Date(log.created_at);
        const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
        if (logDate >= yesterday) {
          stats.recentActivitiesCount++;
        }
      });

      return {
        success: true,
        data: stats
      };

    } catch (error) {
      console.error('ActivityLogsService.getActivityStats error:', error);
      return {
        success: false,
        error: error.message || 'Failed to fetch activity statistics'
      };
    }
  }

  /**
   * Get available filter options for activity logs
   * @param {string} chainId - Restaurant chain ID
   * @returns {Promise<object>} Available filter options
   */
  async getFilterOptions(chainId) {
    try {
      // Get unique action types
      const { data: actionTypes, error: actionError } = await supabase
        .from('activity_logs')
        .select('action_type')
        .eq('restaurant_chain_id', chainId)
        .order('action_type');

      if (actionError) {
        console.error('Error fetching action types:', actionError);
        throw new Error('Failed to fetch action types');
      }

      // Get unique entity types
      const { data: entityTypes, error: entityError } = await supabase
        .from('activity_logs')
        .select('entity_type')
        .eq('restaurant_chain_id', chainId)
        .order('entity_type');

      if (entityError) {
        console.error('Error fetching entity types:', entityError);
        throw new Error('Failed to fetch entity types');
      }

      // Get users who have activity logs
      const { data: users, error: userError } = await supabase
        .from('activity_logs')
        .select(`
          user_id,
          user_profiles:user_id (
            full_name,
            email
          )
        `)
        .eq('restaurant_chain_id', chainId)
        // Order by related table column requires foreignTable option
        .order('full_name', { ascending: true, foreignTable: 'user_profiles' });

      if (userError) {
        console.error('Error fetching users:', userError);
        throw new Error('Failed to fetch users');
      }

      // Extract unique values
      const uniqueActionTypes = [...new Set(actionTypes.map(item => item.action_type))];
      const uniqueEntityTypes = [...new Set(entityTypes.map(item => item.entity_type))];
      const uniqueUsers = (users || [])
        .filter((item, index, self) =>
          item.user_profiles &&
          self.findIndex(u => u.user_id === item.user_id) === index
        )
        .map(item => ({
          id: item.user_id,
          full_name: (item.user_profiles && item.user_profiles.full_name) || (item.user_profiles && item.user_profiles.email) || null,
          email: item.user_profiles.email
        }));

      return {
        success: true,
        data: {
          actionTypes: uniqueActionTypes,
          entityTypes: uniqueEntityTypes,
          users: uniqueUsers
        }
      };

    } catch (error) {
      console.error('ActivityLogsService.getFilterOptions error:', error);
      return {
        success: false,
        error: error.message || 'Failed to fetch filter options'
      };
    }
  }
}

module.exports = new ActivityLogsService();

/**
 * Add enhanced stats method on the prototype so the existing instance picks it up.
 * Returns shape aligned with frontend expectations.
 */
ActivityLogsService.prototype.getActivityStats2 = async function (chainId, options = {}) {
  try {
    const { startDate = null, endDate = null } = options;

    // Fetch logs with minimal fields and joined user profile for mostActiveUser
    let query = supabase
      .from('activity_logs')
      .select(`
        user_id,
        action_type,
        entity_type,
        created_at,
        user_profiles:user_id (full_name, email)
      `)
      .eq('restaurant_chain_id', chainId);

    if (startDate) query = query.gte('created_at', startDate);
    if (endDate) query = query.lte('created_at', endDate);

    const { data: logs, error } = await query;
    if (error) {
      console.error('Error fetching activity stats (v2):', error);
      throw new Error('Failed to fetch activity statistics');
    }

    const totalLogs = Array.isArray(logs) ? logs.length : 0;

    // Logs today (calendar day)
    const todayISO = new Date().toISOString().slice(0, 10);
    const logsToday = (logs || []).reduce((acc, l) => {
      const d = new Date(l.created_at);
      const day = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
      return acc + (day === todayISO ? 1 : 0);
    }, 0);

    // Action breakdown
    const actionTypeBreakdown = { create: 0, update: 0, delete: 0 };
    const entityTypeBreakdown = {};
    const userCounts = new Map(); // user_id -> { count, full_name }

    for (const l of logs || []) {
      if (l.action_type && actionTypeBreakdown.hasOwnProperty(l.action_type)) {
        actionTypeBreakdown[l.action_type]++;
      }
      if (l.entity_type) {
        entityTypeBreakdown[l.entity_type] = (entityTypeBreakdown[l.entity_type] || 0) + 1;
      }
      if (l.user_id) {
        const current = userCounts.get(l.user_id) || { count: 0, full_name: (l.user_profiles && l.user_profiles.full_name) || (l.user_profiles && l.user_profiles.email) || null };
        current.count++;
        if (!current.full_name && l.user_profiles) {
          current.full_name = l.user_profiles.full_name || l.user_profiles.email || null;
        }
        userCounts.set(l.user_id, current);
      }
    }

    // Most active user
    let mostActiveUser = null;
    for (const [userId, info] of userCounts.entries()) {
      if (!mostActiveUser || info.count > mostActiveUser.count) {
        mostActiveUser = { user_id: userId, full_name: info.full_name || userId, count: info.count };
      }
    }

    return {
      success: true,
      data: {
        totalLogs,
        logsToday,
        mostActiveUser,
        actionTypeBreakdown,
        entityTypeBreakdown,
      },
    };

  } catch (error) {
    console.error('ActivityLogsService.getActivityStats2 error:', error);
    return {
      success: false,
      error: error.message || 'Failed to fetch activity statistics',
    };
  }
};
