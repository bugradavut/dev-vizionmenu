// Vercel Serverless Function Entry Point
console.log('🚀 Starting Express API...');
console.log('Node version:', process.version);
console.log('Working directory:', process.cwd());

// Load environment variables for local development
if (process.env.NODE_ENV !== 'production') {
  try {
    const path = require('path');
    const envPath = path.resolve(__dirname, '../.env');
    console.log('🔧 Loading .env from:', envPath);
    const result = require('dotenv').config({ path: envPath });
    if (result.error) {
      console.log('⚠️  Failed to load .env:', result.error.message);
    } else {
      console.log('✅ .env loaded successfully');
      console.log('🔍 WEBSRM_ENABLED:', process.env.WEBSRM_ENABLED);
      console.log('🔍 WEBSRM_ENV:', process.env.WEBSRM_ENV);
    }
  } catch (error) {
    console.log('⚠️  dotenv not found, using environment variables directly');
    // Fallback: set environment variables manually for local dev
    if (!process.env.SUPABASE_URL) {
      process.env.SUPABASE_URL = 'https://hfaqldkvnefjerosndxr.supabase.co';
      process.env.SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhmYXFsZGt2bmVmamVyb3NuZHhyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjY2MTA5OSwiZXhwIjoyMDY4MjM3MDk5fQ.Y3mlDpcWtDkTqEXReCvJ5SbvcFobUsNoOzSJ4U8uR6A';
      process.env.SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhmYXFsZGt2bmVmamVyb3NuZHhyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI2NjEwOTksImV4cCI6MjA2ODIzNzA5OX0.32vRT-l4LygkGdJXjIJyUwx2KZcFSG8TIJm95mNlMuQ';
      process.env.SUPABASE_JWT_SECRET = 'or/5hRDTnnaMIMEtgHVxOSB/HUvvB9qazVSKGTtlDSCGGzQoVIZ/IA5lbfuZTyYdM+TCuKeib11cckjlw1yYCw==';
      process.env.FRONTEND_URL = 'http://localhost:3000';
      // Stripe keys should be set via environment variables
      // STRIPE_SECRET_KEY and NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
    }
  }
}

const express = require('express');

// Import helper functions
const { getUserBranchContext } = require('./helpers/auth');
const { ROLE_HIERARCHY, canEditUser, DEFAULT_PERMISSIONS } = require('./helpers/permissions');

// Import services
const usersService = require('./services/users.service');
const ordersService = require('./services/orders.service');
const branchesService = require('./services/branches.service');

// Import middleware
const { requireAuth, requireAuthWithBranch, optionalAuth } = require('./middleware/auth.middleware');

// Import routes
const healthRoutes = require('./routes/health.routes');
const authRoutes = require('./routes/auth.routes');
const usersRoutes = require('./routes/users.routes');
const ordersRoutes = require('./routes/orders.routes');
const branchesRoutes = require('./routes/branches.routes');
const menuCategoriesRoutes = require('./routes/menu-categories.routes');
const menuItemsRoutes = require('./routes/menu-items.routes');
const menuPresetsRoutes = require('./routes/menu-presets.routes');
const customerMenuRoutes = require('./routes/customer-menu.routes');
const customerOrdersRoutes = require('./routes/customer-orders.routes');
const campaignsRoutes = require('./routes/campaigns.routes');
const platformSyncRoutes = require('./routes/platform-sync.routes');
const adminChainRoutes = require('./routes/admin-chain.routes');
// Branch settings routes for delivery zones and advanced settings
const branchSettingsRoutes = require('./routes/branch-settings.routes');
const customerBranchRoutes = require('./routes/customer-branch.routes');
const adminBranchRoutes = require('./routes/admin-branch.routes');
const chainUsersRoutes = require('./routes/chain-users.routes');
const platformAdminRoutes = require('./routes/platform-admin.routes');
const customerChainsRoutes = require('./routes/customer-chains.routes');
const commissionRoutes = require('./routes/commission');
const stripeRoutes = require('./routes/stripe');
const refundsRoutes = require('./routes/refunds');
const paymentMethodChangeRoutes = require('./routes/payment-method-change');
const notificationsRoutes = require('./routes/notifications');
const webhookTestRoutes = require('./routes/webhook-test');
const activityLogsRoutes = require('./routes/activity-logs');
const analyticsRoutes = require('./routes/analytics');
const waiterCallsRoutes = require('./routes/waiter-calls.routes');
const chainTemplatesRoutes = require('./routes/chain-templates.routes');
const offlineEventsRoutes = require('./routes/offline-events.routes');
const uberDirectSettingsRoutes = require('./uber-direct-settings');
const uberEatsAuthRoutes = require('./routes/uber-eats-auth.routes');
const uberEatsWebhooksRoutes = require('./routes/uber-eats-webhooks.routes');
const websrmAdminRoutes = require('./routes/websrm-admin.routes');
const websrmAuditRoutes = require('./routes/websrm-audit.routes');
const websrmQueueRoutes = require('./routes/websrm-queue.routes');
const websrmCertificateRoutes = require('../routes/websrm-certificate.routes');
const dailyClosingRoutes = require('./routes/daily-closing.routes');

