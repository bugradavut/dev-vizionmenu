"use client";

/**
 * Daily Closing Service for VizionMenu
 * SW-78 FO-115: Quebec WEB-SRM Daily Closing Receipts (FER)
 * Handles all daily-closing-related API operations with TypeScript types
 */

import { apiClient, type ApiResponse } from './api-client';
import type {
  DailyClosing,
  DailySummary,
  DailyClosingListResponse,
  DailyClosingFilters,
  StartDailyClosingRequest,
  CancelDailyClosingRequest,
  DailyClosingApiResponse,
} from '@/types';

class DailyClosingService {
  /**
   * Get list of daily closings with filtering and pagination
   */
  async getDailyClosings(params?: DailyClosingFilters): Promise<ApiResponse<DailyClosingListResponse>> {
    const queryParams: Record<string, unknown> = {};

    if (params?.page) queryParams.page = params.page;
    if (params?.limit) queryParams.limit = params.limit;
    if (params?.status) queryParams.status = params.status;
    if (params?.date_from) queryParams.date_from = params.date_from;
    if (params?.date_to) queryParams.date_to = params.date_to;
    if (params?.branch_id) queryParams.branch_id = params.branch_id;

    return apiClient.get<DailyClosingListResponse>('/api/v1/daily-closings', queryParams);
  }

  /**
   * Get daily summary for a specific date
   */
  async getDailySummary(date: string): Promise<ApiResponse<DailySummary>> {
    return apiClient.get<DailySummary>(`/api/v1/daily-closings/summary/${date}`);
  }

  /**
   * Get detailed closing information by ID
   */
  async getDailyClosingById(closingId: string): Promise<ApiResponse<DailyClosing>> {
    return apiClient.get<DailyClosing>(`/api/v1/daily-closings/${closingId}`);
  }

  /**
   * Start a new daily closing (draft status)
   */
  async startDailyClosing(data: StartDailyClosingRequest): Promise<ApiResponse<DailyClosingApiResponse>> {
    return apiClient.post<DailyClosingApiResponse>('/api/v1/daily-closings/start', data);
  }

  /**
   * Cancel a daily closing (before completion)
   */
  async cancelDailyClosing(
    closingId: string,
    data: CancelDailyClosingRequest
  ): Promise<ApiResponse<DailyClosingApiResponse>> {
    return apiClient.patch<DailyClosingApiResponse>(`/api/v1/daily-closings/${closingId}/cancel`, data);
  }

  /**
   * Complete a daily closing and send to WEB-SRM
   */
  async completeDailyClosing(closingId: string): Promise<ApiResponse<DailyClosingApiResponse>> {
    return apiClient.patch<DailyClosingApiResponse>(`/api/v1/daily-closings/${closingId}/complete`, {});
  }
}

export const dailyClosingService = new DailyClosingService();
export default dailyClosingService;
