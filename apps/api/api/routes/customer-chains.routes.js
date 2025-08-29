const express = require('express');
const customerChainsController = require('../controllers/customer-chains.controller');

const router = express.Router();

// Public endpoints - no authentication required for customer ordering
router.get('/:slug', customerChainsController.getChainBySlug);
router.get('/:slug/branches', customerChainsController.getChainBranches);
router.get('/:slug/branches/location', customerChainsController.getBranchesByLocation);
router.get('/:slug/branches/address', customerChainsController.getBranchesByAddress);
router.get('/:slug/branches/city', customerChainsController.getBranchesByCity);
router.post('/:slug/delivery/validate', customerChainsController.validateDeliveryAddress);
router.get('/branch/:branchId/chain', customerChainsController.getChainByBranchId);
router.get('/branch/:branchId/settings', customerChainsController.getBranchSettings);

module.exports = router;