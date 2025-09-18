// =====================================================
// USER MANAGEMENT SERVICE
// All user-related business logic and database operations
// =====================================================

const { createClient } = require('@supabase/supabase-js');
const { canEditUser, DEFAULT_PERMISSIONS, canCreateRole } = require('../helpers/permissions');
const crypto = require('crypto');

// Create Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Create new user with role assignment
 * @param {Object} userData - User data from request body
 * @returns {Object} Created user data
 */
async function createUser(userData, currentUserId) {
  const { email, password, full_name, phone, branch_id, role, permissions } = userData;
  
  // Get current user's role and permissions
  const { data: currentUserProfile, error: currentUserError } = await supabase
    .from('user_profiles')
    .select('is_platform_admin, role, chain_id')
    .eq('user_id', currentUserId)
    .single();

  if (currentUserError || !currentUserProfile) {
    throw new Error('Current user not found or unauthorized');
  }

  // Determine current user's effective role
  let currentUserRole;
  if (currentUserProfile.is_platform_admin) {
    currentUserRole = 'platform_admin';
  } else if (currentUserProfile.role) {
    // Chain owners and others have role in user_profiles
    currentUserRole = currentUserProfile.role;
  } else {
    // For branch users, get their role from branch_users
    const { data: branchUser, error: branchUserError } = await supabase
      .from('branch_users')
      .select('role')
      .eq('user_id', currentUserId)
      .single();
    
    if (branchUserError || !branchUser) {
      throw new Error('Current user branch role not found');
    }
    currentUserRole = branchUser.role;
  }

  // Check if current user can create this role
  if (!canCreateRole(currentUserRole, role)) {
    throw new Error(`You cannot create users with role '${role}'. Insufficient permissions.`);
  }

  // Branch selection validation based on current user role
  if (currentUserRole === 'platform_admin') {
    // Platform admin can create users in any branch - branch_id required
    if (!branch_id) {
      throw new Error('Branch selection is required for user creation');
    }
  } else if (currentUserRole === 'chain_owner') {
    // Chain owner can create users in their chain's branches only
    if (!branch_id) {
      throw new Error('Branch selection is required for user creation');
    }
    
    // Verify branch belongs to chain owner's chain
    const { data: branchData, error: branchError } = await supabase
      .from('branches')
      .select('chain_id')
      .eq('id', branch_id)
      .single();
    
    if (branchError || !branchData) {
      throw new Error('Invalid branch selected');
    }
    
    if (branchData.chain_id !== currentUserProfile.chain_id) {
      throw new Error('You can only create users in branches belonging to your chain');
    }
  } else if (currentUserRole === 'branch_manager') {
    // Branch manager can only create users in their own branch
    const { data: currentUserBranch, error: currentBranchError } = await supabase
      .from('branch_users')
      .select('branch_id')
      .eq('user_id', currentUserId)
      .single();
    
    if (currentBranchError || !currentUserBranch) {
      throw new Error('Current user branch not found');
    }
    
    // Force branch_id to be current user's branch
    userData.branch_id = currentUserBranch.branch_id;
  } else {
    throw new Error('You do not have permission to create users');
  }
  
  try {
    // 1. Create Supabase Auth user first (like Chain Admin system does)
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: email.trim(),
      password: password,
      email_confirm: true, // ✅ Bypass email confirmation (admin-created users)
      user_metadata: {
        full_name: full_name.trim(),
        display_name: full_name.trim(),
        role: role
      }
    });

    if (authError || !authData.user) {
      throw new Error(`Failed to create auth user: ${authError?.message || 'Unknown auth error'}`);
    }

    const userId = authData.user.id;
    
    // 2. Update user profile using Supabase trigger (UPDATE instead of INSERT)
    // Supabase trigger automatically creates basic profile on auth user creation
    const { error: profileError } = await supabase
      .from('user_profiles')
      .update({
        full_name,
        phone,
        email: email.trim(),
        is_active: true,
        role: role,
        chain_id: (currentUserRole === 'branch_manager' || currentUserRole === 'chain_owner') ? currentUserProfile.chain_id : null,
        branch_id: userData.branch_id,
        permissions: DEFAULT_PERMISSIONS[role] || [],
        is_platform_admin: false,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId);
    
    if (profileError) {
      // Rollback: Delete auth user if profile update fails
      await supabase.auth.admin.deleteUser(userId);
      throw new Error(`Failed to update user profile: ${profileError.message}`);
    }
    
    // 3. Add user to branch
    const { data: branchUserData, error: branchError } = await supabase
      .from('branch_users')
      .insert({
        user_id: userId,
        branch_id: userData.branch_id, // Use the validated branch_id
        role,
        permissions: DEFAULT_PERMISSIONS[role] || permissions || [],
        is_active: true
      })
      .select()
      .single();
    
    if (branchError) {
      // Rollback: Delete auth user and profile if branch user creation fails
      await supabase.auth.admin.deleteUser(userId);
      throw new Error(`Failed to add user to branch: ${branchError.message}`);
    }
    
    return {
      message: 'User created successfully',
      user_id: userId,
      branch_user: branchUserData
    };
  } catch (error) {
    throw error;
  }
}

