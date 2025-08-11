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

// Global Supabase client initialization
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const app = express();
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
app.use('/auth', authRoutes);

// Use users routes
app.use('/api/v1/users', usersRoutes);

// Use orders routes
app.use('/api/v1/orders', ordersRoutes);

// Use branches routes
app.use('/api/v1/branch', branchesRoutes);

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
      'PUT /api/v1/branch/:branchId/settings'
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
  });
}

// Export for Vercel
module.exports = app;