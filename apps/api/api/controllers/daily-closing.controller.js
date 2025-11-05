// =====================================================
// DAILY CLOSING CONTROLLER
// SW-78 FO-115: Quebec WEB-SRM Daily Closing Receipts (FER)
// =====================================================

const dailyClosingService = require('../services/daily-closing.service');
const { handleControllerError } = require('../helpers/error-handler');
const { logActivity } = require('../helpers/audit-logger');

/**
 * GET /api/v1/daily-closings
 * List daily closings with filtering and pagination
 */
const getDailyClosings = async (req, res) => {
  try {
    const filters = req.query;
    const userBranch = req.userBranch;

    const result = await dailyClosingService.getDailyClosings(filters, userBranch);
    res.json(result);

  } catch (error) {
    handleControllerError(error, 'fetch daily closings', res);
  }
};

/**
 * GET /api/v1/daily-closings/summary/:date
 * Get daily summary for a specific date
 */
const getDailySummary = async (req, res) => {
  try {
    const { date } = req.params;
    const userBranch = req.userBranch;

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'Valid date is required (YYYY-MM-DD)' }
      });
    }

    const summary = await dailyClosingService.getDailySummary(userBranch.branch_id, date);
    res.json({ data: summary });

  } catch (error) {
    handleControllerError(error, 'fetch daily summary', res);
  }
};

/**
 * GET /api/v1/daily-closings/:closingId
 * Get detailed closing information
 */
const getDailyClosingDetail = async (req, res) => {
  try {
    const { closingId } = req.params;

    if (!closingId) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'Closing ID is required' }
      });
    }

    const closing = await dailyClosingService.getDailyClosingById(closingId);
    res.json({ data: closing });

  } catch (error) {
    handleControllerError(error, 'fetch closing details', res);
  }
};

/**
 * POST /api/v1/daily-closings/start
 * Start a new daily closing (draft status)
 */
const startDailyClosing = async (req, res) => {
  try {
    const { date } = req.body;
    const userBranch = req.userBranch;
    const currentUserId = req.currentUserId;

    // Validation
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'Valid date is required (YYYY-MM-DD)' }
      });
    }

    // Start closing
    const closing = await dailyClosingService.startDailyClosing(
      userBranch.branch_id,
      date,
      currentUserId
    );

    // Log activity
    await logActivity(currentUserId, userBranch.branch_id, 'daily_closing_started', {
      closing_id: closing.id,
      closing_date: date,
      net_sales: closing.net_sales,
    });

    res.status(201).json({
      success: true,
      data: closing,
      message: 'Daily closing started successfully'
    });

  } catch (error) {
    handleControllerError(error, 'start daily closing', res);
  }
};

/**
 * PATCH /api/v1/daily-closings/:closingId/cancel
 * Cancel a daily closing (before completion)
 */
const cancelDailyClosing = async (req, res) => {
  try {
    const { closingId } = req.params;
    const { reason } = req.body;
    const currentUserId = req.currentUserId;
    const userBranch = req.userBranch;

    if (!closingId) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'Closing ID is required' }
      });
    }

    // Cancel closing
    const closing = await dailyClosingService.cancelDailyClosing(
      closingId,
      reason,
      currentUserId
    );

    // Log activity - CRITICAL for SW-78 FO-115 Step 2 compliance
    await logActivity(currentUserId, userBranch.branch_id, 'daily_closing_cancelled', {
      closing_id: closingId,
      closing_date: closing.closing_date,
      cancellation_reason: reason || 'No reason provided',
      cancelled_at: closing.cancelled_at,
    });

    res.json({
      success: true,
      data: closing,
      message: 'Daily closing cancelled successfully'
    });

  } catch (error) {
    handleControllerError(error, 'cancel daily closing', res);
  }
};

/**
 * PATCH /api/v1/daily-closings/:closingId/complete
 * Complete a daily closing and send to WEB-SRM
 */
const completeDailyClosing = async (req, res) => {
  try {
    const { closingId } = req.params;
    const currentUserId = req.currentUserId;
    const userBranch = req.userBranch;

    if (!closingId) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'Closing ID is required' }
      });
    }

    // Complete closing
    const closing = await dailyClosingService.completeDailyClosing(closingId);

    // Log activity
    await logActivity(currentUserId, userBranch.branch_id, 'daily_closing_completed', {
      closing_id: closingId,
      closing_date: closing.closing_date,
      net_sales: closing.net_sales,
      websrm_transaction_id: closing.websrm_transaction_id,
    });

    res.json({
      success: true,
      data: closing,
      message: 'Daily closing completed successfully'
    });

  } catch (error) {
    handleControllerError(error, 'complete daily closing', res);
  }
};

module.exports = {
  getDailyClosings,
  getDailySummary,
  getDailyClosingDetail,
  startDailyClosing,
  cancelDailyClosing,
  completeDailyClosing,
};
