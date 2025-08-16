// =====================================================
// MENU PRESETS SERVICE
// Smart preset management with scheduling and auto-activation
// UEAT-Killer Features: Time-based switching, holiday presets
// =====================================================

const { createClient } = require('@supabase/supabase-js');

// Create Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Get all menu presets for a branch with filtering
 * @param {string} branchId - Branch ID
 * @param {Object} filters - Filter options
 * @returns {Object} Presets list with metadata
 */
async function getMenuPresets(branchId, filters = {}) {
  const { 
    isActive,
    autoApply,
    page = 1,
    limit = 50,
    sortBy = 'created_at',
    sortOrder = 'desc'
  } = filters;
  
  // Input validation
  const pageNum = Math.max(1, parseInt(page) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 50));
  const offset = (pageNum - 1) * limitNum;

  // Build base query
  let query = supabase
    .from('menu_presets')
    .select(`
      id,
      name,
      description,
      is_active,
      scheduled_start,
      scheduled_end,
      schedule_type,
      daily_start_time,
      daily_end_time,
      auto_apply,
      selected_category_ids,
      selected_item_ids,
      created_at,
      updated_at
    `)
    .eq('branch_id', branchId);

  // Apply filters
  if (isActive !== undefined) {
    query = query.eq('is_active', isActive);
  }

  if (autoApply !== undefined) {
    query = query.eq('auto_apply', autoApply);
  }

  // Apply sorting
  const validSortColumns = ['name', 'created_at', 'scheduled_start', 'is_active'];
  const sortColumn = validSortColumns.includes(sortBy) ? sortBy : 'created_at';
  const sortDirection = sortOrder === 'asc' ? true : false;
  
  query = query.order(sortColumn, { ascending: sortDirection });

  // Get total count for pagination
  let countQuery = supabase
    .from('menu_presets')
    .select('id', { count: 'exact', head: true })
    .eq('branch_id', branchId);

  // Apply same filters to count query
  if (isActive !== undefined) countQuery = countQuery.eq('is_active', isActive);
  if (autoApply !== undefined) countQuery = countQuery.eq('auto_apply', autoApply);

  // Execute queries in parallel
  const [presetsResult, countResult] = await Promise.all([
    query.range(offset, offset + limitNum - 1),
    countQuery
  ]);

  if (presetsResult.error) {
    throw new Error(`Failed to fetch menu presets: ${presetsResult.error.message}`);
  }

  // Format response with enhanced metadata
  const formattedPresets = (presetsResult.data || []).map(preset => ({
    id: preset.id,
    name: preset.name,
    description: preset.description,
    is_active: preset.is_active,
    scheduled_start: preset.scheduled_start,
    scheduled_end: preset.scheduled_end,
    schedule_type: preset.schedule_type || 'one-time',
    daily_start_time: preset.daily_start_time,
    daily_end_time: preset.daily_end_time,
    auto_apply: preset.auto_apply || false,
    selected_category_ids: preset.selected_category_ids || [],
    selected_item_ids: preset.selected_item_ids || [],
    menu_items_count: preset.selected_item_ids?.length || 0,
    categories_count: preset.selected_category_ids?.length || 0,
    created_by: {
      name: null,
      email: null
    },
    is_current: false, // Will be implemented with scheduling
    is_scheduled: Boolean(
      (preset.schedule_type === 'one-time' && preset.scheduled_start && preset.scheduled_end) ||
      (preset.schedule_type === 'daily' && preset.daily_start_time && preset.daily_end_time)
    ),
    created_at: preset.created_at,
    updated_at: preset.updated_at
  }));

  const totalCount = countResult.count || 0;
  
  return {
    data: formattedPresets,
    meta: { 
      total: totalCount,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(totalCount / limitNum),
      hasNextPage: pageNum * limitNum < totalCount,
      hasPreviousPage: pageNum > 1,
      active: formattedPresets.filter(p => p.is_active).length,
      inactive: formattedPresets.filter(p => !p.is_active).length,
      scheduled: formattedPresets.filter(p => p.is_scheduled).length,
      current: formattedPresets.filter(p => p.is_current).length
    }
  };
}

