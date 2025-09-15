// =====================================================
// MENU PRESETS CONTROLLER
// Smart preset management with scheduling capabilities
// =====================================================

const menuPresetsService = require('../services/menu-presets.service');
const { handleControllerError } = require('../helpers/error-handler');
const { logActivity } = require('../helpers/audit-logger');

/**
 * GET /api/v1/menu/presets
 * List menu presets with filtering and pagination
 */
const getMenuPresets = async (req, res) => {
  try {
    const {
      isActive,
      autoApply,
      page = '1',
      limit = '50',
      sortBy = 'created_at',
      sortOrder = 'desc'
    } = req.query;

    const userBranch = req.userBranch;

    if (!userBranch || !userBranch.branch_id) {
      return res.status(400).json({
        error: { code: 'MISSING_BRANCH_CONTEXT', message: 'Branch context is required' }
      });
    }

    const filters = {
      isActive: isActive !== undefined ? isActive === 'true' : undefined,
      autoApply: autoApply !== undefined ? autoApply === 'true' : undefined,
      page,
      limit,
      sortBy,
      sortOrder
    };

    const result = await menuPresetsService.getMenuPresets(userBranch.branch_id, filters);
    res.json(result);
    
  } catch (error) {
    handleControllerError(error, 'fetch menu presets', res);
  }
};

/**
 * GET /api/v1/menu/presets/:id
 * Get detailed preset information with full menu data
 */
const getMenuPresetById = async (req, res) => {
  try {
    const { id } = req.params;
    const userBranch = req.userBranch;

    if (!id) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'Preset ID is required' }
      });
    }

    if (!userBranch || !userBranch.branch_id) {
      return res.status(400).json({
        error: { code: 'MISSING_BRANCH_CONTEXT', message: 'Branch context is required' }
      });
    }

    const preset = await menuPresetsService.getMenuPresetById(id, userBranch.branch_id);
    res.json({ data: preset });
    
  } catch (error) {
    handleControllerError(error, 'fetch menu preset details', res);
  }
};

/**
 * POST /api/v1/menu/presets
 * Create new menu preset with scheduling
 */
const createMenuPreset = async (req, res) => {
  try {
    const { 
      name, 
      description, 
      scheduled_start,
      scheduled_end,
      schedule_type,
      daily_start_time,
      daily_end_time,
      auto_apply,
      menu_data,
      capture_current_menu,
      selected_category_ids,
      selected_item_ids
    } = req.body;

    const userBranch = req.userBranch;

    // Validation
    if (!name) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'Preset name is required' }
      });
    }

    // Menu data validation - either provided directly or captured from current menu
    if (!menu_data && !capture_current_menu) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'Either menu_data or capture_current_menu must be provided' }
      });
    }

    if (!userBranch || !userBranch.branch_id) {
      return res.status(400).json({
        error: { code: 'MISSING_BRANCH_CONTEXT', message: 'Branch context is required' }
      });
    }

    // Check permissions - only managers and above can create presets
    const allowedRoles = ['chain_owner', 'branch_manager'];
    if (!allowedRoles.includes(userBranch.role)) {
      return res.status(403).json({
        error: { code: 'INSUFFICIENT_PERMISSIONS', message: 'Only managers and above can create menu presets' }
      });
    }

    // Handle menu data - either provided or capture current
    let finalMenuData = menu_data;
    if (capture_current_menu && !menu_data) {
      finalMenuData = await captureCurrentMenuData(userBranch.branch_id);
    }

    const presetData = { 
      name, 
      description, 
      scheduled_start,
      scheduled_end,
      schedule_type,
      daily_start_time,
      daily_end_time,
      auto_apply,
      menu_data: finalMenuData,
      selected_category_ids,
      selected_item_ids
    };

    const result = await menuPresetsService.createMenuPreset(
      presetData, 
      userBranch.branch_id, 
      userBranch.user_id
    );

    await logActivity({
      req,
      action: 'create',
      entity: 'menu_preset',
      entityId: result?.id,
      entityName: result?.name,
      branchId: userBranch.branch_id,
      changes: { after: result }
    })

    res.status(201).json({ data: result });
    
  } catch (error) {
    handleControllerError(error, 'create menu preset', res);
  }
};

/**
 * PUT /api/v1/menu/presets/:id
 * Update existing menu preset
 */
