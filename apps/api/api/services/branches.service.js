// =====================================================
// BRANCH MANAGEMENT SERVICE  
// All branch-related business logic and database operations
// =====================================================

const { createClient } = require('@supabase/supabase-js');

// Create Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Get branch settings
 * @param {string} branchId - Branch ID
 * @returns {Object} Branch settings data
 */
async function getBranchSettings(branchId) {
  // Get branch settings from database
  const { data: branchData, error: branchError } = await supabase
    .from('branches')
    .select('id, name, settings')
    .eq('id', branchId)
    .eq('is_active', true)
    .single();

  if (branchError || !branchData) {
    console.error('Branch settings fetch error:', branchError);
    throw new Error('Branch not found');
  }

  // Helper function to deep merge settings with defaults
  const mergeWithDefaults = (existing, defaults) => {
    if (!existing || typeof existing !== 'object') {
      return defaults;
    }
    
    const merged = { ...defaults };
    
    // Apply existing values, preserving user customizations
    Object.keys(existing).forEach(key => {
      if (existing[key] !== null && existing[key] !== undefined) {
        merged[key] = existing[key];
      }
    });
    
    return merged;
  };

  // Default settings structure
  const defaultSettings = {
    orderFlow: 'standard',
    timingSettings: {
      baseDelay: 20,
      temporaryBaseDelay: 0,
      deliveryDelay: 15,
      temporaryDeliveryDelay: 0,
      autoReady: false
    },
    paymentSettings: {
      allowOnlinePayment: true,
      allowCounterPayment: false,
      defaultPaymentMethod: 'online'
    },
    restaurantHours: {
      isOpen: true,
      workingDays: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'],
      defaultHours: {
        openTime: '09:00',
        closeTime: '22:00'
      }
    },
    preOrderSettings: {
      allowWhenClosed: false,
      minimumLeadTimeMinutes: 30,
      maximumDaysAhead: 7
    },
    minimumOrderAmount: 0,
    deliveryFee: 0,
    freeDeliveryThreshold: 0
  };

  // Merge existing settings with defaults, preserving user values
  const settings = {
    orderFlow: branchData.settings?.orderFlow || defaultSettings.orderFlow,
    timingSettings: mergeWithDefaults(
      branchData.settings?.timingSettings,
      defaultSettings.timingSettings
    ),
    paymentSettings: mergeWithDefaults(
      branchData.settings?.paymentSettings,
      defaultSettings.paymentSettings
    ),
    restaurantHours: mergeWithDefaults(
      branchData.settings?.restaurantHours,
      defaultSettings.restaurantHours
    ),
    minimumOrderAmount: branchData.settings?.minimumOrderAmount ?? defaultSettings.minimumOrderAmount,
    deliveryFee: branchData.settings?.deliveryFee ?? defaultSettings.deliveryFee,
    freeDeliveryThreshold: branchData.settings?.freeDeliveryThreshold ?? defaultSettings.freeDeliveryThreshold
  };


  return {
    branchId: branchData.id,
    branchName: branchData.name,
    settings: settings
  };
}

/**
 * Update branch settings
 * @param {string} branchId - Branch ID
 * @param {Object} settingsData - Settings to update
 * @param {string} userId - User making the request
 * @returns {Object} Updated branch data
 */
