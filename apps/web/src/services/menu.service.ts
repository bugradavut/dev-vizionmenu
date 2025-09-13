"use client";

/**
 * Menu Management Service
 * Handles all API calls for menu categories, items, and presets
 */

import { apiClient, ApiResponse } from './api-client';

// Types
export interface MenuCategory {
  id: string;
  branch_id: string;
  name: string;
  description: string | null;
  display_order: number;
  is_active: boolean;
  icon?: string; // Lucide icon key
  created_at: string;
  updated_at: string;
  item_count?: number; // Backend'den gelen field name
  items_count?: number; // Backward compatibility için
}

export interface MenuItem {
  id: string;
  branch_id: string;
  category_id: string | null;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  allergens: string[];
  dietary_info: string[];
  preparation_time: number | null;
  is_available: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
  category?: {
    id: string;
    name: string;
    is_active: boolean;
  };
  variants?: MenuItemVariant[];
}

export interface MenuItemVariant {
  id: string;
  menu_item_id: string;
  name: string;
  price_modifier: number;
  is_default: boolean;
  display_order: number;
  created_at: string;
}

export interface MenuPreset {
  id: string;
  branch_id: string;
  name: string;
  description: string | null;
  schedule_type: 'one-time' | 'daily';
  scheduled_start: string | null;
  scheduled_end: string | null;
  daily_start_time: string | null;
  daily_end_time: string | null;
  auto_apply: boolean;
  selected_category_ids?: string[]; // Category-based selection
  selected_item_ids?: string[]; // Item-based selection
  menu_items_count: number;
  categories_count: number;
  is_active: boolean;
  is_scheduled: boolean;
  is_current: boolean;
  created_by: {
    name: string | null;
    email: string | null;
  };
  created_at: string;
  updated_at: string;
}

export interface CreateCategoryRequest {
  name: string;
  description?: string;
  display_order?: number;
  icon?: string; // Lucide icon key
}

export interface UpdateCategoryRequest {
  name?: string;
  description?: string;
  display_order?: number;
  is_active?: boolean;
  icon?: string; // Lucide icon key
}

export interface CreateMenuItemRequest {
  name: string;
  description?: string;
  price: number;
  category_id?: string;
  allergens?: string[];
  dietary_info?: string[];
  preparation_time?: number;
  display_order?: number;
  variants?: Omit<MenuItemVariant, 'id' | 'menu_item_id' | 'created_at'>[];
}

export interface UpdateMenuItemRequest {
  name?: string;
  description?: string;
  price?: number;
  category_id?: string;
  allergens?: string[];
  dietary_info?: string[];
  preparation_time?: number;
  display_order?: number;
  is_available?: boolean;
}

export interface BulkOperationRequest {
  itemIds: string[];
  operation: 'availability' | 'category' | 'pricing';
  data: {
    is_available?: boolean;
    category_id?: string;
    price_adjustment_type?: 'fixed' | 'percentage';
    new_price?: number;
    adjustment?: number;
  };
}

export interface ReorderRequest {
  reorderData: Array<{
    id: string;
    display_order: number;
  }>;
}

export interface CreatePresetRequest {
  name: string;
  description?: string;
  schedule_type?: 'one-time' | 'daily' | null;
  scheduled_start?: string | null;
  scheduled_end?: string | null;
  daily_start_time?: string | null;
  daily_end_time?: string | null;
  auto_apply?: boolean;
  menu_data?: {
    categories?: MenuCategory[];
    items?: MenuItem[];
    captured_at?: string;
  }; // Menu data captured from current state
  selected_category_ids?: string[]; // Category-based selection
  selected_item_ids?: string[]; // Item-based selection
}

export interface MenuItemsFilters {
  categoryId?: string;
  search?: string;
  isAvailable?: boolean;
  priceMin?: number;
  priceMax?: number;
  allergens?: string[];
  dietaryInfo?: string[];
  includeVariants?: boolean;
  page?: number;
  limit?: number;
  sortBy?: 'name' | 'price' | 'display_order' | 'created_at';
  sortOrder?: 'asc' | 'desc';
}

class MenuService {
  // === CATEGORIES ===
  
