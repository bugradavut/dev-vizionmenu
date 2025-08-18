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
      customerInfo,
      tableNumber,
      zone,
      subtotal,
      tax,
      total,
      notes 
    } = req.body;
    
    // Validation
    if (!branchId || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        error: { 
          code: 'VALIDATION_ERROR', 
          message: 'branchId and items array are required' 
        }
      });
    }

    if (!orderType || !['dine_in', 'takeaway'].includes(orderType)) {
      return res.status(400).json({
        error: { 
          code: 'VALIDATION_ERROR', 
          message: 'orderType must be either dine_in or takeaway' 
        }
      });
    }

    if (!source || !['qr', 'web'].includes(source)) {
      return res.status(400).json({
        error: { 
          code: 'VALIDATION_ERROR', 
          message: 'source must be either qr or web' 
        }
      });
    }

    // QR orders must have table number
    if (source === 'qr' && (!tableNumber || tableNumber <= 0)) {
      return res.status(400).json({
        error: { 
          code: 'VALIDATION_ERROR', 
          message: 'Table number is required for QR orders' 
        }
      });
    }

    // Web orders must have customer info
    if (source === 'web' && (!customerInfo || !customerInfo.name || !customerInfo.phone)) {
      return res.status(400).json({
        error: { 
          code: 'VALIDATION_ERROR', 
          message: 'Customer name and phone are required for web orders' 
        }
      });
    }

    // Validate items
    for (const item of items) {
      if (!item.id || !item.name || !item.price || !item.quantity) {
        return res.status(400).json({
          error: { 
            code: 'VALIDATION_ERROR', 
            message: 'Each item must have id, name, price, and quantity' 
          }
        });
      }
      
      if (item.quantity <= 0 || item.price <= 0) {
        return res.status(400).json({
          error: { 
            code: 'VALIDATION_ERROR', 
            message: 'Item quantity and price must be greater than 0' 
          }
        });
      }
    }

    // Prepare customer object for internal API
    let customer;
    if (source === 'qr') {
      customer = {
        name: `Table ${tableNumber}${zone ? ` - ${zone}` : ''}`,
        phone: `table-${tableNumber}`,
        email: `table${tableNumber}@dinein.local`
      };
    } else {
      customer = {
        name: customerInfo.name.trim(),
        phone: customerInfo.phone.trim(),
        email: customerInfo.email?.trim() || `${customerInfo.phone}@customer.local`
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
      notes: notes || '',
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

    // Return limited public information
    res.json({ 
      data: {
        orderId: order.id,
        orderNumber: order.order_number,
        status: order.status,
        estimatedTime: order.estimated_completion_time,
        createdAt: order.created_at
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