/**
 * Custom hook for managing branch settings state and API calls
 */

import { useState, useEffect, useCallback } from 'react'
import { 
  getBranchSettings, 
  updateBranchSettings, 
  getDefaultSettings,
  type BranchSettings
} from '@/services/branch-settings.service'

interface UseBranchSettingsOptions {
  branchId?: string;
  autoLoad?: boolean;
}

interface UseBranchSettingsReturn {
  // State
  settings: BranchSettings;
  loading: boolean;
  saving: boolean;
  error: string | null;
  branchName: string | null;
  
  // Actions
  loadSettings: () => Promise<void>;
  saveSettings: (newSettings: BranchSettings) => Promise<boolean>;
  updateSettings: (updates: Partial<BranchSettings>) => void;
  clearError: () => void;
  
  // Helpers
  isDirty: boolean;
  canSave: boolean;
}

/**
 * Hook for managing branch settings
 */
export const useBranchSettings = (options: UseBranchSettingsOptions = {}): UseBranchSettingsReturn => {
  const { branchId, autoLoad = true } = options;
  
  // State
  const [settings, setSettings] = useState<BranchSettings>(getDefaultSettings());
  const [originalSettings, setOriginalSettings] = useState<BranchSettings>(getDefaultSettings());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [branchName, setBranchName] = useState<string | null>(null);

  // Derived state
  const isDirty = JSON.stringify(settings) !== JSON.stringify(originalSettings);
  const canSave = isDirty && !saving && !loading;

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
      const response = await getBranchSettings(branchId);

      // Ensure restaurant hours are initialized with defaults if missing
      const settingsWithDefaults = {
        ...getDefaultSettings(),
        ...response.settings,
        restaurantHours: response.settings.restaurantHours || getDefaultSettings().restaurantHours
      };

      setSettings(settingsWithDefaults);
      setOriginalSettings(settingsWithDefaults);
      setBranchName(response.branchName);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load branch settings';
      setError(errorMessage);
      console.error('Failed to load branch settings:', err);
    } finally {
      setLoading(false);
    }
  }, [branchId]);

  /**
   * Save branch settings to API
   */
  const saveSettings = useCallback(async (newSettings: BranchSettings): Promise<boolean> => {
    if (!branchId) {
      setError('Branch ID is required');
      return false;
    }

    setSaving(true);
    setError(null);

    try {
      const response = await updateBranchSettings(branchId, newSettings);
      setSettings(response.settings);
      setOriginalSettings(response.settings);
      setBranchName(response.branchName);
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save branch settings';
      setError(errorMessage);
      console.error('Failed to save branch settings:', err);
      return false;
    } finally {
      setSaving(false);
    }
  }, [branchId]);

  /**
   * Update settings in memory (without saving)
   */
  const updateSettings = useCallback((updates: Partial<BranchSettings>) => {
    setSettings(current => ({
      ...current,
      ...updates,
      // Ensure timingSettings are properly merged
      timingSettings: updates.timingSettings 
        ? { ...current.timingSettings, ...updates.timingSettings }
        : current.timingSettings,
      // Ensure paymentSettings are properly merged
      paymentSettings: updates.paymentSettings
        ? { ...current.paymentSettings, ...updates.paymentSettings }
        : current.paymentSettings,
      // Ensure restaurantHours are properly merged
      restaurantHours: updates.restaurantHours
        ? {
            ...getDefaultSettings().restaurantHours,
            ...current.restaurantHours,
            ...updates.restaurantHours
          }
        : current.restaurantHours || getDefaultSettings().restaurantHours,
      // Ensure deliveryZones are properly merged
      deliveryZones: updates.deliveryZones
        ? { ...current.deliveryZones, ...updates.deliveryZones }
        : current.deliveryZones
    }));
  }, []);

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
    saving,
    error,
    branchName,
    
    // Actions
    loadSettings,
    saveSettings,
    updateSettings,
    clearError,
    
    // Helpers
    isDirty,
    canSave,
  };
};