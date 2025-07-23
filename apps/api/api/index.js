// Vercel Serverless Function Entry Point
const express = require('express');

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

// Create user endpoint
app.post('/api/v1/users', async (req, res) => {
  try {
    const { email, password, full_name, phone, branch_id, role, permissions } = req.body;
    
    // Import Supabase client
    const { createClient } = require('@supabase/supabase-js');
    
    // Create Supabase client with service role key
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    
    // Create user in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password, // ✅ FIX: Add missing password field
      email_confirm: true,
      user_metadata: {
        full_name,
        display_name: full_name,
        phone
      }
    });
    
    if (authError) {
      console.error('Auth user creation error:', authError);
      return res.status(400).json({
        error: 'Auth Error',
        message: `Failed to create auth user: ${authError.message}`
      });
    }
    
    const userId = authData.user.id;
    
    // Create user profile
    const { error: profileError } = await supabase
      .from('user_profiles')
      .insert({
        user_id: userId,
        full_name,
        phone
      });
    
    if (profileError) {
      console.error('Profile creation error:', profileError);
    }
    
    // Add user to branch
    const { data: branchUserData, error: branchError } = await supabase
      .from('branch_users')
      .insert({
        user_id: userId,
        branch_id,
        role,
        permissions,
        is_active: true
      })
      .select()
      .single();
    
    if (branchError) {
      console.error('Branch user creation error:', branchError);
      return res.status(400).json({
        error: 'Database Error',
        message: `Failed to add user to branch: ${branchError.message}`
      });
    }
    
    // Return success response in NestJS format
    res.json({
      data: {
        message: 'User created successfully',
        user_id: userId,
        branch_user: branchUserData
      }
    });
    
  } catch (error) {
    console.error('Create user endpoint error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message
    });
  }
});

