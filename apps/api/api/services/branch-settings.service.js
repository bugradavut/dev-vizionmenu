const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Get branch settings by branch ID
 * @param {string} branchId - The branch ID
 * @returns {Promise<Object>} Branch settings object
 */
async function getBranchSettings(branchId) {
  if (!branchId) {
    throw new Error('Branch ID is required');
  }

  try {
    // Get branch data with settings
    const { data: branchData, error: branchError } = await supabase
      .from('branches')
      .select(`
        id,
        name,
        settings
      `)
      .eq('id', branchId)
      .single();

    if (branchError) {
      throw new Error(`Database error: ${branchError.message}`);
    }

    if (!branchData) {
      throw new Error('Branch not found');
    }

    // Parse settings JSON
    const settings = branchData.settings || {};

    // Build the complete settings object
    const branchSettings = {
      orderFlow: settings.orderFlow || 'standard',
      timingSettings: {
        baseDelay: settings.timingSettings?.baseDelay || 20,
        temporaryBaseDelay: settings.timingSettings?.temporaryBaseDelay || 0,
        deliveryDelay: settings.timingSettings?.deliveryDelay || 15,
        temporaryDeliveryDelay: settings.timingSettings?.temporaryDeliveryDelay || 0,
        autoReady: settings.timingSettings?.autoReady || false,
      },
      paymentSettings: {
        allowOnlinePayment: settings.paymentSettings?.allowOnlinePayment ?? true,
        allowCounterPayment: settings.paymentSettings?.allowCounterPayment ?? false,
        defaultPaymentMethod: settings.paymentSettings?.defaultPaymentMethod || 'online',
      },
      restaurantHours: buildRestaurantHours(settings.restaurantHours),
      minimumOrderAmount: settings.minimumOrderAmount || 0,
      deliveryFee: settings.deliveryFee || 0,
      freeDeliveryThreshold: settings.freeDeliveryThreshold || 0,
      deliveryZones: settings.deliveryZones || { enabled: false, zones: [] },
    };

    return {
      branchId: branchData.id,
      branchName: branchData.name,
      settings: branchSettings,
    };
  } catch (error) {
    console.error('Error getting branch settings:', error);
    throw error;
  }
}

/**
 * Update branch settings
 * @param {string} branchId - The branch ID
 * @param {Object} settingsData - The settings to update
 * @returns {Promise<Object>} Updated branch settings
 */
async function updateBranchSettings(branchId, settingsData) {
  if (!branchId) {
    throw new Error('Branch ID is required');
  }

  if (!settingsData) {
    throw new Error('Settings data is required');
  }


  try {
    // Validate settingsData structure
    const {
      orderFlow,
      timingSettings,
      paymentSettings,
      restaurantHours,
      minimumOrderAmount = 0,
      deliveryFee = 0,
      freeDeliveryThreshold = 0,
      deliveryZones
    } = settingsData;

    // Validate minimum order amount
    if (minimumOrderAmount < 0 || minimumOrderAmount > 10000) {
      throw new Error('Minimum order amount must be between 0 and 10000');
    }

    // Validate delivery fee
    if (deliveryFee < 0 || deliveryFee > 100) {
      throw new Error('Delivery fee must be between 0 and 100');
    }

    // Validate free delivery threshold
    if (freeDeliveryThreshold < 0 || freeDeliveryThreshold > 10000) {
      throw new Error('Free delivery threshold must be between 0 and 10000');
    }

    // Validate restaurant hours if provided
    if (restaurantHours) {
      validateRestaurantHours(restaurantHours);
    }

    // Validate delivery zones if provided
    if (deliveryZones) {
      validateDeliveryZones(deliveryZones);
    }

    // Prepare complete settings JSON (including all settings)
    const settingsJson = {
      orderFlow: orderFlow || 'standard',
      timingSettings: {
        baseDelay: timingSettings?.baseDelay || 20,
        temporaryBaseDelay: timingSettings?.temporaryBaseDelay || 0,
        deliveryDelay: timingSettings?.deliveryDelay || 15,
        temporaryDeliveryDelay: timingSettings?.temporaryDeliveryDelay || 0,
        autoReady: timingSettings?.autoReady || false,
      },
      paymentSettings: {
        allowOnlinePayment: paymentSettings?.allowOnlinePayment ?? true,
        allowCounterPayment: paymentSettings?.allowCounterPayment ?? false,
        defaultPaymentMethod: paymentSettings?.defaultPaymentMethod || 'online',
      },
      restaurantHours: restaurantHours ? sanitizeRestaurantHours(restaurantHours) : undefined,
      deliveryZones: deliveryZones ? sanitizeDeliveryZones(deliveryZones) : undefined,
      // Include order amounts in settings JSON
      minimumOrderAmount: minimumOrderAmount || 0,
      deliveryFee: deliveryFee || 0,
      freeDeliveryThreshold: freeDeliveryThreshold || 0,
    };


    // Update branch in database (only settings and updated_at)
    const { data: updatedBranch, error: updateError } = await supabase
      .from('branches')
      .update({
        settings: settingsJson,
        updated_at: new Date().toISOString(),
      })
      .eq('id', branchId)
      .select(`
        id,
        name,
        settings
      `)
      .single();


    if (updateError) {
      throw new Error(`Database error: ${updateError.message}`);
    }

    if (!updatedBranch) {
      throw new Error('Failed to update branch settings');
    }

    // Return formatted response
    return {
      branchId: updatedBranch.id,
      branchName: updatedBranch.name,
      settings: {
        ...settingsJson,
        restaurantHours: buildRestaurantHours(updatedBranch.settings?.restaurantHours),
        minimumOrderAmount: updatedBranch.settings?.minimumOrderAmount || 0,
        deliveryFee: updatedBranch.settings?.deliveryFee || 0,
        freeDeliveryThreshold: updatedBranch.settings?.freeDeliveryThreshold || 0,
        deliveryZones: updatedBranch.settings?.deliveryZones || { enabled: false, zones: [] },
      },
    };
  } catch (error) {
    console.error('Error updating branch settings:', error);
    throw error;
  }
}

