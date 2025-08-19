// =====================================================
// UBER EATS INTEGRATION SERVICE
// Complete Uber Eats API integration for menu sync, order processing, and status updates
// Supports both mock testing and production API calls
// =====================================================

const { createClient } = require('@supabase/supabase-js');

// Create Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Sync complete menu to Uber Eats platform
 * @param {string} branchId - Branch ID
 * @param {Object} userBranch - User branch context
 * @returns {Object} Sync result with status and metadata
 */
async function syncMenuToUberEats(branchId, userBranch) {
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
    const menuData = await getMenuWithMappings(branchId, 'uber_eats');
    
    if (!menuData.categories || menuData.categories.length === 0) {
      throw new Error('No menu categories found for sync');
    }

    // Convert to Uber Eats format
    const uberEatsMenu = convertMenuToUberEatsFormat(menuData, branch);
    itemsProcessed = countMenuItems(menuData);

    // Perform API call (mock or real)
    const syncResult = await performUberEatsMenuSync(branch.id, uberEatsMenu);
    
    if (syncResult.success) {
      itemsSucceeded = itemsProcessed;
      
      // Update mapping sync status
      await updateMappingSyncStatus(branchId, 'uber_eats', 'synced');
    } else {
      itemsFailed = itemsProcessed;
      errors.push(syncResult.error);
    }

    // Log sync operation
    const duration = Date.now() - startTime;
    await logPlatformSync(
      branchId,
      'uber_eats', 
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
      platform: 'uber_eats',
      itemsProcessed,
      itemsSucceeded,
      itemsFailed,
      duration,
      uploadId: syncResult.menu_upload_id || `mock_${Date.now()}`,
      errors
    };

  } catch (error) {
    const duration = Date.now() - startTime;
    
    // Log failed sync
    await logPlatformSync(
      branchId,
      'uber_eats',
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

    throw new Error(`Uber Eats menu sync failed: ${error.message}`);
  }
}

/**
 * Process incoming order from Uber Eats webhook
 * @param {Object} uberEatsOrder - Raw Uber Eats order data
 * @param {string} branchId - Target branch ID
 * @returns {Object} Created Vizion Menu order
 */
async function processUberEatsOrder(uberEatsOrder, branchId) {
  try {
    // Validate required order data
    if (!uberEatsOrder.id || !uberEatsOrder.cart || !uberEatsOrder.eater) {
      throw new Error('Invalid Uber Eats order data - missing required fields');
    }

    // Check for duplicate order
    const { data: existingOrder } = await supabase
      .from('orders')
      .select('id')
      .eq('external_order_id', uberEatsOrder.id)
      .eq('third_party_platform', 'uber_eats')
      .single();

    if (existingOrder) {
      throw new Error(`Duplicate order detected: ${uberEatsOrder.id}`);
    }

    // Convert to Vizion Menu format
    const vizionOrder = convertUberEatsOrderToVizion(uberEatsOrder, branchId);

    // Validate and map menu items
    const validatedItems = await validateAndMapOrderItems(vizionOrder.items, branchId, 'uber_eats');
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
      'uber_eats',
      'order_sync',
      'process_incoming_order',
      'success',
      1,
      1,
      0,
      null,
      null,
      null,
      { order_id: createdOrder.id, external_id: uberEatsOrder.id }
    );

    return createdOrder;

  } catch (error) {
    // Log failed order processing
    await logPlatformSync(
      branchId,
      'uber_eats',
      'order_sync',
      'process_incoming_order', 
      'failed',
      1,
      0,
      1,
      { error: error.message, external_id: uberEatsOrder.id }
    );

    throw error;
  }
}

/**
 * Update order status on Uber Eats platform
 * @param {string} externalOrderId - Uber Eats order ID
 * @param {string} vizionStatus - Vizion Menu status
 * @param {Object} userBranch - User branch context
 * @returns {Object} Status update result
 */
