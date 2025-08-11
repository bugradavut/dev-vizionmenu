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

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Vision Menu API is running! 🚀',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'production',
    version: '1.0.0'
  });
});

// Health endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'production',
    version: '1.0.0',
    message: 'Backend API is healthy'
  });
});

// API v1 routes
app.get('/api/v1/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    api: 'v1',
    message: 'API v1 is working'
  });
});

// Get user profile endpoint
app.get('/auth/profile', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Missing or invalid authorization header'
      });
    }

    const token = authHeader.split(' ')[1];
    
    // Simple JWT decode to get user_id (skip verification for now)
    let userId;
    try {
      const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
      userId = payload.sub;
      
      if (!userId) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Invalid token - no user ID'
        });
      }
    } catch (error) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid token format'
      });
    }

    // Get user profile with role and permissions (step by step)
    const { data: branchUser, error: branchError } = await supabase
      .from('branch_users')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .single();

    if (branchError || !branchUser) {
      return res.status(404).json({
        error: 'Profile Not Found',
        message: 'User not found in branch_users table'
      });
    }

    // Additional security check: Ensure user is active
    if (!branchUser.is_active) {
      return res.status(403).json({
        error: 'Account Inactive',
        message: 'Your account has been deactivated. Please contact an administrator.'
      });
    }

    // Get user profile
    const { data: userProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select('full_name, phone, avatar_url')
      .eq('user_id', userId)
      .single();

    // Get branch info
    const { data: branchInfo, error: branchInfoError } = await supabase
      .from('branches')
      .select('id, name, chain_id, restaurant_chains(id, name)')
      .eq('id', branchUser.branch_id)
      .single();

    // Get user email from auth.users
    const { data: authUser } = await supabase.auth.admin.getUserById(userId);
    
    // Format response to match frontend expectations
    const userProfileResponse = {
      id: userId,
      email: authUser?.user?.email || 'unknown@example.com',
      full_name: userProfile?.full_name || 'No name',
      phone: userProfile?.phone || null,
      avatar_url: userProfile?.avatar_url || null,
      chain_id: branchInfo?.restaurant_chains?.id || null,
      branch_id: branchUser.branch_id,
      branch_name: branchInfo?.name || 'Unknown branch',
      role: branchUser.role,
      permissions: branchUser.permissions,
      is_active: branchUser.is_active,
      created_at: branchUser.created_at,
      updated_at: branchUser.updated_at
    };

    res.json({
      data: userProfileResponse
    });

  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch user profile'
    });
  }
});

// Create user endpoint
app.post('/api/v1/users', async (req, res) => {
  try {
    const userData = req.body;
    const result = await usersService.createUser(userData);
    
    res.json({ data: result });
    
  } catch (error) {
    console.error('Create user endpoint error:', error);
    if (error.message.includes('Failed to create auth user')) {
      res.status(400).json({
        error: 'Auth Error',
        message: error.message
      });
    } else if (error.message.includes('Failed to add user to branch')) {
      res.status(400).json({
        error: 'Database Error',
        message: error.message
      });
    } else {
      res.status(500).json({
        error: 'Internal Server Error',
        message: error.message
      });
    }
  }
});

// Update user endpoint
app.patch('/api/v1/users/:userId/branch/:branchId', async (req, res) => {
  try {
    const { userId, branchId } = req.params;
    const updateData = req.body;
    
    // Get current user ID from JWT token
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Missing or invalid authorization header'
      });
    }

    const token = authHeader.split(' ')[1];
    let currentUserId;
    try {
      const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
      currentUserId = payload.sub;
    } catch (error) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid token format'
      });
    }

    // Call service function
    const result = await usersService.updateUser(userId, branchId, updateData, currentUserId);
    
    // Return success response in NestJS format
    res.json({ data: result });
    
  } catch (error) {
    console.error('Update user endpoint error:', error);
    if (error.message.includes('User not found in this branch')) {
      res.status(404).json({
        error: 'Not Found',
        message: error.message
      });
    } else if (error.message.includes('permission') || error.message.includes('Insufficient')) {
      res.status(403).json({
        error: 'Forbidden',
        message: error.message
      });
    } else if (error.message.includes('Failed to update user profile')) {
      res.status(400).json({
        error: 'Database Error',
        message: error.message
      });
    } else if (error.message.includes('Failed to update user email')) {
      res.status(400).json({
        error: 'Auth Error',
        message: error.message
      });
    } else if (error.message.includes('Failed to update user status')) {
      res.status(400).json({
        error: 'Database Error',
        message: error.message
      });
    } else {
      res.status(500).json({
        error: 'Internal Server Error',
        message: error.message
      });
    }
  }
});

