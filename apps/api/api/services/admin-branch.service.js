// =====================================================
// ADMIN BRANCH SERVICE
// Business logic for platform admin branch management
// =====================================================

const { createClient } = require('@supabase/supabase-js');

// Create Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Create a new restaurant branch
 */
async function createBranch(branchData, adminUserId) {
  // Validation - Branch data
  if (!branchData.name?.trim()) {
    throw new Error('Branch name is required');
  }

  if (!branchData.slug?.trim()) {
    throw new Error('Branch slug is required');
  }

  if (!branchData.chain_id?.trim()) {
    throw new Error('Chain ID is required');
  }

  if (!branchData.address?.trim()) {
    throw new Error('Branch address is required');
  }

  // Validate slug format (lowercase, alphanumeric, hyphens only)
  const slugRegex = /^[a-z0-9-]+$/;
  if (!slugRegex.test(branchData.slug)) {
    throw new Error('Branch slug must contain only lowercase letters, numbers, and hyphens');
  }

  // Check if chain exists
  const { data: existingChain } = await supabase
    .from('restaurant_chains')
    .select('id, name')
    .eq('id', branchData.chain_id)
    .single();

  if (!existingChain) {
    throw new Error('Chain not found');
  }

  // Check if slug already exists within the same chain
  const { data: existingBranch } = await supabase
    .from('branches')
    .select('id')
    .eq('chain_id', branchData.chain_id)
    .eq('slug', branchData.slug)
    .single();

  if (existingBranch) {
    throw new Error('A branch with this slug already exists in this chain');
  }

  try {
    // Create branch
    const branchInsertData = {
      chain_id: branchData.chain_id,
      name: branchData.name.trim(),
      slug: branchData.slug.trim().toLowerCase(),
      description: branchData.description?.trim() || null,
      address: branchData.address.trim(),
      phone: branchData.phone?.trim() || null,
      email: branchData.email?.trim() || null,
      settings: branchData.settings || {},
      is_active: branchData.is_active !== false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Add coordinates if provided
    if (branchData.coordinates) {
      branchInsertData.location = {
        lat: branchData.coordinates.lat,
        lng: branchData.coordinates.lng
      };
    }

    const { data: newBranch, error: branchError } = await supabase
      .from('branches')
      .insert(branchInsertData)
      .select(`
        *,
        restaurant_chains(id, name, slug)
      `)
      .single();

    if (branchError) {
      throw new Error(`Failed to create branch: ${branchError.message}`);
    }

    console.log('Branch created successfully:', newBranch.id);

    return {
      ...newBranch,
      chain: newBranch.restaurant_chains,
      message: 'Branch created successfully'
    };

  } catch (error) {
    throw error;
  }
}

/**
 * Get all restaurant branches with chain information
 */
async function getAllBranches(filters = {}) {
  let query = supabase
    .from('branches')
    .select(`
      id,
      chain_id,
      name,
      slug,
      description,
      address,
      phone,
      email,
      settings,
      location,
      is_active,
      created_at,
      updated_at,
      restaurant_chains(id, name, slug)
    `);

  // Apply filters
  if (filters.chain_id) {
    query = query.eq('chain_id', filters.chain_id);
  }

  if (filters.isActive !== undefined) {
    query = query.eq('is_active', filters.isActive);
  }

  if (filters.city) {
    query = query.ilike('address', `%${filters.city}%`);
  }

  if (filters.search) {
    query = query.or(`name.ilike.%${filters.search}%,address.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
  }

  // Order by creation date (newest first)
  query = query.order('created_at', { ascending: false });

  const { data: branches, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch branches: ${error.message}`);
  }

  // Format response with chain information
  const branchesWithChains = branches.map(branch => ({
    id: branch.id,
    chain_id: branch.chain_id,
    name: branch.name,
    slug: branch.slug,
    description: branch.description,
    address: branch.address,
    phone: branch.phone,
    email: branch.email,
    settings: branch.settings,
    is_active: branch.is_active,
    created_at: branch.created_at,
    updated_at: branch.updated_at,
    coordinates: branch.location ? {
      lat: branch.location.lat,
      lng: branch.location.lng
    } : null,
    chain: branch.restaurant_chains
  }));

  return branchesWithChains;
}

/**
 * Get a specific restaurant branch by ID
 */
async function getBranchById(branchId) {
  if (!branchId) {
    throw new Error('Branch ID is required');
  }

  const { data: branch, error } = await supabase
    .from('branches')
    .select(`
      id,
      chain_id,
      name,
      slug,
      description,
      address,
      phone,
      email,
      settings,
      location,
      is_active,
      created_at,
      updated_at,
      restaurant_chains(id, name, slug)
    `)
    .eq('id', branchId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      throw new Error('Branch not found');
    }
    throw new Error(`Failed to fetch branch: ${error.message}`);
  }

  return {
    ...branch,
    coordinates: branch.location ? {
      lat: branch.location.lat,
      lng: branch.location.lng
    } : null,
    chain: branch.restaurant_chains
  };
}

