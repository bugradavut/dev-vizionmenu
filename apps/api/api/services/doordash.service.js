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
 * Trigger DoorDash menu update (PULL-BASED SYSTEM)
 * DoorDash will pull menu from our exposed endpoint
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

    itemsProcessed = countMenuItems(menuData);

    // IMPORTANT: DoorDash uses PULL-BASED system
    // We don't push menu to DoorDash, they pull it from our endpoint
    // This function triggers DoorDash to pull updated menu
    const syncResult = await triggerDoorDashMenuPull(branch.id, branchId);
    
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
      'menu_sync',
      'trigger_menu_pull',
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
      method: 'pull_based',
      itemsProcessed,
      itemsSucceeded,
      itemsFailed,
      duration,
      pullEndpoint: syncResult.pull_endpoint,
      errors
    };

  } catch (error) {
    const duration = Date.now() - startTime;
    
    // Log failed sync
    await logPlatformSync(
      branchId,
      'doordash',
      'menu_sync', 
      'trigger_menu_pull',
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
 * @param {Object} doorDashOrder - Real DoorDash webhook payload
 * @param {string} branchId - Target branch ID
 * @returns {Object} Created Vizion Menu order
 */
async function processDoorDashOrder(doorDashOrder, branchId) {
  try {
    // Validate real DoorDash webhook payload structure
    if (!doorDashOrder.external_order_id || !doorDashOrder.items) {
      throw new Error('Invalid DoorDash webhook payload - missing required fields');
    }

    const externalOrderId = doorDashOrder.external_order_id;
    
    // Check for duplicate order
    const { data: existingOrder } = await supabase
      .from('orders')
      .select('id')
      .eq('external_order_id', externalOrderId)
      .eq('third_party_platform', 'doordash')
      .single();

    if (existingOrder) {
      throw new Error(`Duplicate order detected: ${externalOrderId}`);
    }

    // Convert to Vizion Menu format using real DoorDash structure
    const vizionOrder = convertDoorDashOrderToVizion(doorDashOrder, branchId);

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

    // DoorDash expects a 200 response for successful processing
    // Additional confirmation may be required via API
    console.log(`✅ DoorDash order ${externalOrderId} processed successfully`);

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
      { order_id: createdOrder.id, external_id: externalOrderId }
    );

    return createdOrder;

  } catch (error) {
    const externalOrderId = doorDashOrder.external_order_id || 'unknown';
    
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
      { error: error.message, external_id: externalOrderId }
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
 * Convert Vizion Menu data to real DoorDash format (FOR PULL ENDPOINT)
 * DoorDash will call our endpoint to get this data
 * @param {Object} menuData - Vizion menu data
 * @param {Object} branch - Branch information
 * @returns {Object} DoorDash formatted menu (real API structure)
 */
function convertMenuToDoorDashFormat(menuData, branch) {
  return {
    menus: [
      {
        id: `menu_${branch.id}`, // Required UUID for updates
        name: `${branch.name} Menu`,
        active: true,
        categories: menuData.categories.map((category, catIndex) => ({
          name: category.name,
          merchant_supplied_id: `cat_${category.id}`,
          active: category.is_active,
          sort_id: category.display_order || catIndex + 1,
          subtitle: category.description || '',
          items: category.items.map((item, itemIndex) => ({
            merchant_supplied_id: item.platform_mapping.platform_item_id,
            name: item.name,
            description: item.description || '',
            base_price: Math.round(item.price * 100), // Convert to cents
            active: item.is_available,
            sort_id: item.display_order || itemIndex + 1,
            original_image_url: item.image_url || null,
            extras: [], // Modifiers - TODO: implement if needed
            // DoorDash specific fields
            tax_rate: 1300, // 13% HST for Canada (in basis points)
            allergen_info: item.allergens ? item.allergens.join(', ') : '',
            nutritional_info: item.dietary_info ? {
              dietary_flags: item.dietary_info
            } : undefined
          }))
        }))
      }
    ]
  };
}

/**
 * Convert real DoorDash webhook order to Vizion Menu format
 * @param {Object} doorDashOrder - Real DoorDash webhook payload
 * @param {string} branchId - Branch ID
 * @returns {Object} Vizion Menu formatted order
 */
function convertDoorDashOrderToVizion(doorDashOrder, branchId) {
  return {
    external_order_id: doorDashOrder.external_order_id,
    order_number: doorDashOrder.client_order_id || `DD-${doorDashOrder.external_order_id.slice(-8)}`,
    customer_name: doorDashOrder.consumer?.first_name ? 
      `${doorDashOrder.consumer.first_name} ${doorDashOrder.consumer.last_name || ''}`.trim() : 
      'DoorDash Customer',
    customer_phone: doorDashOrder.consumer?.phone_number || '',
    customer_email: doorDashOrder.consumer?.email || '',
    order_type: doorDashOrder.fulfillment_type === 'pickup' ? 'takeaway' : 'delivery',
    third_party_platform: 'doordash',
    source: doorDashOrder.experience || 'doordash', // doordash, caviar, or storefront
    subtotal: (doorDashOrder.subtotal_cents || 0) / 100,
    tax: (doorDashOrder.tax_cents || 0) / 100,
    total: (doorDashOrder.total_cents || 0) / 100,
    special_instructions: doorDashOrder.special_instructions || '',
    delivery_address: formatDoorDashAddress(doorDashOrder.delivery_address),
    delivery_short_code: doorDashOrder.delivery_short_code || '',
    merchant_tip: (doorDashOrder.merchant_tip_amount || 0) / 100,
    items: (doorDashOrder.items || []).map(item => ({
      external_id: item.merchant_supplied_id,
      name: item.name,
      quantity: item.quantity,
      unit_price: (item.price_cents || 0) / 100,
      total_price: ((item.price_cents || 0) * item.quantity) / 100,
      special_instructions: item.special_instructions || '',
      modifiers: (item.extras || []).map(extra => ({
        name: extra.name,
        options: extra.options.map(option => ({
          name: option.name,
          price: (option.price_cents || 0) / 100
        }))
      }))
    })),
    payment_method: 'online',
    payment_status: 'paid',
    is_asap: doorDashOrder.is_asap || true
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
 * Generate real DoorDash JWT token for authentication
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
    exp: Math.floor(Date.now() / 1000) + 1800, // 30 minutes (max allowed)
    iat: Math.floor(Date.now() / 1000)
  };

  // Real DoorDash JWT requires specific header
  const header = {
    alg: 'HS256',
    typ: 'JWT',
    'dd-ver': 'DD-JWT-V1' // DoorDash specific header
  };
  
  return jwt.sign(payload, process.env.DOORDASH_SIGNING_SECRET, {
    algorithm: 'HS256',
    header: header
  });
}

/**
 * Trigger DoorDash menu pull (PULL-BASED SYSTEM)
 * Notifies DoorDash to pull menu from our endpoint
 * @param {string} storeId - Store ID  
 * @param {string} branchId - Branch ID
 * @returns {Object} Sync result
 */
async function triggerDoorDashMenuPull(storeId, branchId) {
  if (process.env.NODE_ENV === 'production' && process.env.DOORDASH_DEVELOPER_ID) {
    // Real API call to trigger menu pull
    try {
      const token = generateDoorDashToken();
      
      // DoorDash uses menu pull trigger - they pull from our endpoint
      const response = await fetch(`https://openapi.doordash.com/developer/v1/stores/${storeId}/menu_update`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          trigger_type: 'menu_change',
          pull_endpoint: `${process.env.BASE_URL}/api/v1/doordash/menu/${branchId}`
        })
      });

      if (response.ok) {
        const result = await response.json();
        return { 
          success: true, 
          pull_endpoint: `${process.env.BASE_URL}/api/v1/doordash/menu/${branchId}`,
          trigger_id: result.trigger_id || Date.now()
        };
      } else {
        const error = await response.json();
        return { 
          success: false, 
          error: error.message || 'Menu pull trigger failed' 
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
    console.log(`🚪 [MOCK] DoorDash Menu Pull Trigger for store ${storeId}:`);
    console.log(`   - Pull endpoint: /api/v1/doordash/menu/${branchId}`);
    console.log(`   - DoorDash will call our endpoint to get menu`);
    
    return { 
      success: true, 
      pull_endpoint: `/api/v1/doordash/menu/${branchId}`,
      trigger_id: `mock_trigger_${Date.now()}`
    };
  }
}

/**
 * Get menu for DoorDash pull request (ENDPOINT FOR DOORDASH TO CALL)
 * This is called BY DoorDash when they want to pull our menu
 * @param {string} branchId - Branch ID
 * @returns {Object} Menu data in DoorDash format
 */
async function getMenuForDoorDashPull(branchId) {
  try {
    // Get menu data with mappings
    const menuData = await getMenuWithMappings(branchId, 'doordash');
    
    if (!menuData.categories || menuData.categories.length === 0) {
      throw new Error('No menu categories found');
    }

    // Get branch information
    const { data: branch, error: branchError } = await supabase
      .from('branches')
      .select('id, name, chain_id')
      .eq('id', branchId)
      .single();

    if (branchError || !branch) {
      throw new Error('Branch not found');
    }

    // Convert to DoorDash format
    const doorDashMenu = convertMenuToDoorDashFormat(menuData, branch);

    // Log pull request
    await logPlatformSync(
      branchId,
      'doordash',
      'menu_sync',
      'menu_pull_request',
      'success',
      countMenuItems(menuData),
      countMenuItems(menuData),
      0,
      null,
      null,
      null,
      { pull_endpoint: 'doordash_menu_pull' }
    );

    return doorDashMenu;

  } catch (error) {
    // Log failed pull request
    await logPlatformSync(
      branchId,
      'doordash',
      'menu_sync',
      'menu_pull_request',
      'failed',
      0,
      0,
      0,
      { error: error.message }
    );

    throw error;
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
  triggerDoorDashMenuPull,
  getMenuForDoorDashPull,
  getMenuWithMappings,
  convertMenuToDoorDashFormat,
  convertDoorDashOrderToVizion,
  convertStatusToDoorDash,
  generateDoorDashToken
};