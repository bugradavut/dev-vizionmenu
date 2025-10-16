import { apiClient } from './api-client';

export interface Chain {
  id: string;
  name: string;
  slug: string;
  description?: string;
  logo_url?: string;
}

export interface Branch {
  id: string;
  name: string;
  slug: string;
  address?: {
    street: string;
    city: string;
    province: string;
    postal_code: string;
    country: string;
  };
  location?: {
    lat: number;
    lng: number;
  };
  phone?: string;
  email?: string;
  theme_config?: {
    layout: 'default' | 'template-1';
    colors?: {
      primary?: string;
      secondary?: string;
      accent?: string;
    };
    bannerImage?: string;
  };
  restaurantHours?: {
    isOpen: boolean;
    mode?: 'simple' | 'advanced';
    workingDays?: string[];
    defaultHours?: {
      openTime: string;
      closeTime: string;
    };
    simpleSchedule?: {
      workingDays: string[];
      defaultHours: {
        openTime: string;
        closeTime: string;
      };
    };
    advancedSchedule?: {
      [day: string]: {
        enabled: boolean;
        openTime: string;
        closeTime: string;
      };
    };
  };
  deliveryZones?: {
    enabled: boolean;
    zones: {
      id: string;
      name: string;
      polygon: [number, number][];
      active: boolean;
    }[];
  };
}

export interface ChainWithBranches {
  chain: Chain;
  branches: Branch[];
  total: number;
}

export interface ChainBranchResult {
  branch: {
    id: string;
    name: string;
  };
  chain: Chain;
}

class CustomerChainsService {
  /**
   * Get chain by slug
   */
  async getChainBySlug(slug: string): Promise<Chain> {
    const response = await apiClient.get(`/api/v1/customer/chains/${slug}`);
    return response.data as Chain;
  }

  /**
   * Get branches for a chain by slug
   */
  async getChainBranches(slug: string): Promise<ChainWithBranches> {
    const response = await apiClient.get(`/api/v1/customer/chains/${slug}/branches`);
    return response.data as ChainWithBranches;
  }

  /**
   * Get chain data by branch ID (for QR code compatibility)
   */
  async getChainByBranchId(branchId: string): Promise<ChainBranchResult> {
    const response = await apiClient.get(`/api/v1/customer/chains/branch/${branchId}/chain`);
    return response.data as ChainBranchResult;
  }

  /**
   * Combined method: Get chain with branches in one call
   */
  async getChainWithBranches(slug: string): Promise<ChainWithBranches> {
    return this.getChainBranches(slug);
  }

  /**
   * Get branches with delivery zones for location-based ranking
   */
  async getChainBranchesWithDeliveryZones(slug: string): Promise<ChainWithBranches> {
    const response = await apiClient.get(`/api/v1/customer/chains/${slug}/branches?include_delivery_zones=true`);
    return response.data as ChainWithBranches;
  }
}

export const customerChainsService = new CustomerChainsService();