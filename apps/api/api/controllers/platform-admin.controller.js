// =====================================================
// PLATFORM ADMIN CONTROLLER
// Route handlers for platform admin management
// =====================================================

const { handleControllerError } = require('../helpers/error-handler');
const platformAdminService = require('../services/platform-admin.service');

/**
 * GET /api/v1/admin/platform-admins
 * Get all platform administrators
 */
const getAllPlatformAdmins = async (req, res) => {
  try {
    const admins = await platformAdminService.getAllPlatformAdmins();

    res.json({
      data: {
        admins,
        total: admins.length
      }
    });

  } catch (error) {
    handleControllerError(error, 'fetch platform admins', res);
  }
};

/**
 * GET /api/v1/admin/users/search
 * Search users by email for admin assignment
 */
const searchUsers = async (req, res) => {
  try {
    const { email } = req.query;

    if (!email) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Email query parameter is required'
      });
    }

    const user = await platformAdminService.searchUserByEmail(email);

    res.json({
      data: {
        user
      }
    });

  } catch (error) {
    handleControllerError(error, 'search users', res);
  }
};

/**
 * POST /api/v1/admin/platform-admins
 * Create new user as platform admin
 */
const createNewPlatformAdmin = async (req, res) => {
  try {
    const { email, full_name, password } = req.body;
    const adminUserId = req.currentUserId;

    if (!email || !full_name || !password) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Email, full name, and password are required'
      });
    }

    const newUser = await platformAdminService.createNewPlatformAdmin(
      { email, full_name, password },
      adminUserId
    );

    res.status(201).json({
      data: {
        message: 'Platform admin user created successfully',
        admin: newUser
      }
    });

  } catch (error) {
    handleControllerError(error, 'create platform admin user', res);
  }
};

/**
 * POST /api/v1/admin/platform-admins/:userId
 * Assign platform admin role to user
 */
const assignPlatformAdmin = async (req, res) => {
  try {
    const { userId } = req.params;
    const adminUserId = req.currentUserId;

    const updatedUser = await platformAdminService.assignPlatformAdmin(userId, adminUserId);

    res.status(201).json({
      data: {
        message: 'Platform admin role assigned successfully',
        admin: updatedUser
      }
    });

  } catch (error) {
    handleControllerError(error, 'assign platform admin', res);
  }
};

/**
 * DELETE /api/v1/admin/platform-admins/:userId
 * Remove platform admin role from user
 */
const removePlatformAdmin = async (req, res) => {
  try {
    const { userId } = req.params;
    const adminUserId = req.currentUserId;

    const result = await platformAdminService.removePlatformAdmin(userId, adminUserId);

    res.json({
      data: result
    });

  } catch (error) {
    handleControllerError(error, 'remove platform admin', res);
  }
};

module.exports = {
  getAllPlatformAdmins,
  searchUsers,
  createNewPlatformAdmin,
  assignPlatformAdmin,
  removePlatformAdmin
};