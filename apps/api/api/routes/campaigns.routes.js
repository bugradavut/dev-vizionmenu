const express = require('express');
const campaignsController = require('../controllers/campaigns.controller');
const { requireAuth, requireAuthWithBranch } = require('../middleware/auth.middleware');

const router = express.Router();

// Admin routes (require authentication and branch context)
router.get('/', requireAuthWithBranch, campaignsController.getCampaigns);
router.get('/:id', requireAuthWithBranch, campaignsController.getCampaignById);
router.post('/', requireAuthWithBranch, campaignsController.createCampaign);
router.put('/:id', requireAuthWithBranch, campaignsController.updateCampaign);
router.patch('/:id', requireAuthWithBranch, campaignsController.updateCampaign);
router.delete('/:id', requireAuthWithBranch, campaignsController.deleteCampaign);

// Public route for campaign validation (no auth required - for customer orders)
router.post('/validate', campaignsController.validateCampaignCode);

module.exports = router;