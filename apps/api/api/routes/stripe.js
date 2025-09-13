// =====================================================
// STRIPE CONNECT ROUTES
// All Stripe Connect integration API routes
// =====================================================

const express = require('express');
const router = express.Router();
const stripeController = require('../controllers/stripe.controller');
const { requireAuth } = require('../middleware/auth.middleware');
const { requirePlatformAdmin } = require('../middleware/platform-admin.middleware');

// =====================================================
// WEBHOOK ENDPOINT (NO AUTH REQUIRED - STRIPE CALLS THIS)
// =====================================================

/**
 * @route   POST /api/v1/stripe/webhooks
 * @desc    Handle Stripe webhook events
 * @access  Public (Stripe webhook endpoint)
 */
router.post('/webhooks', 
  express.raw({ type: 'application/json' }), // Raw body for webhook verification
  stripeController.handleWebhook
);

// =====================================================
// PUBLIC PAYMENT ENDPOINTS (FOR CUSTOMER ORDERS)
// =====================================================

/**
 * @route   POST /api/v1/stripe/payment-intents
 * @desc    Create payment intent with commission split (for customer checkout)
 * @access  Public (customer order flow)
 */
router.post('/payment-intents',
  stripeController.createPaymentIntent
);

/**
 * @route   POST /api/v1/stripe/payment-intents/:id/confirm
 * @desc    Confirm payment intent and log transaction
 * @access  Public (customer order flow)
 */
router.post('/payment-intents/:id/confirm',
  stripeController.confirmPaymentIntent
);

/**
 * @route   GET /api/v1/stripe/payment-intents/:id/status
 * @desc    Get payment intent status
 * @access  Public (customer order flow)
 */
router.get('/payment-intents/:id/status',
  stripeController.getPaymentIntentStatus
);

// TEMPORARY: Move auth after test endpoint

// =====================================================
// STRIPE ACCOUNT MANAGEMENT
// =====================================================

/**
 * @route   GET /api/v1/stripe/accounts/my-accounts
 * @desc    Get current user's Stripe accounts
 * @access  Private (Restaurant users)
 */
router.get('/accounts/my-accounts',
  stripeController.getMyStripeAccounts
);

/**
 * @route   POST /api/v1/stripe/accounts/create
 * @desc    Create new Stripe Express account for restaurant
 * @access  Public (TEMPORARY FOR TESTING)
 */
router.post('/accounts/create',
  stripeController.createExpressAccount
);

// Apply authentication to all other Stripe routes
router.use(requireAuth);

/**
 * @route   GET /api/v1/stripe/accounts/status
 * @desc    Get Stripe account status for a given chain (chain-level)
 * @access  Private (Account owners, Platform admin)
 */
router.get('/accounts/status',
  stripeController.getAccountStatusByChain
);

/**
 * @route   GET /api/v1/stripe/accounts/:accountId/status
 * @desc    Get Stripe account status and verification requirements
 * @access  Private (Account owners, Platform admin)
 */
router.get('/accounts/:accountId/status',
  stripeController.getAccountStatus
);

/**
 * @route   POST /api/v1/stripe/accounts/:accountId/onboard
 * @desc    Create onboarding link for Express account setup
 * @access  Private (Account owners, Platform admin)
 */
router.post('/accounts/:accountId/onboard',
  stripeController.createOnboardingLink
);

/**
 * @route   GET /api/v1/stripe/accounts/:accountId/capabilities
 * @desc    Check account payment capabilities and readiness
 * @access  Private (Account owners, Platform admin)
 */
router.get('/accounts/:accountId/capabilities',
  stripeController.getAccountCapabilities
);

// =====================================================
// TRANSACTION MANAGEMENT & ANALYTICS
// =====================================================

/**
 * @route   GET /api/v1/stripe/transactions
 * @desc    Get transaction history with filtering
 * @access  Private (Restaurant users can see their transactions)
 */
router.get('/transactions',
  stripeController.getTransactions
);

/**
 * @route   GET /api/v1/stripe/analytics/summary
 * @desc    Get transaction analytics and revenue summary
 * @access  Private (Restaurant users can see their analytics)
 */
router.get('/analytics/summary',
  stripeController.getAnalyticsSummary
);

// =====================================================
// PLATFORM ADMIN ONLY ROUTES
// =====================================================

