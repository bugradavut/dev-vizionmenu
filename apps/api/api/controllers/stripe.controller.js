// =====================================================
// STRIPE CONNECT CONTROLLER
// All Stripe Connect integration endpoints
// =====================================================

const stripeService = require('../services/stripe.service');
const { requireAuth } = require('../middleware/auth.middleware');
const { requirePlatformAdmin } = require('../middleware/platform-admin.middleware');
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ============================================
// EXPRESS ACCOUNT MANAGEMENT
// ============================================

/**
 * Create new Stripe Express Account for restaurant
 * POST /api/v1/stripe/accounts/create
 */
async function createExpressAccount(req, res) {
  try {
    const { 
      restaurant_chain_id, 
      branch_id, 
      business_type = 'company',
      business_url,
      business_profile = {}
    } = req.body;

    console.log('💳 Creating Stripe Express account...', {
      chain: restaurant_chain_id,
      branch: branch_id,
      type: business_type
    });

    // Validate input
    if (!restaurant_chain_id && !branch_id) {
      return res.status(400).json({
        success: false,
        error: 'Either restaurant_chain_id or branch_id is required'
      });
    }

    // Check if account already exists
    const { data: existingAccount } = await supabase
      .from('stripe_accounts')
      .select('*')
      .eq('restaurant_chain_id', restaurant_chain_id || null)
      .eq('branch_id', branch_id || null)
      .single();

    if (existingAccount) {
      return res.status(400).json({
        success: false,
        error: 'Stripe account already exists for this restaurant/branch'
      });
    }

    const result = await stripeService.createExpressAccount({
      restaurantChainId: restaurant_chain_id,
      branchId: branch_id,
      businessType: business_type,
      businessUrl: business_url,
      businessProfile: business_profile
    });

    res.json({
      success: true,
      data: {
        account: result.account,
        stripe_account_id: result.account.stripe_account_id,
        onboarding_required: true
      },
      message: 'Stripe Express account created successfully'
    });

  } catch (error) {
    console.error('❌ Error creating Express account:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create Stripe Express account',
      message: error.message
    });
  }
}

/**
 * Get Stripe account status and verification requirements
 * GET /api/v1/stripe/accounts/:accountId/status
 */
async function getAccountStatus(req, res) {
  try {
    const { accountId } = req.params;

    console.log('📊 Getting Stripe account status:', accountId);

    const status = await stripeService.getAccountStatus(accountId);

    res.json({
      success: true,
      data: status
    });

  } catch (error) {
    console.error('❌ Error getting account status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get account status',
      message: error.message
    });
  }
}

/**
 * Get Stripe account status by chainId (chain-level account)
 * GET /api/v1/stripe/accounts/status?chainId={chainId}
 */
async function getAccountStatusByChain(req, res) {
  try {
    const { chainId } = req.query;

    if (!chainId) {
      return res.status(400).json({
        success: false,
        error: 'chainId is required'
      });
    }

    // Find chain-level Stripe account (branch_id must be NULL)
    const { data: account, error: findError } = await supabase
      .from('stripe_accounts')
      .select('*')
      .eq('restaurant_chain_id', chainId)
      .is('branch_id', null)
      .single();

    if (findError && findError.code !== 'PGRST116') {
      // An unexpected error occurred
      throw new Error(findError.message);
    }

    if (!account) {
      return res.json({
        success: true,
        data: { hasAccount: false }
      });
    }

    // Retrieve latest status from Stripe
    const status = await stripeService.getAccountStatus(account.stripe_account_id);

    // Map to UI-friendly structure
    const onboardingStatus = status.onboarding_completed
      ? 'verified'
      : 'incomplete';

    // Requirements may be an object with arrays
    const requirements = Array.isArray(status.requirements)
      ? status.requirements
      : [
          ...(status.requirements?.currently_due || []),
          ...(status.requirements?.past_due || [])
        ];

    return res.json({
      success: true,
      data: {
        hasAccount: true,
        accountId: account.stripe_account_id,
        onboardingStatus,
        verificationStatus: status.verification_status || 'unverified',
        payoutsEnabled: !!status.payouts_enabled,
        chargesEnabled: !!status.charges_enabled,
        requirements,
        capabilities: status.capabilities
      }
    });

  } catch (error) {
    console.error('🚫 Error getting account status by chain:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get account status by chain',
      message: error.message
    });
  }
}

