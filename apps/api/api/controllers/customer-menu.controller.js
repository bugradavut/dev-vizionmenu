// =====================================================
// CUSTOMER MENU CONTROLLER
// Public menu controller for customer order page
// =====================================================

const { handleControllerError } = require('../helpers/error-handler');
const customerMenuService = require('../services/customer-menu.service');

/**
 * Get public menu for customers
 * No authentication required
 */
const getCustomerMenu = async (req, res) => {
  try {
    const { branchId } = req.params;
    const { time } = req.query;

    if (!branchId) {
      return res.status(400).json({
        error: {
          code: 'MISSING_BRANCH_ID',
          message: 'Branch ID is required'
        }
      });
    }

    const menu = await customerMenuService.getCustomerMenu(branchId, time);
    
    res.json({
      data: menu
    });

  } catch (error) {
    handleControllerError(error, 'get customer menu', res);
  }
};

/**
 * Get branch information for customers
 * No authentication required
 */
const getBranchInfo = async (req, res) => {
  try {
    const { branchId } = req.params;

    if (!branchId) {
      return res.status(400).json({
        error: {
          code: 'MISSING_BRANCH_ID',
          message: 'Branch ID is required'
        }
      });
    }

    const branchInfo = await customerMenuService.getBranchInfo(branchId);
    
    res.json({
      data: branchInfo
    });

  } catch (error) {
    handleControllerError(error, 'get branch info', res);
  }
};

module.exports = {
  getCustomerMenu,
  getBranchInfo
};