// =====================================================
// PLATFORM SYNC CONTROLLER
// REST API endpoints for delivery platform integration
// Handles menu sync, order processing, and status updates for Uber Eats, DoorDash, SkipTheDishes
// =====================================================

const uberEatsService = require('../services/uber-eats.service');
const doorDashService = require('../services/doordash.service');
const skipTheDishesService = require('../services/skipthedishes.service');
const uberDirectService = require('../services/uber-direct.service');

/**
 * Helper function to check branch access permissions
 * Branch managers can only access their own branch
 * Chain owners can access any branch
 */
function checkBranchAccess(requestedBranchId, userBranch, actionName) {
  // If no specific branch requested, use user's branch (always allowed)
  if (!requestedBranchId) {
    return { allowed: true, targetBranchId: userBranch.branch_id };
  }

  // If requesting own branch, always allowed
  if (requestedBranchId === userBranch.branch_id) {
    return { allowed: true, targetBranchId: requestedBranchId };
  }

  // If requesting different branch, only chain owners allowed
  if (userBranch.role === 'chain_owner') {
    return { allowed: true, targetBranchId: requestedBranchId };
  }

  // Access denied
  return {
    allowed: false,
    error: {
      status: 403,
      message: `Only chain owners can ${actionName} for other branches`
    }
  };
}

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

/**
 * ========================================
 * UBER DIRECT DELIVERY SERVICE ENDPOINTS
 * White-label courier dispatch service
 * ✅ TEST MODE SAFE - No real deliveries
 * ========================================
 */

/**
 * Get delivery quote from Uber Direct
 * POST /api/v1/platform-sync/uber-direct/quote
 */
async function getUberDirectQuote(req, res) {
  try {
    const { branch_id, dropoff_address } = req.body;

    if (!branch_id || !dropoff_address) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'branch_id and dropoff_address are required',
        required_fields: ['branch_id', 'dropoff_address']
      });
    }

    // Validate dropoff address format
    const requiredAddressFields = ['street', 'city', 'state', 'zip'];
    const missingFields = requiredAddressFields.filter(field =>
      !dropoff_address[field] && !dropoff_address[field.replace('street', 'line1')]
    );

    if (missingFields.length > 0) {
      return res.status(400).json({
        error: 'Invalid address',
        message: `Missing required address fields: ${missingFields.join(', ')}`,
        provided_address: dropoff_address
      });
    }

    console.log(`🚀 Getting Uber Direct quote for branch ${branch_id}...`);
    const quote = await uberDirectService.createDeliveryQuote(branch_id, dropoff_address);

    res.json({
      success: true,
      message: 'Uber Direct quote generated successfully',
      data: {
        quote_id: quote.quote_id,
        delivery_fee: quote.delivery_fee,
        currency: quote.currency,
        eta_minutes: quote.eta_minutes,
        pickup_duration: quote.pickup_duration,
        delivery_duration: quote.delivery_duration,
        expires_at: quote.expires_at,
        platform: 'uber_direct',
        test_mode: uberDirectService.isTestMode
      }
    });

  } catch (error) {
    console.error('❌ Uber Direct quote error:', error.message);
    res.status(500).json({
      error: 'Quote generation failed',
      message: error.message,
      platform: 'uber_direct',
      test_mode: uberDirectService.isTestMode
    });
  }
}

/**
 * Create delivery with Uber Direct
 * POST /api/v1/platform-sync/uber-direct/delivery
 */