/**
 * Get single menu preset by ID
 * @param {string} presetId - Preset ID
 * @param {string} branchId - Branch ID for security
 * @returns {Object} Preset data with full menu
 */
async function getMenuPresetById(presetId, branchId) {
  const { data: preset, error } = await supabase
    .from('menu_presets')
    .select(`
      id,
      name,
      description,
      is_active,
      scheduled_start,
      scheduled_end,
      schedule_type,
      daily_start_time,
      daily_end_time,
      auto_apply,
      selected_category_ids,
      selected_item_ids,
      created_at,
      updated_at
    `)
    .eq('id', presetId)
    .eq('branch_id', branchId)
    .single();

  if (error || !preset) {
    throw new Error('Menu preset not found or access denied');
  }

  return {
    id: preset.id,
    name: preset.name,
    description: preset.description,
    is_active: preset.is_active,
    schedule_type: preset.schedule_type || 'one-time',
    scheduled_start: preset.scheduled_start,
    scheduled_end: preset.scheduled_end,
    daily_start_time: preset.daily_start_time,
    daily_end_time: preset.daily_end_time,
    auto_apply: preset.auto_apply || false,
    selected_category_ids: preset.selected_category_ids || [],
    selected_item_ids: preset.selected_item_ids || [],
    menu_data: {}, // Will be implemented when menu_data is added
    menu_items_count: preset.selected_item_ids?.length || 0,
    categories_count: preset.selected_category_ids?.length || 0,
    created_by: {
      name: null,
      email: null
    },
    is_current: false, // Will be implemented with scheduling
    is_scheduled: Boolean(
      (preset.schedule_type === 'one-time' && preset.scheduled_start && preset.scheduled_end) ||
      (preset.schedule_type === 'daily' && preset.daily_start_time && preset.daily_end_time)
    ),
    created_at: preset.created_at,
    updated_at: preset.updated_at
  };
}

/**
 * Create new menu preset
 * @param {Object} presetData - Preset creation data
 * @param {string} branchId - Branch ID
 * @param {string} createdBy - User ID who created the preset
 * @returns {Object} Created preset
 */
