export interface User {
  id: string;
  email: string;
  phone?: string;
  full_name?: string;
  avatar_url?: string;
  is_active: boolean;
  email_verified: boolean;
  phone_verified: boolean;
  last_login_at?: string;
  created_at: string;
  updated_at: string;
  // Multi-branch support
  chain_id?: string;
  branch_id?: string;
  branch_name?: string;
  role?: BranchRole;
  permissions?: string[];
  banned_until?: string;
}

export interface AuthSession {
  user: User;
  chain_id: string;
  branch_id: string;
  branch_name: string;
  role: BranchRole;
  permissions: string[];
  access_token: string;
  refresh_token: string;
  expires_at: string;
}

export interface AuthTokenPayload {
  sub: string; // user_id
  email: string;
  chain_id: string;
  branch_id: string;
  branch_name: string;
  role: BranchRole;
  permissions: string[];
  iat: number;
  exp: number;
}

export interface LoginRequest {
  email: string;
  password: string;
  chain_slug?: string;
  branch_slug?: string;
}

export interface LoginResponse {
  user: User;
  session: AuthSession;
  chain: {
    id: string;
    name: string;
    slug: string;
  };
  branch: {
    id: string;
    name: string;
    slug: string;
  };
  available_branches?: {
    id: string;
    name: string;
    slug: string;
  }[];
}

export interface RegisterRequest {
  email: string;
  password: string;
  full_name: string;
  phone?: string;
  chain_name: string;
  chain_slug: string;
  first_branch_name: string;
  first_branch_slug: string;
}

export interface RegisterResponse {
  user: User;
  chain: {
    id: string;
    name: string;
    slug: string;
  };
  branch: {
    id: string;
    name: string;
    slug: string;
  };
  verification_required: boolean;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  new_password: string;
}

export interface ChangePasswordRequest {
  current_password: string;
  new_password: string;
}

export interface UpdateProfileRequest {
  full_name?: string;
  phone?: string;
  avatar_url?: string;
}

export interface VerifyEmailRequest {
  token: string;
}

export interface VerifyPhoneRequest {
  phone: string;
  verification_code: string;
}

export interface InviteUserRequest {
  email: string;
  branch_id: string;
  role: BranchRole;
  permissions: string[];
}

export interface InviteUserResponse {
  invitation_id: string;
  expires_at: string;
}

export interface AcceptInvitationRequest {
  invitation_token: string;
  full_name: string;
  password: string;
}

// Multi-branch role types
export type BranchRole = 'chain_owner' | 'branch_manager' | 'branch_staff' | 'branch_cashier';

export interface Permission {
  id: string;
  name: string;
  description: string;
  resource: string;
  action: string;
}

export interface RolePermission {
  role: BranchRole;
  permissions: string[];
}

export const DEFAULT_PERMISSIONS: Record<BranchRole, string[]> = {
  chain_owner: ["*"], // All permissions across all branches
  branch_manager: [
    "branch:read",
    "branch:write",
    "menu:read",
    "menu:write",
    "orders:read",
    "orders:write",
    "reports:read",
    "users:read",
    "users:write",
    "settings:read",
    "settings:write",
  ],
  branch_staff: [
    "branch:read",
    "menu:read",
    "orders:read",
    "orders:write",
    "reports:read",
  ],
  branch_cashier: [
    "branch:read",
    "menu:read",
    "orders:read",
    "orders:write",
    "payments:read",
    "payments:write",
  ],
};

export interface AuthError {
  code: string;
  message: string;
  details?: Record<string, any>;
}

export type AuthErrorCode =
  | "invalid_credentials"
  | "user_not_found"
  | "email_not_verified"
  | "account_disabled"
  | "invalid_token"
  | "token_expired"
  | "permission_denied"
  | "chain_not_found"
  | "branch_not_found"
  | "invitation_not_found"
  | "invitation_expired"
  | "invitation_already_used"
  | "cross_branch_access_denied";

// Branch switching interface
export interface SwitchBranchRequest {
  branch_id: string;
}

export interface SwitchBranchResponse {
  session: AuthSession;
  branch: {
    id: string;
    name: string;
    slug: string;
  };
}

// User Management Types
export interface CreateUserRequest {
  email: string;
  password: string;
  full_name: string;
  phone?: string;
  branch_id: string;
  role: BranchRole;
  permissions?: string[];
  send_invitation?: boolean;
}

export interface CreateUserResponse {
  user: BranchUser;
}

export interface UpdateUserRequest {
  full_name?: string;
  phone?: string;
  is_active?: boolean;
}

export interface AssignRoleRequest {
  role: BranchRole;
  permissions?: string[];
}

export interface BranchUser {
  id: string;
  user_id: string;
  branch_id: string;
  role: BranchRole;
  permissions: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
  user: User;
}

export interface GetUsersResponse {
  users: BranchUser[];
  total: number;
  page: number;
  limit: number;
}

export interface GetUsersParams {
  branch_id: string;
  page?: number;
  limit?: number;
  search?: string;
  role?: BranchRole;
  is_active?: boolean;
}
