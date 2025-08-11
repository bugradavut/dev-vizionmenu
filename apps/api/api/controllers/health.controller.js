// =====================================================
// HEALTH CONTROLLER
// Simple health check endpoints for API monitoring
// =====================================================

/**
 * GET /
 * Root endpoint
 */
const getRoot = (req, res) => {
  res.json({
    message: 'Vision Menu API is running! 🚀',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'production',
    version: '1.0.0'
  });
};

/**
 * GET /health
 * Basic health check endpoint
 */
const getHealth = (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0',
    message: 'Backend API is healthy'
  });
};

/**
 * GET /api/v1/health  
 * API v1 health check
 */
const getApiV1Health = (req, res) => {
  res.json({ 
    status: 'ok', 
    api: 'v1',
    message: 'API v1 is working'
  });
};

module.exports = {
  getRoot,
  getHealth,
  getApiV1Health
};