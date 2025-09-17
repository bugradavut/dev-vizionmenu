// =====================================================
// COMMISSION MANAGEMENT CONTROLLER
// All commission-related API endpoints
// =====================================================

const commissionService = require('../services/commission.service');
const { requireAuth } = require('../middleware/auth.middleware');
const { requirePlatformAdmin } = require('../middleware/platform-admin.middleware');

/**
 * Get default commission rates for all source types
 * GET /api/v1/commission/defaults
 */
async function getDefaultRates(req, res) {
  try {
    console.log('📊 Getting default commission rates...');
    
    const rates = await commissionService.getDefaultRates();
    
    res.json({
      success: true,
      data: {
        rates: rates
      }
    });
    
  } catch (error) {
    console.error('❌ Error getting default rates:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch default commission rates',
      message: error.message
    });
  }
}

/**
 * Update default commission rate for a source type
 * PUT /api/v1/commission/defaults/:sourceType
 */
async function updateDefaultRate(req, res) {
  try {
    const { sourceType } = req.params;
    const { rate } = req.body;
    
    console.log(`📊 Updating default rate for ${sourceType} to ${rate}%`);
    
    // Validation
    if (!sourceType || rate === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Source type and rate are required'
      });
    }
    
    if (rate < 0 || rate > 100) {
      return res.status(400).json({
        success: false,
        error: 'Rate must be between 0 and 100'
      });
    }
    
    const updatedRate = await commissionService.updateDefaultRate(sourceType, rate);
    
    res.json({
      success: true,
      data: {
        rate: updatedRate
      },
      message: `Default rate updated for ${sourceType}`
    });
    
  } catch (error) {
    console.error('❌ Error updating default rate:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update default commission rate',
      message: error.message
    });
  }
}

/**
 * Get chain-specific commission settings
 * GET /api/v1/commission/settings/:chainId
 */
async function getChainSettings(req, res) {
  try {
    const { chainId } = req.params;
    
    console.log(`📊 Getting commission settings for chain: ${chainId}`);
    
    // Get chain-specific rates (if any)
    const chainSettings = await commissionService.getChainSettings(chainId);
    
    // Get default rates as fallback
    const defaultRates = await commissionService.getDefaultRates();
    
    // Combine results
    const settings = defaultRates.map(defaultRate => {
      const chainOverride = chainSettings.find(setting => 
        setting.source_type === defaultRate.source_type
      );
      
      return {
        source_type: defaultRate.source_type,
        default_rate: parseFloat(defaultRate.default_rate),
        chain_rate: chainOverride ? parseFloat(chainOverride.commission_rate) : null,
        effective_rate: chainOverride ? parseFloat(chainOverride.commission_rate) : parseFloat(defaultRate.default_rate),
        has_override: !!chainOverride,
        is_active: chainOverride ? chainOverride.is_active : true
      };
    });
    
    res.json({
      success: true,
      data: {
        chainId: chainId,
        settings: settings
      }
    });
    
  } catch (error) {
    console.error('❌ Error getting chain settings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch chain commission settings',
      message: error.message
    });
  }
}

/**
 * Set or update chain-specific commission rate
 * PUT /api/v1/commission/settings/:chainId/:sourceType
 */
async function setChainRate(req, res) {
  try {
    const { chainId, sourceType } = req.params;
    const { rate } = req.body;
    
    console.log(`📊 Setting chain rate for ${chainId}/${sourceType} to ${rate}%`);
    
    // Validation
    if (!chainId || !sourceType || rate === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Chain ID, source type, and rate are required'
      });
    }
    
    if (rate < 0 || rate > 100) {
      return res.status(400).json({
        success: false,
        error: 'Rate must be between 0 and 100'
      });
    }
    
    // Set the rate (this will upsert)
    const result = await commissionService.setChainRate(chainId, sourceType, rate);
    
    res.json({
      success: true,
      data: {
        setting: result
      },
      message: `Chain-specific rate set for ${sourceType}`
    });
    
  } catch (error) {
    console.error('❌ Error setting chain rate:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to set chain commission rate',
      message: error.message
    });
  }
}

/**
 * Remove chain-specific override (revert to default)
 * DELETE /api/v1/commission/settings/:chainId/:sourceType
 */
