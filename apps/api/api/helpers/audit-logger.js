// =====================================================
// AUDIT LOGGER HELPER
// Centralized, non-blocking activity logging for write operations
// =====================================================

const { createClient } = require('@supabase/supabase-js')
const activityLogsService = require('../services/activity-logs.service')

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function resolveChainId({ branchId, req }) {
  try {
    // Prefer explicit branchId lookup
    if (branchId) {
      const { data, error } = await supabase
        .from('branches')
        .select('chain_id')
        .eq('id', branchId)
        .single()
      if (!error && data?.chain_id) return data.chain_id
    }

    // If chain owner, req.userChainId is set by middleware
    if (req?.userRole === 'chain_owner' && req?.userChainId) {
      return req.userChainId
    }
  } catch (e) {
    // Silent fail; will skip logging if chain cannot be resolved
  }
  return null
}

/**
 * Log activity (non-blocking). Swallows errors by design.
 * params: {
 *  req, action, entity, entityId, entityName,
 *  branchId, chainId, changes
 * }
 */
async function logActivity(params = {}) {
  const { req, action, entity, entityId, entityName, changes } = params
  let { branchId, chainId } = params

  try {
    // Resolve missing chainId if possible
    if (!chainId) {
      chainId = await resolveChainId({ branchId, req })
    }
    if (!chainId) {
      console.warn('[audit-logger] Skip - chainId unresolved')
      return
    }

    await activityLogsService.createActivityLog({
      userId: req?.currentUserId || null,
      restaurantChainId: chainId,
      branchId: branchId || null,
      actionType: action,
      entityType: entity,
      entityId: entityId || null,
      entityName: entityName || null,
      changes: changes || null,
      ipAddress: req?.ip || req?.connection?.remoteAddress || null,
      userAgent: req?.get?.('User-Agent') || null,
    })
  } catch (e) {
    // Never break main flow
    console.warn('[audit-logger] Non-blocking log failure:', e?.message || e)
  }
}

module.exports = { logActivity }

