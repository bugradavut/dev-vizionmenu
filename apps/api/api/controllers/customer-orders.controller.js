// =====================================================
// CUSTOMER ORDERS CONTROLLER
// Public customer order operations (no authentication required)
// =====================================================

const ordersService = require('../services/orders.service');
const { handleControllerError } = require('../helpers/error-handler');

/**
 * POST /api/v1/customer/orders
 * Create customer order (QR code or web orders)
 */
const createCustomerOrder = async (req, res) => {
  try {
    const { 
      branchId,
      items, 
      orderType,
      source,
      paymentMethod,
      customerInfo,
      tableNumber,
      zone,
      subtotal,
      tax,
      total,
      notes 
    } = req.body;
    
    // Minimal validation - just ensure basic data exists
    if (!branchId) branchId = '550e8400-e29b-41d4-a716-446655440002' // Default branch
    if (!items || !Array.isArray(items)) items = []
    if (!orderType) orderType = 'takeaway'
    if (!source) source = 'web'
    if (!paymentMethod) paymentMethod = 'cash'

    // Prepare customer object with defaults
    let customer;
    if (source === 'qr') {
      customer = {
        name: `Table ${tableNumber || 1}${zone ? ` - ${zone}` : ''}`,
        phone: `table-${tableNumber || 1}`,
        email: `table${tableNumber || 1}@dinein.local`
      };
    } else {
      customer = {
        name: customerInfo?.name?.trim() || 'Customer',
        phone: customerInfo?.phone?.trim() || '0000000000',
        email: customerInfo?.email?.trim() || 'customer@example.com'
      };
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
      source: source === 'qr' ? 'qr_code' : 'web',
      tableNumber: source === 'qr' ? tableNumber : undefined,
      notes: `Payment: ${paymentMethod === 'cash' ? 'Pay at Counter' : 'Online Payment'}${notes ? ` | ${notes}` : ''}`,
      specialInstructions: '',
      pricing: {
        subtotal: subtotal || 0,
        tax_amount: tax || 0,
        total: total || 0
      }
    };

    // Create order using existing orders service
    const createResult = await ordersService.createOrder(orderData, branchId);

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
        estimatedTime: '20-30 minutes',
        message: `Order placed successfully! ${source === 'qr' ? `Table ${tableNumber}` : 'Takeaway order'}`
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

    // Return public information including order items for confirmation page
    res.json({ 
      data: {
        orderId: order.id,
        orderNumber: order.order_number,
        status: order.order_status,
        estimatedTime: order.estimated_completion_time,
        createdAt: order.created_at,
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
        }
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