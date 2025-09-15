// =====================================================
// MENU ITEMS CONTROLLER
// Menu items management operations with photo upload support
// =====================================================

const menuItemsService = require('../services/menu-items.service');
const { handleControllerError } = require('../helpers/error-handler');
const { logActivity } = require('../helpers/audit-logger');

/**
 * GET /api/v1/menu/items
 * List menu items with advanced filtering and search
 */
const getMenuItems = async (req, res) => {
  try {
    const {
      categoryId,
      search,
      isAvailable,
      priceMin,
      priceMax,
      allergens,
      dietaryInfo,
      includeVariants = 'false',
      page = '1',
      limit = '50',
      sortBy = 'display_order',
      sortOrder = 'asc'
    } = req.query;

    const userBranch = req.userBranch;

    if (!userBranch || !userBranch.branch_id) {
      return res.status(400).json({
        error: { code: 'MISSING_BRANCH_CONTEXT', message: 'Branch context is required' }
      });
    }

    const filters = {
      categoryId,
      search,
      isAvailable: isAvailable !== undefined ? isAvailable === 'true' : undefined,
      priceMin,
      priceMax,
      allergens: allergens ? allergens.split(',') : undefined,
      dietaryInfo: dietaryInfo ? dietaryInfo.split(',') : undefined,
      includeVariants: includeVariants === 'true',
      page,
      limit,
      sortBy,
      sortOrder
    };

    const result = await menuItemsService.getMenuItems(userBranch.branch_id, filters);
    res.json(result);
    
  } catch (error) {
    handleControllerError(error, 'fetch menu items', res);
  }
};

/**
 * GET /api/v1/menu/items/:id
 * Get detailed menu item information with variants
 */
const getMenuItemById = async (req, res) => {
  try {
    const { id } = req.params;
    const userBranch = req.userBranch;

    if (!id) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'Menu item ID is required' }
      });
    }

    if (!userBranch || !userBranch.branch_id) {
      return res.status(400).json({
        error: { code: 'MISSING_BRANCH_CONTEXT', message: 'Branch context is required' }
      });
    }

    const item = await menuItemsService.getMenuItemById(id, userBranch.branch_id);
    res.json({ data: item });
    
  } catch (error) {
    handleControllerError(error, 'fetch menu item details', res);
  }
};

/**
 * POST /api/v1/menu/items
 * Create new menu item with optional photo upload
 */
const createMenuItem = async (req, res) => {
  try {
    const { 
      name, 
      description, 
      price, 
      category_id, 
      allergens, 
      dietary_info, 
      preparation_time,
      display_order,
      variants
    } = req.body;

    const userBranch = req.userBranch;
    const photo = req.file; // Multer middleware will provide this

    // Validation
    if (!name) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'Menu item name is required' }
      });
    }

    if (!price || price < 0) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'Valid price is required' }
      });
    }

    if (!userBranch || !userBranch.branch_id) {
      return res.status(400).json({
        error: { code: 'MISSING_BRANCH_CONTEXT', message: 'Branch context is required' }
      });
    }

    // Check permissions - only managers and above can create items
    const allowedRoles = ['chain_owner', 'branch_manager'];
    if (!allowedRoles.includes(userBranch.role)) {
      return res.status(403).json({
        error: { code: 'INSUFFICIENT_PERMISSIONS', message: 'Only managers and above can create menu items' }
      });
    }

    // Parse arrays from JSON strings if needed
    const parsedAllergens = allergens ? 
      (Array.isArray(allergens) ? allergens : JSON.parse(allergens)) : [];
    const parsedDietaryInfo = dietary_info ? 
      (Array.isArray(dietary_info) ? dietary_info : JSON.parse(dietary_info)) : [];
    const parsedVariants = variants ? 
      (Array.isArray(variants) ? variants : JSON.parse(variants)) : [];

    const itemData = { 
      name, 
      description, 
      price: parseFloat(price), 
      category_id, 
      allergens: parsedAllergens, 
      dietary_info: parsedDietaryInfo, 
      preparation_time,
      display_order,
      variants: parsedVariants,
      image_url: req.body.image_url || null  // Accept image_url from frontend
    };

  const result = await menuItemsService.createMenuItem(itemData, userBranch.branch_id, photo);

    // Activity Log (create)
    await logActivity({
      req,
      branchId: userBranch.branch_id,
      action: 'create',
      entity: 'menu_item',
      entityId: result.id,
      entityName: result.name,
      changes: { after: result }
    })

    res.status(201).json({ data: result });
    
  } catch (error) {
    handleControllerError(error, 'create menu item', res);
  }
};

