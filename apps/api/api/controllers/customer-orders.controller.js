// =====================================================
// CUSTOMER ORDERS CONTROLLER
// Public customer order operations (no authentication required)
// =====================================================

const ordersService = require('../services/orders.service');
const branchesService = require('../services/branches.service');
const { handleControllerError } = require('../helpers/error-handler');

/**
 * Calculate estimated time based on order type and branch timing settings
 * @param {string} orderType - 'takeaway', 'dine_in', or 'delivery'
 * @param {Object} timingSettings - Branch timing configuration
 * @returns {string} Estimated time string (e.g., "20 minutes")
 */
function calculateEstimatedTime(orderType, timingSettings, individualAdjustment = 0) {
  const baseKitchenTime = (timingSettings.baseDelay || 20) + (timingSettings.temporaryBaseDelay || 0);
  const adjustedKitchenTime = baseKitchenTime + individualAdjustment;
  
  if (orderType === 'takeaway' || orderType === 'dine_in') {
    // Takeaway/Dine-in: Only kitchen preparation time + individual adjustment
    const totalTime = Math.max(5, adjustedKitchenTime);
    return `${totalTime} minutes`;
  } else if (orderType === 'delivery') {
    // Delivery: Kitchen + delivery time (individual adjustment only affects kitchen time)
    const deliveryTime = (timingSettings.deliveryDelay || 15) + (timingSettings.temporaryDeliveryDelay || 0);
    const totalTime = Math.max(10, adjustedKitchenTime + deliveryTime);
    return `${totalTime} minutes`;
  } else {
    // Fallback for unknown order types
    return '20 minutes';
  }
}

/**
 * POST /api/v1/customer/orders
 * Create customer order (QR code or web orders)
 */
