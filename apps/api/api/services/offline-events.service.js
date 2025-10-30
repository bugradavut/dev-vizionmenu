// =====================================================
// OFFLINE MODE EVENTS SERVICE
// SW-78 FO-105: Track offline mode activation/deactivation
// =====================================================

const { createClient } = require('@supabase/supabase-js');

// Create Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Create a new offline mode session (activation event)
 * @param {Object} sessionData - Session details
 * @returns {Object} Created session
 */
async function createOfflineSession(sessionData) {
  const { branch_id, device_info, user_agent } = sessionData;

  // Input validation
  if (!branch_id) {
    throw new Error('Branch ID is required');
  }

  // Check if there's already an active session for this branch
  const { data: activeSession } = await supabase
    .from('offline_mode_sessions')
    .select('id')
    .eq('branch_id', branch_id)
    .is('deactivated_at', null)
    .single();

  // If there's already an active session, return it instead of creating a new one
  if (activeSession) {
    console.log(`[OfflineEvents] Active session already exists for branch ${branch_id}`);
    return activeSession;
  }

  // Create new offline session
  const { data, error } = await supabase
    .from('offline_mode_sessions')
    .insert({
      branch_id,
      device_info: device_info || null,
      user_agent: user_agent || null,
      last_network_status: 'offline',
      activated_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    console.error('Failed to create offline session:', error);
    throw new Error(`Failed to create offline session: ${error.message}`);
  }

  console.log(`[OfflineEvents] Created offline session: ${data.id} for branch ${branch_id}`);
  return data;
}

/**
 * Deactivate offline mode session (network restored)
 * @param {string} branchId - Branch ID
 * @returns {Object} Updated session
 */
async function deactivateOfflineSession(branchId) {
  if (!branchId) {
    throw new Error('Branch ID is required');
  }

  // Find active session for this branch
  const { data: activeSession, error: findError } = await supabase
    .from('offline_mode_sessions')
    .select('*')
    .eq('branch_id', branchId)
    .is('deactivated_at', null)
    .order('activated_at', { ascending: false })
    .limit(1)
    .single();

  if (findError || !activeSession) {
    console.warn(`[OfflineEvents] No active session found for branch ${branchId}`);
    return null;
  }

  // Update session with deactivation time
  const { data, error } = await supabase
    .from('offline_mode_sessions')
    .update({
      deactivated_at: new Date().toISOString(),
      last_network_status: 'online',
    })
    .eq('id', activeSession.id)
    .select()
    .single();

  if (error) {
    console.error('Failed to deactivate offline session:', error);
    throw new Error(`Failed to deactivate offline session: ${error.message}`);
  }

  console.log(`[OfflineEvents] Deactivated offline session: ${data.id} (duration: ${data.duration_seconds}s)`);
  return data;
}

/**
 * Increment orders created count for active session
 * @param {string} branchId - Branch ID
 * @returns {Object} Updated session
 */
async function incrementOrdersCreated(branchId) {
  if (!branchId) {
    throw new Error('Branch ID is required');
  }

  // Find active session for this branch
  const { data: activeSession, error: findError } = await supabase
    .from('offline_mode_sessions')
    .select('*')
    .eq('branch_id', branchId)
    .is('deactivated_at', null)
    .order('activated_at', { ascending: false })
    .limit(1)
    .single();

  if (findError || !activeSession) {
    console.warn(`[OfflineEvents] No active session found for branch ${branchId} to increment orders`);
    return null;
  }

  // Increment orders_created
  const { data, error } = await supabase
    .from('offline_mode_sessions')
    .update({
      orders_created: activeSession.orders_created + 1,
    })
    .eq('id', activeSession.id)
    .select()
    .single();

  if (error) {
    console.error('Failed to increment orders created:', error);
    throw new Error(`Failed to increment orders created: ${error.message}`);
  }

  console.log(`[OfflineEvents] Incremented orders for session ${data.id}: ${data.orders_created}`);
  return data;
}

/**
 * Get offline sessions for a branch with optional filters
 * @param {string} branchId - Branch ID
 * @param {Object} filters - Optional filters (startDate, endDate, limit)
 * @returns {Array} List of sessions
 */
async function getOfflineSessions(branchId, filters = {}) {
  if (!branchId) {
    throw new Error('Branch ID is required');
  }

  const { startDate, endDate, limit = 50 } = filters;

  let query = supabase
    .from('offline_mode_sessions')
    .select('*')
    .eq('branch_id', branchId)
    .order('activated_at', { ascending: false })
    .limit(limit);

  if (startDate) {
    query = query.gte('activated_at', startDate);
  }

  if (endDate) {
    query = query.lte('activated_at', endDate);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Failed to fetch offline sessions:', error);
    throw new Error(`Failed to fetch offline sessions: ${error.message}`);
  }

  return data || [];
}

/**
 * Get currently active offline sessions (for monitoring)
 * @param {string} branchId - Optional branch ID filter
 * @returns {Array} List of active sessions
 */
async function getActiveSessions(branchId = null) {
  let query = supabase
    .from('offline_mode_sessions')
    .select('*')
    .is('deactivated_at', null)
    .order('activated_at', { ascending: false });

  if (branchId) {
    query = query.eq('branch_id', branchId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Failed to fetch active sessions:', error);
    throw new Error(`Failed to fetch active sessions: ${error.message}`);
  }

  return data || [];
}

module.exports = {
  createOfflineSession,
  deactivateOfflineSession,
  incrementOrdersCreated,
  getOfflineSessions,
  getActiveSessions,
};
