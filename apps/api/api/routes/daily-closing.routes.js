// =====================================================
// DAILY CLOSING ROUTES
// SW-78 FO-115: Quebec WEB-SRM Daily Closing Receipts (FER)
// =====================================================

const express = require('express');
const dailyClosingController = require('../controllers/daily-closing.controller');
const { requireAuthWithBranch } = require('../middleware/auth.middleware');

const router = express.Router();

// List daily closings with filtering and pagination
router.get('/', requireAuthWithBranch, dailyClosingController.getDailyClosings);

// Get daily summary for a specific date
router.get('/summary/:date', requireAuthWithBranch, dailyClosingController.getDailySummary);

// Get detailed closing information
router.get('/:closingId', requireAuthWithBranch, dailyClosingController.getDailyClosingDetail);

// Start a new daily closing (draft status)
router.post('/start', requireAuthWithBranch, dailyClosingController.startDailyClosing);

// Cancel a daily closing (before completion)
router.patch('/:closingId/cancel', requireAuthWithBranch, dailyClosingController.cancelDailyClosing);

// Complete a daily closing and send to WEB-SRM
router.patch('/:closingId/complete', requireAuthWithBranch, dailyClosingController.completeDailyClosing);

module.exports = router;