// Apply platform admin middleware to admin-only routes
router.use('/admin', requirePlatformAdmin);

/**
 * @route   GET /api/v1/stripe/admin/accounts
 * @desc    Get all Stripe accounts (platform admin only)
 * @access  Private (Platform admin only)
 */
router.get('/admin/accounts', async (req, res) => {
  try {
    const { supabase } = require('../config/supabase');
    const { page = 1, limit = 50, status } = req.query;

    let query = supabase
      .from('stripe_accounts')
      .select(`
        *,
        restaurant_chains:restaurant_chain_id(id, name, slug),
        branches:branch_id(id, name, slug)
      `)
      .order('created_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    if (status) {
      query = query.eq('onboarding_status', status);
    }

    const { data: accounts, error } = await query;

    if (error) {
      throw new Error(error.message);
    }

    res.json({
      success: true,
      data: {
        accounts: accounts || [],
        page: parseInt(page),
        limit: parseInt(limit)
      }
    });

  } catch (error) {
    console.error('❌ Error getting admin accounts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get accounts',
      message: error.message
    });
  }
});

/**
 * @route   GET /api/v1/stripe/admin/transactions
 * @desc    Get all transactions (platform admin only)
 * @access  Private (Platform admin only)
 */
router.get('/admin/transactions', async (req, res) => {
  try {
    const { supabase } = require('../config/supabase');
    const { 
      page = 1, 
      limit = 100, 
      status, 
      start_date, 
      end_date 
    } = req.query;

    let query = supabase
      .from('stripe_transactions')
      .select(`
        *,
        orders:order_id(id, customer_name, total_amount, order_source),
        stripe_accounts(
          stripe_account_id,
          restaurant_chains:restaurant_chain_id(name),
          branches:branch_id(name)
        )
      `)
      .order('created_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    // Apply filters
    if (status) {
      query = query.eq('status', status);
    }
    if (start_date) {
      query = query.gte('created_at', start_date);
    }
    if (end_date) {
      query = query.lte('created_at', end_date);
    }

    const { data: transactions, error } = await query;

    if (error) {
      throw new Error(error.message);
    }

    res.json({
      success: true,
      data: {
        transactions: transactions || [],
        page: parseInt(page),
        limit: parseInt(limit)
      }
    });

  } catch (error) {
    console.error('❌ Error getting admin transactions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get transactions',
      message: error.message
    });
  }
});

/**
 * @route   GET /api/v1/stripe/admin/analytics/platform
 * @desc    Get platform-wide Stripe analytics (commission revenue, etc.)
 * @access  Private (Platform admin only)
 */
router.get('/admin/analytics/platform', async (req, res) => {
  try {
    const { supabase } = require('../config/supabase');
    const { 
      start_date = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      end_date = new Date().toISOString()
    } = req.query;

    // Get platform commission revenue from Stripe transactions
    const { data: transactions, error } = await supabase
      .from('stripe_transactions')
      .select('gross_amount, commission_amount, status, created_at')
      .eq('status', 'succeeded')
      .gte('created_at', start_date)
      .lte('created_at', end_date);

    if (error) {
      throw new Error(error.message);
    }

    const analytics = transactions?.reduce((acc, tx) => {
      const revenue = parseFloat(tx.gross_amount || 0);
      const commission = parseFloat(tx.commission_amount || 0);
      
      acc.total_order_value += revenue;
      acc.total_commission_earned += commission;
      acc.total_restaurant_payout += (revenue - commission);
      acc.transaction_count++;
      
      return acc;
    }, {
      total_order_value: 0,
      total_commission_earned: 0,
      total_restaurant_payout: 0,
      transaction_count: 0
    }) || {
      total_order_value: 0,
      total_commission_earned: 0, 
      total_restaurant_payout: 0,
      transaction_count: 0
    };

    // Calculate additional metrics
    analytics.average_order_value = analytics.transaction_count > 0 
      ? analytics.total_order_value / analytics.transaction_count 
      : 0;
    
    analytics.average_commission_rate = analytics.total_order_value > 0
      ? (analytics.total_commission_earned / analytics.total_order_value) * 100
      : 0;

    res.json({
      success: true,
      data: {
        period: { start_date, end_date },
        analytics
      }
    });

  } catch (error) {
    console.error('❌ Error getting platform analytics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get platform analytics',
      message: error.message
    });
  }
});

module.exports = router;
