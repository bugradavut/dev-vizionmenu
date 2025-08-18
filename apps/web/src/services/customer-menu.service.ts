"use client";

/**
 * Customer Menu Service
 * Public API calls for customer order page (no authentication required)
 */

// Types for customer-facing menu
export interface CustomerMenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  image_url?: string;
  allergens: string[];
  dietary_info: string[];
  preparation_time?: number;
  category_id: string;
}

export interface CustomerCategory {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  display_order: number;
  items: CustomerMenuItem[];
}

export interface CustomerMenuMetadata {
  branchId: string;
  branchName: string;
  branchAddress?: string;
  activePreset?: {
    id: string;
    name: string;
    description?: string;
    schedule_type: string;
    daily_start_time?: string;
    daily_end_time?: string;
  } | null;
  totalCategories: number;
  totalItems: number;
  lastUpdated: string;
}

export interface CustomerMenu {
  categories: CustomerCategory[];
  metadata: CustomerMenuMetadata;
}

export interface BranchInfo {
  id: string;
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  description?: string;
  opening_hours?: Record<string, unknown>;
  order_settings?: {
    auto_ready_enabled: boolean;
    estimated_prep_time: number;
    estimated_delivery_time: number;
  } | null;
}

class CustomerMenuService {
  private readonly baseUrl: string;

  constructor() {
    this.baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  }

  /**
   * Get customer menu for a specific branch
   * Public API - no authentication required
   */
  async getCustomerMenu(branchId: string, currentTime?: Date): Promise<CustomerMenu> {
    try {
      const url = new URL(`${this.baseUrl}/api/v1/customer/menu/${branchId}`);
      
      if (currentTime) {
        url.searchParams.set('time', currentTime.toISOString());
      }

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Branch not found or menu not available');
        }
        throw new Error(`Failed to fetch menu: ${response.status}`);
      }

      const result = await response.json();
      return result.data;

    } catch (error) {
      console.error('Customer menu fetch error:', error);
      throw error instanceof Error ? error : new Error('Failed to fetch customer menu');
    }
  }

  /**
   * Get branch information for customers
   * Public API - no authentication required
   */
  async getBranchInfo(branchId: string): Promise<BranchInfo> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/customer/menu/${branchId}/info`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Branch not found');
        }
        throw new Error(`Failed to fetch branch info: ${response.status}`);
      }

      const result = await response.json();
      return result.data;

    } catch (error) {
      console.error('Branch info fetch error:', error);
      throw error instanceof Error ? error : new Error('Failed to fetch branch information');
    }
  }

  /**
   * Transform menu category for compatibility with existing UI
   */
  transformCategoryForUI(category: CustomerCategory) {
    return {
      id: category.id,
      name: category.name,
      icon: category.icon || 'Grid3X3',
      item_count: category.items.length,
      display_order: category.display_order
    };
  }

  /**
   * Transform menu item for compatibility with existing UI
   */
  transformMenuItemForUI(item: CustomerMenuItem) {
    return {
      id: item.id,
      name: item.name,
      description: item.description,
      price: item.price,
      category_id: item.category_id,
      image_url: item.image_url,
      is_available: true, // Customer menu only shows available items
      allergens: item.allergens,
      dietary_info: item.dietary_info,
      preparation_time: item.preparation_time
    };
  }

  /**
   * Get categories with item counts for UI
   */
  getCategoriesWithCounts(menu: CustomerMenu) {
    const categories = menu.categories.map(this.transformCategoryForUI);
    
    // Add "All Menu" option
    const allMenuCategory = {
      id: 'all',
      name: 'All Menu',
      icon: 'Grid3X3',
      item_count: menu.metadata.totalItems,
      display_order: -1
    };

    // Add "Set Menu" option if there's an active preset
    const setMenuCategory = menu.metadata.activePreset ? {
      id: 'set',
      name: 'Set Menu',
      icon: 'Settings',
      item_count: menu.metadata.totalItems,
      display_order: 0
    } : null;

    const result = [allMenuCategory];
    if (setMenuCategory) {
      result.push(setMenuCategory);
    }
    result.push(...categories);

    return result.sort((a, b) => a.display_order - b.display_order);
  }

  /**
   * Get all menu items flattened
   */
  getAllMenuItems(menu: CustomerMenu) {
    return menu.categories.flatMap(category => 
      category.items.map(item => this.transformMenuItemForUI(item))
    );
  }

  /**
   * Filter menu items by category
   */
  getItemsByCategory(menu: CustomerMenu, categoryId: string) {
    if (categoryId === 'all') {
      return this.getAllMenuItems(menu);
    }
    
    if (categoryId === 'set') {
      // Set menu shows all items (filtered by active preset)
      return this.getAllMenuItems(menu);
    }

    const category = menu.categories.find(cat => cat.id === categoryId);
    return category ? category.items.map(item => this.transformMenuItemForUI(item)) : [];
  }
}

// Export singleton instance
export const customerMenuService = new CustomerMenuService();