/**
 * Create onboarding link for Express Account setup
 * POST /api/v1/stripe/accounts/:accountId/onboard
 */
async function createOnboardingLink(req, res) {
  try {
    const { accountId } = req.params;
    const { refresh_url, return_url } = req.body;

    console.log('🔗 Creating onboarding link for account:', accountId);

    // Default URLs if not provided
    const refreshUrl = refresh_url || `${process.env.FRONTEND_URL}/settings/payments?refresh=true`;
    const returnUrl = return_url || `${process.env.FRONTEND_URL}/settings/payments?onboarding=complete`;

    const linkData = await stripeService.createOnboardingLink(accountId, refreshUrl, returnUrl);

    res.json({
      success: true,
      data: {
        onboarding_url: linkData.onboarding_url,
        expires_at: linkData.expires_at
      },
      message: 'Onboarding link created successfully'
    });

  } catch (error) {
    console.error('❌ Error creating onboarding link:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create onboarding link',
      message: error.message
    });
  }
}

/**
 * Check account payment capabilities
 * GET /api/v1/stripe/accounts/:accountId/capabilities
 */
async function getAccountCapabilities(req, res) {
  try {
    const { accountId } = req.params;

    console.log('🔍 Checking account capabilities:', accountId);

    const capabilities = await stripeService.verifyAccountCapabilities(accountId);

    res.json({
      success: true,
      data: capabilities
    });

  } catch (error) {
    console.error('❌ Error checking capabilities:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check account capabilities',
      message: error.message
    });
  }
}

/**
 * Get restaurant's Stripe accounts (for chain owners/branch managers)
 * GET /api/v1/stripe/accounts/my-accounts
 */
async function getMyStripeAccounts(req, res) {
  try {
    const user = req.user;

    console.log('📋 Getting user Stripe accounts for:', user.id);

    let query = supabase.from('stripe_accounts').select(`
      *,
      restaurant_chains:restaurant_chain_id(id, name, slug),
      branches:branch_id(id, name, slug)
    `);

    // Filter based on user role and access
    if (user.role === 'platform_admin') {
      // Platform admin can see all accounts
    } else if (user.role === 'chain_owner') {
      query = query.eq('restaurant_chain_id', user.chain_id);
    } else if (user.role === 'branch_manager' || user.role === 'branch_staff') {
      query = query.eq('branch_id', user.branch_id);
    } else {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    const { data: accounts, error } = await query;

    if (error) {
      throw new Error(error.message);
    }

    res.json({
      success: true,
      data: {
        accounts: accounts || []
      }
    });

  } catch (error) {
    console.error('❌ Error getting user accounts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get Stripe accounts',
      message: error.message
    });
  }
}

// ============================================
// PAYMENT PROCESSING
// ============================================

/**
 * Create Payment Intent with commission split
 * POST /api/v1/stripe/payment-intents/create
 */
