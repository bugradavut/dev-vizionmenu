const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Get all campaigns for a branch
 */
async function getCampaigns(branchId, { page = 1, limit = 50, isActive = null } = {}) {
  try {
    const offset = (page - 1) * limit;
    
    let query = supabase
      .from('coupons')
      .select(`
        id,
        code,
        type,
        value,
        valid_from,
        valid_until,
        applicable_categories,
        is_active,
        created_at,
        updated_at,
        created_by
      `)
      .eq('branch_id', branchId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Filter by active status if specified
    if (isActive !== null) {
      query = query.eq('is_active', isActive);
    }

    const { data, error, count } = await query;

    if (error) {
      throw new Error(`Failed to fetch campaigns: ${error.message}`);
    }

    // Add usage stats for each campaign
    const campaignsWithStats = await Promise.all((data || []).map(async (campaign) => {
      const stats = await getCampaignStats(campaign.id);
      return {
        ...campaign,
        usage_stats: stats
      };
    }));

    return {
      campaigns: campaignsWithStats,
      total: count || campaignsWithStats?.length || 0,
      page,
      limit
    };
  } catch (error) {
    console.error('getCampaigns error:', error);
    throw error;
  }
}

/**
 * Get campaign by ID
 */
async function getCampaignById(campaignId, branchId) {
  try {
    const { data, error } = await supabase
      .from('coupons')
      .select(`
        id,
        branch_id,
        code,
        type,
        value,
        valid_from,
        valid_until,
        applicable_categories,
        is_active,
        created_at,
        updated_at,
        created_by
      `)
      .eq('id', campaignId)
      .eq('branch_id', branchId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        throw new Error('Campaign not found');
      }
      throw new Error(`Failed to fetch campaign: ${error.message}`);
    }

    return data;
  } catch (error) {
    console.error('getCampaignById error:', error);
    throw error;
  }
}

/**
 * Create new campaign
 */
