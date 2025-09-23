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
        type: 'unauthorized',
        title: 'Unauthorized',
        status: 401,
        detail: 'Missing or invalid authorization header'
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
          type: 'unauthorized',
          title: 'Unauthorized',
          status: 401,
          detail: 'Invalid token - no user ID'
        });
        return null;
      }
    } catch (error) {
      res.status(401).json({
        type: 'unauthorized',
        title: 'Unauthorized',
        status: 401,
        detail: 'Invalid token format'
      });
      return null;
    }

    // Import Supabase client
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // First try to get user as chain owner
    const { data: chainOwner, error: chainError } = await supabase
      .from('restaurant_chains')
      .select('id, name')
      .eq('owner_id', userId)
      .single();

    if (chainOwner) {
      // User is a chain owner
      return {
        user_id: userId,
        chain_id: chainOwner.id,
        isPlatformAdmin: false,
        isChainOwner: true,
        chainId: chainOwner.id,
        role: 'chain_owner',
        is_active: true
      };
    }

    // If not chain owner, try branch_users with branch info to get chain_id
    const { data: branchUser, error: branchError } = await supabase
      .from('branch_users')
      .select(`
        *,
        branches!inner(
          id,
          name,
          chain_id
        )
      `)
      .eq('user_id', userId)
      .eq('is_active', true)
      .single();

    if (branchError || !branchUser) {
      res.status(404).json({
        type: 'user_not_found',
        title: 'User Not Found',
        status: 404,
        detail: 'User not found in branch_users table or as chain owner'
      });
      return null;
    }

    // Check if user is active
    if (!branchUser.is_active) {
      res.status(403).json({
        type: 'account_inactive',
        title: 'Account Inactive',
        status: 403,
        detail: 'User account is inactive'
      });
      return null;
    }

    return {
      ...branchUser,
      chainId: branchUser.branches.chain_id,
      branchId: branchUser.branch_id,
      isPlatformAdmin: false,
      isChainOwner: false
    };
  } catch (error) {
    console.error('getUserBranchContext error:', error);
    res.status(500).json({
      type: 'internal_error',
      title: 'Internal Error',
      status: 500,
      detail: 'Failed to get user context'
    });
    return null;
  }
}

module.exports = {
  getUserBranchContext
};