async function createPaymentIntent(req, res) {
  try {
    const {
      amount,
      commission,
      orderId,
      branchId,
      customerEmail,
      orderSource,
      metadata = {}
    } = req.body;

    // Validation
    if (!amount || !commission || !orderId || !branchId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: amount, commission, orderId, branchId'
      });
    }

    // Get branch's Stripe account for commission split
    // First try by branch_id, then by restaurant_chain_id
    let { data: stripeAccount } = await supabase
      .from('stripe_accounts')
      .select('stripe_account_id, charges_enabled, payouts_enabled')
      .eq('branch_id', branchId)
      .maybeSingle();

    if (!stripeAccount) {
      // If no account found by branch_id, get branch's chain_id and try that
      const { data: branch } = await supabase
        .from('branches')
        .select('chain_id')
        .eq('id', branchId)
        .single();

      if (branch?.chain_id) {
        const { data: chainAccount } = await supabase
          .from('stripe_accounts')
          .select('stripe_account_id, charges_enabled, payouts_enabled')
          .eq('restaurant_chain_id', branch.chain_id)
          .maybeSingle();
        
        stripeAccount = chainAccount;
      }
    }

    let paymentIntent;

    // Log connected account status for debugging
    console.log('🔍 Connected account status:', {
      found: !!stripeAccount,
      accountId: stripeAccount?.stripe_account_id || 'none',
      chargesEnabled: stripeAccount?.charges_enabled || false,
      payoutsEnabled: stripeAccount?.payouts_enabled || false
    });

    if (stripeAccount?.charges_enabled && stripeAccount?.payouts_enabled) {
      // ✅ DIRECT CHARGE: Connected account pays Stripe fees, platform gets application fee
      console.log('💳 Creating DIRECT CHARGE payment intent with on_behalf_of...');
      console.log('   → Connected account will pay Stripe fees');
      console.log('   → Platform will receive application fee: $' + commission);

      paymentIntent = await stripeService.createPaymentIntentWithSplit({
        amount: parseFloat(amount),
        commissionAmount: parseFloat(commission),
        stripeAccountId: stripeAccount.stripe_account_id,
        orderId: orderId,
        metadata: {
          ...metadata,
          branchId,
          customerEmail,
          orderSource,
          commission: commission.toString(),
          charge_type: 'direct_charge'
        }
      });
    } else {
      // ⚠️ FALLBACK: Platform pays Stripe fees (Destination Charge)
      const reason = !stripeAccount
        ? 'no_connected_account'
        : !stripeAccount.charges_enabled
          ? 'charges_not_enabled'
          : 'payouts_not_enabled';

      console.log('⚠️  Fallback to DESTINATION CHARGE (platform pays Stripe fees)');
      console.log('   → Reason:', reason);
      console.log('   → Platform will pay Stripe fees (lower profit margin)');

      paymentIntent = await stripeService.createBasicPaymentIntent({
        amount: parseFloat(amount),
        orderId: orderId,
        metadata: {
          ...metadata,
          branchId,
          customerEmail,
          orderSource,
          commission: commission.toString(),
          fallback_reason: reason,
          charge_type: 'destination_charge_fallback'
        }
      });
    }

    // Return response format expected by frontend
    const response = {
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id || paymentIntent.payment_intent_id,
      amount: parseFloat(amount),
      commissionAmount: parseFloat(commission),
      netAmount: parseFloat(amount) - parseFloat(commission),
      connectedAccountId: stripeAccount?.stripe_account_id || null  // ✅ For frontend Direct Charge confirmation
    };

    // Add commission split info if available
    if (paymentIntent.commission_amount) {
      response.commissionSplit = {
        enabled: true,
        platformCommission: paymentIntent.commission_amount,
        restaurantNet: paymentIntent.net_amount,
        stripeAccountId: stripeAccount?.stripe_account_id
      };
    } else {
      response.commissionSplit = {
        enabled: false,
        reason: stripeAccount ? 'account_not_ready' : 'no_stripe_account'
      };
    }

    res.json(response);

  } catch (error) {
    console.error('❌ Error creating payment intent:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create payment intent',
      message: error.message
    });
  }
}

/**
 * Confirm Payment Intent (simulated for now)
 * POST /api/v1/stripe/payment-intents/:id/confirm
 */
