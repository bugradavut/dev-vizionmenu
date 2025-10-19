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
      variants: (item.order_item_variants || []).map(variant => ({
        name: variant.variant_name,
        price: parseFloat(variant.variant_price || 0)
      }))
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
 * Create new order
 * @param {Object} orderData - Order creation data
 * @param {string} branchId - Branch ID
 * @returns {Object} Created order data
 */
async function createOrder(orderData, branchId) {
  const { customer, items, orderType, paymentMethod, source, tableNumber, zone, notes, specialInstructions, deliveryAddress, preOrder, pricing, campaign, tip, commission } = orderData;
  
  // Only allow internal orders for now (third-party will be added in 2 weeks)
  if (!['qr_code', 'web'].includes(source)) {
    throw new Error('Only qr_code and web orders are supported currently');
  }

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
      tipType = tip.type; // 'percentage' or 'fixed'
      tipValue = parseFloat(tip.value || 0);
    }
  } else {
    // Fallback to basic calculation for backward compatibility
    itemsSubtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    discountAmount = 0;
    deliveryFee = 0;
    tipAmount = 0;
    
    // ✅ NEW CANADA TAX RULES: Calculate Quebec tax structure with tip before taxes
    const subtotalWithDelivery = itemsSubtotal - discountAmount + deliveryFee;
    const subtotalWithDeliveryAndTip = subtotalWithDelivery + tipAmount;
    gstAmount = subtotalWithDeliveryAndTip * 0.05; // 5% GST on subtotal + tip
    qstAmount = subtotalWithDeliveryAndTip * 0.09975; // 9.975% QST on subtotal + tip
    finalTotal = subtotalWithDeliveryAndTip + gstAmount + qstAmount;
  }
  
  // Legacy compatibility values
  const subtotal = itemsSubtotal - discountAmount; // After discount for legacy field
  const taxAmount = gstAmount + qstAmount; // Combined tax for legacy field
  const total = finalTotal;

  // Handle pre-order data
  const isPreOrder = preOrder?.isPreOrder || false;
  
  
  // Parse scheduledDateTime properly to avoid timezone issues
  let scheduledDateTime = null;
  if (preOrder?.scheduledDateTime) {
    try {
      // If it's a string, parse it. If it's already a Date, use it
      const dateValue = typeof preOrder.scheduledDateTime === 'string' 
        ? new Date(preOrder.scheduledDateTime) 
        : preOrder.scheduledDateTime;
      
      // Convert to ISO string for PostgreSQL
      if (dateValue instanceof Date && !isNaN(dateValue.getTime())) {
        scheduledDateTime = dateValue.toISOString();
      }
    } catch (error) {
      console.warn('Failed to parse scheduledDateTime:', error);
      scheduledDateTime = null;
    }
  }
  
  const scheduledDate = preOrder?.scheduledDate || null;
  
  // Parse scheduledTime to remove AM/PM and convert to 24-hour format for PostgreSQL
  let scheduledTime = null;
  if (preOrder?.scheduledTime) {
    try {
      // Parse the time string (e.g., "11:30 a.m." or "2:30 p.m.")
      const timeMatch = preOrder.scheduledTime.match(/(\d+):(\d+)\s*(a\.m\.|p\.m\.|AM|PM)/i);
      if (timeMatch) {
        let hours = parseInt(timeMatch[1]);
        const minutes = timeMatch[2];
        const meridiem = timeMatch[3].toLowerCase();
        
        // Convert to 24-hour format
        if (meridiem.includes('p') && hours !== 12) {
          hours += 12;
        } else if (meridiem.includes('a') && hours === 12) {
          hours = 0;
        }
        
        // Format as HH:MM:SS for PostgreSQL TIME type
        scheduledTime = `${hours.toString().padStart(2, '0')}:${minutes}:00`;
      } else {
        console.warn('Could not parse time format:', preOrder.scheduledTime);
        scheduledTime = null;
      }
    } catch (error) {
      console.warn('Failed to parse scheduledTime:', error);
      scheduledTime = null;
    }
  }
  

  // Determine initial status based on order type
  let initialStatus = 'preparing'; // Default for immediate orders
  if (isPreOrder) {
    initialStatus = 'scheduled'; // Pre-orders start as scheduled
  }

  // Create order in database
  const orderDataObj = {
    branch_id: branchId,
    customer_name: customer.name,
    customer_phone: customer.phone,
    customer_email: customer.email || null,
    order_type: orderType,
    table_number: tableNumber || null,
    zone: zone || null,
    delivery_address: deliveryAddress || null,
    order_status: initialStatus, // Dynamic status based on pre-order
    payment_status: 'pending',
    payment_method: paymentMethod || 'counter',
    
    // Legacy pricing fields (maintained for backward compatibility)
    subtotal: subtotal,
    tax_amount: taxAmount,
    total_amount: total,
    
    // NEW: Comprehensive pricing breakdown
    items_subtotal: itemsSubtotal,
    discount_amount: discountAmount,
    coupon_code: couponCode,
    coupon_id: couponId,
    delivery_fee: deliveryFee,
    gst_amount: gstAmount,
    qst_amount: qstAmount,
    tip_amount: tipAmount,
    tip_type: tipType,
    tip_value: tipValue,
    
    notes: notes || null,
    special_instructions: specialInstructions || null,
    third_party_platform: ['qr_code', 'web'].includes(source) ? null : source, // Internal orders don't set platform
    // Pre-order fields
    is_pre_order: isPreOrder,
    scheduled_datetime: scheduledDateTime,
    scheduled_date: scheduledDate,
    scheduled_time: scheduledTime,
    
    // Commission fields
    order_source: commission?.orderSource || null,
    commission_rate: commission?.commissionRate || 0,
    commission_amount: commission?.commissionAmount || 0,
    net_amount: commission?.netAmount || total,
    commission_status: 'pending',
    
    created_at: new Date().toISOString()
  };


  const { data: createdOrder, error: createError } = await supabase
    .from('orders')
    .insert(orderDataObj)
    .select()
    .single();

  if (createError) {
    console.error('Order creation error:', createError);
    throw new Error('Failed to create order');
  }

  // Create order items
  const orderItems = items.map(item => ({
    order_id: createdOrder.id,
    menu_item_name: item.name,
    menu_item_price: item.price,
    quantity: item.quantity,
    item_total: item.price * item.quantity,
    special_instructions: item.special_instructions || null
  }));

  const { error: itemsError } = await supabase
    .from('order_items')
    .insert(orderItems);

  if (itemsError) {
    console.error('Order items creation error:', itemsError);
    // Rollback order creation
    await supabase.from('orders').delete().eq('id', createdOrder.id);
    throw new Error('Failed to create order items');
  }

  // Record coupon usage if coupon was applied (with multi-tenant security)
  if (couponId && discountAmount > 0) {
    
    // SECURITY: Verify coupon belongs to the same branch as the order
    const { data: couponBranch, error: couponError } = await supabase
      .from('coupons')
      .select('branch_id')
      .eq('id', couponId)
      .single();

    if (couponError || !couponBranch || couponBranch.branch_id !== branchId) {
      console.error('Multi-tenant security violation: Coupon does not belong to order branch', {
        couponId,
        orderId: createdOrder.id,
        orderBranch: branchId,
        couponBranch: couponBranch?.branch_id
      });
      // Don't record usage for security violation
    } else {
      // Safe to record usage - coupon and order are from same branch
      const { error: usageError } = await supabase
        .from('coupon_usages')
        .insert({
          coupon_id: couponId,
          order_id: createdOrder.id,
          discount_amount: discountAmount
        });

      if (usageError) {
        console.error('Coupon usage recording error:', usageError);
        // Don't rollback order - coupon usage is supplementary data
      } else {
        console.log('Coupon usage recorded successfully');
      }
    }
  }

  // WEB-SRM Dry-Run Integration (Phase 3)
  // Only runs in DEV when flag is enabled, does NOT affect production
  try {
    const { isWebSrmDryRunEnabled } = require('../../utils/featureFlags');
    if (isWebSrmDryRunEnabled()) {
      const { emitWebsrmDryRun } = require('../../services/websrm-adapter/dryrun-adapter');

      // Attach items to order for dry-run adapter
      const orderWithItems = { ...createdOrder, items: orderItems };

      // Emit dry-run output asynchronously (don't block order creation)
      emitWebsrmDryRun(orderWithItems)
        .then((result) => {
          if (result.hash !== 'skipped-no-items') {
            console.info('[WEB-SRM DRYRUN]', createdOrder.id, 'hash:', result.hash, 'files:', result.files.length);
          }
        })
        .catch((error) => {
          console.warn('[WEB-SRM DRYRUN] failed:', createdOrder.id, error.message);
        });
    }
  } catch (error) {
    // Silently fail if WEB-SRM adapter is not available
    // This ensures backward compatibility and doesn't break existing functionality
    console.debug('[WEB-SRM DRYRUN] adapter not available:', error.message);
  }

  // WEB-SRM Runtime Integration (Phase 6 - Refactored)
  // Profile-based configuration, production-blocked, local persist only (NO network)
  try {
    const enabled = process.env.WEBSRM_ENABLED === 'true' && process.env.NODE_ENV !== 'production';
    if (enabled) {
      const { handleOrderForWebSrm } = require('../../services/websrm-adapter/runtime-adapter');
      const { resolveProfile } = require('../../services/websrm-adapter/profile-resolver');

      const orderWithItems = Array.isArray(createdOrder.items)
        ? createdOrder
        : { ...createdOrder, items: orderItems || [] };

      // Resolve profile for tenant/branch/device
      resolveProfile(
        createdOrder.tenant_id,
        createdOrder.branch_id,
        createdOrder.device_id // If stored in order
      )
        .then((profile) => handleOrderForWebSrm(orderWithItems, profile, {
          persist: process.env.WEBSRM_PERSIST || 'files',
        }))
        .then(() => console.info('[WEB-SRM] persisted', createdOrder.id))
        .catch((e) => console.warn('[WEB-SRM] persist failed', createdOrder.id, e.message));
    }
  } catch (error) {
    console.debug('[WEB-SRM] runtime adapter not available:', error.message);
  }

  return {
    order: {
      id: createdOrder.id,
      order_number: `${createdOrder.id.substring(0, 8).toUpperCase()}`,
      status: createdOrder.order_status,
      total: total,
      createdAt: createdOrder.created_at,
      // NEW: Pre-order information
      is_pre_order: createdOrder.is_pre_order,
      scheduled_datetime: createdOrder.scheduled_datetime,
      scheduled_date: createdOrder.scheduled_date,
      scheduled_time: createdOrder.scheduled_time
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
    customer,
    items,
    orderType,
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
    paymentIntentId
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

  // Generate unique order number
  const orderNumber = `ORD-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substr(2, 3).toUpperCase()}`;

  // Create order with commission data
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert({
      branch_id: branchId,
      customer_name: customer.name,
      customer_phone: customer.phone,
      customer_email: customer.email || null,
      order_type: orderType,
      table_number: tableNumber || null,
      zone: zone || null,
      notes: notes || null,
      special_instructions: specialInstructions || null,
      delivery_address: deliveryAddress || null,
      order_number: orderNumber,
      order_source: source,
      order_status: 'pending',
      items_subtotal: itemsSubtotal,
      discount_amount: discountAmount,
      delivery_fee: deliveryFee,
      gst_amount: gstAmount,
      qst_amount: qstAmount,
      tip_amount: tipAmount,
      tip_type: tipType,
      tip_value: tipValue,
      total: finalTotal,
      coupon_code: couponCode,
      coupon_id: couponId,
      is_pre_order: preOrder?.isPreOrder || false,
      scheduled_for: preOrder?.scheduledTime || null,
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

  // Create order items
  const orderItems = items.map(item => ({
    order_id: order.id,
    menu_item_id: item.menuItemId,
    quantity: item.quantity,
    unit_price: parseFloat(item.price),
    item_total: parseFloat(item.price) * parseInt(item.quantity),
    variations: item.variations || null,
    special_instructions: item.specialInstructions || null
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

  console.log(`✅ Order created successfully with commission: ${orderNumber} (${order.id}) - Commission: ${commission_rate}% = $${commission_amount}`);

  return {
    order: {
      id: order.id,
      orderNumber: order.order_number,
      status: order.order_status,
      total: order.total,
      commission: {
        source: order_source,
        rate: commission_rate,
        amount: commission_amount,
        netAmount: net_amount
      },
      createdAt: order.created_at
    },
    items: createdItems
  };
}

module.exports = {
  getOrders,
  getOrderDetail,
  updateOrderStatus,
  createOrder,
  createOrderWithCommission,
  checkAutoAccept,
  checkOrderTimers,
  updateOrderTiming
};