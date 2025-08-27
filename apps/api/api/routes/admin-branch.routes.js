// =====================================================
// ADMIN BRANCH ROUTES
// Routes for platform admin branch management
// =====================================================

const express = require('express');
const controller = require('../controllers/admin-branch.controller');
const { requireAuth } = require('../middleware/auth.middleware');
const { requirePlatformAdmin } = require('../middleware/platform-admin.middleware');

const router = express.Router();

// All admin routes require authentication and platform admin access
router.use(requireAuth);
router.use(requirePlatformAdmin);

// Branch CRUD operations
router.post('/', controller.createBranch);
router.get('/', controller.getAllBranches);
router.get('/:id', controller.getBranchById);
router.put('/:id', controller.updateBranch);
router.delete('/:id', controller.deleteBranch);

module.exports = router;