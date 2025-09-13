// =====================================================
// SKIPTHEDISHES INTEGRATION SERVICE
// Integration with SkipTheDishes through third-party providers and CSV export
// Supports Otter, GetOrder integrations and manual CSV management
// =====================================================

const { createClient } = require('@supabase/supabase-js');

// Create Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Sync complete menu to SkipTheDishes platform
 * Uses third-party integration or CSV export approach
 * @param {string} branchId - Branch ID
 * @param {Object} userBranch - User branch context
 * @returns {Object} Sync result with status and metadata
 */
async function syncMenuToSkipTheDishes(branchId, userBranch) {
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
    const menuData = await getMenuWithMappings(branchId, 'skipthedishes');
    
    if (!menuData.categories || menuData.categories.length === 0) {
      throw new Error('No menu categories found for sync');
    }

    // Convert to SkipTheDishes format
    const skipTheDishesMenu = convertMenuToSkipTheDishesFormat(menuData, branch);
    itemsProcessed = countMenuItems(menuData);

    // Determine integration method and perform sync
    const integrationMethod = determineIntegrationMethod();
    let syncResult;

    switch (integrationMethod) {
      case 'third_party':
        syncResult = await performThirdPartyMenuSync(branch.id, skipTheDishesMenu);
        break;
      case 'csv_export':
        syncResult = await generateCSVForManualSync(skipTheDishesMenu, branch);
        break;
      default:
        syncResult = await performMockSkipTheDishesSync(branch.id, skipTheDishesMenu);
    }
    
    if (syncResult.success) {
      itemsSucceeded = itemsProcessed;
      
      // Update mapping sync status
      await updateMappingSyncStatus(branchId, 'skipthedishes', 'synced');
    } else {
      itemsFailed = itemsProcessed;
      errors.push(syncResult.error);
    }

    // Log sync operation
    const duration = Date.now() - startTime;
    await logPlatformSync(
      branchId,
      'skipthedishes', 
      'menu_upload',
      `sync_menu_${integrationMethod}`,
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
      platform: 'skipthedishes',
      integrationMethod,
      itemsProcessed,
      itemsSucceeded,
      itemsFailed,
      duration,
      syncId: syncResult.sync_id || `mock_std_${Date.now()}`,
      csvPath: syncResult.csvPath || null,
      errors
    };

  } catch (error) {
    const duration = Date.now() - startTime;
    
    // Log failed sync
    await logPlatformSync(
      branchId,
      'skipthedishes',
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

    throw new Error(`SkipTheDishes menu sync failed: ${error.message}`);
  }
}

/**
 * Process incoming order from SkipTheDishes (via third-party integration)
 * @param {Object} skipTheDisheseOrder - Raw SkipTheDishes order data
 * @param {string} branchId - Target branch ID
 * @returns {Object} Created Vizion Menu order
 */
async function processSkipTheDishesOrder(skipTheDishesOrder, branchId) {
  try {
    const orderData = skipTheDishesOrder.order || skipTheDishesOrder;
    
    // Validate required order data
    if (!orderData.orderId || !orderData.items || !orderData.customer) {
      throw new Error('Invalid SkipTheDishes order data - missing required fields');
    }

    // Check for duplicate order
    const { data: existingOrder } = await supabase
      .from('orders')
      .select('id')
      .eq('external_order_id', orderData.orderId)
      .eq('third_party_platform', 'skipthedishes')
      .single();

    if (existingOrder) {
      throw new Error(`Duplicate order detected: ${orderData.orderId}`);
    }

    // Convert to Vizion Menu format
    const vizionOrder = convertSkipTheDishesOrderToVizion(orderData, branchId);

    // Validate and map menu items
    const validatedItems = await validateAndMapOrderItems(vizionOrder.items, branchId, 'skipthedishes');
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
      'skipthedishes',
      'order_sync',
      'process_incoming_order',
      'success',
      1,
      1,
      0,
      null,
      null,
      null,
      { order_id: createdOrder.id, external_id: orderData.orderId }
    );

    return createdOrder;

  } catch (error) {
    // Log failed order processing
    await logPlatformSync(
      branchId,
      'skipthedishes',
      'order_sync',
      'process_incoming_order', 
      'failed',
      1,
      0,
      1,
      { error: error.message, external_id: skipTheDishesOrder.orderId || 'unknown' }
    );

    throw error;
  }
}

