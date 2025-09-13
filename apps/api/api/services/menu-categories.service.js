// =====================================================
// MENU CATEGORIES SERVICE
// All menu categories business logic and database operations
// =====================================================

const { createClient } = require('@supabase/supabase-js');

// Create Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Get all categories for a branch with optional item counts
 * @param {string} branchId - Branch ID
 * @param {Object} options - Query options
 * @returns {Object} Categories list
 */
async function getCategories(branchId, options = {}) {
  const { includeItems = false, includeInactive = false } = options;
  
  // Build query - get categories with optional items
  let query = supabase
    .from('menu_categories')
    .select(includeItems ? `
      id,
      name,
      description,
      display_order,
      is_active,
      icon,
      created_at,
      updated_at,
      menu_items (
        id,
        name,
        description,
        price,
        image_url,
        is_available,
        display_order,
        allergens,
        dietary_info,
        preparation_time
      )
    ` : '*')
    .eq('branch_id', branchId)
    .order('display_order', { ascending: true });

  // Filter by active status if needed
  if (!includeInactive) {
    query = query.eq('is_active', true);
  }

  const { data: categories, error } = await query;

  if (error) {
    console.error('Categories fetch error:', error);
    throw new Error(`Failed to fetch categories: ${error.message}`);
  }

  // Format response with item counts
  const formattedCategories = (categories || []).map(category => ({
    id: category.id,
    name: category.name,
    description: category.description,
    display_order: category.display_order,
    is_active: category.is_active,
    icon: category.icon,
    created_at: category.created_at,
    updated_at: category.updated_at,
    items: category.menu_items || [],
    item_count: category.menu_items ? category.menu_items.length : 0,
    available_item_count: category.menu_items ? 
      category.menu_items.filter(item => item.is_available).length : 0
  }));

  return {
    data: formattedCategories,
    meta: {
      total: formattedCategories.length,
      active: formattedCategories.filter(cat => cat.is_active).length,
      inactive: formattedCategories.filter(cat => !cat.is_active).length
    }
  };
}

/**
 * Get single category by ID
 * @param {string} categoryId - Category ID
 * @param {string} branchId - Branch ID for security
 * @returns {Object} Category data
 */
async function getCategoryById(categoryId, branchId) {
  const { data: category, error } = await supabase
    .from('menu_categories')
    .select(`
      id,
      name,
      description,
      display_order,
      is_active,
      icon,
      created_at,
      updated_at,
      menu_items (
        id,
        name,
        description,
        price,
        image_url,
        is_available,
        display_order,
        allergens,
        dietary_info
      )
    `)
    .eq('id', categoryId)
    .eq('branch_id', branchId)
    .single();

  if (error || !category) {
    throw new Error('Category not found or access denied');
  }

  return {
    id: category.id,
    name: category.name,
    description: category.description,
    display_order: category.display_order,
    is_active: category.is_active,
    icon: category.icon,
    created_at: category.created_at,
    updated_at: category.updated_at,
    items: category.menu_items || [],
    item_count: category.menu_items ? category.menu_items.length : 0
  };
}

/**
 * Create new category
 * @param {Object} categoryData - Category creation data
 * @param {string} branchId - Branch ID
 * @returns {Object} Created category
 */