/**
 * Get all users in a branch with pagination
 * @param {string} branchId - Branch ID
 * @param {number} page - Page number
 * @param {number} limit - Items per page
 * @returns {Object} Users list with pagination
 */
async function getBranchUsers(branchId, page = 1, limit = 50) {
  // Get branch users (both active and inactive) with branch name
  const { data: branchUsers, error } = await supabase
    .from('branch_users')
    .select(`
      *,
      branches:branch_id (
        name
      )
    `)
    .eq('branch_id', branchId);
    
  if (error) {
    throw new Error(`Failed to get branch users: ${error.message}`);
  }
  
  if (!branchUsers || branchUsers.length === 0) {
    return {
      users: [],
      total: 0,
      page: parseInt(page),
      limit: parseInt(limit)
    };
  }
  
  // Get user IDs
  const userIds = branchUsers.map(bu => bu.user_id);
  
  // Get user profiles
  const { data: userProfiles } = await supabase
    .from('user_profiles')
    .select('user_id, full_name, phone, avatar_url')
    .in('user_id', userIds);
    
  // Get user emails using Supabase Admin API
  const userEmails = [];
  for (const userId of userIds) {
    try {
      const { data: userData, error } = await supabase.auth.admin.getUserById(userId);
      if (userData && userData.user) {
        userEmails.push({
          id: userData.user.id,
          email: userData.user.email
        });
      }
    } catch (err) {
      // Silently continue if email fetch fails
    }
  }
  
  // Combine data
  const users = branchUsers.map(branchUser => {
    const profile = userProfiles?.find(p => p.user_id === branchUser.user_id);
    const emailData = userEmails?.find(u => u.id === branchUser.user_id);
    
    return {
      user_id: branchUser.user_id,
      branch_id: branchUser.branch_id,
      role: branchUser.role,
      permissions: branchUser.permissions,
      is_active: branchUser.is_active,
      created_at: branchUser.created_at,
      updated_at: branchUser.updated_at,
      // Branch information
      branch_name: branchUser.branches?.name || 'Unknown Branch',
      user: {
        user_id: branchUser.user_id,
        email: emailData?.email || `user${branchUser.user_id.substring(0,8)}@example.com`,
        full_name: profile?.full_name || 'No name',
        phone: profile?.phone || null,
        avatar_url: profile?.avatar_url || null
      }
    };
  });
  
  return {
    users,
    total: users.length,
    page: parseInt(page),
    limit: parseInt(limit)
  };
}

/**
 * Update user profile and status
 * @param {string} userId - User ID
 * @param {string} branchId - Branch ID
 * @param {Object} updateData - Data to update
 * @param {string} currentUserId - Current user making the request
 * @returns {Object} Success response
 */