/**
 * Update order status on SkipTheDishes platform (via third-party)
 * @param {string} externalOrderId - SkipTheDishes order ID
 * @param {string} vizionStatus - Vizion Menu status
 * @param {Object} userBranch - User branch context
 * @returns {Object} Status update result
 */
async function updateOrderStatusOnSkipTheDishes(externalOrderId, vizionStatus, userBranch) {
  try {
    // Convert Vizion status to SkipTheDishes status
    const skipTheDishesStatus = convertStatusToSkipTheDishes(vizionStatus);
    
    if (!skipTheDishesStatus) {
      throw new Error(`Cannot map Vizion status '${vizionStatus}' to SkipTheDishes status`);
    }

    // Determine integration method and perform status update
    const integrationMethod = determineIntegrationMethod();
    let updateResult;

    switch (integrationMethod) {
      case 'third_party':
        updateResult = await performThirdPartyStatusUpdate(externalOrderId, skipTheDishesStatus);
        break;
      default:
        updateResult = await performMockSkipTheDishesStatusUpdate(externalOrderId, skipTheDishesStatus);
    }

    // Log status update
    await logPlatformSync(
      userBranch.branch_id,
      'skipthedishes',
      'status_update',
      `update_order_status_${integrationMethod}`,
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
        skipthedishes_status: skipTheDishesStatus,
        integration_method: integrationMethod
      }
    );

    return updateResult;

  } catch (error) {
    // Log failed status update
    await logPlatformSync(
      userBranch.branch_id,
      'skipthedishes',
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
 * Export menu to CSV format for manual SkipTheDishes upload
 * @param {string} branchId - Branch ID
 * @param {Object} userBranch - User branch context
 * @returns {Object} CSV export result with file path
 */
async function exportMenuToCSV(branchId, userBranch) {
  try {
    // Get menu data with mappings
    const menuData = await getMenuWithMappings(branchId, 'skipthedishes');
    
    if (!menuData.categories || menuData.categories.length === 0) {
      throw new Error('No menu items found for export');
    }

    // Generate CSV content
    const csvContent = generateSkipTheDishesCSV(menuData);
    
    // Save CSV file (in production, you'd save to file system or cloud storage)
    const fileName = `skipthedishes_menu_${branchId}_${Date.now()}.csv`;
    const csvPath = await saveCSVFile(fileName, csvContent);

    // Log CSV export
    await logPlatformSync(
      branchId,
      'skipthedishes',
      'menu_upload',
      'export_csv',
      'success',
      countMenuItems(menuData),
      countMenuItems(menuData),
      0,
      null,
      null,
      userBranch.user_id,
      { file_name: fileName, csv_path: csvPath }
    );

    return {
      success: true,
      fileName,
      csvPath,
      itemsExported: countMenuItems(menuData),
      csvPreview: csvContent.split('\n').slice(0, 5).join('\n') + '\n...'
    };

  } catch (error) {
    // Log failed CSV export
    await logPlatformSync(
      branchId,
      'skipthedishes',
      'menu_upload',
      'export_csv',
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
 * Convert Vizion Menu data to SkipTheDishes format
 * @param {Object} menuData - Vizion menu data
 * @param {Object} branch - Branch information
 * @returns {Object} SkipTheDishes formatted menu
 */
function convertMenuToSkipTheDishesFormat(menuData, branch) {
  return {
    restaurantName: branch.name,
    categories: menuData.categories.map(category => ({
      name: category.name,
      description: category.description || '',
      items: category.items.map(item => ({
        external_id: item.platform_mapping.platform_item_id,
        name: item.name,
        description: item.description || '',
        price: item.price, // SkipTheDishes uses dollars
        available: item.is_available,
        image_url: item.image_url || '',
        category: category.name,
        allergens: item.allergens ? item.allergens.join(', ') : '',
        dietary_info: item.dietary_info ? item.dietary_info.join(', ') : '',
        preparation_time: item.preparation_time || 15
      }))
    }))
  };
}

/**
 * Convert SkipTheDishes order to Vizion Menu format
 * @param {Object} skipTheDishesOrder - SkipTheDishes order data
 * @param {string} branchId - Branch ID
 * @returns {Object} Vizion Menu formatted order
 */
function convertSkipTheDishesOrderToVizion(skipTheDishesOrder, branchId) {
  return {
    external_order_id: skipTheDishesOrder.orderId,
    order_number: skipTheDishesOrder.orderNumber || `STD-${skipTheDishesOrder.orderId.slice(-8)}`,
    customer_name: skipTheDishesOrder.customer?.name || 'SkipTheDishes Customer',
    customer_phone: skipTheDishesOrder.customer?.phone || '',
    customer_email: skipTheDishesOrder.customer?.email || '',
    order_type: 'takeaway',
    third_party_platform: 'skipthedishes',
    source: 'skipthedishes',
    subtotal: skipTheDishesOrder.subtotal || 0,
    tax: skipTheDishesOrder.tax || 0,
    total: skipTheDishesOrder.total || 0,
    special_instructions: skipTheDishesOrder.specialInstructions || '',
    delivery_address: skipTheDishesOrder.deliveryAddress || '',
    items: (skipTheDishesOrder.items || []).map(item => ({
      external_id: item.externalId,
      name: item.name,
      quantity: item.quantity,
      unit_price: item.unitPrice,
      total_price: item.totalPrice,
      special_instructions: item.specialInstructions || '',
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
 * Convert Vizion status to SkipTheDishes status
 * @param {string} vizionStatus - Vizion Menu status
 * @returns {string} SkipTheDishes status
 */
function convertStatusToSkipTheDishes(vizionStatus) {
  const statusMapping = {
    'pending': 'received',
    'confirmed': 'accepted', 
    'preparing': 'being_prepared',
    'ready': 'ready',
    'completed': 'completed',
    'cancelled': 'cancelled',
    'rejected': 'cancelled'
  };
  
  return statusMapping[vizionStatus];
}

/**
 * Determine which integration method to use for SkipTheDishes
 * @returns {string} Integration method
 */
function determineIntegrationMethod() {
  // Check environment variables for third-party integration
  if (process.env.OTTER_API_KEY && process.env.OTTER_RESTAURANT_ID) {
    return 'third_party';
  }
  
  if (process.env.GETORDER_API_KEY) {
    return 'third_party';
  }
  
  // Default to CSV export for manual management
  return 'csv_export';
}

/**
 * Generate CSV content for SkipTheDishes manual upload
 * @param {Object} menuData - Menu data
 * @returns {string} CSV content
 */
function generateSkipTheDishesCSV(menuData) {
  const headers = [
    'Item Name',
    'Category',
    'Description', 
    'Price',
    'Available',
    'Allergens',
    'Dietary Info',
    'Image URL',
    'External ID'
  ];

  let csvContent = headers.join(',') + '\n';

  menuData.categories.forEach(category => {
    category.items.forEach(item => {
      const row = [
        `"${item.name}"`,
        `"${category.name}"`,
        `"${item.description || ''}"`,
        item.price,
        item.is_available ? 'Yes' : 'No',
        `"${item.allergens ? item.allergens.join('; ') : ''}"`,
        `"${item.dietary_info ? item.dietary_info.join('; ') : ''}"`,
        `"${item.image_url || ''}"`,
        `"${item.platform_mapping?.platform_item_id || 'unmapped'}"`
      ];
      csvContent += row.join(',') + '\n';
    });
  });

  return csvContent;
}

/**
 * Save CSV file (mock implementation)
 * @param {string} fileName - File name
 * @param {string} content - CSV content
 * @returns {string} File path
 */
async function saveCSVFile(fileName, content) {
  // In production, you would save to file system or cloud storage
  // For now, we'll just return a mock path
  console.log(`📄 [MOCK] CSV file generated: ${fileName}`);
  console.log(`Content preview:\n${content.split('\n').slice(0, 3).join('\n')}`);
  
  return `/tmp/csv_exports/${fileName}`;
}

/**
 * Perform third-party menu sync (Otter/GetOrder)
 * @param {string} storeId - Store ID
 * @param {Object} menuData - Formatted menu data
 * @returns {Object} Sync result
 */
async function performThirdPartyMenuSync(storeId, menuData) {
  if (process.env.OTTER_API_KEY) {
    return await performOtterMenuSync(storeId, menuData);
  }
  
  if (process.env.GETORDER_API_KEY) {
    return await performGetOrderMenuSync(storeId, menuData);
  }
  
  // Fallback to mock
  return await performMockSkipTheDishesSync(storeId, menuData);
}

/**
 * Perform Otter integration menu sync
 * @param {string} storeId - Store ID
 * @param {Object} menuData - Menu data
 * @returns {Object} Sync result
 */
async function performOtterMenuSync(storeId, menuData) {
  try {
    console.log(`🦦 [MOCK] Otter Menu Sync for store ${storeId} (SkipTheDishes):`);
    console.log(`   - Categories: ${menuData.categories.length}`);
    console.log(`   - Items: ${menuData.categories.reduce((sum, cat) => sum + cat.items.length, 0)}`);
    
    // Mock Otter API call
    return {
      success: true,
      sync_id: `otter_std_${Date.now()}`,
      provider: 'otter'
    };
  } catch (error) {
    return {
      success: false,
      error: `Otter integration failed: ${error.message}`
    };
  }
}

/**
 * Perform GetOrder integration menu sync
 * @param {string} storeId - Store ID
 * @param {Object} menuData - Menu data
 * @returns {Object} Sync result
 */
async function performGetOrderMenuSync(storeId, menuData) {
  try {
    console.log(`📦 [MOCK] GetOrder Menu Sync for store ${storeId} (SkipTheDishes):`);
    console.log(`   - Categories: ${menuData.categories.length}`);
    console.log(`   - Items: ${menuData.categories.reduce((sum, cat) => sum + cat.items.length, 0)}`);
    
    // Mock GetOrder API call
    return {
      success: true,
      sync_id: `getorder_std_${Date.now()}`,
      provider: 'getorder'
    };
  } catch (error) {
    return {
      success: false,
      error: `GetOrder integration failed: ${error.message}`
    };
  }
}

/**
 * Perform mock SkipTheDishes sync for development
 * @param {string} storeId - Store ID
 * @param {Object} menuData - Menu data
 * @returns {Object} Sync result
 */
async function performMockSkipTheDishesSync(storeId, menuData) {
  console.log(`🍽️ [MOCK] SkipTheDishes Menu Sync for store ${storeId}:`);
  console.log(`   - Categories: ${menuData.categories.length}`);
  console.log(`   - Items: ${menuData.categories.reduce((sum, cat) => sum + cat.items.length, 0)}`);
  console.log(`   - Integration: Mock/Development mode`);
  
  return {
    success: true,
    sync_id: `mock_std_${Date.now()}`,
    provider: 'mock'
  };
}

/**
 * Generate CSV for manual sync
 * @param {Object} menuData - Menu data
 * @param {Object} branch - Branch data
 * @returns {Object} CSV generation result
 */
async function generateCSVForManualSync(menuData, branch) {
  try {
    const csvContent = generateSkipTheDishesCSV(menuData);
    const fileName = `skipthedishes_${branch.name.replace(/\s+/g, '_')}_${Date.now()}.csv`;
    const csvPath = await saveCSVFile(fileName, csvContent);
    
    return {
      success: true,
      sync_id: `csv_${Date.now()}`,
      csvPath,
      fileName,
      provider: 'csv_export'
    };
  } catch (error) {
    return {
      success: false,
      error: `CSV generation failed: ${error.message}`
    };
  }
}

/**
 * Perform third-party status update
 * @param {string} orderId - Order ID
 * @param {string} status - SkipTheDishes status
 * @returns {Object} Update result
 */
async function performThirdPartyStatusUpdate(orderId, status) {
  console.log(`🍽️ [MOCK] SkipTheDishes Status Update (Third-party): ${orderId} -> ${status}`);
  return { success: true };
}

/**
 * Perform mock SkipTheDishes status update
 * @param {string} orderId - Order ID
 * @param {string} status - SkipTheDishes status
 * @returns {Object} Update result
 */
async function performMockSkipTheDishesStatusUpdate(orderId, status) {
  console.log(`🍽️ [MOCK] SkipTheDishes Status Update: ${orderId} -> ${status}`);
  return { success: true };
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
  syncMenuToSkipTheDishes,
  processSkipTheDishesOrder,
  updateOrderStatusOnSkipTheDishes,
  exportMenuToCSV,
  getMenuWithMappings,
  convertMenuToSkipTheDishesFormat,
  convertSkipTheDishesOrderToVizion,
  convertStatusToSkipTheDishes,
  generateSkipTheDishesCSV,
  determineIntegrationMethod
};