const express = require('express');
const customerChainsController = require('../controllers/customer-chains.controller');

const router = express.Router();

// Public endpoints - no authentication required for customer ordering
router.get('/:slug', customerChainsController.getChainBySlug);
router.get('/:slug/branches', customerChainsController.getChainBranches);
router.get('/branch/:branchId/chain', customerChainsController.getChainByBranchId);

module.exports = router;