async function updateBranchSettings(branchId, settingsData, userId) {
  const { orderFlow, timingSettings, paymentSettings, restaurantHours, preOrderSettings, minimumOrderAmount, deliveryFee, freeDeliveryThreshold } = settingsData;
  
  // Validate orderFlow
  if (!orderFlow || !['standard', 'simplified'].includes(orderFlow)) {
    throw new Error('orderFlow must be "standard" or "simplified"');
  }

  // Validate timingSettings - always allow timing settings regardless of flow
  if (timingSettings && typeof timingSettings === 'object') {
    const { baseDelay, temporaryBaseDelay, deliveryDelay, temporaryDeliveryDelay, autoReady } = timingSettings;
    
    if (typeof baseDelay !== 'number' || baseDelay < 0 || baseDelay > 120) {
      throw new Error('baseDelay must be a number between 0 and 120');
    }
    
    if (typeof temporaryBaseDelay !== 'number' || temporaryBaseDelay < -60 || temporaryBaseDelay > 60) {
      throw new Error('temporaryBaseDelay must be a number between -60 and 60');
    }
    
    if (typeof deliveryDelay !== 'number' || deliveryDelay < 0 || deliveryDelay > 120) {
      throw new Error('deliveryDelay must be a number between 0 and 120');
    }
    
    if (typeof temporaryDeliveryDelay !== 'number' || temporaryDeliveryDelay < -60 || temporaryDeliveryDelay > 60) {
      throw new Error('temporaryDeliveryDelay must be a number between -60 and 60');
    }
    
    if (typeof autoReady !== 'boolean') {
      throw new Error('autoReady must be a boolean');
    }
  }

  // Validate paymentSettings if provided
  if (paymentSettings && typeof paymentSettings === 'object') {
    const { allowOnlinePayment, allowCounterPayment, defaultPaymentMethod } = paymentSettings;

    if (typeof allowOnlinePayment !== 'boolean') {
      throw new Error('allowOnlinePayment must be a boolean');
    }

    if (typeof allowCounterPayment !== 'boolean') {
      throw new Error('allowCounterPayment must be a boolean');
    }

    if (defaultPaymentMethod && !['online', 'counter'].includes(defaultPaymentMethod)) {
      throw new Error('defaultPaymentMethod must be "online" or "counter"');
    }
  }

  // Validate restaurantHours if provided
  if (restaurantHours && typeof restaurantHours === 'object') {
    const { isOpen, workingDays, defaultHours } = restaurantHours;

    if (typeof isOpen !== 'boolean') {
      throw new Error('restaurantHours.isOpen must be a boolean');
    }

    if (workingDays && Array.isArray(workingDays)) {
      const validDays = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
      const invalidDays = workingDays.filter(day => !validDays.includes(day));
      if (invalidDays.length > 0) {
        throw new Error(`Invalid working days: ${invalidDays.join(', ')}. Valid days are: ${validDays.join(', ')}`);
      }
    }

    if (defaultHours && typeof defaultHours === 'object') {
      const { openTime, closeTime } = defaultHours;

      // Validate time format (HH:MM)
      const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;

      if (openTime && !timeRegex.test(openTime)) {
        throw new Error('defaultHours.openTime must be in HH:MM format (e.g., "09:00")');
      }

      if (closeTime && !timeRegex.test(closeTime)) {
        throw new Error('defaultHours.closeTime must be in HH:MM format (e.g., "22:00")');
      }

      // Validate logical time order (optional - could span midnight)
      if (openTime && closeTime && openTime >= closeTime) {
        // Allow same time (24/7) or close time before open time (spans midnight)
        // Only warn, don't throw error for flexibility
        console.warn(`Warning: closeTime (${closeTime}) is not after openTime (${openTime}). This may indicate a midnight-spanning schedule.`);
      }
    }
  }

  // Validate preOrderSettings if provided
  if (preOrderSettings && typeof preOrderSettings === 'object') {
    const { allowWhenClosed, minimumLeadTimeMinutes, maximumDaysAhead } = preOrderSettings;

    if (typeof allowWhenClosed !== 'boolean') {
      throw new Error('preOrderSettings.allowWhenClosed must be a boolean');
    }

    if (typeof minimumLeadTimeMinutes !== 'number' || minimumLeadTimeMinutes < 0 || minimumLeadTimeMinutes > 1440) {
      throw new Error('preOrderSettings.minimumLeadTimeMinutes must be between 0 and 1440');
    }

    if (typeof maximumDaysAhead !== 'number' || maximumDaysAhead < 0 || maximumDaysAhead > 30) {
      throw new Error('preOrderSettings.maximumDaysAhead must be between 0 and 30');
    }
  }
  // Validate minimumOrderAmount if provided
  if (minimumOrderAmount !== undefined && minimumOrderAmount !== null) {
    if (typeof minimumOrderAmount !== 'number' || minimumOrderAmount < 0 || minimumOrderAmount > 10000) {
      throw new Error('minimumOrderAmount must be a number between 0 and 10000');
    }
  }

  // Validate deliveryFee if provided
  if (deliveryFee !== undefined && deliveryFee !== null) {
    if (typeof deliveryFee !== 'number' || deliveryFee < 0 || deliveryFee > 1000) {
      throw new Error('deliveryFee must be a number between 0 and 1000');
    }
  }

  // Validate freeDeliveryThreshold if provided
  if (freeDeliveryThreshold !== undefined && freeDeliveryThreshold !== null) {
    if (typeof freeDeliveryThreshold !== 'number' || freeDeliveryThreshold < 0 || freeDeliveryThreshold > 50000) {
      throw new Error('freeDeliveryThreshold must be a number between 0 and 50000');
    }
  }

  // Check if user has permission to update this branch
  const { data: branchUser, error: branchError } = await supabase
    .from('branch_users')
    .select('role, branch_id')
    .eq('user_id', userId)
    .eq('branch_id', branchId)
    .eq('is_active', true)
    .single();

  if (branchError || !branchUser) {
    throw new Error('User does not have access to this branch');
  }

  // Only chain_owner and branch_manager can update settings
  if (!['chain_owner', 'branch_manager'].includes(branchUser.role)) {
    throw new Error('Only branch managers and chain owners can update settings');
  }

  // Verify branch exists
  const { data: branchData, error: branchFetchError } = await supabase
    .from('branches')
    .select('id, name, settings')
    .eq('id', branchId)
    .single();

  if (branchFetchError || !branchData) {
    throw new Error('Branch not found');
  }

  // Helper function to deep merge settings for updates
  const mergeUpdateWithDefaults = (existing, incoming, defaults) => {
    if (!incoming) return existing || defaults;
    
    const merged = { ...defaults };
    
    // First apply existing values
    if (existing && typeof existing === 'object') {
      Object.keys(existing).forEach(key => {
        if (existing[key] !== null && existing[key] !== undefined) {
          merged[key] = existing[key];
        }
      });
    }
    
    // Then apply incoming updates
    Object.keys(incoming).forEach(key => {
      merged[key] = incoming[key];
    });
    
    return merged;
  };

  // Default settings objects
  const defaultTimingSettings = {
    baseDelay: 20,
    temporaryBaseDelay: 0,
    deliveryDelay: 15,
    temporaryDeliveryDelay: 0,
    autoReady: false
  };

  const defaultPaymentSettings = {
    allowOnlinePayment: true,
    allowCounterPayment: false,
    defaultPaymentMethod: 'online'
  };

  const defaultRestaurantHours = {
    isOpen: true,
    workingDays: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'],
    defaultHours: {
      openTime: '09:00',
      closeTime: '22:00'
    }
  };

  // Prepare new settings with proper deep merge
  const newSettings = {
    ...branchData.settings,
    orderFlow,
    timingSettings: mergeUpdateWithDefaults(
      branchData.settings?.timingSettings,
      timingSettings,
      defaultTimingSettings
    ),
    paymentSettings: mergeUpdateWithDefaults(
      branchData.settings?.paymentSettings,
      paymentSettings,
      defaultPaymentSettings
    ),
    restaurantHours: mergeUpdateWithDefaults(
      branchData.settings?.restaurantHours,
      restaurantHours,
      defaultRestaurantHours
    )
  };

  // Add numeric fields if provided
  if (minimumOrderAmount !== undefined && minimumOrderAmount !== null) {
    newSettings.minimumOrderAmount = minimumOrderAmount;
  }

  if (deliveryFee !== undefined && deliveryFee !== null) {
    newSettings.deliveryFee = deliveryFee;
  }

  if (freeDeliveryThreshold !== undefined && freeDeliveryThreshold !== null) {
    newSettings.freeDeliveryThreshold = freeDeliveryThreshold;
  }

  // Update branch settings in database
  const { data: updatedBranch, error: updateError } = await supabase
    .from('branches')
    .update({ settings: newSettings })
    .eq('id', branchId)
    .select('id, name, settings')
    .single();

  if (updateError) {
    console.error('Failed to update branch settings:', updateError);
    throw new Error('Failed to update branch settings');
  }

  return {
    branchId: updatedBranch.id,
    branchName: updatedBranch.name,
    settings: updatedBranch.settings
  };
}

