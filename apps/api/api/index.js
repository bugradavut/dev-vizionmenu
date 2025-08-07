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

// Helper function to get user branch context from JWT token
async function getUserBranchContext(req, res) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        error: { code: 'UNAUTHORIZED', message: 'Missing or invalid authorization header' }
      });
      return null;
    }

    const token = authHeader.split(' ')[1];
    
    // Simple JWT decode to get user_id
    let userId;
    try {
      const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
      userId = payload.sub;
      
      if (!userId) {
        res.status(401).json({
          error: { code: 'UNAUTHORIZED', message: 'Invalid token - no user ID' }
        });
        return null;
      }
    } catch (error) {
      res.status(401).json({
        error: { code: 'UNAUTHORIZED', message: 'Invalid token format' }
      });
      return null;
    }

    // Get user branch context
    const { data: branchUser, error: branchError } = await supabase
      .from('branch_users')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .single();

    if (branchError || !branchUser) {
      res.status(404).json({
        error: { code: 'USER_NOT_FOUND', message: 'User not found in branch_users table' }
      });
      return null;
    }

    // Check if user is active
    if (!branchUser.is_active) {
      res.status(403).json({
        error: { code: 'ACCOUNT_INACTIVE', message: 'User account is inactive' }
      });
      return null;
    }

    return branchUser;
  } catch (error) {
    console.error('getUserBranchContext error:', error);
    res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'Failed to get user context' }
    });
    return null;
  }
}

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
    const { 
      status, 
      source, 
      page = 1, 
      limit = 20, 
      date_from, 
      date_to,
      branch_id 
    } = req.query;
    
    // Input validation
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 20));
    
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

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

    // Determine target branch (chain_owner can access other branches)
    let targetBranchId = userBranch.branch_id;
    if (branch_id && userBranch.role === 'chain_owner') {
      targetBranchId = branch_id;
    }

    // Build query with comprehensive filtering including order items for Kitchen Display
    let query = supabase
      .from('orders')
      .select(`
        id,
        customer_name,
        customer_phone,
        customer_email,
        order_type,
        table_number,
        order_status,
        payment_status,
        payment_method,
        subtotal,
        tax_amount,
        service_fee,
        delivery_fee,
        total_amount,
        notes,
        special_instructions,
        estimated_ready_time,
        third_party_order_id,
        third_party_platform,
        created_at,
        updated_at,
        order_items(
          id,
          menu_item_name,
          menu_item_price,
          quantity,
          item_total,
          special_instructions,
          order_item_variants(*)
        )
      `)
      .eq('branch_id', targetBranchId)
      .order('created_at', { ascending: false });

    // Apply filters - support multiple statuses
    if (status) {
      const statusArray = status.split(',').map(s => s.trim());
      query = query.in('order_status', statusArray);
    }
    if (source) {
      if (source === 'qr_code') {
        query = query.is('third_party_platform', null);
      } else {
        query = query.eq('third_party_platform', source);
      }
    }
    if (date_from) query = query.gte('created_at', date_from);
    if (date_to) query = query.lte('created_at', date_to);

    // Get total count for pagination
    let countQuery = supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('branch_id', targetBranchId);
    
    if (status) {
      const statusArray = status.split(',').map(s => s.trim());
      countQuery = countQuery.in('order_status', statusArray);
    }
    if (source) {
      if (source === 'qr_code') {
        countQuery = countQuery.is('third_party_platform', null);
      } else {
        countQuery = countQuery.eq('third_party_platform', source);
      }
    }
    if (date_from) countQuery = countQuery.gte('created_at', date_from);
    if (date_to) countQuery = countQuery.lte('created_at', date_to);

    // Execute queries in parallel
    const [ordersResult, countResult] = await Promise.all([
      query.range((pageNum - 1) * limitNum, pageNum * limitNum - 1),
      countQuery
    ]);

    if (ordersResult.error) {
      console.error('Orders fetch error:', ordersResult.error);
      return res.status(400).json({
        error: { code: 'DATABASE_ERROR', message: `Failed to fetch orders: ${ordersResult.error.message}` }
      });
    }

    // Format response for mobile app including order items for Kitchen Display
    const formattedOrders = (ordersResult.data || []).map(order => ({
      id: order.id,
      orderNumber: order.id.split('-')[0].toUpperCase(),
      customerName: order.customer_name || 'Walk-in Customer',
      customerPhone: order.customer_phone,
      customerEmail: order.customer_email,
      orderType: order.order_type,
      tableNumber: order.table_number,
      source: order.third_party_platform || (order.table_number ? 'qr_code' : 'web'),
      status: order.order_status,
      paymentStatus: order.payment_status,
      paymentMethod: order.payment_method,
      pricing: {
        subtotal: parseFloat(order.subtotal || 0),
        taxAmount: parseFloat(order.tax_amount || 0),
        serviceFee: parseFloat(order.service_fee || 0),
        deliveryFee: parseFloat(order.delivery_fee || 0),
        total: parseFloat(order.total_amount || 0)
      },
      notes: order.notes,
      specialInstructions: order.special_instructions,
      estimatedReadyTime: order.estimated_ready_time,
      items: (order.order_items || []).map(item => ({
        id: item.id,
        name: item.menu_item_name,
        price: parseFloat(item.menu_item_price || 0),
        quantity: item.quantity || 1,
        total: parseFloat(item.item_total || 0),
        special_instructions: item.special_instructions,
        variants: item.order_item_variants || []
      })),
      created_at: order.created_at,
      updated_at: order.updated_at
    }));

    const totalCount = countResult.count || 0;
    
    res.json({
      data: formattedOrders,
      meta: { 
        total: totalCount,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(totalCount / limitNum),
        hasNextPage: pageNum * limitNum < totalCount,
        hasPreviousPage: pageNum > 1
      }
    });
    
  } catch (error) {
    console.error('Orders list endpoint error:', error);
    res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch orders' }
    });
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
    
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

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

    // Get order with complete details
    // Handle both full UUID and order number formats (ORDER-XXXXX or just XXXXX)
    let order, error;
    let actualOrderId = orderId;
    
    // If it's a full UUID (36 chars with dashes), use direct query
    if (orderId.length === 36 && orderId.includes('-')) {
      const result = await supabase
        .from('orders')
        .select(`
          *,
          order_items(
            *,
            order_item_variants(*)
          )
        `)
        .eq('id', orderId)
        .eq('branch_id', userBranch.branch_id)
        .single();
      
      order = result.data;
      error = result.error;
    } else {
      // Handle ORDER-XXXXX or just XXXXX format
      let searchId = orderId;
      if (orderId.startsWith('ORDER-')) {
        searchId = orderId.substring(6); // Remove 'ORDER-' prefix
      }
      
      // Get all orders for this branch and find matching one
      const { data: allOrders, error: allError } = await supabase
        .from('orders')
        .select('id')
        .eq('branch_id', userBranch.branch_id);
      
      if (allError) {
        error = allError;
      } else {
        const matchingOrder = allOrders.find(o => {
          const shortId = o.id.substring(0, 8).toUpperCase();
          return shortId === searchId.toUpperCase();
        });
        
        if (matchingOrder) {
          actualOrderId = matchingOrder.id;
          // Get full order details
          const result = await supabase
            .from('orders')
            .select(`
              *,
              order_items(
                *,
                order_item_variants(*)
              )
            `)
            .eq('id', matchingOrder.id)
            .eq('branch_id', userBranch.branch_id)
            .single();
          
          order = result.data;
          error = result.error;
        } else {
          error = { message: 'Order not found' };
        }
      }
    }

    if (error || !order) {
      return res.status(404).json({
        error: { code: 'ORDER_NOT_FOUND', message: 'Order not found or access denied' }
      });
    }

    // Format detailed response for frontend (match Order interface)
    const formattedOrder = {
      id: order.id,
      orderNumber: order.id.split('-')[0].toUpperCase(),
      customer: {
        name: order.customer_name || 'Walk-in Customer',
        phone: order.customer_phone || '',
        email: order.customer_email
      },
      source: order.third_party_platform || (order.table_number ? 'qr_code' : 'web'), // 'qr_code' | 'uber_eats' | 'doordash' | 'phone' | 'web'
      status: order.order_status, // 'pending' | 'preparing' | 'ready' | 'completed' | 'cancelled'
      order_type: order.order_type,
      table_number: order.table_number,
      payment_method: order.payment_method,
      pricing: {
        subtotal: parseFloat(order.subtotal || 0),
        tax_amount: parseFloat(order.tax_amount || 0),
        service_fee: parseFloat(order.service_fee || 0),
        delivery_fee: parseFloat(order.delivery_fee || 0),
        total: parseFloat(order.total_amount || 0)
      },
      notes: order.notes,
      special_instructions: order.special_instructions,
      estimated_ready_time: order.estimated_ready_time,
      third_party_order_id: order.third_party_order_id,
      third_party_platform: order.third_party_platform,
      created_at: order.created_at,
      updated_at: order.updated_at,
      items: (order.order_items || []).map(item => ({
        id: item.id,
        name: item.menu_item_name,
        price: parseFloat(item.menu_item_price || 0),
        quantity: item.quantity || 1,
        total: parseFloat(item.item_total || 0),
        special_instructions: item.special_instructions,
        variants: (item.order_item_variants || []).map(variant => ({
          name: variant.variant_name,
          price: parseFloat(variant.variant_price || 0)
        }))
      }))
    };

    res.json({ data: formattedOrder });
    
  } catch (error) {
    console.error('Order detail endpoint error:', error);
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
    
    const validStatuses = ['pending', 'preparing', 'ready', 'completed', 'cancelled'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        error: { 
          code: 'VALIDATION_ERROR', 
          message: `Invalid status. Must be one of: ${validStatuses.join(', ')}` 
        }
      });
    }
    
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

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

    // Handle both UUID and short order number formats
    let actualOrderId = orderId;
    let existingOrder;
    let findError;

    // First try as UUID
    if (orderId.length === 36 && orderId.includes('-')) {
      const { data, error } = await supabase
        .from('orders')
        .select('id, order_status, branch_id')
        .eq('id', orderId)
        .eq('branch_id', userBranch.branch_id)
        .single();
      existingOrder = data;
      findError = error;
    } else {
      // Try as short order number (ORDER-XXXXX format)
      const { data: orders, error } = await supabase
        .from('orders')
        .select('id, order_status, branch_id')
        .eq('branch_id', userBranch.branch_id);

      if (!error && orders) {
        // Find order by short ID pattern matching
        const matchingOrder = orders.find(order => {
          const shortId = order.id.substring(0, 8).toUpperCase();
          const orderNumber = `ORDER-${shortId}`;
          return orderNumber === orderId.toUpperCase();
        });

        if (matchingOrder) {
          existingOrder = matchingOrder;
          actualOrderId = matchingOrder.id;
          findError = null;
        } else {
          findError = { message: 'Order not found' };
        }
      } else {
        findError = error;
      }
    }

    if (findError || !existingOrder) {
      return res.status(404).json({
        error: { code: 'ORDER_NOT_FOUND', message: 'Order not found or access denied' }
      });
    }

    // Get branch settings to check for simplified flow auto-accept logic
    const { data: branchData, error: branchError } = await supabase
      .from('branches')
      .select('settings')
      .eq('id', userBranch.branch_id)
      .single();

    let shouldAutoAccept = false;
    if (!branchError && branchData?.settings) {
      const orderFlow = branchData.settings.orderFlow || 'standard';
      
      // Auto-accept logic for Simplified Flow
      if (orderFlow === 'simplified' && existingOrder.order_status === 'pending' && status === 'preparing') {
        shouldAutoAccept = true;
      }
    }

    // Prepare update data
    const updateData = {
      order_status: status,
      updated_at: new Date().toISOString()
    };

    if (notes) updateData.notes = notes;
    if (estimated_ready_time) updateData.estimated_ready_time = estimated_ready_time;

    // Update order using the actual UUID
    const { data: updatedOrder, error: updateError } = await supabase
      .from('orders')
      .update(updateData)
      .eq('id', actualOrderId)
      .eq('branch_id', userBranch.branch_id)
      .select()
      .single();

    if (updateError) {
      console.error('Order status update error:', updateError);
      return res.status(400).json({
        error: { code: 'UPDATE_FAILED', message: `Failed to update order: ${updateError.message}` }
      });
    }

    // Success response optimized for mobile
    res.json({
      data: {
        success: true,
        message: 'Order status updated successfully',
        orderId: orderId,
        statusChange: {
          from: existingOrder.order_status,
          to: status
        },
        updatedAt: updateData.updated_at,
        order: {
          id: updatedOrder.id,
          status: updatedOrder.order_status,
          notes: updatedOrder.notes,
          estimatedReadyTime: updatedOrder.estimated_ready_time
        }
      }
    });
    
  } catch (error) {
    console.error('Update order status endpoint error:', error);
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
    
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Get order to check current status
    const { data: orderData, error: orderError } = await supabase
      .from('orders')
      .select('id, order_status, branch_id, order_type, third_party_platform')
      .eq('id', orderId)
      .eq('branch_id', branchId)
      .single();

    if (orderError || !orderData) {
      return res.status(404).json({
        error: { code: 'ORDER_NOT_FOUND', message: 'Order not found' }
      });
    }

    // Only process pending orders
    if (orderData.order_status !== 'pending') {
      return res.json({
        data: {
          autoAccepted: false,
          status: orderData.order_status,
          message: `Order already has status: ${orderData.order_status}`
        }
      });
    }

    // Get branch settings
    const { data: branchData, error: branchError } = await supabase
      .from('branches')
      .select('name, settings')
      .eq('id', branchId)
      .single();

    if (branchError || !branchData) {
      return res.status(404).json({
        error: { code: 'BRANCH_NOT_FOUND', message: 'Branch not found' }
      });
    }

    const orderFlow = branchData.settings?.orderFlow || 'standard';
    let shouldAutoAccept = false;
    let reason = '';

    // Auto-accept logic
    if (orderFlow === 'simplified') {
      // Check if it's an internal order (QR code, web) - these can be fully automated
      if (['qr_code', 'web'].includes(orderData.third_party_platform) || !orderData.third_party_platform) {
        shouldAutoAccept = true;
        reason = 'Simplified Flow: Internal order auto-accepted';
      } 
      // Third-party orders (Uber Eats, DoorDash) still need manual confirmation for "Ready" status
      // but can be auto-accepted to "preparing"
      else if (['uber_eats', 'doordash', 'phone'].includes(orderData.third_party_platform)) {
        shouldAutoAccept = true;
        reason = 'Simplified Flow: Third-party order auto-accepted to preparing (ready status requires manual confirmation)';
      }
    } else {
      reason = 'Standard Flow: Manual confirmation required';
    }

    // If should auto-accept, update the order status
    if (shouldAutoAccept) {
      const { data: updatedOrder, error: updateError } = await supabase
        .from('orders')
        .update({ 
          order_status: 'preparing',
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId)
        .select()
        .single();

      if (updateError) {
        console.error('Auto-accept update error:', updateError);
        return res.status(500).json({
          error: { code: 'UPDATE_FAILED', message: 'Failed to auto-accept order' }
        });
      }

      
      return res.json({
        data: {
          autoAccepted: true,
          status: 'preparing',
          message: reason,
          order: {
            id: updatedOrder.id,
            status: updatedOrder.order_status,
            updatedAt: updatedOrder.updated_at
          }
        }
      });
    }

    // No auto-accept needed
    res.json({
      data: {
        autoAccepted: false,
        status: 'pending',
        message: reason
      }
    });

  } catch (error) {
    console.error('Auto-accept check endpoint error:', error);
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
    
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Get user context (for branch_id)
    const authHeader = req.headers.authorization;
    let branchId;
    
    if (process.env.NODE_ENV === 'development' && (!authHeader || authHeader === 'Bearer null')) {
      // Development mode: Use test branch
      branchId = '550e8400-e29b-41d4-a716-446655440002'; // Downtown Branch
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
        const userId = payload.sub;
        
        // Get user's branch context
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
    }

    // Calculate order totals
    const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const taxRate = 0.13; // 13% HST
    const taxAmount = subtotal * taxRate;
    const total = subtotal + taxAmount;

    // Create order in database
    const orderData = {
      branch_id: branchId,
      customer_name: customer.name,
      customer_phone: customer.phone,
      customer_email: customer.email || null,
      order_type: orderType,
      table_number: tableNumber || null,
      order_status: 'pending', // Always start as pending
      payment_status: 'pending',
      subtotal: subtotal,
      tax_amount: taxAmount,
      total_amount: total,
      notes: notes || null,
      special_instructions: specialInstructions || null,
      third_party_platform: source === 'qr_code' ? null : source, // qr_code doesn't set platform
      created_at: new Date().toISOString()
    };

    const { data: createdOrder, error: createError } = await supabase
      .from('orders')
      .insert(orderData)
      .select()
      .single();

    if (createError) {
      console.error('Order creation error:', createError);
      return res.status(500).json({
        error: { code: 'CREATE_FAILED', message: 'Failed to create order' }
      });
    }

    // Create order items
    const orderItems = items.map(item => ({
      order_id: createdOrder.id,
      menu_item_name: item.name,
      menu_item_price: item.price,
      quantity: item.quantity,
      item_total: item.price * item.quantity,
      special_instructions: item.special_instructions || null
    }));

    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(orderItems);

    if (itemsError) {
      console.error('Order items creation error:', itemsError);
      // Rollback order creation
      await supabase.from('orders').delete().eq('id', createdOrder.id);
      return res.status(500).json({
        error: { code: 'CREATE_FAILED', message: 'Failed to create order items' }
      });
    }


    // Trigger auto-accept check for Simplified Flow
    let autoAcceptResult = null;
    try {
      // Call internal auto-accept endpoint
      const autoAcceptResponse = await fetch(`${req.protocol}://${req.get('host')}/api/v1/orders/auto-accept-check`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}` // Use service role for internal call
        },
        body: JSON.stringify({
          orderId: createdOrder.id,
          branchId: branchId
        })
      });

      if (autoAcceptResponse.ok) {
        const result = await autoAcceptResponse.json();
        autoAcceptResult = result.data;
      }
    } catch (error) {
      console.error('Auto-accept check failed:', error);
      // Don't fail the order creation, just log the error
    }

    // Success response
    res.status(201).json({
      data: {
        order: {
          id: createdOrder.id,
          orderNumber: `ORDER-${createdOrder.id.substring(0, 8).toUpperCase()}`,
          status: autoAcceptResult?.status || createdOrder.order_status,
          total: total,
          createdAt: createdOrder.created_at
        },
        autoAccepted: autoAcceptResult?.autoAccepted || false,
        autoAcceptMessage: autoAcceptResult?.message || null
      }
    });

  } catch (error) {
    console.error('Create order endpoint error:', error);
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
    
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Get branch settings
    const { data: branchData, error: branchError } = await supabase
      .from('branches')
      .select('name, settings')
      .eq('id', branchId)
      .single();

    if (branchError || !branchData) {
      return res.status(404).json({
        error: { code: 'BRANCH_NOT_FOUND', message: 'Branch not found' }
      });
    }

    const orderFlow = branchData.settings?.orderFlow || 'standard';
    
    // Only process orders for Simplified Flow
    if (orderFlow !== 'simplified') {
      return res.json({
        data: {
          processed: 0,
          orders: [],
          message: 'Branch uses Standard Flow - no automatic timer processing'
        }
      });
    }

    // Get timing settings
    const timingSettings = branchData.settings?.timingSettings || {
      baseDelay: 20,
      temporaryBaseDelay: 0,
      deliveryDelay: 15,
      temporaryDeliveryDelay: 0,
    };

    // Calculate total preparation time in minutes
    // Kitchen prep time - only base + temporary (no delivery time for kitchen)
    const kitchenPrepTime = timingSettings.baseDelay + timingSettings.temporaryBaseDelay;

    // Get all preparing orders for this branch
    const { data: preparingOrders, error: ordersError } = await supabase
      .from('orders')
      .select('id, order_status, created_at, updated_at, order_type, third_party_platform')
      .eq('branch_id', branchId)
      .eq('order_status', 'preparing');

    if (ordersError) {
      console.error('Failed to fetch preparing orders:', ordersError);
      return res.status(500).json({
        error: { code: 'FETCH_FAILED', message: 'Failed to fetch preparing orders' }
      });
    }

    if (!preparingOrders || preparingOrders.length === 0) {
      return res.json({
        data: {
          processed: 0,
          orders: [],
          message: 'No preparing orders found'
        }
      });
    }

    const now = new Date();
    const processedOrders = [];
    let updatedCount = 0;

    // Check each preparing order
    for (const order of preparingOrders) {
      // Use updated_at as the reference time (when it was moved to 'preparing')
      const prepStartTime = new Date(order.updated_at);
      const minutesSincePrepStart = (now.getTime() - prepStartTime.getTime()) / (1000 * 60);
      
      let shouldAutoReady = false;
      let reason = '';


      // Auto-ready logic based on order type and timing
      if (minutesSincePrepStart >= kitchenPrepTime) {
        // For internal orders (QR code, web, or null platform), auto-ready is allowed
        if (!order.third_party_platform || ['qr_code', 'web'].includes(order.third_party_platform)) {
          shouldAutoReady = true;
          reason = `Internal order auto-ready after ${Math.round(minutesSincePrepStart)} minutes`;
        }
        // For third-party orders, respect manual ready option
        else if (['uber_eats', 'doordash', 'phone'].includes(order.third_party_platform)) {
          // Third-party orders always require manual confirmation for 'ready' status
          // This is a business rule regardless of manualReadyOption setting
          shouldAutoReady = false;
          reason = `Third-party order requires manual 'Ready' confirmation (${Math.round(minutesSincePrepStart)} min elapsed)`;
        }
      } else {
        const remainingMinutes = Math.ceil(kitchenPrepTime - minutesSincePrepStart);
        reason = `Timer pending: ${remainingMinutes} minutes remaining`;
      }

      if (shouldAutoReady) {
        // Update order to ready status
        const { data: updatedOrder, error: updateError } = await supabase
          .from('orders')
          .update({ 
            order_status: 'ready',
            updated_at: now.toISOString()
          })
          .eq('id', order.id)
          .select()
          .single();

        if (updateError) {
          console.error(`Failed to auto-ready order ${order.id}:`, updateError);
          processedOrders.push({
            id: order.id,
            status: 'preparing',
            success: false,
            message: `Auto-ready failed: ${updateError.message}`
          });
        } else {
          updatedCount++;
          processedOrders.push({
            id: order.id,
            status: 'ready',
            success: true,
            message: reason,
            prepTime: Math.round(minutesSincePrepStart)
          });
        }
      } else {
        processedOrders.push({
          id: order.id,
          status: 'preparing',
          success: false,
          message: reason,
          prepTime: Math.round(minutesSincePrepStart)
        });
      }
    }

    res.json({
      data: {
        processed: updatedCount,
        totalChecked: preparingOrders.length,
        orders: processedOrders,
        branchName: branchData.name,
        timingSettings: {
          kitchenPrepTime,
          breakdown: timingSettings
        }
      }
    });

  } catch (error) {
    console.error('Timer check endpoint error:', error);
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

    // Get branch settings from database
    const { data: branchData, error: branchError } = await supabase
      .from('branches')
      .select('id, name, settings')
      .eq('id', branchId)
      .eq('is_active', true)
      .single();

    if (branchError || !branchData) {
      console.error('Branch settings fetch error:', branchError);
      return res.status(404).json({
        error: { code: 'BRANCH_NOT_FOUND', message: 'Branch not found' }
      });
    }

    // Default settings if none exist
    const defaultSettings = {
      orderFlow: 'standard',
      timingSettings: {
        baseDelay: 20,
        temporaryBaseDelay: 0,
        deliveryDelay: 15,
        temporaryDeliveryDelay: 0
      }
    };

    const settings = { ...defaultSettings, ...branchData.settings };

    // Success response
    res.json({
      data: {
        branchId: branchData.id,
        branchName: branchData.name,
        settings: settings
      }
    });

  } catch (error) {
    console.error('Get branch settings endpoint error:', error);
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

    // Check if user has permission to update this branch
    const { data: branchUser, error: branchError } = await supabase
      .from('branch_users')
      .select('role, branch_id')
      .eq('user_id', user.user.id)
      .eq('branch_id', branchId)
      .eq('is_active', true)
      .single();

    if (branchError || !branchUser) {
      return res.status(403).json({
        error: { code: 'NO_BRANCH_ACCESS', message: 'User does not have access to this branch' }
      });
    }

    // Only chain_owner and branch_manager can update settings
    if (!['chain_owner', 'branch_manager'].includes(branchUser.role)) {
      return res.status(403).json({
        error: { code: 'INSUFFICIENT_PERMISSIONS', message: 'Only branch managers and chain owners can update settings' }
      });
    }

    // Verify branch exists
    const { data: branchData, error: branchFetchError } = await supabase
      .from('branches')
      .select('id, name, settings')
      .eq('id', branchId)
      .single();

    if (branchFetchError || !branchData) {
      return res.status(404).json({
        error: { code: 'BRANCH_NOT_FOUND', message: 'Branch not found' }
      });
    }

    // Prepare new settings
    const newSettings = {
      ...branchData.settings,
      orderFlow,
      timingSettings: orderFlow === 'simplified' ? timingSettings : {
        baseDelay: 20,
        temporaryBaseDelay: 0,
        deliveryDelay: 15,
        temporaryDeliveryDelay: 0,
        }
    };

    // Update branch settings in database
    const { data: updatedBranch, error: updateError } = await supabase
      .from('branches')
      .update({ settings: newSettings })
      .eq('id', branchId)
      .select('id, name, settings')
      .single();

    if (updateError) {
      console.error('Failed to update branch settings:', updateError);
      return res.status(500).json({
        error: { code: 'UPDATE_FAILED', message: 'Failed to update branch settings' }
      });
    }

    // Success response
    res.json({
      data: {
        branchId: updatedBranch.id,
        branchName: updatedBranch.name,
        settings: updatedBranch.settings
      },
      message: 'Branch settings updated successfully'
    });

  } catch (error) {
    console.error('Update branch settings endpoint error:', error);
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