async function updateUser(userId, branchId, updateData, currentUserId) {
  const { email, full_name, phone, is_active } = updateData;
  
  // Check if user exists in this branch
  const { data: existingUser, error: existingUserError } = await supabase
    .from('branch_users')
    .select('*')
    .eq('user_id', userId)
    .eq('branch_id', branchId)
    .single();

  if (existingUserError || !existingUser) {
    throw new Error('User not found in this branch');
  }

  // Get current user's role (check both chain owners and branch users)
  let currentUserRole = null;

  // First check if user is chain owner or platform admin
  const { data: currentUserProfile, error: profileError } = await supabase
    .from('user_profiles')
    .select('role, is_platform_admin, chain_id')
    .eq('user_id', currentUserId)
    .single();

  if (profileError || !currentUserProfile) {
    throw new Error('Current user profile not found');
  }

  if (currentUserProfile.is_platform_admin) {
    currentUserRole = 'platform_admin';
  } else if (currentUserProfile.role === 'chain_owner') {
    currentUserRole = 'chain_owner';
  } else {
    // Check branch users table
    const { data: currentBranchUser, error: branchUserError } = await supabase
      .from('branch_users')
      .select('role')
      .eq('user_id', currentUserId)
      .eq('branch_id', branchId)
      .single();

    if (branchUserError || !currentBranchUser) {
      throw new Error('You do not have permission to perform this action');
    }
    currentUserRole = currentBranchUser.role;
  }

  // Check role hierarchy - current user must have equal or higher role level than target user
  if (!canEditUser(currentUserRole, existingUser.role)) {
    throw new Error(`Cannot edit user with role '${existingUser.role}'. Insufficient permissions.`);
  }

  // Update user profile if profile fields provided
  if (full_name || phone) {
    const profileUpdate = {};
    if (full_name) profileUpdate.full_name = full_name;
    if (phone) profileUpdate.phone = phone;

    const { error: profileError } = await supabase
      .from('user_profiles')
      .update(profileUpdate)
      .eq('user_id', userId);

    if (profileError) {
      throw new Error(`Failed to update user profile: ${profileError.message}`);
    }

    // Also update auth user metadata if full_name changed
    if (full_name) {
      const { error: authMetaError } = await supabase.auth.admin.updateUserById(
        userId,
        { 
          user_metadata: { 
            full_name: full_name,
            display_name: full_name 
          } 
        }
      );

      if (authMetaError) {
        // Don't return error - profile update succeeded, this is just for consistency
      }
    }
  }

  // Update auth user email if provided
  if (email) {
    const { error: authError } = await supabase.auth.admin.updateUserById(
      userId,
      { email: email }
    );

    if (authError) {
      throw new Error(`Failed to update user email: ${authError.message}`);
    }
  }

  // Update branch user status if provided
  if (is_active !== undefined) {
    const { error: branchUserError } = await supabase
      .from('branch_users')
      .update({ is_active })
      .eq('user_id', userId)
      .eq('branch_id', branchId);

    if (branchUserError) {
      throw new Error(`Failed to update user status: ${branchUserError.message}`);
    }
  }

  // Fetch and return updated user data for audit log (separate queries to avoid relationship issues)
  try {
    // Get branch user data
    const { data: branchUserData, error: branchUserError } = await supabase
      .from('branch_users')
      .select('user_id, branch_id, role, is_active, created_at, updated_at')
      .eq('user_id', userId)
      .eq('branch_id', branchId)
      .single();

    if (branchUserError || !branchUserData) {
      console.warn('Could not fetch branch user for audit log:', branchUserError?.message);
      return { success: true };
    }

    // Get user profile data
    const { data: profileData, error: profileError } = await supabase
      .from('user_profiles')
      .select('full_name, email, phone')
      .eq('user_id', userId)
      .single();

    if (profileError) {
      console.warn('Could not fetch user profile for audit log:', profileError?.message);
    }

    // Combine data for audit log consistency
    return {
      id: branchUserData.user_id,
      branch_id: branchUserData.branch_id,
      role: branchUserData.role,
      is_active: branchUserData.is_active,
      full_name: profileData?.full_name || null,
      email: profileData?.email || null,
      phone: profileData?.phone || null,
      created_at: branchUserData.created_at,
      updated_at: branchUserData.updated_at
    };
  } catch (error) {
    console.warn('Error fetching updated user for audit log:', error?.message);
    return { success: true };
  }
}

