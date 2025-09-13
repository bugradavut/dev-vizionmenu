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

    // First get user profile to check if platform admin
    const { data: userProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*') // Get all fields including role, chain_id, is_active
      .eq('user_id', userId)
      .single();

    if (profileError || !userProfile) {
      return res.status(404).json({
        error: 'Profile Not Found',
        message: 'User profile not found'
      });
    }

    // Get user email from auth token (we can't use admin methods in client SDK)
    const authUser = { user: { email: userProfile.email } };

    // Check if user is platform admin
    if (userProfile.is_platform_admin) {
      // Platform admin - return profile without branch requirements
      const userProfileResponse = {
        id: userId,
        email: authUser?.user?.email || 'unknown@example.com',
        full_name: userProfile.full_name || 'Platform Admin',
        phone: userProfile.phone || null,
        avatar_url: userProfile.avatar_url || null,
        chain_id: null, // Platform admin not tied to specific chain
        branch_id: null, // Platform admin not tied to specific branch
        branch_name: null,
        role: 'platform_admin', // Special role for platform admins
        permissions: ['platform:admin'], // Platform admin permissions
        is_active: true, // Platform admins are always active
        isPlatformAdmin: true,
        created_at: userProfile.created_at || new Date().toISOString(),
        updated_at: userProfile.updated_at || new Date().toISOString()
      };

      return res.json({
        data: userProfileResponse
      });
    }

    // Check if user is a chain owner
    if (userProfile && userProfile.role === 'chain_owner') {
      // Check if chain owner is active
      if (!userProfile.is_active) {
        return res.status(403).json({
          error: 'Account Inactive',
          message: 'Your account has been deactivated. Please contact an administrator.'
        });
      }

      // Get chain info for chain owner
      const { data: chainInfo, error: chainError } = await supabase
        .from('restaurant_chains')
        .select('id, name, slug')
        .eq('id', userProfile.chain_id)
        .single();

      if (chainError || !chainInfo) {
        return res.status(404).json({
          error: 'Chain Not Found',
          message: 'Chain associated with this owner not found'
        });
      }

      const chainOwnerResponse = {
        id: userId,
        email: authUser?.user?.email || 'unknown@example.com',
        full_name: userProfile.full_name || 'Chain Owner',
        phone: userProfile.phone || null,
        avatar_url: userProfile.avatar_url || null,
        chain_id: userProfile.chain_id,
        chain_name: chainInfo.name,
        chain_slug: chainInfo.slug,
        branch_id: null, // Chain owners are not tied to specific branches
        branch_name: null,
        role: 'chain_owner',
        permissions: userProfile.permissions || ['chain:manage', 'branch:create', 'branch:manage', 'users:manage'],
        is_active: userProfile.is_active,
        isPlatformAdmin: false,
        created_at: userProfile.created_at,
        updated_at: userProfile.updated_at
      };

      return res.json({
        data: chainOwnerResponse
      });
    }

    // Regular user - check branch_users table
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

    // Get branch info
    const { data: branchInfo, error: branchInfoError } = await supabase
      .from('branches')
      .select('id, name, chain_id, restaurant_chains(id, name)')
      .eq('id', branchUser.branch_id)
      .single();
    
    // Format response for regular branch user
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
      isPlatformAdmin: userProfile?.is_platform_admin || false,
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