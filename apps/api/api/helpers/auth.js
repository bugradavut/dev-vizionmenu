// =====================================================
// AUTHENTICATION HELPER FUNCTIONS
// Extracted from index.js to improve maintainability
// =====================================================

// Helper function to get user branch context from JWT token
async function getUserBranchContext(req, res) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        error: { code: 'UNAUTHORIZED', message: 'Missing or invalid authorization header' }
      });
      return null;
    }

    const token = authHeader.split(' ')[1];
    
    // Simple JWT decode to get user_id
    let userId;
    try {
      const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
      userId = payload.sub;
      
      if (!userId) {
        res.status(401).json({
          error: { code: 'UNAUTHORIZED', message: 'Invalid token - no user ID' }
        });
        return null;
      }
    } catch (error) {
      res.status(401).json({
        error: { code: 'UNAUTHORIZED', message: 'Invalid token format' }
      });
      return null;
    }

    // Import Supabase client
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Get user branch context
    const { data: branchUser, error: branchError } = await supabase
      .from('branch_users')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .single();

    if (branchError || !branchUser) {
      res.status(404).json({
        error: { code: 'USER_NOT_FOUND', message: 'User not found in branch_users table' }
      });
      return null;
    }

    // Check if user is active
    if (!branchUser.is_active) {
      res.status(403).json({
        error: { code: 'ACCOUNT_INACTIVE', message: 'User account is inactive' }
      });
      return null;
    }

    return branchUser;
  } catch (error) {
    console.error('getUserBranchContext error:', error);
    res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'Failed to get user context' }
    });
    return null;
  }
}

module.exports = {
  getUserBranchContext
};