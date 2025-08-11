// =====================================================
// HEALTH ROUTES
// Route definitions for health check endpoints
// =====================================================

const express = require('express');
const healthController = require('../controllers/health.controller');

const router = express.Router();

// Root endpoint
router.get('/', healthController.getRoot);

// Basic health check
router.get('/health', healthController.getHealth);

// API v1 health check  
router.get('/api/v1/health', healthController.getApiV1Health);

module.exports = router;