// =====================================================
// PLATFORM SYNC ROUTES
// API routes for delivery platform integration
// Handles menu sync, order processing, and status updates
// =====================================================

const express = require('express');
const router = express.Router();
const platformSyncController = require('../controllers/platform-sync.controller');

// =====================================================
// UBER EATS ROUTES
// =====================================================

// Menu sync
router.post('/uber-eats/menu', platformSyncController.syncUberEatsMenu);

// Order processing
router.post('/uber-eats/order', platformSyncController.processUberEatsOrder);

// Status updates
router.put('/uber-eats/order/:orderId/status', platformSyncController.updateUberEatsOrderStatus);

// =====================================================
// DOORDASH ROUTES
// =====================================================

// Menu sync
router.post('/doordash/menu', platformSyncController.syncDoorDashMenu);

// Order processing
router.post('/doordash/order', platformSyncController.processDoorDashOrder);

// Order confirmation (accept/reject)
router.post('/doordash/order/:orderId/confirm', platformSyncController.confirmDoorDashOrder);

// Status updates
router.put('/doordash/order/:orderId/status', platformSyncController.updateDoorDashOrderStatus);

// =====================================================
// SKIPTHEDISHES ROUTES
// =====================================================

// Menu sync (via third-party or CSV)
router.post('/skipthedishes/menu', platformSyncController.syncSkipTheDishesMenu);

// Order processing (via third-party webhook)
router.post('/skipthedishes/order', platformSyncController.processSkipTheDishesOrder);

// Status updates (via third-party)
router.put('/skipthedishes/order/:orderId/status', platformSyncController.updateSkipTheDishesOrderStatus);

// CSV export for manual upload
router.get('/skipthedishes/export-csv', platformSyncController.exportSkipTheDishesCSV);

// =====================================================
// GENERAL PLATFORM SYNC ROUTES
// =====================================================

// Get sync status for all platforms
router.get('/status', platformSyncController.getPlatformSyncStatus);

// Bulk sync to multiple platforms
router.post('/bulk-sync', platformSyncController.bulkSyncMenus);

module.exports = router;