async function createUberDirectDelivery(req, res) {
  try {
    const { order_id, quote_id, branch_id } = req.body;

    if (!order_id) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'order_id is required',
        required_fields: ['order_id']
      });
    }

    console.log(`🚚 Creating Uber Direct delivery for order ${order_id}...`);

    // If quote_id is 'auto', create quote + delivery automatically using order address
    let finalQuoteId = quote_id;
    if (quote_id === 'auto') {
      console.log(`🧮 Auto-generating quote for order ${order_id}...`);
      const quote = await uberDirectService.createQuoteFromOrder(order_id);
      finalQuoteId = quote.quote_id;
    }

    const delivery = await uberDirectService.createDelivery(order_id, finalQuoteId);

    res.json({
      success: true,
      message: uberDirectService.isTestMode ?
        'Test delivery created successfully (no real courier dispatched)' :
        'Uber Direct delivery created successfully',
      data: {
        uber_delivery_id: delivery.uber_delivery_id,
        tracking_url: delivery.tracking_url,
        status: delivery.status,
        courier_info: delivery.courier_info,
        estimated_arrival: delivery.estimated_arrival,
        platform: 'uber_direct',
        test_mode: uberDirectService.isTestMode
      }
    });

  } catch (error) {
    console.error('❌ Uber Direct delivery creation error:', error.message);
    res.status(500).json({
      error: 'Delivery creation failed',
      message: error.message,
      platform: 'uber_direct',
      test_mode: uberDirectService.isTestMode
    });
  }
}

/**
 * Cancel Uber Direct delivery (for testing)
 * POST /api/v1/platform-sync/uber-direct/cancel
 */
async function cancelUberDirectDelivery(req, res) {
  try {
    const { delivery_id } = req.body;

    if (!delivery_id) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'delivery_id is required'
      });
    }

    console.log(`🚫 Cancelling Uber Direct delivery ${delivery_id}...`);
    const result = await uberDirectService.cancelDelivery(delivery_id);

    res.json({
      success: true,
      message: 'Delivery cancelled successfully',
      data: {
        delivery_id: result.delivery_id,
        status: result.status,
        cancelled_at: result.cancelled_at,
        platform: 'uber_direct',
        test_mode: uberDirectService.isTestMode
      }
    });

  } catch (error) {
    console.error('❌ Uber Direct cancellation error:', error.message);
    res.status(500).json({
      error: 'Delivery cancellation failed',
      message: error.message,
      platform: 'uber_direct',
      test_mode: uberDirectService.isTestMode
    });
  }
}

/**
 * Process Uber Direct webhook
 * POST /api/v1/platform-sync/uber-direct/webhooks
 */
async function processUberDirectWebhook(req, res) {
  try {
    // Verify webhook signature (implement signature verification here)
    const signature = req.headers['x-uber-signature'];

    if (!signature) {
      console.warn('⚠️ Uber Direct webhook received without signature');
    }

    console.log('📡 Processing Uber Direct webhook...', req.body?.event_type);
    const success = await uberDirectService.processWebhook(req.body);

    if (success) {
      res.status(200).json({
        success: true,
        message: 'Webhook processed successfully'
      });
    } else {
      res.status(400).json({
        error: 'Webhook processing failed',
        message: 'Invalid webhook payload or processing error'
      });
    }

  } catch (error) {
    console.error('❌ Uber Direct webhook error:', error.message);
    res.status(500).json({
      error: 'Webhook processing failed',
      message: error.message
    });
  }
}

/**
 * Get Uber Direct service status and configuration
 * GET /api/v1/platform-sync/uber-direct/status
 */
async function getUberDirectStatus(req, res) {
  try {
    res.json({
      success: true,
      message: 'Uber Direct service status',
      data: {
        platform: 'uber_direct',
        service_name: 'Uber Direct White-Label Courier',
        test_mode: uberDirectService.isTestMode,
        customer_id: uberDirectService.customerId,
        base_url: uberDirectService.baseUrl,
        features: {
          quote_generation: true,
          delivery_creation: true,
          real_time_tracking: true,
          webhook_processing: true,
          delivery_cancellation: true
        },
        integration_type: 'white_label_courier',
        description: 'White-label courier service - customers see VizionMenu brand, not Uber'
      }
    });

  } catch (error) {
    console.error('❌ Uber Direct status error:', error.message);
    res.status(500).json({
      error: 'Status check failed',
      message: error.message
    });
  }
}

// =====================================================
// UBER EATS INTEGRATION CONFIG ENDPOINTS ✅ NEW
// Required by Uber Eats for validation approval
// Handles store provisioning (activate/remove/update integration)
// =====================================================

/**
 * Activate Uber Eats integration for a store
 * POST /api/platform-sync/uber-eats/integration/activate
 */
