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

  // Default settings if none exist
  const defaultSettings = {
    orderFlow: 'standard',
    timingSettings: {
      baseDelay: 20,
      temporaryBaseDelay: 0,
      deliveryDelay: 15,
      temporaryDeliveryDelay: 0
    }
  };

  const settings = { ...defaultSettings, ...branchData.settings };

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
  const { orderFlow, timingSettings } = settingsData;
  
  // Validate orderFlow
  if (!orderFlow || !['standard', 'simplified'].includes(orderFlow)) {
    throw new Error('orderFlow must be "standard" or "simplified"');
  }

  // Validate timingSettings if orderFlow is simplified
  if (orderFlow === 'simplified') {
    if (!timingSettings || typeof timingSettings !== 'object') {
      throw new Error('timingSettings is required for simplified flow');
    }
    
    const { baseDelay, temporaryBaseDelay, deliveryDelay, temporaryDeliveryDelay } = timingSettings;
    
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

  // Prepare new settings
  const newSettings = {
    ...branchData.settings,
    orderFlow,
    timingSettings: orderFlow === 'simplified' ? timingSettings : {
      baseDelay: 20,
      temporaryBaseDelay: 0,
      deliveryDelay: 15,
      temporaryDeliveryDelay: 0,
      }
  };

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

module.exports = {
  getBranchSettings,
  updateBranchSettings
};