/**
 * PUT /api/v1/menu/items/:id
 * Update existing menu item with optional photo upload
 */
const updateMenuItem = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      name, 
      description, 
      price, 
      category_id, 
      allergens, 
      dietary_info, 
      preparation_time,
      display_order,
      is_available
    } = req.body;

    const userBranch = req.userBranch;
    const photo = req.file; // Multer middleware will provide this

    // Validation
    if (!id) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'Menu item ID is required' }
      });
    }

    if (!userBranch || !userBranch.branch_id) {
      return res.status(400).json({
        error: { code: 'MISSING_BRANCH_CONTEXT', message: 'Branch context is required' }
      });
    }

    // Check permissions - only managers and above can update items
    const allowedRoles = ['chain_owner', 'branch_manager'];
    if (!allowedRoles.includes(userBranch.role)) {
      return res.status(403).json({
        error: { code: 'INSUFFICIENT_PERMISSIONS', message: 'Only managers and above can update menu items' }
      });
    }

    // Parse arrays from JSON strings if needed
    const parsedAllergens = allergens ? 
      (Array.isArray(allergens) ? allergens : JSON.parse(allergens)) : undefined;
    const parsedDietaryInfo = dietary_info ? 
      (Array.isArray(dietary_info) ? dietary_info : JSON.parse(dietary_info)) : undefined;

    const updateData = { 
      name, 
      description, 
      price: price !== undefined ? parseFloat(price) : undefined, 
      category_id, 
      allergens: parsedAllergens, 
      dietary_info: parsedDietaryInfo, 
      preparation_time,
      display_order,
      is_available
    };

  const result = await menuItemsService.updateMenuItem(id, updateData, userBranch.branch_id, photo);

    // Activity Log (update)
    await logActivity({
      req,
      branchId: userBranch.branch_id,
      action: 'update',
      entity: 'menu_item',
      entityId: result.id,
      entityName: result.name,
      changes: { update: updateData }
    })

    res.json({ data: result });
    
  } catch (error) {
    handleControllerError(error, 'update menu item', res);
  }
};

/**
 * DELETE /api/v1/menu/items/:id
 * Delete menu item with photo cleanup
 */
const deleteMenuItem = async (req, res) => {
  try {
    const { id } = req.params;
    const userBranch = req.userBranch;

    // Validation
    if (!id) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'Menu item ID is required' }
      });
    }

    if (!userBranch || !userBranch.branch_id) {
      return res.status(400).json({
        error: { code: 'MISSING_BRANCH_CONTEXT', message: 'Branch context is required' }
      });
    }

    // Check permissions - only managers and above can delete items
    const allowedRoles = ['chain_owner', 'branch_manager'];
    if (!allowedRoles.includes(userBranch.role)) {
      return res.status(403).json({
        error: { code: 'INSUFFICIENT_PERMISSIONS', message: 'Only managers and above can delete menu items' }
      });
    }

  const result = await menuItemsService.deleteMenuItem(id, userBranch.branch_id);

    // Activity Log (delete)
    await logActivity({
      req,
      branchId: userBranch.branch_id,
      action: 'delete',
      entity: 'menu_item',
      entityId: result.item_id,
      entityName: result.item_name,
      changes: { deleted: true }
    })

    res.json({ data: result });
    
  } catch (error) {
    handleControllerError(error, 'delete menu item', res);
  }
};

/**
 * PATCH /api/v1/menu/items/:id/toggle
 * Toggle menu item availability (instant on/off)
 */
