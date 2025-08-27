// =====================================================
// PLATFORM ADMIN ROUTES
// Routes for platform admin management
// =====================================================

const express = require('express');
const controller = require('../controllers/platform-admin.controller');
const { requireAuth } = require('../middleware/auth.middleware');
const { requirePlatformAdmin } = require('../middleware/platform-admin.middleware');

const router = express.Router();

// All admin routes require authentication and platform admin access
router.use(requireAuth);
router.use(requirePlatformAdmin);

// Platform admin management routes
router.get('/platform-admins', controller.getAllPlatformAdmins);
router.post('/platform-admins', controller.createNewPlatformAdmin);
router.post('/platform-admins/:userId', controller.assignPlatformAdmin);
router.delete('/platform-admins/:userId', controller.removePlatformAdmin);

// User search for admin assignment
router.get('/users/search', controller.searchUsers);

module.exports = router;