  /**
   * Get all menu categories for the current branch
   */
  async getCategories(options?: { includeInactive?: boolean; includeItems?: boolean }): Promise<ApiResponse<MenuCategory[]>> {
    return apiClient.get<MenuCategory[]>('/api/v1/menu/categories', options as Record<string, unknown>);
  }

  /**
   * Get a single category by ID
   */
  async getCategory(id: string): Promise<ApiResponse<MenuCategory>> {
    return apiClient.get<MenuCategory>(`/api/v1/menu/categories/${id}`);
  }

  /**
   * Create a new menu category
   */
  async createCategory(data: CreateCategoryRequest): Promise<ApiResponse<MenuCategory>> {
    return apiClient.post<MenuCategory>('/api/v1/menu/categories', data);
  }

  /**
   * Update an existing category
   */
  async updateCategory(id: string, data: UpdateCategoryRequest): Promise<ApiResponse<MenuCategory>> {
    return apiClient.patch<MenuCategory>(`/api/v1/menu/categories/${id}`, data);
  }

  /**
   * Delete a category (moves items to "Uncategorized")
   */
  async deleteCategory(id: string, forceDelete = false): Promise<ApiResponse<null>> {
    const url = forceDelete 
      ? `/api/v1/menu/categories/${id}?forceDelete=true`
      : `/api/v1/menu/categories/${id}`;
    return apiClient.delete<null>(url);
  }

  /**
   * Toggle category availability instantly
   */
  async toggleCategoryAvailability(id: string): Promise<ApiResponse<MenuCategory>> {
    return apiClient.patch<MenuCategory>(`/api/v1/menu/categories/${id}/toggle`);
  }

  /**
   * Bulk operations on categories
   */
  async bulkCategoryOperations(data: BulkOperationRequest): Promise<ApiResponse<null>> {
    return apiClient.post<null>('/api/v1/menu/categories/bulk', data);
  }

  /**
   * Reorder categories (drag & drop)
   */
  async reorderCategories(data: ReorderRequest): Promise<ApiResponse<null>> {
    return apiClient.post<null>('/api/v1/menu/categories/reorder', data);
  }

  // === MENU ITEMS ===

  /**
   * Get menu items with advanced filtering
   */
  async getMenuItems(filters?: MenuItemsFilters): Promise<ApiResponse<MenuItem[]>> {
    return apiClient.get<MenuItem[]>('/api/v1/menu/items', filters as Record<string, unknown>);
  }

  /**
   * Get a single menu item by ID
   */
  async getMenuItem(id: string): Promise<ApiResponse<MenuItem>> {
    return apiClient.get<MenuItem>(`/api/v1/menu/items/${id}`);
  }

  /**
   * Create a new menu item (with optimized photo upload)
   */
  async createMenuItem(data: CreateMenuItemRequest, photo?: File): Promise<ApiResponse<MenuItem>> {
    if (photo) {
      return this.createMenuItemWithOptimizedPhoto(data, photo);
    }
    return apiClient.post<MenuItem>('/api/v1/menu/items', data);
  }

