// =====================================================
// PLATFORM SYNC CONTROLLER
// REST API endpoints for delivery platform integration
// Handles menu sync, order processing, and status updates for Uber Eats, DoorDash, SkipTheDishes
// =====================================================

const uberEatsService = require('../services/uber-eats.service');
const doorDashService = require('../services/doordash.service');
const skipTheDishesService = require('../services/skipthedishes.service');

/**
 * Sync menu to Uber Eats platform
 * POST /api/platform-sync/uber-eats/menu
 */
async function syncUberEatsMenu(req, res) {
  try {
    const { branch_id } = req.body;
    const targetBranchId = branch_id || req.userBranch.branch_id;
    
    // Security check for cross-branch access
    if (branch_id && req.userBranch.role !== 'chain_owner') {
      return res.status(403).json({
        error: 'Access denied',
        message: 'Only chain owners can sync menus for other branches'
      });
    }

    const result = await uberEatsService.syncMenuToUberEats(targetBranchId, req.userBranch);

    res.json({
      success: true,
      message: 'Uber Eats menu sync completed',
      data: result
    });

  } catch (error) {
    console.error('Uber Eats menu sync error:', error);
    res.status(500).json({
      error: 'Menu sync failed',
      message: error.message,
      platform: 'uber_eats'
    });
  }
}

/**
 * Process incoming Uber Eats order webhook
 * POST /api/platform-sync/uber-eats/order
 */
async function processUberEatsOrder(req, res) {
  try {
    const { order: orderData, branch_id } = req.body;
    
    if (!orderData) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'Order data is required'
      });
    }

    const targetBranchId = branch_id || req.userBranch.branch_id;
    const createdOrder = await uberEatsService.processUberEatsOrder(orderData, targetBranchId);

    res.json({
      success: true,
      message: 'Uber Eats order processed successfully',
      data: {
        order_id: createdOrder.id,
        external_order_id: orderData.id,
        status: createdOrder.status
      }
    });

  } catch (error) {
    console.error('Uber Eats order processing error:', error);
    res.status(500).json({
      error: 'Order processing failed',
      message: error.message,
      platform: 'uber_eats'
    });
  }
}

/**
 * Update Uber Eats order status
 * PUT /api/platform-sync/uber-eats/order/:orderId/status
 */
async function updateUberEatsOrderStatus(req, res) {
  try {
    const { orderId } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'Status is required'
      });
    }

    const result = await uberEatsService.updateOrderStatusOnUberEats(orderId, status, req.userBranch);

    res.json({
      success: result.success,
      message: result.success ? 'Order status updated on Uber Eats' : 'Status update failed',
      data: {
        external_order_id: orderId,
        status: status,
        platform: 'uber_eats'
      }
    });

  } catch (error) {
    console.error('Uber Eats status update error:', error);
    res.status(500).json({
      error: 'Status update failed',
      message: error.message,
      platform: 'uber_eats'
    });
  }
}

/**
 * Sync menu to DoorDash platform
 * POST /api/platform-sync/doordash/menu
 */
async function syncDoorDashMenu(req, res) {
  try {
    const { branch_id } = req.body;
    const targetBranchId = branch_id || req.userBranch.branch_id;
    
    // Security check for cross-branch access
    if (branch_id && req.userBranch.role !== 'chain_owner') {
      return res.status(403).json({
        error: 'Access denied',
        message: 'Only chain owners can sync menus for other branches'
      });
    }

    const result = await doorDashService.syncMenuToDoorDash(targetBranchId, req.userBranch);

    res.json({
      success: true,
      message: 'DoorDash menu sync completed',
      data: result
    });

  } catch (error) {
    console.error('DoorDash menu sync error:', error);
    res.status(500).json({
      error: 'Menu sync failed',
      message: error.message,
      platform: 'doordash'
    });
  }
}

/**
 * Process incoming DoorDash order webhook
 * POST /api/platform-sync/doordash/order
 */