/**
 * Get branch minimum order amount (public endpoint helper)
 * @param {string} branchId - The branch ID
 * @returns {Promise<number>} Minimum order amount
 */
async function getBranchMinimumOrder(branchId) {
  if (!branchId) {
    throw new Error('Branch ID is required');
  }

  try {
    const { data, error } = await supabase
      .from('branches')
      .select('settings')
      .eq('id', branchId)
      .single();

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }

    // Get minimum order amount from settings JSONB field
    return data?.settings?.minimumOrderAmount || 0;
  } catch (error) {
    console.error('Error getting branch minimum order:', error);
    throw error;
  }
}

/**
 * Get branch delivery fee (public endpoint for customer orders)
 * @param {string} branchId - The branch ID
 * @returns {Promise<number>} Delivery fee amount
 */
async function getBranchDeliveryFee(branchId) {
  if (!branchId) {
    throw new Error('Branch ID is required');
  }

  try {
    const { data, error } = await supabase
      .from('branches')
      .select('settings')
      .eq('id', branchId)
      .single();

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }

    // Get delivery fee from settings JSONB field
    return data?.settings?.deliveryFee || 0;
  } catch (error) {
    console.error('Error getting branch delivery fee:', error);
    throw error;
  }
}

/**
 * Get branch delivery info (public endpoint for customer orders)
 * @param {string} branchId - The branch ID
 * @returns {Promise<Object>} Delivery fee and free delivery threshold
 */
async function getBranchDeliveryInfo(branchId) {
  if (!branchId) {
    throw new Error('Branch ID is required');
  }

  try {
    const { data, error } = await supabase
      .from('branches')
      .select('settings')
      .eq('id', branchId)
      .single();

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }

    if (!data) {
      throw new Error('Branch not found');
    }

    // Get delivery info from settings JSONB field
    return {
      deliveryFee: data.settings?.deliveryFee || 0,
      freeDeliveryThreshold: data.settings?.freeDeliveryThreshold || 0,
    };
  } catch (error) {
    console.error('Error getting branch delivery info:', error);
    throw error;
  }
}

/**
 * Get branch information (public endpoint for customer orders)
 * @param {string} branchId - The branch ID
 * @returns {Promise<Object>} Branch information with id, name, address
 */
async function getBranchInfo(branchId) {
  if (!branchId) {
    throw new Error('Branch ID is required');
  }

  try {
    const { data, error } = await supabase
      .from('branches')
      .select('id, name, address, phone, email')
      .eq('id', branchId)
      .single();

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }

    if (!data) {
      throw new Error('Branch not found');
    }

    return {
      id: data.id,
      name: data.name,
      address: data.address || 'Address not available',
      phone: data.phone || null,
      email: data.email || null,
    };
  } catch (error) {
    console.error('Error getting branch info:', error);
    throw error;
  }
}

/**
 * Build restaurant hours object with proper structure
 * Handles legacy data migration and default values
 */