// Users endpoint for production
app.get('/api/v1/users/branch/:branchId', async (req, res) => {
  try {
    const { branchId } = req.params;
    const { page = 1, limit = 50 } = req.query;
    
    const result = await usersService.getBranchUsers(branchId, page, limit);
    
    // Return in NestJS format that frontend expects: {data: {users, total, page, limit}}
    res.json({ data: result });
    
  } catch (error) {
    console.error('Users endpoint error:', error);
    if (error.message.includes('Failed to get branch users')) {
      res.status(400).json({
        error: 'Database Error',
        message: error.message
      });
    } else {
      res.status(500).json({
        error: 'Internal Server Error',
        message: error.message,
        stack: error.stack
      });
    }
  }
});

// Role assignment endpoint
app.post('/api/v1/users/:userId/branch/:branchId/assign-role', async (req, res) => {
  try {
    const { userId, branchId } = req.params;
    const { role } = req.body;
    
    // Validate role using hierarchy
    const validRoles = Object.keys(ROLE_HIERARCHY).filter(r => r !== 'super_admin'); // Exclude super_admin for now
    if (!role || !validRoles.includes(role)) {
      return res.status(400).json({
        error: 'Validation Error',
        message: `Invalid role. Must be one of: ${validRoles.join(', ')}`
      });
    }

    // Get current user ID from JWT token
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Missing or invalid authorization header'
      });
    }

    const token = authHeader.split(' ')[1];
    let currentUserId;
    try {
      const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
      currentUserId = payload.sub;
    } catch (error) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid token format'
      });
    }

    // Call service function
    const result = await usersService.assignUserRole(userId, branchId, role, currentUserId);
    
    // Return success response in NestJS format
    res.json({ data: result });
    
  } catch (error) {
    console.error('Assign role endpoint error:', error);
    if (error.message.includes('User not found in this branch')) {
      res.status(404).json({
        error: 'Not Found',
        message: error.message
      });
    } else if (error.message.includes('permission') || error.message.includes('Insufficient')) {
      res.status(403).json({
        error: 'Forbidden',
        message: error.message
      });
    } else if (error.message.includes('Failed to assign role')) {
      res.status(400).json({
        error: 'Database Error',
        message: error.message
      });
    } else {
      res.status(500).json({
        error: 'Internal Server Error',
        message: error.message
      });
    }
  }
});


// Delete user endpoint (hard delete)
app.delete('/api/v1/users/:userId/branch/:branchId', async (req, res) => {
  try {
    const { userId, branchId } = req.params;

    // Get current user ID from JWT token
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Missing or invalid authorization header'
      });
    }

    const token = authHeader.split(' ')[1];
    let currentUserId;
    try {
      const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
      currentUserId = payload.sub;
    } catch (error) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid token format'
      });
    }

    // Call service function
    const result = await usersService.deleteUser(userId, branchId, currentUserId);

    // Return success response in NestJS format
    res.json({ data: result });
    
  } catch (error) {
    console.error('Delete user endpoint error:', error);
    if (error.message.includes('User not found in this branch')) {
      res.status(404).json({
        error: 'Not Found',
        message: error.message
      });
    } else if (error.message.includes('permission') || error.message.includes('Insufficient')) {
      res.status(403).json({
        error: 'Forbidden',
        message: error.message
      });
    } else if (error.message.includes('Failed to delete user')) {
      res.status(400).json({
        error: 'Database Error',
        message: error.message
      });
    } else {
      res.status(500).json({
        error: 'Internal Server Error',
        message: error.message
      });
    }
  }
});