async function activateUberEatsIntegration(req, res) {
  try {
    console.log('🔍 activateUberEatsIntegration - Request body:', req.body);
    console.log('🔍 activateUberEatsIntegration - Headers:', req.headers);

    const { store_id, branch_id } = req.body;

    if (!store_id) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'store_id is required'
      });
    }

    if (!branch_id) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'branch_id is required'
      });
    }

    console.log('🔍 Calling activateIntegration with:', { store_id, branch_id });
    const result = await uberEatsService.activateIntegration(store_id, branch_id, null);
    console.log('✅ activateIntegration result:', result);

    res.status(200).json({
      success: true,
      message: 'Uber Eats integration activated successfully',
      data: {
        store_id: store_id,
        branch_id: branch_id,
        integration_status: 'active',
        activated_at: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Uber Eats integration activation error:', error);
    res.status(500).json({
      error: 'Integration activation failed',
      message: error.message,
      platform: 'uber_eats'
    });
  }
}

/**
 * Remove Uber Eats integration for a store
 * POST /api/platform-sync/uber-eats/integration/remove
 */
async function removeUberEatsIntegration(req, res) {
  try {
    const { store_id, branch_id } = req.body;

    if (!store_id) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'store_id is required'
      });
    }

    if (!branch_id) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'branch_id is required'
      });
    }

    const result = await uberEatsService.removeIntegration(store_id, branch_id, null);

    res.status(200).json({
      success: true,
      message: 'Uber Eats integration removed successfully',
      data: {
        store_id: store_id,
        branch_id: branch_id,
        integration_status: 'removed',
        removed_at: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Uber Eats integration removal error:', error);
    res.status(500).json({
      error: 'Integration removal failed',
      message: error.message,
      platform: 'uber_eats'
    });
  }
}

/**
 * Update Uber Eats integration details for a store
 * PUT /api/platform-sync/uber-eats/integration/update
 */
async function updateUberEatsIntegrationDetails(req, res) {
  try {
    const { store_id, branch_id, integration_settings } = req.body;

    if (!store_id) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'store_id is required'
      });
    }

    if (!branch_id) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'branch_id is required'
      });
    }

    const result = await uberEatsService.updateIntegrationDetails(
      store_id,
      branch_id,
      integration_settings,
      null
    );

    res.status(200).json({
      success: true,
      message: 'Uber Eats integration details updated successfully',
      data: {
        store_id: store_id,
        branch_id: branch_id,
        integration_status: 'updated',
        updated_at: new Date().toISOString(),
        settings: integration_settings
      }
    });

  } catch (error) {
    console.error('Uber Eats integration update error:', error);
    res.status(500).json({
      error: 'Integration update failed',
      message: error.message,
      platform: 'uber_eats'
    });
  }
}

// =====================================================
// UBER EATS ORDER MANAGEMENT ENDPOINTS ✅ NEW
// Required by Uber Eats for validation approval
// Handles order lifecycle (accept/deny/cancel/get/update)
// =====================================================

/**
 * Accept Uber Eats order
 * POST /api/platform-sync/uber-eats/orders/:orderId/accept
 */