function buildRestaurantHours(restaurantHours) {
  if (!restaurantHours) {
    // Default restaurant hours
    return {
      isOpen: true,
      mode: 'simple',
      simpleSchedule: {
        workingDays: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'],
        defaultHours: {
          openTime: '09:00',
          closeTime: '22:00'
        }
      },
      advancedSchedule: {}
    };
  }

  // If already in new format, return as-is
  if (restaurantHours.mode && restaurantHours.simpleSchedule) {
    return {
      isOpen: restaurantHours.isOpen ?? true,
      mode: restaurantHours.mode,
      simpleSchedule: restaurantHours.simpleSchedule,
      advancedSchedule: restaurantHours.advancedSchedule || {}
    };
  }

  // Legacy data migration
  return {
    isOpen: restaurantHours.isOpen ?? true,
    mode: 'simple',
    simpleSchedule: {
      workingDays: restaurantHours.workingDays || ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'],
      defaultHours: {
        openTime: restaurantHours.defaultHours?.openTime || '09:00',
        closeTime: restaurantHours.defaultHours?.closeTime || '22:00'
      }
    },
    advancedSchedule: {}
  };
}

/**
 * Validate restaurant hours structure
 */
function validateRestaurantHours(restaurantHours) {
  if (!restaurantHours || typeof restaurantHours !== 'object') {
    throw new Error('Restaurant hours must be an object');
  }

  const { mode, simpleSchedule, advancedSchedule } = restaurantHours;

  // Validate mode
  if (mode && !['simple', 'advanced'].includes(mode)) {
    throw new Error('Restaurant hours mode must be "simple" or "advanced"');
  }

  // Validate simple schedule
  if (mode === 'simple' && simpleSchedule) {
    validateSimpleSchedule(simpleSchedule);
  }

  // Validate advanced schedule
  if (mode === 'advanced' && advancedSchedule) {
    validateAdvancedSchedule(advancedSchedule);
  }

  return true;
}

/**
 * Validate simple schedule structure
 */
function validateSimpleSchedule(simpleSchedule) {
  if (!simpleSchedule || typeof simpleSchedule !== 'object') {
    throw new Error('Simple schedule must be an object');
  }

  const { workingDays, defaultHours } = simpleSchedule;

  // Validate working days
  if (!Array.isArray(workingDays)) {
    throw new Error('Working days must be an array');
  }

  const validDays = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
  const invalidDays = workingDays.filter(day => !validDays.includes(day));
  if (invalidDays.length > 0) {
    throw new Error(`Invalid working days: ${invalidDays.join(', ')}`);
  }

  // Validate default hours
  if (!defaultHours || typeof defaultHours !== 'object') {
    throw new Error('Default hours must be an object');
  }

  validateTimeString(defaultHours.openTime, 'Open time');
  validateTimeString(defaultHours.closeTime, 'Close time');
}

/**
 * Validate advanced schedule structure
 */
function validateAdvancedSchedule(advancedSchedule) {
  if (!advancedSchedule || typeof advancedSchedule !== 'object') {
    throw new Error('Advanced schedule must be an object');
  }

  const validDays = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

  Object.entries(advancedSchedule).forEach(([day, schedule]) => {
    if (!validDays.includes(day)) {
      throw new Error(`Invalid day in advanced schedule: ${day}`);
    }

    if (!schedule || typeof schedule !== 'object') {
      throw new Error(`Day schedule for ${day} must be an object`);
    }

    const { enabled, openTime, closeTime } = schedule;

    if (typeof enabled !== 'boolean') {
      throw new Error(`Enabled flag for ${day} must be a boolean`);
    }

    if (enabled) {
      validateTimeString(openTime, `Open time for ${day}`);
      validateTimeString(closeTime, `Close time for ${day}`);
    }
  });
}

/**
 * Validate time string format (HH:MM)
 */
function validateTimeString(timeString, fieldName) {
  if (!timeString || typeof timeString !== 'string') {
    throw new Error(`${fieldName} must be a string`);
  }

  const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
  if (!timeRegex.test(timeString)) {
    throw new Error(`${fieldName} must be in HH:MM format`);
  }
}

/**
 * Sanitize restaurant hours for database storage
 * Remove any potentially dangerous or unnecessary fields
 */
