// =====================================================
// AUTH ROUTES
// Authentication and user profile routes
// =====================================================

const express = require('express');
const authController = require('../controllers/auth.controller');
const { requireAuth } = require('../middleware/auth.middleware');

const router = express.Router();

// Get user profile endpoint
router.get('/profile', requireAuth, authController.getProfile);

module.exports = router;