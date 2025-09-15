// =====================================================
// AUTHENTICATION MIDDLEWARE
// JWT token validation and user context extraction
// =====================================================

const { createClient } = require('@supabase/supabase-js');

// Create Supabase client for user data fetching
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * JWT Authentication Middleware
 * Validates Bearer token and extracts user ID
 * Adds req.currentUserId for authenticated requests
 */
const requireAuth = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Missing or invalid authorization header'
      });
    }

    const token = authHeader.split(' ')[1];
    let currentUserId;
    
    try {
      const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
      currentUserId = payload.sub;
    } catch (error) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid token format'
      });
    }

    // Add user ID to request object for use in route handlers
    req.currentUserId = currentUserId;
    next();
    
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Authentication processing failed'
    });
  }
};

/**
 * JWT Authentication Middleware with Branch Context
 * Validates token AND fetches user's branch information
 * Adds req.currentUserId and req.userBranch to request
 */
const requireAuthWithBranch = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: { code: 'UNAUTHORIZED', message: 'Missing or invalid authorization header' }
      });
    }

    const token = authHeader.split(' ')[1];
    let currentUserId;
    
    try {
      const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
      currentUserId = payload.sub;
    } catch (error) {
      return res.status(401).json({
        error: { code: 'UNAUTHORIZED', message: 'Invalid token format' }
      });
    }

    // Fetch user's branch context
    const { data: userBranch, error: userBranchError } = await supabase
      .from('branch_users')
      .select('branch_id, role')
      .eq('user_id', currentUserId)
      .eq('is_active', true)
      .single();

    if (userBranchError || !userBranch) {
      return res.status(403).json({
        error: { code: 'ACCESS_DENIED', message: 'User not found in any active branch' }
      });
    }

    // Add user context to request object
    req.currentUserId = currentUserId;
    req.userBranch = userBranch;
    next();
    
  } catch (error) {
    console.error('Auth with branch middleware error:', error);
    return res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'Authentication processing failed' }
    });
  }
};

/**
 * Optional Authentication Middleware for Development
 * Allows requests without auth in development mode
 * Adds req.currentUserId and req.userBranch if token provided
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    // Development mode: Allow unauthenticated requests
    if (process.env.NODE_ENV === 'development' && (!authHeader || authHeader === 'Bearer null')) {
      req.currentUserId = null;
      req.userBranch = null;
      return next();
    }

    // If auth header provided, validate it
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      
      try {
        const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
        const currentUserId = payload.sub;
        
        // Fetch user's branch context
        const { data: userBranchData, error: userBranchError } = await supabase
          .from('branch_users')
          .select('branch_id')
          .eq('user_id', currentUserId)
          .eq('is_active', true)
          .single();

        if (userBranchError || !userBranchData) {
          return res.status(403).json({
            error: { code: 'ACCESS_DENIED', message: 'User not found in any active branch' }
          });
        }
        
        req.currentUserId = currentUserId;
        req.userBranch = userBranchData;
        
      } catch (error) {
        return res.status(401).json({
          error: { code: 'INVALID_TOKEN', message: 'Invalid token format' }
        });
      }
    }

    next();
    
  } catch (error) {
    console.error('Optional auth middleware error:', error);
    return res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'Authentication processing failed' }
    });
  }
};

module.exports = {
  requireAuth,
  requireAuthWithBranch,
  optionalAuth,
  /**
   * Auth with Chain or Branch Context
   * Allows:
   *  - platform_admin: no branch required
   *  - chain_owner: no branch required (but has chain context)
   *  - others: must have active branch (same as requireAuthWithBranch)
   */
  requireAuthChainOrBranch: async (req, res, next) => {
    try {
      const authHeader = req.headers.authorization;

      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
          error: { code: 'UNAUTHORIZED', message: 'Missing or invalid authorization header' }
        });
      }

      const token = authHeader.split(' ')[1];
      let currentUserId;

      try {
        const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
        currentUserId = payload.sub;
      } catch (error) {
        return res.status(401).json({
          error: { code: 'UNAUTHORIZED', message: 'Invalid token format' }
        });
      }

      // Create Supabase client lazily
      const { createClient } = require('@supabase/supabase-js');
      const supabaseLocal = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      );

      // Get user profile to determine role/platform admin/chain context
      const { data: userProfile, error: profileError } = await supabaseLocal
        .from('user_profiles')
        .select('id, user_id, role, chain_id, is_platform_admin, is_active')
        .eq('user_id', currentUserId)
        .single();

      if (profileError || !userProfile) {
        return res.status(404).json({
          error: { code: 'PROFILE_NOT_FOUND', message: 'User profile not found' }
        });
      }

      // Handle platform admin: bypass branch requirement
      if (userProfile.is_platform_admin) {
        req.currentUserId = currentUserId;
        req.userRole = 'platform_admin';
        req.isPlatformAdmin = true;
        return next();
      }

      // Handle chain owner: provide chain context, no branch required
      if (userProfile.role === 'chain_owner') {
        if (!userProfile.is_active) {
          return res.status(403).json({
            error: { code: 'ACCOUNT_INACTIVE', message: 'User account is inactive' }
          });
        }
        req.currentUserId = currentUserId;
        req.userRole = 'chain_owner';
        req.userChainId = userProfile.chain_id || null;
        return next();
      }

      // Fallback: require active branch membership for other roles
      const { data: userBranch, error: userBranchError } = await supabaseLocal
        .from('branch_users')
        .select('branch_id, role, is_active')
        .eq('user_id', currentUserId)
        .eq('is_active', true)
        .single();

      if (userBranchError || !userBranch) {
        return res.status(403).json({
          error: { code: 'ACCESS_DENIED', message: 'User not found in any active branch' }
        });
      }

      req.currentUserId = currentUserId;
      req.userBranch = userBranch;
      req.userRole = userBranch.role;
      return next();

    } catch (error) {
      console.error('Auth chain-or-branch middleware error:', error);
      return res.status(500).json({
        error: { code: 'INTERNAL_ERROR', message: 'Authentication processing failed' }
      });
    }
  }
};
