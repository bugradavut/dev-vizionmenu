// =====================================================
// DOORDASH INTEGRATION SERVICE
// Complete DoorDash API integration for menu sync, order processing, and status updates
// Uses JWT authentication and DoorDash-specific formats
// =====================================================

const { createClient } = require('@supabase/supabase-js');
const jwt = require('jsonwebtoken');

// Create Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Sync complete menu to DoorDash platform
 * @param {string} branchId - Branch ID
 * @param {Object} userBranch - User branch context
 * @returns {Object} Sync result with status and metadata
 */
async function syncMenuToDoorDash(branchId, userBranch) {
  const startTime = Date.now();
  let itemsProcessed = 0;
  let itemsSucceeded = 0;
  let itemsFailed = 0;
  const errors = [];

  try {
    // Get branch information
    const { data: branch, error: branchError } = await supabase
      .from('branches')
      .select('id, name, chain_id')
      .eq('id', branchId)
      .single();

    if (branchError || !branch) {
      throw new Error('Branch not found or access denied');
    }

    // Get menu data with mappings
    const menuData = await getMenuWithMappings(branchId, 'doordash');
    
    if (!menuData.categories || menuData.categories.length === 0) {
      throw new Error('No menu categories found for sync');
    }

    // Convert to DoorDash format
    const doorDashMenu = convertMenuToDoorDashFormat(menuData, branch);
    itemsProcessed = countMenuItems(menuData);

    // Perform API call (mock or real)
    const syncResult = await performDoorDashMenuSync(branch.id, doorDashMenu);
    
    if (syncResult.success) {
      itemsSucceeded = itemsProcessed;
      
      // Update mapping sync status
      await updateMappingSyncStatus(branchId, 'doordash', 'synced');
    } else {
      itemsFailed = itemsProcessed;
      errors.push(syncResult.error);
    }

    // Log sync operation
    const duration = Date.now() - startTime;
    await logPlatformSync(
      branchId,
      'doordash', 
      'menu_upload',
      'sync_menu_to_platform',
      syncResult.success ? 'success' : 'failed',
      itemsProcessed,
      itemsSucceeded,
      itemsFailed,
      errors.length > 0 ? { errors } : null,
      duration,
      userBranch.user_id
    );

    return {
      success: syncResult.success,
      platform: 'doordash',
      itemsProcessed,
      itemsSucceeded,
      itemsFailed,
      duration,
      menuId: syncResult.menu_id || `mock_dd_${Date.now()}`,
      errors
    };

  } catch (error) {
    const duration = Date.now() - startTime;
    
    // Log failed sync
    await logPlatformSync(
      branchId,
      'doordash',
      'menu_upload', 
      'sync_menu_to_platform',
      'failed',
      itemsProcessed,
      0,
      itemsProcessed,
      { error: error.message },
      duration,
      userBranch.user_id
    );

    throw new Error(`DoorDash menu sync failed: ${error.message}`);
  }
}

/**
 * Process incoming order from DoorDash webhook
 * @param {Object} doorDashOrder - Raw DoorDash order data
 * @param {string} branchId - Target branch ID
 * @returns {Object} Created Vizion Menu order
 */