/**
 * Update a restaurant branch
 */
async function updateBranch(branchId, updateData, adminUserId) {
  if (!branchId) {
    throw new Error('Branch ID is required');
  }

  // Check if branch exists
  const { data: existingBranch, error: fetchError } = await supabase
    .from('branches')
    .select('id, slug, chain_id')
    .eq('id', branchId)
    .single();

  if (fetchError || !existingBranch) {
    throw new Error('Branch not found');
  }

  // Validate slug if being updated
  if (updateData.slug && updateData.slug !== existingBranch.slug) {
    const slugRegex = /^[a-z0-9-]+$/;
    if (!slugRegex.test(updateData.slug)) {
      throw new Error('Branch slug must contain only lowercase letters, numbers, and hyphens');
    }

    // Check if new slug already exists in the same chain
    const { data: duplicateBranch } = await supabase
      .from('branches')
      .select('id')
      .eq('chain_id', existingBranch.chain_id)
      .eq('slug', updateData.slug)
      .neq('id', branchId)
      .single();

    if (duplicateBranch) {
      throw new Error('A branch with this slug already exists in this chain');
    }
  }

  // Prepare update data
  const branchUpdateData = {
    updated_at: new Date().toISOString()
  };

  // Only include fields that are being updated
  if (updateData.name !== undefined) branchUpdateData.name = updateData.name.trim();
  if (updateData.slug !== undefined) branchUpdateData.slug = updateData.slug.trim().toLowerCase();
  if (updateData.description !== undefined) branchUpdateData.description = updateData.description?.trim() || null;
  if (updateData.address !== undefined) branchUpdateData.address = updateData.address.trim();
  if (updateData.phone !== undefined) branchUpdateData.phone = updateData.phone?.trim() || null;
  if (updateData.email !== undefined) branchUpdateData.email = updateData.email?.trim() || null;
  if (updateData.settings !== undefined) branchUpdateData.settings = updateData.settings;
  if (updateData.is_active !== undefined) branchUpdateData.is_active = updateData.is_active;

  // Update coordinates if provided
  if (updateData.coordinates) {
    branchUpdateData.location = {
      lat: updateData.coordinates.lat,
      lng: updateData.coordinates.lng
    };
  }

  // Update branch
  const { data: updatedBranch, error: updateError } = await supabase
    .from('branches')
    .update(branchUpdateData)
    .eq('id', branchId)
    .select(`
      *,
      restaurant_chains(id, name, slug)
    `)
    .single();

  if (updateError) {
    throw new Error(`Failed to update branch: ${updateError.message}`);
  }

  return {
    ...updatedBranch,
    chain: updatedBranch.restaurant_chains
  };
}

/**
 * Delete a restaurant branch
 */
async function deleteBranch(branchId, adminUserId) {
  if (!branchId) {
    throw new Error('Branch ID is required');
  }

  // Check if branch exists
  const { data: existingBranch, error: fetchError } = await supabase
    .from('branches')
    .select('id, name, chain_id')
    .eq('id', branchId)
    .single();

  if (fetchError || !existingBranch) {
    throw new Error('Branch not found');
  }

  // Check for dependencies (branch_users, orders, etc.)
  const { data: branchUsers, error: usersError } = await supabase
    .from('branch_users')
    .select('id')
    .eq('branch_id', branchId)
    .limit(1);

  if (usersError) {
    throw new Error('Failed to check branch dependencies');
  }

  if (branchUsers && branchUsers.length > 0) {
    throw new Error('Cannot delete branch with existing users. Please remove all users first.');
  }

  // Delete branch
  const { error: deleteError } = await supabase
    .from('branches')
    .delete()
    .eq('id', branchId);

  if (deleteError) {
    throw new Error(`Failed to delete branch: ${deleteError.message}`);
  }

  return {
    message: `Branch "${existingBranch.name}" has been successfully deleted`,
    deletedBranchId: branchId
  };
}

module.exports = {
  createBranch,
  getAllBranches,
  getBranchById,
  updateBranch,
  deleteBranch
};