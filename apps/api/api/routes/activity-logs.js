/**
 * Activity Logs Routes
 * /api/v1/reports/activity-logs
 */

const express = require('express');
const router = express.Router();
const activityLogsController = require('../controllers/activity-logs.controller');
const { authenticateUser, requireRole } = require('../middleware/auth-middleware');

// Apply authentication middleware to all routes
router.use(authenticateUser);

// Chain Owner and Platform Admin can access activity logs
router.use(requireRole(['chain_owner', 'platform_admin']));

/**
 * @route GET /api/v1/reports/activity-logs
 * @desc Get activity logs for a restaurant chain with pagination and filters
 * @access Chain Owner, Platform Admin
 * @query {string} chainId - Restaurant chain ID (required)
 * @query {number} page - Page number (default: 1)
 * @query {number} limit - Items per page (default: 20, max: 100)
 * @query {string} actionType - Filter by action type (create, update, delete)
 * @query {string} entityType - Filter by entity type (menu_item, user, order, etc.)
 * @query {string} userId - Filter by user ID
 * @query {string} startDate - Filter by start date (ISO format)
 * @query {string} endDate - Filter by end date (ISO format)
 */
router.get('/', activityLogsController.getActivityLogs);

/**
 * @route POST /api/v1/reports/activity-logs
 * @desc Create a new activity log entry
 * @access Chain Owner, Platform Admin
 * @body {string} restaurantChainId - Restaurant chain ID (required)
 * @body {string} branchId - Branch ID (optional)
 * @body {string} actionType - Action type: create, update, delete (required)
 * @body {string} entityType - Entity type: menu_item, user, order, etc. (required)
 * @body {string} entityId - Entity ID (optional)
 * @body {string} entityName - Human readable entity name (optional)
 * @body {object} changes - Before/after values for updates (optional)
 */
router.post('/', activityLogsController.createActivityLog);

/**
 * @route GET /api/v1/reports/activity-logs/stats
 * @desc Get activity statistics for a restaurant chain
 * @access Chain Owner, Platform Admin
 * @query {string} chainId - Restaurant chain ID (required)
 * @query {string} startDate - Filter by start date (ISO format, optional)
 * @query {string} endDate - Filter by end date (ISO format, optional)
 */
router.get('/stats', activityLogsController.getActivityStats);

/**
 * @route GET /api/v1/reports/activity-logs/filters
 * @desc Get available filter options for activity logs
 * @access Chain Owner, Platform Admin
 * @query {string} chainId - Restaurant chain ID (required)
 */
router.get('/filters', activityLogsController.getFilterOptions);

module.exports = router;