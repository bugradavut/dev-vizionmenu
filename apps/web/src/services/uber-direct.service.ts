/**
 * Uber Direct integration service
 * Handles quote generation and delivery creation for white-label courier service
 */

export interface UberDirectQuoteRequest {
  branch_id: string;
  dropoff_address: {
    street: string;
    city: string;
    state: string;
    zip: string;
  };
}

export interface UberDirectQuoteResponse {
  quote_id: string;
  delivery_fee: number;
  eta_minutes: number;
  expires_at: string;
  test_mode: boolean;
}

export interface UberDirectDeliveryRequest {
  branch_id: string;
  quote_id: string;
  order_id: string;
}

export interface UberDirectDeliveryResponse {
  delivery_id: string;
  status: string;
  tracking_url?: string;
  courier_info?: {
    name: string;
    phone: string;
    eta_minutes: number;
  };
}

export interface UberDirectError {
  code: string;
  message: string;
  details?: unknown;
}

export class UberDirectService {
  private static instance: UberDirectService;
  private baseUrl: string;

  constructor() {
    // Use Next.js API routes for authenticated endpoints
    this.baseUrl = '/api/v1';
  }

  static getInstance(): UberDirectService {
    if (!UberDirectService.instance) {
      UberDirectService.instance = new UberDirectService();
    }
    return UberDirectService.instance;
  }

  /**
   * Get delivery quote for an address
   */
  async getDeliveryQuote(
    branchId: string,
    address: {
      street: string;
      city: string;
      state: string;
      zip: string;
    },
    authToken?: string
  ): Promise<{ success: true; data: UberDirectQuoteResponse } | { success: false; error: UberDirectError }> {
    try {
      const quoteRequest: UberDirectQuoteRequest = {
        branch_id: branchId,
        dropoff_address: address
      };

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      // Add authorization if token provided
      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }

      const response = await fetch(`${this.baseUrl}/uber-direct/uber-direct/quote`, {
        method: 'POST',
        headers,
        body: JSON.stringify(quoteRequest)
      });

      const result = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: {
            code: result.error?.code || 'QUOTE_ERROR',
            message: result.error?.message || 'Failed to get delivery quote',
            details: result.error?.details
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
   * Create delivery with Uber Direct
   */
  async createDelivery(
    branchId: string,
    quoteId: string,
    orderId: string,
    authToken?: string
  ): Promise<{ success: true; data: UberDirectDeliveryResponse } | { success: false; error: UberDirectError }> {
    try {
      const deliveryRequest: UberDirectDeliveryRequest = {
        branch_id: branchId,
        quote_id: quoteId,
        order_id: orderId
      };

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      // Add authorization if token provided
      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }

      const response = await fetch(`${this.baseUrl}/uber-direct/uber-direct/delivery`, {
        method: 'POST',
        headers,
        body: JSON.stringify(deliveryRequest)
      });

      const result = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: {
            code: result.error?.code || 'DELIVERY_ERROR',
            message: result.error?.message || 'Failed to create delivery',
            details: result.error?.details
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
   * Check service status
   */
  async getServiceStatus(): Promise<{ success: true; data: unknown } | { success: false; error: UberDirectError }> {
    try {
      // Use public status endpoint (no auth required)
      const response = await fetch(`${this.baseUrl}/uber-direct/uber-direct/status`);
      const result = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: {
            code: result.error?.code || 'STATUS_ERROR',
            message: result.error?.message || 'Service status check failed'
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
   * Format address from customer form data
   */
  formatAddressForQuote(addressInfo: {
    streetAddress: string;
    city: string;
    province: string;
    postalCode: string;
  }): UberDirectQuoteRequest['dropoff_address'] {
    return {
      street: addressInfo.streetAddress,
      city: addressInfo.city,
      state: addressInfo.province,
      zip: addressInfo.postalCode
    };
  }
}

// Export singleton instance
export const uberDirectService = UberDirectService.getInstance();