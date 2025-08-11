// =====================================================
// USER MANAGEMENT SERVICE
// All user-related business logic and database operations
// =====================================================

const { createClient } = require('@supabase/supabase-js');
const { canEditUser, DEFAULT_PERMISSIONS } = require('../helpers/permissions');

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
async function createUser(userData) {
  const { email, password, full_name, phone, branch_id, role, permissions } = userData;
  
  // Create user in Supabase Auth
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password, // ✅ FIX: Add missing password field
    email_confirm: true,
    user_metadata: {
      full_name,
      display_name: full_name,
      phone
    }
  });
  
  if (authError) {
    console.error('Auth user creation error:', authError);
    throw new Error(`Failed to create auth user: ${authError.message}`);
  }
  
  const userId = authData.user.id;
  
  // Create user profile
  const { error: profileError } = await supabase
    .from('user_profiles')
    .insert({
      user_id: userId,
      full_name,
      phone
    });
  
  if (profileError) {
    console.error('Profile creation error:', profileError);
  }
  
  // Add user to branch
  const { data: branchUserData, error: branchError } = await supabase
    .from('branch_users')
    .insert({
      user_id: userId,
      branch_id,
      role,
      permissions,
      is_active: true
    })
    .select()
    .single();
  
  if (branchError) {
    console.error('Branch user creation error:', branchError);
    throw new Error(`Failed to add user to branch: ${branchError.message}`);
  }
  
  return {
    message: 'User created successfully',
    user_id: userId,
    branch_user: branchUserData
  };
}

/**
 * Get all users in a branch with pagination
 * @param {string} branchId - Branch ID
 * @param {number} page - Page number
 * @param {number} limit - Items per page
 * @returns {Object} Users list with pagination
 */
async function getBranchUsers(branchId, page = 1, limit = 50) {
  // Get branch users (both active and inactive)
  const { data: branchUsers, error } = await supabase
    .from('branch_users')
    .select('*')
    .eq('branch_id', branchId);
    
  if (error) {
    console.error('Supabase error:', error);
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
      console.error('Failed to get user email for:', userId, err);
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
      console.error('Profile update error:', profileError);
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
        console.warn('Profile updated but auth metadata sync failed:', authMetaError);
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
      console.error('Email update error:', authError);
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
      console.error('Branch user update error:', branchUserError);
      throw new Error(`Failed to update user status: ${branchUserError.message}`);
    }
  }
  
  return { success: true };
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
    console.error('Role assignment error:', updateError);
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
    console.error('Delete user error:', deleteError);
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