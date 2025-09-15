const { handleControllerError } = require('../helpers/error-handler');
const branchSettingsService = require('../services/branch-settings.service');
const { logActivity, logActivityWithDiff } = require('../helpers/audit-logger');

/**
 * Get branch settings
 * GET /api/v1/branch/:branchId/settings
 */
const getBranchSettings = async (req, res) => {
  try {
    const { branchId } = req.params;

    if (!branchId) {
      return res.status(400).json({
        error: {
          code: 'MISSING_BRANCH_ID',
          message: 'Branch ID is required',
        },
      });
    }

    const result = await branchSettingsService.getBranchSettings(branchId);
    
    res.json({ data: result });
  } catch (error) {
    handleControllerError(error, 'get branch settings', res);
  }
};

/**
 * Update branch settings
 * PUT /api/v1/branch/:branchId/settings
 */
const updateBranchSettings = async (req, res) => {
  try {
    const { branchId } = req.params;
    const settingsData = req.body;

    if (!branchId) {
      return res.status(400).json({
        error: {
          code: 'MISSING_BRANCH_ID',
          message: 'Branch ID is required',
        },
      });
    }

    if (!settingsData || Object.keys(settingsData).length === 0) {
      return res.status(400).json({
        error: {
          code: 'MISSING_SETTINGS_DATA',
          message: 'Settings data is required',
        },
      });
    }

    // Validate minimum order amount if provided
    if (settingsData.minimumOrderAmount !== undefined) {
      const amount = parseFloat(settingsData.minimumOrderAmount);
      if (isNaN(amount) || amount < 0 || amount > 10000) {
        return res.status(400).json({
          error: {
            code: 'INVALID_MINIMUM_ORDER_AMOUNT',
            message: 'Minimum order amount must be a number between 0 and 10000',
          },
        });
      }
      settingsData.minimumOrderAmount = amount;
    }

    // Validate delivery fee if provided
    if (settingsData.deliveryFee !== undefined) {
      const fee = parseFloat(settingsData.deliveryFee);
      if (isNaN(fee) || fee < 0 || fee > 100) {
        return res.status(400).json({
          error: {
            code: 'INVALID_DELIVERY_FEE',
            message: 'Delivery fee must be a number between 0 and 100',
          },
        });
      }
      settingsData.deliveryFee = fee;
    }

    // Validate free delivery threshold if provided
    if (settingsData.freeDeliveryThreshold !== undefined) {
      const threshold = parseFloat(settingsData.freeDeliveryThreshold);
      if (isNaN(threshold) || threshold < 0 || threshold > 10000) {
        return res.status(400).json({
          error: {
            code: 'INVALID_FREE_DELIVERY_THRESHOLD',
            message: 'Free delivery threshold must be a number between 0 and 10000',
          },
        });
      }
      settingsData.freeDeliveryThreshold = threshold;
    }

    const result = await branchSettingsService.updateBranchSettings(branchId, settingsData);

    // Audit log: update branch settings (branch manager and above) - Enhanced
    await logActivityWithDiff({
      req,
      action: 'update',
      entity: 'branch_settings',
      entityId: branchId,
      entityName: undefined,
      branchId: branchId,
      afterData: result,
      tableName: 'branches',
      primaryKey: 'id'
    })

    res.json({ data: result });
  } catch (error) {
    handleControllerError(error, 'update branch settings', res);
  }
};

/**
 * Get branch minimum order amount (public endpoint)
 * GET /api/v1/customer/branch/:branchId/minimum-order
 */
const getBranchMinimumOrder = async (req, res) => {
  try {
    const { branchId } = req.params;

    if (!branchId) {
      return res.status(400).json({
        error: {
          code: 'MISSING_BRANCH_ID',
          message: 'Branch ID is required',
        },
      });
    }

    const minimumOrderAmount = await branchSettingsService.getBranchMinimumOrder(branchId);
    
    res.json({ 
      data: { 
        branchId,
        minimumOrderAmount 
      } 
    });
  } catch (error) {
    handleControllerError(error, 'get branch minimum order', res);
  }
};

const getBranchDeliveryFee = async (req, res) => {
  try {
    const { branchId } = req.params;

    if (!branchId) {
      return res.status(400).json({
        error: {
          code: 'MISSING_BRANCH_ID',
          message: 'Branch ID is required',
        },
      });
    }

    const deliveryFee = await branchSettingsService.getBranchDeliveryFee(branchId);
    
    res.json({ 
      data: { 
        branchId,
        deliveryFee 
      } 
    });
  } catch (error) {
    handleControllerError(error, 'get branch delivery fee', res);
  }
};

/**
 * Get branch information (public endpoint)
 * GET /api/v1/customer/branch/:branchId/info
 */
const getBranchDeliveryInfo = async (req, res) => {
  try {
    const { branchId } = req.params;

    if (!branchId) {
      return res.status(400).json({
        error: {
          code: 'MISSING_BRANCH_ID',
          message: 'Branch ID is required',
        },
      });
    }

    const deliveryInfo = await branchSettingsService.getBranchDeliveryInfo(branchId);
    
    res.json({ 
      data: { 
        branchId,
        ...deliveryInfo
      } 
    });
  } catch (error) {
    handleControllerError(error, 'get branch delivery info', res);
  }
};

const getBranchInfo = async (req, res) => {
  try {
    const { branchId } = req.params;

    if (!branchId) {
      return res.status(400).json({
        error: {
          code: 'MISSING_BRANCH_ID',
          message: 'Branch ID is required',
        },
      });
    }

    const branchInfo = await branchSettingsService.getBranchInfo(branchId);
    
    res.json({ data: branchInfo });
  } catch (error) {
    handleControllerError(error, 'get branch info', res);
  }
};

module.exports = {
  getBranchSettings,
  updateBranchSettings,
  getBranchMinimumOrder,
  getBranchDeliveryFee,
  getBranchDeliveryInfo,
  getBranchInfo,
};
