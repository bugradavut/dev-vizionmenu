/**
 * Custom hook for checking WEB-SRM certificate expiry status
 * FO-127: Certificate expiry warning system
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/auth-context';
import type { CertificateExpiryStatus } from '@/types/websrm';

interface UseCertificateExpiryOptions {
  enabled?: boolean;
  refetchInterval?: number; // Refetch interval in milliseconds (default: 1 hour)
}

interface UseCertificateExpiryReturn {
  status: CertificateExpiryStatus | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Hook to check certificate expiry status and warning level
 *
 * @param options Configuration options
 * @returns Certificate expiry status and control functions
 *
 * @example
 * ```tsx
 * const { status, loading, refetch } = useCertificateExpiry();
 *
 * if (status?.shouldShowNotification) {
 *   return <CertificateWarningBanner status={status} />;
 * }
 * ```
 */
export function useCertificateExpiry(
  options: UseCertificateExpiryOptions = {}
): UseCertificateExpiryReturn {
  const { enabled = true, refetchInterval = 3600000 } = options; // Default: 1 hour

  const { session } = useAuth();
  const [status, setStatus] = useState<CertificateExpiryStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch certificate expiry status from API
   */
  const fetchStatus = useCallback(async () => {
    if (!enabled || !session?.access_token) {
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Get branch ID from session
      const branchId = session.user?.user_metadata?.branch_id;

      if (!branchId) {
        console.warn('[useCertificateExpiry] No branch ID found in session');
        setStatus({
          success: true,
          hasActiveCertificate: false,
          shouldShowNotification: false,
          warningLevel: 'none',
          message: 'No branch ID found',
        });
        return;
      }

      console.log('[FO-127] Fetching certificate expiry status for branch:', branchId);

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/websrm/certificate/status/${branchId}`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch certificate status: ${response.statusText}`);
      }

      const data: CertificateExpiryStatus = await response.json();

      console.log('[FO-127] Certificate status:', {
        warningLevel: data.warningLevel,
        daysUntilExpiry: data.daysUntilExpiry,
        shouldShow: data.shouldShowNotification,
      });

      setStatus(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch certificate status';
      console.error('[FO-127] Error fetching certificate status:', err);
      setError(errorMessage);

      // Set default safe status on error
      setStatus({
        success: false,
        hasActiveCertificate: false,
        shouldShowNotification: false,
        warningLevel: 'none',
        message: errorMessage,
      });
    } finally {
      setLoading(false);
    }
  }, [enabled, session]);

  /**
   * Refetch certificate status manually
   */
  const refetch = useCallback(async () => {
    await fetchStatus();
  }, [fetchStatus]);

  // Initial fetch on mount and when session changes
  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  // Set up polling interval
  useEffect(() => {
    if (!enabled || !session || refetchInterval <= 0) {
      return;
    }

    const interval = setInterval(() => {
      fetchStatus();
    }, refetchInterval);

    return () => clearInterval(interval);
  }, [enabled, session, refetchInterval, fetchStatus]);

  return {
    status,
    loading,
    error,
    refetch,
  };
}