// =====================================================
// ORDER MANAGEMENT ENDPOINTS - Modern Implementation
// =====================================================

/**
 * GET /api/v1/orders
 * List branch orders with filtering and pagination
 * 
 * Query Parameters:
 * - status: pending|preparing|ready|completed|cancelled
 * - source: qr_code|uber_eats|doordash|phone|web
 * - page: number (default: 1)
 * - limit: number (default: 20, max: 100)
 * - date_from: ISO date string
 * - date_to: ISO date string
 * - branch_id: UUID (chain_owner only)
 * 
 * Response: { data: Order[], meta: { total, page, limit, totalPages } }
 */
app.get('/api/v1/orders', async (req, res) => {
  try {
    const filters = req.query;

    // Authentication & Authorization
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({
        error: { code: 'UNAUTHORIZED', message: 'Missing or invalid authorization header' }
      });
    }

    const token = authHeader.split(' ')[1];
    let currentUserId;
    try {
      const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
      currentUserId = payload.sub;
      if (!currentUserId) throw new Error('No user ID in token');
    } catch (error) {
      return res.status(401).json({
        error: { code: 'INVALID_TOKEN', message: 'Invalid token format' }
      });
    }

    // Get user's branch context
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    
    const { data: userBranch, error: userBranchError } = await supabase
      .from('branch_users')
      .select('branch_id, role')
      .eq('user_id', currentUserId)
      .eq('is_active', true)
      .single();

    if (userBranchError || !userBranch) {
      return res.status(403).json({
        error: { code: 'ACCESS_DENIED', message: 'User not found in any active branch' }
      });
    }

    // Call service function
    const result = await ordersService.getOrders(filters, userBranch);
    
    res.json(result);
    
  } catch (error) {
    console.error('Orders list endpoint error:', error);
    if (error.message.includes('Failed to fetch orders')) {
      res.status(400).json({
        error: { code: 'DATABASE_ERROR', message: error.message }
      });
    } else {
      res.status(500).json({
        error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch orders' }
      });
    }
  }
});

/**
 * GET /api/v1/orders/:orderId
 * Get detailed order information including items and variants
 * 
 * Response: { data: OrderDetail }
 */
app.get('/api/v1/orders/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;
    
    if (!orderId) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'Order ID is required' }
      });
    }

    // Authentication - DEV MODE: Skip auth for testing
    const authHeader = req.headers.authorization;
    let currentUserId;
    let userBranch;
    
    if (process.env.NODE_ENV === 'development' && (!authHeader || authHeader === 'Bearer null')) {
      // Development mode: Use test user
      currentUserId = 'test-user-id';
      userBranch = {
        branch_id: '550e8400-e29b-41d4-a716-446655440002', // Downtown Branch
        role: 'branch_manager'
      };
    } else {
      // Production auth
      if (!authHeader?.startsWith('Bearer ')) {
        return res.status(401).json({
          error: { code: 'UNAUTHORIZED', message: 'Missing or invalid authorization header' }
        });
      }

      const token = authHeader.split(' ')[1];
      try {
        const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
        currentUserId = payload.sub;
        if (!currentUserId) throw new Error('No user ID in token');
      } catch (error) {
        return res.status(401).json({
          error: { code: 'INVALID_TOKEN', message: 'Invalid token format' }
        });
      }

      const { createClient } = require('@supabase/supabase-js');
      const supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      );

      // Get user's branch context
      const { data: userBranchData, error: userBranchError } = await supabase
        .from('branch_users')
        .select('branch_id, role')
        .eq('user_id', currentUserId)
        .eq('is_active', true)
        .single();

      if (userBranchError || !userBranchData) {
        return res.status(403).json({
          error: { code: 'ACCESS_DENIED', message: 'User not found in any active branch' }
        });
      }
      
      userBranch = userBranchData;
    }

    // Use order service to get order details
    const formattedOrder = await ordersService.getOrderDetail(orderId, userBranch);

    res.json({ data: formattedOrder });
    
  } catch (error) {
    console.error('Order detail endpoint error:', error);
    
    // Handle specific order not found errors from service
    if (error.message === 'Order not found or access denied') {
      return res.status(404).json({
        error: { code: 'ORDER_NOT_FOUND', message: 'Order not found or access denied' }
      });
    }
    
    res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch order details' }
    });
  }
});

