const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const platformSettingsService = {
  /**
   * Get maintenance mode status (PUBLIC - no auth required)
   * Used by customer order pages to check if maintenance is active
   */
  async getMaintenanceMode() {
    try {
      const { data, error } = await supabase
        .from('platform_settings')
        .select('setting_value')
        .eq('setting_key', 'maintenance_mode')
        .single();

      if (error) {
        console.error('Error fetching maintenance mode:', error);
        // Fail-safe: return disabled if error occurs
        return {
          is_enabled: false,
          enabled_at: null,
          enabled_by: null,
          enabled_by_name: null
        };
      }

      return data.setting_value;
    } catch (error) {
      console.error('Error in getMaintenanceMode:', error);
      // Fail-safe: return disabled
      return {
        is_enabled: false,
        enabled_at: null,
        enabled_by: null,
        enabled_by_name: null
      };
    }
  },

  /**
   * Update maintenance mode status (PLATFORM ADMIN ONLY)
   * @param {boolean} isEnabled - Enable or disable maintenance mode
   * @param {string} userId - Platform admin user ID
   * @param {string} userName - Platform admin name
   */
  async updateMaintenanceMode(isEnabled, userId, userName) {
    try {
      const settingValue = {
        is_enabled: isEnabled,
        enabled_at: isEnabled ? new Date().toISOString() : null,
        enabled_by: isEnabled ? userId : null,
        enabled_by_name: isEnabled ? userName : null
      };

      const { data, error } = await supabase
        .from('platform_settings')
        .update({
          setting_value: settingValue,
          updated_at: new Date().toISOString(),
          updated_by: userId
        })
        .eq('setting_key', 'maintenance_mode')
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to update maintenance mode: ${error.message}`);
      }

      console.log(`🔧 Maintenance mode ${isEnabled ? 'ENABLED' : 'DISABLED'} by ${userName}`);
      return data.setting_value;
    } catch (error) {
      console.error('Error updating maintenance mode:', error);
      throw error;
    }
  }
};

module.exports = platformSettingsService;
