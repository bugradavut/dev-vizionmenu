/**
 * Order submission service
 * Handles API communication for order creation and status tracking
 */

import { mapOrderDataForAPI, type FrontendOrderData } from '@/utils/order-mapper';

export interface OrderSubmissionResponse {
  orderId: string;
  orderNumber: string;
  status: string;
  total: number;
  estimatedTime: string;
  message: string;
  createdAt: string;
  // NEW: Pre-order fields
  isPreOrder?: boolean;
  scheduledDateTime?: string;
  scheduledDate?: string;
  scheduledTime?: string;
  items?: Array<{
    id: string;
    name: string;
    price: number;
    quantity: number;
    total: number;
    image_url?: string;
    description?: string;
  }>;
  pricing?: {
    subtotal: number;
    taxAmount: number;
    total: number;
  };
  branch?: {
    id: string;
    name: string;
    address: string;
  };
  // Uber Direct tracking URL for delivery orders
  uberTrackingUrl?: string;
}

export interface OrderSubmissionError {
  code: string;
  message: string;
  field?: string;
}

export interface BranchInfo {
  id: string;
  name: string;
  address: string;
  phone?: string;
  email?: string;
}

export class OrderSubmissionService {
  private static instance: OrderSubmissionService;
  private baseUrl: string;

  constructor() {
    // Use Next.js API routes - relative path works in both dev and production
    this.baseUrl = '/api/v1';
  }

  static getInstance(): OrderSubmissionService {
    if (!OrderSubmissionService.instance) {
      OrderSubmissionService.instance = new OrderSubmissionService();
    }
    return OrderSubmissionService.instance;
  }

  /**
   * Submit order to backend API
   */
  async submitOrder(
    orderData: FrontendOrderData,
    branchId: string,
    tableNumber?: number,
    zone?: string
  ): Promise<{ success: true; data: OrderSubmissionResponse } | { success: false; error: OrderSubmissionError }> {
    try {
      // Map data to API format
      const apiData = mapOrderDataForAPI(orderData, branchId, tableNumber, zone);

      // Submit to API
      const response = await fetch(`${this.baseUrl}/customer/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(apiData)
      });

      const result = await response.json();

      if (!response.ok) {
        // Handle API errors
        return {
          success: false,
          error: {
            code: result.error?.code || 'API_ERROR',
            message: result.error?.message || 'Failed to submit order'
          }
        };
      }

      return {
        success: true,
        data: result.data
      };

    } catch (error) {
      // Handle network/unexpected errors
      return {
        success: false,
        error: {
          code: 'NETWORK_ERROR',
          message: error instanceof Error ? error.message : 'Network error occurred'
        }
      };
    }
  }

  /**
   * Get order status for tracking
   */
  async getOrderStatus(orderId: string): Promise<{ success: true; data: OrderSubmissionResponse } | { success: false; error: OrderSubmissionError }> {
    try {
      const response = await fetch(`${this.baseUrl}/customer/orders/${orderId}/status`);
      const result = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: {
            code: result.error?.code || 'API_ERROR',
            message: result.error?.message || 'Failed to get order status'
          }
        };
      }

      return {
        success: true,
        data: result.data
      };

    } catch (error) {
      return {
        success: false,
        error: {
          code: 'NETWORK_ERROR',
          message: error instanceof Error ? error.message : 'Network error occurred'
        }
      };
    }
  }

  /**
   * Get branch information by ID
   */
  async getBranchInfo(branchId: string): Promise<{ success: true; data: BranchInfo } | { success: false; error: OrderSubmissionError }> {
    try {
      const response = await fetch(`${this.baseUrl}/customer/branch/${branchId}/info`);
      const result = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: {
            code: result.error?.code || 'API_ERROR',
            message: result.error?.message || 'Failed to get branch information'
          }
        };
      }

      return {
        success: true,
        data: result.data
      };

    } catch (error) {
      return {
        success: false,
        error: {
          code: 'NETWORK_ERROR',
          message: error instanceof Error ? error.message : 'Network error occurred'
        }
      };
    }
  }

  /**
   * Test API connectivity
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/health`);
      return response.ok;
    } catch {
      return false;
    }
  }
}

// Export singleton instance
export const orderService = OrderSubmissionService.getInstance();