/**
 * PATCH /api/v1/orders/:orderId/status
 * Update order status with optional notes and timing
 * 
 * Body: { status: string, notes?: string, estimated_ready_time?: string }
 * Response: { data: { message, orderId, previousStatus, newStatus, updatedAt } }
 */
app.patch('/api/v1/orders/:orderId/status', async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status, notes, estimated_ready_time } = req.body;
    
    // Validation
    if (!orderId) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'Order ID is required' }
      });
    }
    
    const validStatuses = ['pending', 'preparing', 'ready', 'completed', 'cancelled', 'rejected'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        error: { 
          code: 'VALIDATION_ERROR', 
          message: `Invalid status. Must be one of: ${validStatuses.join(', ')}` 
        }
      });
    }

    // Authentication - DEV MODE: Skip auth for testing
    const authHeader = req.headers.authorization;
    let currentUserId;
    let userBranch;
    
    if (process.env.NODE_ENV === 'development' && (!authHeader || authHeader === 'Bearer null')) {
      // Development mode: Use test user
      currentUserId = 'test-user-id';
      userBranch = {
        branch_id: '550e8400-e29b-41d4-a716-446655440002', // Downtown Branch
        role: 'branch_manager'
      };
      console.log('🧪 DEV MODE: Using test authentication for status update');
    } else {
      // Production auth
      if (!authHeader?.startsWith('Bearer ')) {
        return res.status(401).json({
          error: { code: 'UNAUTHORIZED', message: 'Missing or invalid authorization header' }
        });
      }

      const token = authHeader.split(' ')[1];
      try {
        const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
        currentUserId = payload.sub;
        if (!currentUserId) throw new Error('No user ID in token');
      } catch (error) {
        return res.status(401).json({
          error: { code: 'INVALID_TOKEN', message: 'Invalid token format' }
        });
      }

      const { createClient } = require('@supabase/supabase-js');
      const supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      );

      // Get user's branch context
      const { data: userBranchData, error: userBranchError } = await supabase
        .from('branch_users')
        .select('branch_id, role')
        .eq('user_id', currentUserId)
        .eq('is_active', true)
        .single();

      if (userBranchError || !userBranchData) {
        return res.status(403).json({
          error: { code: 'ACCESS_DENIED', message: 'User not found in any active branch' }
        });
      }
      
      userBranch = userBranchData;
    }

    // Use order service to update order status
    const updateData = { status, notes, estimated_ready_time };
    const result = await ordersService.updateOrderStatus(orderId, updateData, userBranch);

    // Success response optimized for mobile
    res.json({ data: result });
    
  } catch (error) {
    console.error('Update order status endpoint error:', error);
    
    // Handle specific errors from service
    if (error.message === 'Order not found or access denied') {
      return res.status(404).json({
        error: { code: 'ORDER_NOT_FOUND', message: 'Order not found or access denied' }
      });
    }
    
    if (error.message.startsWith('Invalid status') || error.message.includes('Must be one of')) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: error.message }
      });
    }
    
    if (error.message.startsWith('Failed to update order')) {
      return res.status(400).json({
        error: { code: 'UPDATE_FAILED', message: error.message }
      });
    }
    
    res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'Failed to update order status' }
    });
  }
});

/**
 * POST /api/v1/orders/auto-accept-check  
 * Check if new orders should be auto-accepted based on branch settings
 * Called when new orders are created externally (QR code, third-party platforms)
 * 
 * Body: { orderId: string, branchId: string }
 * Response: { data: { autoAccepted: boolean, status: string, message: string } }
 */
