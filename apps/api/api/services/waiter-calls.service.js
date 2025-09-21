// =====================================================
// WAITER CALLS SERVICE - SIMPLIFIED
// QR table waiter call system - minimal implementation
// =====================================================

const { createClient } = require('@supabase/supabase-js');

// Create Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Create a new waiter call from QR order
 * @param {Object} waiterCallData - Waiter call details
 * @returns {Object} Created waiter call
 */
async function createWaiterCall(waiterCallData) {
  const { branch_id, table_number, zone } = waiterCallData;

  // Input validation
  if (!branch_id || !table_number) {
    throw new Error('Branch ID and table number are required');
  }

  if (table_number <= 0) {
    throw new Error('Table number must be positive');
  }

  // Check if there's already a recent call for this table (2 minutes cooldown)
  const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();
  const { data: existingCall } = await supabase
    .from('waiter_calls')
    .select('id')
    .eq('branch_id', branch_id)
    .eq('table_number', table_number)
    .gte('created_at', twoMinutesAgo)
    .single();

  if (existingCall) {
    throw new Error('Please wait before calling waiter again');
  }

  // Create new waiter call
  const { data, error } = await supabase
    .from('waiter_calls')
    .insert({
      branch_id,
      table_number: parseInt(table_number),
      zone: zone || null
    })
    .select('*')
    .single();

  if (error) {
    console.error('Error creating waiter call:', error);
    throw new Error('Failed to create waiter call');
  }

  return data;
}

/**
 * Get pending waiter calls for a branch
 * @param {string} branchId - Branch ID
 * @returns {Array} Pending waiter calls
 */
async function getPendingWaiterCalls(branchId) {
  if (!branchId) {
    throw new Error('Branch ID is required');
  }

  // Auto-cleanup old calls before fetching
  try {
    await supabase.rpc('cleanup_old_waiter_calls');
  } catch (cleanupError) {
    console.warn('Cleanup failed, continuing with fetch:', cleanupError);
  }

  const { data, error } = await supabase
    .from('waiter_calls')
    .select('id, branch_id, table_number, zone, created_at')
    .eq('branch_id', branchId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching pending waiter calls:', error);
    throw new Error('Failed to fetch pending waiter calls');
  }

  return data || [];
}

/**
 * Resolve a waiter call (delete it)
 * @param {string} callId - Waiter call ID
 * @returns {Object} Success status
 */
async function resolveWaiterCall(callId) {
  if (!callId) {
    throw new Error('Call ID is required');
  }

  const { error } = await supabase
    .from('waiter_calls')
    .delete()
    .eq('id', callId);

  if (error) {
    console.error('Error resolving waiter call:', error);
    throw new Error('Failed to resolve waiter call');
  }

  return { success: true };
}

module.exports = {
  createWaiterCall,
  getPendingWaiterCalls,
  resolveWaiterCall
};