async function processDoorDashOrder(doorDashOrder, branchId) {
  try {
    const orderData = doorDashOrder.order || doorDashOrder;
    
    // Validate required order data
    if (!orderData.id || !orderData.items || !orderData.customer) {
      throw new Error('Invalid DoorDash order data - missing required fields');
    }

    // Check for duplicate order
    const { data: existingOrder } = await supabase
      .from('orders')
      .select('id')
      .eq('external_order_id', orderData.id)
      .eq('third_party_platform', 'doordash')
      .single();

    if (existingOrder) {
      throw new Error(`Duplicate order detected: ${orderData.id}`);
    }

    // Convert to Vizion Menu format
    const vizionOrder = convertDoorDashOrderToVizion(orderData, branchId);

    // Validate and map menu items
    const validatedItems = await validateAndMapOrderItems(vizionOrder.items, branchId, 'doordash');
    vizionOrder.items = validatedItems;

    // Create order in Vizion Menu system
    const { data: createdOrder, error: orderError } = await supabase
      .from('orders')
      .insert([{
        ...vizionOrder,
        branch_id: branchId,
        status: 'pending',
        created_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (orderError) {
      throw new Error(`Failed to create order: ${orderError.message}`);
    }

    // Create order items
    if (vizionOrder.items && vizionOrder.items.length > 0) {
      const orderItems = vizionOrder.items.map(item => ({
        order_id: createdOrder.id,
        menu_item_name: item.name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.total_price,
        special_requests: item.special_instructions || null,
        modifiers: item.modifiers ? JSON.stringify(item.modifiers) : null
      }));

      await supabase
        .from('order_items')
        .insert(orderItems);
    }

    // Log successful order processing
    await logPlatformSync(
      branchId,
      'doordash',
      'order_sync',
      'process_incoming_order',
      'success',
      1,
      1,
      0,
      null,
      null,
      null,
      { order_id: createdOrder.id, external_id: orderData.id }
    );

    return createdOrder;

  } catch (error) {
    // Log failed order processing
    await logPlatformSync(
      branchId,
      'doordash',
      'order_sync',
      'process_incoming_order', 
      'failed',
      1,
      0,
      1,
      { error: error.message, external_id: doorDashOrder.order?.id || doorDashOrder.id }
    );

    throw error;
  }
}

/**
 * Update order status on DoorDash platform
 * @param {string} externalOrderId - DoorDash order ID
 * @param {string} vizionStatus - Vizion Menu status
 * @param {Object} userBranch - User branch context
 * @returns {Object} Status update result
 */
async function updateOrderStatusOnDoorDash(externalOrderId, vizionStatus, userBranch) {
  try {
    // Convert Vizion status to DoorDash status
    const doorDashStatus = convertStatusToDoorDash(vizionStatus);
    
    if (!doorDashStatus) {
      throw new Error(`Cannot map Vizion status '${vizionStatus}' to DoorDash status`);
    }

    // Perform status update (mock or real)
    const updateResult = await performDoorDashStatusUpdate(externalOrderId, doorDashStatus);

    // Log status update
    await logPlatformSync(
      userBranch.branch_id,
      'doordash',
      'status_update',
      'update_order_status',
      updateResult.success ? 'success' : 'failed',
      1,
      updateResult.success ? 1 : 0,
      updateResult.success ? 0 : 1,
      updateResult.success ? null : { error: updateResult.error },
      null,
      userBranch.user_id,
      { 
        external_order_id: externalOrderId, 
        vizion_status: vizionStatus,
        doordash_status: doorDashStatus
      }
    );

    return updateResult;

  } catch (error) {
    // Log failed status update
    await logPlatformSync(
      userBranch.branch_id,
      'doordash',
      'status_update',
      'update_order_status',
      'failed',
      1,
      0,
      1,
      { error: error.message },
      null,
      userBranch.user_id,
      { external_order_id: externalOrderId, vizion_status: vizionStatus }
    );

    throw error;
  }
}

/**
 * Confirm or reject DoorDash order
 * @param {string} externalOrderId - DoorDash order ID
 * @param {boolean} accept - Whether to accept the order
 * @param {string} rejectionReason - Reason for rejection (if applicable)
 * @param {Object} userBranch - User branch context
 * @returns {Object} Confirmation result
 */
async function confirmDoorDashOrder(externalOrderId, accept, rejectionReason, userBranch) {
  try {
    const confirmationData = {
      confirmation_status: accept ? 'accepted' : 'rejected'
    };

    if (!accept && rejectionReason) {
      confirmationData.rejection_reason = rejectionReason;
    }

    if (accept) {
      // Add estimated pickup time for accepted orders
      const estimatedTime = new Date();
      estimatedTime.setMinutes(estimatedTime.getMinutes() + 25); // 25 minutes default
      confirmationData.estimated_pickup_time = estimatedTime.toISOString();
    }

    // Perform confirmation (mock or real)
    const confirmResult = await performDoorDashOrderConfirmation(externalOrderId, confirmationData);

    // Log confirmation
    await logPlatformSync(
      userBranch.branch_id,
      'doordash',
      'order_sync',
      accept ? 'confirm_order' : 'reject_order',
      confirmResult.success ? 'success' : 'failed',
      1,
      confirmResult.success ? 1 : 0,
      confirmResult.success ? 0 : 1,
      confirmResult.success ? null : { error: confirmResult.error },
      null,
      userBranch.user_id,
      { external_order_id: externalOrderId, action: accept ? 'accepted' : 'rejected' }
    );

    return confirmResult;

  } catch (error) {
    // Log failed confirmation
    await logPlatformSync(
      userBranch.branch_id,
      'doordash',
      'order_sync',
      'confirm_order',
      'failed',
      1,
      0,
      1,
      { error: error.message },
      null,
      userBranch.user_id,
      { external_order_id: externalOrderId }
    );

    throw error;
  }
}

/**
 * Get menu data with platform mappings
 * @param {string} branchId - Branch ID
 * @param {string} platform - Platform name
 * @returns {Object} Menu data with mappings
 */
async function getMenuWithMappings(branchId, platform) {
  // Get menu categories and items
  const { data: categories, error: categoriesError } = await supabase
    .from('menu_categories')
    .select(`
      id,
      name,
      description,
      display_order,
      is_active,
      menu_items!inner(
        id,
        name,
        description,
        price,
        image_url,
        is_available,
        allergens,
        dietary_info,
        preparation_time,
        display_order
      )
    `)
    .eq('branch_id', branchId)
    .eq('is_active', true)
    .eq('menu_items.is_available', true)
    .order('display_order')
    .order('display_order', { foreignTable: 'menu_items' });

  if (categoriesError) {
    throw new Error(`Failed to fetch menu data: ${categoriesError.message}`);
  }

  // Get platform mappings
  const { data: mappings, error: mappingsError } = await supabase
    .from('platform_item_mappings')
    .select('*')
    .eq('branch_id', branchId)
    .eq('platform', platform)
    .eq('is_active', true);

  if (mappingsError) {
    throw new Error(`Failed to fetch platform mappings: ${mappingsError.message}`);
  }

  // Create mappings lookup
  const mappingsLookup = {};
  mappings.forEach(mapping => {
    mappingsLookup[mapping.menu_item_id] = mapping;
  });

  // Filter items that have mappings and add mapping data
  const processedCategories = categories.map(category => ({
    ...category,
    items: category.menu_items
      .filter(item => mappingsLookup[item.id])
      .map(item => ({
        ...item,
        platform_mapping: mappingsLookup[item.id]
      }))
  })).filter(category => category.items.length > 0);

  return {
    categories: processedCategories,
    totalItems: processedCategories.reduce((sum, cat) => sum + cat.items.length, 0),
    mappingsCount: Object.keys(mappingsLookup).length
  };
}

/**
 * Convert Vizion Menu data to DoorDash format
 * @param {Object} menuData - Vizion menu data
 * @param {Object} branch - Branch information
 * @returns {Object} DoorDash formatted menu
 */
function convertMenuToDoorDashFormat(menuData, branch) {
  return {
    menu: {
      categories: menuData.categories.map((category, index) => ({
        name: category.name,
        active: category.is_active,
        sort_order: category.display_order || index + 1,
        items: category.items.map(item => ({
          external_id: item.platform_mapping.platform_item_id,
          name: item.name,
          description: item.description || '',
          price: item.price, // DoorDash uses dollars
          is_active: item.is_available,
          image_url: item.image_url || null,
          tags: item.dietary_info || [],
          allergens: item.allergens || [],
          modifiers: [] // TODO: Add modifier support if needed
        }))
      }))
    }
  };
}

/**
 * Convert DoorDash order to Vizion Menu format
 * @param {Object} doorDashOrder - DoorDash order data
 * @param {string} branchId - Branch ID
 * @returns {Object} Vizion Menu formatted order
 */
function convertDoorDashOrderToVizion(doorDashOrder, branchId) {
  return {
    external_order_id: doorDashOrder.id,
    order_number: doorDashOrder.display_id || `DD-${doorDashOrder.id.slice(-8)}`,
    customer_name: doorDashOrder.customer?.name || 'DoorDash Customer',
    customer_phone: doorDashOrder.customer?.phone_number || '',
    customer_email: doorDashOrder.customer?.email || '',
    order_type: 'takeaway',
    third_party_platform: 'doordash',
    source: 'doordash',
    subtotal: doorDashOrder.subtotal || 0,
    tax: doorDashOrder.tax || 0,
    total: doorDashOrder.total || 0,
    special_instructions: doorDashOrder.special_instructions || '',
    delivery_address: formatDoorDashAddress(doorDashOrder.delivery_address),
    items: (doorDashOrder.items || []).map(item => ({
      external_id: item.external_id,
      name: item.name,
      quantity: item.quantity,
      unit_price: item.unit_price,
      total_price: item.total_price,
      special_instructions: item.special_instructions || '',
      modifiers: (item.modifiers || []).map(mod => ({
        name: mod.name,
        option: mod.option,
        price: mod.price
      }))
    })),
    payment_method: 'online',
    payment_status: 'paid'
  };
}

/**
 * Convert Vizion status to DoorDash status
 * @param {string} vizionStatus - Vizion Menu status
 * @returns {string} DoorDash status
 */
function convertStatusToDoorDash(vizionStatus) {
  const statusMapping = {
    'pending': 'created',
    'confirmed': 'accepted', 
    'preparing': 'being_prepared',
    'ready': 'ready_for_pickup',
    'completed': 'delivered',
    'cancelled': 'cancelled',
    'rejected': 'cancelled'
  };
  
  return statusMapping[vizionStatus];
}

/**
 * Generate DoorDash JWT token for authentication
 * @returns {string} JWT token
 */
function generateDoorDashToken() {
  if (!process.env.DOORDASH_DEVELOPER_ID || !process.env.DOORDASH_KEY_ID || !process.env.DOORDASH_SIGNING_SECRET) {
    throw new Error('DoorDash authentication credentials not configured');
  }

  const payload = {
    aud: 'doordash',
    iss: process.env.DOORDASH_DEVELOPER_ID,
    kid: process.env.DOORDASH_KEY_ID,
    exp: Math.floor(Date.now() / 1000) + 300, // 5 minutes
    iat: Math.floor(Date.now() / 1000)
  };
  
  return jwt.sign(payload, process.env.DOORDASH_SIGNING_SECRET, {
    algorithm: 'HS256'
  });
}

/**
 * Perform actual DoorDash menu sync (mock or real)
 * @param {string} storeId - Store ID
 * @param {Object} menuData - Formatted menu data
 * @returns {Object} Sync result
 */
async function performDoorDashMenuSync(storeId, menuData) {
  if (process.env.NODE_ENV === 'production' && process.env.DOORDASH_DEVELOPER_ID) {
    // Real API call
    try {
      const token = generateDoorDashToken();
      
      const response = await fetch(`https://openapi.doordash.com/developer/v1/stores/${storeId}/menu`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(menuData)
      });

      const result = await response.json();
      
      if (response.ok) {
        return { 
          success: true, 
          menu_id: result.menu_id,
          validation_errors: result.validation_errors || []
        };
      } else {
        return { 
          success: false, 
          error: result.error?.message || 'Menu update failed' 
        };
      }
    } catch (error) {
      return { 
        success: false, 
        error: `API request failed: ${error.message}` 
      };
    }
  } else {
    // Mock implementation for development/testing
    console.log(`🚪 [MOCK] DoorDash Menu Sync for store ${storeId}:`);
    console.log(`   - Categories: ${menuData.menu.categories.length}`);
    console.log(`   - Items: ${menuData.menu.categories.reduce((sum, cat) => sum + cat.items.length, 0)}`);
    
    return { 
      success: true, 
      menu_id: `mock_dd_menu_${Date.now()}`,
      validation_errors: []
    };
  }
}

/**
 * Perform actual DoorDash order confirmation (mock or real)
 * @param {string} orderId - Order ID
 * @param {Object} confirmationData - Confirmation data
 * @returns {Object} Confirmation result
 */
async function performDoorDashOrderConfirmation(orderId, confirmationData) {
  if (process.env.NODE_ENV === 'production' && process.env.DOORDASH_DEVELOPER_ID) {
    // Real API call
    try {
      const token = generateDoorDashToken();
      
      const response = await fetch(`https://openapi.doordash.com/developer/v1/orders/${orderId}/confirm`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(confirmationData)
      });

      if (response.ok) {
        return { success: true };
      } else {
        const error = await response.json();
        return { success: false, error: error.message || 'Order confirmation failed' };
      }
    } catch (error) {
      return { success: false, error: `API request failed: ${error.message}` };
    }
  } else {
    // Mock implementation
    console.log(`🚪 [MOCK] DoorDash Order Confirmation: ${orderId} -> ${confirmationData.confirmation_status}`);
    return { success: true };
  }
}

/**
 * Perform actual DoorDash status update (mock or real)
 * @param {string} orderId - Order ID
 * @param {string} status - DoorDash status
 * @returns {Object} Update result
 */
async function performDoorDashStatusUpdate(orderId, status) {
  if (process.env.NODE_ENV === 'production' && process.env.DOORDASH_DEVELOPER_ID) {
    // Real API call
    try {
      const token = generateDoorDashToken();
      
      const response = await fetch(`https://openapi.doordash.com/developer/v1/orders/${orderId}/status`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status })
      });

      if (response.ok) {
        return { success: true };
      } else {
        const error = await response.json();
        return { success: false, error: error.message || 'Status update failed' };
      }
    } catch (error) {
      return { success: false, error: `API request failed: ${error.message}` };
    }
  } else {
    // Mock implementation
    console.log(`🚪 [MOCK] DoorDash Status Update: ${orderId} -> ${status}`);
    return { success: true };
  }
}