const toggleMenuItemAvailability = async (req, res) => {
  try {
    const { id } = req.params;
    const userBranch = req.userBranch;

    // Validation
    if (!id) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'Menu item ID is required' }
      });
    }

    if (!userBranch || !userBranch.branch_id) {
      return res.status(400).json({
        error: { code: 'MISSING_BRANCH_CONTEXT', message: 'Branch context is required' }
      });
    }

    // Staff and above can toggle availability
    const allowedRoles = ['chain_owner', 'branch_manager', 'branch_staff'];
    if (!allowedRoles.includes(userBranch.role)) {
      return res.status(403).json({
        error: { code: 'INSUFFICIENT_PERMISSIONS', message: 'Staff and above can toggle item availability' }
      });
    }

    const result = await menuItemsService.toggleMenuItemAvailability(id, userBranch.branch_id);

    res.json({ data: result });
    
  } catch (error) {
    handleControllerError(error, 'toggle menu item availability', res);
  }
};

/**
 * POST /api/v1/menu/items/:id/duplicate
 * Duplicate menu item with optional modifications
 */
const duplicateMenuItem = async (req, res) => {
  try {
    const { id } = req.params;
    const modifications = req.body;
    const userBranch = req.userBranch;

    // Validation
    if (!id) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'Menu item ID is required' }
      });
    }

    if (!userBranch || !userBranch.branch_id) {
      return res.status(400).json({
        error: { code: 'MISSING_BRANCH_CONTEXT', message: 'Branch context is required' }
      });
    }

    // Check permissions - only managers and above can duplicate items
    const allowedRoles = ['chain_owner', 'branch_manager'];
    if (!allowedRoles.includes(userBranch.role)) {
      return res.status(403).json({
        error: { code: 'INSUFFICIENT_PERMISSIONS', message: 'Only managers and above can duplicate menu items' }
      });
    }

    const result = await menuItemsService.duplicateMenuItem(id, userBranch.branch_id, modifications);

    res.status(201).json({ data: result });
    
  } catch (error) {
    handleControllerError(error, 'duplicate menu item', res);
  }
};

/**
 * PUT /api/v1/menu/items/reorder
 * Reorder menu items within categories (drag & drop support)
 */
const reorderMenuItems = async (req, res) => {
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
        error: { code: 'INSUFFICIENT_PERMISSIONS', message: 'Only managers and above can reorder menu items' }
      });
    }

    // Use service for reorder logic
    const result = await menuItemsService.reorderMenuItems(reorderData, userBranch.branch_id);

    res.json({ data: result });
    
  } catch (error) {
    handleControllerError(error, 'reorder menu items', res);
  }
};

/**
 * POST /api/v1/menu/items/bulk
 * Bulk operations on menu items (update availability, pricing, categories)
 */
const bulkUpdateMenuItems = async (req, res) => {
  try {
    const { itemIds, operation, data } = req.body;
    const userBranch = req.userBranch;

    // Validation
    if (!itemIds || !Array.isArray(itemIds) || itemIds.length === 0) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'itemIds must be a non-empty array' }
      });
    }

    if (!operation || !['availability', 'category', 'pricing'].includes(operation)) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'operation must be one of: availability, category, pricing' }
      });
    }

    if (!userBranch || !userBranch.branch_id) {
      return res.status(400).json({
        error: { code: 'MISSING_BRANCH_CONTEXT', message: 'Branch context is required' }
      });
    }

    // Check permissions - only managers and above can do bulk operations
    const allowedRoles = ['chain_owner', 'branch_manager'];
    if (!allowedRoles.includes(userBranch.role)) {
      return res.status(403).json({
        error: { code: 'INSUFFICIENT_PERMISSIONS', message: 'Only managers and above can perform bulk operations' }
      });
    }

    // Use service for bulk update logic  
    const result = await menuItemsService.bulkUpdateMenuItems(itemIds, operation, data, userBranch.branch_id);

    res.json({ data: result });
    
  } catch (error) {
    handleControllerError(error, 'bulk update menu items', res);
  }
};


module.exports = {
  getMenuItems,
  getMenuItemById,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
  toggleMenuItemAvailability,
  duplicateMenuItem,
  reorderMenuItems,
  bulkUpdateMenuItems
};