// Global Supabase client initialization
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const app = express();

// CRITICAL: Stripe webhooks need raw body, so handle them BEFORE express.json()
app.use('/api/v1/stripe/webhooks', express.raw({ type: 'application/json' }));

// For all other routes, use JSON parsing
app.use(express.json());

// CORS for frontend
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, Cache-Control, Pragma');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Use health routes
app.use('/', healthRoutes);

// Use auth routes
app.use('/api/v1/auth', authRoutes);

// Use users routes
app.use('/api/v1/users', usersRoutes);

// Use chain users routes
app.use('/api/v1/chain-users', chainUsersRoutes);

// Use orders routes
app.use('/api/v1/orders', ordersRoutes);

// Use branch settings routes (priority for delivery zones - protected auth required)
app.use('/api/v1/branch', branchSettingsRoutes);

// Use branches routes (both plural and singular for compatibility)
app.use('/api/v1/branches', branchesRoutes);

// Use menu categories routes
app.use('/api/v1/menu/categories', menuCategoriesRoutes);

// Use menu items routes
app.use('/api/v1/menu/items', menuItemsRoutes);

// Use menu presets routes
app.use('/api/v1/menu/presets', menuPresetsRoutes);

// Use customer menu routes (public - no auth required)
app.use('/api/v1/customer/menu', customerMenuRoutes);

// Use customer orders routes (public - no auth required)
app.use('/api/v1/customer/orders', customerOrdersRoutes);

// Use customer chains routes (public - no auth required) 
app.use('/api/v1/customer/chains', customerChainsRoutes);

// Use customer branch routes (public - no auth required)
app.use('/api/v1/customer', customerBranchRoutes);

// Use campaigns routes
app.use('/api/v1/campaigns', campaignsRoutes);

// 🔓 UBER EATS VALIDATION ENDPOINTS - NO AUTH (Uber calls these for validation)
// Must be declared BEFORE the protected platform-sync routes
const platformSyncController = require('./controllers/platform-sync.controller');

// Webhooks
app.post('/api/v1/platform-sync/uber-eats/webhooks/order-notification', platformSyncController.processUberEatsOrderNotificationWebhook);
app.post('/api/v1/platform-sync/uber-eats/webhooks/order-cancelled', platformSyncController.processUberEatsOrderCancelledWebhook);

// Integration Config
app.post('/api/v1/platform-sync/uber-eats/integration/activate', platformSyncController.activateUberEatsIntegration);
app.post('/api/v1/platform-sync/uber-eats/integration/remove', platformSyncController.removeUberEatsIntegration);
app.put('/api/v1/platform-sync/uber-eats/integration/update', platformSyncController.updateUberEatsIntegrationDetails);

// Menu
app.post('/api/v1/platform-sync/uber-eats/menu/upload', platformSyncController.uploadUberEatsMenu);
app.put('/api/v1/platform-sync/uber-eats/menu/item/:itemId', platformSyncController.updateUberEatsMenuItem);

// Order
app.post('/api/v1/platform-sync/uber-eats/order/:orderId/accept', platformSyncController.acceptUberEatsOrder);
app.post('/api/v1/platform-sync/uber-eats/order/:orderId/cancel', platformSyncController.cancelUberEatsOrder);
app.post('/api/v1/platform-sync/uber-eats/order/:orderId/deny', platformSyncController.denyUberEatsOrder);
app.get('/api/v1/platform-sync/uber-eats/order/:orderId', platformSyncController.getUberEatsOrderDetails);
app.put('/api/v1/platform-sync/uber-eats/order/:orderId', platformSyncController.updateUberEatsOrder);

// Store
app.put('/api/v1/platform-sync/uber-eats/store/holiday-hours', platformSyncController.updateUberEatsStoreHolidayHours);

// Use platform sync routes (protected - auth required)
app.use('/api/v1/platform-sync', requireAuthWithBranch, platformSyncRoutes);