async function acceptUberEatsOrder(req, res) {
  try {
    const { orderId } = req.params;
    const { branch_id } = req.body;

    if (!orderId) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'orderId is required'
      });
    }

    if (!branch_id) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'branch_id is required'
      });
    }

    const result = await uberEatsService.acceptOrder(orderId, branch_id, null);

    res.status(200).json({
      success: true,
      message: 'Uber Eats order accepted successfully',
      data: {
        order_id: orderId,
        external_order_id: result.external_order_id,
        branch_id: branch_id,
        status: 'accepted',
        accepted_at: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Uber Eats order accept error:', error);
    res.status(500).json({
      error: 'Order accept failed',
      message: error.message,
      platform: 'uber_eats'
    });
  }
}

/**
 * Deny Uber Eats order
 * POST /api/platform-sync/uber-eats/orders/:orderId/deny
 */
async function denyUberEatsOrder(req, res) {
  try {
    const { orderId } = req.params;
    const { branch_id, reason } = req.body;

    if (!orderId) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'orderId is required'
      });
    }

    if (!branch_id) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'branch_id is required'
      });
    }

    const result = await uberEatsService.denyOrder(orderId, branch_id, reason, null);

    res.status(200).json({
      success: true,
      message: 'Uber Eats order denied successfully',
      data: {
        order_id: orderId,
        external_order_id: result.external_order_id,
        branch_id: branch_id,
        status: 'denied',
        reason: reason,
        denied_at: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Uber Eats order deny error:', error);
    res.status(500).json({
      error: 'Order deny failed',
      message: error.message,
      platform: 'uber_eats'
    });
  }
}

/**
 * Cancel Uber Eats order
 * POST /api/platform-sync/uber-eats/orders/:orderId/cancel
 */
async function cancelUberEatsOrder(req, res) {
  try {
    const { orderId } = req.params;
    const { branch_id, reason } = req.body;

    if (!orderId) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'orderId is required'
      });
    }

    if (!branch_id) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'branch_id is required'
      });
    }

    const result = await uberEatsService.cancelOrder(orderId, branch_id, reason, null);

    res.status(200).json({
      success: true,
      message: 'Uber Eats order cancelled successfully',
      data: {
        order_id: orderId,
        external_order_id: result.external_order_id,
        branch_id: branch_id,
        status: 'cancelled',
        reason: reason,
        cancelled_at: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Uber Eats order cancel error:', error);
    res.status(500).json({
      error: 'Order cancel failed',
      message: error.message,
      platform: 'uber_eats'
    });
  }
}

/**
 * Get Uber Eats order details
 * GET /api/platform-sync/uber-eats/orders/:orderId
 */
async function getUberEatsOrderDetails(req, res) {
  try {
    const { orderId } = req.params;
    const { branch_id } = req.query;

    if (!orderId) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'orderId is required'
      });
    }

    if (!branch_id) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'branch_id is required'
      });
    }

    const orderDetails = await uberEatsService.getOrderDetails(orderId, branch_id, null);

    res.status(200).json({
      success: true,
      message: 'Order details retrieved successfully',
      data: orderDetails
    });

  } catch (error) {
    console.error('Uber Eats order details error:', error);
    res.status(500).json({
      error: 'Order details retrieval failed',
      message: error.message,
      platform: 'uber_eats'
    });
  }
}

/**
 * Update Uber Eats order
 * PUT /api/platform-sync/uber-eats/orders/:orderId
 */
async function updateUberEatsOrder(req, res) {
  try {
    const { orderId } = req.params;
    const { branch_id, status, updates } = req.body;

    if (!orderId) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'orderId is required'
      });
    }

    if (!branch_id) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'branch_id is required'
      });
    }

    const result = await uberEatsService.updateOrder(orderId, branch_id, { status, ...updates }, null);

    res.status(200).json({
      success: true,
      message: 'Uber Eats order updated successfully',
      data: {
        order_id: orderId,
        external_order_id: result.external_order_id,
        branch_id: branch_id,
        status: status,
        updated_at: new Date().toISOString(),
        updates: updates
      }
    });

  } catch (error) {
    console.error('Uber Eats order update error:', error);
    res.status(500).json({
      error: 'Order update failed',
      message: error.message,
      platform: 'uber_eats'
    });
  }
}

// =====================================================
// UBER EATS MENU MANAGEMENT ENDPOINTS ✅ NEW
// Required by Uber Eats for validation approval
// Handles menu uploads and item updates
// =====================================================

/**
 * Update Uber Eats menu item
 * PUT /api/platform-sync/uber-eats/menu/items/:itemId
 */
async function updateUberEatsMenuItem(req, res) {
  try {
    const { itemId } = req.params;
    const { branch_id, item_updates } = req.body;

    if (!itemId) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'itemId is required'
      });
    }

    if (!branch_id) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'branch_id is required'
      });
    }

    if (!item_updates) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'item_updates is required'
      });
    }

    const result = await uberEatsService.updateMenuItem(itemId, branch_id, item_updates, null);

    res.status(200).json({
      success: true,
      message: 'Menu item updated successfully on Uber Eats',
      data: {
        item_id: itemId,
        branch_id: branch_id,
        updates: item_updates,
        updated_at: new Date().toISOString(),
        uber_response: result
      }
    });

  } catch (error) {
    console.error('Uber Eats menu item update error:', error);
    res.status(500).json({
      error: 'Menu item update failed',
      message: error.message,
      platform: 'uber_eats'
    });
  }
}