async function processDoorDashOrder(req, res) {
  try {
    const { order: orderData, branch_id } = req.body;
    
    if (!orderData) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'Order data is required'
      });
    }

    const targetBranchId = branch_id || req.userBranch.branch_id;
    const createdOrder = await doorDashService.processDoorDashOrder(orderData, targetBranchId);

    res.json({
      success: true,
      message: 'DoorDash order processed successfully',
      data: {
        order_id: createdOrder.id,
        external_order_id: orderData.id,
        status: createdOrder.status
      }
    });

  } catch (error) {
    console.error('DoorDash order processing error:', error);
    res.status(500).json({
      error: 'Order processing failed',
      message: error.message,
      platform: 'doordash'
    });
  }
}

/**
 * Confirm or reject DoorDash order
 * POST /api/platform-sync/doordash/order/:orderId/confirm
 */
async function confirmDoorDashOrder(req, res) {
  try {
    const { orderId } = req.params;
    const { accept, rejection_reason } = req.body;

    if (typeof accept !== 'boolean') {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'accept field must be boolean'
      });
    }

    const result = await doorDashService.confirmDoorDashOrder(
      orderId, 
      accept, 
      rejection_reason, 
      req.userBranch
    );

    res.json({
      success: result.success,
      message: result.success ? 
        `DoorDash order ${accept ? 'accepted' : 'rejected'}` : 
        'Order confirmation failed',
      data: {
        external_order_id: orderId,
        action: accept ? 'accepted' : 'rejected',
        platform: 'doordash'
      }
    });

  } catch (error) {
    console.error('DoorDash order confirmation error:', error);
    res.status(500).json({
      error: 'Order confirmation failed',
      message: error.message,
      platform: 'doordash'
    });
  }
}

/**
 * Update DoorDash order status
 * PUT /api/platform-sync/doordash/order/:orderId/status
 */
async function updateDoorDashOrderStatus(req, res) {
  try {
    const { orderId } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'Status is required'
      });
    }

    const result = await doorDashService.updateOrderStatusOnDoorDash(orderId, status, req.userBranch);

    res.json({
      success: result.success,
      message: result.success ? 'Order status updated on DoorDash' : 'Status update failed',
      data: {
        external_order_id: orderId,
        status: status,
        platform: 'doordash'
      }
    });

  } catch (error) {
    console.error('DoorDash status update error:', error);
    res.status(500).json({
      error: 'Status update failed',
      message: error.message,
      platform: 'doordash'
    });
  }
}

/**
 * Sync menu to SkipTheDishes platform (via third-party or CSV)
 * POST /api/platform-sync/skipthedishes/menu
 */
async function syncSkipTheDishesMenu(req, res) {
  try {
    const { branch_id } = req.body;
    const targetBranchId = branch_id || req.userBranch.branch_id;
    
    // Security check for cross-branch access
    if (branch_id && req.userBranch.role !== 'chain_owner') {
      return res.status(403).json({
        error: 'Access denied',
        message: 'Only chain owners can sync menus for other branches'
      });
    }

    const result = await skipTheDishesService.syncMenuToSkipTheDishes(targetBranchId, req.userBranch);

    res.json({
      success: true,
      message: 'SkipTheDishes menu sync completed',
      data: result
    });

  } catch (error) {
    console.error('SkipTheDishes menu sync error:', error);
    res.status(500).json({
      error: 'Menu sync failed',
      message: error.message,
      platform: 'skipthedishes'
    });
  }
}

/**
 * Process incoming SkipTheDishes order (via third-party webhook)
 * POST /api/platform-sync/skipthedishes/order
 */
async function processSkipTheDishesOrder(req, res) {
  try {
    const { order: orderData, branch_id } = req.body;
    
    if (!orderData) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'Order data is required'
      });
    }

    const targetBranchId = branch_id || req.userBranch.branch_id;
    const createdOrder = await skipTheDishesService.processSkipTheDishesOrder(orderData, targetBranchId);

    res.json({
      success: true,
      message: 'SkipTheDishes order processed successfully',
      data: {
        order_id: createdOrder.id,
        external_order_id: orderData.orderId || orderData.id,
        status: createdOrder.status
      }
    });

  } catch (error) {
    console.error('SkipTheDishes order processing error:', error);
    res.status(500).json({
      error: 'Order processing failed',
      message: error.message,
      platform: 'skipthedishes'
    });
  }
}

/**
 * Update SkipTheDishes order status (via third-party)
 * PUT /api/platform-sync/skipthedishes/order/:orderId/status
 */
