// =====================================================
// AUTH CONTROLLER
// User authentication and profile management
// =====================================================

const { createClient } = require('@supabase/supabase-js');

// Create Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * GET /auth/profile
 * Get user profile with branch and permission information
 */
const getProfile = async (req, res) => {
  try {
    const userId = req.currentUserId;

    // Get user profile with role and permissions (step by step)
    const { data: branchUser, error: branchError } = await supabase
      .from('branch_users')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .single();

    if (branchError || !branchUser) {
      return res.status(404).json({
        error: 'Profile Not Found',
        message: 'User not found in branch_users table'
      });
    }

    // Additional security check: Ensure user is active
    if (!branchUser.is_active) {
      return res.status(403).json({
        error: 'Account Inactive',
        message: 'Your account has been deactivated. Please contact an administrator.'
      });
    }

    // Get user profile
    const { data: userProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select('full_name, phone, avatar_url')
      .eq('user_id', userId)
      .single();

    // Get branch info
    const { data: branchInfo, error: branchInfoError } = await supabase
      .from('branches')
      .select('id, name, chain_id, restaurant_chains(id, name)')
      .eq('id', branchUser.branch_id)
      .single();

    // Get user email from auth.users
    const { data: authUser } = await supabase.auth.admin.getUserById(userId);
    
    // Format response to match frontend expectations
    const userProfileResponse = {
      id: userId,
      email: authUser?.user?.email || 'unknown@example.com',
      full_name: userProfile?.full_name || 'No name',
      phone: userProfile?.phone || null,
      avatar_url: userProfile?.avatar_url || null,
      chain_id: branchInfo?.restaurant_chains?.id || null,
      branch_id: branchUser.branch_id,
      branch_name: branchInfo?.name || 'Unknown branch',
      role: branchUser.role,
      permissions: branchUser.permissions,
      is_active: branchUser.is_active,
      created_at: branchUser.created_at,
      updated_at: branchUser.updated_at
    };

    res.json({
      data: userProfileResponse
    });

  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch user profile'
    });
  }
};

module.exports = {
  getProfile
};