import { apiClient } from './api-client';

export interface PlatformAdmin {
  user_id: string;
  email: string;
  full_name: string;
  created_at: string;
  updated_at: string;
}

export interface SearchUser {
  user_id: string;
  email: string;
  full_name: string;
  is_platform_admin: boolean;
}

export interface GetPlatformAdminsResponse {
  admins: PlatformAdmin[];
  total: number;
}

export interface SearchUserResponse {
  user: SearchUser;
}

class PlatformAdminService {
  private baseUrl = '/api/v1/admin';

  async getPlatformAdmins(): Promise<GetPlatformAdminsResponse> {
    const response = await apiClient.get<GetPlatformAdminsResponse>(`${this.baseUrl}/platform-admins`);
    return response.data;
  }

  async searchUserByEmail(email: string): Promise<SearchUser> {
    const response = await apiClient.get<SearchUserResponse>(`${this.baseUrl}/users/search`, { email });
    return response.data.user;
  }

  async createNewPlatformAdmin(userData: { email: string; full_name: string; password: string }): Promise<{ admin: PlatformAdmin; message: string }> {
    const response = await apiClient.post<{ admin: PlatformAdmin; message: string }>(
      `${this.baseUrl}/platform-admins`,
      userData
    );
    return response.data;
  }

  async assignPlatformAdmin(userId: string): Promise<{ admin: PlatformAdmin; message: string }> {
    const response = await apiClient.post<{ admin: PlatformAdmin; message: string }>(
      `${this.baseUrl}/platform-admins/${userId}`
    );
    return response.data;
  }

  async removePlatformAdmin(userId: string): Promise<{ message: string; removedAdmin: PlatformAdmin }> {
    const response = await apiClient.delete<{ message: string; removedAdmin: PlatformAdmin }>(
      `${this.baseUrl}/platform-admins/${userId}`
    );
    return response.data;
  }
}

export const platformAdminService = new PlatformAdminService();