/**
 * Custom hook for fetching delivery fee for a branch
 */

import { useState, useEffect } from 'react'
import { getDeliveryInfo } from '@/services/delivery-fee.service'

interface UseDeliveryFeeOptions {
  branchId?: string;
  enabled?: boolean;
}

interface UseDeliveryFeeReturn {
  deliveryFee: number;
  freeDeliveryThreshold: number;
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
  const [freeDeliveryThreshold, setFreeDeliveryThreshold] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDeliveryInfo = async () => {
    if (!branchId || !enabled) {
      setDeliveryFee(0);
      setFreeDeliveryThreshold(0);
      return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      const info = await getDeliveryInfo(branchId);
      setDeliveryFee(info.deliveryFee);
      setFreeDeliveryThreshold(info.freeDeliveryThreshold);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch delivery info');
      setDeliveryFee(0); // Fallback to 0 on error
      setFreeDeliveryThreshold(0);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDeliveryInfo();
  }, [branchId, enabled]);

  return {
    deliveryFee,
    freeDeliveryThreshold,
    isLoading,
    error,
    refetch: fetchDeliveryInfo,
  };
};