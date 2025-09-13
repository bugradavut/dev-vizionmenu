// =====================================================
// CUSTOMER MENU ROUTES (PUBLIC)
// Public menu routes for customer order page
// No authentication required
// =====================================================

const express = require('express');
const customerMenuController = require('../controllers/customer-menu.controller');

const router = express.Router();

// Get public menu for customers by branch ID
// No auth required - public endpoint for order page
router.get('/:branchId', customerMenuController.getCustomerMenu);

// Get branch info for customers
// No auth required - public endpoint for order page
router.get('/:branchId/info', customerMenuController.getBranchInfo);

module.exports = router;