const createCustomerOrder = async (req, res) => {
  try {
    let {
      branchId,
      items,
      orderType = "takeaway",
      source = "web",
      paymentMethod = "cash",
      customerInfo,
      tableNumber,
      zone,
      subtotal,
      tax,
      total,
      notes,
      deliveryAddress,
      isPreOrder,
      scheduledDate,
      scheduledTime,
      scheduledDateTime,
      pricing,
      campaign,
      tip,
      commission,
      paymentIntentId
    } = req.body;

    if (!branchId) {
      return res.status(400).json({
        error: { code: "VALIDATION_ERROR", message: "branchId is required" }
      });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        error: { code: "VALIDATION_ERROR", message: "Order items are required" }
      });
    }

    if (!['counter', 'online'].includes(paymentMethod)) {
      paymentMethod = 'counter';
    }

    const sanitizedCustomerInfo = {
      name: customerInfo?.name?.toString().trim(),
      phone: customerInfo?.phone?.toString().trim(),
      email: customerInfo?.email?.toString().trim()
    };

    let customer;
    if (source === 'qr') {
      customer = {
        name: sanitizedCustomerInfo.name || `Table ${tableNumber || 1}${zone ? ` - ${zone}` : ''}`,
        phone: sanitizedCustomerInfo.phone || `table-${tableNumber || 1}`,
        email: sanitizedCustomerInfo.email || `table${tableNumber || 1}@dinein.local`
      };
    } else {
      if (!sanitizedCustomerInfo.name || !sanitizedCustomerInfo.phone || !sanitizedCustomerInfo.email) {
        return res.status(400).json({
          error: { code: 'VALIDATION_ERROR', message: 'Customer name, phone, and email are required' }
        });
      }

      customer = sanitizedCustomerInfo;
    }

    let normalizedDeliveryAddress = null;
    if (orderType === 'delivery') {
      const streetAddress = deliveryAddress?.streetAddress?.toString().trim();
      const city = deliveryAddress?.city?.toString().trim();
      const province = deliveryAddress?.province?.toString().trim();
      const postalCode = deliveryAddress?.postalCode?.toString().trim();

      if (!streetAddress || !city || !province || !postalCode) {
        return res.status(400).json({
          error: { code: 'VALIDATION_ERROR', message: 'Delivery address is required for delivery orders' }
        });
      }

      normalizedDeliveryAddress = {
        street: streetAddress,
        city,
        province,
        postalCode,
        unitNumber: deliveryAddress?.unitNumber?.toString().trim() || '',
        buzzerCode: deliveryAddress?.buzzerCode?.toString().trim() || '',
        deliveryInstructions: deliveryAddress?.deliveryInstructions?.toString().trim() || '',
        addressType: deliveryAddress?.addressType || 'home'
      };
    }

    // Parse scheduled datetime if provided
    let parsedScheduledDateTime = null;
    if (isPreOrder && scheduledDateTime) {
      parsedScheduledDateTime = new Date(scheduledDateTime);
    }

    // Prepare order data for internal service
    const orderData = {
      customer,
      items: items.map(item => ({
        id: item.id,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        notes: item.notes || ''
      })),
      orderType,
      paymentMethod,
      source: source === 'qr' ? 'qr_code' : 'web',
      tableNumber: source === 'qr' ? tableNumber : undefined,
      zone: source === 'qr' ? zone : undefined,
      notes: notes || '',
      specialInstructions: '',
      deliveryAddress: orderType === 'delivery' && deliveryAddress ? {
        street: deliveryAddress.streetAddress || '',
        city: deliveryAddress.city || '',
        province: deliveryAddress.province || '',
        postalCode: deliveryAddress.postalCode || '',
        unitNumber: deliveryAddress.unitNumber || '',
        buzzerCode: deliveryAddress.buzzerCode || '',
        deliveryInstructions: deliveryAddress.deliveryInstructions || '',
        addressType: deliveryAddress.addressType || 'home'
      } : null,

      // Pre-order data
      preOrder: {
        isPreOrder: Boolean(isPreOrder),
        scheduledDate: scheduledDate || null,
        scheduledTime: scheduledTime || null,
        scheduledDateTime: parsedScheduledDateTime
      },

      // NEW: Comprehensive pricing breakdown (Phase 1)
      pricing: pricing ? {
        itemsTotal: pricing.itemsTotal || 0,
        discountAmount: pricing.discountAmount || 0,
        deliveryFee: pricing.deliveryFee || 0,
        gst: pricing.gst || 0,
        qst: pricing.qst || 0,
        tipAmount: pricing.tipAmount || 0,
        finalTotal: pricing.finalTotal || 0
      } : undefined,

      // Campaign/discount details
      campaign: campaign ? {
        id: campaign.id || undefined,
        code: campaign.code,
        discountAmount: campaign.discountAmount || 0,
        campaignType: campaign.campaignType,
        campaignValue: campaign.campaignValue || 0
      } : undefined,

      // Tip details
      tip: tip ? {
        amount: tip.amount || 0,
        type: tip.type,
        value: tip.value || 0
      } : undefined,

      // Commission data - flatten for createOrderWithCommission
      order_source: commission?.orderSource,
      commission_rate: commission?.commissionRate,
      commission_amount: commission?.commissionAmount,
      net_amount: commission?.netAmount,
      commission_status: 'pending',

      // Payment tracking - Stripe payment intent
      paymentIntentId: paymentIntentId || null
    };

    // Create order using commission service (supports payment tracking)
    const createResult = await ordersService.createOrderWithCommission(orderData, branchId);

    // Get branch timing settings for estimated time calculation
    let estimatedTime = '20 minutes'; // Default fallback
    try {
      const branchSettings = await branchesService.getBranchSettings(branchId);
      const timingSettings = branchSettings.settings?.timingSettings || {};
      // New orders don't have individual adjustments yet, so pass 0
      estimatedTime = calculateEstimatedTime(orderType, timingSettings, 0);
    } catch (timingError) {
      console.warn('Failed to get branch timing settings, using default:', timingError.message);
    }

    // Trigger auto-accept check for Simplified Flow
    try {
      await ordersService.checkAutoAccept(createResult.order.id, branchId);
    } catch (autoAcceptError) {
      console.warn('Auto-accept check failed:', autoAcceptError.message);
      // Don't fail the order creation if auto-accept fails
    }

    res.status(201).json({ 
      data: {
        orderId: createResult.order.id,
        orderNumber: createResult.order.order_number,
        status: createResult.order.status,
        total: createResult.order.total_amount,
        estimatedTime: estimatedTime,
        isPreOrder: Boolean(isPreOrder),
        scheduledDateTime: parsedScheduledDateTime,
        message: isPreOrder 
          ? `Pre-order scheduled successfully for ${scheduledDate} at ${scheduledTime}!`
          : `Order placed successfully! ${source === 'qr' ? `Table ${tableNumber}` : 'Takeaway order'}`
      }
    });
    
  } catch (error) {
    handleControllerError(error, 'create customer order', res);
  }
};