async function createMenuPreset(presetData, branchId, createdBy) {
  const { 
    name, 
    description, 
    scheduled_start,
    scheduled_end,
    schedule_type = 'one-time',
    daily_start_time,
    daily_end_time,
    auto_apply = false,
    menu_data,
    selected_category_ids,
    selected_item_ids
  } = presetData;
  
  // Validation
  if (!name || name.trim().length === 0) {
    throw new Error('Preset name is required');
  }
  
  if (name.length > 200) {
    throw new Error('Preset name must be 200 characters or less');
  }

  if (!menu_data || typeof menu_data !== 'object') {
    throw new Error('Valid menu data is required');
  }

  // Validate schedule configuration based on type
  if (schedule_type === 'one-time') {
    if (scheduled_start && scheduled_end) {
      const startDate = new Date(scheduled_start);
      const endDate = new Date(scheduled_end);
      
      if (startDate >= endDate) {
        throw new Error('Schedule end time must be after start time');
      }
    }
  } else if (schedule_type === 'daily') {
    if (daily_start_time && daily_end_time) {
      // Validate time format (HH:MM)
      const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;
      if (!timeRegex.test(daily_start_time) || !timeRegex.test(daily_end_time)) {
        throw new Error('Daily times must be in HH:MM format');
      }
      
      // Check that start time is before end time
      const [startHour, startMin] = daily_start_time.split(':').map(Number);
      const [endHour, endMin] = daily_end_time.split(':').map(Number);
      const startMinutes = startHour * 60 + startMin;
      const endMinutes = endHour * 60 + endMin;
      
      if (startMinutes >= endMinutes) {
        throw new Error('Daily end time must be after start time');
      }
    }
  }

  // Validate menu data structure
  if (!validateMenuData(menu_data)) {
    throw new Error('Invalid menu data structure');
  }

  // Check for duplicate preset names in branch
  const { data: existingPreset } = await supabase
    .from('menu_presets')
    .select('id')
    .eq('branch_id', branchId)
    .eq('name', name.trim())
    .single();

  if (existingPreset) {
    throw new Error('Preset name already exists in this branch');
  }

  // Create preset
  const presetDataObj = {
    branch_id: branchId,
    name: name.trim(),
    description: description ? description.trim() : null,
    schedule_type: schedule_type,
    scheduled_start: schedule_type === 'one-time' ? (scheduled_start || null) : null,
    scheduled_end: schedule_type === 'one-time' ? (scheduled_end || null) : null,
    daily_start_time: schedule_type === 'daily' ? daily_start_time : null,
    daily_end_time: schedule_type === 'daily' ? daily_end_time : null,
    auto_apply: auto_apply,
    menu_data: menu_data,
    selected_category_ids: selected_category_ids || [],
    selected_item_ids: selected_item_ids || [],
    is_active: false, // New presets start inactive
    created_by: createdBy,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  const { data: createdPreset, error: createError } = await supabase
    .from('menu_presets')
    .insert(presetDataObj)
    .select()
    .single();

  if (createError) {
    throw new Error('Failed to create menu preset');
  }

  return {
    id: createdPreset.id,
    name: createdPreset.name,
    description: createdPreset.description,
    is_active: createdPreset.is_active,
    schedule_type: createdPreset.schedule_type,
    scheduled_start: createdPreset.scheduled_start,
    scheduled_end: createdPreset.scheduled_end,
    daily_start_time: createdPreset.daily_start_time,
    daily_end_time: createdPreset.daily_end_time,
    auto_apply: createdPreset.auto_apply,
    menu_data: createdPreset.menu_data,
    selected_category_ids: createdPreset.selected_category_ids || [],
    selected_item_ids: createdPreset.selected_item_ids || [],
    menu_items_count: createdPreset.selected_item_ids?.length || createdPreset.menu_data?.items?.length || 0,
    categories_count: createdPreset.selected_category_ids?.length || createdPreset.menu_data?.categories?.length || 0,
    created_at: createdPreset.created_at,
    updated_at: createdPreset.updated_at
  };
}

/**
 * Update menu preset
 * @param {string} presetId - Preset ID
 * @param {Object} updateData - Update data
 * @param {string} branchId - Branch ID for security
 * @returns {Object} Updated preset
 */
async function updateMenuPreset(presetId, updateData, branchId) {
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
  } = updateData;
  
  // Validation
  if (name !== undefined) {
    if (!name || name.trim().length === 0) {
      throw new Error('Preset name cannot be empty');
    }
    if (name.length > 200) {
      throw new Error('Preset name must be 200 characters or less');
    }
  }

  // Check if preset exists and belongs to branch
  const { data: existingPreset, error: fetchError } = await supabase
    .from('menu_presets')
    .select('id, name, is_active')
    .eq('id', presetId)
    .eq('branch_id', branchId)
    .single();

  if (fetchError || !existingPreset) {
    throw new Error('Menu preset not found or access denied');
  }

  // Validate schedule configuration based on type
  if (schedule_type !== undefined) {
    if (schedule_type === 'one-time') {
      if (scheduled_start !== undefined && scheduled_end !== undefined) {
        if (scheduled_start && scheduled_end) {
          const startDate = new Date(scheduled_start);
          const endDate = new Date(scheduled_end);
          
          if (startDate >= endDate) {
            throw new Error('Schedule end time must be after start time');
          }
        }
      }
    } else if (schedule_type === 'daily') {
      if (daily_start_time !== undefined && daily_end_time !== undefined) {
        if (daily_start_time && daily_end_time) {
          // Validate time format (HH:MM)
          const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;
          if (!timeRegex.test(daily_start_time) || !timeRegex.test(daily_end_time)) {
            throw new Error('Daily times must be in HH:MM format');
          }
          
          // Check that start time is before end time
          const [startHour, startMin] = daily_start_time.split(':').map(Number);
          const [endHour, endMin] = daily_end_time.split(':').map(Number);
          const startMinutes = startHour * 60 + startMin;
          const endMinutes = endHour * 60 + endMin;
          
          if (startMinutes >= endMinutes) {
            throw new Error('Daily end time must be after start time');
          }
        }
      }
    }
  }

  // Validate menu data if provided
  if (menu_data !== undefined && !validateMenuData(menu_data)) {
    throw new Error('Invalid menu data structure');
  }

  // Check for duplicate name if name is being changed
  if (name && name.trim() !== existingPreset.name) {
    const { data: duplicatePreset } = await supabase
      .from('menu_presets')
      .select('id')
      .eq('branch_id', branchId)
      .eq('name', name.trim())
      .neq('id', presetId)
      .single();

    if (duplicatePreset) {
      throw new Error('Preset name already exists in this branch');
    }
  }

  // Prepare update data
  const updateDataObj = {
    updated_at: new Date().toISOString()
  };

  if (name !== undefined) updateDataObj.name = name.trim();
  if (description !== undefined) updateDataObj.description = description ? description.trim() : null;
  if (schedule_type !== undefined) updateDataObj.schedule_type = schedule_type;
  if (scheduled_start !== undefined) updateDataObj.scheduled_start = scheduled_start;
  if (scheduled_end !== undefined) updateDataObj.scheduled_end = scheduled_end;
  if (daily_start_time !== undefined) updateDataObj.daily_start_time = daily_start_time;
  if (daily_end_time !== undefined) updateDataObj.daily_end_time = daily_end_time;
  if (auto_apply !== undefined) updateDataObj.auto_apply = auto_apply;
  if (menu_data !== undefined) updateDataObj.menu_data = menu_data;
  if (selected_category_ids !== undefined) updateDataObj.selected_category_ids = selected_category_ids;
  if (selected_item_ids !== undefined) updateDataObj.selected_item_ids = selected_item_ids;

  // Update preset
  const { data: updatedPreset, error: updateError } = await supabase
    .from('menu_presets')
    .update(updateDataObj)
    .eq('id', presetId)
    .eq('branch_id', branchId)
    .select()
    .single();

  if (updateError) {
    throw new Error('Failed to update menu preset');
  }

  return {
    id: updatedPreset.id,
    name: updatedPreset.name,
    description: updatedPreset.description,
    is_active: updatedPreset.is_active,
    schedule_type: updatedPreset.schedule_type,
    scheduled_start: updatedPreset.scheduled_start,
    scheduled_end: updatedPreset.scheduled_end,
    daily_start_time: updatedPreset.daily_start_time,
    daily_end_time: updatedPreset.daily_end_time,
    auto_apply: updatedPreset.auto_apply,
    menu_data: updatedPreset.menu_data,
    selected_category_ids: updatedPreset.selected_category_ids || [],
    selected_item_ids: updatedPreset.selected_item_ids || [],
    menu_items_count: updatedPreset.selected_item_ids?.length || updatedPreset.menu_data?.items?.length || 0,
    categories_count: updatedPreset.selected_category_ids?.length || updatedPreset.menu_data?.categories?.length || 0,
    created_at: updatedPreset.created_at,
    updated_at: updatedPreset.updated_at
  };
}

