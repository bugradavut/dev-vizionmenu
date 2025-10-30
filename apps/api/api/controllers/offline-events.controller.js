// =====================================================
// OFFLINE EVENTS CONTROLLER
// SW-78 FO-105: Track offline mode activation/deactivation
// =====================================================

const offlineEventsService = require('../services/offline-events.service');
const { handleControllerError } = require('../helpers/error-handler');

/**
 * Activate offline mode (network lost)
 * POST /api/v1/offline-events/activate
 * Public endpoint - customer devices send this
 */
async function activateOfflineMode(req, res) {
  try {
    const { branch_id, device_info, user_agent } = req.body;

    // Input validation
    if (!branch_id) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'branch_id is required' }
      });
    }

    // Create offline session
    const session = await offlineEventsService.createOfflineSession({
      branch_id,
      device_info: device_info || null,
      user_agent: user_agent || req.headers['user-agent'] || null,
    });

    res.status(201).json({
      data: {
        session_id: session.id,
        branch_id: session.branch_id,
        activated_at: session.activated_at,
        status: 'offline_mode_activated',
      },
      meta: {
        message: 'Offline mode session created successfully',
        timestamp: new Date().toISOString(),
      },
    });

  } catch (error) {
    console.error('Activate offline mode error:', error);
    handleControllerError(error, 'activate offline mode', res);
  }
}

/**
 * Deactivate offline mode (network restored)
 * POST /api/v1/offline-events/deactivate
 * Public endpoint - customer devices send this
 */
async function deactivateOfflineMode(req, res) {
  try {
    const { branch_id } = req.body;

    // Input validation
    if (!branch_id) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'branch_id is required' }
      });
    }

    // Deactivate offline session
    const session = await offlineEventsService.deactivateOfflineSession(branch_id);

    if (!session) {
      return res.status(404).json({
        error: { code: 'SESSION_NOT_FOUND', message: 'No active offline session found' }
      });
    }

    res.json({
      data: {
        session_id: session.id,
        branch_id: session.branch_id,
        activated_at: session.activated_at,
        deactivated_at: session.deactivated_at,
        duration_seconds: session.duration_seconds,
        orders_created: session.orders_created,
        status: 'offline_mode_deactivated',
      },
      meta: {
        message: 'Offline mode session ended successfully',
        timestamp: new Date().toISOString(),
      },
    });

  } catch (error) {
    console.error('Deactivate offline mode error:', error);
    handleControllerError(error, 'deactivate offline mode', res);
  }
}

/**
 * Increment orders created in current offline session
 * POST /api/v1/offline-events/increment-orders
 * Public endpoint - called when offline order is created
 */
async function incrementOrdersCreated(req, res) {
  try {
    const { branch_id } = req.body;

    // Input validation
    if (!branch_id) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'branch_id is required' }
      });
    }

    // Increment orders count
    const session = await offlineEventsService.incrementOrdersCreated(branch_id);

    if (!session) {
      return res.status(404).json({
        error: { code: 'SESSION_NOT_FOUND', message: 'No active offline session found' }
      });
    }

    res.json({
      data: {
        session_id: session.id,
        orders_created: session.orders_created,
      },
      meta: {
        message: 'Orders count incremented successfully',
        timestamp: new Date().toISOString(),
      },
    });

  } catch (error) {
    console.error('Increment orders error:', error);
    handleControllerError(error, 'increment orders', res);
  }
}

/**
 * Get offline sessions for authenticated branch user
 * GET /api/v1/offline-events
 * Requires auth middleware (req.userBranch will be populated)
 */
async function getOfflineSessions(req, res) {
  try {
    // User and branch context provided by auth middleware
    const branchId = req.userBranch.branch_id;
    const { start_date, end_date, page, limit } = req.query;

    // Get offline sessions for user's branch with pagination
    const result = await offlineEventsService.getOfflineSessions(branchId, {
      startDate: start_date,
      endDate: end_date,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 50,
    });

    res.json({
      data: {
        sessions: result.sessions,
        total: result.pagination.total,
        totalPages: result.pagination.totalPages,
        page: result.pagination.page,
      },
      meta: {
        branch_id: branchId,
        timestamp: new Date().toISOString(),
      },
    });

  } catch (error) {
    console.error('Get offline sessions error:', error);
    handleControllerError(error, 'fetch offline sessions', res);
  }
}

/**
 * Get active offline sessions (for monitoring)
 * GET /api/v1/offline-events/active
 * Requires auth middleware
 */
async function getActiveSessions(req, res) {
  try {
    // Optional branch filter
    const branchId = req.query.branch_id || req.userBranch?.branch_id || null;

    // Get active sessions
    const sessions = await offlineEventsService.getActiveSessions(branchId);

    res.json({
      data: sessions,
      meta: {
        count: sessions.length,
        timestamp: new Date().toISOString(),
      },
    });

  } catch (error) {
    console.error('Get active sessions error:', error);
    handleControllerError(error, 'fetch active sessions', res);
  }
}

/**
 * Sync offline session from frontend
 * POST /api/v1/offline-events/sync
 * Public endpoint - called when network comes back online
 */
async function syncOfflineSession(req, res) {
  try {
    const { branch_id, activated_at, deactivated_at, orders_created, device_info, user_agent } = req.body;

    // Input validation
    if (!branch_id || !activated_at) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'branch_id and activated_at are required' }
      });
    }

    // Sync session to database
    const session = await offlineEventsService.syncOfflineSession({
      branch_id,
      activated_at,
      deactivated_at,
      orders_created: orders_created || 0,
      device_info: device_info || null,
      user_agent: user_agent || req.headers['user-agent'] || null,
    });

    res.status(201).json({
      data: {
        session_id: session.id,
        branch_id: session.branch_id,
        activated_at: session.activated_at,
        deactivated_at: session.deactivated_at,
        orders_created: session.orders_created,
        status: 'synced',
      },
      meta: {
        message: 'Offline session synced successfully',
        timestamp: new Date().toISOString(),
      },
    });

  } catch (error) {
    console.error('Sync offline session error:', error);
    handleControllerError(error, 'sync offline session', res);
  }
}

module.exports = {
  activateOfflineMode,
  deactivateOfflineMode,
  incrementOrdersCreated,
  getOfflineSessions,
  getActiveSessions,
  syncOfflineSession,
};
