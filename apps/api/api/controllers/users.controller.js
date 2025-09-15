// =====================================================
// USERS CONTROLLER
// User management operations (CRUD, role assignment)
// =====================================================

const usersService = require('../services/users.service');
const { ROLE_HIERARCHY } = require('../helpers/permissions');
const { handleControllerError } = require('../helpers/error-handler');
const { logActivity } = require('../helpers/audit-logger');

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

    // Audit log: create user (branch-scoped if available)
    await logActivity({
      req,
      action: 'create',
      entity: 'user',
      entityId: result?.id,
      entityName: result?.email || result?.full_name,
      branchId: result?.branch_id || userData?.branch_id || null,
      changes: { after: result || userData }
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

    const result = await usersService.updateUser(userId, branchId, updateData, currentUserId);

    await logActivity({
      req,
      action: 'update',
      entity: 'user',
      entityId: result?.id || userId,
      entityName: result?.email || result?.full_name,
      branchId: branchId,
      changes: { update: updateData }
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

    await logActivity({
      req,
      action: 'update',
      entity: 'user_role',
      entityId: userId,
      entityName: result?.user?.email || undefined,
      branchId: branchId,
      changes: { role }
    })
    
    res.json({ data: result });
    
  } catch (error) {
    handleControllerError(error, 'assign user role', res);
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

    await logActivity({
      req,
      action: 'delete',
      entity: 'user',
      entityId: userId,
      entityName: result?.email || undefined,
      branchId: branchId,
      changes: { deleted: true }
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
  deleteUser
};
