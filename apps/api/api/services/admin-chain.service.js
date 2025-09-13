// =====================================================
// ADMIN CHAIN SERVICE
// Business logic for platform admin chain management
// =====================================================

const { createClient } = require('@supabase/supabase-js');

// Create Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Create a new restaurant chain with owner
 */
async function createChain(chainData, adminUserId) {
  // Validation - Chain data
  if (!chainData.name?.trim()) {
    throw new Error('Chain name is required');
  }

  if (!chainData.slug?.trim()) {
    throw new Error('Chain slug is required');
  }

  // Validation - Owner data
  if (!chainData.owner_email?.trim()) {
    throw new Error('Owner email is required');
  }

  if (!chainData.owner_full_name?.trim()) {
    throw new Error('Owner full name is required');
  }

  if (!chainData.owner_password?.trim()) {
    throw new Error('Owner password is required');
  }

  if (chainData.owner_password.length < 8) {
    throw new Error('Owner password must be at least 8 characters');
  }

  // Validate slug format (lowercase, alphanumeric, hyphens only)
  const slugRegex = /^[a-z0-9-]+$/;
  if (!slugRegex.test(chainData.slug)) {
    throw new Error('Chain slug must contain only lowercase letters, numbers, and hyphens');
  }

  // Check if slug already exists
  const { data: existingChain } = await supabase
    .from('restaurant_chains')
    .select('id')
    .eq('slug', chainData.slug)
    .single();

  if (existingChain) {
    throw new Error('A chain with this slug already exists');
  }

  // Check if owner email already exists in user_profiles
  const { data: existingProfile } = await supabase
    .from('user_profiles')
    .select('id')
    .eq('email', chainData.owner_email.trim())
    .single();

  if (existingProfile) {
    throw new Error('A user with this email already exists');
  }

  try {
    // 1. Create owner auth user first (using admin method like User Management)
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: chainData.owner_email.trim(),
      password: chainData.owner_password,
      email_confirm: true, // ✅ Bypass email confirmation
      user_metadata: {
        full_name: chainData.owner_full_name.trim(),
        display_name: chainData.owner_full_name.trim()
      }
    });

    if (authError) {
      throw new Error(`Failed to create owner auth user: ${authError.message}`);
    }

    const ownerId = authData.user.id;
    console.log('Owner auth user created:', ownerId);

    // 2. Create chain with actual owner
    const chainInsertData = {
      name: chainData.name.trim(),
      slug: chainData.slug.trim().toLowerCase(),
      description: chainData.description?.trim() || null,
      logo_url: chainData.logo_url || null,
      settings: chainData.settings || {},
      is_active: chainData.is_active !== false,
      owner_id: ownerId, // Actual owner ID
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data: newChain, error: chainError } = await supabase
      .from('restaurant_chains')
      .insert(chainInsertData)
      .select()
      .single();

    if (chainError) {
      // Rollback: Delete auth user
      await supabase.auth.admin.deleteUser(ownerId);
      throw new Error(`Failed to create chain: ${chainError.message}`);
    }

    console.log('Chain created successfully:', newChain.id);

    // 3. Update owner profile (trigger already created basic profile)
    // Wait a moment for trigger to complete
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const { error: profileError } = await supabase
      .from('user_profiles')
      .update({
        email: chainData.owner_email.trim(),
        role: 'chain_owner',
        chain_id: newChain.id,
        branch_id: null,
        permissions: ['chain:manage', 'branch:create', 'branch:manage', 'users:manage'],
        is_active: true,
        phone: null,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', ownerId);

    if (profileError) {
      // Rollback: Delete chain and auth user
      await supabase.from('restaurant_chains').delete().eq('id', newChain.id);
      await supabase.auth.admin.deleteUser(ownerId);
      throw new Error(`Failed to update owner profile: ${profileError.message}`);
    }

    console.log('Owner profile created successfully');

    // 4. Return success
    return {
      ...newChain,
      message: 'Chain and owner created successfully',
      owner: {
        id: ownerId,
        email: chainData.owner_email.trim(),
        full_name: chainData.owner_full_name.trim(),
        status: 'active'
      }
    };

  } catch (error) {
    throw error;
  }
}

/**
 * Get all restaurant chains with branch counts
 */
async function getAllChains(filters = {}) {
  let query = supabase
    .from('restaurant_chains')
    .select(`
      id,
      name,
      slug,
      description,
      logo_url,
      settings,
      is_active,
      created_at,
      updated_at,
      branches(id)
    `);

  // Apply filters
  if (filters.isActive !== undefined) {
    query = query.eq('is_active', filters.isActive);
  }

  if (filters.search) {
    query = query.or(`name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
  }

  // Order by creation date (newest first)
  query = query.order('created_at', { ascending: false });

  const { data: chains, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch chains: ${error.message}`);
  }

  // Count branches for each chain and prepare final response
  const chainsWithCounts = chains.map(chain => ({
    id: chain.id,
    name: chain.name,
    slug: chain.slug,
    description: chain.description,
    logo_url: chain.logo_url,
    settings: chain.settings,
    is_active: chain.is_active,
    created_at: chain.created_at,
    updated_at: chain.updated_at,
    branch_count: chain.branches?.length || 0
  }));

  return chainsWithCounts;
}

