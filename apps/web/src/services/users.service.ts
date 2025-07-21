/**
 * Users API Service
 * Type-safe user management operations
 */

import { apiClient } from './api-client';
import type {
  BranchUser,
  CreateUserRequest,
  CreateUserResponse,
  UpdateUserRequest,
  AssignRoleRequest,
  GetUsersResponse,
  GetUsersParams,
} from '@repo/types/auth';

export class UsersService {
  /**
   * Get all users for a specific branch
   */
  async getUsersByBranch(params: GetUsersParams): Promise<GetUsersResponse> {
    const { branch_id, ...queryParams } = params;
    
    const response = await apiClient.get<{data: GetUsersResponse}>(
      `/api/v1/users/branch/${branch_id}`,
      queryParams
    );
    
    return response.data.data;
  }

  /**
   * Get a specific user by ID and branch
   */
  async getUserById(userId: string, branchId: string): Promise<BranchUser> {
    const response = await apiClient.get<BranchUser>(
      `/api/v1/users/${userId}/branch/${branchId}`
    );
    
    return response.data;
  }

  /**
   * Create a new user in a branch
   */
  async createUser(userData: CreateUserRequest): Promise<CreateUserResponse> {
    const response = await apiClient.post<{data: CreateUserResponse}>(
      '/api/v1/users',
      userData
    );
    
    return response.data.data;
  }

  /**
   * Update user information
   */
  async updateUser(
    userId: string,
    branchId: string,
    userData: UpdateUserRequest
  ): Promise<BranchUser> {
    const response = await apiClient.patch<BranchUser>(
      `/api/v1/users/${userId}/branch/${branchId}`,
      userData
    );
    
    return response.data;
  }

  /**
   * Assign role to user
   */
  async assignRole(
    userId: string,
    branchId: string,
    roleData: AssignRoleRequest
  ): Promise<BranchUser> {
    const response = await apiClient.post<BranchUser>(
      `/api/v1/users/${userId}/branch/${branchId}/assign-role`,
      roleData
    );
    
    return response.data;
  }

  /**
   * Remove user from branch (soft delete)
   */
  async removeUser(userId: string, branchId: string): Promise<void> {
    await apiClient.delete(`/api/v1/users/${userId}/branch/${branchId}`);
  }

  /**
   * Toggle user active status
   */
  async toggleUserStatus(
    userId: string,
    branchId: string,
    isActive: boolean
  ): Promise<BranchUser> {
    return this.updateUser(userId, branchId, { is_active: isActive });
  }
}

// Export singleton instance
export const usersService = new UsersService();