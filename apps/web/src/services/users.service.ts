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
    
    console.log('🚀 SERVICE: Starting getUsersByBranch call for branch:', branch_id);
    console.log('🚀 SERVICE: Full params:', params);
    console.log('🚀 SERVICE: Query params:', queryParams);
    
    // Validate branch_id before making API call
    if (!branch_id || branch_id === 'undefined' || branch_id === 'null') {
      console.log('❌ SERVICE: Invalid branch_id provided:', branch_id);
      console.log('❌ SERVICE: Returning empty response instead of API call');
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
      
      console.log('🔍 Response data keys:', Object.keys(response.data || {}));
      console.log('🔍 Full response data:', JSON.stringify(response.data, null, 2));
      
      // Handle different response formats
      let actualData = response.data;
      
      // Check if response is already in correct format (Express API)
      if (actualData && typeof actualData === 'object' && 'users' in actualData && 'total' in actualData) {
        console.log('✅ Direct Express API format detected');
        const usersData = actualData as GetUsersResponse;
        console.log('✅ Users count:', usersData.users?.length);
        return usersData;
      }
      
      // Handle NestJS wrapped response format: {message, data, success}
      if (actualData && typeof actualData === 'object' && 'data' in actualData) {
        console.log('📦 Found NestJS wrapped response, unwrapping...');
        const wrappedData = actualData as { data: GetUsersResponse };
        actualData = wrappedData.data;
        console.log('📦 Unwrapped data:', actualData);
        console.log('📦 Unwrapped data keys:', Object.keys(actualData || {}));
        
        if (actualData && typeof actualData === 'object' && 'users' in actualData) {
          const usersData = actualData as GetUsersResponse;
          console.log('✅ Users count:', usersData.users?.length);
          return usersData;
        }
      }
      
      console.error('❌ Unrecognized response format:', actualData);
      throw new Error('Invalid response format from users API');
    } catch (error) {
      console.error('❌ Users service error:', error);
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