// =====================================================
// MENU CATEGORIES CONTROLLER
// Menu categories management operations
// =====================================================

const menuCategoriesService = require('../services/menu-categories.service');
const { handleControllerError } = require('../helpers/error-handler');

/**
 * GET /api/v1/menu/categories
 * List all categories for the branch with optional items
 */
const getCategories = async (req, res) => {
  try {
    const { includeItems = 'false', includeInactive = 'false' } = req.query;
    const userBranch = req.userBranch;

    if (!userBranch || !userBranch.branch_id) {
      return res.status(400).json({
        error: { code: 'MISSING_BRANCH_CONTEXT', message: 'Branch context is required' }
      });
    }

    const options = {
      includeItems: includeItems === 'true',
      includeInactive: includeInactive === 'true'
    };

    const result = await menuCategoriesService.getCategories(userBranch.branch_id, options);
    res.json(result);
    
  } catch (error) {
    handleControllerError(error, 'fetch menu categories', res);
  }
};

/**
 * GET /api/v1/menu/categories/:id
 * Get detailed category information with items
 */
const getCategoryById = async (req, res) => {
  try {
    const { id } = req.params;
    const userBranch = req.userBranch;

    if (!id) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'Category ID is required' }
      });
    }

    if (!userBranch || !userBranch.branch_id) {
      return res.status(400).json({
        error: { code: 'MISSING_BRANCH_CONTEXT', message: 'Branch context is required' }
      });
    }

    const category = await menuCategoriesService.getCategoryById(id, userBranch.branch_id);
    res.json({ data: category });
    
  } catch (error) {
    handleControllerError(error, 'fetch category details', res);
  }
};

/**
 * POST /api/v1/menu/categories
 * Create new menu category
 */
const createCategory = async (req, res) => {
  try {
    const { name, description, display_order, icon } = req.body;
    const userBranch = req.userBranch;

    // Validation
    if (!name) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'Category name is required' }
      });
    }

    if (!userBranch || !userBranch.branch_id) {
      return res.status(400).json({
        error: { code: 'MISSING_BRANCH_CONTEXT', message: 'Branch context is required' }
      });
    }

    // Check permissions - only managers and above can create categories
    const allowedRoles = ['chain_owner', 'branch_manager'];
    if (!allowedRoles.includes(userBranch.role)) {
      return res.status(403).json({
        error: { code: 'INSUFFICIENT_PERMISSIONS', message: 'Only managers and above can create categories' }
      });
    }

    const categoryData = { name, description, display_order, icon };
    const result = await menuCategoriesService.createCategory(categoryData, userBranch.branch_id);

    res.status(201).json({ data: result });
    
  } catch (error) {
    handleControllerError(error, 'create menu category', res);
  }
};

/**
 * PUT /api/v1/menu/categories/:id
 * Update existing category
 */
const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, display_order, is_active, icon } = req.body;
    const userBranch = req.userBranch;

    // Validation
    if (!id) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'Category ID is required' }
      });
    }

    if (!userBranch || !userBranch.branch_id) {
      return res.status(400).json({
        error: { code: 'MISSING_BRANCH_CONTEXT', message: 'Branch context is required' }
      });
    }

    // Check permissions - only managers and above can update categories
    const allowedRoles = ['chain_owner', 'branch_manager'];
    if (!allowedRoles.includes(userBranch.role)) {
      return res.status(403).json({
        error: { code: 'INSUFFICIENT_PERMISSIONS', message: 'Only managers and above can update categories' }
      });
    }

    const updateData = { name, description, display_order, is_active, icon };
    const result = await menuCategoriesService.updateCategory(id, updateData, userBranch.branch_id);

    res.json({ data: result });
    
  } catch (error) {
    handleControllerError(error, 'update menu category', res);
  }
};

/**
 * DELETE /api/v1/menu/categories/:id
 * Delete category (moves items to uncategorized)
 */
const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { forceDelete = 'false' } = req.query;
    const userBranch = req.userBranch;

    // Validation
    if (!id) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'Category ID is required' }
      });
    }

    if (!userBranch || !userBranch.branch_id) {
      return res.status(400).json({
        error: { code: 'MISSING_BRANCH_CONTEXT', message: 'Branch context is required' }
      });
    }

    // Check permissions - only managers and above can delete categories
    const allowedRoles = ['chain_owner', 'branch_manager'];
    if (!allowedRoles.includes(userBranch.role)) {
      return res.status(403).json({
        error: { code: 'INSUFFICIENT_PERMISSIONS', message: 'Only managers and above can delete categories' }
      });
    }

    const options = { forceDelete: forceDelete === 'true' };
    const result = await menuCategoriesService.deleteCategory(id, userBranch.branch_id, options);

    res.json({ data: result });
    
  } catch (error) {
    handleControllerError(error, 'delete menu category', res);
  }
};

/**
 * PATCH /api/v1/menu/categories/:id/toggle
 * Toggle category availability (instant on/off)
 */
const toggleCategoryAvailability = async (req, res) => {
  try {
    const { id } = req.params;
    const userBranch = req.userBranch;

    // Validation
    if (!id) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'Category ID is required' }
      });
    }

    if (!userBranch || !userBranch.branch_id) {
      return res.status(400).json({
        error: { code: 'MISSING_BRANCH_CONTEXT', message: 'Branch context is required' }
      });
    }

    // Staff and above can toggle availability (more permissive than create/update)
    const allowedRoles = ['chain_owner', 'branch_manager', 'branch_staff'];
    if (!allowedRoles.includes(userBranch.role)) {
      return res.status(403).json({
        error: { code: 'INSUFFICIENT_PERMISSIONS', message: 'Staff and above can toggle category availability' }
      });
    }

    const result = await menuCategoriesService.toggleCategoryAvailability(id, userBranch.branch_id);

    res.json({ data: result });
    
  } catch (error) {
    handleControllerError(error, 'toggle category availability', res);
  }
};

/**
 * PUT /api/v1/menu/categories/reorder
 * Reorder categories (drag & drop support)
 */
const reorderCategories = async (req, res) => {
  try {
    const { reorderData } = req.body;
    const userBranch = req.userBranch;

    // Validation
    if (!reorderData || !Array.isArray(reorderData)) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'reorderData must be an array of {id, display_order} objects' }
      });
    }

    if (!userBranch || !userBranch.branch_id) {
      return res.status(400).json({
        error: { code: 'MISSING_BRANCH_CONTEXT', message: 'Branch context is required' }
      });
    }

    // Check permissions - only managers and above can reorder
    const allowedRoles = ['chain_owner', 'branch_manager'];
    if (!allowedRoles.includes(userBranch.role)) {
      return res.status(403).json({
        error: { code: 'INSUFFICIENT_PERMISSIONS', message: 'Only managers and above can reorder categories' }
      });
    }

    const result = await menuCategoriesService.reorderCategories(reorderData, userBranch.branch_id);

    res.json({ data: result });
    
  } catch (error) {
    handleControllerError(error, 'reorder menu categories', res);
  }
};

module.exports = {
  getCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
  toggleCategoryAvailability,
  reorderCategories
};