// =====================================================
// MENU ITEMS SERVICE
// All menu items business logic and database operations
// Advanced features: Photo upload, variants, bulk ops, filtering
// =====================================================

const { createClient } = require('@supabase/supabase-js');

// Create Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Get menu items with advanced filtering and search
 * @param {string} branchId - Branch ID
 * @param {Object} filters - Filter options
 * @returns {Object} Items list with metadata
 */
async function getMenuItems(branchId, filters = {}) {
  const { 
    categoryId, 
    search, 
    isAvailable, 
    priceMin, 
    priceMax,
    allergens,
    dietaryInfo,
    includeVariants = false,
    page = 1,
    limit = 50,
    sortBy = 'display_order',
    sortOrder = 'asc'
  } = filters;
  
  // Input validation
  const pageNum = Math.max(1, parseInt(page) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 50));
  const offset = (pageNum - 1) * limitNum;

  // Build base query with category info
  let query = supabase
    .from('menu_items')
    .select(includeVariants ? `
      id,
      name,
      description,
      price,
      image_url,
      allergens,
      dietary_info,
      preparation_time,
      is_available,
      display_order,
      category_id,
      created_at,
      updated_at,
      menu_categories (
        id,
        name,
        is_active
      ),
      menu_item_variants (
        id,
        name,
        price_modifier,
        is_default,
        display_order
      )
    ` : `
      id,
      name,
      description,
      price,
      image_url,
      allergens,
      dietary_info,
      preparation_time,
      is_available,
      display_order,
      category_id,
      created_at,
      updated_at,
      menu_categories (
        id,
        name,
        is_active
      )
    `)
    .eq('branch_id', branchId);

  // Apply filters
  if (categoryId) {
    query = query.eq('category_id', categoryId);
  }

  if (search) {
    query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
  }

  if (isAvailable !== undefined) {
    query = query.eq('is_available', isAvailable);
  }

  if (priceMin !== undefined) {
    query = query.gte('price', parseFloat(priceMin));
  }

  if (priceMax !== undefined) {
    query = query.lte('price', parseFloat(priceMax));
  }

  if (allergens && allergens.length > 0) {
    query = query.contains('allergens', allergens);
  }

  if (dietaryInfo && dietaryInfo.length > 0) {
    query = query.contains('dietary_info', dietaryInfo);
  }

  // Apply sorting
  const validSortColumns = ['name', 'price', 'display_order', 'created_at'];
  const sortColumn = validSortColumns.includes(sortBy) ? sortBy : 'display_order';
  const sortDirection = sortOrder === 'desc' ? false : true;
  
  query = query.order(sortColumn, { ascending: sortDirection });

  // Get total count for pagination
  let countQuery = supabase
    .from('menu_items')
    .select('id', { count: 'exact', head: true })
    .eq('branch_id', branchId);

  // Apply same filters to count query
  if (categoryId) countQuery = countQuery.eq('category_id', categoryId);
  if (search) countQuery = countQuery.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
  if (isAvailable !== undefined) countQuery = countQuery.eq('is_available', isAvailable);
  if (priceMin !== undefined) countQuery = countQuery.gte('price', parseFloat(priceMin));
  if (priceMax !== undefined) countQuery = countQuery.lte('price', parseFloat(priceMax));

  // Execute queries in parallel
  const [itemsResult, countResult] = await Promise.all([
    query.range(offset, offset + limitNum - 1),
    countQuery
  ]);

  if (itemsResult.error) {
    console.error('Menu items fetch error:', itemsResult.error);
    throw new Error(`Failed to fetch menu items: ${itemsResult.error.message}`);
  }

  // Format response
  const formattedItems = (itemsResult.data || []).map(item => ({
    id: item.id,
    name: item.name,
    description: item.description,
    price: parseFloat(item.price || 0),
    image_url: item.image_url,
    allergens: item.allergens || [],
    dietary_info: item.dietary_info || [],
    preparation_time: item.preparation_time,
    is_available: item.is_available,
    display_order: item.display_order,
    category: item.menu_categories ? {
      id: item.menu_categories.id,
      name: item.menu_categories.name,
      is_active: item.menu_categories.is_active
    } : null,
    variants: item.menu_item_variants || [],
    created_at: item.created_at,
    updated_at: item.updated_at
  }));

  const totalCount = countResult.count || 0;
  
  return {
    data: formattedItems,
    meta: { 
      total: totalCount,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(totalCount / limitNum),
      hasNextPage: pageNum * limitNum < totalCount,
      hasPreviousPage: pageNum > 1,
      available: formattedItems.filter(item => item.is_available).length,
      unavailable: formattedItems.filter(item => !item.is_available).length
    }
  };
}

