const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const commissionService = {
  // Get commission rate for branch and source
  async getCommissionRate(branchId, sourceType) {
    try {
      // Validate source type - only allow website, qr, mobile_app
      const validSourceTypes = ['website', 'qr', 'mobile_app'];
      if (!validSourceTypes.includes(sourceType)) {
        console.warn(`Invalid source type: ${sourceType}. Only ${validSourceTypes.join(', ')} are allowed.`);
        return 0.0; // No commission for invalid source types
      }

      // 1. Check branch-specific rates first
      const { data: branchRate, error: branchError } = await supabase
        .from('commission_settings')
        .select('commission_rate')
        .eq('branch_id', branchId)
        .eq('source_type', sourceType)
        .eq('is_active', true)
        .single();
      
      if (branchRate && !branchError) {
        return parseFloat(branchRate.commission_rate);
      }
      
      // 2. Fallback to default rate
      const { data: defaultRate, error: defaultError } = await supabase
        .from('default_commission_rates')
        .select('default_rate')
        .eq('source_type', sourceType)
        .single();
      
      if (defaultRate && !defaultError) {
        return parseFloat(defaultRate.default_rate);
      }
      
      // 3. Final fallback based on source type
      const defaultRates = {
        website: 3.0,     // Standard commission for web orders
        qr: 1.0,          // Reduced commission for in-restaurant QR orders
        mobile_app: 2.0   // Mobile app commission
      };
      return defaultRates[sourceType] || 0.0;
      
    } catch (error) {
      console.error('Error getting commission rate:', error);
      // Safe fallback based on source type
      const defaultRates = {
        website: 3.0,
        qr: 1.0,
        mobile_app: 2.0
      };
      return defaultRates[sourceType] || 0.0;
    }
  },

  // Calculate commission for order
  async calculateCommission(orderTotal, branchId, sourceType) {
    try {
      const rate = await this.getCommissionRate(branchId, sourceType);
      const commissionAmount = (orderTotal * rate) / 100;
      const netAmount = orderTotal - commissionAmount;
      
      return {
        rate: parseFloat(rate.toFixed(2)),
        commissionAmount: parseFloat(commissionAmount.toFixed(2)),
        netAmount: parseFloat(netAmount.toFixed(2))
      };
      
    } catch (error) {
      console.error('Error calculating commission:', error);
      throw new Error(`Commission calculation failed: ${error.message}`);
    }
  },

  // Log commission transaction
  async logCommissionTransaction(orderData) {
    try {
      const { data, error } = await supabase
        .from('commission_transactions')
        .insert({
          order_id: orderData.orderId,
          branch_id: orderData.branchId,
          commission_rate: orderData.commissionRate,
          order_total: orderData.orderTotal,
          commission_amount: orderData.commissionAmount,
          net_amount: orderData.netAmount,
          source_type: orderData.sourceType
        })
        .select()
        .single();
      
      if (error) throw new Error(`Commission logging failed: ${error.message}`);
      return data;
      
    } catch (error) {
      console.error('Error logging commission transaction:', error);
      throw new Error(`Commission transaction logging failed: ${error.message}`);
    }
  },

  // Get all default commission rates
  async getDefaultRates() {
    try {
      const { data, error } = await supabase
        .from('default_commission_rates')
        .select('*')
        .order('source_type');
      
      if (error) throw new Error(`Failed to fetch default rates: ${error.message}`);
      return data || [];
      
    } catch (error) {
      console.error('Error getting default rates:', error);
      throw error;
    }
  },

  // Update default commission rate
  async updateDefaultRate(sourceType, newRate) {
    try {
      const { data, error } = await supabase
        .from('default_commission_rates')
        .update({ 
          default_rate: newRate,
          updated_at: new Date().toISOString()
        })
        .eq('source_type', sourceType)
        .select()
        .single();
      
      if (error) throw new Error(`Failed to update default rate: ${error.message}`);
      return data;
      
    } catch (error) {
      console.error('Error updating default rate:', error);
      throw error;
    }
  },

  // Get chain-specific commission settings
  async getBranchSettings(chainId) {
    try {
      const { data, error } = await supabase
        .from('commission_settings')
        .select('*')
        .eq('chain_id', chainId) // Updated to use chain_id instead of branch_id
        .eq('is_active', true)
        .order('source_type');
      
      if (error) throw new Error(`Failed to fetch chain settings: ${error.message}`);
      return data || [];
      
    } catch (error) {
      console.error('Error getting chain settings:', error);
      throw error;
    }
  },

  // Set chain-specific commission rate
  async setBranchRate(chainId, sourceType, rate, isActive = true) {
    try {
      const { data, error } = await supabase
        .from('commission_settings')
        .upsert({
          chain_id: chainId, // Updated to use chain_id instead of branch_id
          source_type: sourceType,
          commission_rate: rate,
          is_active: isActive,
          updated_at: new Date().toISOString()
        })
        .select()
        .single();
      
      if (error) throw new Error(`Failed to set chain rate: ${error.message}`);
      return data;
      
    } catch (error) {
      console.error('Error setting chain rate:', error);
      throw error;
    }
  },

  // Get commission summary for reporting
  async getCommissionSummary(dateRange = '7d') {
    try {
      let dateFilter = '';
      const now = new Date();
      
      switch (dateRange) {
        case '7d':
          dateFilter = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
          break;
        case '30d':
          dateFilter = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
          break;
        case '90d':
          dateFilter = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString();
          break;
        default:
          dateFilter = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      }

      const { data, error } = await supabase
        .from('commission_transactions')
        .select(`
          *,
          branches!inner(name)
        `)
        .gte('processed_at', dateFilter)
        .order('processed_at', { ascending: false });
      
      if (error) throw new Error(`Failed to fetch commission summary: ${error.message}`);
      return data || [];
      
    } catch (error) {
      console.error('Error getting commission summary:', error);
      throw error;
    }
  }
};

module.exports = commissionService;