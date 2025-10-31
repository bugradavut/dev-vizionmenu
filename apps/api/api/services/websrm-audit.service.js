// =====================================================
// WEBSRM AUDIT LOG SERVICE
// SW-78 FO-107: Display WEB-SRM error messages
// =====================================================

const { createClient } = require('@supabase/supabase-js');

// Create Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Get WebSRM audit logs with filtering and pagination
 * @param {string} branchId - Branch ID (for RLS)
 * @param {Object} filters - Optional filters (startDate, endDate, errorOnly, page, limit)
 * @returns {Object} Paginated audit logs with metadata
 */
async function getAuditLogs(branchId, filters = {}) {
  if (!branchId) {
    throw new Error('Branch ID is required');
  }

  const { startDate, endDate, errorOnly = false, page = 1, limit = 50 } = filters;
  const offset = (page - 1) * limit;

  // Build query for data
  let dataQuery = supabase
    .from('websrm_audit_log')
    .select('*')
    .eq('tenant_id', branchId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  // Filter by date range
  if (startDate) {
    dataQuery = dataQuery.gte('created_at', startDate);
  }
  if (endDate) {
    dataQuery = dataQuery.lte('created_at', endDate);
  }

  // Filter errors only (exclude successful transactions)
  if (errorOnly) {
    dataQuery = dataQuery.not('error_code', 'is', null);
  }

  // Build query for total count
  let countQuery = supabase
    .from('websrm_audit_log')
    .select('*', { count: 'exact', head: true })
    .eq('tenant_id', branchId);

  if (startDate) {
    countQuery = countQuery.gte('created_at', startDate);
  }
  if (endDate) {
    countQuery = countQuery.lte('created_at', endDate);
  }
  if (errorOnly) {
    countQuery = countQuery.not('error_code', 'is', null);
  }

  // Execute both queries in parallel
  const [{ data, error }, { count, error: countError }] = await Promise.all([
    dataQuery,
    countQuery
  ]);

  if (error) {
    console.error('Failed to fetch WebSRM audit logs:', error);
    throw new Error(`Failed to fetch WebSRM audit logs: ${error.message}`);
  }

  if (countError) {
    console.error('Failed to count WebSRM audit logs:', countError);
    throw new Error(`Failed to count WebSRM audit logs: ${countError.message}`);
  }

  const total = count || 0;
  const totalPages = Math.ceil(total / limit);

  return {
    logs: data || [],
    pagination: {
      page,
      limit,
      total,
      totalPages
    }
  };
}

/**
 * Get WebSRM audit logs for a specific order
 * @param {string} orderId - Order ID
 * @param {string} branchId - Branch ID (for RLS)
 * @returns {Array} List of audit logs for this order
 */
async function getAuditLogsByOrderId(orderId, branchId) {
  if (!orderId) {
    throw new Error('Order ID is required');
  }
  if (!branchId) {
    throw new Error('Branch ID is required');
  }

  const { data, error } = await supabase
    .from('websrm_audit_log')
    .select('*')
    .eq('order_id', orderId)
    .eq('tenant_id', branchId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error(`Failed to fetch WebSRM audit logs for order ${orderId}:`, error);
    throw new Error(`Failed to fetch WebSRM audit logs: ${error.message}`);
  }

  return data || [];
}

/**
 * Get WebSRM transaction queue status for an order
 * Useful for displaying current transaction status on order detail page
 * @param {string} orderId - Order ID
 * @param {string} branchId - Branch ID (tenant_id)
 * @returns {Object|null} Transaction queue item or null
 */
async function getTransactionStatus(orderId, branchId) {
  if (!orderId) {
    throw new Error('Order ID is required');
  }
  if (!branchId) {
    throw new Error('Branch ID is required');
  }

  const { data, error } = await supabase
    .from('websrm_transaction_queue')
    .select('*')
    .eq('order_id', orderId)
    .eq('tenant_id', branchId)
    .single();

  if (error) {
    // Not found is okay - order might not have WebSRM transaction
    if (error.code === 'PGRST116') {
      return null;
    }
    console.error(`Failed to fetch transaction status for order ${orderId}:`, error);
    throw new Error(`Failed to fetch transaction status: ${error.message}`);
  }

  return data;
}

/**
 * Get error statistics for dashboard
 * @param {string} branchId - Branch ID
 * @param {Object} filters - Optional filters (startDate, endDate)
 * @returns {Object} Error statistics
 */
async function getErrorStatistics(branchId, filters = {}) {
  if (!branchId) {
    throw new Error('Branch ID is required');
  }

  const { startDate, endDate } = filters;

  // Build query
  let query = supabase
    .from('websrm_audit_log')
    .select('error_code, cod_retour')
    .eq('tenant_id', branchId)
    .not('error_code', 'is', null);

  if (startDate) {
    query = query.gte('created_at', startDate);
  }
  if (endDate) {
    query = query.lte('created_at', endDate);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Failed to fetch error statistics:', error);
    throw new Error(`Failed to fetch error statistics: ${error.message}`);
  }

  // Count errors by type
  const errorCounts = {};
  data.forEach(row => {
    const code = row.error_code || 'UNKNOWN';
    errorCounts[code] = (errorCounts[code] || 0) + 1;
  });

  return {
    total_errors: data.length,
    error_distribution: errorCounts,
  };
}

module.exports = {
  getAuditLogs,
  getAuditLogsByOrderId,
  getTransactionStatus,
  getErrorStatistics,
};
