// Vercel Serverless Function Entry Point
console.log('🚀 Starting Express API...');
console.log('Node version:', process.version);
console.log('Working directory:', process.cwd());

// Load environment variables for local development
if (process.env.NODE_ENV !== 'production') {
  try {
    require('dotenv').config();
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
const branchSettingsRoutes = require('./routes/branch-settings.routes');
const customerBranchRoutes = require('./routes/customer-branch.routes');
const adminBranchRoutes = require('./routes/admin-branch.routes');
const chainUsersRoutes = require('./routes/chain-users.routes');
const platformAdminRoutes = require('./routes/platform-admin.routes');
const customerChainsRoutes = require('./routes/customer-chains.routes');
const commissionRoutes = require('./routes/commission');
const stripeRoutes = require('./routes/stripe');
const refundsRoutes = require('./routes/refunds');
const notificationsRoutes = require('./routes/notifications');
const webhookTestRoutes = require('./routes/webhook-test');
const activityLogsRoutes = require('./routes/activity-logs');

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

// Use branches routes (both plural and singular for compatibility)
app.use('/api/v1/branches', branchesRoutes);

// Use branch settings routes (protected - auth required) - BEFORE general branch routes
app.use('/api/v1/branch', branchSettingsRoutes);

// Use general branch routes (after specific settings routes)
app.use('/api/v1/branch', branchesRoutes);

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

// Use platform sync routes (protected - auth required)
app.use('/api/v1/platform-sync', requireAuthWithBranch, platformSyncRoutes);

// Use admin chain routes (platform admin only)
app.use('/api/v1/admin/chains', adminChainRoutes);

// Use admin branch routes (platform admin only)
app.use('/api/v1/admin/branches', adminBranchRoutes);

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

// Use notifications routes (protected - auth required)
app.use('/api/v1/notifications', notificationsRoutes);

// Use webhook testing routes (platform admin only)
app.use('/api/v1/webhook-test', webhookTestRoutes);

// Use activity logs routes (protected - chain owner and platform admin)
app.use('/api/v1/reports/activity-logs', activityLogsRoutes);

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
      'GET /api/v1/platform-sync/skipthedishes/export-csv'
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