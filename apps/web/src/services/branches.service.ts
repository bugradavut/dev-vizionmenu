import { apiClient } from './api-client';

export interface Branch {
  id: string;
  chain_id: string;
  name: string;
  slug: string;
  description?: string;
  address: {
    street?: string;
    city?: string;
    province?: string;
    postal_code?: string;
    country?: string;
  } | string;
  location?: {
    lat: number;
    lng: number;
  };
  phone?: string;
  email?: string;
  settings?: Record<string, unknown>;
  theme_config?: {
    layout: 'default' | 'template-1';
    colors?: {
      primary?: string;
      secondary?: string;
      accent?: string;
    };
    bannerImage?: string;
  };
  is_active: boolean;
  created_at: string;
  updated_at: string;
  categories_count?: number;
  items_count?: number;
  chain?: {
    id: string;
    name: string;
    slug: string;
  };
}

export interface CreateBranchData {
  chain_id: string;
  name: string;
  slug: string;
  description?: string;
  address: string;
  phone?: string;
  email?: string;
  settings?: Record<string, unknown>;
  is_active?: boolean;
  coordinates?: {
    lat: number;
    lng: number;
  };
}

export interface UpdateBranchData {
  name?: string;
  slug?: string;
  description?: string;
  address?: string;
  phone?: string;
  email?: string;
  settings?: Record<string, unknown>;
  theme_config?: {
    layout: 'default' | 'template-1';
    colors?: {
      primary?: string;
      secondary?: string;
      accent?: string;
    };
    bannerImage?: string;
  };
  is_active?: boolean;
  coordinates?: {
    lat: number;
    lng: number;
  };
}

export interface GetBranchesFilters {
  chain_id?: string;
  isActive?: boolean;
  city?: string;
  search?: string;
}

export interface GetBranchesResponse {
  branches: Branch[];
  total: number;
  filters: GetBranchesFilters;
}

class BranchesService {
  private baseUrl = '/api/v1/admin/branches';

  async createBranch(data: CreateBranchData): Promise<{ branch: Branch; message: string }> {
    const response = await apiClient.post<{ branch: Branch; message: string }>(this.baseUrl, data);
    return response.data;
  }

  async getBranches(filters: GetBranchesFilters = {}): Promise<GetBranchesResponse> {
    const params = new URLSearchParams();
    
    if (filters.chain_id) params.append('chain_id', filters.chain_id);
    if (filters.isActive !== undefined) params.append('isActive', filters.isActive.toString());
    if (filters.city) params.append('city', filters.city);
    if (filters.search) params.append('search', filters.search);

    const queryString = params.toString();
    const url = queryString ? `${this.baseUrl}?${queryString}` : this.baseUrl;

    const response = await apiClient.get<GetBranchesResponse>(url);
    return response.data;
  }

  async getBranchById(id: string): Promise<Branch> {
    const response = await apiClient.get<{ branch: Branch }>(`${this.baseUrl}/${id}`);
    return response.data?.branch || response.data;
  }

  async updateBranch(id: string, data: UpdateBranchData): Promise<{ branch: Branch; message: string }> {
    const response = await apiClient.put<{ branch: Branch; message: string }>(`${this.baseUrl}/${id}`, data);
    return response.data;
  }

  async deleteBranch(id: string): Promise<{ message: string; deletedBranchId: string }> {
    const response = await apiClient.delete<{ message: string; deletedBranchId: string }>(`${this.baseUrl}/${id}`);
    return response.data;
  }

  // Helper method to generate slug from name
  generateSlug(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single
      .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
  }

  // Helper method to format address for display
  formatAddress(branch: Branch): string {
    const parts = [branch.address];
    if (branch.phone) parts.push(`📞 ${branch.phone}`);
    if (branch.email) parts.push(`📧 ${branch.email}`);
    return parts.join(' • ');
  }

  /**
   * Get branches by chain ID - for hierarchical user management
   * Used when chain owners or platform admins need to select branches
   */
  async getBranchesByChain(chainId: string): Promise<{ chain: { id: string; name: string }; branches: Branch[] }> {
    const response = await apiClient.get<{ chain: { id: string; name: string }; branches: Branch[] }>(`/api/v1/branches/by-chain/${chainId}`);
    return response.data;
  }

  /**
   * Get available branches for user creation based on current user's role
   */
  async getAvailableBranches(currentUserRole: string, chainId?: string): Promise<Branch[]> {
    if (currentUserRole === 'platform_admin') {
      // Platform admin needs to select chain first
      if (!chainId) {
        throw new Error('Chain selection required for platform admin');
      }
      const result = await this.getBranchesByChain(chainId);
      return result.branches;
    }

    if (currentUserRole === 'chain_owner' && chainId) {
      const result = await this.getBranchesByChain(chainId);
      return result.branches;
    }

    // Branch manager cannot select branches - they can only create users in their own branch
    return [];
  }

  /**
   * Update branch theme config (for branch managers/staff)
   * Uses branch-specific endpoint (not admin)
   */
  async updateBranchThemeConfig(branchId: string, theme_config: UpdateBranchData['theme_config']): Promise<void> {
    await apiClient.put(`/api/v1/branches/${branchId}/theme-config`, { theme_config });
  }
}

export const branchesService = new BranchesService();