/**
 * Upload complete menu to Uber Eats
 * PUT /api/platform-sync/uber-eats/menu/upload
 */
async function uploadUberEatsMenu(req, res) {
  try {
    const { branch_id, menu_data, store_id } = req.body;

    if (!branch_id) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'branch_id is required'
      });
    }

    if (!menu_data) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'menu_data is required'
      });
    }

    // Use existing sync function but with direct menu data
    const result = await uberEatsService.uploadCompleteMenu(branch_id, menu_data, store_id, null);

    res.status(200).json({
      success: true,
      message: 'Complete menu uploaded successfully to Uber Eats',
      data: {
        branch_id: accessCheck.targetBranchId,
        store_id: store_id,
        menu_items_count: menu_data.categories ?
          menu_data.categories.reduce((total, cat) => total + (cat.items ? cat.items.length : 0), 0) : 0,
        uploaded_at: new Date().toISOString(),
        uber_response: result
      }
    });

  } catch (error) {
    console.error('Uber Eats menu upload error:', error);
    res.status(500).json({
      error: 'Menu upload failed',
      message: error.message,
      platform: 'uber_eats'
    });
  }
}

// =====================================================
// UBER EATS STORE MANAGEMENT ENDPOINTS ✅ NEW
// Required by Uber Eats for validation approval
// Handles store configuration (holiday hours, etc.)
// =====================================================

/**
 * Update Uber Eats store holiday hours
 * POST /api/platform-sync/uber-eats/stores/:storeId/holiday-hours
 */
async function updateUberEatsHolidayHours(req, res) {
  try {
    const { storeId } = req.params;
    const { branch_id, holiday_hours } = req.body;

    if (!storeId) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'storeId is required'
      });
    }

    if (!branch_id) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'branch_id is required'
      });
    }

    if (!holiday_hours || !Array.isArray(holiday_hours)) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'holiday_hours array is required'
      });
    }

    const result = await uberEatsService.updateHolidayHours(storeId, branch_id, holiday_hours, null);

    res.status(200).json({
      success: true,
      message: 'Holiday hours updated successfully on Uber Eats',
      data: {
        store_id: storeId,
        branch_id: branch_id,
        holiday_hours: holiday_hours,
        holiday_count: holiday_hours.length,
        updated_at: new Date().toISOString(),
        uber_response: result
      }
    });

  } catch (error) {
    console.error('Uber Eats holiday hours update error:', error);
    res.status(500).json({
      error: 'Holiday hours update failed',
      message: error.message,
      platform: 'uber_eats'
    });
  }
}

// =====================================================
// UBER EATS WEBHOOK RECEIVERS ✅ NEW
// Required by Uber Eats for validation approval
// Handles incoming webhooks from Uber (order notifications, cancellations)
// Must respond with 200 status code within seconds
// =====================================================

/**
 * Handle Uber Eats order notification webhook
 * POST /api/platform-sync/uber-eats/webhooks/order-notification
 */
async function processUberEatsOrderNotificationWebhook(req, res) {
  try {
    // CRITICAL: Acknowledge webhook immediately with 200 response
    res.status(200).json({
      success: true,
      message: 'Order notification webhook received',
      timestamp: new Date().toISOString()
    });

    // Process webhook payload asynchronously after response
    const { event_type, data, resource_href, resource_id } = req.body;

    console.log('🔔 Uber Eats Order Notification Webhook:', {
      event_type,
      resource_id,
      resource_href,
      timestamp: new Date().toISOString()
    });

    // Validate webhook signature (security check)
    const signature = req.headers['x-uber-signature'];
    if (signature) {
      const isValid = await uberEatsService.validateWebhookSignature(req.body, signature);
      if (!isValid) {
        console.error('❌ Invalid webhook signature from Uber Eats');
        return; // Don't process invalid webhooks
      }
    }

    // Process the order notification asynchronously
    if (event_type === 'orders.notification' && resource_id) {
      // Fetch full order details and process
      setTimeout(async () => {
        try {
          await uberEatsService.processOrderNotificationWebhook(resource_id, data, req.body);
          console.log('✅ Order notification processed successfully:', resource_id);
        } catch (error) {
          console.error('❌ Order notification processing failed:', error);
        }
      }, 100); // Process after response sent
    }

  } catch (error) {
    console.error('Uber Eats order notification webhook error:', error);
    // Still send 200 response to acknowledge receipt
    if (!res.headersSent) {
      res.status(200).json({
        success: true,
        message: 'Webhook received but processing failed',
        error: error.message
      });
    }
  }
}

