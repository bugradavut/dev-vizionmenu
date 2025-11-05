// =====================================================
// ORDER MANAGEMENT SERVICE
// All order-related business logic and database operations
// =====================================================

const { createClient } = require('@supabase/supabase-js');

// Create Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Get orders list with filtering and pagination
 * @param {Object} filters - Filter parameters
 * @param {Object} userBranch - User branch context
 * @returns {Object} Orders list with pagination
 */
async function getOrders(filters, userBranch) {
  const { 
    status, 
    source, 
    page = 1, 
    limit = 20, 
    date_from, 
    date_to,
    branch_id 
  } = filters;
  
  // Input validation
  const pageNum = Math.max(1, parseInt(page) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 20));

  // Determine target branch (chain_owner can access other branches)
  let targetBranchId = userBranch.branch_id;
  if (branch_id && userBranch.role === 'chain_owner') {
    targetBranchId = branch_id;
  }

  // Build query with comprehensive filtering including order items for Kitchen Display
  let query = supabase
    .from('orders')
    .select(`
      id,
      customer_name,
      customer_phone,
      customer_email,
      order_type,
      table_number,
      zone,
      order_status,
      payment_status,
      payment_method,
      subtotal,
      tax_amount,
      service_fee,
      delivery_fee,
      total_amount,
      notes,
      special_instructions,
      estimated_ready_time,
      individual_timing_adjustment,
      third_party_order_id,
      third_party_platform,
      is_pre_order,
      scheduled_date,
      scheduled_time,
      scheduled_datetime,
      created_at,
      updated_at,
      total_refunded,
      refund_count,
      last_refund_at,
      order_items(
        id,
        menu_item_name,
        menu_item_price,
        quantity,
        item_total,
        special_instructions,
        order_item_variants(*)
      )
    `)
    .eq('branch_id', targetBranchId)
    .order('created_at', { ascending: false });

  // Apply filters - support multiple statuses
  if (status) {
    const statusArray = status.split(',').map(s => s.trim());
    query = query.in('order_status', statusArray);
  }
  if (source) {
    if (source === 'qr_code') {
      query = query.is('third_party_platform', null);
    } else {
      query = query.eq('third_party_platform', source);
    }
  }
  if (date_from) query = query.gte('created_at', date_from);
  if (date_to) query = query.lte('created_at', date_to);

  // Get total count for pagination
  let countQuery = supabase
    .from('orders')
    .select('id', { count: 'exact', head: true })
    .eq('branch_id', targetBranchId);
  
  if (status) {
    const statusArray = status.split(',').map(s => s.trim());
    countQuery = countQuery.in('order_status', statusArray);
  }
  if (source) {
    if (source === 'qr_code') {
      countQuery = countQuery.is('third_party_platform', null);
    } else {
      countQuery = countQuery.eq('third_party_platform', source);
    }
  }
  if (date_from) countQuery = countQuery.gte('created_at', date_from);
  if (date_to) countQuery = countQuery.lte('created_at', date_to);

  // Execute queries in parallel
  const [ordersResult, countResult] = await Promise.all([
    query.range((pageNum - 1) * limitNum, pageNum * limitNum - 1),
    countQuery
  ]);

  if (ordersResult.error) {
    console.error('Orders fetch error:', ordersResult.error);
    throw new Error(`Failed to fetch orders: ${ordersResult.error.message}`);
  }

  // Format response for mobile app including order items for Kitchen Display
  const formattedOrders = (ordersResult.data || []).map(order => ({
      id: order.id,
      orderNumber: order.id.split('-')[0].toUpperCase(),
      customerName: order.customer_name || 'Walk-in Customer',
      customerPhone: order.customer_phone,
      customerEmail: order.customer_email,
      orderType: order.order_type,
      tableNumber: order.table_number,
      // Use zone field from database (NEW: Direct zone field support)
      zone: order.zone || null,
      source: order.third_party_platform || (order.table_number ? 'qr_code' : 'web'),
      status: order.order_status,
      paymentStatus: order.payment_status,
      paymentMethod: order.payment_method,
      pricing: {
        subtotal: parseFloat(order.subtotal || 0),
        taxAmount: parseFloat(order.tax_amount || 0),
        serviceFee: parseFloat(order.service_fee || 0),
        deliveryFee: parseFloat(order.delivery_fee || 0),
        total: parseFloat(order.total_amount || 0)
      },
      // SW-78 FO-115: Refund tracking
      total_refunded: parseFloat(order.total_refunded || 0),
      refund_count: order.refund_count || 0,
      last_refund_at: order.last_refund_at || null,
      notes: order.notes,
      specialInstructions: order.special_instructions,
      estimatedReadyTime: order.estimated_ready_time,
      
      // Pre-order fields
      is_pre_order: order.is_pre_order || false,
      scheduled_date: order.scheduled_date,
      scheduled_time: order.scheduled_time,
      scheduled_datetime: order.scheduled_datetime,
      
      // NEW: Individual timing adjustment (Phase 2 - +5min button feature) 
      individual_timing_adjustment: order.individual_timing_adjustment || 0,
      
      items: (order.order_items || []).map(item => ({
        id: item.id,
        name: item.menu_item_name,
        price: parseFloat(item.menu_item_price || 0),
        quantity: item.quantity || 1,
        total: parseFloat(item.item_total || 0),
        special_instructions: item.special_instructions,
        variants: item.order_item_variants || []
      })),
      created_at: order.created_at,
      updated_at: order.updated_at
  }));

  const totalCount = countResult.count || 0;
  
  return {
    data: formattedOrders,
    meta: { 
      total: totalCount,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(totalCount / limitNum),
      hasNextPage: pageNum * limitNum < totalCount,
      hasPreviousPage: pageNum > 1
    }
  };
}

/**
 * Get detailed order information
 * @param {string} orderId - Order ID (can be UUID or ORDER-XXXXX format)
 * @param {Object} userBranch - User branch context
 * @returns {Object} Detailed order data
 */
