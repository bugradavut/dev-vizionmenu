// =====================================================
// COMMISSION ROUTES
// All commission management API routes
// =====================================================

const express = require('express');
const router = express.Router();
const commissionController = require('../controllers/commission.controller');
const { requireAuth } = require('../middleware/auth.middleware');
const { requirePlatformAdmin } = require('../middleware/platform-admin.middleware');

// =====================================================
// PUBLIC COMMISSION CALCULATION (NO AUTH REQUIRED)
// =====================================================

/**
 * @route   POST /api/v1/commission/calculate
 * @desc    Calculate commission for an order (public endpoint for order submission)
 * @access  Public (no auth required)
 */
router.post('/calculate', 
  commissionController.calculateCommission
);

// Apply authentication to all other commission routes
router.use(requireAuth);

// =====================================================
// DEFAULT COMMISSION RATES MANAGEMENT
// =====================================================

/**
 * @route   GET /api/v1/commission/defaults
 * @desc    Get all default commission rates
 * @access  Platform Admin only
 */
router.get('/defaults', 
  requirePlatformAdmin, 
  commissionController.getDefaultRates
);

/**
 * @route   PUT /api/v1/commission/defaults/:sourceType
 * @desc    Update default commission rate for a source type
 * @access  Platform Admin only
 */
router.put('/defaults/:sourceType', 
  requirePlatformAdmin, 
  commissionController.updateDefaultRate
);

// =====================================================
// CHAIN-SPECIFIC COMMISSION SETTINGS
// =====================================================

/**
 * @route   GET /api/v1/commission/settings/:chainId
 * @desc    Get commission settings for a specific chain
 * @access  Platform Admin only
 */
router.get('/settings/:chainId', 
  requirePlatformAdmin, 
  commissionController.getChainSettings
);

/**
 * @route   PUT /api/v1/commission/settings/:chainId/:sourceType
 * @desc    Set or update chain-specific commission rate
 * @access  Platform Admin only
 */
router.put('/settings/:chainId/:sourceType', 
  requirePlatformAdmin, 
  commissionController.setChainRate
);

/**
 * @route   DELETE /api/v1/commission/settings/:chainId/:sourceType
 * @desc    Remove chain-specific override (revert to default)
 * @access  Platform Admin only
 */
router.delete('/settings/:chainId/:sourceType', 
  requirePlatformAdmin, 
  commissionController.removeChainOverride
);

/**
 * @route   POST /api/v1/commission/settings/:chainId/bulk
 * @desc    Bulk update multiple commission rates for a chain
 * @access  Platform Admin only
 */
router.post('/settings/:chainId/bulk', 
  requirePlatformAdmin, 
  commissionController.bulkUpdateChainRates
);

// =====================================================
// COMMISSION REPORTING & ANALYTICS
// =====================================================

/**
 * @route   GET /api/v1/commission/summary
 * @desc    Get commission summary and statistics
 * @access  Platform Admin only
 * @query   dateRange - Time period (7d, 30d, 90d)
 */
router.get('/summary', 
  requirePlatformAdmin, 
  commissionController.getCommissionSummary
);

// =====================================================
// BRANCH-SPECIFIC COMMISSION SETTINGS
// =====================================================

/**
 * @route   GET /api/v1/commission/branch-settings/:branchId
 * @desc    Get commission settings for a specific branch
 * @access  Platform Admin only
 */
router.get('/branch-settings/:branchId', 
  requirePlatformAdmin, 
  commissionController.getBranchSettings
);

/**
 * @route   PUT /api/v1/commission/branch-settings/:branchId/:sourceType
 * @desc    Set or update branch-specific commission rate
 * @access  Platform Admin only
 */
router.put('/branch-settings/:branchId/:sourceType', 
  requirePlatformAdmin, 
  commissionController.setBranchRate
);

/**
 * @route   DELETE /api/v1/commission/branch-settings/:branchId/:sourceType
 * @desc    Remove branch-specific override (revert to chain/default)
 * @access  Platform Admin only
 */
router.delete('/branch-settings/:branchId/:sourceType', 
  requirePlatformAdmin, 
  commissionController.removeBranchOverride
);

/**
 * @route   POST /api/v1/commission/branch-settings/:branchId/bulk
 * @desc    Bulk update multiple commission rates for a branch
 * @access  Platform Admin only
 */
router.post('/branch-settings/:branchId/bulk', 
  requirePlatformAdmin, 
  commissionController.bulkUpdateBranchRates
);


module.exports = router;