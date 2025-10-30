// =====================================================
// ORDERS CONTROLLER
// Order management operations (CRUD, status updates, auto-accept)
// =====================================================

const ordersService = require('../services/orders.service');
const commissionService = require('../services/commission.service');
const orderSourceService = require('../services/order-source.service');
const { handleControllerError } = require('../helpers/error-handler');
const { logActivity } = require('../helpers/audit-logger');

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

    // Audit log: order status update
    await logActivity({
      req,
      action: 'update',
      entity: 'order_status',
      entityId: orderId,
      entityName: undefined,
      branchId: userBranch?.branch_id,
      changes: updateData
    })

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
 * Create a new order (for internal orders: QR code, web) with commission calculation
 */
const createOrder = async (req, res) => {
  try {
    const { orderId, customer, items, orderType, source, tableNumber, notes, specialInstructions, total, pricing, paymentMethod, tip } = req.body;
    
    // Validation
    if (!customer || !items || !orderType || !source) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'customer, items, orderType, and source are required' }
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

    // COMMISSION ENGINE INTEGRATION
    // 1. DETECT ORDER SOURCE
    const orderSource = orderSourceService.detectOrderSource(req);
    
    if (!orderSourceService.isValidSource(orderSource)) {
      return res.status(400).json({
        error: { 
          code: 'INVALID_ORDER_SOURCE', 
          message: `Invalid order source detected: ${orderSource}` 
        }
      });
    }

    // 2. CALCULATE COMMISSION (use total from request or calculate from items)
    let orderTotal = total;
    if (!orderTotal) {
      // Calculate total from items if not provided
      orderTotal = items.reduce((sum, item) => {
        return sum + (item.price * item.quantity);
      }, 0);
    }

    const commission = await commissionService.calculateCommission(
      orderTotal,
      branchId,
      orderSource
    );

    // 3. CREATE ORDER WITH COMMISSION DATA
    const orderData = {
      orderId, // SW-78 FO-104: Use frontend-generated ID for offline orders
      customer,
      items,
      orderType,
      source,
      tableNumber,
      notes,
      specialInstructions,
      // Add commission fields
      order_source: orderSource,
      commission_rate: commission.rate,
      commission_amount: commission.commissionAmount,
      net_amount: commission.netAmount,
      commission_status: 'pending',
      // SW-78 FO-104: Add pricing data for offline orders
      pricing,
      paymentMethod,
      tip
    };
    
    const createResult = await ordersService.createOrderWithCommission(orderData, branchId);

    // 4. LOG COMMISSION TRANSACTION
    try {
      await commissionService.logCommissionTransaction({
        orderId: createResult.order.id,
        branchId: branchId,
        commissionRate: commission.rate,
        orderTotal: orderTotal,
        commissionAmount: commission.commissionAmount,
        netAmount: commission.netAmount,
        sourceType: orderSource
      });
    } catch (commissionError) {
      console.error('Failed to log commission transaction:', commissionError);
      // Don't fail the order creation, just log the error
    }

    // 5. AUTO-ACCEPT CHECK (existing logic)
    let autoAcceptResult = null;
    try {
      autoAcceptResult = await ordersService.checkAutoAccept(createResult.order.id, branchId);
    } catch (error) {
      console.error('Auto-accept check failed:', error);
      // Don't fail the order creation, just log the error
    }

    // Success response with commission data
    res.status(201).json({
      data: {
        order: {
          id: createResult.order.id,
          orderNumber: createResult.order.orderNumber,
          status: autoAcceptResult?.status || createResult.order.status,
          total: orderTotal,
          createdAt: createResult.order.createdAt,
          // Commission information (internal use)
          orderSource: orderSource,
          commissionRate: commission.rate,
          commissionAmount: commission.commissionAmount,
          netAmount: commission.netAmount
        },
        autoAccepted: autoAcceptResult?.autoAccepted || false,
        autoAcceptMessage: autoAcceptResult?.message || null,
        commission: {
          source: orderSource,
          rate: commission.rate,
          amount: commission.commissionAmount,
          netToRestaurant: commission.netAmount
        }
      }
    });

  } catch (error) {
    console.error('Create order with commission endpoint error:', error);
    
    // Handle commission-specific errors
    if (error.message.includes('Commission calculation failed')) {
      return res.status(500).json({
        error: { code: 'COMMISSION_ERROR', message: 'Failed to calculate commission' }
      });
    }
    
    // Handle existing errors
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

/**
 * PATCH /api/v1/orders/:orderId/timing
 * Update individual timing adjustment for an order
 */
const updateOrderTiming = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { adjustmentMinutes } = req.body;
    
    // Validation
    if (!orderId) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'Order ID is required' }
      });
    }
    
    if (typeof adjustmentMinutes !== 'number') {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'adjustmentMinutes must be a number' }
      });
    }

    const userBranch = req.userBranch;
    const result = await ordersService.updateOrderTiming(orderId, adjustmentMinutes, userBranch);

    await logActivity({
      req,
      action: 'update',
      entity: 'order_timing',
      entityId: orderId,
      entityName: undefined,
      branchId: userBranch?.branch_id,
      changes: { adjustmentMinutes }
    })

    res.json({ data: result });
    
  } catch (error) {
    handleControllerError(error, 'update order timing', res);
  }
};

module.exports = {
  getOrders,
  getOrderDetail,
  updateOrderStatus,
  checkAutoAccept,
  createOrder,
  checkOrderTimers,
  updateOrderTiming
};