const updateMenuPreset = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      name, 
      description, 
      scheduled_start,
      scheduled_end,
      schedule_type,
      daily_start_time,
      daily_end_time,
      auto_apply,
      menu_data,
      selected_category_ids,
      selected_item_ids
    } = req.body;

    const userBranch = req.userBranch;

    // Validation
    if (!id) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'Preset ID is required' }
      });
    }

    if (!userBranch || !userBranch.branch_id) {
      return res.status(400).json({
        error: { code: 'MISSING_BRANCH_CONTEXT', message: 'Branch context is required' }
      });
    }

    // Check permissions - only managers and above can update presets
    const allowedRoles = ['chain_owner', 'branch_manager'];
    if (!allowedRoles.includes(userBranch.role)) {
      return res.status(403).json({
        error: { code: 'INSUFFICIENT_PERMISSIONS', message: 'Only managers and above can update menu presets' }
      });
    }

    const updateData = { 
      name, 
      description, 
      scheduled_start,
      scheduled_end,
      schedule_type,
      daily_start_time,
      daily_end_time,
      auto_apply,
      menu_data,
      selected_category_ids,
      selected_item_ids
    };

    const result = await menuPresetsService.updateMenuPreset(id, updateData, userBranch.branch_id);

    res.json({ data: result });
    
  } catch (error) {
    handleControllerError(error, 'update menu preset', res);
  }
};

/**
 * DELETE /api/v1/menu/presets/:id
 * Delete menu preset (inactive presets only)
 */
const deleteMenuPreset = async (req, res) => {
  try {
    const { id } = req.params;
    const userBranch = req.userBranch;

    // Validation
    if (!id) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'Preset ID is required' }
      });
    }

    if (!userBranch || !userBranch.branch_id) {
      return res.status(400).json({
        error: { code: 'MISSING_BRANCH_CONTEXT', message: 'Branch context is required' }
      });
    }

    // Check permissions - only managers and above can delete presets
    const allowedRoles = ['chain_owner', 'branch_manager'];
    if (!allowedRoles.includes(userBranch.role)) {
      return res.status(403).json({
        error: { code: 'INSUFFICIENT_PERMISSIONS', message: 'Only managers and above can delete menu presets' }
      });
    }

    const result = await menuPresetsService.deleteMenuPreset(id, userBranch.branch_id);

    await logActivity({
      req,
      action: 'delete',
      entity: 'menu_preset',
      entityId: id,
      entityName: undefined,
      branchId: userBranch.branch_id,
      changes: { deleted: true }
    })

    res.json({ data: result });
    
  } catch (error) {
    handleControllerError(error, 'delete menu preset', res);
  }
};

/**
 * POST /api/v1/menu/presets/:id/activate
 * Activate menu preset (apply to live menu)
 */
const activateMenuPreset = async (req, res) => {
  try {
    const { id } = req.params;
    const userBranch = req.userBranch;

    // Validation
    if (!id) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'Preset ID is required' }
      });
    }

    if (!userBranch || !userBranch.branch_id) {
      return res.status(400).json({
        error: { code: 'MISSING_BRANCH_CONTEXT', message: 'Branch context is required' }
      });
    }

    // Check permissions - only managers and above can activate presets
    const allowedRoles = ['chain_owner', 'branch_manager'];
    if (!allowedRoles.includes(userBranch.role)) {
      return res.status(403).json({
        error: { code: 'INSUFFICIENT_PERMISSIONS', message: 'Only managers and above can activate menu presets' }
      });
    }

    const result = await menuPresetsService.activateMenuPreset(id, userBranch.branch_id);

    await logActivity({
      req,
      action: 'update',
      entity: 'menu_preset',
      entityId: id,
      entityName: undefined,
      branchId: userBranch.branch_id,
      changes: { activated: true }
    })

    res.json({ data: result });
    
  } catch (error) {
    handleControllerError(error, 'activate menu preset', res);
  }
};

/**
 * POST /api/v1/menu/presets/deactivate
 * Deactivate current active preset
 */