  /**
   * Create menu item with optimized photo upload (direct to Supabase)
   */
  private async createMenuItemWithOptimizedPhoto(data: CreateMenuItemRequest, photo: File): Promise<ApiResponse<MenuItem>> {
    try {
      // Import services dynamically to avoid SSR issues
      const [
        { optimizePhoto },
        { uploadMenuItemPhoto },
        { supabase }
      ] = await Promise.all([
        import('@/lib/photo-optimizer'),
        import('@/services/supabase-storage.service'),
        import('@/lib/supabase')
      ]);

      // Get current user's branch context
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        throw new Error('Authentication required');
      }

      // Get user's branch ID from API (more reliable than JWT metadata)
      let branchId = 'default';
      try {
        const authToken = session.access_token;
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/v1/auth/me`, {
          headers: {
            'Authorization': `Bearer ${authToken}`,
          },
        });
        if (response.ok) {
          const userData = await response.json();
          branchId = userData.data?.branch_id || 'default';
        }
      } catch (error) {
        console.warn('Could not get branch ID from API, using default:', error);
      }

      // Optimize photo before upload
      const optimizedPhoto = await optimizePhoto(photo, {
        maxWidth: 800,
        maxHeight: 600,
        quality: 0.8,
        format: 'webp'
      });

      // Upload optimized photo directly to Supabase
      const uploadResult = await uploadMenuItemPhoto(optimizedPhoto.file, branchId);

      // Create menu item with photo URL
      const itemDataWithPhoto = {
        ...data,
        image_url: uploadResult.url
      };

      // Call API to create menu item record
      return apiClient.post<MenuItem>('/api/v1/menu/items', itemDataWithPhoto);

    } catch (error) {
      console.error('Optimized photo upload failed:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to create menu item with photo');
    }
  }

  /**
   * Update menu item (with optional optimized photo upload)
   */
  async updateMenuItem(id: string, data: UpdateMenuItemRequest, photo?: File): Promise<ApiResponse<MenuItem>> {
    if (photo) {
      return this.updateMenuItemWithOptimizedPhoto(id, data, photo);
    }
    return apiClient.patch<MenuItem>(`/api/v1/menu/items/${id}`, data);
  }

  /**
   * Update menu item with optimized photo upload (direct to Supabase)
   */
  private async updateMenuItemWithOptimizedPhoto(id: string, data: UpdateMenuItemRequest, photo: File): Promise<ApiResponse<MenuItem>> {
    try {
      // Import services dynamically
      const [
        { optimizePhoto },
        { uploadMenuItemPhoto, deleteMenuItemPhoto },
        { supabase }
      ] = await Promise.all([
        import('@/lib/photo-optimizer'),
        import('@/services/supabase-storage.service'),
        import('@/lib/supabase')
      ]);

      // Get current user's branch context
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        throw new Error('Authentication required');
      }

      // Get user's branch ID from API (more reliable than JWT metadata)
      let branchId = 'default';
      try {
        const authToken = session.access_token;
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/v1/auth/me`, {
          headers: {
            'Authorization': `Bearer ${authToken}`,
          },
        });
        if (response.ok) {
          const userData = await response.json();
          branchId = userData.data?.branch_id || 'default';
        }
      } catch (error) {
        console.warn('Could not get branch ID from API, using default:', error);
      }

      // Get current item to check for existing photo
      let oldPhotoPath: string | null = null;
      try {
        const currentItem = await this.getMenuItem(id);
        if (currentItem.data?.image_url) {
          // Extract path from URL for deletion
          const url = new URL(currentItem.data.image_url);
          oldPhotoPath = url.pathname.split('/storage/v1/object/public/menu-images/')[1];
        }
      } catch (error) {
        console.warn('Could not get current item for photo cleanup:', error);
      }

      // Optimize new photo
      const optimizedPhoto = await optimizePhoto(photo, {
        maxWidth: 800,
        maxHeight: 600,
        quality: 0.8,
        format: 'webp'
      });

      // Upload new optimized photo
      const uploadResult = await uploadMenuItemPhoto(optimizedPhoto.file, branchId);

      // Update menu item with new photo URL
      const updateDataWithPhoto = {
        ...data,
        image_url: uploadResult.url
      };

      const result = await apiClient.patch<MenuItem>(`/api/v1/menu/items/${id}`, updateDataWithPhoto);

      // Delete old photo after successful update
      if (oldPhotoPath) {
        try {
          await deleteMenuItemPhoto(oldPhotoPath);
        } catch (deleteError) {
          console.warn('Failed to delete old photo:', deleteError);
        }
      }

