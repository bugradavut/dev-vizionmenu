// =====================================================
// ORDERS CONTROLLER
// Order management operations (CRUD, status updates, auto-accept)
// =====================================================

const ordersService = require('../services/orders.service');
const { handleControllerError } = require('../helpers/error-handler');

/**
 * GET /api/v1/orders
 * List branch orders with filtering and pagination
 */
const getOrders = async (req, res) => {
  try {
    const filters = req.query;
    const userBranch = req.userBranch;

    const result = await ordersService.getOrders(filters, userBranch);
    res.json(result);
    
  } catch (error) {
    handleControllerError(error, 'fetch orders', res);
  }
};

/**
 * GET /api/v1/orders/:orderId
 * Get detailed order information including items and variants
 */
const getOrderDetail = async (req, res) => {
  try {
    const { orderId } = req.params;
    
    if (!orderId) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'Order ID is required' }
      });
    }

    const userBranch = req.userBranch;
    const formattedOrder = await ordersService.getOrderDetail(orderId, userBranch);

    res.json({ data: formattedOrder });
    
  } catch (error) {
    handleControllerError(error, 'fetch order details', res);
  }
};

/**
 * PATCH /api/v1/orders/:orderId/status
 * Update order status with optional notes and timing
 */
const updateOrderStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status, notes, estimated_ready_time } = req.body;
    
    // Validation
    if (!orderId) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'Order ID is required' }
      });
    }
    
    const validStatuses = ['pending', 'preparing', 'ready', 'completed', 'cancelled', 'rejected'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        error: { 
          code: 'VALIDATION_ERROR', 
          message: `Invalid status. Must be one of: ${validStatuses.join(', ')}` 
        }
      });
    }

    const currentUserId = req.currentUserId;
    const userBranch = req.userBranch;

    // Use order service to update order status
    const updateData = { status, notes, estimated_ready_time };
    const result = await ordersService.updateOrderStatus(orderId, updateData, userBranch);

    // Success response optimized for mobile
    res.json({ data: result });
    
  } catch (error) {
    console.error('Update order status endpoint error:', error);
    
    // Handle specific errors from service
    if (error.message === 'Order not found or access denied') {
      return res.status(404).json({
        error: { code: 'ORDER_NOT_FOUND', message: 'Order not found or access denied' }
      });
    }
    
    if (error.message.startsWith('Invalid status') || error.message.includes('Must be one of')) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: error.message }
      });
    }
    
    if (error.message.startsWith('Failed to update order')) {
      return res.status(400).json({
        error: { code: 'UPDATE_FAILED', message: error.message }
      });
    }
    
    res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'Failed to update order status' }
    });
  }
};

/**
 * POST /api/v1/orders/auto-accept-check
 * Check if new orders should be auto-accepted based on branch settings
 */
const checkAutoAccept = async (req, res) => {
  try {
    const { orderId, branchId } = req.body;
    
    // Validation
    if (!orderId || !branchId) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'orderId and branchId are required' }
      });
    }

    // Use order service for auto-accept check
    const result = await ordersService.checkAutoAccept(orderId, branchId);

    res.json({ data: result });

  } catch (error) {
    console.error('Auto-accept check endpoint error:', error);
    
    // Handle specific errors from service
    if (error.message === 'Order not found') {
      return res.status(404).json({
        error: { code: 'ORDER_NOT_FOUND', message: 'Order not found' }
      });
    }
    
    if (error.message === 'Branch not found') {
      return res.status(404).json({
        error: { code: 'BRANCH_NOT_FOUND', message: 'Branch not found' }
      });
    }
    
    if (error.message === 'Failed to auto-accept order') {
      return res.status(500).json({
        error: { code: 'UPDATE_FAILED', message: 'Failed to auto-accept order' }
      });
    }
    
    res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'Failed to check auto-accept' }
    });
  }
};

/**
 * POST /api/v1/orders
 * Create a new order (for internal orders: QR code, web)
 */
const createOrder = async (req, res) => {
  try {
    const { customer, items, orderType, source, tableNumber, notes, specialInstructions } = req.body;
    
    // Validation
    if (!customer || !items || !orderType || !source) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'customer, items, orderType, and source are required' }
      });
    }

    // Only allow internal orders for now (third-party will be added in 2 weeks)
    if (!['qr_code', 'web'].includes(source)) {
      return res.status(400).json({
        error: { code: 'INVALID_SOURCE', message: 'Only qr_code and web orders are supported currently' }
      });
    }

    // Get user/branch context
    const currentUserId = req.currentUserId;
    const userBranch = req.userBranch;
    let branchId = req.body.branchId; // allow explicit branch for public orders

    // Development mode or authenticated user context
    if (currentUserId && userBranch) {
      branchId = userBranch.branch_id;
    } else if (!branchId) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'branchId is required for unauthenticated orders' }
      });
    }

    // Use order service to create order
    const orderData = { customer, items, orderType, source, tableNumber, notes, specialInstructions };
    const createResult = await ordersService.createOrder(orderData, branchId);

    // Trigger auto-accept check for Simplified Flow
    let autoAcceptResult = null;
    try {
      // Use order service for auto-accept check instead of internal HTTP call
      autoAcceptResult = await ordersService.checkAutoAccept(createResult.order.id, branchId);
    } catch (error) {
      console.error('Auto-accept check failed:', error);
      // Don't fail the order creation, just log the error
    }

    // Success response
    res.status(201).json({
      data: {
        order: {
          id: createResult.order.id,
          orderNumber: createResult.order.orderNumber,
          status: autoAcceptResult?.status || createResult.order.status,
          total: createResult.order.total,
          createdAt: createResult.order.createdAt
        },
        autoAccepted: autoAcceptResult?.autoAccepted || false,
        autoAcceptMessage: autoAcceptResult?.message || null
      }
    });

  } catch (error) {
    console.error('Create order endpoint error:', error);
    
    // Handle specific errors from service
    if (error.message === 'Only qr_code and web orders are supported currently') {
      return res.status(400).json({
        error: { code: 'INVALID_SOURCE', message: error.message }
      });
    }
    
    if (error.message === 'Failed to create order' || error.message === 'Failed to create order items') {
      return res.status(500).json({
        error: { code: 'CREATE_FAILED', message: error.message }
      });
    }
    
    res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'Failed to create order' }
    });
  }
};

/**
 * POST /api/v1/orders/timer-check
 * Check and auto-advance orders from 'preparing' to 'ready' based on timing settings
 */
const checkOrderTimers = async (req, res) => {
  try {
    const { branchId } = req.body;
    
    // Validation
    if (!branchId) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'branchId is required' }
      });
    }

    // Use order service for timer check
    const result = await ordersService.checkOrderTimers(branchId);

    res.json({ data: result });

  } catch (error) {
    console.error('Timer check endpoint error:', error);
    
    // Handle specific errors from service
    if (error.message === 'Branch not found') {
      return res.status(404).json({
        error: { code: 'BRANCH_NOT_FOUND', message: 'Branch not found' }
      });
    }
    
    if (error.message === 'Failed to fetch preparing orders') {
      return res.status(500).json({
        error: { code: 'FETCH_FAILED', message: 'Failed to fetch preparing orders' }
      });
    }
    
    res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'Failed to process timer check' }
    });
  }
};

module.exports = {
  getOrders,
  getOrderDetail,
  updateOrderStatus,
  checkAutoAccept,
  createOrder,
  checkOrderTimers
};