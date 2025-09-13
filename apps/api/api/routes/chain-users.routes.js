// =====================================================
// CHAIN USERS ROUTES
// Route definitions for unified chain employee management
// =====================================================

const express = require('express');
const chainUsersController = require('../controllers/chain-users.controller');
const { requireAuth } = require('../middleware/auth.middleware');

const router = express.Router();

// Get all users for a chain (chain owners + branch users)
router.get('/:chainId', requireAuth, chainUsersController.getChainUsers);

// Get specific user within chain context
router.get('/:chainId/user/:userId', requireAuth, chainUsersController.getChainUser);

module.exports = router;