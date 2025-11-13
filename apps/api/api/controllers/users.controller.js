// =====================================================
// USERS CONTROLLER
// User management operations (CRUD, role assignment)
// =====================================================

const usersService = require('../services/users.service');
const { ROLE_HIERARCHY } = require('../helpers/permissions');
const { handleControllerError } = require('../helpers/error-handler');
const { logActivity, logActivityWithDiff } = require('../helpers/audit-logger');

/**
 * POST /api/v1/users
 * Create a new user
 */
const createUser = async (req, res) => {
  try {
    const userData = req.body;
    const currentUserId = req.currentUserId;
    
    if (!currentUserId) {
      return res.status(401).json({
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' }
      });
    }
    
    const result = await usersService.createUser(userData, currentUserId);

    // Audit log: create user (branch-scoped if available) - Enhanced
    await logActivityWithDiff({
      req,
      action: 'create',
      entity: 'user',
      entityId: result?.id,
      entityName: result?.email || result?.full_name,
      branchId: result?.branch_id || userData?.branch_id || null,
      afterData: result || userData,
      tableName: 'user_profiles'
    })

    res.json({ data: result });
    
  } catch (error) {
    handleControllerError(error, 'create user', res);
  }
};

/**
 * PATCH /api/v1/users/:userId/branch/:branchId
 * Update user information
 */
const updateUser = async (req, res) => {
  try {
    const { userId, branchId } = req.params;
    const updateData = req.body;
    const currentUserId = req.currentUserId;

    // Fetch 'before' data BEFORE update operation for audit log (separate queries to avoid relationship issues)
    let beforeData = null;
    try {
      const { createClient } = require('@supabase/supabase-js');
      const supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      );

      // Get branch user data
      const { data: branchUserData, error: branchUserError } = await supabase
        .from('branch_users')
        .select('user_id, branch_id, role, is_active, created_at, updated_at')
        .eq('user_id', userId)
        .eq('branch_id', branchId)
        .single();

      if (branchUserError || !branchUserData) {
        console.warn('[updateUser] Could not fetch branch user before data for audit log:', branchUserError?.message);
      } else {
        // Get user profile data
        const { data: profileData, error: profileError } = await supabase
          .from('user_profiles')
          .select('full_name, email, phone')
          .eq('user_id', userId)
          .single();

        if (profileError) {
          console.warn('[updateUser] Could not fetch user profile before data for audit log:', profileError?.message);
        }

        // Combine data for consistency
        beforeData = {
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
      }
    } catch (fetchError) {
      console.warn('[updateUser] Could not fetch before data for audit log:', fetchError.message);
    }

    const result = await usersService.updateUser(userId, branchId, updateData, currentUserId);

    await logActivityWithDiff({
      req,
      action: 'update',
      entity: 'user',
      entityId: result?.id || userId,
      entityName: result?.email || result?.full_name,
      branchId: branchId,
      beforeData: beforeData,
      afterData: result,
      tableName: 'user_profiles'
    })
    
    res.json({ data: result });
    
  } catch (error) {
    handleControllerError(error, 'update user', res);
  }
};

/**
 * GET /api/v1/users/branch/:branchId
 * Get branch users list with pagination
 */
const getBranchUsers = async (req, res) => {
  try {
    const { branchId } = req.params;
    const { page = 1, limit = 50 } = req.query;
    
    const result = await usersService.getBranchUsers(branchId, page, limit);
    
    res.json({ data: result });
    
  } catch (error) {
    handleControllerError(error, 'get branch users', res);
  }
};

/**
 * POST /api/v1/users/:userId/branch/:branchId/assign-role
 * Assign role to user
 */
const assignUserRole = async (req, res) => {
  try {
    const { userId, branchId } = req.params;
    const { role } = req.body;
    
    // Validate role using hierarchy
    const validRoles = Object.keys(ROLE_HIERARCHY).filter(r => r !== 'super_admin');
    if (!role || !validRoles.includes(role)) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: `Invalid role. Must be one of: ${validRoles.join(', ')}`
        }
      });
    }

    const currentUserId = req.currentUserId;
    const result = await usersService.assignUserRole(userId, branchId, role, currentUserId);

    await logActivityWithDiff({
      req,
      action: 'update',
      entity: 'user_role',
      entityId: userId,
      entityName: result?.user?.email || undefined,
      branchId: branchId,
      afterData: { role: role, user: result?.user },
      tableName: 'user_profiles'
    })
    
    res.json({ data: result });
    
  } catch (error) {
    handleControllerError(error, 'assign user role', res);
  }
};

/**
 * GET /api/v1/users/:userId/data-export
 * Export user's branch data (chain owner only - FO-126)
 * Allows chain owner to export data for deactivated users
 */
const exportUserData = async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.currentUserId;

    if (!currentUserId) {
      return res.status(401).json({
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' }
      });
    }

    // Get current user's profile to check if chain owner
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { data: currentUserProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select('role, is_platform_admin')
      .eq('user_id', currentUserId)
      .single();

    if (profileError || !currentUserProfile) {
      return res.status(403).json({
        error: { code: 'ACCESS_DENIED', message: 'User profile not found' }
      });
    }

    // Check if chain owner or platform admin
    const isChainOwner = currentUserProfile.role === 'chain_owner';
    const isPlatformAdmin = currentUserProfile.is_platform_admin === true;

    if (!isChainOwner && !isPlatformAdmin) {
      return res.status(403).json({
        error: {
          code: 'ACCESS_DENIED',
          message: 'Only chain owners can export user data'
        }
      });
    }

    // Get target user's branch (including inactive users)
    const { data: targetUserBranch, error: branchError } = await supabase
      .from('branch_users')
      .select('branch_id, user_id')
      .eq('user_id', userId)
      .single();

    if (branchError || !targetUserBranch) {
      return res.status(404).json({
        error: {
          code: 'USER_NOT_FOUND',
          message: 'Target user not found in any branch'
        }
      });
    }

    // Generate data export using existing service
    const dataExportService = require('../services/data-export.service');
    const zipBuffer = await dataExportService.generateDataExportZip(targetUserBranch.branch_id);

    // Log activity
    await logActivity({
      req,
      action: 'export',
      entity: 'user_data',
      entityId: userId,
      entityName: 'Admin Data Export',
      branchId: targetUserBranch.branch_id,
    });

    // Get user email for filename
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('email')
      .eq('user_id', userId)
      .single();

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
    const userEmail = userProfile?.email?.split('@')[0] || userId.substring(0, 8);
    const filename = `user-data-export-${userEmail}-${timestamp}.zip`;

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', zipBuffer.length);

    res.send(zipBuffer);

  } catch (error) {
    handleControllerError(error, 'export user data', res);
  }
};

/**
 * DELETE /api/v1/users/:userId/branch/:branchId
 * Delete user (hard delete)
 */
const deleteUser = async (req, res) => {
  try {
    const { userId, branchId } = req.params;
    const currentUserId = req.currentUserId;

    const result = await usersService.deleteUser(userId, branchId, currentUserId);

    await logActivityWithDiff({
      req,
      action: 'delete',
      entity: 'user',
      entityId: userId,
      entityName: result?.email || undefined,
      branchId: branchId,
      beforeData: result,
      tableName: 'user_profiles'
    })
    res.json({ data: result });

  } catch (error) {
    handleControllerError(error, 'delete user', res);
  }
};

module.exports = {
  createUser,
  updateUser,
  getBranchUsers,
  assignUserRole,
  exportUserData,
  deleteUser
};
