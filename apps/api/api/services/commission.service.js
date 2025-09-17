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
      
      // 2. Check chain-level rates (get branch's chain first)
      const { data: branch, error: branchLookupError } = await supabase
        .from('branches')
        .select('chain_id')
        .eq('id', branchId)
        .single();
      
      if (branch && !branchLookupError) {
        const { data: chainRate, error: chainError } = await supabase
          .from('commission_settings')
          .select('commission_rate')
          .eq('chain_id', branch.chain_id)
          .eq('source_type', sourceType)
          .eq('is_active', true)
          .is('branch_id', null)
          .single();
        
        if (chainRate && !chainError) {
          return parseFloat(chainRate.commission_rate);
        }
      }
      
      // 3. Fallback to default rate
      const { data: defaultRate, error: defaultError } = await supabase
        .from('default_commission_rates')
        .select('default_rate')
        .eq('source_type', sourceType)
        .single();
      
      if (defaultRate && !defaultError) {
        return parseFloat(defaultRate.default_rate);
      }
      
      // 4. Final fallback based on source type
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
  async getChainSettings(chainId) {
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
  async setChainRate(chainId, sourceType, rate, isActive = true) {
    try {
      console.log(`💾 Setting chain rate: ${chainId} / ${sourceType} = ${rate}%`);
      
      const { data, error } = await supabase
        .from('commission_settings')
        .upsert(
          {
            chain_id: chainId,
            source_type: sourceType,
            commission_rate: rate,
            is_active: isActive,
            updated_at: new Date().toISOString()
          },
          {
            onConflict: 'chain_id,source_type', // Specify the conflict columns
            ignoreDuplicates: false // Update on conflict
          }
        )
        .select()
        .single();
      
      if (error) {
        console.error('❌ Database error:', error);
        throw new Error(`Failed to set chain rate: ${error.message}`);
      }
      
      console.log('✅ Chain rate set successfully:', data);
      return data;
      
    } catch (error) {
      console.error('❌ Error setting chain rate:', error);
      throw error;
    }
  },

  // Remove chain-specific override
  async removeChainOverride(chainId, sourceType) {
    try {
      const { data, error } = await supabase
        .from('commission_settings')
        .delete()
        .eq('chain_id', chainId)
        .eq('source_type', sourceType)
        .select();
      
      if (error) throw new Error(`Failed to remove chain override: ${error.message}`);
      return data;
      
    } catch (error) {
      console.error('Error removing chain override:', error);
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
  },

  // =====================================================
  // BRANCH-SPECIFIC COMMISSION METHODS
  // =====================================================

  // Get branch-specific commission settings
  async getBranchSettings(branchId) {
    try {
      console.log(`📊 Getting commission settings for branch: ${branchId}`);
      
      // Get branch information including chain_id
      const { data: branchInfo, error: branchInfoError } = await supabase
        .from('branches')
        .select('chain_id')
        .eq('id', branchId)
        .single();
      
      if (branchInfoError) throw new Error(`Failed to fetch branch info: ${branchInfoError.message}`);
      
      // Get default rates
      const defaultRates = await this.getDefaultRates();
      
      // Get chain-specific rates if available
      let chainSettings = [];
      if (branchInfo.chain_id) {
        try {
          chainSettings = await this.getChainSettings(branchInfo.chain_id);
        } catch (error) {
          console.warn('Could not load chain settings, using defaults:', error.message);
          chainSettings = [];
        }
      }
      
      // Get branch-specific rates (if any)
      const { data: branchSettings, error: branchError } = await supabase
        .from('commission_settings')
        .select('*')
        .eq('branch_id', branchId)
        .eq('is_active', true)
        .order('source_type');
      
      if (branchError) throw new Error(`Failed to fetch branch settings: ${branchError.message}`);
      
      // Combine results with proper inheritance: Branch > Chain > Default
      const settings = defaultRates.map(defaultRate => {
        const chainOverride = chainSettings.find(setting => 
          setting.source_type === defaultRate.source_type
        );
        const branchOverride = branchSettings.find(setting => 
          setting.source_type === defaultRate.source_type
        );
        
        return {
          source_type: defaultRate.source_type,
          default_rate: parseFloat(defaultRate.default_rate),
          chain_rate: chainOverride ? parseFloat(chainOverride.commission_rate) : null,
          branch_rate: branchOverride ? parseFloat(branchOverride.commission_rate) : null,
          effective_rate: branchOverride 
            ? parseFloat(branchOverride.commission_rate)
            : chainOverride 
              ? parseFloat(chainOverride.commission_rate)
              : parseFloat(defaultRate.default_rate),
          has_override: !!branchOverride,
          is_active: branchOverride ? branchOverride.is_active : true
        };
      });
      
      return settings;
      
    } catch (error) {
      console.error('Error getting branch settings:', error);
      throw error;
    }
  },

  // Set branch-specific commission rate
  async setBranchRate(branchId, sourceType, rate, isActive = true) {
    try {
      console.log(`💾 Setting branch rate: ${branchId} / ${sourceType} = ${rate}%`);
      
      // First try to update existing record
      const { data: existingData, error: selectError } = await supabase
        .from('commission_settings')
        .select('id')
        .eq('branch_id', branchId)
        .eq('source_type', sourceType)
        .maybeSingle();

      if (selectError) throw new Error(`Failed to check existing rate: ${selectError.message}`);

      let data, error;
      
      if (existingData) {
        // Update existing record
        const { data: updateData, error: updateError } = await supabase
          .from('commission_settings')
          .update({
            commission_rate: rate,
            is_active: isActive,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingData.id)
          .select()
          .single();
        
        data = updateData;
        error = updateError;
      } else {
        // Insert new record
        const { data: insertData, error: insertError } = await supabase
          .from('commission_settings')
          .insert({
            branch_id: branchId,
            source_type: sourceType,
            commission_rate: rate,
            is_active: isActive,
            updated_at: new Date().toISOString()
          })
          .select()
          .single();
        
        data = insertData;
        error = insertError;
      }
      
      if (error) {
        console.error('❌ Database error:', error);
        throw new Error(`Failed to set branch rate: ${error.message}`);
      }
      
      console.log('✅ Branch rate set successfully:', data);
      return data;
      
    } catch (error) {
      console.error('❌ Error setting branch rate:', error);
      throw error;
    }
  },

  // Remove branch-specific override
  async removeBranchOverride(branchId, sourceType) {
    try {
      const { data, error } = await supabase
        .from('commission_settings')
        .delete()
        .eq('branch_id', branchId)
        .eq('source_type', sourceType)
        .select();
      
      if (error) throw new Error(`Failed to remove branch override: ${error.message}`);
      return data;
      
    } catch (error) {
      console.error('Error removing branch override:', error);
      throw error;
    }
  },

  // Bulk update multiple branch rates
  async bulkUpdateBranchRates(branchId, rates) {
    try {
      console.log(`📊 Bulk updating rates for branch: ${branchId}`, rates);

      const results = [];
      for (const rateConfig of rates) {
        try {
          const result = await this.setBranchRate(
            branchId,
            rateConfig.sourceType,
            rateConfig.rate
          );
          results.push({
            sourceType: rateConfig.sourceType,
            success: true,
            result: result
          });
        } catch (error) {
          results.push({
            sourceType: rateConfig.sourceType,
            success: false,
            error: error.message
          });
        }
      }

      return results;

    } catch (error) {
      console.error('Error bulk updating branch rates:', error);
      throw error;
    }
  },

  // Get commission reports data for admin dashboard
  async getCommissionReports(params = {}) {
    try {
      let startDate, endDate;
      const now = new Date();

      // Handle custom date range or period-based range
      if (params.startDate && params.endDate) {
        startDate = new Date(params.startDate);
        endDate = new Date(params.endDate);
      } else {
        const dateRange = params.period || params.dateRange || '30d';
        switch (dateRange) {
          case '7d':
            startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
          case '30d':
            startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            break;
          case '90d':
            startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
            break;
          default:
            startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        }
        endDate = now;
      }

      // Ensure we have full day coverage
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);

      const dateFilter = startDate.toISOString();

      // Get commission data grouped by source and date
      const { data: commissionData, error: commissionError } = await supabase
        .from('orders')
        .select('order_source, commission_amount, commission_rate, total_amount, created_at')
        .not('commission_amount', 'is', null)
        .gt('commission_amount', 0)
        .gte('created_at', dateFilter)
        .lte('created_at', endDate.toISOString())
        .order('created_at', { ascending: true });

      if (commissionError) throw new Error(`Failed to fetch commission data: ${commissionError.message}`);

      // Calculate summary statistics
      const totalCommission = commissionData.reduce((sum, order) => sum + parseFloat(order.commission_amount), 0);
      const totalOrders = commissionData.length;
      const totalRevenue = commissionData.reduce((sum, order) => sum + parseFloat(order.total_amount), 0);
      const averageCommissionRate = totalRevenue > 0 ? (totalCommission / totalRevenue) * 100 : 0;

      // Group by source
      const breakdown = {
        website: { orders: 0, commission: 0, rate: 3 },
        qr: { orders: 0, commission: 0, rate: 1 },
        mobile_app: { orders: 0, commission: 0, rate: 2 }
      };

      commissionData.forEach(order => {
        if (breakdown[order.order_source]) {
          breakdown[order.order_source].orders += 1;
          breakdown[order.order_source].commission += parseFloat(order.commission_amount);
        }
      });

      // Generate complete date range (analytics-style behavior)
      const trends = [];
      const currentDate = new Date(startDate);

      while (currentDate <= endDate) {
        const dateStr = currentDate.toISOString().split('T')[0]; // YYYY-MM-DD format

        // Find commission data for this date
        const dayCommissionData = commissionData.filter(order =>
          order.created_at.split('T')[0] === dateStr
        );

        const dayCommission = dayCommissionData.reduce((sum, order) =>
          sum + parseFloat(order.commission_amount), 0
        );

        trends.push({
          date: dateStr,
          commission: parseFloat(dayCommission.toFixed(2)),
          orders: dayCommissionData.length
        });

        // Move to next day
        currentDate.setDate(currentDate.getDate() + 1);
      }

      return {
        totalCommission: parseFloat(totalCommission.toFixed(2)),
        totalOrders,
        averageCommissionRate: parseFloat(averageCommissionRate.toFixed(2)),
        breakdown,
        trends
      };

    } catch (error) {
      console.error('Error getting commission reports:', error);
      throw error;
    }
  }
};

module.exports = commissionService;