/**
 * Get single menu item by ID with variants
 * @param {string} itemId - Item ID
 * @param {string} branchId - Branch ID for security
 * @returns {Object} Item data with variants
 */
async function getMenuItemById(itemId, branchId) {
  const { data: item, error } = await supabase
    .from('menu_items')
    .select(`
      id,
      name,
      description,
      price,
      image_url,
      allergens,
      dietary_info,
      preparation_time,
      is_available,
      display_order,
      category_id,
      created_at,
      updated_at,
      menu_categories (
        id,
        name,
        is_active
      ),
      menu_item_variants (
        id,
        name,
        price_modifier,
        is_default,
        display_order
      )
    `)
    .eq('id', itemId)
    .eq('branch_id', branchId)
    .single();

  if (error || !item) {
    throw new Error('Menu item not found or access denied');
  }

  return {
    id: item.id,
    name: item.name,
    description: item.description,
    price: parseFloat(item.price || 0),
    image_url: item.image_url,
    allergens: item.allergens || [],
    dietary_info: item.dietary_info || [],
    preparation_time: item.preparation_time,
    is_available: item.is_available,
    display_order: item.display_order,
    category: item.menu_categories ? {
      id: item.menu_categories.id,
      name: item.menu_categories.name,
      is_active: item.menu_categories.is_active
    } : null,
    variants: (item.menu_item_variants || []).sort((a, b) => a.display_order - b.display_order),
    created_at: item.created_at,
    updated_at: item.updated_at
  };
}

/**
 * Create new menu item with optional photo upload
 * @param {Object} itemData - Item creation data
 * @param {string} branchId - Branch ID
 * @param {Object} photo - Optional photo file data
 * @returns {Object} Created item
 */
