"use client";

import { apiClient } from './api-client';

export interface MaintenanceMode {
  is_enabled: boolean;
  enabled_at: string | null;
  enabled_by: string | null;
  enabled_by_name: string | null;
}

export interface MaintenanceModeResponse {
  success: boolean;
  maintenanceMode: MaintenanceMode;
  message?: string;
}

class PlatformSettingsService {
  /**
   * Get maintenance mode status (public endpoint)
   * No auth required - used by customer order pages
   */
  async getMaintenanceMode(): Promise<MaintenanceMode> {
    try {
      const response = await apiClient.get<MaintenanceModeResponse>('/api/v1/platform-settings/maintenance-mode');
      // apiClient returns the response directly, not wrapped in .data
      return (response as unknown as MaintenanceModeResponse).maintenanceMode;
    } catch (error) {
      console.error('Error fetching maintenance mode:', error);
      // Fail-safe: return disabled
      return {
        is_enabled: false,
        enabled_at: null,
        enabled_by: null,
        enabled_by_name: null
      };
    }
  }

  /**
   * Update maintenance mode status (platform admin only)
   */
  async updateMaintenanceMode(isEnabled: boolean): Promise<MaintenanceMode> {
    try {
      const response = await apiClient.put<MaintenanceModeResponse>(
        '/api/v1/platform-settings/maintenance-mode',
        { isEnabled }
      );
      // apiClient returns the response directly, not wrapped in .data
      return (response as unknown as MaintenanceModeResponse).maintenanceMode;
    } catch (error) {
      console.error('Error updating maintenance mode:', error);
      throw new Error('Failed to update maintenance mode');
    }
  }
}

// Export singleton instance
export const platformSettingsService = new PlatformSettingsService();
export default platformSettingsService;
