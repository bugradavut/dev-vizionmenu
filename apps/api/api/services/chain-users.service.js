// =====================================================
// CHAIN USERS SERVICE
// Business logic for unified chain employee management
// =====================================================

const { createClient } = require('@supabase/supabase-js');

// Create Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Get all users associated with a chain (chain owners + branch users)
 */
async function getChainUsers(chainId, filters = {}) {
  if (!chainId) {
    throw new Error('Chain ID is required');
  }

  try {
    // 1. Get chain owner from user_profiles
    const { data: chainOwner, error: chainOwnerError } = await supabase
      .from('user_profiles')
      .select(`
        user_id,
        full_name,
        email,
        phone,
        role,
        permissions,
        is_active,
        created_at,
        updated_at
      `)
      .eq('chain_id', chainId)
      .eq('role', 'chain_owner')
      .single();

    if (chainOwnerError && chainOwnerError.code !== 'PGRST116') {
      throw new Error(`Failed to fetch chain owner: ${chainOwnerError.message}`);
    }

    // 2. Get all branch users for this chain (manual join)
    // First get branch users for the chain
    const { data: branchUsersRaw, error: branchUsersError } = await supabase
      .from('branch_users')
      .select(`
        user_id,
        role,
        permissions,
        is_active,
        created_at,
        updated_at,
        branch_id,
        branches!inner(
          id,
          name,
          chain_id
        )
      `)
      .eq('branches.chain_id', chainId);

    if (branchUsersError) {
      throw new Error(`Failed to fetch branch users: ${branchUsersError.message}`);
    }

    // Then get user profiles for these branch users
    let branchUsers = [];
    if (branchUsersRaw && branchUsersRaw.length > 0) {
      const userIds = branchUsersRaw.map(bu => bu.user_id);
      
      const { data: userProfiles, error: profilesError } = await supabase
        .from('user_profiles')
        .select('user_id, full_name, email, phone')
        .in('user_id', userIds);

      if (profilesError) {
        throw new Error(`Failed to fetch user profiles: ${profilesError.message}`);
      }

      // Combine branch users with their profiles
      branchUsers = branchUsersRaw.map(branchUser => ({
        ...branchUser,
        user_profile: userProfiles?.find(up => up.user_id === branchUser.user_id) || {
          full_name: null,
          email: null,
          phone: null
        }
      }));
    }

    // 3. Combine and format results
    const allUsers = [];

    // Add chain owner if exists
    if (chainOwner) {
      allUsers.push({
        user_id: chainOwner.user_id,
        full_name: chainOwner.full_name,
        email: chainOwner.email,
        phone: chainOwner.phone,
        role: chainOwner.role,
        permissions: chainOwner.permissions,
        is_active: chainOwner.is_active,
        chain_id: chainId,
        branch_id: null,
        branch_name: null,
        level: 'chain',
        created_at: chainOwner.created_at,
        updated_at: chainOwner.updated_at
      });
    }

    // Add branch users
    if (branchUsers && branchUsers.length > 0) {
      branchUsers.forEach(branchUser => {
        allUsers.push({
          user_id: branchUser.user_id,
          full_name: branchUser.user_profile.full_name,
          email: branchUser.user_profile.email,
          phone: branchUser.user_profile.phone,
          role: branchUser.role,
          permissions: branchUser.permissions,
          is_active: branchUser.is_active,
          chain_id: chainId,
          branch_id: branchUser.branches.id,
          branch_name: branchUser.branches.name,
          level: 'branch',
          created_at: branchUser.created_at,
          updated_at: branchUser.updated_at
        });
      });
    }

    // 4. Apply filters
    let filteredUsers = allUsers;

    if (filters.isActive !== undefined) {
      filteredUsers = filteredUsers.filter(user => user.is_active === filters.isActive);
    }

    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filteredUsers = filteredUsers.filter(user => 
        user.full_name?.toLowerCase().includes(searchLower) ||
        user.email?.toLowerCase().includes(searchLower) ||
        user.role?.toLowerCase().includes(searchLower)
      );
    }

    if (filters.role) {
      filteredUsers = filteredUsers.filter(user => user.role === filters.role);
    }

    if (filters.level) {
      filteredUsers = filteredUsers.filter(user => user.level === filters.level);
    }

    // 5. Apply pagination
    const page = parseInt(filters.page) || 1;
    const limit = parseInt(filters.limit) || 50;
    const offset = (page - 1) * limit;

    const paginatedUsers = filteredUsers.slice(offset, offset + limit);

    return {
      users: paginatedUsers,
      total: filteredUsers.length,
      page,
      limit,
      totalPages: Math.ceil(filteredUsers.length / limit)
    };

  } catch (error) {
    throw error;
  }
}

/**
 * Get specific user by ID within a chain context
 */
async function getChainUser(chainId, userId) {
  if (!chainId) {
    throw new Error('Chain ID is required');
  }

  if (!userId) {
    throw new Error('User ID is required');
  }

  try {
    // Try to find user as chain owner first
    const { data: chainOwner, error: chainOwnerError } = await supabase
      .from('user_profiles')
      .select(`
        user_id,
        full_name,
        email,
        phone,
        role,
        permissions,
        is_active,
        created_at,
        updated_at
      `)
      .eq('chain_id', chainId)
      .eq('user_id', userId)
      .eq('role', 'chain_owner')
      .single();

    if (chainOwner) {
      return {
        user_id: chainOwner.user_id,
        full_name: chainOwner.full_name,
        email: chainOwner.email,
        phone: chainOwner.phone,
        role: chainOwner.role,
        permissions: chainOwner.permissions,
        is_active: chainOwner.is_active,
        chain_id: chainId,
        branch_id: null,
        branch_name: null,
        level: 'chain',
        created_at: chainOwner.created_at,
        updated_at: chainOwner.updated_at
      };
    }

    // Try to find user as branch user
    const { data: branchUser, error: branchUserError } = await supabase
      .from('branch_users')
      .select(`
        user_id,
        role,
        permissions,
        is_active,
        created_at,
        updated_at,
        branches!inner(
          id,
          name,
          chain_id
        ),
        user_profiles!inner(
          full_name,
          email,
          phone
        )
      `)
      .eq('user_id', userId)
      .eq('branches.chain_id', chainId)
      .single();

    if (branchUserError) {
      if (branchUserError.code === 'PGRST116') {
        throw new Error('User not found in this chain');
      }
      throw new Error(`Failed to fetch user: ${branchUserError.message}`);
    }

    return {
      user_id: branchUser.user_id,
      full_name: branchUser.user_profiles.full_name,
      email: branchUser.user_profiles.email,
      phone: branchUser.user_profiles.phone,
      role: branchUser.role,
      permissions: branchUser.permissions,
      is_active: branchUser.is_active,
      chain_id: chainId,
      branch_id: branchUser.branches.id,
      branch_name: branchUser.branches.name,
      level: 'branch',
      created_at: branchUser.created_at,
      updated_at: branchUser.updated_at
    };

  } catch (error) {
    throw error;
  }
}

module.exports = {
  getChainUsers,
  getChainUser
};