async function createMenuItem(itemData, branchId, photo = null) {
  const { 
    name, 
    description, 
    price, 
    category_id, 
    allergens = [], 
    dietary_info = [], 
    preparation_time,
    display_order,
    variants = [],
    image_url = null
  } = itemData;
  
  // Validation
  if (!name || name.trim().length === 0) {
    throw new Error('Menu item name is required');
  }
  
  if (!price || price < 0) {
    throw new Error('Valid price is required');
  }

  if (name.length > 200) {
    throw new Error('Item name must be 200 characters or less');
  }

  // Validate category exists and belongs to branch if provided
  if (category_id) {
    const { data: category, error: categoryError } = await supabase
      .from('menu_categories')
      .select('id')
      .eq('id', category_id)
      .eq('branch_id', branchId)
      .single();

    if (categoryError || !category) {
      throw new Error('Category not found or access denied');
    }
  }

  // Handle photo upload if provided (legacy multer support)
  let imageUrl = image_url; // Use frontend-provided image_url first
  if (photo && photo.buffer && photo.mimetype) {
    try {
      // Upload to Supabase Storage
      const fileExtension = photo.mimetype.split('/')[1];
      const fileName = `menu-items/${branchId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExtension}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('menu-images')
        .upload(fileName, photo.buffer, {
          contentType: photo.mimetype,
          upsert: false
        });

      if (uploadError) {
        console.error('Photo upload error:', uploadError);
        throw new Error('Failed to upload photo');
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('menu-images')
        .getPublicUrl(fileName);
      
      imageUrl = urlData.publicUrl;
    } catch (error) {
      console.error('Photo processing error:', error);
      throw new Error('Failed to process photo upload');
    }
  }

  // Auto-increment display_order if not provided
  let finalDisplayOrder = display_order;
  if (!finalDisplayOrder) {
    const { data: maxOrderData } = await supabase
      .from('menu_items')
      .select('display_order')
      .eq('branch_id', branchId)
      .eq('category_id', category_id || null)
      .order('display_order', { ascending: false })
      .limit(1);
    
    finalDisplayOrder = (maxOrderData && maxOrderData[0]) ? 
      maxOrderData[0].display_order + 1 : 1;
  }

  // Create menu item
  const itemDataObj = {
    branch_id: branchId,
    category_id: category_id || null,
    name: name.trim(),
    description: description ? description.trim() : null,
    price: parseFloat(price),
    image_url: imageUrl,
    allergens: Array.isArray(allergens) ? allergens : [],
    dietary_info: Array.isArray(dietary_info) ? dietary_info : [],
    preparation_time: preparation_time ? parseInt(preparation_time) : null,
    is_available: true,
    display_order: finalDisplayOrder,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  const { data: createdItem, error: createError } = await supabase
    .from('menu_items')
    .insert(itemDataObj)
    .select()
    .single();

  if (createError) {
    console.error('Menu item creation error:', createError);
    throw new Error('Failed to create menu item');
  }

  // Create variants if provided
  if (variants && variants.length > 0) {
    const variantData = variants.map((variant, index) => ({
      menu_item_id: createdItem.id,
      name: variant.name,
      price_modifier: parseFloat(variant.price_modifier || 0),
      is_default: variant.is_default || false,
      display_order: variant.display_order || index + 1
    }));

    const { error: variantError } = await supabase
      .from('menu_item_variants')
      .insert(variantData);

    if (variantError) {
      console.error('Variant creation error:', variantError);
      // Don't fail the item creation, just log the error
    }
  }

  return {
    id: createdItem.id,
    name: createdItem.name,
    description: createdItem.description,
    price: parseFloat(createdItem.price),
    image_url: createdItem.image_url,
    allergens: createdItem.allergens || [],
    dietary_info: createdItem.dietary_info || [],
    preparation_time: createdItem.preparation_time,
    is_available: createdItem.is_available,
    display_order: createdItem.display_order,
    category_id: createdItem.category_id,
    variants: variants || [],
    created_at: createdItem.created_at,
    updated_at: createdItem.updated_at
  };
}

/**
 * Update menu item with optional photo upload
 * @param {string} itemId - Item ID
 * @param {Object} updateData - Update data
 * @param {string} branchId - Branch ID for security
 * @param {Object} photo - Optional photo file data
 * @returns {Object} Updated item
 */
async function updateMenuItem(itemId, updateData, branchId, photo = null) {
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
  } = updateData;
  
  // Validation
  if (name !== undefined) {
    if (!name || name.trim().length === 0) {
      throw new Error('Menu item name cannot be empty');
    }
    if (name.length > 200) {
      throw new Error('Item name must be 200 characters or less');
    }
  }

  if (price !== undefined && (price < 0)) {
    throw new Error('Price cannot be negative');
  }

  // Check if item exists and belongs to branch
  const { data: existingItem, error: fetchError } = await supabase
    .from('menu_items')
    .select('id, name, image_url, category_id')
    .eq('id', itemId)
    .eq('branch_id', branchId)
    .single();

  if (fetchError || !existingItem) {
    throw new Error('Menu item not found or access denied');
  }

  // Validate category if being updated (skip validation for "none", null, undefined, empty string)
  if (category_id !== undefined && category_id !== null && category_id !== '' && category_id !== 'none') {
    const { data: category, error: categoryError } = await supabase
      .from('menu_categories')
      .select('id')
      .eq('id', category_id)
      .eq('branch_id', branchId)
      .single();

    if (categoryError || !category) {
      throw new Error('Category not found or access denied');
    }
  }

  // Handle photo upload if provided
  let imageUrl = undefined; // undefined means don't update
  if (photo && photo.buffer && photo.mimetype) {
    try {
      // Delete old image if exists
      if (existingItem.image_url) {
        try {
          const oldFileName = existingItem.image_url.split('/').pop();
          await supabase.storage
            .from('menu-images')
            .remove([`menu-items/${branchId}/${oldFileName}`]);
        } catch (deleteError) {
          console.warn('Failed to delete old image:', deleteError);
        }
      }

      // Upload new image
      const fileExtension = photo.mimetype.split('/')[1];
      const fileName = `menu-items/${branchId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExtension}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('menu-images')
        .upload(fileName, photo.buffer, {
          contentType: photo.mimetype,
          upsert: false
        });

      if (uploadError) {
        console.error('Photo upload error:', uploadError);
        throw new Error('Failed to upload photo');
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('menu-images')
        .getPublicUrl(fileName);
      
      imageUrl = urlData.publicUrl;
    } catch (error) {
      console.error('Photo processing error:', error);
      throw new Error('Failed to process photo upload');
    }
  }

  // Prepare update data
  const updateDataObj = {
    updated_at: new Date().toISOString()
  };

  if (name !== undefined) updateDataObj.name = name.trim();
  if (description !== undefined) updateDataObj.description = description ? description.trim() : null;
  if (price !== undefined) updateDataObj.price = parseFloat(price);
  if (category_id !== undefined) updateDataObj.category_id = category_id === '' || category_id === 'none' ? null : category_id;
  if (allergens !== undefined) updateDataObj.allergens = Array.isArray(allergens) ? allergens : [];
  if (dietary_info !== undefined) updateDataObj.dietary_info = Array.isArray(dietary_info) ? dietary_info : [];
  if (preparation_time !== undefined) updateDataObj.preparation_time = preparation_time ? parseInt(preparation_time) : null;
  if (display_order !== undefined) updateDataObj.display_order = display_order;
  if (is_available !== undefined) updateDataObj.is_available = is_available;
  if (imageUrl !== undefined) updateDataObj.image_url = imageUrl;

  // Update menu item
  const { data: updatedItem, error: updateError } = await supabase
    .from('menu_items')
    .update(updateDataObj)
    .eq('id', itemId)
    .eq('branch_id', branchId)
    .select()
    .single();

  if (updateError) {
    console.error('Menu item update error:', updateError);
    throw new Error('Failed to update menu item');
  }

  return {
    id: updatedItem.id,
    name: updatedItem.name,
    description: updatedItem.description,
    price: parseFloat(updatedItem.price),
    image_url: updatedItem.image_url,
    allergens: updatedItem.allergens || [],
    dietary_info: updatedItem.dietary_info || [],
    preparation_time: updatedItem.preparation_time,
    is_available: updatedItem.is_available,
    display_order: updatedItem.display_order,
    category_id: updatedItem.category_id,
    created_at: updatedItem.created_at,
    updated_at: updatedItem.updated_at
  };
}

/**
 * Toggle menu item availability
 * @param {string} itemId - Item ID
 * @param {string} branchId - Branch ID for security
 * @returns {Object} Updated item with new status
 */
async function toggleMenuItemAvailability(itemId, branchId) {
  // Get current status
  const { data: item, error: fetchError } = await supabase
    .from('menu_items')
    .select('id, name, is_available')
    .eq('id', itemId)
    .eq('branch_id', branchId)
    .single();

  if (fetchError || !item) {
    throw new Error('Menu item not found or access denied');
  }

  const newStatus = !item.is_available;

  // Update item status
  const { data: updatedItem, error: updateError } = await supabase
    .from('menu_items')
    .update({ 
      is_available: newStatus,
      updated_at: new Date().toISOString()
    })
    .eq('id', itemId)
    .eq('branch_id', branchId)
    .select()
    .single();

  if (updateError) {
    console.error('Item toggle error:', updateError);
    throw new Error('Failed to toggle item availability');
  }

  return {
    id: updatedItem.id,
    name: updatedItem.name,
    is_available: updatedItem.is_available,
    previous_status: item.is_available,
    updated_at: updatedItem.updated_at,
    message: newStatus ? 'Item available' : 'Item unavailable'
  };
}

/**
 * Delete menu item with photo cleanup
 * @param {string} itemId - Item ID
 * @param {string} branchId - Branch ID for security
 * @returns {Object} Delete result
 */
async function deleteMenuItem(itemId, branchId) {
  // Check if item exists and get photo info
  const { data: item, error: fetchError } = await supabase
    .from('menu_items')
    .select('id, name, image_url')
    .eq('id', itemId)
    .eq('branch_id', branchId)
    .single();

  if (fetchError || !item) {
    throw new Error('Menu item not found or access denied');
  }

  // Delete item (variants will be deleted automatically due to CASCADE)
  const { error: deleteError } = await supabase
    .from('menu_items')
    .delete()
    .eq('id', itemId)
    .eq('branch_id', branchId);

  if (deleteError) {
    console.error('Menu item delete error:', deleteError);
    throw new Error('Failed to delete menu item');
  }

  // Clean up photo if exists
  if (item.image_url) {
    try {
      const fileName = item.image_url.split('/').pop();
      await supabase.storage
        .from('menu-images')
        .remove([`menu-items/${branchId}/${fileName}`]);
    } catch (photoError) {
      console.warn('Failed to delete item photo:', photoError);
      // Don't fail the deletion for photo cleanup issues
    }
  }

  return {
    deleted: true,
    item_id: itemId,
    item_name: item.name,
    photo_deleted: !!item.image_url,
    message: 'Menu item deleted successfully'
  };
}

/**
 * Duplicate menu item with optional modifications
 * @param {string} itemId - Source item ID
 * @param {string} branchId - Branch ID for security
 * @param {Object} modifications - Optional modifications for the duplicate
 * @returns {Object} Created duplicate item
 */
async function duplicateMenuItem(itemId, branchId, modifications = {}) {
  // Get source item with variants
  const sourceItem = await getMenuItemById(itemId, branchId);
  
  // Prepare duplicate data
  const duplicateData = {
    name: modifications.name || `${sourceItem.name} (Copy)`,
    description: modifications.description !== undefined ? modifications.description : sourceItem.description,
    price: modifications.price !== undefined ? modifications.price : sourceItem.price,
    category_id: modifications.category_id !== undefined ? modifications.category_id : sourceItem.category?.id,
    allergens: modifications.allergens !== undefined ? modifications.allergens : sourceItem.allergens,
    dietary_info: modifications.dietary_info !== undefined ? modifications.dietary_info : sourceItem.dietary_info,
    preparation_time: modifications.preparation_time !== undefined ? modifications.preparation_time : sourceItem.preparation_time,
    variants: modifications.includeVariants !== false ? sourceItem.variants : []
  };

  // Create duplicate (without photo for now - would need separate endpoint for photo duplication)
  const duplicatedItem = await createMenuItem(duplicateData, branchId);

  return {
    ...duplicatedItem,
    source_item_id: itemId,
    source_item_name: sourceItem.name,
    message: 'Menu item duplicated successfully'
  };
}

/**
 * Reorder menu items within categories (drag & drop support)
 * @param {Array} reorderData - Array of {id, display_order} objects
 * @param {string} branchId - Branch ID for security
 * @returns {Object} Reorder result
 */
async function reorderMenuItems(reorderData, branchId) {
  if (!reorderData || !Array.isArray(reorderData) || reorderData.length === 0) {
    return { success: true, updated: 0, message: 'No items to reorder' };
  }

  // Validate all items belong to branch
  const itemIds = reorderData.map(item => item.id);
  const { data: existingItems, error: fetchError } = await supabase
    .from('menu_items')
    .select('id')
    .eq('branch_id', branchId)
    .in('id', itemIds);

  if (fetchError) {
    console.error('Menu items validation error:', fetchError);
    throw new Error('Failed to validate menu items');
  }

  if (existingItems.length !== itemIds.length) {
    throw new Error('Some menu items not found or access denied');
  }

  // Update display orders
  const updatePromises = reorderData.map(item => 
    supabase
      .from('menu_items')
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
    throw new Error('Failed to reorder menu items');
  }

  return {
    success: true,
    updated: reorderData.length,
    message: `${reorderData.length} menu items reordered successfully`
  };
}

/**
 * Bulk update menu items (availability, pricing, categories)
 * @param {Array} itemIds - Array of item IDs to update
 * @param {string} operation - Type of operation: availability|category|pricing
 * @param {Object} data - Operation-specific data
 * @param {string} branchId - Branch ID for security
 * @returns {Object} Bulk update result
 */
async function bulkUpdateMenuItems(itemIds, operation, data, branchId) {
  // Validate all items belong to branch
  const { data: existingItems, error: fetchError } = await supabase
    .from('menu_items')
    .select('id, name')
    .eq('branch_id', branchId)
    .in('id', itemIds);

  if (fetchError) {
    console.error('Menu items validation error:', fetchError);
    throw new Error('Failed to validate menu items');
  }

  if (existingItems.length !== itemIds.length) {
    throw new Error('Some menu items not found or access denied');
  }

  // Prepare update object based on operation
  let updateObj = { updated_at: new Date().toISOString() };
  let updateCount = 0;

  switch (operation) {
    case 'availability':
      if (typeof data.is_available !== 'boolean') {
        throw new Error('is_available must be boolean for availability operation');
      }
      updateObj.is_available = data.is_available;
      
      const { error: availabilityError } = await supabase
        .from('menu_items')
        .update(updateObj)
        .eq('branch_id', branchId)
        .in('id', itemIds);

      if (availabilityError) {
        console.error('Bulk availability update error:', availabilityError);
        throw new Error('Failed to perform bulk availability update');
      }
      updateCount = itemIds.length;
      break;

    case 'category':
      // Validate category exists if not null
      if (data.category_id !== null) {
        const { data: category, error: categoryError } = await supabase
          .from('menu_categories')
          .select('id')
          .eq('id', data.category_id)
          .eq('branch_id', branchId)
          .single();

        if (categoryError || !category) {
          throw new Error('Category not found or access denied');
        }
      }
      updateObj.category_id = data.category_id;
      
      const { error: categoryError } = await supabase
        .from('menu_items')
        .update(updateObj)
        .eq('branch_id', branchId)
        .in('id', itemIds);

      if (categoryError) {
        console.error('Bulk category update error:', categoryError);
        throw new Error('Failed to perform bulk category update');
      }
      updateCount = itemIds.length;
      break;

    case 'pricing':
      if (data.price_adjustment_type === 'percentage') {
        if (typeof data.adjustment !== 'number') {
          throw new Error('adjustment must be a number for percentage pricing');
        }

        // Get current prices and calculate new ones
        const { data: items, error: priceError } = await supabase
          .from('menu_items')
          .select('id, price')
          .eq('branch_id', branchId)
          .in('id', itemIds);

        if (priceError) {
          console.error('Price fetch error:', priceError);
          throw new Error('Failed to fetch current prices');
        }

        // Update each item with calculated percentage
        const updatePromises = items.map(item => {
          const newPrice = parseFloat(item.price) * (1 + data.adjustment / 100);
          return supabase
            .from('menu_items')
            .update({ 
              price: Math.max(0, newPrice), // Ensure price doesn't go negative
              updated_at: new Date().toISOString()
            })
            .eq('id', item.id)
            .eq('branch_id', branchId);
        });

        await Promise.all(updatePromises);
        updateCount = items.length;
      } else if (data.price_adjustment_type === 'fixed') {
        if (typeof data.new_price !== 'number' || data.new_price < 0) {
          throw new Error('new_price must be a positive number for fixed pricing');
        }
        updateObj.price = data.new_price;
        
        const { error: pricingError } = await supabase
          .from('menu_items')
          .update(updateObj)
          .eq('branch_id', branchId)
          .in('id', itemIds);

        if (pricingError) {
          console.error('Bulk pricing update error:', pricingError);
          throw new Error('Failed to perform bulk pricing update');
        }
        updateCount = itemIds.length;
      } else {
        throw new Error('price_adjustment_type must be percentage or fixed');
      }
      break;

    default:
      throw new Error('Invalid bulk operation type');
  }

  return {
    success: true,
    operation: operation,
    updated: updateCount,
    message: `${updateCount} menu items updated successfully`
  };
}

module.exports = {
  getMenuItems,
  getMenuItemById,
  createMenuItem,
  updateMenuItem,
  toggleMenuItemAvailability,
  deleteMenuItem,
  duplicateMenuItem,
  reorderMenuItems,
  bulkUpdateMenuItems
};