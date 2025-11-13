// =====================================================
// USERS ROUTES  
// User management route definitions
// =====================================================

const express = require('express');
const usersController = require('../controllers/users.controller');
const { requireAuth, requireAuthWithBranch } = require('../middleware/auth.middleware');

const router = express.Router();

// Create user endpoint
router.post('/', requireAuth, usersController.createUser);

// Update user endpoint
router.patch('/:userId/branch/:branchId', requireAuth, usersController.updateUser);

// Get branch users endpoint
router.get('/branch/:branchId', requireAuthWithBranch, usersController.getBranchUsers);

// Role assignment endpoint
router.post('/:userId/branch/:branchId/assign-role', requireAuth, usersController.assignUserRole);

// Admin data export endpoint (FO-126 - chain owner only)
router.get('/:userId/data-export', requireAuth, usersController.exportUserData);

// Delete user endpoint
router.delete('/:userId/branch/:branchId', requireAuth, usersController.deleteUser);

module.exports = router;