// Update user endpoint
app.patch('/api/v1/users/:userId/branch/:branchId', async (req, res) => {
  try {
    const { userId, branchId } = req.params;
    const { email, full_name, phone, is_active } = req.body;
    
    // Import Supabase client
    const { createClient } = require('@supabase/supabase-js');
    
    // Create Supabase client with service role key
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    
    // Check if user exists in this branch
    const { data: existingUser, error: existingUserError } = await supabase
      .from('branch_users')
      .select('*')
      .eq('user_id', userId)
      .eq('branch_id', branchId)
      .single();

    if (existingUserError || !existingUser) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'User not found in this branch'
      });
    }

    // Update user profile if profile fields provided
    if (full_name || phone) {
      const profileUpdate = {};
      if (full_name) profileUpdate.full_name = full_name;
      if (phone) profileUpdate.phone = phone;

      const { error: profileError } = await supabase
        .from('user_profiles')
        .update(profileUpdate)
        .eq('user_id', userId);

      if (profileError) {
        console.error('Profile update error:', profileError);
        return res.status(400).json({
          error: 'Database Error',
          message: `Failed to update user profile: ${profileError.message}`
        });
      }

      // Also update auth user metadata if full_name changed
      if (full_name) {
        const { error: authMetaError } = await supabase.auth.admin.updateUserById(
          userId,
          { 
            user_metadata: { 
              full_name: full_name,
              display_name: full_name 
            } 
          }
        );

        if (authMetaError) {
          // Don't return error - profile update succeeded, this is just for consistency
          console.warn('Profile updated but auth metadata sync failed:', authMetaError);
        }
      }
    }

    // Update auth user email if provided
    if (email) {
      const { error: authError } = await supabase.auth.admin.updateUserById(
        userId,
        { email: email }
      );

      if (authError) {
        console.error('Email update error:', authError);
        return res.status(400).json({
          error: 'Auth Error',
          message: `Failed to update user email: ${authError.message}`
        });
      }
    }

    // Update branch user status if provided
    if (is_active !== undefined) {
      const { error: branchUserError } = await supabase
        .from('branch_users')
        .update({ is_active })
        .eq('user_id', userId)
        .eq('branch_id', branchId);

      if (branchUserError) {
        console.error('Branch user update error:', branchUserError);
        return res.status(400).json({
          error: 'Database Error',
          message: `Failed to update user status: ${branchUserError.message}`
        });
      }
    }
    
    // Return success response in NestJS format
    res.json({
      data: { success: true }
    });
    
  } catch (error) {
    console.error('Update user endpoint error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message
    });
  }
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
    
    // Get branch users (both active and inactive)
    const { data: branchUsers, error } = await supabase
      .from('branch_users')
      .select('*')
      .eq('branch_id', branchId);
      
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
      
    // Get user emails using Supabase Admin API
    const userEmails = [];
    for (const userId of userIds) {
      try {
        const { data: userData, error } = await supabase.auth.admin.getUserById(userId);
        if (userData && userData.user) {
          userEmails.push({
            id: userData.user.id,
            email: userData.user.email
          });
        }
      } catch (err) {
        console.error('Failed to get user email for:', userId, err);
      }
    }
    
    // Combine data
    const users = branchUsers.map(branchUser => {
      const profile = userProfiles?.find(p => p.user_id === branchUser.user_id);
      const emailData = userEmails?.find(u => u.id === branchUser.user_id);
      
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
          email: emailData?.email || `user${branchUser.user_id.substring(0,8)}@example.com`,
          full_name: profile?.full_name || 'No name',
          phone: profile?.phone || null,
          avatar_url: profile?.avatar_url || null
        }
      };
    });
    
    // Return in NestJS format that frontend expects: {data: {users, total, page, limit}}
    res.json({
      data: {
        users,
        total: users.length,
        page: parseInt(page),
        limit: parseInt(limit)
      }
    });
    
  } catch (error) {
    console.error('Users endpoint error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message,
      stack: error.stack
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

// Delete user endpoint (hard delete)
app.delete('/api/v1/users/:userId/branch/:branchId', async (req, res) => {
  try {
    const { userId, branchId } = req.params;
    
    // Import Supabase client
    const { createClient } = require('@supabase/supabase-js');
    
    // Create Supabase client with service role key
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    
    // Check if user exists in this branch
    const { data: existingUser, error: existingUserError } = await supabase
      .from('branch_users')
      .select('*')
      .eq('user_id', userId)
      .eq('branch_id', branchId)
      .single();

    if (existingUserError || !existingUser) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'User not found in this branch'
      });
    }

    // Hard delete - remove user from branch completely
    const { error: deleteError } = await supabase
      .from('branch_users')
      .delete()
      .eq('user_id', userId)
      .eq('branch_id', branchId);

    if (deleteError) {
      console.error('Delete user error:', deleteError);
      return res.status(400).json({
        error: 'Database Error',
        message: `Failed to delete user: ${deleteError.message}`
      });
    }

    // Check if user has other branches
    const { data: otherBranches, error: checkError } = await supabase
      .from('branch_users')
      .select('id')
      .eq('user_id', userId);

    if (!checkError && (!otherBranches || otherBranches.length === 0)) {
      // User has no other branches, delete completely
      await supabase
        .from('user_profiles')
        .delete()
        .eq('user_id', userId);
      
      // Delete from auth system
      await supabase.auth.admin.deleteUser(userId);
    }

    // Return success response in NestJS format
    res.json({
      data: {
        message: 'User deleted successfully'
      }
    });
    
  } catch (error) {
    console.error('Delete user endpoint error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message
    });
  }
});

// Catch all other routes
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    message: 'The requested endpoint does not exist',
    availableRoutes: ['/', '/health', '/api/v1/health', 'GET /api/v1/users/branch/:branchId', 'POST /api/v1/users', 'PATCH /api/v1/users/:userId/branch/:branchId', 'DELETE /api/v1/users/:userId/branch/:branchId', '/test']
  });
});

// Export for Vercel
module.exports = app;