app.post('/api/v1/orders/auto-accept-check', async (req, res) => {
  try {
    const { orderId, branchId } = req.body;
    
    // Validation
    if (!orderId || !branchId) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'orderId and branchId are required' }
      });
    }

    // Use order service for auto-accept check
    const result = await ordersService.checkAutoAccept(orderId, branchId);

    res.json({ data: result });

  } catch (error) {
    console.error('Auto-accept check endpoint error:', error);
    
    // Handle specific errors from service
    if (error.message === 'Order not found') {
      return res.status(404).json({
        error: { code: 'ORDER_NOT_FOUND', message: 'Order not found' }
      });
    }
    
    if (error.message === 'Branch not found') {
      return res.status(404).json({
        error: { code: 'BRANCH_NOT_FOUND', message: 'Branch not found' }
      });
    }
    
    if (error.message === 'Failed to auto-accept order') {
      return res.status(500).json({
        error: { code: 'UPDATE_FAILED', message: 'Failed to auto-accept order' }
      });
    }
    
    res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'Failed to check auto-accept' }
    });
  }
});

/**
 * POST /api/v1/orders
 * Create a new order (for internal orders: QR code, web)
 * 
 * Body: { customer, items, orderType, source, tableNumber?, notes? }
 * Response: { data: { order, autoAccepted } }
 */
app.post('/api/v1/orders', async (req, res) => {
  try {
    const { customer, items, orderType, source, tableNumber, notes, specialInstructions } = req.body;
    
    // Validation
    if (!customer || !items || !orderType || !source) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'customer, items, orderType, and source are required' }
      });
    }

    // Only allow internal orders for now (third-party will be added in 2 weeks)
    if (!['qr_code', 'web'].includes(source)) {
      return res.status(400).json({
        error: { code: 'INVALID_SOURCE', message: 'Only qr_code and web orders are supported currently' }
      });
    }

    // Get user/branch context
    const authHeader = req.headers.authorization;
    let branchId = req.body.branchId; // allow explicit branch for public orders

    if (process.env.NODE_ENV === 'development' && (!authHeader || authHeader === 'Bearer null')) {
      // Development mode: Use test branch
      branchId = branchId || '550e8400-e29b-41d4-a716-446655440002'; // Downtown Branch
    } else if (authHeader?.startsWith('Bearer ')) {
      // Authenticated request: derive branch from user context
      const token = authHeader.split(' ')[1];
      try {
        const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
        const userId = payload.sub;
        
        const { createClient } = require('@supabase/supabase-js');
        const supabase = createClient(
          process.env.SUPABASE_URL,
          process.env.SUPABASE_SERVICE_ROLE_KEY
        );
        
        const { data: userBranchData, error: userBranchError } = await supabase
          .from('branch_users')
          .select('branch_id')
          .eq('user_id', userId)
          .eq('is_active', true)
          .single();

        if (userBranchError || !userBranchData) {
          return res.status(403).json({
            error: { code: 'ACCESS_DENIED', message: 'User not found in any active branch' }
          });
        }
        branchId = userBranchData.branch_id;
      } catch (error) {
        return res.status(401).json({
          error: { code: 'INVALID_TOKEN', message: 'Invalid token format' }
        });
      }
    } else {
      // Public order (no Authorization header): require branchId in body and validate origin/branch
      if (!branchId) {
        return res.status(400).json({
          error: { code: 'VALIDATION_ERROR', message: 'branchId is required for unauthenticated orders' }
        });
      }
      // Optional origin check to restrict to known frontend
      const allowedOrigin = process.env.FRONTEND_URL;
      const origin = req.headers.origin;
      if (allowedOrigin && origin && origin !== allowedOrigin) {
        return res.status(403).json({
          error: { code: 'FORBIDDEN', message: 'Invalid request origin' }
        });
      }
      // Validate branch exists and is active
      const { createClient } = require('@supabase/supabase-js');
      const supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      );
      
      const { data: branchRow, error: branchErr } = await supabase
        .from('branches')
        .select('id')
        .eq('id', branchId)
        .eq('is_active', true)
        .single();
      if (branchErr || !branchRow) {
        return res.status(404).json({
          error: { code: 'BRANCH_NOT_FOUND', message: 'Branch not found or inactive' }
        });
      }
    }

    // Use order service to create order
    const orderData = { customer, items, orderType, source, tableNumber, notes, specialInstructions };
    const createResult = await ordersService.createOrder(orderData, branchId);

    // Trigger auto-accept check for Simplified Flow
    let autoAcceptResult = null;
    try {
      // Use order service for auto-accept check instead of internal HTTP call
      autoAcceptResult = await ordersService.checkAutoAccept(createResult.order.id, branchId);
    } catch (error) {
      console.error('Auto-accept check failed:', error);
      // Don't fail the order creation, just log the error
    }

    // Success response
    res.status(201).json({
      data: {
        order: {
          id: createResult.order.id,
          orderNumber: createResult.order.orderNumber,
          status: autoAcceptResult?.status || createResult.order.status,
          total: createResult.order.total,
          createdAt: createResult.order.createdAt
        },
        autoAccepted: autoAcceptResult?.autoAccepted || false,
        autoAcceptMessage: autoAcceptResult?.message || null
      }
    });

  } catch (error) {
    console.error('Create order endpoint error:', error);
    
    // Handle specific errors from service
    if (error.message === 'Only qr_code and web orders are supported currently') {
      return res.status(400).json({
        error: { code: 'INVALID_SOURCE', message: error.message }
      });
    }
    
    if (error.message === 'Failed to create order' || error.message === 'Failed to create order items') {
      return res.status(500).json({
        error: { code: 'CREATE_FAILED', message: error.message }
      });
    }
    
    res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'Failed to create order' }
    });
  }
});

