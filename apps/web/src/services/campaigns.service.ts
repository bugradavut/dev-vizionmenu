"use client";

import { apiClient, ApiResponse } from './api-client';
import { Campaign, CreateCampaignData, CampaignsListResponse } from '@/types/campaign';

export interface MenuCategory {
  id: string
  name: string
  is_active: boolean
}

class CampaignsService {
  async getCategories(): Promise<ApiResponse<MenuCategory[]>> {
    return apiClient.get<MenuCategory[]>('/api/v1/menu/categories');
  }

  async getCampaigns(): Promise<ApiResponse<{ campaigns: Campaign[], total: number, page: number, limit: number }>> {
    return apiClient.get<{ campaigns: Campaign[], total: number, page: number, limit: number }>('/api/v1/campaigns');
  }

  async createCampaign(data: CreateCampaignData): Promise<ApiResponse<Campaign>> {
    return apiClient.post<Campaign>('/api/v1/campaigns', data);
  }

  async getCampaign(id: string): Promise<ApiResponse<Campaign>> {
    return apiClient.get<Campaign>(`/api/v1/campaigns/${id}`);
  }

  async updateCampaign(id: string, data: Partial<CreateCampaignData>): Promise<ApiResponse<Campaign>> {
    return apiClient.patch<Campaign>(`/api/v1/campaigns/${id}`, data);
  }

  async deleteCampaign(id: string): Promise<ApiResponse<void>> {
    return apiClient.delete<void>(`/api/v1/campaigns/${id}`);
  }
}

export const campaignsService = new CampaignsService();