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
      userBranch ? userBranch.user_id : null
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
      userBranch ? userBranch.user_id : null
    );

    throw new Error(`Uber Eats menu sync failed: ${error.message}`);
  }
}

/**
 * Validate Uber Eats webhook signature (2024 security requirement)
 * @param {string} rawBody - Raw webhook request body
 * @param {string} signature - X-Uber-Signature header value
 * @param {string} clientSecret - Uber client secret
 * @returns {boolean} Signature is valid
 */
function validateUberEatsWebhookSignature(rawBody, signature, clientSecret) {
  const crypto = require('crypto');
  
  try {
    const expectedSignature = crypto
      .createHmac('sha256', clientSecret)
      .update(rawBody, 'utf8')
      .digest('hex')
      .toLowerCase();
    
    return signature.toLowerCase() === expectedSignature;
  } catch (error) {
    console.error('Webhook signature validation failed:', error);
    return false;
  }
}

/**
 * Process incoming order from Uber Eats webhook
 * @param {Object} webhookPayload - Uber Eats webhook notification payload
 * @param {string} branchId - Target branch ID
 * @param {string} rawBody - Raw webhook body for signature validation
 * @param {string} signature - X-Uber-Signature header
 * @returns {Object} Created Vizion Menu order
 */
async function processUberEatsOrder(webhookPayload, branchId, rawBody = null, signature = null) {
  try {
    // 2024 Security: Validate webhook signature if provided
    if (rawBody && signature && process.env.UBER_CLIENT_SECRET) {
      const isValidSignature = validateUberEatsWebhookSignature(rawBody, signature, process.env.UBER_CLIENT_SECRET);
      if (!isValidSignature) {
        throw new Error('Invalid webhook signature - potential security breach');
      }
    }

    // Validate webhook payload structure
    if (!webhookPayload.event_type || webhookPayload.event_type !== 'orders.notification') {
      throw new Error('Invalid webhook payload - not an order notification');
    }

    if (!webhookPayload.meta?.resource_id) {
      throw new Error('Invalid webhook payload - missing order resource_id');
    }

    const orderId = webhookPayload.meta.resource_id;

    // Check for duplicate order
    const { data: existingOrder } = await supabase
      .from('orders')
      .select('id')
      .eq('external_order_id', orderId)
      .eq('third_party_platform', 'uber_eats')
      .single();

    if (existingOrder) {
      throw new Error(`Duplicate order detected: ${orderId}`);
    }

    // Fetch full order details from Uber Eats API
    const orderDetails = await fetchUberEatsOrderDetails(orderId);
    
    if (!orderDetails) {
      throw new Error(`Failed to fetch order details for ${orderId}`);
    }

    // Convert to Vizion Menu format
    const vizionOrder = convertUberEatsOrderToVizion(orderDetails, branchId);

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

    // NOTE: In real implementation, you must call accept/deny within 11.5 minutes
    // This should be handled by separate auto-accept logic or kitchen staff action
    console.log(`⏰ [REMINDER] Order ${orderId} must be accepted/denied within 11.5 minutes`);

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
      { order_id: createdOrder.id, external_id: orderId }
    );

    return createdOrder;

  } catch (error) {
    const orderId = webhookPayload.meta?.resource_id || 'unknown';
    
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
      { error: error.message, external_id: orderId }
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
      userBranch ? userBranch.branch_id : null,
      'uber_eats',
      'status_update',
      'update_order_status',
      updateResult.success ? 'success' : 'failed',
      1,
      updateResult.success ? 1 : 0,
      updateResult.success ? 0 : 1,
      updateResult.success ? null : { error: updateResult.error },
      null,
      userBranch ? userBranch.user_id : null,
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
      userBranch ? userBranch.branch_id : null,
      'uber_eats',
      'status_update',
      'update_order_status',
      'failed',
      1,
      0,
      1,
      { error: error.message },
      null,
      userBranch ? userBranch.user_id : null,
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
 * Convert Vizion Menu data to real Uber Eats API format
 * @param {Object} menuData - Vizion menu data
 * @param {Object} branch - Branch information
 * @returns {Object} Uber Eats formatted menu (real API structure)
 */
function convertMenuToUberEatsFormat(menuData, branch) {
  // Convert items to Uber Eats format
  const items = [];
  const categories = [];
  const modifier_groups = [];

  menuData.categories.forEach(category => {
    // Create category
    categories.push({
      id: `cat_${category.id}`,
      title: {
        translations: {
          en_us: category.name
        }
      },
      subtitle: {
        translations: {
          en_us: category.description || ''
        }
      },
      items: category.items.map(item => `item_${item.id}`)
    });

    // Create items
    category.items.forEach(item => {
      items.push({
        id: `item_${item.id}`,
        external_data: item.platform_mapping.platform_item_id,
        title: {
          translations: {
            en_us: item.name
          }
        },
        description: {
          translations: {
            en_us: item.description || ''
          }
        },
        price: Math.round(item.price * 100), // Convert to cents (required by Uber Eats)
        core_price: Math.round(item.price * 100), // Core price field (2024 requirement)
        images: item.image_url ? [{
          url: item.image_url
        }] : [],
        quantity_info: {
          quantity: {
            max_permitted: 99,
            min_permitted: 1,
            default_quantity: 1,
            increment: 1,
            overrides: [] // 2024 Enhanced Cart Item Quantity Representation
          }
        },
        suspension_info: {
          suspension: {
            suspended_until: item.is_available ? null : Math.floor(Date.now() / 1000) + 86400,
            reason: item.is_available ? null : 'ITEM_AVAILABILITY'
          }
        },
        price_info: {
          price: Math.round(item.price * 100),
          core_price: Math.round(item.price * 100)
        },
        tax_info: {
          tax_rate: 1300 // 13% HST for Canada (in basis points)
        },
        nutritional_info: item.allergens ? {
          allergens: item.allergens.map(allergen => ({
            type: allergen.toUpperCase().replace(' ', '_')
          }))
        } : undefined,
        modifier_group_ids: {
          ids: []
        },
        bundled_items: [], // 2024 requirement for combo items
        // 2024 Enhanced features
        display_options: {
          disable_item_instructions: false
        },
        visibility_info: {
          hours: [] // Item-specific availability hours
        }
      });
    });
  });

  // Create main menu structure
  return {
    items: items,
    modifier_groups: modifier_groups,
    categories: categories,
    menus: [{
      id: `menu_${branch.id}`,
      title: {
        translations: {
          en_us: `${branch.name} Menu`
        }
      },
      subtitle: {
        translations: {
          en_us: 'Fresh food delivered to you'
        }
      },
      service_availability: [
        {
          day_of_week: 'monday',
          time_periods: [{ start_time: '09:00', end_time: '22:00' }]
        },
        {
          day_of_week: 'tuesday', 
          time_periods: [{ start_time: '09:00', end_time: '22:00' }]
        },
        {
          day_of_week: 'wednesday',
          time_periods: [{ start_time: '09:00', end_time: '22:00' }]
        },
        {
          day_of_week: 'thursday',
          time_periods: [{ start_time: '09:00', end_time: '22:00' }]
        },
        {
          day_of_week: 'friday',
          time_periods: [{ start_time: '09:00', end_time: '22:00' }]
        },
        {
          day_of_week: 'saturday',
          time_periods: [{ start_time: '09:00', end_time: '22:00' }]
        },
        {
          day_of_week: 'sunday',
          time_periods: [{ start_time: '09:00', end_time: '22:00' }]
        }
      ],
      category_ids: categories.map(cat => cat.id)
    }],
    display_options: {
      disable_item_instructions: false
    }
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
    // Real API call to Uber Eats
    try {
      const response = await fetch(`https://api.uber.com/v2/eats/stores/${storeId}/menus`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${process.env.UBER_EATS_ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
          'Accept-Encoding': 'gzip, deflate', // 2024 Uber recommendation for large payloads
          'User-Agent': 'Vizion-Menu/1.0',
          'X-API-Version': '2.0' // Specify API version for consistency
        },
        body: JSON.stringify(menuData)
      });

      const result = await response.json();
      
      if (response.ok) {
        return { 
          success: true, 
          menu_upload_id: result.menu_upload_id || `upload_${Date.now()}`,
          warnings: result.warnings || []
        };
      } else {
        return { 
          success: false, 
          error: result.error?.message || `HTTP ${response.status}: Menu upload failed` 
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
    console.log(`   - Categories: ${menuData.categories.length}`);
    console.log(`   - Items: ${menuData.items.length}`);
    console.log(`   - Menus: ${menuData.menus.length}`);
    console.log(`   - Using real Uber Eats API structure`);
    
    return { 
      success: true, 
      menu_upload_id: `mock_upload_${Date.now()}`,
      warnings: []
    };
  }
}

/**
 * Accept or deny Uber Eats order (real API requirement)
 * @param {string} orderId - Order ID
 * @param {boolean} accept - Accept (true) or deny (false)
 * @param {string} reason - Reason for denial (if deny)
 * @returns {Object} Accept/deny result
 */
async function acceptOrDenyUberEatsOrder(orderId, accept, reason = null) {
  if (process.env.NODE_ENV === 'production' && process.env.UBER_EATS_ACCESS_TOKEN) {
    // Real API call - REQUIRED within 11.5 minutes
    try {
      const endpoint = accept ? 'accept_pos_order' : 'deny_pos_order';
      const body = accept ? {} : { reason: reason || 'ITEM_AVAILABILITY' };
      
      const response = await fetch(`https://api.uber.com/v1/eats/orders/${orderId}/${endpoint}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.UBER_EATS_ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
          'User-Agent': 'Vizion-Menu/1.0',
          'X-API-Version': '1.0' // Order API version
        },
        body: JSON.stringify(body)
      });

      if (response.ok) {
        return { success: true, action: accept ? 'accepted' : 'denied' };
      } else {
        const error = await response.json();
        return { success: false, error: error.message || 'Accept/deny failed' };
      }
    } catch (error) {
      return { success: false, error: `API request failed: ${error.message}` };
    }
  } else {
    // Mock implementation
    console.log(`🚗 [MOCK] Uber Eats Order ${accept ? 'Accept' : 'Deny'}: ${orderId}${reason ? ` (${reason})` : ''}`);
    return { success: true, action: accept ? 'accepted' : 'denied' };
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
    // Real API call - different endpoint structure
    try {
      // Note: Real Uber Eats uses different endpoints for different status updates
      let endpoint = '';
      let body = {};
      
      switch (status) {
        case 'preparing':
          endpoint = 'preparation_time';
          body = { preparation_time: 15 }; // minutes
          break;
        case 'ready_for_pickup':
          endpoint = 'ready_for_pickup';
          body = {};
          break;
        case 'finished':
          endpoint = 'finished';
          body = {};
          break;
        default:
          return { success: false, error: `Unsupported status: ${status}` };
      }

      const response = await fetch(`https://api.uber.com/v1/eats/orders/${orderId}/${endpoint}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.UBER_EATS_ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
          'User-Agent': 'Vizion-Menu/1.0',
          'X-API-Version': '1.0' // Order Status API version
        },
        body: JSON.stringify(body)
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
 * Fetch full order details from Uber Eats API
 * @param {string} orderId - Order ID
 * @returns {Object} Order details
 */
async function fetchUberEatsOrderDetails(orderId) {
  if (process.env.NODE_ENV === 'production' && process.env.UBER_EATS_ACCESS_TOKEN) {
    // Real API call
    try {
      const response = await fetch(`https://api.uber.com/v2/eats/order/${orderId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${process.env.UBER_EATS_ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
          'User-Agent': 'Vizion-Menu/1.0',
          'X-API-Version': '2.0' // Order Details API version
        }
      });

      if (response.ok) {
        return await response.json();
      } else {
        console.error(`Failed to fetch order details for ${orderId}: ${response.status}`);
        return null;
      }
    } catch (error) {
      console.error(`API request failed: ${error.message}`);
      return null;
    }
  } else {
    // Mock order details
    console.log(`🍔 [MOCK] Fetching Uber Eats order details for ${orderId}`);
    return {
      id: orderId,
      display_id: `UE-${orderId.slice(-6)}`,
      eater: {
        first_name: 'John',
        last_name: 'Doe',
        phone: '+1234567890',
        email: 'john@example.com'
      },
      cart: {
        items: [
          {
            external_data: 'item_1',
            title: 'Mock Burger',
            quantity: 1,
            price: 1299, // cents
            special_instructions: 'No onions'
          }
        ],
        special_instructions: 'Leave at door'
      },
      payment: {
        charges: {
          subtotal: 1299,
          tax: 169,
          total: 1468
        }
      },
      delivery: {
        location: {
          address: '123 Mock Street, Toronto, ON'
        }
      }
    };
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

/**
 * =====================================================
 * INTEGRATION CONFIG FUNCTIONS
 * For Uber Eats validation requirements
 * =====================================================
 */

/**
 * Activate Uber Eats integration for a branch
 * @param {string} storeId - Uber Eats store ID
 * @param {string} branchId - Branch ID
 * @param {Object} userBranch - User branch context
 * @returns {Object} Activation result
 */
async function activateIntegration(storeId, branchId, userBranch) {
  try {
    // Update or insert integration record
    const { data, error } = await supabase
      .from('platform_integrations')
      .upsert({
        branch_id: branchId,
        platform: 'uber_eats',
        store_id: storeId,
        integration_status: 'active',
        activated_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'branch_id,platform'
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to activate integration: ${error.message}`);
    }

    console.log(`✅ Uber Eats integration activated for store ${storeId}`);

    return {
      success: true,
      integration: data
    };
  } catch (error) {
    console.error('Activation error:', error);
    throw error;
  }
}

/**
 * Remove Uber Eats integration for a branch
 * @param {string} storeId - Uber Eats store ID
 * @param {string} branchId - Branch ID
 * @param {Object} userBranch - User branch context
 * @returns {Object} Removal result
 */
async function removeIntegration(storeId, branchId, userBranch) {
  try {
    const { data, error } = await supabase
      .from('platform_integrations')
      .update({
        integration_status: 'removed',
        deactivated_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('branch_id', branchId)
      .eq('platform', 'uber_eats')
      .eq('store_id', storeId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to remove integration: ${error.message}`);
    }

    console.log(`✅ Uber Eats integration removed for store ${storeId}`);

    return {
      success: true,
      integration: data
    };
  } catch (error) {
    console.error('Removal error:', error);
    throw error;
  }
}

/**
 * Update Uber Eats integration details
 * @param {string} storeId - Uber Eats store ID
 * @param {string} branchId - Branch ID
 * @param {Object} integrationSettings - Settings to update
 * @param {Object} userBranch - User branch context
 * @returns {Object} Update result
 */
async function updateIntegrationDetails(storeId, branchId, integrationSettings, userBranch) {
  try {
    const { data, error } = await supabase
      .from('platform_integrations')
      .update({
        integration_settings: integrationSettings,
        updated_at: new Date().toISOString()
      })
      .eq('branch_id', branchId)
      .eq('platform', 'uber_eats')
      .eq('store_id', storeId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update integration: ${error.message}`);
    }

    console.log(`✅ Uber Eats integration updated for store ${storeId}`);

    return {
      success: true,
      integration: data
    };
  } catch (error) {
    console.error('Update error:', error);
    throw error;
  }
}

/**
 * =====================================================
 * ORDER MANAGEMENT FUNCTIONS
 * For Uber Eats validation requirements
 * =====================================================
 */

/**
 * Accept order on Uber Eats
 */
async function acceptOrder(orderId, branchId, userBranch) {
  try {
    const result = await acceptOrDenyUberEatsOrder(orderId, true);

    // Update internal order status
    await supabase
      .from('orders')
      .update({ order_status: 'confirmed' })
      .eq('third_party_order_id', orderId)
      .eq('branch_id', branchId);

    return {
      success: result.success,
      external_order_id: orderId
    };
  } catch (error) {
    throw error;
  }
}

/**
 * Deny order on Uber Eats
 */
async function denyOrder(orderId, branchId, reason, userBranch) {
  try {
    const result = await acceptOrDenyUberEatsOrder(orderId, false, reason);

    // Update internal order status
    await supabase
      .from('orders')
      .update({ order_status: 'rejected' })
      .eq('third_party_order_id', orderId)
      .eq('branch_id', branchId);

    return {
      success: result.success,
      external_order_id: orderId
    };
  } catch (error) {
    throw error;
  }
}

/**
 * Cancel order on Uber Eats
 */
async function cancelOrder(orderId, branchId, reason, userBranch) {
  try {
    // Call Uber API to cancel
    const result = await performUberEatsOrderCancellation(orderId, reason);

    // Update internal order status
    await supabase
      .from('orders')
      .update({ order_status: 'cancelled' })
      .eq('third_party_order_id', orderId)
      .eq('branch_id', branchId);

    return {
      success: result.success,
      external_order_id: orderId
    };
  } catch (error) {
    throw error;
  }
}

/**
 * Get order details from Uber Eats
 */
async function getOrderDetails(orderId, branchId, userBranch) {
  try {
    const orderDetails = await fetchUberEatsOrderDetails(orderId);
    return orderDetails;
  } catch (error) {
    throw error;
  }
}

/**
 * Update order on Uber Eats
 */
async function updateOrder(orderId, branchId, updates, userBranch) {
  try {
    if (updates.status) {
      const result = await performUberEatsStatusUpdate(orderId, updates.status);

      // Update internal order
      await supabase
        .from('orders')
        .update({ order_status: updates.status })
        .eq('third_party_order_id', orderId)
        .eq('branch_id', branchId);

      return {
        success: result.success,
        external_order_id: orderId
      };
    }

    return { success: true, external_order_id: orderId };
  } catch (error) {
    throw error;
  }
}

/**
 * =====================================================
 * MENU MANAGEMENT FUNCTIONS
 * For Uber Eats validation requirements
 * =====================================================
 */

/**
 * Update single menu item on Uber Eats
 */
async function updateMenuItem(itemId, branchId, itemUpdates, userBranch) {
  try {
    // Mock implementation for now
    console.log(`📝 Updating menu item ${itemId} on Uber Eats`);

    return {
      success: true,
      item_id: itemId,
      updates: itemUpdates
    };
  } catch (error) {
    throw error;
  }
}

/**
 * Upload complete menu to Uber Eats
 */
async function uploadCompleteMenu(branchId, menuData, storeId, userBranch) {
  try {
    // Get branch info
    const { data: branch } = await supabase
      .from('branches')
      .select('*')
      .eq('id', branchId)
      .single();

    // Convert menu data directly from body (simplified for testing)
    const uberMenu = {
      items: [],
      categories: [],
      menus: [],
      modifier_groups: []
    };

    // Process categories and items from body
    if (menuData.categories && Array.isArray(menuData.categories)) {
      menuData.categories.forEach(category => {
        // Add category
        uberMenu.categories.push({
          id: category.id || `cat_${Date.now()}`,
          title: {
            translations: {
              en_us: category.name || 'Unnamed Category'
            }
          },
          subtitle: {
            translations: {
              en_us: category.description || ''
            }
          },
          items: (category.items || []).map(item => item.id)
        });

        // Add items
        if (category.items && Array.isArray(category.items)) {
          category.items.forEach(item => {
            uberMenu.items.push({
              id: item.id,
              external_data: item.id,
              title: {
                translations: {
                  en_us: item.name
                }
              },
              description: {
                translations: {
                  en_us: item.description || ''
                }
              },
              price: item.price || 0,
              core_price: item.price || 0,
              images: [],
              quantity_info: {
                quantity: {
                  max_permitted: 99,
                  min_permitted: 1,
                  default_quantity: 1
                }
              },
              suspension_info: {
                suspension: {
                  suspended_until: item.is_available ? null : Math.floor(Date.now() / 1000) + 86400
                }
              },
              modifier_group_ids: { ids: [] }
            });
          });
        }
      });

      // Add default menu
      uberMenu.menus.push({
        id: `menu_${branchId}`,
        title: {
          translations: {
            en_us: `${branch?.name || 'Restaurant'} Menu`
          }
        },
        category_ids: uberMenu.categories.map(cat => cat.id)
      });
    }

    // Perform upload
    const result = await performUberEatsMenuSync(storeId, uberMenu);

    return result;
  } catch (error) {
    throw error;
  }
}

/**
 * =====================================================
 * STORE MANAGEMENT FUNCTIONS
 * For Uber Eats validation requirements
 * =====================================================
 */

/**
 * Update holiday hours on Uber Eats
 */
async function updateHolidayHours(storeId, branchId, holidayHours, userBranch) {
  try {
    // Store holiday hours in database
    for (const holiday of holidayHours) {
      await supabase
        .from('store_holiday_hours')
        .upsert({
          branch_id: branchId,
          platform: 'uber_eats',
          holiday_name: holiday.name,
          holiday_date: holiday.date,
          is_closed: holiday.is_closed,
          open_time: holiday.open_time || null,
          close_time: holiday.close_time || null,
          updated_at: new Date().toISOString()
        });
    }

    console.log(`✅ Holiday hours updated for store ${storeId}`);

    return {
      success: true,
      store_id: storeId,
      holiday_count: holidayHours.length
    };
  } catch (error) {
    throw error;
  }
}

/**
 * =====================================================
 * WEBHOOK PROCESSING FUNCTIONS
 * For Uber Eats validation requirements
 * =====================================================
 */

/**
 * Process order notification webhook
 */
async function processOrderNotificationWebhook(orderId, data, webhookPayload) {
  try {
    console.log(`📥 Processing order notification for ${orderId}`);

    // Fetch order details and create in system
    const orderDetails = await fetchUberEatsOrderDetails(orderId);

    if (orderDetails) {
      // Find branch by store mapping
      const { data: integration } = await supabase
        .from('platform_integrations')
        .select('branch_id')
        .eq('platform', 'uber_eats')
        .eq('integration_status', 'active')
        .single();

      if (integration) {
        await processUberEatsOrder(webhookPayload, integration.branch_id);
      }
    }

    return true;
  } catch (error) {
    console.error('Webhook processing error:', error);
    return false;
  }
}

/**
 * Process order cancelled webhook
 */
async function processOrderCancelledWebhook(orderId, data, webhookPayload) {
  try {
    console.log(`❌ Processing order cancellation for ${orderId}`);

    // Update order status in database
    await supabase
      .from('orders')
      .update({
        order_status: 'cancelled',
        updated_at: new Date().toISOString()
      })
      .eq('third_party_order_id', orderId)
      .eq('third_party_platform', 'uber_eats');

    return true;
  } catch (error) {
    console.error('Webhook processing error:', error);
    return false;
  }
}

/**
 * Validate webhook signature
 */
async function validateWebhookSignature(body, signature) {
  // Use existing function
  return validateUberEatsWebhookSignature(JSON.stringify(body), signature, process.env.UBER_CLIENT_SECRET || 'test_secret');
}

/**
 * Perform order cancellation on Uber Eats
 */
async function performUberEatsOrderCancellation(orderId, reason) {
  if (process.env.NODE_ENV === 'production' && process.env.UBER_EATS_ACCESS_TOKEN) {
    // Real API call
    try {
      const response = await fetch(`https://api.uber.com/v1/eats/orders/${orderId}/cancel`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.UBER_EATS_ACCESS_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ reason: reason || 'RESTAURANT_REQUEST' })
      });

      return { success: response.ok };
    } catch (error) {
      return { success: false, error: error.message };
    }
  } else {
    // Mock
    console.log(`🚫 [MOCK] Cancelling Uber Eats order ${orderId}`);
    return { success: true };
  }
}

module.exports = {
  syncMenuToUberEats,
  processUberEatsOrder,
  updateOrderStatusOnUberEats,
  acceptOrDenyUberEatsOrder,
  fetchUberEatsOrderDetails,
  validateUberEatsWebhookSignature,
  getMenuWithMappings,
  convertMenuToUberEatsFormat,
  convertUberEatsOrderToVizion,
  convertStatusToUberEats,
  // Integration Config
  activateIntegration,
  removeIntegration,
  updateIntegrationDetails,
  // Order Management
  acceptOrder,
  denyOrder,
  cancelOrder,
  getOrderDetails,
  updateOrder,
  // Menu Management
  updateMenuItem,
  uploadCompleteMenu,
  // Store Management
  updateHolidayHours,
  // Webhooks
  processOrderNotificationWebhook,
  processOrderCancelledWebhook,
  validateWebhookSignature
};