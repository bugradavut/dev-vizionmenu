"use client";

import { apiClient, ApiResponse } from './api-client';
import { Campaign, CreateCampaignData, UpdateCampaignData } from '@/types/campaign';

export interface MenuCategory {
  id: string
  name: string
  is_active: boolean
}

export interface MenuItem {
  id: string
  name: string
  category_id: string
  is_available: boolean
}

class CampaignsService {
  async getCategories(): Promise<ApiResponse<MenuCategory[]>> {
    return apiClient.get<MenuCategory[]>('/api/v1/menu/categories');
  }

  async getMenuItems(): Promise<ApiResponse<MenuItem[]>> {
    return apiClient.get<MenuItem[]>('/api/v1/menu/items');
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

  async updateCampaign(id: string, data: UpdateCampaignData): Promise<ApiResponse<Campaign>> {
    return apiClient.patch<Campaign>(`/api/v1/campaigns/${id}`, data);
  }

  async deleteCampaign(id: string): Promise<ApiResponse<void>> {
    return apiClient.delete<void>(`/api/v1/campaigns/${id}`);
  }
}

export const campaignsService = new CampaignsService();