async function confirmPaymentIntent(req, res) {
  try {
    const { id: paymentIntentId } = req.params;

    console.log('✅ Confirming payment intent:', paymentIntentId);

    // TODO: Implement actual Stripe payment confirmation
    // For now, simulate successful payment
    
    // Log transaction to database
    const { data: transactionData, error: transactionError } = await supabase
      .from('stripe_transactions')
      .insert({
        stripe_payment_intent_id: paymentIntentId,
        status: 'succeeded',
        processed_at: new Date().toISOString()
      })
      .select()
      .single();

    if (transactionError) {
      console.error('Error logging transaction:', transactionError);
    }

    res.json({
      success: true,
      paymentIntentId: paymentIntentId,
      transactionId: transactionData?.id || 'simulated'
    });

  } catch (error) {
    console.error('❌ Error confirming payment intent:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to confirm payment intent',
      message: error.message
    });
  }
}

/**
 * Get Payment Intent Status
 * GET /api/v1/stripe/payment-intents/:id/status
 */
async function getPaymentIntentStatus(req, res) {
  try {
    const { id: paymentIntentId } = req.params;

    console.log('📊 Getting payment intent status:', paymentIntentId);

    // TODO: Get actual status from Stripe
    // For now, return mock status
    res.json({
      id: paymentIntentId,
      status: 'succeeded',
      amount: 0,
      commission: 0,
      created: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error getting payment intent status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get payment intent status',
      message: error.message
    });
  }
}

// ============================================
// TRANSACTION MANAGEMENT
// ============================================

/**
 * Get transaction history for restaurant
 * GET /api/v1/stripe/transactions
 */
async function getTransactions(req, res) {
  try {
    const user = req.user;
    const { 
      page = 1, 
      limit = 50, 
      status, 
      start_date, 
      end_date 
    } = req.query;

    console.log('📊 Getting transaction history for user:', user.id);

    let query = supabase
      .from('stripe_transactions')
      .select(`
        *,
        orders:order_id(id, customer_name, total_amount, order_source),
        stripe_accounts!inner(
          stripe_account_id,
          restaurant_chains:restaurant_chain_id(name),
          branches:branch_id(name)
        )
      `)
      .order('created_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    // Filter based on user access
    if (user.role !== 'platform_admin') {
      if (user.role === 'chain_owner') {
        query = query.eq('stripe_accounts.restaurant_chain_id', user.chain_id);
      } else if (user.role === 'branch_manager' || user.role === 'branch_staff') {
        query = query.eq('stripe_accounts.branch_id', user.branch_id);
      }
    }

    // Additional filters
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
    console.error('❌ Error getting transactions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get transactions',
      message: error.message
    });
  }
}

/**
 * Get transaction analytics/summary
 * GET /api/v1/stripe/analytics/summary
 */
async function getAnalyticsSummary(req, res) {
  try {
    const user = req.user;
    const { 
      start_date = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days ago
      end_date = new Date().toISOString()
    } = req.query;

    console.log('📈 Getting analytics summary for user:', user.id);

    // Build base query with user access filtering
    let baseWhere = `created_at >= '${start_date}' AND created_at <= '${end_date}'`;
    
    if (user.role !== 'platform_admin') {
      if (user.role === 'chain_owner') {
        baseWhere += ` AND stripe_account_id IN (
          SELECT stripe_account_id FROM stripe_accounts 
          WHERE restaurant_chain_id = '${user.chain_id}'
        )`;
      } else if (user.role === 'branch_manager' || user.role === 'branch_staff') {
        baseWhere += ` AND stripe_account_id IN (
          SELECT stripe_account_id FROM stripe_accounts 
          WHERE branch_id = '${user.branch_id}'
        )`;
      }
    }

    // Execute analytics queries
    const { data: summaryData, error } = await supabase.rpc('get_stripe_analytics_summary', {
      where_clause: baseWhere
    });

    if (error) {
      // If RPC function doesn't exist, fall back to basic query
      console.log('Using fallback analytics query...');
      
      const { data: transactions } = await supabase
        .from('stripe_transactions')
        .select('gross_amount, commission_amount, status, created_at')
        .gte('created_at', start_date)
        .lte('created_at', end_date);

      const summary = transactions?.reduce((acc, tx) => {
        if (tx.status === 'succeeded') {
          acc.total_revenue += parseFloat(tx.gross_amount || 0);
          acc.total_commission += parseFloat(tx.commission_amount || 0);
          acc.transaction_count++;
        }
        return acc;
      }, {
        total_revenue: 0,
        total_commission: 0,
        transaction_count: 0,
        net_amount: 0
      }) || { total_revenue: 0, total_commission: 0, transaction_count: 0, net_amount: 0 };

      summary.net_amount = summary.total_revenue - summary.total_commission;

      return res.json({
        success: true,
        data: {
          period: { start_date, end_date },
          summary
        }
      });
    }

    res.json({
      success: true,
      data: {
        period: { start_date, end_date },
        summary: summaryData?.[0] || { 
          total_revenue: 0, 
          total_commission: 0, 
          transaction_count: 0, 
          net_amount: 0 
        }
      }
    });

  } catch (error) {
    console.error('❌ Error getting analytics summary:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get analytics summary',
      message: error.message
    });
  }
}

