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
   * Get all users for a specific chain (unified: chain owners + branch users)
   */
  async getUsersByChain(params: GetUsersParams & { chain_id: string }): Promise<GetUsersResponse> {
    const { chain_id, ...queryParams } = params;
    
    // Validate chain_id before making API call
    if (!chain_id || chain_id === 'undefined' || chain_id === 'null') {
      return {
        users: [],
        total: 0,
        page: 1,
        limit: 50
      };
    }
    
    try {
      const response = await apiClient.get<GetUsersResponse>(
        `/api/v1/users/chain/${chain_id}`,
        queryParams
      );
      
      return response.data;
    } catch (error) {
      console.error('Chain users service error:', error);
      throw error;
    }
  }

  /**
   * Get all users for a specific branch (legacy method - kept for compatibility)
   */
  async getUsersByBranch(params: GetUsersParams): Promise<GetUsersResponse> {
    const { branch_id, ...queryParams } = params;
    
    // Validate branch_id before making API call
    if (!branch_id || branch_id === 'undefined' || branch_id === 'null') {
      return {
        users: [],
        total: 0,
        page: 1,
        limit: 50
      };
    }
    
    try {
      const response = await apiClient.get<GetUsersResponse>(
        `/api/v1/users/branch/${branch_id}`,
        queryParams
      );
      
      // Handle different response formats
      let actualData = response.data;
      
      // Check if response is already in correct format (Express API)
      if (actualData && typeof actualData === 'object' && 'users' in actualData && 'total' in actualData) {
        const usersData = actualData as GetUsersResponse;
        return usersData;
      }
      
      // Handle NestJS wrapped response format: {message, data, success}
      if (actualData && typeof actualData === 'object' && 'data' in actualData) {
        const wrappedData = actualData as { data: GetUsersResponse };
        actualData = wrappedData.data;
        
        if (actualData && typeof actualData === 'object' && 'users' in actualData) {
          const usersData = actualData as GetUsersResponse;
          return usersData;
        }
      }
      
      throw new Error('Invalid response format from users API');
    } catch (error) {
      console.error('Users service error:', error);
      throw error;
    }
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
  ): Promise<void> {
    await apiClient.patch<{data: {success: boolean}}>(
      `/api/v1/users/${userId}/branch/${branchId}`,
      userData
    );
    
    // Backend returns {data: {success: true}} but we don't need to return anything
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
   * Toggle user active status
   */
  async toggleUserStatus(
    userId: string,
    branchId: string,
    isActive: boolean
  ): Promise<void> {
    await this.updateUser(userId, branchId, { is_active: isActive });
  }

  /**
   * Delete user from branch (hard delete)
   */
  async removeUser(userId: string, branchId: string): Promise<void> {
    await apiClient.delete(`/api/v1/users/${userId}/branch/${branchId}`);
  }
}

// Export singleton instance
export const usersService = new UsersService();