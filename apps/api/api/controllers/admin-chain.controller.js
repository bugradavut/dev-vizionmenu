// =====================================================
// ADMIN CHAIN CONTROLLER
// Route handlers for platform admin chain management
// =====================================================

const { handleControllerError } = require('../helpers/error-handler');
const adminChainService = require('../services/admin-chain.service');

/**
 * POST /api/v1/admin/chains
 * Create a new restaurant chain
 */
const createChain = async (req, res) => {
  try {
    const adminUserId = req.currentUserId;
    const chainData = req.body;

    const newChain = await adminChainService.createChain(chainData, adminUserId);

    res.status(201).json({
      data: {
        message: 'Chain created successfully',
        chain: newChain
      }
    });

  } catch (error) {
    handleControllerError(error, 'create chain', res);
  }
};

/**
 * GET /api/v1/admin/chains
 * List all restaurant chains
 */
const getAllChains = async (req, res) => {
  try {
    const filters = {
      isActive: req.query.isActive !== undefined ? req.query.isActive === 'true' : undefined,
      search: req.query.search
    };

    const chains = await adminChainService.getAllChains(filters);

    res.json({
      data: {
        chains,
        total: chains.length,
        filters
      }
    });

  } catch (error) {
    handleControllerError(error, 'fetch chains', res);
  }
};

/**
 * GET /api/v1/admin/chains/:id
 * Get a specific restaurant chain
 */
const getChainById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const chain = await adminChainService.getChainById(id);

    res.json({
      data: {
        chain
      }
    });

  } catch (error) {
    handleControllerError(error, 'fetch chain details', res);
  }
};

/**
 * PUT /api/v1/admin/chains/:id
 * Update a restaurant chain
 */
const updateChain = async (req, res) => {
  try {
    const { id } = req.params;
    const adminUserId = req.currentUserId;
    const updateData = req.body;

    const updatedChain = await adminChainService.updateChain(id, updateData, adminUserId);

    res.json({
      data: {
        message: 'Chain updated successfully',
        chain: updatedChain
      }
    });

  } catch (error) {
    handleControllerError(error, 'update chain', res);
  }
};

/**
 * DELETE /api/v1/admin/chains/:id
 * Delete a restaurant chain
 */
const deleteChain = async (req, res) => {
  try {
    const { id } = req.params;
    const adminUserId = req.currentUserId;

    const result = await adminChainService.deleteChain(id, adminUserId);

    res.json({
      data: result
    });

  } catch (error) {
    handleControllerError(error, 'delete chain', res);
  }
};


module.exports = {
  createChain,
  getAllChains,
  getChainById,
  updateChain,
  deleteChain
};