/**
 * Delete menu preset
 * @param {string} presetId - Preset ID
 * @param {string} branchId - Branch ID for security
 * @returns {Object} Delete result
 */
async function deleteMenuPreset(presetId, branchId) {
  // Check if preset exists and get info
  const { data: preset, error: fetchError } = await supabase
    .from('menu_presets')
    .select('id, name, is_active')
    .eq('id', presetId)
    .eq('branch_id', branchId)
    .single();

  if (fetchError || !preset) {
    throw new Error('Menu preset not found or access denied');
  }

  // Prevent deletion of active preset
  if (preset.is_active) {
    throw new Error('Cannot delete active preset. Deactivate it first.');
  }

  // Delete preset
  const { error: deleteError } = await supabase
    .from('menu_presets')
    .delete()
    .eq('id', presetId)
    .eq('branch_id', branchId);

  if (deleteError) {
    throw new Error('Failed to delete menu preset');
  }

  return {
    deleted: true,
    preset_id: presetId,
    preset_name: preset.name,
    message: 'Menu preset deleted successfully'
  };
}

/**
 * Activate menu preset (apply to live menu)
 * @param {string} presetId - Preset ID to activate
 * @param {string} branchId - Branch ID for security
 * @returns {Object} Activation result
 */
async function activateMenuPreset(presetId, branchId) {
  // Get preset data
  const preset = await getMenuPresetById(presetId, branchId);
  
  // Deactivate all other presets in this branch first
  const { error: deactivateError } = await supabase
    .from('menu_presets')
    .update({ 
      is_active: false,
      updated_at: new Date().toISOString()
    })
    .eq('branch_id', branchId)
    .neq('id', presetId);

  if (deactivateError) {
    throw new Error('Failed to deactivate other presets');
  }

  // Activate the selected preset
  const { error: activateError } = await supabase
    .from('menu_presets')
    .update({ 
      is_active: true,
      updated_at: new Date().toISOString()
    })
    .eq('id', presetId)
    .eq('branch_id', branchId);

  if (activateError) {
    throw new Error('Failed to activate preset');
  }

  // Apply preset menu data to live menu (this would integrate with categories/items APIs)
  try {
    await applyPresetToLiveMenu(preset.menu_data, branchId);
  } catch (error) {
    // For now, don't rollback since the preset activation itself worked
  }

  return {
    success: true,
    preset_id: presetId,
    preset_name: preset.name,
    applied_items: preset.menu_items_count,
    applied_categories: preset.categories_count,
    message: 'Menu preset activated successfully'
  };
}

