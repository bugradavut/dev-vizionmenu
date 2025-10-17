// =====================================================
// BRANCHES ROUTES
// Branch settings route definitions
// =====================================================

const express = require('express');
const branchesController = require('../controllers/branches.controller');
const { requireAuth } = require('../middleware/auth.middleware');

const router = express.Router();

// Get branch settings
router.get('/:branchId/settings', requireAuth, branchesController.getBranchSettings);

// Update branch settings
router.put('/:branchId/settings', requireAuth, branchesController.updateBranchSettings);

// Update branch theme config (for branch managers/staff)
router.put('/:branchId/theme-config', requireAuth, branchesController.updateBranchThemeConfig);

// Get branches by chain (for hierarchical user management)
router.get('/by-chain/:chainId', requireAuth, branchesController.getBranchesByChain);

module.exports = router;