/**
 * GET /api/v1/customer/orders/:orderId/status
 * Get order status for customer tracking
 */
const getOrderStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    
    if (!orderId) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'Order ID is required' }
      });
    }

    // Get order details without authentication (public endpoint)
    const order = await ordersService.getOrderDetail(orderId, null);

    // Check if order is expired (completed orders older than 10 minutes)
    const isOrderExpired = (order) => {
      const currentStatus = order.status || order.order_status;
      if (currentStatus !== 'completed') return false;
      
      const completedAt = order.completed_at || order.updated_at;
      if (!completedAt) return false;
      
      const completionTime = new Date(completedAt);
      const expirationTime = new Date(completionTime.getTime() + 10 * 60 * 1000); // +10 minutes
      return new Date() > expirationTime;
    };

    // Return 404 for expired completed orders
    if (isOrderExpired(order)) {
      return res.status(404).json({
        error: { 
          code: 'ORDER_EXPIRED', 
          message: 'Order confirmation link has expired' 
        }
      });
    }

    // Get branch timing settings for estimated time calculation
    let estimatedTime = null;
    try {
      // Extract branch_id from order (try multiple possible field names)
      const branchId = order.branch_id || req.params.branchId;
      const orderType = order.order_type || order.orderType || 'takeaway';
      const individualAdjustment = order.individual_timing_adjustment || 0;
      
      if (branchId) {
        const branchSettings = await branchesService.getBranchSettings(branchId);
        const timingSettings = branchSettings.settings?.timingSettings || {};
        estimatedTime = calculateEstimatedTime(orderType, timingSettings, individualAdjustment);
      } else {
        // Fallback estimated time
        estimatedTime = orderType === 'delivery' ? '35 minutes' : '20 minutes';
      }
    } catch (timingError) {
      console.warn('Failed to calculate estimated time for order status:', timingError.message);
      // Fallback estimated time
      const orderType = order.order_type || order.orderType || 'takeaway';
      estimatedTime = orderType === 'delivery' ? '35 minutes' : '20 minutes';
    }

    // Get branch information for display
    let branchInfo = null;
    try {
      if (order.branch_id) {
        const branch = await branchesService.getBranchById(order.branch_id);
        if (branch) {
          branchInfo = {
            id: branch.id,
            name: branch.name,
            address: branch.address || 'Address not available'
          };
        }
      }
    } catch (branchError) {
      console.warn('Failed to load branch info for order:', branchError.message);
    }


    // Return public information including order items for confirmation page
    res.json({
      data: {
        orderId: order.id,
        orderNumber: order.orderNumber || order.id.split('-')[0].toUpperCase(),
        status: order.status || order.order_status,
        estimatedTime: estimatedTime,
        createdAt: order.created_at,
        completedAt: order.completed_at, // Add completion time for expiration logic
        // NEW: Pre-order information
        isPreOrder: Boolean(order.is_pre_order),
        scheduledDateTime: order.scheduled_datetime,
        scheduledDate: order.scheduled_date,
        scheduledTime: order.scheduled_time,
        // Include order items and pricing for confirmation page
        items: (order.order_items || []).map(item => ({
          id: item.id,
          name: item.menu_item_name,
          price: parseFloat(item.menu_item_price || 0),
          quantity: item.quantity || 1,
          total: parseFloat(item.item_total || 0),
          image_url: item.image_url || null,
          description: item.description || ''
        })),
        pricing: {
          subtotal: parseFloat(order.subtotal || 0),
          taxAmount: parseFloat(order.tax_amount || 0),
          total: parseFloat(order.total_amount || 0)
        },
        branch: branchInfo,
        // Uber Direct tracking URL for delivery orders
        uberTrackingUrl: order.uber_tracking_url || null
      }
    });
    
  } catch (error) {
    if (error.message.includes('not found')) {
      return res.status(404).json({
        error: { code: 'ORDER_NOT_FOUND', message: 'Order not found' }
      });
    }
    handleControllerError(error, 'get order status', res);
  }
};

module.exports = {
  createCustomerOrder,
  getOrderStatus
};

