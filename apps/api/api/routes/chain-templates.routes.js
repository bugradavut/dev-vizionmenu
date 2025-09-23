// =====================================================
// CHAIN TEMPLATES ROUTES
// Express routes for chain menu templates
// =====================================================

const express = require('express');
const router = express.Router();

const chainTemplatesController = require('../controllers/chain-templates.controller');
const { requireAuth } = require('../middleware/auth.middleware');

// Chain templates management routes (all protected with auth)
// GET /api/v1/chains/:chainId/templates - Get all templates for a chain
router.get('/:chainId/templates', requireAuth, chainTemplatesController.getChainTemplates);

// POST /api/v1/chains/:chainId/templates - Create custom template
router.post('/:chainId/templates', requireAuth, chainTemplatesController.createCustomTemplate);

// POST /api/v1/chains/:chainId/templates/from-category - Create template from existing category
router.post('/:chainId/templates/from-category', requireAuth, chainTemplatesController.createTemplateFromCategory);

// PUT /api/v1/chains/:chainId/templates/:templateId - Update template
router.put('/:chainId/templates/:templateId', requireAuth, chainTemplatesController.updateTemplate);

// DELETE /api/v1/chains/:chainId/templates/:templateId - Delete template
router.delete('/:chainId/templates/:templateId', requireAuth, chainTemplatesController.deleteTemplate);

// POST /api/v1/chains/:chainId/templates/:templateId/import - Import template to branch
router.post('/:chainId/templates/:templateId/import', requireAuth, chainTemplatesController.importTemplateToBranch);

module.exports = router;