/**
 * POST /api/v1/orders/timer-check
 * Check and auto-advance orders from 'preparing' to 'ready' based on timing settings
 * This endpoint should be called periodically (e.g., every minute) by a cron job or client
 * 
 * Body: { branchId: string }
 * Response: { data: { processed: number, orders: Array<{id, status, message}> } }
 */
app.post('/api/v1/orders/timer-check', async (req, res) => {
  try {
    const { branchId } = req.body;
    
    // Validation
    if (!branchId) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'branchId is required' }
      });
    }

    // Use order service for timer check
    const result = await ordersService.checkOrderTimers(branchId);

    res.json({ data: result });

  } catch (error) {
    console.error('Timer check endpoint error:', error);
    
    // Handle specific errors from service
    if (error.message === 'Branch not found') {
      return res.status(404).json({
        error: { code: 'BRANCH_NOT_FOUND', message: 'Branch not found' }
      });
    }
    
    if (error.message === 'Failed to fetch preparing orders') {
      return res.status(500).json({
        error: { code: 'FETCH_FAILED', message: 'Failed to fetch preparing orders' }
      });
    }
    
    res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'Failed to process timer check' }
    });
  }
});

/**
 * GET /api/v1/branch/:branchId/settings
 * Get branch-specific settings (orderFlow, timingSettings, etc.)
 * 
 * Response: { data: { branchId, settings: { orderFlow, timingSettings } } }
 */
app.get('/api/v1/branch/:branchId/settings', async (req, res) => {
  try {
    const { branchId } = req.params;
    
    // Validation
    if (!branchId) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'Branch ID is required' }
      });
    }

    // Get user authentication context
    const userBranch = await getUserBranchContext(req, res);
    if (!userBranch) return; // Response already sent by getUserBranchContext

    // Authorization: Check if user has access to this branch
    if (userBranch.branch_id !== branchId) {
      return res.status(403).json({
        error: { code: 'FORBIDDEN', message: 'Access denied to this branch settings' }
      });
    }

    // Use branch service to get settings
    const branchSettings = await branchesService.getBranchSettings(branchId);

    // Success response
    res.json({ data: branchSettings });

  } catch (error) {
    console.error('Get branch settings endpoint error:', error);
    
    // Handle specific errors from service
    if (error.message === 'Branch not found') {
      return res.status(404).json({
        error: { code: 'BRANCH_NOT_FOUND', message: 'Branch not found' }
      });
    }
    
    res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'Failed to get branch settings' }
    });
  }
});