const deactivateCurrentPreset = async (req, res) => {
  try {
    const userBranch = req.userBranch;

    if (!userBranch || !userBranch.branch_id) {
      return res.status(400).json({
        error: { code: 'MISSING_BRANCH_CONTEXT', message: 'Branch context is required' }
      });
    }

    // Check permissions - only managers and above can deactivate presets
    const allowedRoles = ['chain_owner', 'branch_manager'];
    if (!allowedRoles.includes(userBranch.role)) {
      return res.status(403).json({
        error: { code: 'INSUFFICIENT_PERMISSIONS', message: 'Only managers and above can deactivate menu presets' }
      });
    }

    const result = await menuPresetsService.deactivateCurrentPreset(userBranch.branch_id);

    await logActivity({
      req,
      action: 'update',
      entity: 'menu_preset',
      entityId: result?.id || null,
      entityName: result?.name || undefined,
      branchId: userBranch.branch_id,
      changes: { deactivated: true }
    })

    res.json({ data: result });
    
  } catch (error) {
    handleControllerError(error, 'deactivate menu preset', res);
  }
};

/**
 * POST /api/v1/menu/presets/check-scheduled
 * Check and apply scheduled presets (system/background job endpoint)
 */
const checkScheduledPresets = async (req, res) => {
  try {
    const userBranch = req.userBranch;

    if (!userBranch || !userBranch.branch_id) {
      return res.status(400).json({
        error: { code: 'MISSING_BRANCH_CONTEXT', message: 'Branch context is required' }
      });
    }

    // This endpoint can be called by system/background jobs or managers
    const allowedRoles = ['chain_owner', 'branch_manager', 'system'];
    if (!allowedRoles.includes(userBranch.role)) {
      return res.status(403).json({
        error: { code: 'INSUFFICIENT_PERMISSIONS', message: 'Insufficient permissions to check scheduled presets' }
      });
    }

    const result = await menuPresetsService.checkScheduledPresets(userBranch.branch_id);

    res.json({ data: result });
    
  } catch (error) {
    handleControllerError(error, 'check scheduled presets', res);
  }
};

/**
 * POST /api/v1/menu/presets/current-menu
 * Capture current menu as preset
 */
const captureCurrentMenu = async (req, res) => {
  try {
    const { name, description } = req.body;
    const userBranch = req.userBranch;

    // Validation
    if (!name) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'Preset name is required' }
      });
    }

    if (!userBranch || !userBranch.branch_id) {
      return res.status(400).json({
        error: { code: 'MISSING_BRANCH_CONTEXT', message: 'Branch context is required' }
      });
    }

    // Check permissions - only managers and above can capture menu
    const allowedRoles = ['chain_owner', 'branch_manager'];
    if (!allowedRoles.includes(userBranch.role)) {
      return res.status(403).json({
        error: { code: 'INSUFFICIENT_PERMISSIONS', message: 'Only managers and above can capture current menu' }
      });
    }

    // Get current menu data from categories and items APIs
    const currentMenuData = await captureCurrentMenuData(userBranch.branch_id);

    const presetData = { 
      name, 
      description, 
      menu_data: currentMenuData,
      auto_apply: false
    };

    const result = await menuPresetsService.createMenuPreset(
      presetData, 
      userBranch.branch_id, 
      userBranch.user_id
    );

    res.status(201).json({ data: result });
    
  } catch (error) {
    handleControllerError(error, 'capture current menu', res);
  }
};

// Helper function to capture current menu state
async function captureCurrentMenuData(branchId) {
  // This would integrate with the menu categories and items services
  // to capture the current state of the menu
  
  try {
    // Import the services
    const menuCategoriesService = require('../services/menu-categories.service');
    const menuItemsService = require('../services/menu-items.service');
    
    // Get all categories
    const categoriesResult = await menuCategoriesService.getCategories(branchId, {
      includeItems: false,
      includeInactive: true
    });
    
    // Get all items
    const itemsResult = await menuItemsService.getMenuItems(branchId, {
      includeVariants: true,
      limit: 1000 // Get all items
    });
    
    return {
      categories: categoriesResult.data,
      items: itemsResult.data,
      captured_at: new Date().toISOString()
    };
  } catch (error) {
    throw new Error('Failed to capture current menu state');
  }
}

module.exports = {
  getMenuPresets,
  getMenuPresetById,
  createMenuPreset,
  updateMenuPreset,
  deleteMenuPreset,
  activateMenuPreset,
  deactivateCurrentPreset,
  checkScheduledPresets,
  captureCurrentMenu
};