async function createCampaign(branchId, campaignData, createdBy) {
  try {
    const {
      code,
      type,
      value,
      valid_from,
      valid_until,
      applicable_categories = null
    } = campaignData;

    // Validation
    if (!code || !type || !value || !valid_until) {
      throw new Error('Missing required fields: code, type, value, valid_until');
    }

    if (!['percentage', 'fixed_amount'].includes(type)) {
      throw new Error('Invalid campaign type. Must be "percentage" or "fixed_amount"');
    }

    if (value <= 0) {
      throw new Error('Campaign value must be greater than 0');
    }

    if (type === 'percentage' && value > 100) {
      throw new Error('Percentage discount cannot exceed 100%');
    }

    // Check for duplicate code within branch
    const { data: existingCampaign } = await supabase
      .from('coupons')
      .select('id')
      .eq('branch_id', branchId)
      .eq('code', code.toUpperCase())
      .single();

    if (existingCampaign) {
      throw new Error('A campaign with this code already exists in this branch');
    }

    const { data, error } = await supabase
      .from('coupons')
      .insert([{
        branch_id: branchId,
        code: code.toUpperCase(),
        type,
        value: parseFloat(value),
        valid_from: valid_from || new Date().toISOString(),
        valid_until,
        applicable_categories,
        created_by: createdBy,
        is_active: true
      }])
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create campaign: ${error.message}`);
    }

    return data;
  } catch (error) {
    console.error('createCampaign error:', error);
    throw error;
  }
}

/**
 * Update campaign
 */
async function updateCampaign(campaignId, branchId, updateData) {
  try {
    
    const {
      code,
      type,
      value,
      valid_from,
      valid_until,
      applicable_categories,
      is_active
    } = updateData;

    // Validation
    if (type && !['percentage', 'fixed_amount'].includes(type)) {
      console.log('Invalid campaign type:', type);
      throw new Error('Invalid campaign type. Must be "percentage" or "fixed_amount"');
    }

    if (value !== undefined && value <= 0) {
      throw new Error('Campaign value must be greater than 0');
    }

    if (type === 'percentage' && value > 100) {
      throw new Error('Percentage discount cannot exceed 100%');
    }

    // Check for duplicate code if code is being updated
    if (code) {
      const { data: existingCampaign } = await supabase
        .from('coupons')
        .select('id')
        .eq('branch_id', branchId)
        .eq('code', code.toUpperCase())
        .neq('id', campaignId)
        .single();

      if (existingCampaign) {
        throw new Error('A campaign with this code already exists in this branch');
      }
    }

    const updateObject = {};
    if (code !== undefined) updateObject.code = code.toUpperCase();
    if (type !== undefined) updateObject.type = type;
    if (value !== undefined) updateObject.value = parseFloat(value);
    if (valid_from !== undefined) updateObject.valid_from = valid_from;
    if (valid_until !== undefined) updateObject.valid_until = valid_until;
    if (applicable_categories !== undefined) updateObject.applicable_categories = applicable_categories;
    if (is_active !== undefined) updateObject.is_active = is_active;

    const { data, error } = await supabase
      .from('coupons')
      .update(updateObject)
      .eq('id', campaignId)
      .eq('branch_id', branchId)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        throw new Error('Campaign not found');
      }
      throw new Error(`Failed to update campaign: ${error.message}`);
    }

    return data;
  } catch (error) {
    console.error('updateCampaign error:', error);
    throw error;
  }
}

/**
 * Delete campaign
 */
async function deleteCampaign(campaignId, branchId) {
  try {
    // Check if campaign has been used
    const { data: usages } = await supabase
      .from('coupon_usages')
      .select('id')
      .eq('coupon_id', campaignId)
      .limit(1);

    if (usages && usages.length > 0) {
      throw new Error('Cannot delete campaign that has been used. Consider deactivating it instead.');
    }

    const { error } = await supabase
      .from('coupons')
      .delete()
      .eq('id', campaignId)
      .eq('branch_id', branchId);

    if (error) {
      throw new Error(`Failed to delete campaign: ${error.message}`);
    }

    return { success: true, message: 'Campaign deleted successfully' };
  } catch (error) {
    console.error('deleteCampaign error:', error);
    throw error;
  }
}

/**
 * Validate campaign code for customer use
 */
async function validateCampaignCode(code, branchId, orderTotal, categories = []) {
  try {
    if (!code) {
      throw new Error('Campaign code is required');
    }

    // Find active campaign
    const { data: campaign, error } = await supabase
      .from('coupons')
      .select('*')
      .eq('code', code.toUpperCase())
      .eq('branch_id', branchId)
      .eq('is_active', true)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        throw new Error('Invalid campaign code');
      }
      throw new Error(`Failed to validate campaign: ${error.message}`);
    }

    // Check validity dates
    const now = new Date();
    const validFrom = new Date(campaign.valid_from);
    const validUntil = new Date(campaign.valid_until);

    if (now < validFrom) {
      throw new Error('This campaign is not yet active');
    }

    if (now > validUntil) {
      throw new Error('This campaign has expired');
    }

    // Check category restrictions
    if (campaign.applicable_categories && campaign.applicable_categories.length > 0) {
      const hasMatchingCategory = categories.some(category => 
        campaign.applicable_categories.includes(category)
      );

      if (!hasMatchingCategory) {
        throw new Error('This campaign is not applicable to items in your order');
      }
    }

    // Calculate discount amount
    let discountAmount = 0;
    if (campaign.type === 'percentage') {
      discountAmount = (orderTotal * campaign.value) / 100;
    } else if (campaign.type === 'fixed_amount') {
      discountAmount = Math.min(campaign.value, orderTotal);
    }

    return {
      isValid: true,
      campaign: {
        id: campaign.id,
        code: campaign.code,
        type: campaign.type,
        value: campaign.value
      },
      discountAmount: Math.round(discountAmount * 100) / 100,
      message: 'Campaign code is valid'
    };
  } catch (error) {
    console.error('validateCampaignCode error:', error);
    return {
      isValid: false,
      discountAmount: 0,
      message: error.message
    };
  }
}

/**
 * Record campaign usage
 */
async function recordCampaignUsage(couponId, orderId, discountAmount) {
  try {
    const { data, error } = await supabase
      .from('coupon_usages')
      .insert([{
        coupon_id: couponId,
        order_id: orderId,
        discount_amount: discountAmount
      }])
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to record campaign usage: ${error.message}`);
    }

    return data;
  } catch (error) {
    console.error('recordCampaignUsage error:', error);
    throw error;
  }
}

/**
 * Get campaign usage statistics
 */
async function getCampaignStats(campaignId) {
  try {
    // Get usage stats with order information
    const { data: usageStats, error } = await supabase
      .from('coupon_usages')
      .select(`
        id, 
        discount_amount, 
        used_at,
        orders(branch_id),
        coupons(branch_id)
      `)
      .eq('coupon_id', campaignId);

    if (error) {
      throw new Error(`Failed to fetch campaign stats: ${error.message}`);
    }

    // Filter usage stats to ensure coupon and order are from same branch (multi-tenancy)
    const validUsageStats = usageStats?.filter(usage => {
      return usage.orders?.branch_id === usage.coupons?.branch_id;
    }) || [];

    const totalUsages = validUsageStats.length;
    const totalSavings = validUsageStats.reduce((sum, usage) => sum + usage.discount_amount, 0) || 0;

    return {
      totalUsages,
      totalSavings: Math.round(totalSavings * 100) / 100
    };
  } catch (error) {
    console.error('getCampaignStats error:', error);
    throw error;
  }
}

module.exports = {
  getCampaigns,
  getCampaignById,
  createCampaign,
  updateCampaign,
  deleteCampaign,
  validateCampaignCode,
  recordCampaignUsage,
  getCampaignStats
};