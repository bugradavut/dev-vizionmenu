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
    // Get branch data with settings and minimum_order_amount
    const { data: branchData, error: branchError } = await supabase
      .from('branches')
      .select(`
        id,
        name,
        settings,
        minimum_order_amount
      `)
      .eq('id', branchId)
      .single();

    if (branchError) {
      throw new Error(`Database error: ${branchError.message}`);
    }

    if (!branchData) {
      throw new Error('Branch not found');
    }

    // Parse settings JSON and merge with minimum_order_amount
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
      minimumOrderAmount: branchData.minimum_order_amount || 0,
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
      minimumOrderAmount = 0
    } = settingsData;

    // Validate minimum order amount
    if (minimumOrderAmount < 0 || minimumOrderAmount > 10000) {
      throw new Error('Minimum order amount must be between 0 and 10000');
    }

    // Prepare settings JSON (excluding minimumOrderAmount)
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
        updated_at: new Date().toISOString(),
      })
      .eq('id', branchId)
      .select(`
        id,
        name,
        settings,
        minimum_order_amount
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
      .select('minimum_order_amount')
      .eq('id', branchId)
      .single();

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }

    return data?.minimum_order_amount || 0;
  } catch (error) {
    console.error('Error getting branch minimum order:', error);
    throw error;
  }
}

module.exports = {
  getBranchSettings,
  updateBranchSettings,
  getBranchMinimumOrder,
};