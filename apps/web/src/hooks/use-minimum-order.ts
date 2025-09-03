/**
 * Custom hook for fetching branch minimum order amount
 */

import { useState, useEffect } from 'react';
import { getBranchMinimumOrder } from '@/services/customer-branch.service';

interface UseMinimumOrderOptions {
  branchId?: string;
  enabled?: boolean; // Only fetch when enabled (default: true)
}

interface UseMinimumOrderReturn {
  minimumOrderAmount: number;
  isLoading: boolean;
  error: string | null;
}

export const useMinimumOrder = (options: UseMinimumOrderOptions = {}): UseMinimumOrderReturn => {
  const { branchId, enabled = true } = options;
  
  const [minimumOrderAmount, setMinimumOrderAmount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled || !branchId) {
      setMinimumOrderAmount(0);
      setIsLoading(false);
      setError(null);
      return;
    }

    const fetchMinimumOrder = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const amount = await getBranchMinimumOrder(branchId);
        setMinimumOrderAmount(amount);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch minimum order amount';
        setError(errorMessage);
        // Set to 0 on error - no minimum requirement as fallback
        setMinimumOrderAmount(0);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMinimumOrder();
  }, [branchId, enabled]);

  return {
    minimumOrderAmount,
    isLoading,
    error,
  };
};