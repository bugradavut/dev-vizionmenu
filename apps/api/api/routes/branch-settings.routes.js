const express = require('express');
const branchSettingsController = require('../controllers/branch-settings.controller');
const { requireAuth } = require('../middleware/auth.middleware');

const router = express.Router();

/**
 * Protected routes (require authentication)
 */

// Get branch settings
router.get('/:branchId/settings', 
  requireAuth, 
  branchSettingsController.getBranchSettings
);

// Update branch settings
router.put('/:branchId/settings', 
  requireAuth, 
  branchSettingsController.updateBranchSettings
);

module.exports = router;