async function updateSkipTheDishesOrderStatus(req, res) {
  try {
    const { orderId } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'Status is required'
      });
    }

    const result = await skipTheDishesService.updateOrderStatusOnSkipTheDishes(orderId, status, req.userBranch);

    res.json({
      success: result.success,
      message: result.success ? 'Order status updated on SkipTheDishes' : 'Status update failed',
      data: {
        external_order_id: orderId,
        status: status,
        platform: 'skipthedishes'
      }
    });

  } catch (error) {
    console.error('SkipTheDishes status update error:', error);
    res.status(500).json({
      error: 'Status update failed',
      message: error.message,
      platform: 'skipthedishes'
    });
  }
}

/**
 * Export menu to CSV for manual SkipTheDishes upload
 * GET /api/platform-sync/skipthedishes/export-csv
 */
async function exportSkipTheDishesCSV(req, res) {
  try {
    const { branch_id } = req.query;
    const targetBranchId = branch_id || req.userBranch.branch_id;
    
    // Security check for cross-branch access
    if (branch_id && req.userBranch.role !== 'chain_owner') {
      return res.status(403).json({
        error: 'Access denied',
        message: 'Only chain owners can export CSV for other branches'
      });
    }

    const result = await skipTheDishesService.exportMenuToCSV(targetBranchId, req.userBranch);

    res.json({
      success: true,
      message: 'SkipTheDishes CSV export completed',
      data: result
    });

  } catch (error) {
    console.error('SkipTheDishes CSV export error:', error);
    res.status(500).json({
      error: 'CSV export failed',
      message: error.message,
      platform: 'skipthedishes'
    });
  }
}

/**
 * Get sync status for all platforms
 * GET /api/platform-sync/status
 */
async function getPlatformSyncStatus(req, res) {
  try {
    const { branch_id } = req.query;
    const targetBranchId = branch_id || req.userBranch.branch_id;
    
    // Security check for cross-branch access
    if (branch_id && req.userBranch.role !== 'chain_owner') {
      return res.status(403).json({
        error: 'Access denied',
        message: 'Only chain owners can view sync status for other branches'
      });
    }

    // Get menu data for each platform
    const [uberEatsMenu, doorDashMenu, skipTheDishesMenu] = await Promise.allSettled([
      uberEatsService.getMenuWithMappings(targetBranchId, 'uber_eats'),
      doorDashService.getMenuWithMappings(targetBranchId, 'doordash'),
      skipTheDishesService.getMenuWithMappings(targetBranchId, 'skipthedishes')
    ]);

    const integrationMethods = {
      uber_eats: 'direct_api',
      doordash: 'direct_api',
      skipthedishes: skipTheDishesService.determineIntegrationMethod()
    };

    const platformStatus = {
      uber_eats: {
        platform: 'uber_eats',
        integration_method: integrationMethods.uber_eats,
        menu_items: uberEatsMenu.status === 'fulfilled' ? uberEatsMenu.value.totalItems : 0,
        mappings_count: uberEatsMenu.status === 'fulfilled' ? uberEatsMenu.value.mappingsCount : 0,
        sync_available: uberEatsMenu.status === 'fulfilled' && uberEatsMenu.value.totalItems > 0,
        last_sync: null, // Would come from mapping sync status
        errors: uberEatsMenu.status === 'rejected' ? [uberEatsMenu.reason.message] : []
      },
      doordash: {
        platform: 'doordash',
        integration_method: integrationMethods.doordash,
        menu_items: doorDashMenu.status === 'fulfilled' ? doorDashMenu.value.totalItems : 0,
        mappings_count: doorDashMenu.status === 'fulfilled' ? doorDashMenu.value.mappingsCount : 0,
        sync_available: doorDashMenu.status === 'fulfilled' && doorDashMenu.value.totalItems > 0,
        last_sync: null, // Would come from mapping sync status
        errors: doorDashMenu.status === 'rejected' ? [doorDashMenu.reason.message] : []
      },
      skipthedishes: {
        platform: 'skipthedishes',
        integration_method: integrationMethods.skipthedishes,
        menu_items: skipTheDishesMenu.status === 'fulfilled' ? skipTheDishesMenu.value.totalItems : 0,
        mappings_count: skipTheDishesMenu.status === 'fulfilled' ? skipTheDishesMenu.value.mappingsCount : 0,
        sync_available: skipTheDishesMenu.status === 'fulfilled' && skipTheDishesMenu.value.totalItems > 0,
        csv_export_available: true,
        last_sync: null, // Would come from mapping sync status
        errors: skipTheDishesMenu.status === 'rejected' ? [skipTheDishesMenu.reason.message] : []
      }
    };

    res.json({
      success: true,
      message: 'Platform sync status retrieved',
      data: {
        branch_id: targetBranchId,
        platforms: platformStatus,
        integration_methods: integrationMethods,
        summary: {
          total_platforms: 3,
          ready_to_sync: Object.values(platformStatus).filter(p => p.sync_available).length,
          total_menu_items: Object.values(platformStatus).reduce((sum, p) => sum + p.menu_items, 0),
          total_mappings: Object.values(platformStatus).reduce((sum, p) => sum + p.mappings_count, 0)
        }
      }
    });

  } catch (error) {
    console.error('Platform sync status error:', error);
    res.status(500).json({
      error: 'Failed to get platform sync status',
      message: error.message
    });
  }
}