async function removeChainOverride(req, res) {
  try {
    const { chainId, sourceType } = req.params;
    
    console.log(`📊 Removing chain override for ${chainId}/${sourceType}`);
    
    // Remove the override by setting is_active to false
    await commissionService.removeChainOverride(chainId, sourceType);
    
    res.json({
      success: true,
      message: `Chain override removed for ${sourceType}, now using default rate`
    });
    
  } catch (error) {
    console.error('❌ Error removing chain override:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to remove chain override',
      message: error.message
    });
  }
}

/**
 * Get commission summary/statistics
 * GET /api/v1/commission/summary
 */
async function getCommissionSummary(req, res) {
  try {
    const { dateRange = '7d' } = req.query;
    
    console.log(`📊 Getting commission summary for ${dateRange}`);
    
    const summary = await commissionService.getCommissionSummary(dateRange);
    
    res.json({
      success: true,
      data: {
        dateRange: dateRange,
        summary: summary
      }
    });
    
  } catch (error) {
    console.error('❌ Error getting commission summary:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch commission summary',
      message: error.message
    });
  }
}

/**
 * Bulk update multiple chain rates
 * POST /api/v1/commission/settings/:chainId/bulk
 */
async function bulkUpdateChainRates(req, res) {
  try {
    const { chainId } = req.params;
    const { rates } = req.body; // Array of { sourceType, rate }
    
    console.log(`📊 Bulk updating rates for chain: ${chainId}`, rates);
    
    // Validation
    if (!chainId || !Array.isArray(rates)) {
      return res.status(400).json({
        success: false,
        error: 'Chain ID and rates array are required'
      });
    }
    
    // Validate each rate
    for (const rateConfig of rates) {
      if (!rateConfig.sourceType || rateConfig.rate === undefined) {
        return res.status(400).json({
          success: false,
          error: 'Each rate config must have sourceType and rate'
        });
      }
      
      if (rateConfig.rate < 0 || rateConfig.rate > 100) {
        return res.status(400).json({
          success: false,
          error: `Rate for ${rateConfig.sourceType} must be between 0 and 100`
        });
      }
    }
    
    // Update all rates
    const results = [];
    for (const rateConfig of rates) {
      try {
        const result = await commissionService.setChainRate(
          chainId, 
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
    
    const successCount = results.filter(r => r.success).length;
    
    res.json({
      success: successCount === rates.length,
      data: {
        updated: successCount,
        total: rates.length,
        results: results
      },
      message: `Updated ${successCount}/${rates.length} commission rates`
    });
    
  } catch (error) {
    console.error('❌ Error bulk updating chain rates:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to bulk update chain rates',
      message: error.message
    });
  }
}

// =====================================================
// BRANCH-SPECIFIC COMMISSION CONTROLLERS
// =====================================================

/**
 * Get branch-specific commission settings
 * GET /api/v1/commission/branch-settings/:branchId
 */
async function getBranchSettings(req, res) {
  try {
    const { branchId } = req.params;
    
    console.log(`📊 Getting commission settings for branch: ${branchId}`);
    
    const settings = await commissionService.getBranchSettings(branchId);
    
    res.json({
      success: true,
      data: {
        branchId: branchId,
        settings: settings
      }
    });
    
  } catch (error) {
    console.error('❌ Error getting branch settings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch branch commission settings',
      message: error.message
    });
  }
}

/**
 * Set or update branch-specific commission rate
 * PUT /api/v1/commission/branch-settings/:branchId/:sourceType
 */
async function setBranchRate(req, res) {
  try {
    const { branchId, sourceType } = req.params;
    const { rate } = req.body;
    
    console.log(`📊 Setting branch rate for ${branchId}/${sourceType} to ${rate}%`);
    
    // Validation
    if (!branchId || !sourceType || rate === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Branch ID, source type, and rate are required'
      });
    }
    
    if (rate < 0 || rate > 100) {
      return res.status(400).json({
        success: false,
        error: 'Rate must be between 0 and 100'
      });
    }
    
    // Set the rate (this will upsert)
    const result = await commissionService.setBranchRate(branchId, sourceType, rate);
    
    res.json({
      success: true,
      data: {
        setting: result
      },
      message: `Branch-specific rate set for ${sourceType}`
    });
    
  } catch (error) {
    console.error('❌ Error setting branch rate:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to set branch commission rate',
      message: error.message
    });
  }
}

/**
 * Remove branch-specific override (revert to chain/default)
 * DELETE /api/v1/commission/branch-settings/:branchId/:sourceType
 */
