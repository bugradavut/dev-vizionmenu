// =====================================================
// REAL-TIME NOTIFICATIONS CONTROLLER
// Server-Sent Events (SSE) for restaurant dashboard notifications
// =====================================================

const { createClient } = require('@supabase/supabase-js');
const { requireAuth } = require('../middleware/auth.middleware');

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Store active SSE connections
const activeConnections = new Map();

/**
 * Establish SSE connection for real-time notifications
 * GET /api/v1/notifications/stream
 */
async function streamNotifications(req, res) {
  try {
    const user = req.user;
    const connectionId = `${user.id}_${Date.now()}`;

    console.log(`📡 SSE connection established for user: ${user.id}`);

    // Set SSE headers
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control'
    });

    // Send initial connection confirmation
    res.write(`data: ${JSON.stringify({
      type: 'connection_established',
      message: 'Real-time notifications connected',
      user_id: user.id,
      connection_id: connectionId,
      timestamp: new Date().toISOString()
    })}\n\n`);

    // Store connection info
    activeConnections.set(connectionId, {
      response: res,
      userId: user.id,
      userRole: user.role,
      chainId: user.chain_id,
      branchId: user.branch_id,
      connectedAt: new Date().toISOString()
    });

    // Keep connection alive with periodic heartbeat
    const heartbeatInterval = setInterval(() => {
      if (res.writableEnded) {
        clearInterval(heartbeatInterval);
        activeConnections.delete(connectionId);
        return;
      }
      
      res.write(`data: ${JSON.stringify({
        type: 'heartbeat',
        timestamp: new Date().toISOString()
      })}\n\n`);
    }, 30000); // 30 seconds

    // Handle client disconnect
    req.on('close', () => {
      console.log(`📡 SSE connection closed for user: ${user.id}`);
      clearInterval(heartbeatInterval);
      activeConnections.delete(connectionId);
    });

    req.on('error', (error) => {
      console.error(`📡 SSE connection error for user ${user.id}:`, error);
      clearInterval(heartbeatInterval);
      activeConnections.delete(connectionId);
    });

  } catch (error) {
    console.error('❌ Error establishing SSE connection:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to establish notification stream'
    });
  }
}

/**
 * Send notification to specific users via SSE
 * @param {string} eventType - Type of notification
 * @param {object} data - Notification data
 * @param {object} filters - User filtering criteria
 */
function broadcastNotification(eventType, data, filters = {}) {
  const notification = {
    type: eventType,
    data: data,
    timestamp: new Date().toISOString()
  };

  let sentCount = 0;

  for (const [connectionId, connection] of activeConnections.entries()) {
    try {
      // Apply filters
      let shouldSend = true;

      if (filters.userId && connection.userId !== filters.userId) {
        shouldSend = false;
      }

      if (filters.chainId && connection.chainId !== filters.chainId) {
        shouldSend = false;
      }

      if (filters.branchId && connection.branchId !== filters.branchId) {
        shouldSend = false;
      }

      if (filters.role && connection.userRole !== filters.role) {
        shouldSend = false;
      }

      if (shouldSend) {
        // Check if connection is still active
        if (connection.response.writableEnded) {
          activeConnections.delete(connectionId);
          continue;
        }

        connection.response.write(`data: ${JSON.stringify(notification)}\n\n`);
        sentCount++;
      }
    } catch (error) {
      console.error(`Error sending notification to ${connectionId}:`, error);
      activeConnections.delete(connectionId);
    }
  }

  console.log(`📡 Broadcast notification: ${eventType} sent to ${sentCount} connections`);
  return { sent: sentCount, eventType };
}

/**
 * Get active connection statistics
 * GET /api/v1/notifications/stats
 */
async function getConnectionStats(req, res) {
  try {
    const stats = {
      total_connections: activeConnections.size,
      connections_by_role: {},
      connections_by_chain: {},
      oldest_connection: null,
      newest_connection: null
    };

    let oldestTime = Date.now();
    let newestTime = 0;

    for (const connection of activeConnections.values()) {
      // Count by role
      stats.connections_by_role[connection.userRole] = 
        (stats.connections_by_role[connection.userRole] || 0) + 1;

      // Count by chain
      if (connection.chainId) {
        stats.connections_by_chain[connection.chainId] = 
          (stats.connections_by_chain[connection.chainId] || 0) + 1;
      }

      // Find oldest and newest connections
      const connectionTime = new Date(connection.connectedAt).getTime();
      if (connectionTime < oldestTime) {
        oldestTime = connectionTime;
        stats.oldest_connection = connection.connectedAt;
      }
      if (connectionTime > newestTime) {
        newestTime = connectionTime;
        stats.newest_connection = connection.connectedAt;
      }
    }

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('❌ Error getting connection stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get connection statistics'
    });
  }
}

/**
 * Send test notification (for development/testing)
 * POST /api/v1/notifications/test
 */
async function sendTestNotification(req, res) {
  try {
    const { eventType = 'test', message = 'Test notification', filters = {} } = req.body;

    const result = broadcastNotification(eventType, {
      message,
      test: true,
      sent_by: req.user.id
    }, filters);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('❌ Error sending test notification:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send test notification'
    });
  }
}

// ============================================
// EXPORTS
// ============================================

module.exports = {
  streamNotifications,
  broadcastNotification,
  getConnectionStats,
  sendTestNotification
};