// =====================================================
// PERMISSION & ROLE HELPER FUNCTIONS
// Extracted from index.js to improve maintainability
// =====================================================

// Role hierarchy constants for permission checks
const ROLE_HIERARCHY = {
  'platform_admin': 5,   // Platform admin - highest level
  'chain_owner': 3,      // Chain owner - can manage branch users
  'branch_manager': 2,   // Branch manager - can manage staff and cashiers
  'branch_staff': 1,     // Branch staff - can only view
  'branch_cashier': 0    // Branch cashier - lowest permission level
};

// Helper function to check if user can edit target user based on role hierarchy
function canEditUser(currentUserRole, targetUserRole) {
  const currentLevel = ROLE_HIERARCHY[currentUserRole] || -1;
  const targetLevel = ROLE_HIERARCHY[targetUserRole] || -1;
  
  // Can only edit users with equal or lower role level
  return currentLevel >= targetLevel;
}

// Default permissions for each role
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

/**
 * Get roles that a user can create based on their current role
 * @param {string} currentRole - Current user's role
 * @returns {Array} Array of roles the user can create
 */
function getAllowedRolesToCreate(currentRole) {
  const currentLevel = ROLE_HIERARCHY[currentRole] || -1;
  
  // Platform admin can create any role except platform_admin
  if (currentRole === 'platform_admin') {
    return ['chain_owner', 'branch_manager', 'branch_staff', 'branch_cashier'];
  }
  
  // Chain owner can create branch roles only
  if (currentRole === 'chain_owner') {
    return ['branch_manager', 'branch_staff', 'branch_cashier'];
  }
  
  // Branch manager can create staff and cashier only
  if (currentRole === 'branch_manager') {
    return ['branch_staff', 'branch_cashier'];
  }
  
  // Others cannot create users
  return [];
}

/**
 * Check if a user can create a specific role
 * @param {string} currentRole - Current user's role
 * @param {string} targetRole - Role to create
 * @returns {boolean} Whether the user can create this role
 */
function canCreateRole(currentRole, targetRole) {
  const allowedRoles = getAllowedRolesToCreate(currentRole);
  return allowedRoles.includes(targetRole);
}

module.exports = {
  ROLE_HIERARCHY,
  canEditUser,
  DEFAULT_PERMISSIONS,
  getAllowedRolesToCreate,
  canCreateRole
};