/**
 * Validate and map order items to internal menu items
 * @param {Array} orderItems - Order items from platform
 * @param {string} branchId - Branch ID
 * @param {string} platform - Platform name
 * @returns {Array} Validated and mapped items
 */
async function validateAndMapOrderItems(orderItems, branchId, platform) {
  const validatedItems = [];
  
  for (const item of orderItems) {
    // Find mapping by external_id
    const { data: mapping, error } = await supabase
      .from('platform_item_mappings')
      .select(`
        *,
        menu_items!inner(id, name, price, is_available)
      `)
      .eq('branch_id', branchId)
      .eq('platform', platform)
      .eq('menu_items.id', item.external_id)
      .single();

    if (error || !mapping) {
      console.warn(`Menu item mapping not found: ${item.external_id}`);
      // Keep item but mark as unmapped
      validatedItems.push({
        ...item,
        mapped: false,
        menu_item_id: null
      });
    } else {
      // Successfully mapped
      validatedItems.push({
        ...item,
        mapped: true,
        menu_item_id: mapping.menu_item_id,
        internal_name: mapping.menu_items.name
      });
    }
  }
  
  return validatedItems;
}

/**
 * Update mapping sync status
 * @param {string} branchId - Branch ID
 * @param {string} platform - Platform name
 * @param {string} status - Sync status
 */
