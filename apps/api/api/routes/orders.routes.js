// =====================================================
// ORDERS ROUTES
// Order management route definitions
// =====================================================

const express = require('express');
const ordersController = require('../controllers/orders.controller');
const { requireAuthWithBranch, optionalAuth } = require('../middleware/auth.middleware');

const router = express.Router();

// List branch orders with filtering and pagination
router.get('/', requireAuthWithBranch, ordersController.getOrders);

// Get detailed order information
router.get('/:orderId', optionalAuth, ordersController.getOrderDetail);

// Update order status
router.patch('/:orderId/status', optionalAuth, ordersController.updateOrderStatus);

// Check if orders should be auto-accepted
router.post('/auto-accept-check', ordersController.checkAutoAccept);

// Create new order
router.post('/', optionalAuth, ordersController.createOrder);

// Check and auto-advance orders based on timing
router.post('/timer-check', ordersController.checkOrderTimers);

// Update individual order timing adjustment
router.patch('/:orderId/timing', requireAuthWithBranch, ordersController.updateOrderTiming);

// Get receipt data for an order (SW-76)
router.get('/:orderId/receipt', optionalAuth, ordersController.getOrderReceipt);

module.exports = router;