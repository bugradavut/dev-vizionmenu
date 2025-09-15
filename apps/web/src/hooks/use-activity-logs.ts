/**
 * Custom hook for managing activity logs state and API calls
 */

import { useState, useEffect, useCallback } from 'react';
import {
  activityLogsService,
  ActivityLog,
  ActivityLogFilters,
  ActivityLogStats,
  ActivityLogFilterOptions
} from '@/services/activity-logs.service';

interface UseActivityLogsOptions {
  chainId?: string;
  autoLoad?: boolean;
  filters?: ActivityLogFilters;
}

interface UseActivityLogsReturn {
  // State
  logs: ActivityLog[];
  stats: ActivityLogStats | null;
  filterOptions: ActivityLogFilterOptions | null;
  loading: boolean;
  error: string | null;
  total: number;
  page: number;
  limit: number;
  totalPages: number;

  // Actions
  loadLogs: (newFilters?: ActivityLogFilters) => Promise<void>;
  loadStats: (startDate?: string, endDate?: string) => Promise<void>;
  loadFilterOptions: () => Promise<void>;
  exportLogs: (format: 'csv' | 'pdf') => void;
  clearError: () => void;

  // Filter helpers
  updateFilters: (newFilters: Partial<ActivityLogFilters>) => void;
  resetFilters: () => void;
  currentFilters: ActivityLogFilters;
}

/**
 * Hook for managing activity logs
 */
export const useActivityLogs = (options: UseActivityLogsOptions = {}): UseActivityLogsReturn => {
  const { chainId, autoLoad = true, filters: initialFilters = {} } = options;

  // State
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [stats, setStats] = useState<ActivityLogStats | null>(null);
  const [filterOptions, setFilterOptions] = useState<ActivityLogFilterOptions | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [totalPages, setTotalPages] = useState(0);
  const [currentFilters, setCurrentFilters] = useState<ActivityLogFilters>({
    page: 1,
    limit: 20,
    ...initialFilters
  });

  /**
   * Load activity logs with current filters
   */
  const loadLogs = useCallback(async (newFilters?: ActivityLogFilters) => {
    if (!chainId) return;

    setLoading(true);
    setError(null);

    try {
      const filtersToUse = newFilters || currentFilters;
      const response = await activityLogsService.getActivityLogs(chainId, filtersToUse);

      if (response.data) {
        setLogs(response.data.logs);
        setTotal(response.data.total);
        setPage(response.data.page);
        setLimit(response.data.limit);
        setTotalPages(response.data.totalPages);
      }
    } catch (error: unknown) {
      setError((error as Error).message || 'Failed to load activity logs');
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, [chainId, currentFilters]);

  /**
   * Load activity statistics
   */
  const loadStats = useCallback(async (startDate?: string, endDate?: string) => {
    if (!chainId) return;

    try {
      const response = await activityLogsService.getActivityStats(chainId, startDate, endDate);

      if (response.data) {
        setStats(response.data);
      }
    } catch (error: unknown) {
      console.error('Error loading activity stats:', error);
    }
  }, [chainId]);

  /**
   * Load filter options
   */
  const loadFilterOptions = useCallback(async () => {
    if (!chainId) return;

    try {
      const response = await activityLogsService.getFilterOptions(chainId);

      if (response.data) {
        setFilterOptions(response.data);
      }
    } catch (error: unknown) {
      console.error('Error loading filter options:', error);
    }
  }, [chainId]);

  /**
   * Update current filters and reload logs
   */
  const updateFilters = useCallback((newFilters: Partial<ActivityLogFilters>) => {
    const updatedFilters = { ...currentFilters, ...newFilters, page: 1 }; // Reset to page 1 when filters change
    setCurrentFilters(updatedFilters);
  }, [currentFilters]);

  /**
   * Reset filters to defaults
   */
  const resetFilters = useCallback(() => {
    const defaultFilters = { page: 1, limit: 20 };
    setCurrentFilters(defaultFilters);
  }, []);

  /**
   * Export activity logs
   */
  const exportLogs = useCallback((format: 'csv' | 'pdf') => {
    // TODO: Implement export functionality
    console.log('Exporting logs as:', format);
    // This will be implemented when we add export endpoints
  }, []);

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Auto-load data on mount and when chainId/filters change
  useEffect(() => {
    if (autoLoad && chainId) {
      loadLogs();
      loadStats();
      loadFilterOptions();
    }
  }, [autoLoad, chainId, loadLogs, loadStats, loadFilterOptions]);

  // Reload logs when filters change
  useEffect(() => {
    if (chainId) {
      loadLogs(currentFilters);
    }
  }, [currentFilters, chainId, loadLogs]);

  return {
    // State
    logs,
    stats,
    filterOptions,
    loading,
    error,
    total,
    page,
    limit,
    totalPages,
    currentFilters,

    // Actions
    loadLogs,
    loadStats,
    loadFilterOptions,
    exportLogs,
    clearError,

    // Filter helpers
    updateFilters,
    resetFilters
  };
};