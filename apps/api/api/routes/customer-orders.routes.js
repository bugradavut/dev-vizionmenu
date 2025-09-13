// =====================================================
// CUSTOMER ORDERS ROUTES
// Public customer order routes (no authentication required)
// =====================================================

const express = require('express');
const customerOrdersController = require('../controllers/customer-orders.controller');

const router = express.Router();

// Create customer order (QR code or web orders)
router.post('/', customerOrdersController.createCustomerOrder);

// Get order status for customers (for tracking)
router.get('/:orderId/status', customerOrdersController.getOrderStatus);

module.exports = router;