const express = require('express');
const branchSettingsController = require('../controllers/branch-settings.controller');

const router = express.Router();

/**
 * Public routes (no authentication required)
 * For customer-facing features
 */

// Get branch minimum order amount (public)
router.get('/branch/:branchId/minimum-order', 
  branchSettingsController.getBranchMinimumOrder
);

// Get branch delivery fee (public)
router.get('/branch/:branchId/delivery-fee', 
  branchSettingsController.getBranchDeliveryFee
);

// Get branch delivery info (public) - includes delivery fee and free delivery threshold
router.get('/branch/:branchId/delivery-info', 
  branchSettingsController.getBranchDeliveryInfo
);

// Get branch information (public)
router.get('/branch/:branchId/info', 
  branchSettingsController.getBranchInfo
);

module.exports = router;