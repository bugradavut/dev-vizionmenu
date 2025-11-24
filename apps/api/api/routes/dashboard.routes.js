// =====================================================
// DASHBOARD ROUTES
// Dashboard statistics and analytics route definitions
// =====================================================

const express = require('express');
const dashboardController = require('../controllers/dashboard.controller');
const { requireAuthWithBranch } = require('../middleware/auth.middleware');

const router = express.Router();

// Get dashboard statistics for the authenticated user's branch
router.get('/stats', requireAuthWithBranch, dashboardController.getDashboardStats);

module.exports = router;