/**
 * Get a specific restaurant chain by ID
 */
async function getChainById(chainId) {
  if (!chainId) {
    throw new Error('Chain ID is required');
  }

  const { data: chain, error } = await supabase
    .from('restaurant_chains')
    .select(`
      id,
      name,
      slug,
      description,
      logo_url,
      settings,
      is_active,
      created_at,
      updated_at,
      owner_id,
      branches(
        id,
        name,
        slug,
        address,
        phone,
        is_active,
        created_at
      )
    `)
    .eq('id', chainId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      throw new Error('Chain not found');
    }
    throw new Error(`Failed to fetch chain: ${error.message}`);
  }

  // Get owner information if owner_id exists
  let owner = null;
  if (chain.owner_id) {
    const { data: ownerProfile } = await supabase
      .from('user_profiles')
      .select('user_id, full_name, email, is_active')
      .eq('user_id', chain.owner_id)
      .single();

    if (ownerProfile) {
      owner = {
        id: ownerProfile.user_id,
        full_name: ownerProfile.full_name,
        email: ownerProfile.email,
        status: ownerProfile.is_active ? 'active' : 'inactive'
      };
    }
  }

  return {
    ...chain,
    owner,
    branches_count: chain.branches?.length || 0
  };
}

/**
 * Update a restaurant chain
 */
async function updateChain(chainId, updateData, adminUserId) {
  if (!chainId) {
    throw new Error('Chain ID is required');
  }

  // Check if chain exists
  const { data: existingChain, error: fetchError } = await supabase
    .from('restaurant_chains')
    .select('id, slug')
    .eq('id', chainId)
    .single();

  if (fetchError || !existingChain) {
    throw new Error('Chain not found');
  }

  // Validate slug if being updated
  if (updateData.slug && updateData.slug !== existingChain.slug) {
    const slugRegex = /^[a-z0-9-]+$/;
    if (!slugRegex.test(updateData.slug)) {
      throw new Error('Chain slug must contain only lowercase letters, numbers, and hyphens');
    }

    // Check if new slug already exists
    const { data: duplicateChain } = await supabase
      .from('restaurant_chains')
      .select('id')
      .eq('slug', updateData.slug)
      .neq('id', chainId)
      .single();

    if (duplicateChain) {
      throw new Error('A chain with this slug already exists');
    }
  }

  // Prepare update data
  const chainUpdateData = {
    updated_at: new Date().toISOString()
  };

  // Only include fields that are being updated
  if (updateData.name !== undefined) chainUpdateData.name = updateData.name.trim();
  if (updateData.slug !== undefined) chainUpdateData.slug = updateData.slug.trim().toLowerCase();
  if (updateData.description !== undefined) chainUpdateData.description = updateData.description?.trim() || null;
  if (updateData.logo_url !== undefined) chainUpdateData.logo_url = updateData.logo_url;
  if (updateData.settings !== undefined) chainUpdateData.settings = updateData.settings;
  if (updateData.is_active !== undefined) chainUpdateData.is_active = updateData.is_active;

  // Update chain
  const { data: updatedChain, error: updateError } = await supabase
    .from('restaurant_chains')
    .update(chainUpdateData)
    .eq('id', chainId)
    .select()
    .single();

  if (updateError) {
    throw new Error(`Failed to update chain: ${updateError.message}`);
  }

  return updatedChain;
}

/**
 * Delete a restaurant chain
 */
async function deleteChain(chainId, adminUserId) {
  if (!chainId) {
    throw new Error('Chain ID is required');
  }

  // Check if chain exists
  const { data: existingChain, error: fetchError } = await supabase
    .from('restaurant_chains')
    .select('id, name')
    .eq('id', chainId)
    .single();

  if (fetchError || !existingChain) {
    throw new Error('Chain not found');
  }

  // Check if chain has branches
  const { data: branches, error: branchError } = await supabase
    .from('branches')
    .select('id')
    .eq('chain_id', chainId)
    .limit(1);

  if (branchError) {
    throw new Error('Failed to check chain dependencies');
  }

  if (branches && branches.length > 0) {
    throw new Error('Cannot delete chain with existing branches. Please delete all branches first.');
  }

  // Delete chain
  const { error: deleteError } = await supabase
    .from('restaurant_chains')
    .delete()
    .eq('id', chainId);

  if (deleteError) {
    throw new Error(`Failed to delete chain: ${deleteError.message}`);
  }

  return {
    message: `Chain "${existingChain.name}" has been successfully deleted`,
    deletedChainId: chainId
  };
}


module.exports = {
  createChain,
  getAllChains,
  getChainById,
  updateChain,
  deleteChain
};