"use client";

/**
 * Commission Service
 * Handles all commission-related API operations
 */

import { apiClient } from './api-client';

export interface CommissionRate {
  source_type: string;
  default_rate: number;
  chain_rate: number | null;
  branch_rate?: number | null;
  effective_rate: number;
  has_override: boolean;
  is_active: boolean;
}

export interface ChainCommissionSettings {
  chainId: string;
  settings: CommissionRate[];
}

export interface DefaultCommissionRate {
  source_type: string;
  default_rate: number;
  description?: string;
}

export interface UpdateRateRequest {
  rate: number;
}

export interface BulkUpdateRequest {
  rates: {
    sourceType: string;
    rate: number;
  }[];
}

export interface CommissionSummary {
  dateRange: string;
  summary: CommissionSummaryItem[];
}

export interface CommissionSummaryItem {
  [key: string]: unknown;
}

// New interfaces for analytics-style reporting
export type PeriodPreset = "7d" | "30d" | "90d" | "custom";

export interface CommissionTrendPoint {
  date: string; // ISO date (YYYY-MM-DD)
  commission: number;
  orders: number;
}

export interface CommissionBreakdownItem {
  source: string; // website, qr, mobile_app
  orders: number;
  commission: number;
}

export interface CommissionBreakdown {
  website: CommissionBreakdownItem;
  qr: CommissionBreakdownItem;
  mobile_app: CommissionBreakdownItem;
}

export interface CommissionAnalyticsSummary {
  totalCommission: number;
  totalOrders: number;
  averageCommissionRate: number;
  topSource?: string | null;
  averagePerOrder?: number | null;
}

export interface CommissionAnalyticsResponse {
  summary: CommissionAnalyticsSummary;
  breakdown: CommissionBreakdown;
  trends: CommissionTrendPoint[];
}

export interface BulkUpdateResponse {
  updated: number;
  total: number;
  results: BulkUpdateResult[];
}

export interface BulkUpdateResult {
  sourceType: string;
  success: boolean;
  result?: CommissionRate;
  error?: string;
}

class CommissionService {
  /**
   * Get default commission rates for all source types
   */
  async getDefaultRates(): Promise<DefaultCommissionRate[]> {
    try {
      const response = await apiClient.get('/api/v1/commission/defaults');
      return (response.data as { rates?: DefaultCommissionRate[] }).rates || [];
    } catch (error) {
      console.error('Error fetching default rates:', error);
      throw new Error('Failed to fetch default commission rates');
    }
  }

  /**
   * Update default commission rate for a source type
   */
  async updateDefaultRate(sourceType: string, rate: number): Promise<DefaultCommissionRate> {
    try {
      const response = await apiClient.put(`/api/v1/commission/defaults/${sourceType}`, {
        rate: rate
      });
      return (response.data as { rate: DefaultCommissionRate }).rate;
    } catch (error) {
      console.error('Error updating default rate:', error);
      throw new Error(`Failed to update default rate for ${sourceType}`);
    }
  }

  /**
   * Get commission settings for a specific chain
   */
  async getChainSettings(chainId: string): Promise<ChainCommissionSettings> {
    try {
      const response = await apiClient.get(`/api/v1/commission/settings/${chainId}`);
      const responseData = response.data as { chainId: string; settings?: CommissionRate[] };
      return {
        chainId: responseData.chainId,
        settings: responseData.settings || []
      };
    } catch (error) {
      console.error('Error fetching chain settings:', error);
      throw new Error(`Failed to fetch commission settings for chain ${chainId}`);
    }
  }

  /**
   * Set or update chain-specific commission rate for a source type
   */
  async setChainRate(chainId: string, sourceType: string, rate: number): Promise<CommissionRate> {
    try {
      const response = await apiClient.put(`/api/v1/commission/settings/${chainId}/${sourceType}`, {
        rate: rate
      });
      return (response.data as { setting: CommissionRate }).setting;
    } catch (error) {
      console.error('Error setting chain rate:', error);
      throw new Error(`Failed to set commission rate for ${sourceType}`);
    }
  }

  /**
   * Remove chain-specific override (revert to default)
   */
  async removeChainOverride(chainId: string, sourceType: string): Promise<void> {
    try {
      await apiClient.delete(`/api/v1/commission/settings/${chainId}/${sourceType}`);
    } catch (error) {
      console.error('Error removing chain override:', error);
      throw new Error(`Failed to remove override for ${sourceType}`);
    }
  }