async function removeBranchOverride(req, res) {
  try {
    const { branchId, sourceType } = req.params;
    
    console.log(`📊 Removing branch override for ${branchId}/${sourceType}`);
    
    await commissionService.removeBranchOverride(branchId, sourceType);
    
    res.json({
      success: true,
      message: `Branch override removed for ${sourceType}, now using chain/default rate`
    });
    
  } catch (error) {
    console.error('❌ Error removing branch override:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to remove branch override',
      message: error.message
    });
  }
}

/**
 * Bulk update multiple branch rates
 * POST /api/v1/commission/branch-settings/:branchId/bulk
 */
async function bulkUpdateBranchRates(req, res) {
  try {
    const { branchId } = req.params;
    const { rates } = req.body; // Array of { sourceType, rate }
    
    console.log(`📊 Bulk updating rates for branch: ${branchId}`, rates);
    
    // Validation
    if (!branchId || !Array.isArray(rates)) {
      return res.status(400).json({
        success: false,
        error: 'Branch ID and rates array are required'
      });
    }
    
    // Validate each rate
    for (const rateConfig of rates) {
      if (!rateConfig.sourceType || rateConfig.rate === undefined) {
        return res.status(400).json({
          success: false,
          error: 'Each rate config must have sourceType and rate'
        });
      }
      
      if (rateConfig.rate < 0 || rateConfig.rate > 100) {
        return res.status(400).json({
          success: false,
          error: `Rate for ${rateConfig.sourceType} must be between 0 and 100`
        });
      }
    }
    
    // Update all rates
    const results = await commissionService.bulkUpdateBranchRates(branchId, rates);
    const successCount = results.filter(r => r.success).length;
    
    res.json({
      success: successCount === rates.length,
      data: {
        updated: successCount,
        total: rates.length,
        results: results
      },
      message: `Updated ${successCount}/${rates.length} branch commission rates`
    });
    
  } catch (error) {
    console.error('❌ Error bulk updating branch rates:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to bulk update branch rates',
      message: error.message
    });
  }
}

/**
 * Get commission reports data for admin dashboard
 * GET /api/v1/commission/reports
 * Supports query params: period, dateRange, startDate, endDate
 */
async function getCommissionReports(req, res) {
  try {
    const {
      dateRange,
      period,
      startDate,
      endDate
    } = req.query;

    // Build params object (analytics-style)
    const params = {};

    if (startDate && endDate) {
      params.startDate = startDate;
      params.endDate = endDate;
      console.log(`📊 Getting commission reports for custom range: ${startDate} to ${endDate}`);
    } else if (period) {
      params.period = period;
      console.log(`📊 Getting commission reports for period: ${period}`);
    } else if (dateRange) {
      params.period = dateRange; // Backward compatibility
      console.log(`📊 Getting commission reports for dateRange: ${dateRange}`);
    } else {
      params.period = '30d'; // Default
      console.log(`📊 Getting commission reports for default period: 30d`);
    }

    const reports = await commissionService.getCommissionReports(params);

    res.json({
      success: true,
      data: reports
    });

  } catch (error) {
    console.error('❌ Error getting commission reports:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch commission reports',
      message: error.message
    });
  }
}

/**
 * Calculate commission for an order
 * POST /api/v1/commission/calculate
 */
async function calculateCommission(req, res) {
  try {
    const { orderTotal, branchId, sourceType } = req.body;
    
    // Validate required fields
    if (!orderTotal || !branchId || !sourceType) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: 'orderTotal, branchId, and sourceType are required'
      });
    }
    
    // Validate order total
    if (orderTotal <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid order total',
        message: 'Order total must be greater than 0'
      });
    }
    
    console.log(`📊 Calculating commission for order: ${orderTotal} CAD, branch: ${branchId}, source: ${sourceType}`);
    
    const commissionData = await commissionService.calculateCommission(orderTotal, branchId, sourceType);
    
    res.json({
      success: true,
      data: commissionData
    });
    
  } catch (error) {
    console.error('❌ Error calculating commission:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to calculate commission',
      message: error.message
    });
  }
}

module.exports = {
  getDefaultRates,
  updateDefaultRate,
  getChainSettings,
  setChainRate,
  removeChainOverride,
  getCommissionSummary,
  getCommissionReports,
  bulkUpdateChainRates,
  getBranchSettings,
  setBranchRate,
  removeBranchOverride,
  bulkUpdateBranchRates,
  calculateCommission
};