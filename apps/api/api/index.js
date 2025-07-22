// Vercel Serverless Function Entry Point
const express = require('express');

const app = express();
app.use(express.json());

// CORS for frontend
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
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

// Users endpoint for production
app.get('/api/v1/users/branch/:branchId', async (req, res) => {
  try {
    const { branchId } = req.params;
    const { page = 1, limit = 50 } = req.query;
    
    // Import Supabase client
    const { createClient } = require('@supabase/supabase-js');
    
    // Create Supabase client with service role key
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    
    // Get branch users
    const { data: branchUsers, error } = await supabase
      .from('branch_users')
      .select('*')
      .eq('branch_id', branchId)
      .eq('is_active', true);
      
    if (error) {
      console.error('Supabase error:', error);
      return res.status(400).json({
        error: 'Database Error',
        message: `Failed to get branch users: ${error.message}`
      });
    }
    
    if (!branchUsers || branchUsers.length === 0) {
      return res.json({
        users: [],
        total: 0,
        page: parseInt(page),
        limit: parseInt(limit)
      });
    }
    
    // Get user IDs
    const userIds = branchUsers.map(bu => bu.user_id);
    
    // Get user profiles
    const { data: userProfiles } = await supabase
      .from('user_profiles')
      .select('user_id, full_name, phone, avatar_url')
      .in('user_id', userIds);
    
    // Combine data
    const users = branchUsers.map(branchUser => {
      const profile = userProfiles?.find(p => p.user_id === branchUser.user_id);
      
      return {
        user_id: branchUser.user_id,
        branch_id: branchUser.branch_id,
        role: branchUser.role,
        permissions: branchUser.permissions,
        is_active: branchUser.is_active,
        created_at: branchUser.created_at,
        updated_at: branchUser.updated_at,
        user: {
          user_id: branchUser.user_id,
          email: `user${branchUser.user_id.substring(0,8)}@example.com`, // Mock email
          full_name: profile?.full_name || 'Unknown User',
          phone: profile?.phone || null,
          avatar_url: profile?.avatar_url || null
        }
      };
    });
    
    res.json({
      users,
      total: users.length,
      page: parseInt(page),
      limit: parseInt(limit)
    });
    
  } catch (error) {
    console.error('Users endpoint error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message
    });
  }
});

// Test endpoint
app.get('/test', (req, res) => {
  res.json({
    message: 'Test endpoint working!',
    method: req.method,
    url: req.url,
    timestamp: new Date().toISOString()
  });
});

// Catch all other routes
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    message: 'The requested endpoint does not exist',
    availableRoutes: ['/', '/health', '/api/v1/health', '/api/v1/users/branch/:branchId', '/test']
  });
});

// Export for Vercel
module.exports = app;