  /**
   * Bulk update multiple commission rates for a chain
   */
  async bulkUpdateChainRates(chainId: string, rates: BulkUpdateRequest['rates']): Promise<BulkUpdateResponse> {
    try {
      const response = await apiClient.post(`/api/v1/commission/settings/${chainId}/bulk`, {
        rates: rates
      });
      return response.data as BulkUpdateResponse;
    } catch (error) {
      console.error('Error bulk updating chain rates:', error);
      throw new Error('Failed to bulk update commission rates');
    }
  }

  /**
   * Get commission summary and statistics
   */
  async getCommissionSummary(dateRange: '7d' | '30d' | '90d' = '7d'): Promise<CommissionSummary> {
    try {
      const response = await apiClient.get(`/api/v1/commission/summary`, {
        dateRange: dateRange
      });
      const responseData = response.data as { dateRange: string; summary?: CommissionSummaryItem[] };
      return {
        dateRange: responseData.dateRange,
        summary: responseData.summary || []
      };
    } catch (error) {
      console.error('Error fetching commission summary:', error);
      throw new Error('Failed to fetch commission summary');
    }
  }

  /**
   * Get commission settings for a specific branch
   */
  async getBranchSettings(branchId: string): Promise<ChainCommissionSettings> {
    try {
      const response = await apiClient.get(`/api/v1/commission/branch-settings/${branchId}`);
      const responseData = response.data as { branchId: string; settings?: CommissionRate[] };
      return {
        chainId: branchId, // Using chainId field for consistency, but it's actually branchId
        settings: responseData.settings || []
      };
    } catch (error) {
      console.error('Error fetching branch settings:', error);
      throw new Error(`Failed to fetch commission settings for branch ${branchId}`);
    }
  }

  /**
   * Set or update branch-specific commission rate for a source type
   */
  async setBranchRate(branchId: string, sourceType: string, rate: number): Promise<CommissionRate> {
    try {
      const response = await apiClient.put(`/api/v1/commission/branch-settings/${branchId}/${sourceType}`, {
        rate: rate
      });
      return (response.data as { setting: CommissionRate }).setting;
    } catch (error) {
      console.error('Error setting branch rate:', error);
      throw new Error(`Failed to set commission rate for ${sourceType}`);
    }
  }

  /**
   * Remove branch-specific override (revert to chain default)
   */
  async removeBranchOverride(branchId: string, sourceType: string): Promise<void> {
    try {
      await apiClient.delete(`/api/v1/commission/branch-settings/${branchId}/${sourceType}`);
    } catch (error) {
      console.error('Error removing branch override:', error);
      throw new Error(`Failed to remove override for ${sourceType}`);
    }
  }

  /**
   * Bulk update multiple commission rates for a branch
   */
  async bulkUpdateBranchRates(branchId: string, rates: BulkUpdateRequest['rates']): Promise<BulkUpdateResponse> {
    try {
      const response = await apiClient.post(`/api/v1/commission/branch-settings/${branchId}/bulk`, {
        rates: rates
      });
      return response.data as BulkUpdateResponse;
    } catch (error) {
      console.error('Error bulk updating branch rates:', error);
      throw new Error('Failed to bulk update commission rates');
    }
  }

  /**
   * Calculate commission for an order
   */
  async calculateCommission(orderTotal: number, branchId: string, sourceType: string): Promise<{
    rate: number;
    commissionAmount: number;
    netAmount: number;
  }> {
    try {
      const response = await apiClient.post('/api/v1/commission/calculate', {
        orderTotal,
        branchId,
        sourceType
      });
      
      return response.data as {
        rate: number;
        commissionAmount: number;
        netAmount: number;
      };
    } catch (error) {
      console.error('Error calculating commission:', error);
      throw new Error(`Failed to calculate commission: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get commission analytics reports with date range support
   */
  async getCommissionReports(params: {
    period?: PeriodPreset;
    startDate?: string; // ISO date
    endDate?: string;   // ISO date
    chainId?: string;
    branchId?: string;
  } = {}): Promise<CommissionAnalyticsResponse> {
    try {
      const search = new URLSearchParams();
      if (params.period) search.append("dateRange", params.period);
      if (params.startDate) search.append("startDate", params.startDate);
      if (params.endDate) search.append("endDate", params.endDate);
      if (params.chainId) search.append("chainId", params.chainId);
      if (params.branchId) search.append("branchId", params.branchId);

      const queryString = search.toString();
      const url = queryString
        ? `/api/v1/commission/reports?${queryString}`
        : `/api/v1/commission/reports`;

      const response = await apiClient.get(url);
      return response.data as CommissionAnalyticsResponse;
    } catch (error) {
      console.error('Error fetching commission reports:', error);
      throw new Error('Failed to fetch commission analytics reports');
    }
  }

}

// Export singleton instance
export const commissionService = new CommissionService();
export default commissionService;