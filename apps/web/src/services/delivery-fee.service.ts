/**
 * Delivery Fee Service
 * Handles API calls for getting branch delivery fee
 */

export interface DeliveryFeeResponse {
  branchId: string;
  deliveryFee: number;
}

export interface ApiResponse<T> {
  data: T;
  message?: string;
}

/**
 * Get delivery fee for a specific branch (public endpoint)
 */
export const getDeliveryFee = async (branchId: string): Promise<number> => {
  if (!branchId) {
    throw new Error('Branch ID is required');
  }

  try {
    // Use Express.js API URL (same as minimum order service)
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    const url = `${apiUrl}/api/v1/customer/branch/${branchId}/delivery-fee`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      const errorData: { error?: { message: string } } = await response.json().catch(() => ({ error: { message: 'Unknown error' } }));
      throw new Error(errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`);
    }

    const result: ApiResponse<{
      branchId: string;
      deliveryFee: number;
    }> = await response.json();

    return result.data?.deliveryFee || 0;
  } catch (error) {
    console.error('Failed to get delivery fee:', error);
    // Return default delivery fee on error  
    return 0;
  }
};