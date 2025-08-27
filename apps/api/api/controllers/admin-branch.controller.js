// =====================================================
// ADMIN BRANCH CONTROLLER
// Route handlers for platform admin branch management
// =====================================================

const { handleControllerError } = require('../helpers/error-handler');
const adminBranchService = require('../services/admin-branch.service');

/**
 * POST /api/v1/admin/branches
 * Create a new restaurant branch
 */
const createBranch = async (req, res) => {
  try {
    const adminUserId = req.currentUserId;
    const branchData = req.body;

    const newBranch = await adminBranchService.createBranch(branchData, adminUserId);

    res.status(201).json({
      data: {
        message: 'Branch created successfully',
        branch: newBranch
      }
    });

  } catch (error) {
    handleControllerError(error, 'create branch', res);
  }
};

/**
 * GET /api/v1/admin/branches
 * List all restaurant branches with filtering
 */
const getAllBranches = async (req, res) => {
  try {
    const filters = {
      chain_id: req.query.chain_id,
      isActive: req.query.isActive !== undefined ? req.query.isActive === 'true' : undefined,
      city: req.query.city,
      search: req.query.search
    };

    const branches = await adminBranchService.getAllBranches(filters);

    res.json({
      data: {
        branches,
        total: branches.length,
        filters
      }
    });

  } catch (error) {
    handleControllerError(error, 'fetch branches', res);
  }
};

/**
 * GET /api/v1/admin/branches/:id
 * Get a specific restaurant branch
 */
const getBranchById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const branch = await adminBranchService.getBranchById(id);

    res.json({
      data: {
        branch
      }
    });

  } catch (error) {
    handleControllerError(error, 'fetch branch details', res);
  }
};

/**
 * PUT /api/v1/admin/branches/:id
 * Update a restaurant branch
 */
const updateBranch = async (req, res) => {
  try {
    const { id } = req.params;
    const adminUserId = req.currentUserId;
    const updateData = req.body;

    const updatedBranch = await adminBranchService.updateBranch(id, updateData, adminUserId);

    res.json({
      data: {
        message: 'Branch updated successfully',
        branch: updatedBranch
      }
    });

  } catch (error) {
    handleControllerError(error, 'update branch', res);
  }
};

/**
 * DELETE /api/v1/admin/branches/:id
 * Delete a restaurant branch
 */
const deleteBranch = async (req, res) => {
  try {
    const { id } = req.params;
    const adminUserId = req.currentUserId;

    const result = await adminBranchService.deleteBranch(id, adminUserId);

    res.json({
      data: result
    });

  } catch (error) {
    handleControllerError(error, 'delete branch', res);
  }
};

module.exports = {
  createBranch,
  getAllBranches,
  getBranchById,
  updateBranch,
  deleteBranch
};