"use client";

/**
 * Chain Management Service
 * Handles all chain-related API operations
 */

import { apiClient } from './api-client';

export interface Chain {
  id: string;
  name: string;
  slug: string;
  description?: string;
  is_active: boolean;
  branch_count: number;
  created_at: string;
  logo_url?: string;
}

export interface Branch {
  id: string;
  name: string;
  address: string;
  city: string;
  phone?: string;
  is_active: boolean;
  created_at: string;
}

export interface ChainWithBranches extends Chain {
  branches: Branch[];
  owner?: {
    full_name: string;
    email: string;
    status: string;
  };
}

export interface CreateChainRequest {
  name: string;
  slug: string;
  description?: string;
  is_active: boolean;
  logo_url?: string;
}

export type UpdateChainRequest = Partial<CreateChainRequest>

export interface GetChainsParams extends Record<string, unknown> {
  search?: string;
  status?: 'all' | 'active' | 'inactive';
  page?: number;
  limit?: number;
}

export interface GetChainsResponse {
  chains: Chain[];
  total: number;
  page: number;
  limit: number;
}

class ChainsService {
  /**
   * Get all chains with filtering
   */
  async getChains(params: GetChainsParams = {}): Promise<GetChainsResponse> {
    const response = await apiClient.get('/api/v1/admin/chains', params);
    
    // Backend returns { data: { chains: [...], total: number } }
    const responseData = response.data as Record<string, unknown>;
    
    return {
      chains: (responseData.chains as Chain[]) || [],
      total: (responseData.total as number) || 0,
      page: params.page || 1,
      limit: params.limit || 10,
    };
  }

  /**
   * Get single chain with branches
   */
  async getChainById(chainId: string): Promise<ChainWithBranches> {
    const response = await apiClient.get(`/api/v1/admin/chains/${chainId}`);
    // Backend returns { data: { chain: {...} } }
    const responseData = response.data as Record<string, unknown>;
    return responseData.chain as ChainWithBranches;
  }

  /**
   * Create new chain
   */
  async createChain(chainData: CreateChainRequest): Promise<Chain> {
    const response = await apiClient.post('/api/v1/admin/chains', chainData);
    // Backend returns { data: { message: string, chain: {...} } }
    const responseData = response.data as Record<string, unknown>;
    return responseData.chain as ChainWithBranches;
  }

  /**
   * Update existing chain
   */
  async updateChain(chainId: string, chainData: UpdateChainRequest): Promise<Chain> {
    const response = await apiClient.put(`/api/v1/admin/chains/${chainId}`, chainData);
    // Backend returns { data: { message: string, chain: {...} } }
    const responseData = response.data as Record<string, unknown>;
    return responseData.chain as ChainWithBranches;
  }

  /**
   * Delete chain
   */
  async deleteChain(chainId: string): Promise<void> {
    await apiClient.delete(`/api/v1/admin/chains/${chainId}`);
  }
}

// Export singleton instance
export const chainsService = new ChainsService();