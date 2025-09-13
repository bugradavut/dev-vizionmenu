/**
 * Custom hook for managing customer branch settings (read-only)
 * Used in customer ordering flow for display and timing calculations
 */

import { useState, useEffect, useCallback } from 'react'
import { 
  getCustomerBranchSettings, 
  getDefaultSettings,
  type BranchSettings
} from '@/services/customer-branch-settings.service'

interface UseCustomerBranchSettingsOptions {
  branchId?: string;
  autoLoad?: boolean;
}

interface UseCustomerBranchSettingsReturn {
  // State
  settings: BranchSettings;
  loading: boolean;
  error: string | null;
  branchName: string | null;
  
  // Actions
  loadSettings: () => Promise<void>;
  clearError: () => void;
}

/**
 * Hook for loading customer branch settings (read-only)
 * Used in customer ordering flow - no save/update functionality
 */
export const useCustomerBranchSettings = (options: UseCustomerBranchSettingsOptions = {}): UseCustomerBranchSettingsReturn => {
  const { branchId, autoLoad = true } = options;
  
  // State
  const [settings, setSettings] = useState<BranchSettings>(getDefaultSettings());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [branchName, setBranchName] = useState<string | null>(null);

  /**
   * Load branch settings from API
   */
  const loadSettings = useCallback(async () => {
    if (!branchId) {
      setError('Branch ID is required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await getCustomerBranchSettings(branchId);
      setSettings(response.settings);
      setBranchName(response.branchName);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load branch settings';
      setError(errorMessage);
      console.error('Failed to load customer branch settings:', err);
      // On error, keep default settings
      setSettings(getDefaultSettings());
    } finally {
      setLoading(false);
    }
  }, [branchId]);

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Auto-load settings on mount if branchId is provided
  useEffect(() => {
    if (autoLoad && branchId) {
      loadSettings();
    }
  }, [autoLoad, branchId, loadSettings]);

  return {
    // State
    settings,
    loading,
    error,
    branchName,
    
    // Actions
    loadSettings,
    clearError,
  };
};