/**
 * Assign role to user with permission validation
 * @param {string} userId - User ID
 * @param {string} branchId - Branch ID
 * @param {string} role - New role
 * @param {string} currentUserId - Current user making the request
 * @returns {Object} Updated user data
 */
async function assignUserRole(userId, branchId, role, currentUserId) {
  // Check if user exists in this branch
  const { data: existingUser, error: existingUserError } = await supabase
    .from('branch_users')
    .select('*')
    .eq('user_id', userId)
    .eq('branch_id', branchId)
    .single();

  if (existingUserError || !existingUser) {
    throw new Error('User not found in this branch');
  }

  // Get current user's role
  const { data: currentUser, error: currentUserError } = await supabase
    .from('branch_users')
    .select('role')
    .eq('user_id', currentUserId)
    .eq('branch_id', branchId)
    .single();

  if (currentUserError || !currentUser) {
    throw new Error('You do not have permission to perform this action');
  }

  // Check role hierarchy - current user must have permission to edit target user AND assign the new role
  if (!canEditUser(currentUser.role, existingUser.role)) {
    throw new Error(`Cannot edit user with role '${existingUser.role}'. Insufficient permissions.`);
  }

  // Also check if current user can assign the new role (must be equal or higher level than target role)
  if (!canEditUser(currentUser.role, role)) {
    throw new Error(`Cannot assign role '${role}'. You can only assign roles equal to or lower than your own role level.`);
  }

  const newPermissions = DEFAULT_PERMISSIONS[role] || [];

  // Update user role AND permissions
  const { data: updatedUser, error: updateError } = await supabase
    .from('branch_users')
    .update({ 
      role: role,
      permissions: newPermissions,
      updated_at: new Date().toISOString()
    })
    .eq('user_id', userId)
    .eq('branch_id', branchId)
    .select()
    .single();

  if (updateError) {
    throw new Error(`Failed to assign role: ${updateError.message}`);
  }

  return {
    message: 'Role assigned successfully',
    user_id: userId,
    branch_id: branchId,
    new_role: role,
    updated_user: updatedUser
  };
}

/**
 * Delete user from branch (smart deletion)
 * @param {string} userId - User ID
 * @param {string} branchId - Branch ID
 * @param {string} currentUserId - Current user making the request
 * @returns {Object} Success response
 */
async function deleteUser(userId, branchId, currentUserId) {
  // Check if user exists in this branch
  const { data: existingUser, error: existingUserError } = await supabase
    .from('branch_users')
    .select('*')
    .eq('user_id', userId)
    .eq('branch_id', branchId)
    .single();

  if (existingUserError || !existingUser) {
    throw new Error('User not found in this branch');
  }

  // Get current user's role
  const { data: currentUser, error: currentUserError } = await supabase
    .from('branch_users')
    .select('role')
    .eq('user_id', currentUserId)
    .eq('branch_id', branchId)
    .single();

  if (currentUserError || !currentUser) {
    throw new Error('You do not have permission to perform this action');
  }

  // Check role hierarchy - current user must have equal or higher role level than target user
  if (!canEditUser(currentUser.role, existingUser.role)) {
    throw new Error(`Cannot delete user with role '${existingUser.role}'. Insufficient permissions.`);
  }

  // Hard delete - remove user from branch completely
  const { error: deleteError } = await supabase
    .from('branch_users')
    .delete()
    .eq('user_id', userId)
    .eq('branch_id', branchId);

  if (deleteError) {
    throw new Error(`Failed to delete user: ${deleteError.message}`);
  }

  // Check if user has other branches
  const { data: otherBranches, error: checkError } = await supabase
    .from('branch_users')
    .select('id')
    .eq('user_id', userId);

  if (!checkError && (!otherBranches || otherBranches.length === 0)) {
    // User has no other branches, delete completely
    await supabase
      .from('user_profiles')
      .delete()
      .eq('user_id', userId);
    
    // Delete from auth system
    await supabase.auth.admin.deleteUser(userId);
  }

  return {
    message: 'User deleted successfully'
  };
}

module.exports = {
  createUser,
  getBranchUsers,
  updateUser,
  assignUserRole,
  deleteUser
};