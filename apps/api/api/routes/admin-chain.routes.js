// =====================================================
// ADMIN CHAIN ROUTES
// Routes for platform admin chain management
// =====================================================

const express = require('express');
const controller = require('../controllers/admin-chain.controller');
const { requireAuth } = require('../middleware/auth.middleware');
const { requirePlatformAdmin } = require('../middleware/platform-admin.middleware');

const router = express.Router();

// All admin routes require authentication and platform admin access
router.use(requireAuth);
router.use(requirePlatformAdmin);

// Chain CRUD operations
router.post('/', controller.createChain);
router.get('/', controller.getAllChains);
router.get('/:id', controller.getChainById);
router.put('/:id', controller.updateChain);
router.delete('/:id', controller.deleteChain);


module.exports = router;