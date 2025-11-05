// =====================================================
// DAILY CLOSING SERVICE
// SW-78 FO-115: Quebec WEB-SRM Daily Closing Receipts (FER)
// =====================================================

const { createClient } = require('@supabase/supabase-js');

// Create Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Get daily summary for a specific date
 * @param {string} branchId - Branch ID
 * @param {string} date - Date in YYYY-MM-DD format
 * @returns {Object} Daily summary data
 */
async function getDailySummary(branchId, date) {
  try {
    // Get all completed orders for the day
    const { data: orders, error } = await supabase
      .from('orders')
      .select('total_amount, payment_method, order_status, gst_amount, qst_amount')
      .eq('branch_id', branchId)
      .gte('created_at', `${date}T00:00:00`)
      .lt('created_at', `${date}T23:59:59`)
      .in('order_status', ['completed', 'cancelled', 'refunded']);

    if (error) throw error;

    // Calculate summary
    const summary = {
      total_sales: 0,
      total_refunds: 0,
      net_sales: 0,
      transaction_count: 0,
      gst_collected: 0,
      qst_collected: 0,
      cash_total: 0,
      card_total: 0,
    };

    orders.forEach(order => {
      const amount = parseFloat(order.total_amount || 0);

      if (order.order_status === 'completed') {
        summary.total_sales += amount;
        summary.gst_collected += parseFloat(order.gst_amount || 0);
        summary.qst_collected += parseFloat(order.qst_amount || 0);
        summary.transaction_count++;

        // Payment method breakdown
        if (order.payment_method === 'cash') {
          summary.cash_total += amount;
        } else {
          summary.card_total += amount;
        }
      } else if (order.order_status === 'refunded' || order.order_status === 'cancelled') {
        summary.total_refunds += Math.abs(amount);
      }
    });

    summary.net_sales = summary.total_sales - summary.total_refunds;

    return summary;
  } catch (error) {
    console.error('Error getting daily summary:', error);
    throw error;
  }
}

/**
 * Start a new daily closing (draft status)
 * @param {string} branchId - Branch ID
 * @param {string} date - Closing date in YYYY-MM-DD format
 * @param {string} userId - User ID who initiated the closing
 * @returns {Object} Created closing record
 */
async function startDailyClosing(branchId, date, userId) {
  try {
    // Check if closing already exists for this date
    const { data: existing } = await supabase
      .from('daily_closings')
      .select('id, status')
      .eq('branch_id', branchId)
      .eq('closing_date', date)
      .single();

    if (existing) {
      throw new Error(`Daily closing already exists for ${date} with status: ${existing.status}`);
    }

    // Get daily summary
    const summary = await getDailySummary(branchId, date);

    // Create draft closing
    const { data: closing, error } = await supabase
      .from('daily_closings')
      .insert({
        branch_id: branchId,
        closing_date: date,
        ...summary,
        status: 'draft',
        started_at: new Date().toISOString(),
        created_by: userId,
      })
      .select()
      .single();

    if (error) throw error;

    return closing;
  } catch (error) {
    console.error('Error starting daily closing:', error);
    throw error;
  }
}

/**
 * Cancel a daily closing (before completion)
 * @param {string} closingId - Closing ID
 * @param {string} reason - Cancellation reason
 * @param {string} userId - User ID who cancelled
 * @returns {Object} Updated closing record
 */
async function cancelDailyClosing(closingId, reason, userId) {
  try {
    // Get existing closing
    const { data: closing, error: fetchError } = await supabase
      .from('daily_closings')
      .select('*')
      .eq('id', closingId)
      .single();

    if (fetchError) throw fetchError;
    if (!closing) throw new Error('Closing not found');

    if (closing.status !== 'draft') {
      throw new Error(`Cannot cancel closing with status: ${closing.status}`);
    }

    // Update to cancelled
    const { data: updated, error: updateError } = await supabase
      .from('daily_closings')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        cancellation_reason: reason || 'No reason provided',
        cancelled_by: userId,
      })
      .eq('id', closingId)
      .select()
      .single();

    if (updateError) throw updateError;

    return updated;
  } catch (error) {
    console.error('Error cancelling daily closing:', error);
    throw error;
  }
}

