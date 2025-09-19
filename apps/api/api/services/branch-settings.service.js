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
      restaurantHours: {
        isOpen: settings.restaurantHours?.isOpen ?? true,
        workingDays: settings.restaurantHours?.workingDays || ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'],
        defaultHours: {
          openTime: settings.restaurantHours?.defaultHours?.openTime || '09:00',
          closeTime: settings.restaurantHours?.defaultHours?.closeTime || '22:00'
        }
      },
      minimumOrderAmount: settings.minimumOrderAmount || 0,
      deliveryFee: settings.deliveryFee || 0,
      freeDeliveryThreshold: settings.freeDeliveryThreshold || 0,
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
      minimumOrderAmount = 0,
      deliveryFee = 0,
      freeDeliveryThreshold = 0
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

    // Prepare settings JSON (excluding minimumOrderAmount and deliveryFee)
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
    };

    // Update branch in database
    const { data: updatedBranch, error: updateError } = await supabase
      .from('branches')
      .update({
        settings: settingsJson,
        minimum_order_amount: minimumOrderAmount,
        delivery_fee: deliveryFee,
        free_delivery_threshold: freeDeliveryThreshold,
        updated_at: new Date().toISOString(),
      })
      .eq('id', branchId)
      .select(`
        id,
        name,
        settings,
        minimum_order_amount,
        delivery_fee,
        free_delivery_threshold
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
        minimumOrderAmount: updatedBranch.minimum_order_amount || 0,
        deliveryFee: updatedBranch.delivery_fee || 0,
        freeDeliveryThreshold: updatedBranch.free_delivery_threshold || 0,
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

module.exports = {
  getBranchSettings,
  updateBranchSettings,
  getBranchMinimumOrder,
  getBranchDeliveryFee,
  getBranchDeliveryInfo,
  getBranchInfo,
};