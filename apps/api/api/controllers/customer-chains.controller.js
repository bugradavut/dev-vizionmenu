const { handleControllerError } = require('../helpers/error-handler');
const customerChainsService = require('../services/customer-chains.service');

/**
 * GET /api/v1/customer/chains/:slug
 * Get chain information for customer ordering
 */
const getChainBySlug = async (req, res) => {
  try {
    const { slug } = req.params;
    
    if (!slug) {
      return res.status(400).json({
        error: { code: 'MISSING_CHAIN_SLUG', message: 'Chain slug is required' }
      });
    }

    const chain = await customerChainsService.getChainBySlug(slug);
    
    res.json({ data: chain });
  } catch (error) {
    handleControllerError(error, 'get chain by slug', res);
  }
};

/**
 * GET /api/v1/customer/chains/:slug/branches  
 * Get branches for a chain
 */
const getChainBranches = async (req, res) => {
  try {
    const { slug } = req.params;
    
    if (!slug) {
      return res.status(400).json({
        error: { code: 'MISSING_CHAIN_SLUG', message: 'Chain slug is required' }
      });
    }
    
    // Get chain first to validate and get ID
    const chain = await customerChainsService.getChainBySlug(slug);
    const branches = await customerChainsService.getChainBranches(chain.id);
    
    res.json({
      data: {
        chain: chain,
        branches: branches,
        total: branches.length
      }
    });
  } catch (error) {
    handleControllerError(error, 'get chain branches', res);
  }
};

/**
 * GET /api/v1/customer/chains/branch/:branchId/chain
 * Get chain information by branch ID (for QR code compatibility)
 */
const getChainByBranchId = async (req, res) => {
  try {
    const { branchId } = req.params;
    
    if (!branchId) {
      return res.status(400).json({
        error: { code: 'MISSING_BRANCH_ID', message: 'Branch ID is required' }
      });
    }

    const result = await customerChainsService.getChainByBranchId(branchId);
    
    res.json({ data: result });
  } catch (error) {
    handleControllerError(error, 'get chain by branch ID', res);
  }
};

module.exports = {
  getChainBySlug,
  getChainBranches,
  getChainByBranchId
};