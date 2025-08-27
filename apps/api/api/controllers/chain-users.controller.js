// =====================================================
// CHAIN USERS CONTROLLER
// Unified chain employee management endpoints
// =====================================================

const { handleControllerError } = require('../helpers/error-handler');
const chainUsersService = require('../services/chain-users.service');

/**
 * GET /api/v1/users/chain/:chainId
 * Get all users for a specific chain (chain owners + branch users)
 */
const getChainUsers = async (req, res) => {
  try {
    const { chainId } = req.params;
    const filters = {
      page: req.query.page,
      limit: req.query.limit,
      search: req.query.search,
      isActive: req.query.is_active ? req.query.is_active === 'true' : undefined,
      role: req.query.role,
      level: req.query.level // 'chain' or 'branch'
    };

    const result = await chainUsersService.getChainUsers(chainId, filters);
    
    res.json({
      data: result
    });
  } catch (error) {
    handleControllerError(error, 'fetch chain users', res);
  }
};

/**
 * GET /api/v1/users/chain/:chainId/user/:userId
 * Get specific user by ID within chain context
 */
const getChainUser = async (req, res) => {
  try {
    const { chainId, userId } = req.params;
    
    const user = await chainUsersService.getChainUser(chainId, userId);
    
    res.json({
      data: user
    });
  } catch (error) {
    handleControllerError(error, 'fetch chain user', res);
  }
};

module.exports = {
  getChainUsers,
  getChainUser
};