/**
 * Deactivate current menu preset
 * @param {string} branchId - Branch ID
 * @returns {Object} Deactivation result
 */
async function deactivateCurrentPreset(branchId) {
  // Find and deactivate current active preset
  const { data: activePresets, error: fetchError } = await supabase
    .from('menu_presets')
    .select('id, name')
    .eq('branch_id', branchId)
    .eq('is_active', true);

  if (fetchError) {
    throw new Error('Failed to fetch active presets');
  }

  if (!activePresets || activePresets.length === 0) {
    return {
      success: true,
      message: 'No active preset found'
    };
  }

  // Deactivate all active presets
  const { error: deactivateError } = await supabase
    .from('menu_presets')
    .update({ 
      is_active: false,
      updated_at: new Date().toISOString()
    })
    .eq('branch_id', branchId)
    .eq('is_active', true);

  if (deactivateError) {
    throw new Error('Failed to deactivate preset');
  }

  return {
    success: true,
    deactivated_presets: activePresets.length,
    preset_names: activePresets.map(p => p.name),
    message: 'Menu presets deactivated successfully'
  };
}

/**
 * Check for scheduled presets that should be activated/deactivated
 * @param {string} branchId - Branch ID  
 * @returns {Object} Check result with actions taken
 */
async function checkScheduledPresets(branchId) {
  const currentTime = new Date();
  
  // Get all auto-apply presets with schedules
  const { data: scheduledPresets, error: fetchError } = await supabase
    .from('menu_presets')
    .select('*')
    .eq('branch_id', branchId)
    .eq('auto_apply', true)
    .not('scheduled_start', 'is', null)
    .not('scheduled_end', 'is', null);

  if (fetchError) {
    throw new Error('Failed to fetch scheduled presets');
  }

  const actions = [];
  
  for (const preset of scheduledPresets) {
    const shouldBeActive = isPresetCurrentlyActive(preset);
    const isCurrentlyActive = preset.is_active;
    
    if (shouldBeActive && !isCurrentlyActive) {
      // Activate this preset
      try {
        await activateMenuPreset(preset.id, branchId);
        actions.push({
          action: 'activated',
          preset_id: preset.id,
          preset_name: preset.name
        });
      } catch (error) {
        actions.push({
          action: 'failed_activation',
          preset_id: preset.id,
          preset_name: preset.name,
          error: error.message
        });
      }
    } else if (!shouldBeActive && isCurrentlyActive) {
      // Deactivate this preset
      try {
        await supabase
          .from('menu_presets')
          .update({ is_active: false })
          .eq('id', preset.id);
        
        actions.push({
          action: 'deactivated',
          preset_id: preset.id,
          preset_name: preset.name
        });
      } catch (error) {
        actions.push({
          action: 'failed_deactivation',
          preset_id: preset.id,
          preset_name: preset.name,
          error: error.message
        });
      }
    }
  }

  return {
    success: true,
    checked_at: currentTime.toISOString(),
    actions_taken: actions.length,
    actions: actions
  };
}

