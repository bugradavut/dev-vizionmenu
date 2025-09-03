/**
 * Custom hook for fetching delivery fee for a branch
 */

import { useState, useEffect } from 'react'
import { getDeliveryFee } from '@/services/delivery-fee.service'

interface UseDeliveryFeeOptions {
  branchId?: string;
  enabled?: boolean;
}

interface UseDeliveryFeeReturn {
  deliveryFee: number;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Hook for fetching delivery fee from branch settings
 */
export const useDeliveryFee = (options: UseDeliveryFeeOptions = {}): UseDeliveryFeeReturn => {
  const { branchId, enabled = true } = options;
  
  const [deliveryFee, setDeliveryFee] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDeliveryFee = async () => {
    if (!branchId || !enabled) {
      setDeliveryFee(0);
      return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      const fee = await getDeliveryFee(branchId);
      setDeliveryFee(fee);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch delivery fee');
      setDeliveryFee(0); // Fallback to 0 on error
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDeliveryFee();
  }, [branchId, enabled]);

  return {
    deliveryFee,
    isLoading,
    error,
    refetch: fetchDeliveryFee,
  };
};