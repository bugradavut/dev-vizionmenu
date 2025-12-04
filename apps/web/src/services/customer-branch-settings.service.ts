/**
 * Customer Branch Settings Service
 * Handles API calls for branch settings from customer perspective (read-only, public endpoints)
 */

// Types
export interface TimingSettings {
  baseDelay: number;
  temporaryBaseDelay: number;
  deliveryDelay: number;
  temporaryDeliveryDelay: number;
  autoReady: boolean;
}

// SW-78 FO-116: Updated payment settings to support cash/card distinction
export interface PaymentSettings {
  allowOnlinePayment: boolean;
  allowCashPayment: boolean;
  allowCardPayment: boolean;
  // Legacy field for backward compatibility
  allowCounterPayment?: boolean;
  defaultPaymentMethod: 'online' | 'cash' | 'card';
}

// Import RestaurantHours from utils to maintain consistency
import type { RestaurantHours } from '../utils/restaurant-hours';

// Legacy interface for backward compatibility
export interface LegacyRestaurantHours {
  isOpen: boolean;
  workingDays: string[];
  defaultHours: {
    openTime: string;
    closeTime: string;
  };
}

export interface BranchSettings {
  orderFlow: 'standard' | 'simplified';
  timingSettings: TimingSettings;
  paymentSettings: PaymentSettings;
  restaurantHours: RestaurantHours | LegacyRestaurantHours; // Support both formats
  deliveryHours?: RestaurantHours | LegacyRestaurantHours; // Optional delivery-specific hours
  pickupHours?: RestaurantHours | LegacyRestaurantHours; // Optional pickup-specific hours
  minimumOrderAmount: number;
  deliveryFee: number;
  freeDeliveryThreshold: number;
}

export interface BranchSettingsResponse {
  branchId: string;
  branchName: string;
  settings: BranchSettings;
}

export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: string;
  };
}

/**
 * Get branch settings from API (public endpoint for customer ordering)
 * No authentication required - for customers viewing order options
 */
export const getCustomerBranchSettings = async (branchId: string): Promise<BranchSettingsResponse> => {
  try {
    // Use Express.js API URL - public endpoint, no authentication required
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    const response = await fetch(`${apiUrl}/api/v1/customer/chains/branch/${branchId}/settings`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData: ApiError = await response.json();
      throw new Error(errorData.error.message || `HTTP ${response.status}: ${response.statusText}`);
    }

    const result: ApiResponse<BranchSettingsResponse> = await response.json();
    return result.data;
  } catch (error) {
    console.error('Failed to get customer branch settings:', error);
    throw error;
  }
};

/**
 * Default settings for fallback when API fails
 */
export const getDefaultSettings = (): BranchSettings => ({
  orderFlow: 'standard',
  timingSettings: {
    baseDelay: 20,
    temporaryBaseDelay: 0,
    deliveryDelay: 15,
    temporaryDeliveryDelay: 0,
    autoReady: false,
  },
  // SW-78 FO-116: Updated payment defaults
  paymentSettings: {
    allowOnlinePayment: true,
    allowCashPayment: false,
    allowCardPayment: false,
    allowCounterPayment: false, // Legacy
    defaultPaymentMethod: 'online',
  },
  restaurantHours: {
    isOpen: true,
    mode: 'simple',
    simpleSchedule: {
      workingDays: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'],
      defaultHours: {
        openTime: '09:00',
        closeTime: '22:00',
      }
    },
    advancedSchedule: {},
    // Legacy fields for backward compatibility
    workingDays: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'],
    defaultHours: {
      openTime: '09:00',
      closeTime: '22:00',
    },
  } as RestaurantHours,
  minimumOrderAmount: 0,
  deliveryFee: 0,
  freeDeliveryThreshold: 0,
});