/**
 * Bulk sync menu to multiple platforms
 * POST /api/platform-sync/bulk-sync
 */
async function bulkSyncMenus(req, res) {
  try {
    const { platforms, branch_id } = req.body;
    const targetBranchId = branch_id || req.userBranch.branch_id;
    
    // Security check for cross-branch access
    if (branch_id && req.userBranch.role !== 'chain_owner') {
      return res.status(403).json({
        error: 'Access denied',
        message: 'Only chain owners can sync menus for other branches'
      });
    }

    if (!platforms || !Array.isArray(platforms) || platforms.length === 0) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'platforms array is required'
      });
    }

    const validPlatforms = ['uber_eats', 'doordash', 'skipthedishes'];
    const invalidPlatforms = platforms.filter(p => !validPlatforms.includes(p));
    
    if (invalidPlatforms.length > 0) {
      return res.status(400).json({
        error: 'Invalid platforms',
        message: `Invalid platforms: ${invalidPlatforms.join(', ')}. Valid options: ${validPlatforms.join(', ')}`
      });
    }

    // Execute sync operations in parallel
    const syncPromises = platforms.map(async (platform) => {
      try {
        let result;
        switch (platform) {
          case 'uber_eats':
            result = await uberEatsService.syncMenuToUberEats(targetBranchId, req.userBranch);
            break;
          case 'doordash':
            result = await doorDashService.syncMenuToDoorDash(targetBranchId, req.userBranch);
            break;
          case 'skipthedishes':
            result = await skipTheDishesService.syncMenuToSkipTheDishes(targetBranchId, req.userBranch);
            break;
        }
        
        return {
          platform,
          success: true,
          result
        };
      } catch (error) {
        return {
          platform,
          success: false,
          error: error.message
        };
      }
    });

    const syncResults = await Promise.all(syncPromises);
    const successCount = syncResults.filter(r => r.success).length;
    const failureCount = syncResults.filter(r => !r.success).length;

    res.json({
      success: successCount > 0,
      message: `Bulk sync completed: ${successCount} successful, ${failureCount} failed`,
      data: {
        total_platforms: platforms.length,
        successful: successCount,
        failed: failureCount,
        results: syncResults
      }
    });

  } catch (error) {
    console.error('Bulk sync error:', error);
    res.status(500).json({
      error: 'Bulk sync failed',
      message: error.message
    });
  }
}

module.exports = {
  // Uber Eats endpoints
  syncUberEatsMenu,
  processUberEatsOrder,
  updateUberEatsOrderStatus,
  
  // DoorDash endpoints
  syncDoorDashMenu,
  processDoorDashOrder,
  confirmDoorDashOrder,
  updateDoorDashOrderStatus,
  
  // SkipTheDishes endpoints
  syncSkipTheDishesMenu,
  processSkipTheDishesOrder,
  updateSkipTheDishesOrderStatus,
  exportSkipTheDishesCSV,
  
  // General endpoints
  getPlatformSyncStatus,
  bulkSyncMenus
};