async function updateMappingSyncStatus(branchId, platform, status) {
  try {
    await supabase
      .from('platform_item_mappings')
      .update({ 
        sync_status: status,
        last_sync_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('branch_id', branchId)
      .eq('platform', platform);
  } catch (error) {
    console.warn(`Failed to update mapping sync status: ${error.message}`);
  }
}

/**
 * Count total menu items
 * @param {Object} menuData - Menu data
 * @returns {number} Total item count
 */
function countMenuItems(menuData) {
  return menuData.categories.reduce((sum, category) => 
    sum + (category.items ? category.items.length : 0), 0
  );
}

/**
 * Format DoorDash address object to string
 * @param {Object} addressObj - DoorDash address object
 * @returns {string} Formatted address string
 */
function formatDoorDashAddress(addressObj) {
  if (!addressObj) return '';
  if (typeof addressObj === 'string') return addressObj;
  
  const parts = [
    addressObj.street,
    addressObj.city,
    addressObj.state,
    addressObj.zip_code
  ].filter(Boolean);
  
  return parts.join(', ');
}

/**
 * Log platform sync operation
 * @param {string} branchId - Branch ID
 * @param {string} platform - Platform name
 * @param {string} syncType - Type of sync operation
 * @param {string} operation - Specific operation
 * @param {string} status - Operation status
 * @param {number} processed - Items processed
 * @param {number} succeeded - Items succeeded
 * @param {number} failed - Items failed
 * @param {Object} errorDetails - Error details
 * @param {number} duration - Duration in ms
 * @param {string} triggeredBy - User ID who triggered
 * @param {Object} metadata - Additional metadata
 */
async function logPlatformSync(branchId, platform, syncType, operation, status, processed = 0, succeeded = 0, failed = 0, errorDetails = null, duration = null, triggeredBy = null, metadata = null) {
  try {
    await supabase.rpc('log_platform_sync', {
      p_branch_id: branchId,
      p_platform: platform,
      p_sync_type: syncType,
      p_operation: operation,
      p_status: status,
      p_items_processed: processed,
      p_items_succeeded: succeeded,
      p_items_failed: failed,
      p_error_details: errorDetails,
      p_sync_duration_ms: duration,
      p_triggered_by: triggeredBy,
      p_metadata: metadata
    });
  } catch (error) {
    console.error('Failed to log platform sync:', error);
  }
}

module.exports = {
  syncMenuToDoorDash,
  processDoorDashOrder,
  updateOrderStatusOnDoorDash,
  confirmDoorDashOrder,
  getMenuWithMappings,
  convertMenuToDoorDashFormat,
  convertDoorDashOrderToVizion,
  convertStatusToDoorDash,
  generateDoorDashToken
};