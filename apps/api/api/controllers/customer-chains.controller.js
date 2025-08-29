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
 * GET /api/v1/customer/chains/:slug/branches/location
 * Get branches by location (lat, lng)
 */
const getBranchesByLocation = async (req, res) => {
  try {
    const { slug } = req.params;
    const { lat, lng, radius } = req.query;
    
    if (!slug || !lat || !lng) {
      return res.status(400).json({
        error: { code: 'MISSING_PARAMETERS', message: 'Chain slug, latitude, and longitude are required' }
      });
    }

    // Get chain first to validate and get ID
    const chain = await customerChainsService.getChainBySlug(slug);
    const branches = await customerChainsService.getBranchesByLocation(
      chain.id,
      parseFloat(lat),
      parseFloat(lng),
      radius ? parseInt(radius) : undefined
    );
    
    res.json({
      data: {
        chain: chain,
        branches: branches,
        total: branches.length,
        searchLocation: { lat: parseFloat(lat), lng: parseFloat(lng) }
      }
    });
  } catch (error) {
    handleControllerError(error, 'get branches by location', res);
  }
};

/**
 * GET /api/v1/customer/chains/:slug/branches/address
 * Get branches by address search
 */
const getBranchesByAddress = async (req, res) => {
  try {
    const { slug } = req.params;
    const { address } = req.query;
    
    if (!slug || !address) {
      return res.status(400).json({
        error: { code: 'MISSING_PARAMETERS', message: 'Chain slug and address are required' }
      });
    }

    // Get chain first to validate and get ID
    const chain = await customerChainsService.getChainBySlug(slug);
    const branches = await customerChainsService.getBranchesByAddress(chain.id, address);
    
    res.json({
      data: {
        chain: chain,
        branches: branches,
        total: branches.length,
        searchAddress: address
      }
    });
  } catch (error) {
    handleControllerError(error, 'get branches by address', res);
  }
};

/**
 * GET /api/v1/customer/chains/:slug/branches/city
 * Get branches grouped by city
 */
const getBranchesByCity = async (req, res) => {
  try {
    const { slug } = req.params;
    
    if (!slug) {
      return res.status(400).json({
        error: { code: 'MISSING_CHAIN_SLUG', message: 'Chain slug is required' }
      });
    }

    // Get chain first to validate and get ID
    const chain = await customerChainsService.getChainBySlug(slug);
    const branchesByCity = await customerChainsService.getBranchesByCity(chain.id);
    
    res.json({
      data: {
        chain: chain,
        branchesByCity: branchesByCity,
        cities: Object.keys(branchesByCity),
        totalBranches: Object.values(branchesByCity).reduce((sum, branches) => sum + branches.length, 0)
      }
    });
  } catch (error) {
    handleControllerError(error, 'get branches by city', res);
  }
};

/**
 * POST /api/v1/customer/chains/:slug/delivery/validate
 * Validate delivery address and get available branches
 */
const validateDeliveryAddress = async (req, res) => {
  try {
    const { slug } = req.params;
    const { address, apartmentNumber } = req.body;
    
    if (!slug || !address) {
      return res.status(400).json({
        error: { code: 'MISSING_PARAMETERS', message: 'Chain slug and address are required' }
      });
    }

    // Get chain first to validate and get ID
    const chain = await customerChainsService.getChainBySlug(slug);
    const deliveryValidation = await customerChainsService.validateDeliveryAddress(
      chain.id,
      address,
      apartmentNumber
    );
    
    res.json({
      data: {
        chain: chain,
        delivery: deliveryValidation
      }
    });
  } catch (error) {
    handleControllerError(error, 'validate delivery address', res);
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

/**
 * GET /api/v1/customer/chains/branch/:branchId/settings
 * Get branch settings for customer ordering (public endpoint)
 */
const getBranchSettings = async (req, res) => {
  try {
    const { branchId } = req.params;
    
    if (!branchId) {
      return res.status(400).json({
        error: { code: 'MISSING_BRANCH_ID', message: 'Branch ID is required' }
      });
    }

    const branchSettings = await customerChainsService.getBranchSettings(branchId);
    
    res.json({ data: branchSettings });
  } catch (error) {
    handleControllerError(error, 'get branch settings', res);
  }
};

module.exports = {
  getChainBySlug,
  getChainBranches,
  getBranchesByLocation,
  getBranchesByAddress,
  getBranchesByCity,
  validateDeliveryAddress,
  getChainByBranchId,
  getBranchSettings
};