async function createCategory(categoryData, branchId) {
  const { name, description, display_order, icon } = categoryData;
  
  // Validation
  if (!name || name.trim().length === 0) {
    throw new Error('Category name is required');
  }
  
  if (name.length > 100) {
    throw new Error('Category name must be 100 characters or less');
  }

  // Auto-increment display_order if not provided
  let finalDisplayOrder = display_order;
  if (!finalDisplayOrder) {
    const { data: maxOrderData } = await supabase
      .from('menu_categories')
      .select('display_order')
      .eq('branch_id', branchId)
      .order('display_order', { ascending: false })
      .limit(1);
    
    finalDisplayOrder = (maxOrderData && maxOrderData[0]) ? 
      maxOrderData[0].display_order + 1 : 1;
  }

  // Create category
  const categoryDataObj = {
    branch_id: branchId,
    name: name.trim(),
    description: description ? description.trim() : null,
    display_order: finalDisplayOrder,
    is_active: true,
    icon: icon || null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  const { data: createdCategory, error: createError } = await supabase
    .from('menu_categories')
    .insert(categoryDataObj)
    .select()
    .single();

  if (createError) {
    console.error('Category creation error:', createError);
    throw new Error('Failed to create category');
  }

  return {
    id: createdCategory.id,
    name: createdCategory.name,
    description: createdCategory.description,
    display_order: createdCategory.display_order,
    is_active: createdCategory.is_active,
    icon: createdCategory.icon,
    created_at: createdCategory.created_at,
    updated_at: createdCategory.updated_at,
    items: [],
    item_count: 0
  };
}

/**
 * Update existing category
 * @param {string} categoryId - Category ID
 * @param {Object} updateData - Update data
 * @param {string} branchId - Branch ID for security
 * @returns {Object} Updated category
 */
async function updateCategory(categoryId, updateData, branchId) {
  const { name, description, display_order, is_active, icon } = updateData;
  
  // Validation
  if (name !== undefined) {
    if (!name || name.trim().length === 0) {
      throw new Error('Category name cannot be empty');
    }
    if (name.length > 100) {
      throw new Error('Category name must be 100 characters or less');
    }
  }

  // Check if category exists and belongs to branch
  const { data: existingCategory, error: fetchError } = await supabase
    .from('menu_categories')
    .select('id, name')
    .eq('id', categoryId)
    .eq('branch_id', branchId)
    .single();

  if (fetchError || !existingCategory) {
    throw new Error('Category not found or access denied');
  }

  // Prepare update data
  const updateDataObj = {
    updated_at: new Date().toISOString()
  };

  if (name !== undefined) updateDataObj.name = name.trim();
  if (description !== undefined) updateDataObj.description = description ? description.trim() : null;
  if (display_order !== undefined) updateDataObj.display_order = display_order;
  if (is_active !== undefined) updateDataObj.is_active = is_active;
  if (icon !== undefined) updateDataObj.icon = icon;

  // Update category
  const { data: updatedCategory, error: updateError } = await supabase
    .from('menu_categories')
    .update(updateDataObj)
    .eq('id', categoryId)
    .eq('branch_id', branchId)
    .select()
    .single();

  if (updateError) {
    console.error('Category update error:', updateError);
    throw new Error('Failed to update category');
  }

  return {
    id: updatedCategory.id,
    name: updatedCategory.name,
    description: updatedCategory.description,
    display_order: updatedCategory.display_order,
    is_active: updatedCategory.is_active,
    icon: updatedCategory.icon,
    created_at: updatedCategory.created_at,
    updated_at: updatedCategory.updated_at
  };
}

/**
 * Toggle category availability
 * @param {string} categoryId - Category ID
 * @param {string} branchId - Branch ID for security
 * @returns {Object} Updated category with new status
 */
async function toggleCategoryAvailability(categoryId, branchId) {
  // Get current status
  const { data: category, error: fetchError } = await supabase
    .from('menu_categories')
    .select('id, is_active')
    .eq('id', categoryId)
    .eq('branch_id', branchId)
    .single();

  if (fetchError || !category) {
    throw new Error('Category not found or access denied');
  }

  const newStatus = !category.is_active;

  // Update category status
  const { data: updatedCategory, error: updateError } = await supabase
    .from('menu_categories')
    .update({ 
      is_active: newStatus,
      updated_at: new Date().toISOString()
    })
    .eq('id', categoryId)
    .eq('branch_id', branchId)
    .select()
    .single();

  if (updateError) {
    console.error('Category toggle error:', updateError);
    throw new Error('Failed to toggle category availability');
  }

  // Optional: Also disable all items in category when category is disabled
  if (!newStatus) {
    await supabase
      .from('menu_items')
      .update({ 
        is_available: false,
        updated_at: new Date().toISOString()
      })
      .eq('category_id', categoryId)
      .eq('branch_id', branchId);
  }

  return {
    id: updatedCategory.id,
    name: updatedCategory.name,
    is_active: updatedCategory.is_active,
    previous_status: category.is_active,
    updated_at: updatedCategory.updated_at,
    message: newStatus ? 'Category activated' : 'Category deactivated'
  };
}

/**
 * Delete category (soft delete or move items to uncategorized)
 * @param {string} categoryId - Category ID
 * @param {string} branchId - Branch ID for security
 * @param {Object} options - Delete options
 * @returns {Object} Delete result
 */
async function deleteCategory(categoryId, branchId, options = {}) {
  const { forceDelete = false } = options;
  
  // Check if category exists and get item count
  const { data: category, error: fetchError } = await supabase
    .from('menu_categories')
    .select(`
      id,
      name,
      menu_items (id)
    `)
    .eq('id', categoryId)
    .eq('branch_id', branchId)
    .single();

  if (fetchError || !category) {
    throw new Error('Category not found or access denied');
  }

  const itemCount = category.menu_items ? category.menu_items.length : 0;

  if (itemCount > 0 && !forceDelete) {
    throw new Error(`Cannot delete category with ${itemCount} items. Move items first or use forceDelete option.`);
  }

  // If category has items, set their category_id to null (uncategorized)
  if (itemCount > 0) {
    const { error: itemsUpdateError } = await supabase
      .from('menu_items')
      .update({ 
        category_id: null,
        updated_at: new Date().toISOString()
      })
      .eq('category_id', categoryId)
      .eq('branch_id', branchId);

    if (itemsUpdateError) {
      console.error('Failed to uncategorize items:', itemsUpdateError);
      throw new Error('Failed to move items to uncategorized');
    }
  }

  // Delete category
  const { error: deleteError } = await supabase
    .from('menu_categories')
    .delete()
    .eq('id', categoryId)
    .eq('branch_id', branchId);

  if (deleteError) {
    console.error('Category delete error:', deleteError);
    throw new Error('Failed to delete category');
  }

  return {
    deleted: true,
    category_id: categoryId,
    category_name: category.name,
    items_moved: itemCount,
    message: itemCount > 0 ? 
      `Category deleted and ${itemCount} items moved to uncategorized` :
      'Category deleted successfully'
  };
}

/**
 * Reorder categories (drag & drop support)
 * @param {Array} reorderData - Array of {id, display_order} objects
 * @param {string} branchId - Branch ID for security
 * @returns {Object} Reorder result
 */
async function reorderCategories(reorderData, branchId) {
  if (!Array.isArray(reorderData) || reorderData.length === 0) {
    throw new Error('Reorder data must be a non-empty array');
  }

  // Validate all categories belong to branch
  const categoryIds = reorderData.map(item => item.id);
  const { data: existingCategories, error: fetchError } = await supabase
    .from('menu_categories')
    .select('id')
    .eq('branch_id', branchId)
    .in('id', categoryIds);

  if (fetchError) {
    throw new Error('Failed to validate categories');
  }

  if (existingCategories.length !== categoryIds.length) {
    throw new Error('Some categories not found or access denied');
  }

  // Update display orders in transaction-like manner
  const updatePromises = reorderData.map(item => 
    supabase
      .from('menu_categories')
      .update({ 
        display_order: item.display_order,
        updated_at: new Date().toISOString()
      })
      .eq('id', item.id)
      .eq('branch_id', branchId)
  );

  try {
    await Promise.all(updatePromises);
  } catch (error) {
    console.error('Reorder error:', error);
    throw new Error('Failed to reorder categories');
  }

  return {
    success: true,
    updated: reorderData.length,
    message: `${reorderData.length} categories reordered successfully`
  };
}

module.exports = {
  getCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  toggleCategoryAvailability,
  deleteCategory,
  reorderCategories
};