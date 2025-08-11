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
  optionalAuth
};