/**
 * Handle Uber Eats order cancelled webhook
 * POST /api/platform-sync/uber-eats/webhooks/order-cancelled
 */
async function processUberEatsOrderCancelledWebhook(req, res) {
  try {
    // CRITICAL: Acknowledge webhook immediately with 200 response
    res.status(200).json({
      success: true,
      message: 'Order cancelled webhook received',
      timestamp: new Date().toISOString()
    });

    // Process webhook payload asynchronously after response
    const { event_type, data, resource_href, resource_id } = req.body;

    console.log('❌ Uber Eats Order Cancelled Webhook:', {
      event_type,
      resource_id,
      resource_href,
      timestamp: new Date().toISOString()
    });

    // Validate webhook signature (security check)
    const signature = req.headers['x-uber-signature'];
    if (signature) {
      const isValid = await uberEatsService.validateWebhookSignature(req.body, signature);
      if (!isValid) {
        console.error('❌ Invalid webhook signature from Uber Eats');
        return; // Don't process invalid webhooks
      }
    }

    // Process the order cancellation asynchronously
    if ((event_type === 'orders.cancel' || event_type === 'orders.failure') && resource_id) {
      // Process cancellation
      setTimeout(async () => {
        try {
          await uberEatsService.processOrderCancelledWebhook(resource_id, data, req.body);
          console.log('✅ Order cancellation processed successfully:', resource_id);
        } catch (error) {
          console.error('❌ Order cancellation processing failed:', error);
        }
      }, 100); // Process after response sent
    }

  } catch (error) {
    console.error('Uber Eats order cancelled webhook error:', error);
    // Still send 200 response to acknowledge receipt
    if (!res.headersSent) {
      res.status(200).json({
        success: true,
        message: 'Webhook received but processing failed',
        error: error.message
      });
    }
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

  // Uber Direct endpoints ✅ NEW
  getUberDirectQuote,
  createUberDirectDelivery,
  cancelUberDirectDelivery,
  processUberDirectWebhook,
  getUberDirectStatus,

  // =====================================================
  // UBER EATS INTEGRATION CONFIG ENDPOINTS ✅ NEW
  // Required by Uber for validation approval
  // =====================================================
  activateUberEatsIntegration,
  removeUberEatsIntegration,
  updateUberEatsIntegrationDetails,

  // =====================================================
  // UBER EATS ORDER MANAGEMENT ENDPOINTS ✅ NEW
  // Required by Uber for validation approval
  // =====================================================
  acceptUberEatsOrder,
  denyUberEatsOrder,
  cancelUberEatsOrder,
  getUberEatsOrderDetails,
  updateUberEatsOrder,

  // =====================================================
  // UBER EATS MENU MANAGEMENT ENDPOINTS ✅ NEW
  // Required by Uber for validation approval
  // =====================================================
  updateUberEatsMenuItem,
  uploadUberEatsMenu,

  // =====================================================
  // UBER EATS STORE MANAGEMENT ENDPOINTS ✅ NEW
  // Required by Uber for validation approval
  // =====================================================
  updateUberEatsStoreHolidayHours: updateUberEatsHolidayHours,

  // =====================================================
  // UBER EATS WEBHOOK RECEIVERS ✅ NEW
  // Required by Uber for validation approval
  // =====================================================
  processUberEatsOrderNotificationWebhook,
  processUberEatsOrderCancelledWebhook,

  // General endpoints
  getPlatformSyncStatus,
  bulkSyncMenus
};