      return result;

    } catch (error) {
      console.error('Optimized photo update failed:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to update menu item with photo');
    }
  }

  /**
   * Delete menu item
   */
  async deleteMenuItem(id: string): Promise<ApiResponse<null>> {
    return apiClient.delete<null>(`/api/v1/menu/items/${id}`);
  }

  /**
   * Toggle menu item availability
   */
  async toggleMenuItemAvailability(id: string): Promise<ApiResponse<MenuItem>> {
    return apiClient.patch<MenuItem>(`/api/v1/menu/items/${id}/toggle`);
  }

  /**
   * Duplicate menu item
   */
  async duplicateMenuItem(id: string, data: {
    name: string;
    price?: number;
    category_id?: string;
    includeVariants?: boolean;
  }): Promise<ApiResponse<MenuItem>> {
    return apiClient.post<MenuItem>(`/api/v1/menu/items/${id}/duplicate`, data);
  }

  /**
   * Bulk operations on menu items
   */
  async bulkMenuItemOperations(data: BulkOperationRequest): Promise<ApiResponse<null>> {
    return apiClient.post<null>('/api/v1/menu/items/bulk', data);
  }

  /**
   * Reorder menu items within categories
   */
  async reorderMenuItems(data: ReorderRequest): Promise<ApiResponse<null>> {
    return apiClient.post<null>('/api/v1/menu/items/reorder', data);
  }

  // === MENU PRESETS ===

  /**
   * Get all menu presets
   */
  async getPresets(): Promise<ApiResponse<MenuPreset[]>> {
    return apiClient.get<MenuPreset[]>('/api/v1/menu/presets');
  }

  /**
   * Get a single preset by ID
   */
  async getPreset(id: string): Promise<ApiResponse<MenuPreset>> {
    return apiClient.get<MenuPreset>(`/api/v1/menu/presets/${id}`);
  }

  /**
   * Create new preset (capture current menu or from scratch)
   */
  async createPreset(data: CreatePresetRequest & { capture_current_menu?: boolean }): Promise<ApiResponse<MenuPreset>> {
    // If capture_current_menu is true, use the special endpoint
    if (data.capture_current_menu) {
      return apiClient.post<MenuPreset>('/api/v1/menu/presets/current-menu', {
        name: data.name,
        description: data.description
      });
    }
    
    // Otherwise, create with provided menu_data
    const createData = {
      name: data.name,
      description: data.description,
      schedule_type: data.schedule_type,
      scheduled_start: data.scheduled_start,
      scheduled_end: data.scheduled_end,
      daily_start_time: data.daily_start_time,
      daily_end_time: data.daily_end_time,
      auto_apply: data.auto_apply || false,
      menu_data: data.menu_data || {},
      selected_category_ids: data.selected_category_ids,
      selected_item_ids: data.selected_item_ids
    };
    
    return apiClient.post<MenuPreset>('/api/v1/menu/presets', createData);
  }

  /**
   * Update existing preset
   */
  async updatePreset(id: string, data: Partial<CreatePresetRequest>): Promise<ApiResponse<MenuPreset>> {
    return apiClient.put<MenuPreset>(`/api/v1/menu/presets/${id}`, data);
  }

  /**
   * Delete preset
   */
  async deletePreset(id: string): Promise<ApiResponse<null>> {
    return apiClient.delete<null>(`/api/v1/menu/presets/${id}`);
  }

  /**
   * Apply preset to current menu
   */
  async applyPreset(id: string): Promise<ApiResponse<null>> {
    return apiClient.post<null>(`/api/v1/menu/presets/${id}/activate`);
  }

  /**
   * Deactivate current active preset
   */
  async deactivatePreset(): Promise<ApiResponse<null>> {
    return apiClient.post<null>('/api/v1/menu/presets/deactivate');
  }

  /**
   * Get scheduled presets
   */
  async getScheduledPresets(): Promise<ApiResponse<MenuPreset[]>> {
    return apiClient.get<MenuPreset[]>('/api/v1/menu/presets/schedule');
  }

  /**
   * Schedule preset changes
   */
  async schedulePreset(data: {
    preset_id: string;
    schedule_start: string;
    schedule_end?: string;
  }): Promise<ApiResponse<null>> {
    return apiClient.post<null>('/api/v1/menu/presets/schedule', data);
  }

  // === HELPER METHODS ===

  /**
   * Get auth token (used for multipart uploads)
   */
  private async getAuthToken(): Promise<string | null> {
    if (typeof window === 'undefined') return null;
    
    try {
      const { supabase } = await import('@/lib/supabase');
      const { data: { session } } = await supabase.auth.getSession();
      return session?.access_token || null;
    } catch (error) {
      console.error('Failed to get auth token:', error);
      return null;
    }
  }
}

// Export singleton instance
export const menuService = new MenuService();