async function getOrderDetail(orderId, userBranch) {
  // Handle both UUID and short order number formats
  let actualOrderId = orderId;
  let existingOrder;
  let findError;

  // First try as UUID
  if (orderId.length === 36 && orderId.includes('-')) {
    let query = supabase
      .from('orders')
      .select(`
        *,
        order_items(
          *,
          order_item_variants(*)
        )
      `)
      .eq('id', orderId);

      
    // Only filter by branch_id if userBranch is provided (for authenticated requests)
    if (userBranch && userBranch.branch_id) {
      query = query.eq('branch_id', userBranch.branch_id);
    }
    
    const { data, error } = await query.single();


    existingOrder = data;
    findError = error;
    
  } else {
    // Try as short order number (ORDER-XXXXX format)
    let query = supabase
      .from('orders')
      .select('id');
      
    // Only filter by branch_id if userBranch is provided
    if (userBranch && userBranch.branch_id) {
      query = query.eq('branch_id', userBranch.branch_id);
    }
    
    const { data: orders, error } = await query;

    if (!error && orders) {
      // Find order by short ID pattern matching
      const matchingOrder = orders.find(order => {
        const shortId = order.id.substring(0, 8).toUpperCase();
        const orderNumber = `ORDER-${shortId}`;
        return orderNumber === orderId.toUpperCase();
      });

      if (matchingOrder) {
        actualOrderId = matchingOrder.id;
        // Get full order details
        let detailQuery = supabase
          .from('orders')
          .select(`
            *,
            order_items(
              *,
              order_item_variants(*)
            )
          `)
          .eq('id', matchingOrder.id);
          
        // Only filter by branch_id if userBranch is provided
        if (userBranch && userBranch.branch_id) {
          detailQuery = detailQuery.eq('branch_id', userBranch.branch_id);
        }
        
        const result = await detailQuery.single();
        
        existingOrder = result.data;
        findError = result.error;
        
      } else {
        findError = { message: 'Order not found' };
      }
    } else {
      findError = error;
    }
  }

  if (findError || !existingOrder) {
    throw new Error('Order not found or access denied');
  }

  // SW-78 FO-114: Fetch removed items for Quebec SRS compliance
  const { data: removedItems } = await supabase
    .from('order_removed_items')
    .select('*')
    .eq('order_id', existingOrder.id)
    .order('removed_at', { ascending: false });

  // Format detailed response for frontend (match Order interface)
  const formattedOrder = {
    id: existingOrder.id,
    orderNumber: existingOrder.id.split('-')[0].toUpperCase(),
    branch_id: existingOrder.branch_id, // Add branch_id for timing calculations
    customer: {
      name: existingOrder.customer_name || 'Walk-in Customer',
      phone: existingOrder.customer_phone || '',
      email: existingOrder.customer_email
    },
    source: existingOrder.third_party_platform || (existingOrder.table_number ? 'qr_code' : 'web'), // 'qr_code' | 'uber_eats' | 'doordash' | 'phone' | 'web'
    status: existingOrder.order_status, // 'preparing' | 'ready' | 'completed' | 'cancelled' | 'rejected'
    order_type: existingOrder.order_type,
    table_number: existingOrder.table_number,
    // Use zone field from database (NEW: Direct zone field support)
    zone: existingOrder.zone || null,
    payment_method: existingOrder.payment_method,
    payment_status: existingOrder.payment_status,
    payment_intent_id: existingOrder.payment_intent_id,
    total_amount: parseFloat(existingOrder.total_amount || 0),
    total_refunded: parseFloat(existingOrder.total_refunded || 0),
    refund_count: existingOrder.refund_count || 0,
    paid_at: existingOrder.paid_at,
    last_refund_at: existingOrder.last_refund_at,
    pricing: {
      // Legacy fields (backward compatibility)
      subtotal: parseFloat(existingOrder.subtotal || 0),
      tax_amount: parseFloat(existingOrder.tax_amount || 0),
      service_fee: parseFloat(existingOrder.service_fee || 0),
      delivery_fee: parseFloat(existingOrder.delivery_fee || 0),
      total: parseFloat(existingOrder.total_amount || 0),
      
      // NEW: Comprehensive pricing breakdown
      itemsTotal: parseFloat(existingOrder.items_subtotal || 0),
      discountAmount: parseFloat(existingOrder.discount_amount || 0),
      gst: parseFloat(existingOrder.gst_amount || 0),
      qst: parseFloat(existingOrder.qst_amount || 0),
      tipAmount: parseFloat(existingOrder.tip_amount || 0)
    },
    
    // Campaign/discount details
    campaignDiscount: existingOrder.coupon_code ? {
      code: existingOrder.coupon_code,
      discountAmount: parseFloat(existingOrder.discount_amount || 0),
      couponId: existingOrder.coupon_id
    } : null,
    
    // Tip details
    tipDetails: existingOrder.tip_amount > 0 ? {
      amount: parseFloat(existingOrder.tip_amount || 0),
      type: existingOrder.tip_type || 'fixed',
      value: parseFloat(existingOrder.tip_value || 0)
    } : null,
    notes: existingOrder.notes,
    special_instructions: existingOrder.special_instructions,
    estimated_ready_time: existingOrder.estimated_ready_time,
    
    // NEW: Individual timing adjustment (Phase 2 - +5min button feature)
    individual_timing_adjustment: existingOrder.individual_timing_adjustment || 0,
    scheduled_datetime: existingOrder.scheduled_datetime, // Pre-order scheduled datetime
    scheduled_date: existingOrder.scheduled_date, // Pre-order scheduled date  
    scheduled_time: existingOrder.scheduled_time, // Pre-order scheduled time
    is_pre_order: existingOrder.is_pre_order || false, // Pre-order flag
    delivery_address: existingOrder.delivery_address, // Add delivery_address field
    third_party_order_id: existingOrder.third_party_order_id,
    third_party_platform: existingOrder.third_party_platform,

    // NEW: Uber Direct delivery fields
    uber_delivery_id: existingOrder.uber_delivery_id,
    uber_tracking_url: existingOrder.uber_tracking_url, // Add missing tracking URL field
    delivery_status: existingOrder.delivery_status,
    courier_info: existingOrder.courier_info,
    delivery_eta: existingOrder.delivery_eta,
    status_history: existingOrder.status_history,

    created_at: existingOrder.created_at,
    updated_at: existingOrder.updated_at,
    items: (existingOrder.order_items || []).map(item => ({
      id: item.id,
      name: item.menu_item_name,
      price: parseFloat(item.menu_item_price || 0),
      quantity: item.quantity || 1,
      total: parseFloat(item.item_total || 0),
      special_instructions: item.special_instructions,
      refunded_quantity: item.refunded_quantity || 0,
      refund_amount: parseFloat(item.refund_amount || 0),
      variants: (item.order_item_variants || []).map(variant => ({
        name: variant.variant_name,
        price: parseFloat(variant.variant_price || 0)
      }))
    })),

    // SW-78 FO-114: Quebec SRS compliance - removed items tracking
    removedItems: (removedItems || []).map(removedItem => ({
      id: removedItem.id,
      order_id: removedItem.order_id,
      item_name: removedItem.item_name,
      item_price: parseFloat(removedItem.item_price || 0),
      item_id: removedItem.item_id,
      image_url: removedItem.image_url,
      removed_at: removedItem.removed_at,
      reason: removedItem.reason,
      original_quantity: removedItem.original_quantity,
      removed_quantity: removedItem.removed_quantity,
      notes: removedItem.notes,
      customizations: removedItem.customizations
    }))
  };

  return formattedOrder;
}

