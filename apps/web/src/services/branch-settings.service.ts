/**
 * Branch Settings Service
 * Handles API calls for branch order flow settings
 */

// Types
export interface TimingSettings {
  baseDelay: number;
  temporaryBaseDelay: number;
  deliveryDelay: number;
  temporaryDeliveryDelay: number;
  autoReady: boolean;
}

export interface PaymentSettings {
  allowOnlinePayment: boolean;
  allowCounterPayment: boolean;
  defaultPaymentMethod: 'online' | 'counter';
}

// Import RestaurantHours from utils to maintain consistency
import type { RestaurantHours } from '../utils/restaurant-hours';

// Delivery Zones types
export interface DeliveryZone {
  id: string;
  name: string;
  polygon: [number, number][];
  active: boolean;
}

export interface DeliveryZonesData {
  enabled: boolean;
  zones: DeliveryZone[];
}

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
  restaurantHours: RestaurantHours;
  minimumOrderAmount?: number;
  deliveryFee?: number;
  freeDeliveryThreshold?: number;
  deliveryZones?: DeliveryZonesData;
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
 * Get branch settings from API (admin endpoint - requires authentication)
 */
export const getBranchSettings = async (branchId: string): Promise<BranchSettingsResponse> => {
  try {
    // Get session from Supabase client
    const { data: { session } } = await import('@/lib/supabase').then(m => m.supabase.auth.getSession());
    if (!session?.access_token) {
      throw new Error('Authentication token not found');
    }
    const token = session.access_token;

    // Use Express.js API URL
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    const response = await fetch(`${apiUrl}/api/v1/branch/${branchId}/settings`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
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
    console.error('Failed to get branch settings:', error);
    throw error;
  }
};

/**
 * Update branch settings via API
 */
export const updateBranchSettings = async (
  branchId: string, 
  settings: BranchSettings
): Promise<BranchSettingsResponse> => {
  try {
    // Get session from Supabase client
    const { data: { session } } = await import('@/lib/supabase').then(m => m.supabase.auth.getSession());
    if (!session?.access_token) {
      throw new Error('Authentication token not found');
    }
    const token = session.access_token;

    const requestData = {
      orderFlow: settings.orderFlow,
      timingSettings: settings.timingSettings,
      paymentSettings: settings.paymentSettings,
      restaurantHours: settings.restaurantHours,
      minimumOrderAmount: settings.minimumOrderAmount,
      deliveryFee: settings.deliveryFee,
      freeDeliveryThreshold: settings.freeDeliveryThreshold,
      deliveryZones: settings.deliveryZones,
    };

    // Use Express.js API URL
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

    const response = await fetch(`${apiUrl}/api/v1/branch/${branchId}/settings`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestData),
    });

    if (!response.ok) {
      const errorData: ApiError = await response.json();
      throw new Error(errorData.error.message || `HTTP ${response.status}: ${response.statusText}`);
    }

    const result: ApiResponse<BranchSettingsResponse> = await response.json();
    return result.data;
  } catch (error) {
    console.error('Failed to update branch settings:', error);
    throw error;
  }
};

/**
 * Default settings for new branches or fallback
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
  paymentSettings: {
    allowOnlinePayment: true,
    allowCounterPayment: false, // Default: counter payment disabled
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
  minimumOrderAmount: 0, // Default: no minimum order amount
  deliveryFee: 0, // Default: no delivery fee
  freeDeliveryThreshold: 0, // Default: no free delivery threshold
  deliveryZones: {
    enabled: false,
    zones: []
  }, // Default: delivery zones disabled
});