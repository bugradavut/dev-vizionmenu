// =====================================================
// DATA EXPORT CONTROLLER
// FO-120: Export operator data for compliance
// =====================================================

const dataExportService = require('../services/data-export.service');
const { handleControllerError } = require('../helpers/error-handler');
const { logActivity } = require('../helpers/audit-logger');

/**
 * GET /api/v1/data-export
 * Export complete branch data as ZIP file
 * For FO-120 compliance: operator data copy
 */
const exportBranchData = async (req, res) => {
  try {
    const userBranch = req.userBranch;
    const currentUserId = req.currentUserId;

    if (!userBranch || !userBranch.branch_id) {
      return res.status(403).json({
        error: {
          code: 'ACCESS_DENIED',
          message: 'Branch context required for data export'
        }
      });
    }

    const branchId = userBranch.branch_id;

    // Generate ZIP file with all branch data
    const zipBuffer = await dataExportService.generateDataExportZip(branchId);

    // Log the export activity for audit trail
    await logActivity({
      req,
      action: 'export',
      entity: 'branch_data',
      entityId: branchId,
      entityName: 'Data Export',
      branchId: branchId,
    });

    // Generate filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
    const filename = `branch-data-export-${timestamp}.zip`;

    // Send ZIP file as download
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', zipBuffer.length);

    res.send(zipBuffer);

  } catch (error) {
    console.error('Data export error:', error);
    handleControllerError(error, 'export branch data', res);
  }
};

module.exports = {
  exportBranchData,
};
