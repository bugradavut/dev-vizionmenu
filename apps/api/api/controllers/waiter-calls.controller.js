// =====================================================
// WAITER CALLS CONTROLLER - SIMPLIFIED
// QR table waiter call system - minimal endpoints
// =====================================================

const waiterCallsService = require('../services/waiter-calls.service');

/**
 * Create new waiter call (Public endpoint for QR customers)
 * POST /api/v1/waiter-calls
 */
async function createWaiterCall(req, res) {
  try {
    const { branch_id, table_number, zone } = req.body;

    // Input validation
    if (!branch_id || !table_number) {
      return res.status(400).json({
        error: 'Branch ID and table number are required'
      });
    }

    // Create waiter call
    const waiterCall = await waiterCallsService.createWaiterCall({
      branch_id,
      table_number: parseInt(table_number),
      zone
    });

    res.status(201).json({
      data: waiterCall,
      meta: {
        message: 'Waiter call created successfully',
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error creating waiter call:', error);

    if (error.message.includes('wait before calling')) {
      return res.status(429).json({
        error: 'Rate limit exceeded',
        details: error.message
      });
    }

    res.status(500).json({
      error: 'Internal server error',
      details: 'Failed to create waiter call'
    });
  }
}

/**
 * Get pending waiter calls for branch staff
 * GET /api/v1/waiter-calls/pending
 * Requires auth middleware (req.userBranch will be populated)
 */
async function getPendingWaiterCalls(req, res) {
  try {
    // User and branch context provided by auth middleware
    const branchId = req.userBranch.branch_id;

    // Get pending waiter calls for user's branch
    const waiterCalls = await waiterCallsService.getPendingWaiterCalls(branchId);

    res.json({
      data: waiterCalls,
      meta: {
        count: waiterCalls.length,
        timestamp: new Date().toISOString(),
        branchId: branchId
      }
    });

  } catch (error) {
    console.error('Error fetching pending waiter calls:', error);

    res.status(500).json({
      error: 'Internal server error',
      details: 'Failed to fetch pending waiter calls'
    });
  }
}

/**
 * Resolve waiter call (delete it)
 * DELETE /api/v1/waiter-calls/:id
 * Requires auth middleware (req.currentUserId will be populated)
 */
async function resolveWaiterCall(req, res) {
  try {
    const { id } = req.params;

    // Resolve waiter call
    const result = await waiterCallsService.resolveWaiterCall(id);

    res.json({
      data: result,
      meta: {
        message: 'Waiter call resolved successfully',
        resolvedBy: req.currentUserId,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error resolving waiter call:', error);

    res.status(500).json({
      error: 'Internal server error',
      details: 'Failed to resolve waiter call'
    });
  }
}

module.exports = {
  createWaiterCall,
  getPendingWaiterCalls,
  resolveWaiterCall
};