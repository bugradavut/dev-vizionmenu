/**
 * Auth API Service
 * Authentication and session management operations
 */

import { apiClient } from './api-client';
import type {
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  RegisterResponse,
  ForgotPasswordRequest,
  ResetPasswordRequest,
  ChangePasswordRequest,
  UpdateProfileRequest,
  SwitchBranchRequest,
  SwitchBranchResponse,
  User,
} from '@repo/types/auth';

export class AuthService {
  /**
   * Login user with email and password
   */
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    const response = await apiClient.post<LoginResponse>('/auth/login', credentials);
    return response.data;
  }

  /**
   * Register new chain owner
   */
  async register(userData: RegisterRequest): Promise<RegisterResponse> {
    const response = await apiClient.post<RegisterResponse>('/auth/register', userData);
    return response.data;
  }

  /**
   * Get current user profile
   */
  async getProfile(): Promise<User> {
    const response = await apiClient.get<User>('/auth/profile');
    return response.data;
  }

  /**
   * Update user profile
   */
  async updateProfile(profileData: UpdateProfileRequest): Promise<User> {
    const response = await apiClient.patch<User>('/auth/profile', profileData);
    return response.data;
  }

  /**
   * Change user password
   */
  async changePassword(passwordData: ChangePasswordRequest): Promise<void> {
    await apiClient.post('/auth/change-password', passwordData);
  }

  /**
   * Request password reset
   */
  async forgotPassword(emailData: ForgotPasswordRequest): Promise<void> {
    await apiClient.post('/auth/forgot-password', emailData);
  }

  /**
   * Reset password with token
   */
  async resetPassword(resetData: ResetPasswordRequest): Promise<void> {
    await apiClient.post('/auth/reset-password', resetData);
  }

  /**
   * Switch to different branch (for chain owners)
   */
  async switchBranch(branchData: SwitchBranchRequest): Promise<SwitchBranchResponse> {
    const response = await apiClient.post<SwitchBranchResponse>(
      '/auth/switch-branch',
      branchData
    );
    return response.data;
  }

  /**
   * Refresh authentication token
   */
  async refreshToken(): Promise<LoginResponse> {
    const response = await apiClient.post<LoginResponse>('/auth/refresh');
    return response.data;
  }

  /**
   * Logout user
   */
  async logout(): Promise<void> {
    await apiClient.post('/auth/logout');
  }
}

// Export singleton instance
export const authService = new AuthService();