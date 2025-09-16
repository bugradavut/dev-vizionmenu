"use client";

import { apiClient, ApiResponse } from "./api-client";

export type PeriodPreset = "7d" | "30d" | "90d" | "custom";

export interface RevenuePoint {
  date: string; // ISO date (YYYY-MM-DD)
  revenue: number;
}

export interface OrdersPoint {
  date: string; // ISO date (YYYY-MM-DD)
  order_count: number;
}

export interface AOVPoint {
  date: string; // ISO date (YYYY-MM-DD)
  aov: number; // Average Order Value
  order_count: number;
  total_revenue: number;
}

export interface SourceBreakdownItem {
  source: string; // e.g., website, qr, mobile, takeaway
  revenue: number;
  order_count: number;
}

export interface ChainAnalyticsSummary {
  totalRevenue: number;
  growthPercent?: number | null;
  averagePerDay?: number | null;
  totalOrders?: number | null;
  dailyAverage?: number | null;
  bestPlatform?: string | null;
  peakHour?: string | null;
}

export interface ChainAnalyticsResponse {
  summary: ChainAnalyticsSummary;
  revenueByDate: RevenuePoint[];
  ordersByDate: OrdersPoint[];
  sourceBreakdown: SourceBreakdownItem[];
  aovByDate: AOVPoint[];
}

class AnalyticsService {
  async getChainAnalytics(params: {
    chainId: string;
    period?: PeriodPreset;
    startDate?: string; // ISO date
    endDate?: string;   // ISO date
  }): Promise<ApiResponse<ChainAnalyticsResponse>> {
    const search = new URLSearchParams();
    search.append("chainId", params.chainId);
    if (params.period) search.append("period", params.period);
    if (params.startDate) search.append("startDate", params.startDate);
    if (params.endDate) search.append("endDate", params.endDate);

    return apiClient.get<ChainAnalyticsResponse>(
      `/api/v1/reports/analytics?${search.toString()}`
    );
  }
}

export const analyticsService = new AnalyticsService();