/**
 * Update order status with validation
 * @param {string} orderId - Order ID
 * @param {Object} updateData - Status update data
 * @param {Object} userBranch - User branch context
 * @returns {Object} Update response
 */
async function updateOrderStatus(orderId, updateData, userBranch) {
  const { status, notes, estimated_ready_time } = updateData;
  
  // Validation - Updated for new 2-step flow: preparing → completed
  const validStatuses = ['preparing', 'completed', 'cancelled', 'rejected'];
  if (!status || !validStatuses.includes(status)) {
    throw new Error(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
  }

  // Handle both UUID and short order number formats
  let actualOrderId = orderId;
  let existingOrder;
  let findError;

  // First try as UUID
  if (orderId.length === 36 && orderId.includes('-')) {
    const { data, error } = await supabase
      .from('orders')
      .select('id, order_status, branch_id')
      .eq('id', orderId)
      .eq('branch_id', userBranch.branch_id)
      .single();
    existingOrder = data;
    findError = error;
  } else {
    // Try as short order number (ORDER-XXXXX format)
    const { data: orders, error } = await supabase
      .from('orders')
      .select('id, order_status, branch_id')
      .eq('branch_id', userBranch.branch_id);

    if (!error && orders) {
      // Find order by short ID pattern matching
      const matchingOrder = orders.find(order => {
        const shortId = order.id.substring(0, 8).toUpperCase();
        const orderNumber = `ORDER-${shortId}`;
        return orderNumber === orderId.toUpperCase();
      });

      if (matchingOrder) {
        existingOrder = matchingOrder;
        actualOrderId = matchingOrder.id;
        findError = null;
      } else {
        findError = { message: 'Order not found' };
      }
    } else {
      findError = error;
    }
  }

  if (findError || !existingOrder) {
    throw new Error('Order not found or access denied');
  }

  // Note: Auto-accept logic removed - all orders now start as 'preparing'

  // Prepare update data
  const updateDataObj = {
    order_status: status,
    updated_at: new Date().toISOString()
  };

  if (notes) updateDataObj.notes = notes;
  if (estimated_ready_time) updateDataObj.estimated_ready_time = estimated_ready_time;

  // Update order using the actual UUID
  const { data: updatedOrder, error: updateError } = await supabase
    .from('orders')
    .update(updateDataObj)
    .eq('id', actualOrderId)
    .eq('branch_id', userBranch.branch_id)
    .select()
    .single();

  if (updateError) {
    console.error('Order status update error:', updateError);
    throw new Error(`Failed to update order: ${updateError.message}`);
  }

  console.log(`✅ Order status updated: ${orderId} - ${existingOrder.order_status} → ${status}`);

  // ✉️ Send status change email notification (async, non-blocking)
  // For pre-orders: send email when status changes to 'preparing'
  // For all orders: send email when status changes to 'completed'
  if (status === 'preparing' || status === 'completed') {
    try {
      console.log(`📧 [EMAIL] Order status changed to '${status}', preparing to send notification email...`);
      console.log('📧 [EMAIL] Order ID:', actualOrderId);

      // Fetch complete order data for email
      const { data: orderForEmail, error: fetchError } = await supabase
        .from('orders')
        .select('*')
        .eq('id', actualOrderId)
        .single();

      if (fetchError) {
        console.warn('⚠️ [EMAIL] Failed to fetch order for email:', fetchError.message);
      } else {
        console.log('📧 [EMAIL] Order fetched, customer email:', orderForEmail.customer_email);

        // Fetch order items
        const { data: orderItems, error: itemsError } = await supabase
          .from('order_items')
          .select('*')
          .eq('order_id', actualOrderId);

        if (itemsError) {
          console.warn('⚠️ [EMAIL] Failed to fetch order items:', itemsError.message);
        }

        // Fetch branch information
        const { data: branchData, error: branchError } = await supabase
          .from('branches')
          .select('id, name, phone, address')
          .eq('id', orderForEmail.branch_id)
          .single();

        if (branchError) {
          console.warn('⚠️ [EMAIL] Branch fetch error:', branchError.message);
        }

        // Prepare complete order object for email
        const completeOrderData = {
          ...orderForEmail,
          items: (orderItems || []).map(item => ({
            name: item.menu_item_name,
            quantity: item.quantity,
            price: item.menu_item_price,
          })),
          branch: branchData ? {
            id: branchData.id,
            name: branchData.name,
            phone: branchData.phone,
            address: branchData.address,
          } : null,
        };

        // Determine which email to send based on status and order type
        const { sendOrderPreparingEmail, sendOrderReadyEmail, sendOrderDeliveredEmail } = require('./notification.service');

        // For pre-orders: send "preparing" email when status changes to 'preparing'
        if (status === 'preparing' && orderForEmail.is_pre_order) {
          console.log('📧 [EMAIL] Pre-order status changed to preparing, sending notification...');
          sendOrderPreparingEmail(completeOrderData)
            .then((result) => {
              if (result.success) {
                console.log(`✅ [EMAIL] Pre-order preparing email sent: ${result.data.messageId}`);
              } else {
                console.warn(`⚠️ [EMAIL] Pre-order preparing email failed: ${result.error}`);
              }
            })
            .catch((error) => {
              console.error('❌ [EMAIL] Error sending pre-order preparing email:', error.message);
            });
        }
        // For all orders: send "completed" email when status changes to 'completed'
        else if (status === 'completed') {
          if (orderForEmail.order_type === 'delivery') {
            console.log('📧 [EMAIL] Sending delivery completed email...');
            sendOrderDeliveredEmail(completeOrderData)
              .then((result) => {
                if (result.success) {
                  console.log(`✅ [EMAIL] Order delivered email sent: ${result.data.messageId}`);
                } else {
                  console.warn(`⚠️ [EMAIL] Order delivered email failed: ${result.error}`);
                }
              })
              .catch((error) => {
                console.error('❌ [EMAIL] Error sending order delivered email:', error.message);
              });
          } else {
            console.log('📧 [EMAIL] Sending order ready email (takeaway/dine-in)...');
            sendOrderReadyEmail(completeOrderData)
              .then((result) => {
                if (result.success) {
                  console.log(`✅ [EMAIL] Order ready email sent: ${result.data.messageId}`);
                } else {
                  console.warn(`⚠️ [EMAIL] Order ready email failed: ${result.error}`);
                }
              })
              .catch((error) => {
                console.error('❌ [EMAIL] Error sending order ready email:', error.message);
              });
          }
        }
      }
    } catch (error) {
      console.error('❌ [EMAIL] Email service error:', error);
      console.warn('⚠️ [EMAIL] Email service unavailable:', error.message);
    }
  }

  return {
    success: true,
    message: 'Order status updated successfully',
    orderId: orderId,
    statusChange: {
      from: existingOrder.order_status,
      to: status
    },
    updatedAt: updateDataObj.updated_at,
    order: {
      id: updatedOrder.id,
      status: updatedOrder.order_status,
      notes: updatedOrder.notes,
      estimatedReadyTime: updatedOrder.estimated_ready_time
    }
  };
}

/**
 * Check if order should be auto-accepted based on branch settings
 * @param {string} orderId - Order ID
 * @param {string} branchId - Branch ID
 * @returns {Object} Auto-accept result
 */
async function checkAutoAccept(orderId, branchId) {
  // Get order to check current status
  const { data: orderData, error: orderError } = await supabase
    .from('orders')
    .select('id, order_status, branch_id, order_type, third_party_platform')
    .eq('id', orderId)
    .eq('branch_id', branchId)
    .single();

  if (orderError || !orderData) {
    throw new Error('Order not found');
  }

  // Note: All orders now start as 'preparing', no pending status check needed
  if (orderData.order_status !== 'preparing') {
    return {
      autoAccepted: false,
      status: orderData.order_status,
      message: `Order already processed: ${orderData.order_status}`
    };
  }

  // Get branch settings
  const { data: branchData, error: branchError } = await supabase
    .from('branches')
    .select('name, settings')
    .eq('id', branchId)
    .single();

  if (branchError || !branchData) {
    throw new Error('Branch not found');
  }

  const orderFlow = branchData.settings?.orderFlow || 'standard';
  let shouldAutoAccept = false;
  let reason = '';

  // Auto-accept logic
  if (orderFlow === 'simplified') {
    // Check if it's an internal order (QR code, web) - these can be fully automated
    if (['qr_code', 'web'].includes(orderData.third_party_platform) || !orderData.third_party_platform) {
      shouldAutoAccept = true;
      reason = 'Simplified Flow: Internal order auto-accepted';
    } 
    // Third-party orders (Uber Eats, DoorDash) still need manual confirmation for "Ready" status
    // but can be auto-accepted to "preparing"
    else if (['uber_eats', 'doordash', 'phone'].includes(orderData.third_party_platform)) {
      shouldAutoAccept = true;
      reason = 'Simplified Flow: Third-party order auto-accepted to preparing (ready status requires manual confirmation)';
    }
  } else {
    reason = 'Standard Flow: Manual confirmation required';
  }

  // If should auto-accept, update the order status
  if (shouldAutoAccept) {
    const { data: updatedOrder, error: updateError } = await supabase
      .from('orders')
      .update({ 
        order_status: 'preparing',
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId)
      .select()
      .single();

    if (updateError) {
      console.error('Auto-accept update error:', updateError);
      throw new Error('Failed to auto-accept order');
    }

    return {
      autoAccepted: true,
      status: 'preparing',
      message: reason,
      order: {
        id: updatedOrder.id,
        status: updatedOrder.order_status,
        updatedAt: updatedOrder.updated_at
      }
    };
  }

  // No auto-accept needed
  return {
    autoAccepted: false,
    status: 'pending',
    message: reason
  };
}

/**
 * Check and auto-advance orders from 'preparing' to 'completed' based on timing settings and auto-ready toggle
 * @param {string} branchId - Branch ID
 * @returns {Object} Timer check results
 */
async function checkOrderTimers(branchId) {
  // Get branch settings
  const { data: branchData, error: branchError } = await supabase
    .from('branches')
    .select('name, settings')
    .eq('id', branchId)
    .single();

  if (branchError || !branchData) {
    throw new Error('Branch not found');
  }

  // Get timing settings (including autoReady toggle)
  const timingSettings = branchData.settings?.timingSettings || {
    baseDelay: 20,
    temporaryBaseDelay: 0,
    deliveryDelay: 15,
    temporaryDeliveryDelay: 0,
    autoReady: false
  };

  // Check if auto-ready is enabled
  if (!timingSettings.autoReady) {
    return {
      processed: 0,
      orders: [],
      message: 'Auto-ready disabled - manual order progression required'
    };
  }

  // Base kitchen prep time from branch settings
  // Kitchen prep time - only base + temporary (no delivery time for kitchen)
  const baseKitchenPrepTime = timingSettings.baseDelay + timingSettings.temporaryBaseDelay;

  // Get all preparing orders for this branch
  const { data: preparingOrders, error: ordersError } = await supabase
    .from('orders')
    .select('id, order_status, created_at, updated_at, order_type, third_party_platform, individual_timing_adjustment')
    .eq('branch_id', branchId)
    .eq('order_status', 'preparing');

  if (ordersError) {
    console.error('Failed to fetch preparing orders:', ordersError);
    throw new Error('Failed to fetch preparing orders');
  }

  if (!preparingOrders || preparingOrders.length === 0) {
    return {
      processed: 0,
      orders: [],
      message: 'No preparing orders found'
    };
  }

  const now = new Date();
  const processedOrders = [];
  let updatedCount = 0;

  // Check each preparing order
  for (const order of preparingOrders) {
    // Calculate individual prep time for this order
    // Base prep time + individual adjustment (can be positive or negative)
    const individualAdjustment = order.individual_timing_adjustment || 0;
    const totalKitchenPrepTime = baseKitchenPrepTime + individualAdjustment;
    
    // Use updated_at as the reference time (when it was moved to 'preparing')
    const prepStartTime = new Date(order.updated_at);
    const minutesSincePrepStart = (now.getTime() - prepStartTime.getTime()) / (1000 * 60);
    
    let shouldAutoComplete = false;
    let reason = '';

    // Auto-complete logic based on order type and individual timing
    if (minutesSincePrepStart >= totalKitchenPrepTime) {
      // For internal orders (QR code, web, or null platform), auto-complete is allowed
      if (!order.third_party_platform || ['qr_code', 'web'].includes(order.third_party_platform)) {
        shouldAutoComplete = true;
        const adjustmentInfo = individualAdjustment !== 0 ? ` (base: ${baseKitchenPrepTime}min, adjustment: ${individualAdjustment > 0 ? '+' : ''}${individualAdjustment}min)` : '';
        reason = `Internal order auto-completed after ${Math.round(minutesSincePrepStart)} minutes${adjustmentInfo}`;
      }
      // For third-party orders, respect manual ready option
      else if (['uber_eats', 'doordash', 'phone'].includes(order.third_party_platform)) {
        // Third-party orders always require manual confirmation for completion
        // This is a business rule for external platform compatibility
        shouldAutoComplete = false;
        const adjustmentInfo = individualAdjustment !== 0 ? ` (adjusted time: ${totalKitchenPrepTime}min)` : '';
        reason = `Third-party order requires manual completion confirmation (${Math.round(minutesSincePrepStart)} min elapsed)${adjustmentInfo}`;
      }
    } else {
      const remainingMinutes = Math.ceil(totalKitchenPrepTime - minutesSincePrepStart);
      const adjustmentInfo = individualAdjustment !== 0 ? ` (adjusted: ${totalKitchenPrepTime}min total)` : '';
      reason = `Timer pending: ${remainingMinutes} minutes remaining${adjustmentInfo}`;
    }

    if (shouldAutoComplete) {
      // Update order to completed status (new 2-step flow: preparing → completed)
      const { data: updatedOrder, error: updateError } = await supabase
        .from('orders')
        .update({ 
          order_status: 'completed',
          updated_at: now.toISOString()
        })
        .eq('id', order.id)
        .select()
        .single();

      if (updateError) {
        console.error(`Failed to auto-complete order ${order.id}:`, updateError);
        processedOrders.push({
          id: order.id,
          status: 'preparing',
          success: false,
          message: `Auto-complete failed: ${updateError.message}`
        });
      } else {
        updatedCount++;
        processedOrders.push({
          id: order.id,
          status: 'completed',
          success: true,
          message: reason,
          prepTime: Math.round(minutesSincePrepStart),
          baseTime: baseKitchenPrepTime,
          adjustment: individualAdjustment,
          totalTime: totalKitchenPrepTime
        });

        // WEB-SRM Dry-Run Integration (Phase 3)
        // Emit dry-run output when order is auto-completed
        try {
          const { isWebSrmDryRunEnabled } = require('../../utils/featureFlags');
          if (isWebSrmDryRunEnabled()) {
            const { emitWebsrmDryRun } = require('../../services/websrm-adapter/dryrun-adapter');

            // Items yoksa dry-run'ı atla (adapter zaten 'skipped-no-items' döner)
            // NO DB ACCESS: updatedOrder zaten items içermiyorsa skip edilir
            const orderWithItems = Array.isArray(updatedOrder.items)
              ? updatedOrder
              : { ...updatedOrder, items: [] };

            emitWebsrmDryRun(orderWithItems)
              .then((result) => {
                if (result.hash !== 'skipped-no-items') {
                  console.info('[WEB-SRM DRYRUN]', updatedOrder.id, 'hash:', result.hash, 'files:', result.files.length);
                }
              })
              .catch((error) => {
                console.warn('[WEB-SRM DRYRUN] failed:', updatedOrder.id, error.message);
              });
          }
        } catch (error) {
          console.debug('[WEB-SRM DRYRUN] adapter not available:', error.message);
        }

        // WEB-SRM Runtime Integration (Phase 6 - Refactored)
        // Profile-based configuration, production-blocked, local persist only (NO network)
        try {
          const enabled = process.env.WEBSRM_ENABLED === 'true' && process.env.NODE_ENV !== 'production';
          if (enabled) {
            const { handleOrderForWebSrm } = require('../../services/websrm-adapter/runtime-adapter');
            const { resolveProfile } = require('../../services/websrm-adapter/profile-resolver');

            const orderWithItems = Array.isArray(updatedOrder.items)
              ? updatedOrder
              : { ...updatedOrder, items: [] };

            // Resolve profile for tenant/branch/device
            resolveProfile(
              updatedOrder.tenant_id,
              updatedOrder.branch_id,
              updatedOrder.device_id // If stored in order
            )
              .then((profile) => handleOrderForWebSrm(orderWithItems, profile, {
                persist: process.env.WEBSRM_PERSIST || 'files',
              }))
              .then(() => console.info('[WEB-SRM] persisted (auto-complete)', updatedOrder.id))
              .catch((e) => console.warn('[WEB-SRM] persist failed (auto-complete)', updatedOrder.id, e.message));
          }
        } catch (error) {
          console.debug('[WEB-SRM] runtime adapter not available:', error.message);
        }
      }
    } else {
      processedOrders.push({
        id: order.id,
        status: 'preparing',
        success: false,
        message: reason,
        prepTime: Math.round(minutesSincePrepStart),
        baseTime: baseKitchenPrepTime,
        adjustment: individualAdjustment,
        totalTime: totalKitchenPrepTime,
        remainingTime: Math.ceil(totalKitchenPrepTime - minutesSincePrepStart)
      });
    }
  }

  return {
    processed: updatedCount,
    totalChecked: preparingOrders.length,
    orders: processedOrders,
    branchName: branchData.name,
    timingSettings: {
      totalPrepTime: baseKitchenPrepTime,
      autoReady: timingSettings.autoReady,
      breakdown: {
        baseDelay: timingSettings.baseDelay,
        temporaryBaseDelay: timingSettings.temporaryBaseDelay,
        deliveryDelay: timingSettings.deliveryDelay,
        temporaryDeliveryDelay: timingSettings.temporaryDeliveryDelay,
        manualReadyOption: timingSettings.manualReadyOption || false
      }
    }
  };
}

/**
 * Update individual timing adjustment for an order
 * @param {string} orderId - Order ID
 * @param {number} adjustmentMinutes - Minutes to add/subtract
 * @param {Object} userBranch - User branch context
 * @returns {Object} Update result
 */
async function updateOrderTiming(orderId, adjustmentMinutes, userBranch) {
  // Validation
  if (!orderId) {
    throw new Error('Order ID is required');
  }
  
  if (typeof adjustmentMinutes !== 'number') {
    throw new Error('Adjustment minutes must be a number');
  }
  
  // Limit adjustment to reasonable range
  if (adjustmentMinutes < -30 || adjustmentMinutes > 60) {
    throw new Error('Adjustment must be between -30 and +60 minutes');
  }

  // Get current order to verify access and current adjustment
  const { data: existingOrder, error: findError } = await supabase
    .from('orders')
    .select('id, order_status, individual_timing_adjustment, customer_name')
    .eq('id', orderId)
    .eq('branch_id', userBranch.branch_id)
    .single();

  if (findError || !existingOrder) {
    throw new Error('Order not found or access denied');
  }

  // Only allow timing adjustments for active orders
  const validStatuses = ['preparing', 'confirmed'];
  if (!validStatuses.includes(existingOrder.order_status)) {
    throw new Error(`Cannot adjust timing for order with status: ${existingOrder.order_status}`);
  }

  // Calculate new total adjustment
  const currentAdjustment = existingOrder.individual_timing_adjustment || 0;
  const newTotalAdjustment = currentAdjustment + adjustmentMinutes;
  
  // Ensure total adjustment stays within limits
  if (newTotalAdjustment < -30 || newTotalAdjustment > 60) {
    throw new Error('Total timing adjustment would exceed limits (-30 to +60 minutes)');
  }

  // Update the order
  const { data: updatedOrder, error: updateError } = await supabase
    .from('orders')
    .update({
      individual_timing_adjustment: newTotalAdjustment,
      updated_at: new Date().toISOString()
    })
    .eq('id', orderId)
    .eq('branch_id', userBranch.branch_id)
    .select('id, customer_name, individual_timing_adjustment, order_status')
    .single();

  if (updateError) {
    console.error('Order timing update error:', updateError);
    throw new Error(`Failed to update order timing: ${updateError.message}`);
  }

  return {
    success: true,
    message: `Order timing adjusted by ${adjustmentMinutes > 0 ? '+' : ''}${adjustmentMinutes} minutes`,
    orderId: updatedOrder.id,
    customerName: updatedOrder.customer_name,
    adjustmentApplied: adjustmentMinutes,
    totalAdjustment: updatedOrder.individual_timing_adjustment,
    orderStatus: updatedOrder.order_status
  };
}

/**
 * Create order with commission calculation
 * Enhanced version of createOrder with commission fields
 */
async function createOrderWithCommission(orderData, branchId) {
  const {
    orderId, // SW-78 FO-104: Frontend-generated order ID for offline orders
    customer,
    items,
    orderType,
    paymentMethod,
    source,
    tableNumber,
    zone,
    notes,
    specialInstructions,
    deliveryAddress,
    preOrder,
    pricing,
    campaign,
    tip,
    // Commission fields
    order_source,
    commission_rate,
    commission_amount,
    net_amount,
    commission_status,
    // Payment tracking
    paymentIntentId,
    // SW-78 FO-114: Quebec SRS compliance - removed items tracking
    removedItems = []
  } = orderData;
  
  // Use comprehensive pricing if provided, otherwise calculate basic totals
  let itemsSubtotal, discountAmount, deliveryFee, gstAmount, qstAmount, tipAmount, finalTotal;
  let couponCode = null, couponId = null, tipType = null, tipValue = null;
  
  if (pricing) {
    // Use provided comprehensive pricing breakdown
    itemsSubtotal = parseFloat(pricing.itemsTotal || 0);
    discountAmount = parseFloat(pricing.discountAmount || 0);
    deliveryFee = parseFloat(pricing.deliveryFee || 0);
    gstAmount = parseFloat(pricing.gst || 0);
    qstAmount = parseFloat(pricing.qst || 0);
    tipAmount = parseFloat(pricing.tipAmount || 0);
    finalTotal = parseFloat(pricing.finalTotal || 0);
    
    // Campaign/coupon details
    if (campaign) {
      couponCode = campaign.code;
      couponId = campaign.id || null;
    }
    
    // Tip details
    if (tip) {
      tipAmount = parseFloat(tip.amount || 0);
      tipType = tip.type || 'percentage';
      tipValue = parseFloat(tip.value || 0);
    }
  } else {
    // Calculate basic totals from items
    itemsSubtotal = items.reduce((sum, item) => {
      return sum + (parseFloat(item.price) * parseInt(item.quantity));
    }, 0);
    
    // Simple calculation (no taxes/fees for basic orders)
    discountAmount = 0;
    deliveryFee = 0;
    gstAmount = 0;
    qstAmount = 0;
    tipAmount = parseFloat(tip?.amount || 0);
    finalTotal = itemsSubtotal + tipAmount;
  }

  // Handle pre-order data (same as createOrder function)
  const isPreOrder = preOrder?.isPreOrder || false;
  let scheduledDateTime = null;
  if (preOrder?.scheduledDateTime) {
    try {
      const dateValue = typeof preOrder.scheduledDateTime === 'string'
        ? new Date(preOrder.scheduledDateTime)
        : preOrder.scheduledDateTime;
      if (dateValue instanceof Date && !isNaN(dateValue.getTime())) {
        scheduledDateTime = dateValue.toISOString();
      }
    } catch (error) {
      console.warn('Failed to parse scheduledDateTime:', error);
      scheduledDateTime = null;
    }
  }

  const scheduledDate = preOrder?.scheduledDate || null;
  let scheduledTime = null;
  if (preOrder?.scheduledTime) {
    try {
      const timeMatch = preOrder.scheduledTime.match(/(\d+):(\d+)\s*(a\.m\.|p\.m\.|AM|PM)/i);
      if (timeMatch) {
        let hours = parseInt(timeMatch[1]);
        const minutes = timeMatch[2];
        const meridiem = timeMatch[3].toLowerCase();
        if (meridiem.includes('p') && hours !== 12) {
          hours += 12;
        } else if (meridiem.includes('a') && hours === 12) {
          hours = 0;
        }
        scheduledTime = `${hours.toString().padStart(2, '0')}:${minutes}:00`;
      }
    } catch (error) {
      console.warn('Failed to parse scheduledTime:', error);
      scheduledTime = null;
    }
  }

  // Determine initial status
  let initialStatus = 'preparing';
  if (isPreOrder) {
    initialStatus = 'scheduled';
  }

  // Create order with commission data
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert({
      // SW-78 FO-104: Use frontend-generated ID for offline orders
      ...(orderId && { id: orderId }),
      branch_id: branchId,
      customer_name: customer.name,
      customer_phone: customer.phone,
      customer_email: customer.email || null,
      order_type: orderType,
      payment_method: paymentMethod || 'counter',
      table_number: tableNumber || null,
      zone: zone || null,
      notes: notes || null,
      special_instructions: specialInstructions || null,
      delivery_address: deliveryAddress || null,
      order_status: initialStatus,
      items_subtotal: itemsSubtotal,
      discount_amount: discountAmount,
      delivery_fee: deliveryFee,
      gst_amount: gstAmount,
      qst_amount: qstAmount,
      tip_amount: tipAmount,
      tip_type: tipType,
      tip_value: tipValue,
      total_amount: finalTotal,
      coupon_code: couponCode,
      coupon_id: couponId,
      // Pre-order fields
      is_pre_order: isPreOrder,
      scheduled_datetime: scheduledDateTime,
      scheduled_date: scheduledDate,
      scheduled_time: scheduledTime,
      // Commission fields
      order_source: order_source,
      commission_rate: commission_rate,
      commission_amount: commission_amount,
      net_amount: net_amount,
      commission_status: commission_status || 'pending',
      // Payment tracking - Link to Stripe payment
      payment_intent_id: paymentIntentId || null,
      payment_status: paymentIntentId ? 'succeeded' : 'pending',
      paid_at: paymentIntentId ? new Date().toISOString() : null
    })
    .select()
    .single();

  if (orderError) {
    console.error('Failed to create order with commission:', orderError);
    throw new Error(`Failed to create order: ${orderError.message}`);
  }

  // Create order items (same format as createOrder)
  const orderItems = items.map(item => ({
    order_id: order.id,
    menu_item_name: item.name,
    menu_item_price: item.price,
    quantity: item.quantity,
    item_total: item.price * item.quantity,
    special_instructions: item.notes || null
  }));

  const { data: createdItems, error: itemsError } = await supabase
    .from('order_items')
    .insert(orderItems)
    .select();

  if (itemsError) {
    console.error('Failed to create order items:', itemsError);
    // Clean up the order if items creation failed
    await supabase.from('orders').delete().eq('id', order.id);
    throw new Error(`Failed to create order items: ${itemsError.message}`);
  }

  // SW-78 FO-114: Save removed items for Quebec SRS compliance
  if (removedItems && removedItems.length > 0) {
    const removedItemsData = removedItems.map(removed => ({
      order_id: order.id,
      item_name: removed.item.name,
      item_price: removed.item.price,
      item_id: removed.item.id,
      image_url: removed.item.image_url || null,
      removed_at: removed.removedAt,
      reason: removed.reason,
      original_quantity: removed.originalQuantity,
      removed_quantity: removed.removedQuantity,
      notes: removed.item.notes || null,
      customizations: removed.item.customizations ? JSON.stringify(removed.item.customizations) : null
    }));

    const { error: removedItemsError } = await supabase
      .from('order_removed_items')
      .insert(removedItemsData);

    if (removedItemsError) {
      console.warn('⚠️ Failed to save removed items (non-critical):', removedItemsError.message);
      // Don't fail order creation if removed items logging fails
    } else {
      console.log(`📋 Saved ${removedItems.length} removed item(s) for order ${order.id.substring(0, 8).toUpperCase()}`);
    }
  }

  console.log(`✅ Order created successfully with commission: ${order.id.substring(0, 8).toUpperCase()} - Commission: ${commission_rate}% = $${commission_amount}`);

  // ✉️ Send Order Received Email (async, non-blocking)
  try {
    console.log('📧 [EMAIL] Starting email send process for order:', order.id);
    console.log('📧 [EMAIL] Customer email:', order.customer_email);

    const { sendOrderReceivedEmail } = require('./notification.service');

    // Fetch branch information for email (including settings)
    console.log('📧 [EMAIL] Fetching branch info for:', branchId);
    const { data: branchData, error: branchError } = await supabase
      .from('branches')
      .select('id, name, phone, address, settings')
      .eq('id', branchId)
      .single();

    if (branchError) {
      console.warn('⚠️ [EMAIL] Branch fetch error:', branchError.message);
    } else {
      console.log('📧 [EMAIL] Branch fetched:', branchData?.name);
    }

    // Extract settings from branch data
    const branchSettings = branchData?.settings || {};
    console.log('📧 [EMAIL] Branch settings:', branchSettings);

    // Determine if free delivery was applied
    const itemsSubtotal = parseFloat(order.items_subtotal || 0);
    const discountAmount = parseFloat(order.discount_amount || 0);
    const deliveryFee = parseFloat(order.delivery_fee || 0);
    const subtotalAfterDiscount = itemsSubtotal - discountAmount;
    const freeDeliveryThreshold = branchSettings?.free_delivery_threshold || 0;
    const baseFee = branchSettings?.delivery_fee || 0;
    const isFreeDelivery = deliveryFee === 0 && subtotalAfterDiscount >= freeDeliveryThreshold && freeDeliveryThreshold > 0;

    // Prepare order data with all details for email
    const orderForEmail = {
      ...order,
      order_number: order.id.substring(0, 8).toUpperCase(),
      items: createdItems.map(item => ({
        name: item.menu_item_name,
        quantity: item.quantity,
        price: item.menu_item_price,
      })),
      // Pricing breakdown
      campaign_discount: order.coupon_code ? {
        code: order.coupon_code,
        discount_amount: discountAmount,
        campaign_type: 'percentage',
        campaign_value: 0,
      } : null,
      tip_details: order.tip_amount > 0 ? {
        amount: parseFloat(order.tip_amount),
        type: order.tip_type || 'percentage',
        value: parseFloat(order.tip_value || 0),
      } : null,
      delivery_info: (deliveryFee > 0 || isFreeDelivery) ? {
        is_free: isFreeDelivery,
        base_fee: baseFee,
        applied_fee: deliveryFee,
        threshold: freeDeliveryThreshold,
        savings: isFreeDelivery ? baseFee : 0,
      } : null,
      gst: parseFloat(order.gst_amount || 0),
      qst: parseFloat(order.qst_amount || 0),
      // Branch info
      branch: branchData ? {
        id: branchData.id,
        name: branchData.name,
        phone: branchData.phone,
        address: branchData.address,
      } : null,
    };

    console.log('📧 [EMAIL] Order data prepared, sending email...');

    // Send email asynchronously (don't block order creation)
    sendOrderReceivedEmail(orderForEmail)
      .then((result) => {
        if (result.success) {
          console.log(`✅ [EMAIL] Order confirmation email sent: ${result.data.messageId}`);
        } else {
          console.warn(`⚠️ [EMAIL] Order confirmation email failed: ${result.error}`);
        }
      })
      .catch((error) => {
        console.error('❌ [EMAIL] Error sending order confirmation email:', error.message);
      });
  } catch (error) {
    // Email service not critical - don't fail order creation
    console.error('❌ [EMAIL] Email service error:', error);
    console.warn('⚠️ [EMAIL] Email service unavailable:', error.message);
  }

  // ==================================================================================
  // WEB-SRM TRANSACTION QUEUING (SW-78 FO-106: Quebec SRS Certification)
  // Queue transaction for transmission to Quebec government
  // ==================================================================================
  try {
    const enabled = process.env.WEBSRM_ENABLED === 'true';
    console.log('[WEB-SRM] Enabled:', enabled, 'Env:', process.env.WEBSRM_ENV);

    if (enabled) {
      console.log('[WEB-SRM] Queueing transaction for order:', order.id);

      // Import queue service (JavaScript - no TypeScript dependencies)
      const { queueWebsrmTransaction } = require('./websrm-queue.service');

      // Queue transaction (non-blocking)
      // Best practice: Pass only IDs, let worker fetch full order data
      queueWebsrmTransaction(order.id, branchId)
        .then((result) => {
          console.log('[WEB-SRM] Transaction queued successfully:', result.queueId);
        })
        .catch((error) => {
          console.error('[WEB-SRM] Failed to queue transaction:', error.message);
        });
    } else {
      console.log('[WEB-SRM] Disabled - skipping transaction queue');
    }
  } catch (error) {
    // WebSRM service not critical - don't fail order creation
    console.error('[WEB-SRM] Service error:', error.message);
  }

  return {
    order: {
      id: order.id,
      order_number: `${order.id.substring(0, 8).toUpperCase()}`,
      status: order.order_status,
      total: order.total,
      total_amount: order.total_amount,
      commission: {
        source: order_source,
        rate: commission_rate,
        amount: commission_amount,
        netAmount: net_amount
      },
      createdAt: order.created_at,
      // Pre-order information
      is_pre_order: order.is_pre_order,
      scheduled_datetime: order.scheduled_datetime,
      scheduled_date: order.scheduled_date,
      scheduled_time: order.scheduled_time
    },
    items: createdItems
  };
}

module.exports = {
  getOrders,
  getOrderDetail,
  updateOrderStatus,
  createOrderWithCommission,
  checkAutoAccept,
  checkOrderTimers,
  updateOrderTiming
};