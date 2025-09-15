"use client";

import { apiClient, ApiResponse } from './api-client';

export interface ActivityLog {
  id: string;
  user_id: string;
  restaurant_chain_id: string;
  branch_id?: string;
  action_type: 'create' | 'update' | 'delete';
  entity_type: string;
  entity_id?: string;
  entity_name?: string;
  changes?: Record<string, unknown>;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
  user?: {
    id: string;
    full_name: string;
    email: string;
  };
  branch?: {
    id: string;
    name: string;
  };
}

export interface ActivityLogFilters {
  page?: number;
  limit?: number;
  actionType?: string;
  entityType?: string;
  userId?: string;
  startDate?: string;
  endDate?: string;
}

export interface ActivityLogStats {
  totalLogs: number;
  logsToday: number;
  mostActiveUser?: {
    user_id: string;
    full_name: string;
    count: number;
  };
  actionTypeBreakdown: {
    create: number;
    update: number;
    delete: number;
  };
  entityTypeBreakdown: Record<string, number>;
}

export interface ActivityLogFilterOptions {
  actionTypes: string[];
  entityTypes: string[];
  users: Array<{
    id: string;
    full_name: string;
    email: string;
  }>;
}

class ActivityLogsService {
  async getActivityLogs(
    chainId: string,
    filters: ActivityLogFilters = {}
  ): Promise<ApiResponse<{
    logs: ActivityLog[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }>> {
    const params = new URLSearchParams();
    params.append('chainId', chainId);

    if (filters.page) params.append('page', filters.page.toString());
    if (filters.limit) params.append('limit', filters.limit.toString());
    if (filters.actionType) params.append('actionType', filters.actionType);
    if (filters.entityType) params.append('entityType', filters.entityType);
    if (filters.userId) params.append('userId', filters.userId);
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);

    return apiClient.get<{
      logs: ActivityLog[];
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    }>(`/api/v1/reports/activity-logs?${params.toString()}`);
  }

  async getActivityStats(
    chainId: string,
    startDate?: string,
    endDate?: string
  ): Promise<ApiResponse<ActivityLogStats>> {
    const params = new URLSearchParams();
    params.append('chainId', chainId);
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);

    return apiClient.get<ActivityLogStats>(`/api/v1/reports/activity-logs/stats?${params.toString()}`);
  }

  async getFilterOptions(chainId: string): Promise<ApiResponse<ActivityLogFilterOptions>> {
    return apiClient.get<ActivityLogFilterOptions>(`/api/v1/reports/activity-logs/filters?chainId=${chainId}`);
  }

  async createActivityLog(data: {
    restaurantChainId: string;
    branchId?: string;
    actionType: 'create' | 'update' | 'delete';
    entityType: string;
    entityId?: string;
    entityName?: string;
    changes?: Record<string, unknown>;
  }): Promise<ApiResponse<ActivityLog>> {
    return apiClient.post<ActivityLog>('/api/v1/reports/activity-logs', data);
  }
}

export const activityLogsService = new ActivityLogsService();