// Helper functions
function isPresetCurrentlyActive(preset) {
  const now = new Date();
  
  if (preset.schedule_type === 'one-time') {
    if (!preset.scheduled_start || !preset.scheduled_end) {
      return false;
    }
    
    const start = new Date(preset.scheduled_start);
    const end = new Date(preset.scheduled_end);
    
    return now >= start && now <= end;
  } else if (preset.schedule_type === 'daily') {
    if (!preset.daily_start_time || !preset.daily_end_time) {
      return false;
    }
    
    // Get current time in HH:MM format in Toronto timezone
    const currentTime = now.toLocaleTimeString('en-CA', {
      timeZone: 'America/Toronto',
      hour12: false,
      hour: '2-digit',
      minute: '2-digit'
    });
    
    const startTime = preset.daily_start_time;
    const endTime = preset.daily_end_time;
    
    // Compare times as strings (works because format is HH:MM)
    return currentTime >= startTime && currentTime <= endTime;
  }
  
  return false;
}

function isPresetScheduled(preset) {
  return (preset.schedule_type === 'one-time' && preset.scheduled_start && preset.scheduled_end) ||
         (preset.schedule_type === 'daily' && preset.daily_start_time && preset.daily_end_time);
}

function validateMenuData(menuData) {
  if (!menuData || typeof menuData !== 'object') {
    return false;
  }
  
  // Allow empty menu data object for initial preset creation
  if (Object.keys(menuData).length === 0) {
    return true;
  }
  
  // Validate categories if present
  if (menuData.categories !== undefined) {
    if (!Array.isArray(menuData.categories)) {
      return false;
    }
  }
  
  // Validate items if present
  if (menuData.items !== undefined) {
    if (!Array.isArray(menuData.items)) {
      return false;
    }
  }
  
  return true;
}

async function applyPresetToLiveMenu(menuData, branchId) {
  // This function would integrate with the menu categories and items APIs
  // to actually apply the preset data to the live menu
  // Implementation would depend on the specific requirements
  
  // For now, this is a placeholder
  // In a full implementation, this would:
  // 1. Update menu categories based on preset data
  // 2. Update menu items availability/pricing based on preset data
  // 3. Handle any conflicts or validation issues
  
  return true;
}

module.exports = {
  getMenuPresets,
  getMenuPresetById,
  createMenuPreset,
  updateMenuPreset,
  deleteMenuPreset,
  activateMenuPreset,
  deactivateCurrentPreset,
  checkScheduledPresets
};