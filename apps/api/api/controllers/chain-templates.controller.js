// =====================================================
// CHAIN TEMPLATES CONTROLLER
// HTTP request handlers for chain menu templates
// =====================================================

const chainTemplatesService = require('../services/chain-templates.service');
const { getUserBranchContext } = require('../helpers/auth');

/**
 * Get all templates for a chain
 * GET /api/v1/chains/:chainId/templates
 */
async function getChainTemplates(req, res) {
  try {
    const { chainId } = req.params;
    const { template_type } = req.query;

    // Authorization: Check if user has access to this chain
    // Branch managers can view templates from their chain (for import purposes)
    const userContext = await getUserBranchContext(req, res);
    if (!userContext) {
      return; // getUserBranchContext already sent error response
    }
    if (!userContext.isPlatformAdmin && userContext.chainId !== chainId) {
      return res.status(403).json({
        type: 'chain_access_denied',
        title: 'Access Denied',
        status: 403,
        detail: 'You can only view templates for your own chain.'
      });
    }

    const result = await chainTemplatesService.getChainTemplates(chainId, {
      template_type
    });

    res.json({
      data: result.data,
      meta: result.meta
    });
  } catch (error) {
    console.error('Get chain templates error:', error);
    res.status(500).json({
      type: 'fetch_templates_failed',
      title: 'Failed to fetch templates',
      status: 500,
      detail: error.message
    });
  }
}

/**
 * Create template from existing category
 * POST /api/v1/chains/:chainId/templates/from-category
 */
async function createTemplateFromCategory(req, res) {
  try {
    const { chainId } = req.params;
    const { category_id, name, description } = req.body;

    if (!category_id) {
      return res.status(400).json({
        type: 'missing_category_id',
        title: 'Missing Category ID',
        status: 400,
        detail: 'Category ID is required'
      });
    }

    // TODO: Add authorization check

    const result = await chainTemplatesService.createTemplateFromCategory(
      chainId,
      category_id,
      { name, description }
    );

    res.status(201).json({
      data: result
    });
  } catch (error) {
    console.error('Create template from category error:', error);
    res.status(500).json({
      type: 'create_template_failed',
      title: 'Failed to create template',
      status: 500,
      detail: error.message
    });
  }
}

/**
 * Create custom template
 * POST /api/v1/chains/:chainId/templates
 */
async function createCustomTemplate(req, res) {
  try {
    const { chainId } = req.params;
    const templateData = req.body;

    if (!templateData.name) {
      return res.status(400).json({
        type: 'missing_template_name',
        title: 'Missing Template Name',
        status: 400,
        detail: 'Template name is required'
      });
    }

    // Authorization: Check if user has access to this chain
    const userContext = await getUserBranchContext(req, res);
    if (!userContext) {
      return; // getUserBranchContext already sent error response
    }
    if (!userContext.isPlatformAdmin && userContext.chainId !== chainId) {
      return res.status(403).json({
        type: 'chain_access_denied',
        title: 'Access Denied',
        status: 403,
        detail: 'You can only manage templates for your own chain.'
      });
    }

    const result = await chainTemplatesService.createCustomTemplate(chainId, templateData);

    res.status(201).json({
      data: result
    });
  } catch (error) {
    console.error('Create custom template error:', error);
    res.status(500).json({
      type: 'create_custom_template_failed',
      title: 'Failed to create custom template',
      status: 500,
      detail: error.message
    });
  }
}

/**
 * Update template
 * PUT /api/v1/chains/:chainId/templates/:templateId
 */
async function updateTemplate(req, res) {
  try {
    const { chainId, templateId } = req.params;
    const updateData = req.body;

    // TODO: Add authorization check

    const result = await chainTemplatesService.updateTemplate(templateId, chainId, updateData);

    res.json({
      data: result
    });
  } catch (error) {
    console.error('Update template error:', error);

    if (error.message.includes('not found') || error.message.includes('access denied')) {
      return res.status(404).json({
        type: 'template_not_found',
        title: 'Template Not Found',
        status: 404,
        detail: error.message
      });
    }

    res.status(500).json({
      type: 'update_template_failed',
      title: 'Failed to update template',
      status: 500,
      detail: error.message
    });
  }
}

/**
 * Delete template
 * DELETE /api/v1/chains/:chainId/templates/:templateId
 */
async function deleteTemplate(req, res) {
  try {
    const { chainId, templateId } = req.params;

    // TODO: Add authorization check

    const result = await chainTemplatesService.deleteTemplate(templateId, chainId);

    res.json({
      data: result
    });
  } catch (error) {
    console.error('Delete template error:', error);

    if (error.message.includes('not found') || error.message.includes('access denied')) {
      return res.status(404).json({
        type: 'template_not_found',
        title: 'Template Not Found',
        status: 404,
        detail: error.message
      });
    }

    res.status(500).json({
      type: 'delete_template_failed',
      title: 'Failed to delete template',
      status: 500,
      detail: error.message
    });
  }
}

/**
 * Import template to branch
 * POST /api/v1/chains/:chainId/templates/:templateId/import
 */
async function importTemplateToBranch(req, res) {
  try {
    const { chainId, templateId } = req.params;
    const { branch_id } = req.body;

    if (!branch_id) {
      return res.status(400).json({
        type: 'missing_branch_id',
        title: 'Missing Branch ID',
        status: 400,
        detail: 'Branch ID is required'
      });
    }

    // Authorization: Check if user has access to this chain and branch
    const userContext = await getUserBranchContext(req, res);
    if (!userContext) {
      return; // getUserBranchContext already sent error response
    }
    if (!userContext.isPlatformAdmin && userContext.chainId !== chainId) {
      return res.status(403).json({
        type: 'chain_access_denied',
        title: 'Access Denied',
        status: 403,
        detail: 'You can only import templates for your own chain.'
      });
    }

    // Check if user has access to the target branch
    if (!userContext.isPlatformAdmin && !userContext.isChainOwner && userContext.branchId !== branch_id) {
      return res.status(403).json({
        type: 'branch_access_denied',
        title: 'Access Denied',
        status: 403,
        detail: 'You can only import templates to your own branch.'
      });
    }

    const result = await chainTemplatesService.importTemplateToBranch(templateId, branch_id);

    if (result.success) {
      res.status(201).json({
        data: result
      });
    } else {
      res.status(400).json({
        data: result,
        error: {
          message: result.message,
          code: 'IMPORT_PARTIAL_FAILURE'
        }
      });
    }
  } catch (error) {
    console.error('Import template error:', error);

    if (error.message.includes('not found')) {
      return res.status(404).json({
        type: 'template_or_branch_not_found',
        title: 'Template or Branch Not Found',
        status: 404,
        detail: error.message
      });
    }

    res.status(500).json({
      type: 'import_template_failed',
      title: 'Failed to import template',
      status: 500,
      detail: error.message
    });
  }
}

module.exports = {
  getChainTemplates,
  createTemplateFromCategory,
  createCustomTemplate,
  updateTemplate,
  deleteTemplate,
  importTemplateToBranch
};