// 🧪 UBER DIRECT PUBLIC ENDPOINTS - For customer orders and webhooks
// Customer delivery creation, webhooks, quotes - NO AUTH required
app.use('/api/v1/uber-direct', platformSyncRoutes);

// Uber Direct branch settings (protected - auth required)
app.post('/api/v1/uber-direct/branch-settings/:branchId', requireAuthWithBranch, uberDirectSettingsRoutes.saveBranchCredentials);
app.get('/api/v1/uber-direct/branch-settings/:branchId', requireAuthWithBranch, uberDirectSettingsRoutes.getBranchCredentials);
app.post('/api/v1/uber-direct/branch-settings/:branchId/test', requireAuthWithBranch, uberDirectSettingsRoutes.testBranchConnection);

// 🔐 UBER EATS OAUTH ROUTES - For restaurant owner OAuth flow
// NO AUTH required - public endpoints for OAuth flow
app.use('/api/v1/uber-eats/auth', uberEatsAuthRoutes);

// 🔔 UBER EATS WEBHOOKS - Receives order notifications from Uber
// NO AUTH required - Uber will send HMAC signature for verification
app.use('/api/v1/uber-eats/webhooks', uberEatsWebhooksRoutes);

// Use admin chain routes (platform admin only)
app.use('/api/v1/admin/chains', adminChainRoutes);

// Use admin branch routes (platform admin only)
app.use('/api/v1/admin/branches', adminBranchRoutes);

// Use WEB-SRM admin routes (platform admin only, DEV/ESSAI only)
app.use('/api/v1/admin/websrm', websrmAdminRoutes);

// Use WEB-SRM certificate routes (FO-109 - certificate management)
// IMPORTANT: More specific routes must come BEFORE less specific routes
console.log('🔐 [FO-109] Registering certificate routes at /api/v1/websrm/certificate');
app.use('/api/v1/websrm/certificate', websrmCertificateRoutes);

// Use WEB-SRM audit routes (SW-78 FO-107 - branch staff auth required)
app.use('/api/v1/websrm', websrmAuditRoutes);

// Use WEB-SRM queue routes (SW-78 FO-106 - queue worker endpoint)
app.use('/api/v1/websrm', websrmQueueRoutes);

// Use daily closing routes (SW-78 FO-115 - daily closing receipts / FER transactions)
app.use('/api/v1/daily-closings', dailyClosingRoutes);

// Use chain users routes (unified chain employee management)
app.use('/api/v1/users/chain', chainUsersRoutes);

// Use platform admin routes (platform admin management)
app.use('/api/v1/admin', platformAdminRoutes);

// Use commission routes (protected)
app.use('/api/v1/commission', commissionRoutes);

// Use Stripe Connect routes (mixed auth - webhooks public, others protected)
app.use('/api/v1/stripe', stripeRoutes);

// Use refunds routes (protected - auth required)
app.use('/api/v1/refunds', refundsRoutes);

// Use payment method change routes (protected - auth required)
app.use('/api/v1/payment-method-change', paymentMethodChangeRoutes);

// Use notifications routes (protected - auth required)
app.use('/api/v1/notifications', notificationsRoutes);

// Use webhook testing routes (platform admin only)
app.use('/api/v1/webhook-test', webhookTestRoutes);

// Use activity logs routes (protected - chain owner and platform admin)
app.use('/api/v1/reports/activity-logs', activityLogsRoutes);

// Use analytics routes (protected - chain owner and platform admin)
app.use('/api/v1/reports/analytics', analyticsRoutes);

// Use waiter calls routes (mixed auth - create public, others protected)
app.use('/api/v1/waiter-calls', waiterCallsRoutes);

// Use offline events routes (SW-78 FO-105 - mixed auth: activate/deactivate public, history protected)
app.use('/api/v1/offline-events', offlineEventsRoutes);

// Use chain templates routes (protected - chain owner access required)
app.use('/api/v1/chains', chainTemplatesRoutes);

