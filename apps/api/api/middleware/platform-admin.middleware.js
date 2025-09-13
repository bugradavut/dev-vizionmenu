// =====================================================
// PLATFORM ADMIN MIDDLEWARE
// Middleware for protecting platform admin routes
// =====================================================

const { createClient } = require('@supabase/supabase-js');

// Create Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Middleware to require platform admin access
 * Must be used after auth.middleware.js (requireAuth)
 */
const requirePlatformAdmin = async (req, res, next) => {
  try {
    const userId = req.currentUserId;

    if (!userId) {
      return res.status(401).json({
        error: 'Authentication Required',
        message: 'User must be authenticated to access admin features'
      });
    }

    // Check if user has platform admin flag
    const { data: userProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select('is_platform_admin, full_name')
      .eq('user_id', userId)
      .single();

    if (profileError) {
      console.error('Platform admin check error:', profileError);
      return res.status(500).json({
        error: 'Database Error',
        message: 'Failed to verify admin permissions'
      });
    }

    if (!userProfile) {
      return res.status(404).json({
        error: 'User Not Found',
        message: 'User profile not found'
      });
    }

    if (!userProfile.is_platform_admin) {
      return res.status(403).json({
        error: 'Platform Admin Required',
        message: 'This action requires platform administrator privileges'
      });
    }

    // Add admin info to request for logging
    req.platformAdmin = {
      userId: userId,
      name: userProfile.full_name
    };

    // Admin action logged (removed console.log for cleaner terminal)

    next();
  } catch (error) {
    console.error('Platform admin middleware error:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to verify admin permissions'
    });
  }
};

/**
 * Optional middleware to check platform admin without failing
 * Adds isPlatformAdmin flag to request
 */
const checkPlatformAdmin = async (req, res, next) => {
  try {
    const userId = req.currentUserId;
    
    if (!userId) {
      req.isPlatformAdmin = false;
      return next();
    }

    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('is_platform_admin')
      .eq('user_id', userId)
      .single();

    req.isPlatformAdmin = userProfile?.is_platform_admin || false;
    next();
  } catch (error) {
    console.error('Check platform admin error:', error);
    req.isPlatformAdmin = false;
    next();
  }
};

module.exports = {
  requirePlatformAdmin,
  checkPlatformAdmin
};