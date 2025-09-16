/**
 * Analytics Routes
 * /api/v1/reports/analytics
 */

const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analytics.controller');
const { requireAuthChainOrBranch } = require('../middleware/auth.middleware');

// Apply authentication middleware to all routes - includes branch context
router.use(requireAuthChainOrBranch);

/**
 * @route GET /api/v1/reports/analytics
 * @desc Get analytics data for a restaurant chain
 * @access Chain Owner, Platform Admin
 * @query {string} chainId - Restaurant chain ID (required)
 * @query {string} period - Time period: 7d, 30d, 90d (optional)
 * @query {string} startDate - Custom start date (YYYY-MM-DD, optional)
 * @query {string} endDate - Custom end date (YYYY-MM-DD, optional)
 */
router.get('/', analyticsController.getChainAnalytics);

module.exports = router;