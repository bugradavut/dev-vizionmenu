/**
 * Customer Branch Service
 * Public API calls for branch information (no authentication required)
 */

export interface BranchMinimumOrder {
  branchId: string;
  minimumOrderAmount: number;
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
 * Get branch minimum order amount (public endpoint)
 */
export const getBranchMinimumOrder = async (branchId: string): Promise<number> => {
  try {
    if (!branchId) {
      throw new Error('Branch ID is required');
    }

    // Use Express.js API URL
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    const response = await fetch(`${apiUrl}/api/v1/customer/branch/${branchId}/minimum-order`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData: ApiError = await response.json();
      throw new Error(errorData.error.message || `HTTP ${response.status}: ${response.statusText}`);
    }

    const result: ApiResponse<BranchMinimumOrder> = await response.json();
    return result.data.minimumOrderAmount;
  } catch (error) {
    console.error('Failed to get branch minimum order:', error);
    // Return 0 as fallback - no minimum order requirement
    return 0;
  }
};