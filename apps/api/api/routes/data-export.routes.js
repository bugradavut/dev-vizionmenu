// =====================================================
// DATA EXPORT ROUTES
// Branch data export for compliance (FO-120)
// =====================================================

const router = require('express').Router();
const { requireAuthWithBranch } = require('../middleware/auth.middleware');
const dataExportController = require('../controllers/data-export.controller');

/**
 * GET /api/v1/data-export
 * Export all branch data as ZIP file
 * Requires authentication and branch context
 */
router.get('/', requireAuthWithBranch, dataExportController.exportBranchData);

module.exports = router;
