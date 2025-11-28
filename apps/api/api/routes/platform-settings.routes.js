const express = require('express');
const router = express.Router();
const platformSettingsController = require('../controllers/platform-settings.controller');
const { requireAuth } = require('../middleware/auth.middleware');
const { requirePlatformAdmin } = require('../middleware/platform-admin.middleware');

/**
 * @route   GET /api/v1/platform-settings/maintenance-mode
 * @desc    Get maintenance mode status
 * @access  Public (no auth required - needed for customer order pages)
 */
router.get('/maintenance-mode',
  platformSettingsController.getMaintenanceMode
);

/**
 * @route   PUT /api/v1/platform-settings/maintenance-mode
 * @desc    Enable/disable maintenance mode
 * @access  Platform Admin only
 */
router.put('/maintenance-mode',
  requireAuth,
  requirePlatformAdmin,
  platformSettingsController.updateMaintenanceMode
);

module.exports = router;
