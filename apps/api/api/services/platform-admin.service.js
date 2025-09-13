// =====================================================
// PLATFORM ADMIN SERVICE
// Business logic for platform admin management
// =====================================================

const { createClient } = require('@supabase/supabase-js');

// Create Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Get all platform administrators
 */
async function getAllPlatformAdmins() {
  // Get platform admins from user_profiles
  const { data: admins, error } = await supabase
    .from('user_profiles')
    .select('user_id, email, full_name, created_at, updated_at')
    .eq('is_platform_admin', true)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch platform admins: ${error.message}`);
  }

  // If email is missing from profile, get it from auth
  const adminsWithEmails = await Promise.all(admins.map(async (admin) => {
    if (!admin.email) {
      try {
        const { data: authUser } = await supabase.auth.admin.getUserById(admin.user_id);
        return {
          ...admin,
          email: authUser.user?.email || 'No email'
        };
      } catch (authError) {
        console.error(`Failed to get email for user ${admin.user_id}:`, authError);
        return {
          ...admin,
          email: 'Email unavailable'
        };
      }
    }
    return admin;
  }));

  return adminsWithEmails;
}

/**
 * Search users by email for admin assignment
 */
async function searchUserByEmail(email) {
  if (!email || !email.trim()) {
    throw new Error('Email is required for user search');
  }

  const { data: user, error } = await supabase
    .from('user_profiles')
    .select('user_id, email, full_name, is_platform_admin')
    .eq('email', email.trim().toLowerCase())
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      throw new Error('User not found with this email address');
    }
    throw new Error(`Failed to search user: ${error.message}`);
  }

  return user;
}

/**
 * Create new user and assign platform admin role (Independent system - no Supabase Auth)
 */
async function createNewPlatformAdmin(userData, adminUserId) {
  const { email, full_name, password } = userData;
  
  // Validation
  if (!email || !full_name || !password) {
    throw new Error('Email, full name, and password are required');
  }

  // Check if user already exists in user_profiles table
  const { data: existingProfile } = await supabase
    .from('user_profiles')
    .select('user_id, email')
    .eq('email', email.trim().toLowerCase())
    .single();

  if (existingProfile) {
    throw new Error('User profile already exists with this email address');
  }

  // Also check if email exists in Supabase Auth
  try {
    const { data: authUser } = await supabase.auth.admin.getUserById('dummy'); // We'll use email search instead
    const { data: existingAuthUsers } = await supabase.auth.admin.listUsers();
    const emailExists = existingAuthUsers.users?.some(u => u.email?.toLowerCase() === email.trim().toLowerCase());
    
    if (emailExists) {
      throw new Error('User already exists with this email address in authentication system');
    }
  } catch (authCheckError) {
    // If we can't check auth users, continue (better to try creation than block)
    console.warn('Could not check existing auth users:', authCheckError);
  }

  try {
    // 1. Create Supabase Auth user first (like Chain Owner and User Management)
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: email.trim().toLowerCase(),
      password: password,
      email_confirm: true, // ✅ Bypass email confirmation (admin-created users)
      user_metadata: {
        full_name: full_name.trim(),
        display_name: full_name.trim(),
        is_platform_admin: true
      }
    });

    if (authError || !authData.user) {
      throw new Error(`Failed to create auth user: ${authError?.message || 'Unknown auth error'}`);
    }

    const userId = authData.user.id;
    
    // 2. Update user profile using Supabase trigger (UPDATE instead of INSERT)
    // Supabase trigger automatically creates basic profile on auth user creation
    const { data: createdUser, error: createError } = await supabase
      .from('user_profiles')
      .update({
        email: email.trim().toLowerCase(),
        full_name: full_name.trim(),
        is_platform_admin: true,
        is_active: true,
        role: null, // Platform admins don't have a role, they have is_platform_admin flag
        chain_id: null,
        branch_id: null,
        permissions: [],
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .select('user_id, email, full_name, created_at, updated_at')
      .single();

    if (createError) {
      // Rollback: Delete auth user if profile update fails
      await supabase.auth.admin.deleteUser(userId);
      throw new Error(`Failed to update user profile: ${createError.message}`);
    }

    return createdUser;
  } catch (error) {
    throw error;
  }
}

/**
 * Assign platform admin role to user
 */
async function assignPlatformAdmin(userId, adminUserId) {
  // Validation
  if (!userId) {
    throw new Error('User ID is required');
  }

  // Check if user exists
  const { data: user, error: userError } = await supabase
    .from('user_profiles')
    .select('user_id, email, full_name, is_platform_admin')
    .eq('user_id', userId)
    .single();

  if (userError) {
    if (userError.code === 'PGRST116') {
      throw new Error('User not found');
    }
    throw new Error(`Failed to find user: ${userError.message}`);
  }

  // Check if user is already a platform admin
  if (user.is_platform_admin) {
    throw new Error('User is already a platform administrator');
  }

  // Update user to platform admin
  const { data: updatedUser, error: updateError } = await supabase
    .from('user_profiles')
    .update({ 
      is_platform_admin: true,
      updated_at: new Date().toISOString()
    })
    .eq('user_id', userId)
    .select('user_id, email, full_name, created_at, updated_at')
    .single();

  if (updateError) {
    throw new Error(`Failed to assign platform admin role: ${updateError.message}`);
  }

  // Log the admin action (console for now, could be database later)
  console.log(`Platform admin role assigned to ${user.email} by admin ${adminUserId}`);

  return updatedUser;
}

/**
 * Remove platform admin role from user
 */
async function removePlatformAdmin(userId, adminUserId) {
  // Validation
  if (!userId) {
    throw new Error('User ID is required');
  }

  // Prevent self-removal
  if (userId === adminUserId) {
    throw new Error('You cannot remove your own platform admin role');
  }

  // Check if user exists and is platform admin
  const { data: user, error: userError } = await supabase
    .from('user_profiles')
    .select('user_id, email, full_name, is_platform_admin')
    .eq('user_id', userId)
    .single();

  if (userError) {
    if (userError.code === 'PGRST116') {
      throw new Error('User not found');
    }
    throw new Error(`Failed to find user: ${userError.message}`);
  }

  if (!user.is_platform_admin) {
    throw new Error('User is not a platform administrator');
  }

  // Check if this would leave no platform admins (safety check)
  const { data: adminCount } = await supabase
    .from('user_profiles')
    .select('user_id', { count: 'exact' })
    .eq('is_platform_admin', true);

  if (adminCount && adminCount.length <= 1) {
    throw new Error('Cannot remove the last platform administrator. At least one admin must exist.');
  }

  // Remove platform admin role
  const { data: updatedUser, error: updateError } = await supabase
    .from('user_profiles')
    .update({ 
      is_platform_admin: false,
      updated_at: new Date().toISOString()
    })
    .eq('user_id', userId)
    .select('user_id, email, full_name')
    .single();

  if (updateError) {
    throw new Error(`Failed to remove platform admin role: ${updateError.message}`);
  }

  // Log the admin action
  console.log(`Platform admin role removed from ${user.email} by admin ${adminUserId}`);

  return {
    removedAdmin: updatedUser,
    message: 'Platform admin role removed successfully'
  };
}

module.exports = {
  getAllPlatformAdmins,
  searchUserByEmail,
  createNewPlatformAdmin,
  assignPlatformAdmin,
  removePlatformAdmin
};