async function updateOrderStatusOnUberEats(externalOrderId, vizionStatus, userBranch) {
  try {
    // Convert Vizion status to Uber Eats status
    const uberEatsStatus = convertStatusToUberEats(vizionStatus);
    
    if (!uberEatsStatus) {
      throw new Error(`Cannot map Vizion status '${vizionStatus}' to Uber Eats status`);
    }

    // Perform status update (mock or real)
    const updateResult = await performUberEatsStatusUpdate(externalOrderId, uberEatsStatus);

    // Log status update
    await logPlatformSync(
      userBranch.branch_id,
      'uber_eats',
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
        uber_eats_status: uberEatsStatus
      }
    );

    return updateResult;

  } catch (error) {
    // Log failed status update
    await logPlatformSync(
      userBranch.branch_id,
      'uber_eats',
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
 * Convert Vizion Menu data to Uber Eats format
 * @param {Object} menuData - Vizion menu data
 * @param {Object} branch - Branch information
 * @returns {Object} Uber Eats formatted menu
 */
function convertMenuToUberEatsFormat(menuData, branch) {
  return {
    menus: [{
      menu_id: `ue_menu_${branch.id}`,
      title: `${branch.name} Menu`,
      subtitle: 'Delicious food delivered fresh',
      sections: menuData.categories.map(category => ({
        section_id: `ue_cat_${category.id}`,
        title: category.name,
        subtitle: category.description || '',
        items: category.items.map(item => ({
          id: item.platform_mapping.platform_item_id,
          external_data: item.id,
          title: item.name,
          description: item.description || '',
          price: Math.round(item.price * 100), // Convert to cents
          images: item.image_url ? [{
            url: item.image_url,
            width: 640,
            height: 480
          }] : [],
          available: item.is_available,
          preparation_time_seconds: (item.preparation_time || 15) * 60,
          dietary_info: item.dietary_info || [],
          allergens: item.allergens || [],
          max_quantity: 99
        }))
      }))
    }]
  };
}

/**
 * Convert Uber Eats order to Vizion Menu format
 * @param {Object} uberOrder - Uber Eats order data
 * @param {string} branchId - Branch ID
 * @returns {Object} Vizion Menu formatted order
 */
function convertUberEatsOrderToVizion(uberOrder, branchId) {
  return {
    external_order_id: uberOrder.id,
    order_number: uberOrder.display_id || `UE-${uberOrder.id.slice(-8)}`,
    customer_name: `${uberOrder.eater?.first_name || ''} ${uberOrder.eater?.last_name || ''}`.trim() || 'Uber Eats Customer',
    customer_phone: uberOrder.eater?.phone || '',
    customer_email: uberOrder.eater?.email || '',
    order_type: 'takeaway',
    third_party_platform: 'uber_eats',
    source: 'uber_eats',
    subtotal: (uberOrder.payment?.charges?.subtotal || 0) / 100,
    tax: (uberOrder.payment?.charges?.tax || 0) / 100,
    total: (uberOrder.payment?.charges?.total || 0) / 100,
    special_instructions: uberOrder.cart?.special_instructions || '',
    delivery_address: uberOrder.delivery?.location?.address || '',
    items: (uberOrder.cart?.items || []).map(item => ({
      external_id: item.external_data,
      name: item.title,
      quantity: item.quantity,
      unit_price: (item.price || 0) / 100,
      total_price: ((item.price || 0) * item.quantity) / 100,
      special_instructions: item.special_instructions || '',
      modifiers: (item.modifiers || []).map(mod => ({
        name: mod.title,
        option: mod.option?.title || '',
        price: (mod.option?.price || 0) / 100
      }))
    })),
    payment_method: 'online',
    payment_status: 'paid'
  };
}

/**
 * Convert Vizion status to Uber Eats status
 * @param {string} vizionStatus - Vizion Menu status
 * @returns {string} Uber Eats status
 */
function convertStatusToUberEats(vizionStatus) {
  const statusMapping = {
    'pending': 'created',
    'confirmed': 'accepted', 
    'preparing': 'preparing',
    'ready': 'ready_for_pickup',
    'completed': 'finished',
    'cancelled': 'cancelled',
    'rejected': 'denied'
  };
  
  return statusMapping[vizionStatus];
}

/**
 * Perform actual Uber Eats menu sync (mock or real)
 * @param {string} storeId - Store ID
 * @param {Object} menuData - Formatted menu data
 * @returns {Object} Sync result
 */
async function performUberEatsMenuSync(storeId, menuData) {
  if (process.env.NODE_ENV === 'production' && process.env.UBER_EATS_ACCESS_TOKEN) {
    // Real API call
    try {
      const response = await fetch(`https://api.uber.com/v1/eats/stores/${storeId}/menus`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${process.env.UBER_EATS_ACCESS_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(menuData)
      });

      const result = await response.json();
      
      if (response.ok) {
        return { 
          success: true, 
          menu_upload_id: result.menu_upload_id,
          warnings: result.warnings || []
        };
      } else {
        return { 
          success: false, 
          error: result.error?.message || 'Menu upload failed' 
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
    console.log(`🍔 [MOCK] Uber Eats Menu Sync for store ${storeId}:`);
    console.log(`   - Categories: ${menuData.menus[0].sections.length}`);
    console.log(`   - Items: ${menuData.menus[0].sections.reduce((sum, section) => sum + section.items.length, 0)}`);
    
    return { 
      success: true, 
      menu_upload_id: `mock_upload_${Date.now()}`,
      warnings: []
    };
  }
}

/**
 * Perform actual Uber Eats status update (mock or real)
 * @param {string} orderId - Order ID
 * @param {string} status - Uber Eats status
 * @returns {Object} Update result
 */
async function performUberEatsStatusUpdate(orderId, status) {
  if (process.env.NODE_ENV === 'production' && process.env.UBER_EATS_ACCESS_TOKEN) {
    // Real API call
    try {
      const response = await fetch(`https://api.uber.com/v1/eats/orders/${orderId}/status`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.UBER_EATS_ACCESS_TOKEN}`,
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
    console.log(`🚗 [MOCK] Uber Eats Status Update: ${orderId} -> ${status}`);
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
  syncMenuToUberEats,
  processUberEatsOrder,
  updateOrderStatusOnUberEats,
  getMenuWithMappings,
  convertMenuToUberEatsFormat,
  convertUberEatsOrderToVizion,
  convertStatusToUberEats
};