/**
 * Complete a daily closing and send to WEB-SRM
 * @param {string} closingId - Closing ID
 * @returns {Object} Completed closing record
 */
async function completeDailyClosing(closingId) {
  try {
    // Get existing closing
    const { data: closing, error: fetchError } = await supabase
      .from('daily_closings')
      .select('*')
      .eq('id', closingId)
      .single();

    if (fetchError) throw fetchError;
    if (!closing) throw new Error('Closing not found');

    if (closing.status !== 'draft') {
      throw new Error(`Cannot complete closing with status: ${closing.status}`);
    }

    // Update to completed
    const { data: updated, error: updateError } = await supabase
      .from('daily_closings')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
      })
      .eq('id', closingId)
      .select()
      .single();

    if (updateError) throw updateError;

    // Enqueue FER transaction to WEB-SRM (SW-78 FO-115)
    try {
      const { enqueueDailyClosing } = require('../../services/websrm-adapter/queue-worker');

      // Get tenant_id from branch
      const { data: branch } = await supabase
        .from('branches')
        .select('tenant_id')
        .eq('id', closing.branch_id)
        .single();

      if (branch?.tenant_id) {
        await enqueueDailyClosing(closingId, branch.tenant_id);
        console.log(`[DAILY CLOSING] Enqueued FER transaction for closing ${closingId}`);
      }
    } catch (queueError) {
      // Log error but don't fail the completion
      console.error('[DAILY CLOSING] Failed to enqueue FER transaction:', queueError);
      // The queue can be retried later if needed
    }

    return updated;
  } catch (error) {
    console.error('Error completing daily closing:', error);
    throw error;
  }
}

/**
 * Get daily closings with filtering
 * @param {Object} filters - Filter parameters
 * @param {string} userBranch - User branch context
 * @returns {Object} List of closings with pagination
 */
async function getDailyClosings(filters, userBranch) {
  const {
    status,
    date_from,
    date_to,
    page = 1,
    limit = 20,
    branch_id
  } = filters;

  const pageNum = Math.max(1, parseInt(page) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 20));

  // Determine target branch
  let targetBranchId = userBranch.branch_id;
  if (branch_id && userBranch.role === 'chain_owner') {
    targetBranchId = branch_id;
  }

  // Build query
  let query = supabase
    .from('daily_closings')
    .select('*')
    .eq('branch_id', targetBranchId)
    .order('closing_date', { ascending: false });

  // Apply filters
  if (status) query = query.eq('status', status);
  if (date_from) query = query.gte('closing_date', date_from);
  if (date_to) query = query.lte('closing_date', date_to);

  // Get count
  const countQuery = supabase
    .from('daily_closings')
    .select('id', { count: 'exact', head: true })
    .eq('branch_id', targetBranchId);

  // Execute queries
  const [closingsResult, countResult] = await Promise.all([
    query.range((pageNum - 1) * limitNum, pageNum * limitNum - 1),
    countQuery
  ]);

  if (closingsResult.error) throw closingsResult.error;

  return {
    closings: closingsResult.data || [],
    total: countResult.count || 0,
    page: pageNum,
    limit: limitNum,
  };
}

/**
 * Get a single daily closing by ID
 * @param {string} closingId - Closing ID
 * @returns {Object} Closing record
 */
async function getDailyClosingById(closingId) {
  try {
    const { data, error } = await supabase
      .from('daily_closings')
      .select('*')
      .eq('id', closingId)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error getting daily closing:', error);
    throw error;
  }
}

module.exports = {
  getDailySummary,
  startDailyClosing,
  cancelDailyClosing,
  completeDailyClosing,
  getDailyClosings,
  getDailyClosingById,
};
