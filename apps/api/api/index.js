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

// Role hierarchy constants for permission checks
const ROLE_HIERARCHY = {
  'super_admin': 4,      // Future super admin role
  'chain_owner': 3,      // Highest current role
  'branch_manager': 2,   // Can manage staff and cashiers
  'branch_staff': 1,     // Can only view
  'branch_cashier': 0    // Lowest permission level
};

// Helper function to check if user can edit target user based on role hierarchy
function canEditUser(currentUserRole, targetUserRole) {
  const currentLevel = ROLE_HIERARCHY[currentUserRole] || -1;
  const targetLevel = ROLE_HIERARCHY[targetUserRole] || -1;
  
  // Can only edit users with equal or lower role level
  return currentLevel >= targetLevel;
}

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
    
    // Import Supabase client
    const { createClient } = require('@supabase/supabase-js');
    
    // Create Supabase client with service role key for database operations
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

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

    // Get current user's role for permission check
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

    // Get current user's role
    const { data: currentUser, error: currentUserError } = await supabase
      .from('branch_users')
      .select('role')
      .eq('user_id', currentUserId)
      .eq('branch_id', branchId)
      .single();

    if (currentUserError || !currentUser) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You do not have permission to perform this action'
      });
    }

    // Check role hierarchy - current user must have equal or higher role level than target user
    if (!canEditUser(currentUser.role, existingUser.role)) {
      return res.status(403).json({
        error: 'Forbidden',
        message: `Cannot edit user with role '${existingUser.role}'. Insufficient permissions.`
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

    // Get current user's role for permission check
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

    // Get current user's role
    const { data: currentUser, error: currentUserError } = await supabase
      .from('branch_users')
      .select('role')
      .eq('user_id', currentUserId)
      .eq('branch_id', branchId)
      .single();

    if (currentUserError || !currentUser) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You do not have permission to perform this action'
      });
    }

    // Check role hierarchy - current user must have permission to edit target user AND assign the new role
    if (!canEditUser(currentUser.role, existingUser.role)) {
      return res.status(403).json({
        error: 'Forbidden',
        message: `Cannot edit user with role '${existingUser.role}'. Insufficient permissions.`
      });
    }

    // Also check if current user can assign the new role (must be equal or higher level than target role)
    if (!canEditUser(currentUser.role, role)) {
      return res.status(403).json({
        error: 'Forbidden',
        message: `Cannot assign role '${role}'. You can only assign roles equal to or lower than your own role level.`
      });
    }

    // Get default permissions for the new role
    const DEFAULT_PERMISSIONS = {
      chain_owner: [
        "users:read", "users:write", "users:delete",
        "menu:read", "menu:write",
        "orders:read", "orders:write",
        "reports:read",
        "settings:read", "settings:write",
        "branch:read", "branch:write"
      ],
      branch_manager: [
        "branch:read", "branch:write",
        "menu:read", "menu:write",
        "orders:read", "orders:write",
        "reports:read",
        "users:read", "users:write",
        "settings:read", "settings:write"
      ],
      branch_staff: [
        "branch:read",
        "menu:read",
        "orders:read", "orders:write",
        "reports:read"
      ],
      branch_cashier: [
        "branch:read",
        "menu:read",
        "orders:read", "orders:write",
        "payments:read", "payments:write"
      ]
    };

    const newPermissions = DEFAULT_PERMISSIONS[role] || [];

    // Update user role AND permissions
    const { data: updatedUser, error: updateError } = await supabase
      .from('branch_users')
      .update({ 
        role: role,
        permissions: newPermissions,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .eq('branch_id', branchId)
      .select()
      .single();

    if (updateError) {
      console.error('Role assignment error:', updateError);
      return res.status(400).json({
        error: 'Database Error',
        message: `Failed to assign role: ${updateError.message}`
      });
    }

    // Return success response in NestJS format
    res.json({
      data: {
        message: 'Role assigned successfully',
        user_id: userId,
        branch_id: branchId,
        new_role: role,
        updated_user: updatedUser
      }
    });
    
  } catch (error) {
    console.error('Assign role endpoint error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message
    });
  }
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

    // Get current user's role for permission check
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

    // Get current user's role
    const { data: currentUser, error: currentUserError } = await supabase
      .from('branch_users')
      .select('role')
      .eq('user_id', currentUserId)
      .eq('branch_id', branchId)
      .single();

    if (currentUserError || !currentUser) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You do not have permission to perform this action'
      });
    }

    // Check role hierarchy - current user must have equal or higher role level than target user
    if (!canEditUser(currentUser.role, existingUser.role)) {
      return res.status(403).json({
        error: 'Forbidden',
        message: `Cannot delete user with role '${existingUser.role}'. Insufficient permissions.`
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
    availableRoutes: ['/', '/health', '/api/v1/health', 'GET /auth/profile', 'GET /api/v1/users/branch/:branchId', 'POST /api/v1/users', 'PATCH /api/v1/users/:userId/branch/:branchId', 'POST /api/v1/users/:userId/branch/:branchId/assign-role', 'DELETE /api/v1/users/:userId/branch/:branchId']
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
  });
}

// Export for Vercel
module.exports = app;