/**
 * Get branch by ID (basic info only)
 * @param {string} branchId - Branch ID
 * @returns {Object} Branch basic info
 */
async function getBranchById(branchId) {
  const { data: branchData, error: branchError } = await supabase
    .from('branches')
    .select('id, name, address, phone, email')
    .eq('id', branchId)
    .eq('is_active', true)
    .single();

  if (branchError || !branchData) {
    throw new Error('Branch not found');
  }

  return branchData;
}

/**
 * Get all branches belonging to a specific chain
 * Used for hierarchical user management
 * @param {string} chainId - Chain ID
 * @param {string} currentUserId - User making the request
 * @returns {Array} Array of branches with basic info
 */
async function getBranchesByChain(chainId, currentUserId) {
  // Get current user's role and permissions
  const { data: userProfile, error: userError } = await supabase
    .from('user_profiles')
    .select('is_platform_admin, role, chain_id')
    .eq('user_id', currentUserId)
    .single();

  if (userError || !userProfile) {
    throw new Error('User not found or unauthorized');
  }

  // Permission check: Only platform_admin or chain_owner of the specific chain
  if (!userProfile.is_platform_admin && 
      (userProfile.role !== 'chain_owner' || userProfile.chain_id !== chainId)) {
    throw new Error('Insufficient permissions to access chain branches');
  }

  // Verify chain exists
  const { data: chainData, error: chainError } = await supabase
    .from('restaurant_chains')
    .select('id, name')
    .eq('id', chainId)
    .eq('is_active', true)
    .single();

  if (chainError || !chainData) {
    throw new Error('Chain not found or inactive');
  }

  // Get branches for the chain
  const { data: branches, error: branchesError } = await supabase
    .from('branches')
    .select(`
      id,
      name,
      slug,
      description,
      phone,
      email,
      address,
      location,
      is_active
    `)
    .eq('chain_id', chainId)
    .eq('is_active', true)
    .order('name');

  if (branchesError) {
    console.error('Failed to fetch chain branches:', branchesError);
    throw new Error('Failed to fetch chain branches');
  }

  return {
    chain: {
      id: chainData.id,
      name: chainData.name
    },
    branches: branches || []
  };
}

module.exports = {
  getBranchSettings,
  updateBranchSettings,
  getBranchById,
  getBranchesByChain
};










