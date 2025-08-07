/**
 * Custom hook for managing order timer service
 * Handles automatic progression of orders from 'preparing' to 'ready' status
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useEnhancedAuth } from '@/hooks/use-enhanced-auth';

interface TimerCheckResult {
  processed: number;
  totalChecked: number;
  orders: Array<{
    id: string;
    status: string;
    success: boolean;
    message: string;
    prepTime?: number;
  }>;
  branchName: string;
  timingSettings: {
    totalPrepTime: number;
    breakdown: {
      baseDelay: number;
      temporaryBaseDelay: number;
      deliveryDelay: number;
      temporaryDeliveryDelay: number;
      manualReadyOption: boolean;
    };
  };
}

interface UseOrderTimerReturn {
  // State
  isRunning: boolean;
  lastCheck: Date | null;
  error: string | null;
  lastResult: TimerCheckResult | null;
  
  // Actions
  startTimer: () => void;
  stopTimer: () => void;
  runManualCheck: () => Promise<void>;
  clearError: () => void;
  
  // Stats
  totalProcessed: number;
  checksPerformed: number;
}

const TIMER_INTERVAL = 60000; // 1 minute in milliseconds

/**
 * Hook for managing order timer service
 */
export const useOrderTimer = (): UseOrderTimerReturn => {
  const { branchId } = useEnhancedAuth();
  
  // State
  const [isRunning, setIsRunning] = useState(false);
  const [lastCheck, setLastCheck] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<TimerCheckResult | null>(null);
  const [totalProcessed, setTotalProcessed] = useState(0);
  const [checksPerformed, setChecksPerformed] = useState(0);
  
  // Refs
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isCheckingRef = useRef(false);

  /**
   * Perform timer check API call
   */
  const performTimerCheck = useCallback(async (): Promise<void> => {
    if (!branchId) {
      throw new Error('Branch ID not available');
    }

    if (isCheckingRef.current) {
      console.log('Timer check already in progress, skipping...');
      return;
    }

    isCheckingRef.current = true;
    
    try {
      // Get session from Supabase client
      const { data: { session } } = await import('@/lib/supabase').then(m => m.supabase.auth.getSession());
      if (!session?.access_token) {
        throw new Error('Authentication token not found');
      }

      // Use Express.js API URL
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const response = await fetch(`${apiUrl}/api/v1/orders/timer-check`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ branchId }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error?.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      const data: TimerCheckResult = result.data;
      
      setLastResult(data);
      setLastCheck(new Date());
      setChecksPerformed(prev => prev + 1);
      setTotalProcessed(prev => prev + data.processed);
      setError(null);
      
      // Debug log for timer check
      if (data.processed > 0) {
        console.log(`🔥 TIMER: ${data.processed} orders moved to ready automatically`);
      } else if (data.totalChecked > 0) {
        console.log(`⏳ TIMER: Checked ${data.totalChecked} preparing orders, none ready yet`);
      }
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Timer check failed';
      setError(errorMessage);
      console.error('Timer check failed:', err);
    } finally {
      isCheckingRef.current = false;
    }
  }, [branchId]);

  /**
   * Start automatic timer checking
   */
  const startTimer = useCallback(() => {
    if (!branchId) {
      // Silently return if branch ID not available yet
      return;
    }

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    
    setIsRunning(true);
    setError(null);
    
    // Run immediately
    performTimerCheck();
    
    // Set up interval
    intervalRef.current = setInterval(() => {
      performTimerCheck();
    }, TIMER_INTERVAL);
    
    // Timer service started silently
  }, [branchId, performTimerCheck]);

  /**
   * Stop automatic timer checking
   */
  const stopTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    
    setIsRunning(false);
    // Timer service stopped silently
  }, []);

  /**
   * Run manual timer check
   */
  const runManualCheck = useCallback(async () => {
    await performTimerCheck();
  }, [performTimerCheck]);

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return {
    // State
    isRunning,
    lastCheck,
    error,
    lastResult,
    
    // Actions
    startTimer,
    stopTimer,
    runManualCheck,
    clearError,
    
    // Stats
    totalProcessed,
    checksPerformed,
  };
};