// Catch all other routes
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    message: 'The requested endpoint does not exist',
    availableRoutes: [
      '/', 
      '/health', 
      '/api/v1/health', 
      'GET /auth/profile', 
      'GET /api/v1/users/branch/:branchId', 
      'POST /api/v1/users', 
      'PATCH /api/v1/users/:userId/branch/:branchId', 
      'POST /api/v1/users/:userId/branch/:branchId/assign-role', 
      'DELETE /api/v1/users/:userId/branch/:branchId',
      'POST /api/v1/orders',
      'GET /api/v1/orders',
      'GET /api/v1/orders/:orderId',
      'PATCH /api/v1/orders/:orderId/status',
      'POST /api/v1/orders/auto-accept-check',
      'POST /api/v1/orders/timer-check',
      'GET /api/v1/branch/:branchId/settings',
      'PUT /api/v1/branch/:branchId/settings',
      'GET /api/v1/menu/categories',
      'GET /api/v1/menu/categories/:id',
      'POST /api/v1/menu/categories',
      'PUT /api/v1/menu/categories/:id',
      'DELETE /api/v1/menu/categories/:id',
      'PATCH /api/v1/menu/categories/:id/toggle',
      'PUT /api/v1/menu/categories/reorder',
      'GET /api/v1/menu/items',
      'GET /api/v1/menu/items/:id',
      'POST /api/v1/menu/items',
      'PUT /api/v1/menu/items/:id',
      'DELETE /api/v1/menu/items/:id',
      'PATCH /api/v1/menu/items/:id/toggle',
      'POST /api/v1/menu/items/:id/duplicate',
      'PUT /api/v1/menu/items/reorder',
      'POST /api/v1/menu/items/bulk',
      'GET /api/v1/menu/presets',
      'GET /api/v1/menu/presets/:id',
      'POST /api/v1/menu/presets',
      'PUT /api/v1/menu/presets/:id',
      'DELETE /api/v1/menu/presets/:id',
      'POST /api/v1/menu/presets/:id/activate',
      'POST /api/v1/menu/presets/deactivate',
      'POST /api/v1/menu/presets/check-scheduled',
      'POST /api/v1/menu/presets/current-menu',
      'GET /api/v1/customer/menu/:branchId',
      'GET /api/v1/customer/menu/:branchId/info',
      'POST /api/v1/customer/orders',
      'GET /api/v1/customer/orders/:orderId/status',
      'GET /api/v1/platform-sync/status',
      'POST /api/v1/platform-sync/bulk-sync',
      'POST /api/v1/platform-sync/uber-eats/menu',
      'POST /api/v1/platform-sync/uber-eats/order',
      'PUT /api/v1/platform-sync/uber-eats/order/:orderId/status',
      'POST /api/v1/platform-sync/doordash/menu',
      'POST /api/v1/platform-sync/doordash/order',
      'POST /api/v1/platform-sync/doordash/order/:orderId/confirm',
      'PUT /api/v1/platform-sync/doordash/order/:orderId/status',
      'POST /api/v1/platform-sync/skipthedishes/menu',
      'POST /api/v1/platform-sync/skipthedishes/order',
      'PUT /api/v1/platform-sync/skipthedishes/order/:orderId/status',
      'GET /api/v1/platform-sync/skipthedishes/export-csv',
      'POST /api/v1/platform-sync/uber-direct/webhooks'
    ]
  });
});

// Local development server
if (require.main === module) {
  const PORT = process.env.PORT || 3001;
  app.listen(PORT, () => {
    console.log(`🚀 Express API running on http://localhost:${PORT}`);
    console.log(`📋 Available endpoints:`);
    console.log(`   GET  /health`);
    console.log(`   GET  /auth/profile`);
    console.log(`   POST /api/v1/users`);
    console.log(`   GET  /api/v1/users/branch/:branchId`);
    console.log(`   POST /api/v1/users/:userId/branch/:branchId/assign-role`);
    console.log(`   POST /api/v1/orders`);
    console.log(`   GET  /api/v1/orders`);
    console.log(`   GET  /api/v1/orders/:orderId`);
    console.log(`   PATCH /api/v1/orders/:orderId/status`);
    console.log(`   POST /api/v1/orders/auto-accept-check`);
    console.log(`   POST /api/v1/orders/timer-check`);
    console.log(`   GET  /api/v1/branch/:branchId/settings`);
    console.log(`   PUT  /api/v1/branch/:branchId/settings`);
    console.log(`   GET  /api/v1/menu/categories`);
    console.log(`   GET  /api/v1/menu/items`);
    console.log(`   POST /api/v1/menu/items`);
    console.log(`   GET  /api/v1/menu/presets`);
    console.log(`   POST /api/v1/menu/presets/:id/activate`);
    console.log(`   POST /api/v1/menu/categories`);
    console.log(`   PUT  /api/v1/menu/categories/:id`);
    console.log(`   PATCH /api/v1/menu/categories/:id/toggle`);
    console.log(`   GET  /api/v1/platform-sync/status`);
    console.log(`   POST /api/v1/platform-sync/uber-eats/menu`);
    console.log(`   POST /api/v1/platform-sync/doordash/menu`);
    console.log(`   POST /api/v1/platform-sync/skipthedishes/menu`);
  });
}

// Export for Vercel
module.exports = app;