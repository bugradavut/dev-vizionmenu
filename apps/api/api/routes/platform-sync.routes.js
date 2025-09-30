// =====================================================
// PLATFORM SYNC ROUTES
// API routes for delivery platform integration
// Handles menu sync, order processing, and status updates
// =====================================================

const express = require('express');
const router = express.Router();
const platformSyncController = require('../controllers/platform-sync.controller');

// =====================================================
// UBER EATS ROUTES ✅ UPDATED FOR VALIDATION
// =====================================================

// Original routes (keep existing functionality)
router.post('/uber-eats/menu', platformSyncController.syncUberEatsMenu);
router.post('/uber-eats/order', platformSyncController.processUberEatsOrder);
router.put('/uber-eats/order/:orderId/status', platformSyncController.updateUberEatsOrderStatus);

// =====================================================
// UBER EATS INTEGRATION CONFIG ✅ NEW
// Required by Uber for validation approval
// =====================================================
router.post('/uber-eats/integration/activate', platformSyncController.activateUberEatsIntegration);
router.post('/uber-eats/integration/remove', platformSyncController.removeUberEatsIntegration);
router.put('/uber-eats/integration/update', platformSyncController.updateUberEatsIntegrationDetails);

// =====================================================
// UBER EATS ORDER MANAGEMENT ✅ NEW
// Required by Uber for validation approval
// =====================================================
router.post('/uber-eats/orders/:orderId/accept', platformSyncController.acceptUberEatsOrder);
router.post('/uber-eats/orders/:orderId/deny', platformSyncController.denyUberEatsOrder);
router.post('/uber-eats/orders/:orderId/cancel', platformSyncController.cancelUberEatsOrder);
router.get('/uber-eats/orders/:orderId', platformSyncController.getUberEatsOrderDetails);
router.put('/uber-eats/orders/:orderId', platformSyncController.updateUberEatsOrder);

// =====================================================
// UBER EATS MENU MANAGEMENT ✅ NEW
// Required by Uber for validation approval
// =====================================================
router.put('/uber-eats/menu/items/:itemId', platformSyncController.updateUberEatsMenuItem);
router.put('/uber-eats/menu/upload', platformSyncController.uploadUberEatsMenu);

// =====================================================
// UBER EATS STORE MANAGEMENT ✅ NEW
// Required by Uber for validation approval
// =====================================================
router.post('/uber-eats/stores/:storeId/holiday-hours', platformSyncController.updateUberEatsHolidayHours);

// =====================================================
// UBER EATS WEBHOOK RECEIVERS ✅ NEW
// Required by Uber for validation approval - NO AUTH REQUIRED
// =====================================================
router.post('/uber-eats/webhooks/order-notification', platformSyncController.processUberEatsOrderNotificationWebhook);
router.post('/uber-eats/webhooks/order-cancelled', platformSyncController.processUberEatsOrderCancelledWebhook);

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
// UBER DIRECT ROUTES ✅ NEW
// White-label courier dispatch service
// ✅ TEST MODE SAFE - No real deliveries
// =====================================================

// Cancel delivery (Protected - needs auth)
router.post('/uber-direct/cancel', platformSyncController.cancelUberDirectDelivery);

// 🌍 PUBLIC ENDPOINTS (No auth required)
// Customer-facing quote endpoint (no auth needed)
router.post('/uber-direct/quote', platformSyncController.getUberDirectQuote);

// Customer-facing delivery creation (no auth needed - called from customer order flow)
router.post('/uber-direct/delivery', platformSyncController.createUberDirectDelivery);

// Webhook processing (Uber calls this)
router.post('/uber-direct/webhooks', platformSyncController.processUberDirectWebhook);

// Service status (For testing)
router.get('/uber-direct/status', platformSyncController.getUberDirectStatus);

// =====================================================
// GENERAL PLATFORM SYNC ROUTES
// =====================================================

// Get sync status for all platforms
router.get('/status', platformSyncController.getPlatformSyncStatus);

// Bulk sync to multiple platforms
router.post('/bulk-sync', platformSyncController.bulkSyncMenus);

module.exports = router;