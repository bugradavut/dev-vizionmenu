const { handleControllerError } = require('../helpers/error-handler');
const campaignsService = require('../services/campaigns.service');

/**
 * Get all campaigns for authenticated user's branch
 */
const getCampaigns = async (req, res) => {
  try {
    const userBranch = req.userBranch;
    const { page = 1, limit = 50, isActive } = req.query;

    if (!userBranch || !userBranch.branch_id) {
      return res.status(400).json({
        error: { code: 'MISSING_BRANCH_CONTEXT', message: 'Branch context is required' }
      });
    }

    const filters = {};
    if (isActive !== undefined) {
      filters.isActive = isActive === 'true';
    }

    const result = await campaignsService.getCampaigns(userBranch.branch_id, {
      page: parseInt(page),
      limit: parseInt(limit),
      ...filters
    });

    res.json({ data: result });
  } catch (error) {
    handleControllerError(error, 'get campaigns', res);
  }
};

/**
 * Get campaign by ID
 */
const getCampaignById = async (req, res) => {
  try {
    const { id } = req.params;
    const userBranch = req.userBranch;

    if (!userBranch || !userBranch.branch_id) {
      return res.status(400).json({
        error: { code: 'MISSING_BRANCH_CONTEXT', message: 'Branch context is required' }
      });
    }

    const campaign = await campaignsService.getCampaignById(id, userBranch.branch_id);
    res.json({ data: campaign });
  } catch (error) {
    handleControllerError(error, 'get campaign by ID', res);
  }
};

/**
 * Create new campaign
 */
const createCampaign = async (req, res) => {
  try {
    const userBranch = req.userBranch;
    const campaignData = req.body;

    if (!userBranch || !userBranch.branch_id) {
      return res.status(400).json({
        error: { code: 'MISSING_BRANCH_CONTEXT', message: 'Branch context is required' }
      });
    }

    const campaign = await campaignsService.createCampaign(userBranch.branch_id, campaignData, userBranch.user_id);
    res.status(201).json({ 
      data: campaign,
      message: 'Campaign created successfully'
    });
  } catch (error) {
    handleControllerError(error, 'create campaign', res);
  }
};

/**
 * Update campaign
 */
const updateCampaign = async (req, res) => {
  try {
    const { id } = req.params;
    const userBranch = req.userBranch;
    const updateData = req.body;

    console.log('Update campaign request:', { id, updateData, branchId: userBranch?.branch_id });

    if (!userBranch || !userBranch.branch_id) {
      return res.status(400).json({
        error: { code: 'MISSING_BRANCH_CONTEXT', message: 'Branch context is required' }
      });
    }

    const campaign = await campaignsService.updateCampaign(id, userBranch.branch_id, updateData);
    res.json({ 
      data: campaign,
      message: 'Campaign updated successfully'
    });
  } catch (error) {
    handleControllerError(error, 'update campaign', res);
  }
};

/**
 * Delete campaign
 */
const deleteCampaign = async (req, res) => {
  try {
    const { id } = req.params;
    const userBranch = req.userBranch;

    if (!userBranch || !userBranch.branch_id) {
      return res.status(400).json({
        error: { code: 'MISSING_BRANCH_CONTEXT', message: 'Branch context is required' }
      });
    }

    const result = await campaignsService.deleteCampaign(id, userBranch.branch_id);
    res.json(result);
  } catch (error) {
    handleControllerError(error, 'delete campaign', res);
  }
};

/**
 * Validate campaign code (for customer orders)
 */
const validateCampaignCode = async (req, res) => {
  try {
    const { code, branchId, orderTotal, categories } = req.body;

    if (!code || !branchId || orderTotal === undefined) {
      return res.status(400).json({
        error: {
          code: 'MISSING_REQUIRED_FIELDS',
          message: 'Missing required fields: code, branchId, orderTotal'
        }
      });
    }

    const result = await campaignsService.validateCampaignCode(
      code, 
      branchId, 
      parseFloat(orderTotal),
      categories || []
    );

    if (result.isValid) {
      res.json({ data: result });
    } else {
      res.status(400).json({
        error: {
          code: 'INVALID_CAMPAIGN_CODE',
          message: result.message
        }
      });
    }
  } catch (error) {
    handleControllerError(error, 'validate campaign code', res);
  }
};

module.exports = {
  getCampaigns,
  getCampaignById,
  createCampaign,
  updateCampaign,
  deleteCampaign,
  validateCampaignCode
};