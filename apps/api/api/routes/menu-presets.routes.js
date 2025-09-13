// =====================================================
// MENU PRESETS ROUTES
// Smart preset management route definitions
// =====================================================

const express = require('express');
const menuPresetsController = require('../controllers/menu-presets.controller');
const { requireAuthWithBranch } = require('../middleware/auth.middleware');

const router = express.Router();

// List all presets for branch with filtering
router.get('/', requireAuthWithBranch, menuPresetsController.getMenuPresets);

// Get detailed preset information
router.get('/:id', requireAuthWithBranch, menuPresetsController.getMenuPresetById);

// Create new preset
router.post('/', requireAuthWithBranch, menuPresetsController.createMenuPreset);

// Update existing preset
router.put('/:id', requireAuthWithBranch, menuPresetsController.updateMenuPreset);

// Delete preset (inactive presets only)
router.delete('/:id', requireAuthWithBranch, menuPresetsController.deleteMenuPreset);

// Activate preset (apply to live menu)
router.post('/:id/activate', requireAuthWithBranch, menuPresetsController.activateMenuPreset);

// Deactivate current active preset
router.post('/deactivate', requireAuthWithBranch, menuPresetsController.deactivateCurrentPreset);

// Check and apply scheduled presets (system/background job)
router.post('/check-scheduled', requireAuthWithBranch, menuPresetsController.checkScheduledPresets);

// Capture current menu as preset
router.post('/current-menu', requireAuthWithBranch, menuPresetsController.captureCurrentMenu);

module.exports = router;