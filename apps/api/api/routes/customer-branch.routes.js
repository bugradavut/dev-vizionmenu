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

module.exports = router;