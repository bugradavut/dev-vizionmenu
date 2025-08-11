// =====================================================
// PERMISSION & ROLE HELPER FUNCTIONS
// Extracted from index.js to improve maintainability
// =====================================================

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

module.exports = {
  ROLE_HIERARCHY,
  canEditUser,
  DEFAULT_PERMISSIONS
};