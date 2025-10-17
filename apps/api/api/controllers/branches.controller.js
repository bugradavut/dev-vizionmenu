// =====================================================
// BRANCHES CONTROLLER
// Branch settings management operations
// =====================================================

const branchesService = require('../services/branches.service');
const { getUserBranchContext } = require('../helpers/auth');
const { handleControllerError } = require('../helpers/error-handler');

/**
 * GET /api/v1/branch/:branchId/settings
 * Get branch-specific settings (orderFlow, timingSettings, etc.)
 */
const getBranchSettings = async (req, res) => {
  try {
    const { branchId } = req.params;
    
    // Validation
    if (!branchId) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'Branch ID is required' }
      });
    }

    // Get user authentication context
    const userBranch = await getUserBranchContext(req, res);
    if (!userBranch) return; // Response already sent by getUserBranchContext

    // Authorization: Check if user has access to this branch
    if (userBranch.branch_id !== branchId) {
      return res.status(403).json({
        error: { code: 'FORBIDDEN', message: 'Access denied to this branch settings' }
      });
    }

    // Use branch service to get settings
    const branchSettings = await branchesService.getBranchSettings(branchId);

    // Success response
    res.json({ data: branchSettings });

  } catch (error) {
    console.error('Get branch settings endpoint error:', error);
    
    // Handle specific errors from service
    if (error.message === 'Branch not found') {
      return res.status(404).json({
        error: { code: 'BRANCH_NOT_FOUND', message: 'Branch not found' }
      });
    }
    
    res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'Failed to get branch settings' }
    });
  }
};

/**
 * PUT /api/v1/branch/:branchId/settings
 * Update branch settings
 */
const updateBranchSettings = async (req, res) => {
  try {
    console.log(`PUT /api/v1/branch/${req.params.branchId}/settings - Update branch settings`);

    const { branchId } = req.params;
    const { orderFlow, timingSettings, paymentSettings, restaurantHours, minimumOrderAmount, deliveryFee, freeDeliveryThreshold } = req.body;
    
    // Validate request
    if (!branchId) {
      return res.status(400).json({
        error: { code: 'MISSING_BRANCH_ID', message: 'Branch ID is required' }
      });
    }

    // Validate orderFlow
    if (!orderFlow || !['standard', 'simplified'].includes(orderFlow)) {
      return res.status(400).json({
        error: { code: 'INVALID_ORDER_FLOW', message: 'orderFlow must be "standard" or "simplified"' }
      });
    }

    // Validate timingSettings if provided (timing settings are always optional but validated when present)
    if (timingSettings && typeof timingSettings === 'object') {
      
      const { baseDelay, temporaryBaseDelay, deliveryDelay, temporaryDeliveryDelay } = timingSettings;
      
      if (typeof baseDelay !== 'number' || baseDelay < 0 || baseDelay > 120) {
        return res.status(400).json({
          error: { code: 'INVALID_BASE_DELAY', message: 'baseDelay must be a number between 0 and 120' }
        });
      }
      
      if (typeof temporaryBaseDelay !== 'number' || temporaryBaseDelay < -60 || temporaryBaseDelay > 60) {
        return res.status(400).json({
          error: { code: 'INVALID_TEMPORARY_BASE_DELAY', message: 'temporaryBaseDelay must be a number between -60 and 60' }
        });
      }
      
      if (typeof deliveryDelay !== 'number' || deliveryDelay < 0 || deliveryDelay > 120) {
        return res.status(400).json({
          error: { code: 'INVALID_DELIVERY_DELAY', message: 'deliveryDelay must be a number between 0 and 120' }
        });
      }
      
      if (typeof temporaryDeliveryDelay !== 'number' || temporaryDeliveryDelay < -60 || temporaryDeliveryDelay > 60) {
        return res.status(400).json({
          error: { code: 'INVALID_TEMPORARY_DELIVERY_DELAY', message: 'temporaryDeliveryDelay must be a number between -60 and 60' }
        });
      }
    }

    // Get user token and validate authentication
    const currentUserId = req.currentUserId;

    // Use branch service to update settings
    const settingsData = {
      orderFlow,
      timingSettings,
      paymentSettings,
      restaurantHours,
      minimumOrderAmount,
      deliveryFee,
      freeDeliveryThreshold
    };
    const result = await branchesService.updateBranchSettings(branchId, settingsData, currentUserId);

    // Success response
    res.json({
      data: result,
      message: 'Branch settings updated successfully'
    });

  } catch (error) {
    console.error('Update branch settings endpoint error:', error);
    
    // Handle specific errors from service
    if (error.message === 'Branch not found') {
      return res.status(404).json({
        error: { code: 'BRANCH_NOT_FOUND', message: 'Branch not found' }
      });
    }
    
    if (error.message === 'User does not have access to this branch') {
      return res.status(403).json({
        error: { code: 'NO_BRANCH_ACCESS', message: 'User does not have access to this branch' }
      });
    }
    
    if (error.message === 'Only branch managers and chain owners can update settings') {
      return res.status(403).json({
        error: { code: 'INSUFFICIENT_PERMISSIONS', message: 'Only branch managers and chain owners can update settings' }
      });
    }
    
    if (error.message === 'Failed to update branch settings') {
      return res.status(500).json({
        error: { code: 'UPDATE_FAILED', message: 'Failed to update branch settings' }
      });
    }
    
    // Handle validation errors
    if (error.message.includes('orderFlow') || error.message.includes('timingSettings') || 
        error.message.includes('baseDelay') || error.message.includes('deliveryDelay')) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: error.message }
      });
    }
    
    res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'Failed to update branch settings' }
    });
  }
};

/**
 * PUT /api/v1/branches/:branchId/theme-config
 * Update branch theme config (for branch managers/staff)
 */
const updateBranchThemeConfig = async (req, res) => {
  try {
    const { branchId } = req.params;
    const { theme_config } = req.body;
    const currentUserId = req.currentUserId;

    // Validation
    if (!branchId) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'Branch ID is required' }
      });
    }

    if (!theme_config) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'theme_config is required' }
      });
    }

    // Get user authentication context
    const userBranch = await getUserBranchContext(req, res);
    if (!userBranch) return; // Response already sent by getUserBranchContext

    // Authorization: Check if user has access to this branch
    if (userBranch.branch_id !== branchId) {
      return res.status(403).json({
        error: { code: 'FORBIDDEN', message: 'Access denied to this branch' }
      });
    }

    // Update theme_config
    const result = await branchesService.updateBranchThemeConfig(branchId, theme_config);

    res.json({
      data: result,
      message: 'Theme config updated successfully'
    });

  } catch (error) {
    console.error('Update theme config endpoint error:', error);

    if (error.message === 'Branch not found') {
      return res.status(404).json({
        error: { code: 'BRANCH_NOT_FOUND', message: 'Branch not found' }
      });
    }

    res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'Failed to update theme config' }
    });
  }
};

/**
 * GET /api/v1/branches/by-chain/:chainId
 * Get all branches belonging to a specific chain
 * Used for hierarchical user management (chain owners creating users)
 */
const getBranchesByChain = async (req, res) => {
  try {
    const { chainId } = req.params;
    const currentUserId = req.currentUserId;

    if (!chainId) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'Chain ID is required' }
      });
    }

    const branches = await branchesService.getBranchesByChain(chainId, currentUserId);
    res.json({ data: branches });

  } catch (error) {
    handleControllerError(error, 'get branches by chain', res);
  }
};

module.exports = {
  getBranchSettings,
  updateBranchSettings,
  updateBranchThemeConfig,
  getBranchesByChain
};