// ============================================
// WEBHOOK HANDLING
// ============================================

/**
 * Handle Stripe webhook events with enhanced security
 * POST /api/v1/stripe/webhooks
 */
async function handleWebhook(req, res) {
  const startTime = Date.now();
  let eventId = 'unknown';
  
  try {
    const signature = req.headers['stripe-signature'];
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
    const userAgent = req.headers['user-agent'] || '';
    const clientIp = req.ip || req.connection.remoteAddress;

    // Reduce log verbosity in production
    if (process.env.NODE_ENV !== 'production') {
      console.log(`🔔 Webhook received from IP: ${clientIp}, User-Agent: ${userAgent.substring(0, 50)}...`);
    }

    // 1. Environment validation
    if (!endpointSecret) {
      console.error('❌ Missing STRIPE_WEBHOOK_SECRET environment variable');
      return res.status(500).json({
        success: false,
        error: 'Webhook endpoint not configured'
      });
    }

    // 2. Signature validation
    if (!signature) {
      console.error('❌ Missing Stripe signature header');
      return res.status(400).json({
        success: false,
        error: 'Missing webhook signature'
      });
    }

    // 3. User-Agent validation (Stripe always sends specific user-agent)
    if (!userAgent.startsWith('Stripe/')) {
      console.error(`❌ Invalid User-Agent: ${userAgent}`);
      return res.status(400).json({
        success: false,
        error: 'Invalid request source'
      });
    }

    // 4. Request body validation
    if (!req.body || req.body.length === 0) {
      console.error('❌ Empty webhook payload');
      return res.status(400).json({
        success: false,
        error: 'Empty webhook payload'
      });
    }

    // 5. Verify webhook signature with enhanced error handling
    let event;
    try {
      const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
      
      // Extract timestamp from signature for additional validation
      const elements = signature.split(',');
      let timestamp = null;
      for (const element of elements) {
        if (element.startsWith('t=')) {
          timestamp = parseInt(element.substring(2));
          break;
        }
      }

      // Validate timestamp (reject webhooks older than 5 minutes)
      if (timestamp) {
        const currentTime = Math.floor(Date.now() / 1000);
        const timeDiff = currentTime - timestamp;
        
        if (timeDiff > 300) { // 5 minutes
          console.error(`❌ Webhook timestamp too old: ${timeDiff} seconds`);
          return res.status(400).json({
            success: false,
            error: 'Webhook timestamp too old'
          });
        }
      }

      // Construct and verify the event
      event = stripe.webhooks.constructEvent(req.body, signature, endpointSecret);
      eventId = event.id;
      
      // Log only critical events in production
      if (process.env.NODE_ENV !== 'production' || ['account.updated', 'capability.updated'].includes(event.type)) {
        console.log(`🔐 Webhook signature verified: ${event.type} (${eventId})`);
      }
      
    } catch (err) {
      console.error('❌ Webhook signature verification failed:', {
        error: err.message,
        signature: signature.substring(0, 20) + '...',
        bodyLength: req.body.length,
        clientIp
      });
      
      // Different error responses based on error type
      if (err.message.includes('timestamp')) {
        return res.status(400).json({
          success: false,
          error: 'Webhook timestamp invalid'
        });
      } else if (err.message.includes('signature')) {
        return res.status(401).json({
          success: false,
          error: 'Webhook signature invalid'
        });
      } else {
        return res.status(400).json({
          success: false,
          error: 'Webhook verification failed'
        });
      }
    }

    // 6. Additional event validation
    if (!event.id || !event.type || !event.data) {
      console.error('❌ Invalid webhook event structure:', {
        hasId: !!event.id,
        hasType: !!event.type,
        hasData: !!event.data
      });
      return res.status(400).json({
        success: false,
        error: 'Invalid webhook event structure'
      });
    }

    // 7. Check for duplicate webhook processing (idempotency)
    const { data: existingLog } = await supabase
      .from('stripe_webhook_logs')
      .select('id, status')
      .eq('webhook_id', event.id)
      .single();

    if (existingLog) {
      if (existingLog.status === 'processed') {
        console.log(`⚠️ Webhook already processed: ${event.id}`);
        return res.status(200).json({
          success: true,
          message: 'Webhook already processed',
          duplicate: true
        });
      } else if (existingLog.status === 'failed') {
        console.log(`🔄 Retrying failed webhook: ${event.id}`);
      }
    }

    // 8. Process the webhook event
    // Reduce processing logs for minor events
    if (process.env.NODE_ENV !== 'production' || ['account.updated', 'capability.updated', 'payment_intent.succeeded'].includes(event.type)) {
      console.log(`🔄 Processing webhook event: ${event.type} (${eventId})`);
    }
    let result;
    try {
      result = await stripeService.handleWebhookEvent(event);
    } catch (webhookError) {
      console.error(`❌ Webhook processing failed: ${event.type} (${eventId})`, {
        error: webhookError.message,
        stack: webhookError.stack
      });
      throw webhookError; // Re-throw to be caught by outer try-catch
    }
    const processingTime = Date.now() - startTime;

    console.log(`✅ Webhook processed successfully: ${event.type} (${eventId}) in ${processingTime}ms`);

    // 9. Return successful response immediately (Stripe expects quick response)
    res.status(200).json({
      success: true,
      data: {
        event_id: eventId,
        event_type: event.type,
        processed: result.processed,
        processing_time_ms: processingTime
      }
    });

  } catch (error) {
    const processingTime = Date.now() - startTime;
    
    console.error(`❌ Critical webhook processing error: ${eventId}`, {
      error: error.message,
      stack: error.stack,
      processing_time_ms: processingTime
    });
    
    // Log critical error for monitoring
    await stripeService._logCriticalWebhookError(eventId, error, {
      processing_time_ms: processingTime,
      client_ip: req.ip,
      user_agent: req.headers['user-agent']
    });
    
    res.status(500).json({
      success: false,
      error: 'Internal webhook processing error',
      event_id: eventId
    });
  }
}

// ============================================
// EXPORTS
// ============================================

module.exports = {
  // Account Management
  createExpressAccount,
  getAccountStatus,
  getAccountStatusByChain,
  createOnboardingLink,
  getAccountCapabilities,
  getMyStripeAccounts,
  
  // Payment Processing
  createPaymentIntent,
  confirmPaymentIntent,
  getPaymentIntentStatus,
  
  // Transaction Management
  getTransactions,
  getAnalyticsSummary,
  
  // Webhook Handling
  handleWebhook
};
