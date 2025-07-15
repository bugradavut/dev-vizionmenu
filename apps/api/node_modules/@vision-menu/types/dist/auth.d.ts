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
}
export interface AuthSession {
    user: User;
    restaurant_id: string;
    role: RestaurantRole;
    permissions: string[];
    access_token: string;
    refresh_token: string;
    expires_at: string;
}
export interface AuthTokenPayload {
    sub: string;
    email: string;
    restaurant_id: string;
    role: RestaurantRole;
    permissions: string[];
    iat: number;
    exp: number;
}
export interface LoginRequest {
    email: string;
    password: string;
    restaurant_slug?: string;
}
export interface LoginResponse {
    user: User;
    session: AuthSession;
    restaurant: {
        id: string;
        name: string;
        slug: string;
    };
}
export interface RegisterRequest {
    email: string;
    password: string;
    full_name: string;
    phone?: string;
    restaurant_name: string;
    restaurant_slug: string;
}
export interface RegisterResponse {
    user: User;
    restaurant: {
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
    role: RestaurantRole;
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
import { RestaurantRole } from "./restaurant";
export interface Permission {
    id: string;
    name: string;
    description: string;
    resource: string;
    action: string;
}
export interface RolePermission {
    role: RestaurantRole;
    permissions: string[];
}
export declare const DEFAULT_PERMISSIONS: Record<RestaurantRole, string[]>;
export interface AuthError {
    code: string;
    message: string;
    details?: Record<string, any>;
}
export type AuthErrorCode = "invalid_credentials" | "user_not_found" | "email_not_verified" | "account_disabled" | "invalid_token" | "token_expired" | "permission_denied" | "restaurant_not_found" | "invitation_not_found" | "invitation_expired" | "invitation_already_used";
//# sourceMappingURL=auth.d.ts.map