function sanitizeRestaurantHours(restaurantHours) {
  if (!restaurantHours) {
    return null;
  }

  const sanitized = {
    isOpen: Boolean(restaurantHours.isOpen ?? true),
    mode: restaurantHours.mode === 'advanced' ? 'advanced' : 'simple'
  };

  if (restaurantHours.simpleSchedule) {
    sanitized.simpleSchedule = {
      workingDays: Array.isArray(restaurantHours.simpleSchedule.workingDays)
        ? restaurantHours.simpleSchedule.workingDays.filter(day =>
            ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].includes(day)
          )
        : ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'],
      defaultHours: {
        openTime: restaurantHours.simpleSchedule.defaultHours?.openTime || '09:00',
        closeTime: restaurantHours.simpleSchedule.defaultHours?.closeTime || '22:00'
      }
    };
  }

  if (restaurantHours.advancedSchedule) {
    sanitized.advancedSchedule = {};
    const validDays = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

    validDays.forEach(day => {
      const daySchedule = restaurantHours.advancedSchedule[day];
      if (daySchedule && typeof daySchedule === 'object') {
        sanitized.advancedSchedule[day] = {
          enabled: Boolean(daySchedule.enabled),
          openTime: daySchedule.openTime || '09:00',
          closeTime: daySchedule.closeTime || '22:00'
        };
      }
    });
  }

  return sanitized;
}

/**
 * Validate delivery zones structure
 */
function validateDeliveryZones(deliveryZones) {
  if (!deliveryZones || typeof deliveryZones !== 'object') {
    throw new Error('Delivery zones must be an object');
  }

  const { enabled, zones } = deliveryZones;

  // Validate enabled flag
  if (typeof enabled !== 'boolean') {
    throw new Error('Delivery zones enabled flag must be a boolean');
  }

  // Validate zones array
  if (!Array.isArray(zones)) {
    throw new Error('Delivery zones must be an array');
  }

  // Validate each zone
  zones.forEach((zone, index) => {
    if (!zone || typeof zone !== 'object') {
      throw new Error(`Zone ${index + 1} must be an object`);
    }

    const { id, name, polygon, active } = zone;

    if (!id || typeof id !== 'string') {
      throw new Error(`Zone ${index + 1} must have a valid ID`);
    }

    if (!name || typeof name !== 'string') {
      throw new Error(`Zone ${index + 1} must have a valid name`);
    }

    if (typeof active !== 'boolean') {
      throw new Error(`Zone ${index + 1} active flag must be a boolean`);
    }

    if (!Array.isArray(polygon)) {
      throw new Error(`Zone ${index + 1} polygon must be an array`);
    }

    // Validate polygon coordinates
    if (polygon.length < 3) {
      throw new Error(`Zone ${index + 1} polygon must have at least 3 points`);
    }

    polygon.forEach((point, pointIndex) => {
      if (!Array.isArray(point) || point.length !== 2) {
        throw new Error(`Zone ${index + 1} polygon point ${pointIndex + 1} must be an array of [lat, lng]`);
      }

      const [lat, lng] = point;
      if (typeof lat !== 'number' || typeof lng !== 'number') {
        throw new Error(`Zone ${index + 1} polygon point ${pointIndex + 1} coordinates must be numbers`);
      }

      // Basic coordinate validation
      if (lat < -90 || lat > 90) {
        throw new Error(`Zone ${index + 1} polygon point ${pointIndex + 1} latitude must be between -90 and 90`);
      }

      if (lng < -180 || lng > 180) {
        throw new Error(`Zone ${index + 1} polygon point ${pointIndex + 1} longitude must be between -180 and 180`);
      }
    });
  });

  return true;
}

/**
 * Sanitize delivery zones for database storage
 */
function sanitizeDeliveryZones(deliveryZones) {
  if (!deliveryZones) {
    return { enabled: false, zones: [] };
  }

  const sanitized = {
    enabled: Boolean(deliveryZones.enabled),
    zones: []
  };

  if (Array.isArray(deliveryZones.zones)) {
    sanitized.zones = deliveryZones.zones.map(zone => {
      if (!zone || typeof zone !== 'object') {
        return null;
      }

      const sanitizedZone = {
        id: String(zone.id || ''),
        name: String(zone.name || ''),
        active: Boolean(zone.active),
        polygon: []
      };

      // Sanitize polygon coordinates
      if (Array.isArray(zone.polygon)) {
        sanitizedZone.polygon = zone.polygon
          .filter(point => Array.isArray(point) && point.length === 2)
          .map(([lat, lng]) => [
            parseFloat(lat) || 0,
            parseFloat(lng) || 0
          ])
          .filter(([lat, lng]) =>
            lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180
          );
      }

      return sanitizedZone;
    }).filter(zone => zone && zone.id && zone.polygon.length >= 3);
  }

  return sanitized;
}

module.exports = {
  getBranchSettings,
  updateBranchSettings,
  getBranchMinimumOrder,
  getBranchDeliveryFee,
  getBranchDeliveryInfo,
  getBranchInfo,
};