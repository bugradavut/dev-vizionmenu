const platformSettingsService = require('../services/platform-settings.service');

const platformSettingsController = {
  /**
   * GET /api/v1/platform-settings/maintenance-mode
   * Public endpoint - no auth required
   */
  async getMaintenanceMode(req, res) {
    try {
      const maintenanceMode = await platformSettingsService.getMaintenanceMode();

      res.status(200).json({
        success: true,
        maintenanceMode
      });
    } catch (error) {
      console.error('Get maintenance mode error:', error);
      // Always return success with disabled state on error
      res.status(200).json({
        success: true,
        maintenanceMode: {
          is_enabled: false,
          enabled_at: null,
          enabled_by: null,
          enabled_by_name: null
        }
      });
    }
  },

  /**
   * PUT /api/v1/platform-settings/maintenance-mode
   * Platform admin only
   */
  async updateMaintenanceMode(req, res) {
    try {
      const { isEnabled } = req.body;

      // Validate input
      if (typeof isEnabled !== 'boolean') {
        return res.status(400).json({
          success: false,
          error: 'Invalid request',
          message: 'isEnabled must be a boolean'
        });
      }

      // Get admin info from middleware
      const userId = req.platformAdmin.userId;
      const userName = req.platformAdmin.name;

      const maintenanceMode = await platformSettingsService.updateMaintenanceMode(
        isEnabled,
        userId,
        userName
      );

      res.status(200).json({
        success: true,
        maintenanceMode,
        message: `Maintenance mode ${isEnabled ? 'enabled' : 'disabled'} successfully`
      });
    } catch (error) {
      console.error('Update maintenance mode error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        message: 'Failed to update maintenance mode'
      });
    }
  }
};

module.exports = platformSettingsController;