// PUT /api/v1/branch/:branchId/settings - Update branch settings  
app.put('/api/v1/branch/:branchId/settings', async (req, res) => {
  try {
    console.log(`PUT /api/v1/branch/${req.params.branchId}/settings - Update branch settings`);
    
    const { branchId } = req.params;
    const { orderFlow, timingSettings } = req.body;
    
    // Validate request
    if (!branchId) {
      return res.status(400).json({
        error: { code: 'MISSING_BRANCH_ID', message: 'Branch ID is required' }
      });
    }

    // Validate orderFlow
    if (!orderFlow || !['standard', 'simplified'].includes(orderFlow)) {
      return res.status(400).json({
        error: { code: 'INVALID_ORDER_FLOW', message: 'orderFlow must be "standard" or "simplified"' }
      });
    }

    // Validate timingSettings if orderFlow is simplified
    if (orderFlow === 'simplified') {
      if (!timingSettings || typeof timingSettings !== 'object') {
        return res.status(400).json({
          error: { code: 'MISSING_TIMING_SETTINGS', message: 'timingSettings is required for simplified flow' }
        });
      }
      
      const { baseDelay, temporaryBaseDelay, deliveryDelay, temporaryDeliveryDelay } = timingSettings;
      
      if (typeof baseDelay !== 'number' || baseDelay < 0 || baseDelay > 120) {
        return res.status(400).json({
          error: { code: 'INVALID_BASE_DELAY', message: 'baseDelay must be a number between 0 and 120' }
        });
      }
      
      if (typeof temporaryBaseDelay !== 'number' || temporaryBaseDelay < -60 || temporaryBaseDelay > 60) {
        return res.status(400).json({
          error: { code: 'INVALID_TEMPORARY_BASE_DELAY', message: 'temporaryBaseDelay must be a number between -60 and 60' }
        });
      }
      
      if (typeof deliveryDelay !== 'number' || deliveryDelay < 0 || deliveryDelay > 120) {
        return res.status(400).json({
          error: { code: 'INVALID_DELIVERY_DELAY', message: 'deliveryDelay must be a number between 0 and 120' }
        });
      }
      
      if (typeof temporaryDeliveryDelay !== 'number' || temporaryDeliveryDelay < -60 || temporaryDeliveryDelay > 60) {
        return res.status(400).json({
          error: { code: 'INVALID_TEMPORARY_DELIVERY_DELAY', message: 'temporaryDeliveryDelay must be a number between -60 and 60' }
        });
      }
    }

    // Get user token and validate authentication
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' }
      });
    }

    const token = authHeader.split(' ')[1];
    
    // Verify JWT token with Supabase
    const { data: user, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user?.user) {
      return res.status(401).json({
        error: { code: 'INVALID_TOKEN', message: 'Invalid authentication token' }
      });
    }

    // Use branch service to update settings
    const settingsData = { orderFlow, timingSettings };
    const result = await branchesService.updateBranchSettings(branchId, settingsData, user.user.id);

    // Success response
    res.json({
      data: result,
      message: 'Branch settings updated successfully'
    });

  } catch (error) {
    console.error('Update branch settings endpoint error:', error);
    
    // Handle specific errors from service
    if (error.message === 'Branch not found') {
      return res.status(404).json({
        error: { code: 'BRANCH_NOT_FOUND', message: 'Branch not found' }
      });
    }
    
    if (error.message === 'User does not have access to this branch') {
      return res.status(403).json({
        error: { code: 'NO_BRANCH_ACCESS', message: 'User does not have access to this branch' }
      });
    }
    
    if (error.message === 'Only branch managers and chain owners can update settings') {
      return res.status(403).json({
        error: { code: 'INSUFFICIENT_PERMISSIONS', message: 'Only branch managers and chain owners can update settings' }
      });
    }
    
    if (error.message === 'Failed to update branch settings') {
      return res.status(500).json({
        error: { code: 'UPDATE_FAILED', message: 'Failed to update branch settings' }
      });
    }
    
    // Handle validation errors
    if (error.message.includes('orderFlow') || error.message.includes('timingSettings') || 
        error.message.includes('baseDelay') || error.message.includes('deliveryDelay')) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: error.message }
      });
    }
    
    res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'Failed to update branch settings' }
    });
  }
});


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