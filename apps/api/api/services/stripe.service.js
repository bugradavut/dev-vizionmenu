const Stripe = require('stripe');
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Initialize Stripe with secret key from environment variables
let stripe;
try {
  if (!process.env.STRIPE_SECRET_KEY) {
    console.log('⚠️  STRIPE_SECRET_KEY not found in environment variables');
    console.log('🔧 Stripe Connect features will be disabled');
  } else {
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2024-11-20.acacia', // Use latest stable API version
    });
    console.log('✅ Stripe initialized with API key:', process.env.STRIPE_SECRET_KEY.substring(0, 12) + '...');
  }
} catch (error) {
  console.error('❌ Error initializing Stripe:', error.message);
}

class StripeService {
  // ============================================
  // EXPRESS ACCOUNT MANAGEMENT
  // ============================================

  /**
   * Create a new Stripe Express Account for a restaurant
   * @param {Object} accountData - Restaurant account data
   * @param {string} accountData.restaurantChainId - Chain ID (optional)
   * @param {string} accountData.branchId - Branch ID (optional) 
   * @param {string} accountData.businessType - 'individual' or 'company'
   * @param {string} accountData.businessUrl - Restaurant website URL
   * @param {Object} accountData.businessProfile - Business profile data
   * @returns {Promise<Object>} Created account data
   */
  async createExpressAccount(accountData) {
    if (!stripe) {
      throw new Error('Stripe not initialized - check STRIPE_SECRET_KEY environment variable');
    }
    
    try {
      const {
        restaurantChainId,
        branchId,
        businessType = 'company',
        businessUrl,
        businessProfile = {}
      } = accountData;

      // Validate that either chain or branch is provided
      if (!restaurantChainId && !branchId) {
        throw new Error('Either restaurant_chain_id or branch_id must be provided');
      }

      // Create Express Account with Canadian settings
      const account = await stripe.accounts.create({
        type: 'express',
        country: 'CA',
        business_type: businessType,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true }
        },
        business_profile: {
          mcc: '5812', // Restaurant MCC code
          url: businessUrl || '',
          ...businessProfile
        },
        settings: {
          payouts: {
            schedule: {
              interval: 'daily' // Daily automatic payouts
            }
          }
        }
      });

      // Store account in database
      const { data: dbAccount, error } = await supabase
        .from('stripe_accounts')
        .insert({
          restaurant_chain_id: restaurantChainId || null,
          branch_id: branchId || null,
          stripe_account_id: account.id,
          account_type: 'express',
          onboarding_status: 'pending',
          verification_status: 'unverified',
          capabilities: account.capabilities,
          requirements: account.requirements,
          payouts_enabled: account.payouts_enabled,
          charges_enabled: account.charges_enabled,
          country: account.country,
          currency: account.default_currency,
          business_type: businessType,
          business_url: businessUrl
        })
        .select()
        .single();

      if (error) {
        // If database insert fails, clean up Stripe account
        await stripe.accounts.del(account.id);
        throw new Error(`Database error: ${error.message}`);
      }

      return {
        success: true,
        account: dbAccount,
        stripe_account: account
      };

    } catch (error) {
      console.error('Error creating Express account:', error);
      throw new Error(`Failed to create Express account: ${error.message}`);
    }
  }

  /**
   * Get account status and verification requirements
   * @param {string} stripeAccountId - Stripe Account ID
   * @returns {Promise<Object>} Account status data
   */
  async getAccountStatus(stripeAccountId) {
    try {
      // Get account from Stripe
      const account = await stripe.accounts.retrieve(stripeAccountId);

      // Update database with latest status
      const { error } = await supabase
        .from('stripe_accounts')
        .update({
          capabilities: account.capabilities,
          requirements: account.requirements,
          payouts_enabled: account.payouts_enabled,
          charges_enabled: account.charges_enabled,
          verification_status: this._getVerificationStatus(account),
          updated_at: new Date().toISOString()
        })
        .eq('stripe_account_id', stripeAccountId);

      if (error) {
        console.error('Error updating account status:', error);
      }

      return {
        stripe_account_id: account.id,
        charges_enabled: account.charges_enabled,
        payouts_enabled: account.payouts_enabled,
        capabilities: account.capabilities,
        requirements: account.requirements,
        verification_status: this._getVerificationStatus(account),
        onboarding_completed: account.details_submitted && account.charges_enabled
      };

    } catch (error) {
      console.error('Error getting account status:', error);
      throw new Error(`Failed to get account status: ${error.message}`);
    }
  }

  /**
   * Create onboarding link for Express Account setup
   * @param {string} stripeAccountId - Stripe Account ID
   * @param {string} refreshUrl - URL to redirect after completion
   * @param {string} returnUrl - URL to return to dashboard
   * @returns {Promise<Object>} Onboarding link data
   */
  async createOnboardingLink(stripeAccountId, refreshUrl, returnUrl) {
    try {
      const accountLink = await stripe.accountLinks.create({
        account: stripeAccountId,
        refresh_url: refreshUrl,
        return_url: returnUrl,
        type: 'account_onboarding'
      });

      return {
        onboarding_url: accountLink.url,
        expires_at: accountLink.expires_at
      };

    } catch (error) {
      console.error('Error creating onboarding link:', error);
      throw new Error(`Failed to create onboarding link: ${error.message}`);
    }
  }

  /**
   * Verify account capabilities and payment readiness
   * @param {string} stripeAccountId - Stripe Account ID
   * @returns {Promise<Object>} Capabilities verification data
   */
  async verifyAccountCapabilities(stripeAccountId) {
    try {
      const account = await stripe.accounts.retrieve(stripeAccountId);

      const capabilities = {
        card_payments: account.capabilities.card_payments === 'active',
        transfers: account.capabilities.transfers === 'active'
      };

      const isReady = capabilities.card_payments && capabilities.transfers && 
                      account.charges_enabled && account.payouts_enabled;

      return {
        capabilities,
        charges_enabled: account.charges_enabled,
        payouts_enabled: account.payouts_enabled,
        is_ready: isReady,
        requirements_due: account.requirements?.currently_due || [],
        requirements_past_due: account.requirements?.past_due || []
      };

    } catch (error) {
      console.error('Error verifying account capabilities:', error);
      throw new Error(`Failed to verify account capabilities: ${error.message}`);
    }
  }

  // ============================================
  // PAYMENT PROCESSING
  // ============================================

  /**
   * Create Payment Intent with application fee for commission
   * @param {Object} paymentData - Payment data
   * @param {number} paymentData.amount - Total amount in CAD
   * @param {number} paymentData.commissionAmount - Commission amount in CAD
   * @param {string} paymentData.stripeAccountId - Restaurant's Stripe account
   * @param {string} paymentData.orderId - Order ID for metadata
   * @param {Object} paymentData.metadata - Additional metadata
   * @returns {Promise<Object>} Payment Intent data
   */
  async createPaymentIntentWithSplit(paymentData) {
    try {
      const {
        amount,
        commissionAmount,
        stripeAccountId,
        orderId,
        metadata = {}
      } = paymentData;

      // Convert to cents for Stripe
      const amountCents = Math.round(amount * 100);
      const commissionCents = Math.round(commissionAmount * 100);

      const paymentIntent = await stripe.paymentIntents.create({
        amount: amountCents,
        currency: 'cad',
        application_fee_amount: commissionCents,
        on_behalf_of: stripeAccountId,
        transfer_data: {
          destination: stripeAccountId
        },
        metadata: {
          order_id: orderId,
          commission_amount: commissionAmount.toString(),
          ...metadata
        },
        automatic_payment_methods: {
          enabled: true
        }
      });

      // Store transaction record
      await this._logTransaction({
        orderId,
        stripeAccountId,
        paymentIntentId: paymentIntent.id,
        grossAmount: amount,
        commissionAmount,
        netAmount: amount - commissionAmount,
        applicationFee: commissionAmount,
        status: 'pending',
        paymentStatus: paymentIntent.status
      });

      return {
        payment_intent_id: paymentIntent.id,
        client_secret: paymentIntent.client_secret,
        status: paymentIntent.status,
        amount: amount,
        commission_amount: commissionAmount,
        net_amount: amount - commissionAmount
      };

    } catch (error) {
      console.error('Error creating payment intent:', error);
      throw new Error(`Failed to create payment intent: ${error.message}`);
    }
  }

  // ============================================
  // WEBHOOK HANDLING
  // ============================================

  /**
   * Handle Stripe webhook events
   * @param {Object} event - Stripe webhook event
   * @returns {Promise<Object>} Processing result
   */
  async handleWebhookEvent(event) {
    try {
      console.log(`🔔 Processing webhook event: ${event.type} (${event.id})`);

      // Log webhook event for debugging and audit trail
      await this._logWebhookEvent(event);

      const handlers = {
        // PAYMENT EVENTS - Critical for commission tracking
        'payment_intent.succeeded': this._handlePaymentSuccess.bind(this),
        'payment_intent.payment_failed': this._handlePaymentFailure.bind(this),
        'payment_intent.canceled': this._handlePaymentCanceled.bind(this),
        'payment_intent.requires_action': this._handlePaymentRequiresAction.bind(this),
        
        // TRANSFER EVENTS - Commission disbursement to restaurants
        'transfer.created': this._handleTransferCreated.bind(this),
        'transfer.paid': this._handleTransferCompleted.bind(this),
        'transfer.failed': this._handleTransferFailed.bind(this),
        'transfer.reversed': this._handleTransferReversed.bind(this),
        
        // ACCOUNT EVENTS - Restaurant onboarding status
        'account.updated': this._handleAccountUpdated.bind(this),
        'account.application.authorized': this._handleAccountAuthorized.bind(this),
        'account.application.deauthorized': this._handleAccountDeauthorized.bind(this),
        'capability.updated': this._handleCapabilityUpdated.bind(this),
        
        // PAYOUT EVENTS - Restaurant bank transfers
        'payout.created': this._handlePayoutCreated.bind(this),
        'payout.paid': this._handlePayoutCompleted.bind(this),
        'payout.failed': this._handlePayoutFailed.bind(this),
        'payout.canceled': this._handlePayoutCanceled.bind(this),
        
        // REFUND EVENTS - Restaurant refund authority
        'refund.created': this._handleRefundCreated.bind(this),
        'refund.updated': this._handleRefundUpdated.bind(this),
        'refund.failed': this._handleRefundFailed.bind(this),
        
        // CHARGE DISPUTE EVENTS - Chargeback handling
        'charge.dispute.created': this._handleChargeDispute.bind(this),
        'charge.dispute.updated': this._handleChargeDisputeUpdated.bind(this),
        'charge.dispute.closed': this._handleChargeDisputeClosed.bind(this),
        
        // INVOICE EVENTS - Platform fees and billing
        'invoice.payment_succeeded': this._handleInvoicePaymentSucceeded.bind(this),
        'invoice.payment_failed': this._handleInvoicePaymentFailed.bind(this),
        
        // APPLICATION FEE EVENTS - Our commission tracking
        'application_fee.created': this._handleApplicationFeeCreated.bind(this),
        'application_fee.refunded': this._handleApplicationFeeRefunded.bind(this)
      };

      const handler = handlers[event.type];
      if (handler) {
        console.log(`✅ Processing ${event.type} with dedicated handler...`);
        const result = await handler(event);
        
        // Update webhook log with success status
        await this._updateWebhookEventStatus(event.id, 'processed', result);
        
        return { 
          processed: true, 
          event_type: event.type,
          event_id: event.id,
          result
        };
      } else {
        console.log(`⚠️  Unhandled webhook event type: ${event.type}`);
        
        // Update webhook log with unhandled status
        await this._updateWebhookEventStatus(event.id, 'unhandled', {
          message: `No handler for event type: ${event.type}`
        });
        
        return { 
          processed: false, 
          event_type: event.type,
          event_id: event.id,
          message: 'Event type not handled'
        };
      }

    } catch (error) {
      console.error(`❌ Error processing webhook event ${event.type}:`, error);
      
      // Update webhook log with error status
      await this._updateWebhookEventStatus(event.id, 'failed', {
        error: error.message,
        stack: error.stack
      });
      
      throw new Error(`Webhook processing failed: ${error.message}`);
    }
  }

  // ============================================
  // WEBHOOK EVENT LOGGING & AUDIT TRAIL
  // ============================================

  /**
   * Log webhook event for debugging and compliance
   * @private
   */
  async _logWebhookEvent(event) {
    try {
      await supabase
        .from('stripe_webhook_logs')
        .insert({
          webhook_id: event.id,
          event_type: event.type,
          api_version: event.api_version,
          created: new Date(event.created * 1000).toISOString(),
          data: event.data,
          livemode: event.livemode,
          pending_webhooks: event.pending_webhooks,
          request: event.request,
          status: 'received'
        });
    } catch (error) {
      console.error('Error logging webhook event:', error);
      // Don't throw - webhook processing should continue
    }
  }

  /**
   * Update webhook event processing status
   * @private
   */
  async _updateWebhookEventStatus(eventId, status, result = null) {
    try {
      await supabase
        .from('stripe_webhook_logs')
        .update({
          status,
          processing_result: result,
          processed_at: new Date().toISOString()
        })
        .eq('webhook_id', eventId);
    } catch (error) {
      console.error('Error updating webhook status:', error);
      // Don't throw - this is just logging
    }
  }

  // ============================================
  // PRIVATE HELPER METHODS
  // ============================================

  /**
   * Determine verification status from account object
   * @private
   */
  _getVerificationStatus(account) {
    if (account.charges_enabled && account.payouts_enabled) {
      return 'verified';
    }
    if (account.requirements?.currently_due?.length > 0) {
      return 'pending';
    }
    return 'unverified';
  }

  /**
   * Log transaction to database
   * @private
   */
  async _logTransaction(transactionData) {
    try {
      // Handle temporary order IDs that aren't valid UUIDs
      const orderId = transactionData.orderId?.startsWith('temp_') ? null : transactionData.orderId;
      
      const { error } = await supabase
        .from('stripe_transactions')
        .insert({
          order_id: orderId, // Will be null for temp orders, updated later via webhook
          stripe_account_id: transactionData.stripeAccountId,
          payment_intent_id: transactionData.paymentIntentId,
          transfer_id: transactionData.transferId || null,
          gross_amount: transactionData.grossAmount,
          commission_amount: transactionData.commissionAmount,
          net_amount: transactionData.netAmount,
          stripe_fee: transactionData.stripeFee || 0,
          application_fee: transactionData.applicationFee,
          status: transactionData.status,
          payment_status: transactionData.paymentStatus,
          transfer_status: transactionData.transferStatus || 'pending',
          failure_reason: transactionData.failureReason || null
          // Note: Temp order IDs handled via payment_intent_id matching in webhooks
        });

      if (error) {
        console.error('Error logging transaction:', error);
        return false;
      }

      console.log(`✅ Transaction logged: ${transactionData.paymentIntentId}`);
      return true;
    } catch (error) {
      console.error('❌ Failed to log transaction:', error);
      return false;
    }
  }

  /**
   * Handle successful payment webhook
   * @private
   */
  async _handlePaymentSuccess(event) {
    const paymentIntent = event.data.object;
    const orderId = paymentIntent.metadata?.order_id;
    
    console.log(`💰 Payment succeeded: ${paymentIntent.id} ($${paymentIntent.amount / 100} ${paymentIntent.currency.toUpperCase()})`);
    
    // Update transaction status
    const { error: txError } = await supabase
      .from('stripe_transactions')
      .update({
        status: 'succeeded',
        payment_status: 'succeeded',
        stripe_fee: paymentIntent.charges?.data?.[0]?.fees_details?.[0]?.amount || 0,
        updated_at: new Date().toISOString()
      })
      .eq('payment_intent_id', paymentIntent.id);

    if (txError) {
      console.error('Error updating transaction:', txError);
    }

    // Update order status
    if (orderId) {
      const { error: orderError } = await supabase
        .from('orders')
        .update({
          payment_status: 'paid',
          commission_status: 'processed',
          paid_at: new Date().toISOString()
        })
        .eq('id', orderId);

      if (orderError) {
        console.error('Error updating order:', orderError);
      }

      // Send real-time notification to restaurant
      await this._sendRealTimeNotification('payment_success', {
        orderId,
        paymentIntentId: paymentIntent.id,
        amount: paymentIntent.amount / 100,
        currency: paymentIntent.currency.toUpperCase()
      });
    }

    return { orderId, paymentIntentId: paymentIntent.id, status: 'succeeded' };
  }

  /**
   * Handle failed payment webhook
   * @private
   */
  async _handlePaymentFailure(event) {
    const paymentIntent = event.data.object;
    const orderId = paymentIntent.metadata?.order_id;
    const failureReason = paymentIntent.last_payment_error?.message || 'Payment failed';
    
    console.log(`❌ Payment failed: ${paymentIntent.id} - ${failureReason}`);
    
    // Update transaction status
    await supabase
      .from('stripe_transactions')
      .update({
        status: 'failed',
        payment_status: 'failed',
        failure_reason: failureReason,
        updated_at: new Date().toISOString()
      })
      .eq('payment_intent_id', paymentIntent.id);

    // Update order status
    if (orderId) {
      await supabase
        .from('orders')
        .update({
          payment_status: 'failed',
          failure_reason: failureReason
        })
        .eq('id', orderId);

      // Send real-time notification to restaurant
      await this._sendRealTimeNotification('payment_failed', {
        orderId,
        paymentIntentId: paymentIntent.id,
        failureReason,
        amount: paymentIntent.amount / 100
      });
    }

    return { orderId, paymentIntentId: paymentIntent.id, status: 'failed', reason: failureReason };
  }

  /**
   * Handle transfer created webhook
   * @private
   */
  async _handleTransferCreated(event) {
    const transfer = event.data.object;
    
    // Update transaction with transfer ID
    await supabase
      .from('stripe_transactions')
      .update({
        transfer_id: transfer.id,
        transfer_status: 'pending',
        updated_at: new Date().toISOString()
      })
      .eq('payment_intent_id', transfer.source_transaction);
  }

  /**
   * Handle transfer completed webhook  
   * @private
   */
  async _handleTransferCompleted(event) {
    const transfer = event.data.object;
    
    await supabase
      .from('stripe_transactions')
      .update({
        transfer_status: 'paid',
        updated_at: new Date().toISOString()
      })
      .eq('transfer_id', transfer.id);
  }

  /**
   * Handle account updated webhook
   * @private
   */
  async _handleAccountUpdated(event) {
    const account = event.data.object;
    const newStatus = this._getVerificationStatus(account);
    
    console.log(`🏢 Account updated: ${account.id} - Status: ${newStatus}`);
    
    // Get current status for comparison
    const { data: currentAccount } = await supabase
      .from('stripe_accounts')
      .select('verification_status, restaurant_chain_id, branch_id')
      .eq('stripe_account_id', account.id)
      .single();

    // Update account status
    const { error } = await supabase
      .from('stripe_accounts')
      .update({
        capabilities: account.capabilities,
        requirements: account.requirements,
        payouts_enabled: account.payouts_enabled,
        charges_enabled: account.charges_enabled,
        verification_status: newStatus,
        onboarding_status: account.details_submitted ? 'completed' : 'pending',
        updated_at: new Date().toISOString()
      })
      .eq('stripe_account_id', account.id);

    if (error) {
      console.error('Error updating account:', error);
      return { error: error.message };
    }

    // Send notification if status changed (especially when verified)
    if (currentAccount && currentAccount.verification_status !== newStatus) {
      await this._sendAccountStatusNotification(account.id, newStatus, currentAccount);
    }

    return { 
      accountId: account.id, 
      oldStatus: currentAccount?.verification_status, 
      newStatus,
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled
    };
  }

  /**
   * Handle payout created webhook
   * @private
   */
  async _handlePayoutCreated(event) {
    const payout = event.data.object;
    const amount = payout.amount / 100; // Convert from cents
    const arrivalDate = payout.arrival_date ? new Date(payout.arrival_date * 1000).toISOString() : null;
    
    console.log(`💸 Payout created: ${payout.id} - $${amount} ${payout.currency.toUpperCase()} to ${payout.destination}`);
    
    // Insert payout record
    const { data: payoutRecord, error } = await supabase
      .from('stripe_payouts')
      .insert({
        stripe_account_id: payout.destination,
        payout_id: payout.id,
        amount: amount,
        currency: payout.currency.toUpperCase(),
        status: payout.status,
        arrival_date: arrivalDate,
        description: payout.description || `Payout for ${amount} ${payout.currency.toUpperCase()}`,
        type: payout.type || 'bank_account',
        method: payout.method || 'standard'
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating payout record:', error);
      return { error: error.message };
    }

    // Get restaurant info for notification
    const { data: account } = await supabase
      .from('stripe_accounts')
      .select(`
        restaurant_chain_id, 
        branch_id,
        restaurant_chains:restaurant_chain_id(name),
        branches:branch_id(name)
      `)
      .eq('stripe_account_id', payout.destination)
      .single();

    // Send payout notification to restaurant
    if (account) {
      await this._sendRealTimeNotification('payout_created', {
        payoutId: payout.id,
        amount: amount,
        currency: payout.currency.toUpperCase(),
        arrivalDate,
        restaurantName: account.restaurant_chains?.name || account.branches?.name,
        status: payout.status
      });
    }

    return { 
      payoutId: payout.id, 
      amount, 
      currency: payout.currency.toUpperCase(), 
      status: payout.status,
      arrivalDate
    };
  }

  /**
   * Handle payout completed webhook
   * @private
   */
  async _handlePayoutCompleted(event) {
    const payout = event.data.object;
    const amount = payout.amount / 100;
    
    console.log(`✅ Payout completed: ${payout.id} - $${amount} ${payout.currency.toUpperCase()}`);
    
    // Update payout status
    const { error } = await supabase
      .from('stripe_payouts')
      .update({
        status: 'paid',
        paid_at: new Date().toISOString()
      })
      .eq('payout_id', payout.id);

    if (error) {
      console.error('Error updating payout status:', error);
      return { error: error.message };
    }

    // Get restaurant info for notification
    const { data: account } = await supabase
      .from('stripe_accounts')
      .select(`
        restaurant_chain_id, 
        branch_id,
        restaurant_chains:restaurant_chain_id(name),
        branches:branch_id(name)
      `)
      .eq('stripe_account_id', payout.destination)
      .single();

    // Send payout completion notification to restaurant
    if (account) {
      await this._sendRealTimeNotification('payout_completed', {
        payoutId: payout.id,
        amount: amount,
        currency: payout.currency.toUpperCase(),
        restaurantName: account.restaurant_chains?.name || account.branches?.name,
        status: 'paid'
      });
    }

    return { payoutId: payout.id, amount, status: 'paid' };
  }

  /**
   * Handle refund created webhook
   * @private
   */
  async _handleRefundCreated(event) {
    const refund = event.data.object;
    
    // Find the transaction by payment intent
    const { data: transaction } = await supabase
      .from('stripe_transactions')
      .select('*')
      .eq('payment_intent_id', refund.payment_intent)
      .single();

    if (transaction) {
      const commissionRefund = (refund.amount / 100) * (transaction.commission_amount / transaction.gross_amount);

      await supabase
        .from('stripe_refunds')
        .insert({
          transaction_id: transaction.id,
          refund_id: refund.id,
          amount: refund.amount / 100,
          commission_refund: commissionRefund,
          reason: refund.reason || 'requested_by_customer',
          status: refund.status,
          initiated_by: 'restaurant' // Default, can be updated based on context
        });
    }
  }

  /**
   * Handle refund updated webhook
   * @private
   */
  async _handleRefundUpdated(event) {
    const refund = event.data.object;
    
    console.log(`🔄 Refund updated: ${refund.id} - Status: ${refund.status}`);
    
    const { error } = await supabase
      .from('stripe_refunds')
      .update({
        status: refund.status,
        failure_reason: refund.failure_reason || null,
        updated_at: new Date().toISOString()
      })
      .eq('refund_id', refund.id);

    if (error) {
      console.error('Error updating refund:', error);
      return { error: error.message };
    }

    return { refundId: refund.id, status: refund.status };
  }

  // ============================================
  // ADDITIONAL WEBHOOK HANDLERS (Phase 4)
  // ============================================

  /**
   * Handle payment canceled webhook
   * @private
   */
  async _handlePaymentCanceled(event) {
    const paymentIntent = event.data.object;
    const orderId = paymentIntent.metadata?.order_id;
    
    console.log(`❌ Payment canceled: ${paymentIntent.id}`);
    
    // Update transaction status
    await supabase
      .from('stripe_transactions')
      .update({
        status: 'canceled',
        payment_status: 'canceled',
        updated_at: new Date().toISOString()
      })
      .eq('payment_intent_id', paymentIntent.id);

    // Update order status
    if (orderId) {
      await supabase
        .from('orders')
        .update({
          payment_status: 'canceled',
          canceled_at: new Date().toISOString()
        })
        .eq('id', orderId);

      await this._sendRealTimeNotification('payment_canceled', {
        orderId,
        paymentIntentId: paymentIntent.id,
        amount: paymentIntent.amount / 100
      });
    }

    return { orderId, paymentIntentId: paymentIntent.id, status: 'canceled' };
  }

  /**
   * Handle payment requires action webhook
   * @private
   */
  async _handlePaymentRequiresAction(event) {
    const paymentIntent = event.data.object;
    const orderId = paymentIntent.metadata?.order_id;
    
    console.log(`⚠️ Payment requires action: ${paymentIntent.id}`);
    
    // Update transaction status
    await supabase
      .from('stripe_transactions')
      .update({
        payment_status: 'requires_action',
        updated_at: new Date().toISOString()
      })
      .eq('payment_intent_id', paymentIntent.id);

    return { orderId, paymentIntentId: paymentIntent.id, status: 'requires_action' };
  }

  /**
   * Handle transfer failed webhook
   * @private
   */
  async _handleTransferFailed(event) {
    const transfer = event.data.object;
    const failureCode = transfer.failure_code;
    const failureMessage = transfer.failure_message;
    
    console.log(`❌ Transfer failed: ${transfer.id} - ${failureMessage}`);
    
    // Update transaction status
    await supabase
      .from('stripe_transactions')
      .update({
        transfer_status: 'failed',
        failure_reason: failureMessage,
        updated_at: new Date().toISOString()
      })
      .eq('transfer_id', transfer.id);

    // Alert platform admin about transfer failure
    await this._sendPlatformAdminAlert('transfer_failed', {
      transferId: transfer.id,
      failureCode,
      failureMessage,
      amount: transfer.amount / 100,
      destination: transfer.destination
    });

    return { transferId: transfer.id, status: 'failed', reason: failureMessage };
  }

  /**
   * Handle transfer reversed webhook
   * @private
   */
  async _handleTransferReversed(event) {
    const transfer = event.data.object;
    
    console.log(`🔄 Transfer reversed: ${transfer.id}`);
    
    await supabase
      .from('stripe_transactions')
      .update({
        transfer_status: 'reversed',
        updated_at: new Date().toISOString()
      })
      .eq('transfer_id', transfer.id);

    return { transferId: transfer.id, status: 'reversed' };
  }

  /**
   * Create basic payment intent (for testing without commission split)
   * @param {Object} paymentData - Payment data
   * @returns {Promise<Object>} Payment intent
   */
  async createBasicPaymentIntent(paymentData) {
    try {
      const { amount, orderId, metadata = {} } = paymentData;

      // Convert to cents for Stripe
      const amountCents = Math.round(amount * 100);

      console.log(`💳 Creating basic payment intent: $${amount} CAD (${amountCents} cents)`);

      const paymentIntent = await stripe.paymentIntents.create({
        amount: amountCents,
        currency: 'cad',
        metadata: {
          order_id: orderId,
          ...metadata
        },
        automatic_payment_methods: {
          enabled: true
        }
      });

      console.log(`✅ Payment intent created: ${paymentIntent.id}`);

      return paymentIntent;
    } catch (error) {
      console.error('❌ Error creating basic payment intent:', error);
      throw error;
    }
  }
  // ============================================
  // NOTIFICATION & REAL-TIME UPDATES
  // ============================================

  /**
   * Send real-time notification to restaurant dashboard
   * @private
   */
  async _sendRealTimeNotification(eventType, data) {
    try {
      console.log(`📡 Sending real-time notification: ${eventType}`, data);
      
      // Import the broadcast function from notifications controller
      const { broadcastNotification } = require('../controllers/notifications.controller');
      
      // Determine notification filters based on event data
      let filters = {};
      
      if (data.orderId) {
        // Get order info to determine which restaurant should receive notification
        const { data: order } = await supabase
          .from('orders')
          .select(`
            branch_id,
            branches:branch_id(
              chain_id,
              name,
              restaurant_chains:chain_id(name)
            )
          `)
          .eq('id', data.orderId)
          .single();
          
        if (order) {
          filters.branchId = order.branch_id;
          filters.chainId = order.branches?.chain_id;
          
          // Add restaurant context to notification data
          data.restaurant = {
            branchName: order.branches?.name,
            chainName: order.branches?.restaurant_chains?.name
          };
        }
      }
      
      if (data.accountId) {
        // Get Stripe account info to determine which restaurant should receive notification
        const { data: stripeAccount } = await supabase
          .from('stripe_accounts')
          .select(`
            branch_id,
            restaurant_chain_id,
            branches:branch_id(name),
            restaurant_chains:restaurant_chain_id(name)
          `)
          .eq('stripe_account_id', data.accountId)
          .single();
          
        if (stripeAccount) {
          filters.branchId = stripeAccount.branch_id;
          filters.chainId = stripeAccount.restaurant_chain_id;
          
          // Add restaurant context to notification data
          data.restaurant = {
            branchName: stripeAccount.branches?.name,
            chainName: stripeAccount.restaurant_chains?.name
          };
        }
      }
      
      // Send notification via SSE
      const result = broadcastNotification(eventType, data, filters);
      
      return { sent: true, eventType, data, recipients: result.sent };
    } catch (error) {
      console.error('Error sending real-time notification:', error);
      return { sent: false, error: error.message };
    }
  }

  /**
   * Send account status notification to restaurant
   * @private
   */
  async _sendAccountStatusNotification(accountId, newStatus, accountInfo) {
    try {
      // Send email or push notification to restaurant about status change
      console.log(`📧 Account status notification: ${accountId} - ${newStatus}`);
      
      // Different messages based on status
      const messages = {
        'verified': {
          title: 'Payment Account Verified!',
          message: 'Your Stripe account is now fully verified. You can start receiving payments with automatic commission splits.',
          type: 'success'
        },
        'pending': {
          title: 'Account Verification Pending',
          message: 'Additional information is required to complete your payment account setup.',
          type: 'warning'
        },
        'rejected': {
          title: 'Account Verification Issues',
          message: 'There was an issue with your account verification. Please check your Stripe dashboard.',
          type: 'error'
        }
      };

      const notification = messages[newStatus] || {
        title: 'Account Status Updated',
        message: `Your payment account status has been updated to: ${newStatus}`,
        type: 'info'
      };

      return await this._sendRealTimeNotification('account_status_updated', {
        accountId,
        status: newStatus,
        notification
      });
    } catch (error) {
      console.error('Error sending account status notification:', error);
      return { sent: false, error: error.message };
    }
  }

  /**
   * Send platform admin alert for critical events
   * @private
   */
  async _sendPlatformAdminAlert(alertType, data) {
    try {
      console.log(`🚨 Platform admin alert: ${alertType}`, data);
      
      // TODO: Implement admin alerting system
      // - Email alerts for critical events
      // - Slack integration
      // - Dashboard notifications
      
      return { sent: true, alertType, data };
    } catch (error) {
      console.error('Error sending platform admin alert:', error);
      return { sent: false, error: error.message };
    }
  }

  /**
   * Log critical webhook processing errors
   * @private
   */
  async _logCriticalWebhookError(eventId, error, metadata = {}) {
    try {
      await supabase
        .from('stripe_webhook_logs')
        .insert({
          webhook_id: eventId,
          event_type: 'error',
          data: {
            error_message: error.message,
            error_stack: error.stack,
            metadata
          },
          status: 'failed',
          processing_result: {
            error: error.message,
            metadata
          },
          processed_at: new Date().toISOString(),
          created: new Date().toISOString()
        });
      
      // Send immediate alert for critical errors
      await this._sendPlatformAdminAlert('critical_webhook_error', {
        eventId,
        error: error.message,
        metadata
      });
    } catch (logError) {
      console.error('Failed to log critical webhook error:', logError);
      // Don't throw - webhook processing should continue
    }
  }

  // ============================================
  // MISSING WEBHOOK EVENT HANDLERS
  // ============================================

  /**
   * Handle account authorization events
   * @private
   */
  async _handleAccountAuthorized(event) {
    console.log('🔑 Processing account.application.authorized event');

    const account = event.data.object;
    const accountId = account.id;

    try {
      // Update account status in database
      const { error } = await supabase
        .from('stripe_accounts')
        .update({
          onboarding_status: 'authorized',
          updated_at: new Date().toISOString()
        })
        .eq('stripe_account_id', accountId);

      if (error) throw error;

      console.log(`✅ Account authorized: ${accountId}`);
      return { processed: true };
    } catch (error) {
      console.error(`❌ Error processing account authorization: ${accountId}`, error);
      throw error;
    }
  }

  /**
   * Handle account deauthorization events
   * @private
   */
  async _handleAccountDeauthorized(event) {
    console.log('🚫 Processing account.application.deauthorized event');

    const account = event.data.object;
    const accountId = account.id;

    try {
      // Update account status in database
      const { error } = await supabase
        .from('stripe_accounts')
        .update({
          onboarding_status: 'deauthorized',
          charges_enabled: false,
          payouts_enabled: false,
          updated_at: new Date().toISOString()
        })
        .eq('stripe_account_id', accountId);

      if (error) throw error;

      console.log(`✅ Account deauthorized: ${accountId}`);
      return { processed: true };
    } catch (error) {
      console.error(`❌ Error processing account deauthorization: ${accountId}`, error);
      throw error;
    }
  }

  /**
   * Handle capability updated events (CRITICAL for account status)
   * @private
   */
  async _handleCapabilityUpdated(event) {
    console.log('🔧 Processing capability.updated event');

    const capability = event.data.object;
    const accountId = capability.account;
    const capabilityType = capability.id; // 'card_payments', 'transfers', etc.
    const status = capability.status; // 'active', 'inactive', 'pending'

    try {
      // Get current account capabilities
      const { data: existingAccount } = await supabase
        .from('stripe_accounts')
        .select('capabilities, charges_enabled, payouts_enabled')
        .eq('stripe_account_id', accountId)
        .single();

      if (!existingAccount) {
        console.log(`⚠️ No account found for capability update: ${accountId}`);
        return { processed: false };
      }

      // Update capabilities JSON
      let capabilities = existingAccount.capabilities || {};
      capabilities[capabilityType] = {
        status: status,
        updated_at: new Date().toISOString()
      };

      // Determine if charges/payouts should be enabled
      const chargesEnabled = capabilities.card_payments?.status === 'active';
      const payoutsEnabled = capabilities.transfers?.status === 'active';

      // Update database
      const { error } = await supabase
        .from('stripe_accounts')
        .update({
          capabilities,
          charges_enabled: chargesEnabled,
          payouts_enabled: payoutsEnabled,
          verification_status: (chargesEnabled && payoutsEnabled) ? 'verified' : 'pending',
          updated_at: new Date().toISOString()
        })
        .eq('stripe_account_id', accountId);

      if (error) throw error;

      console.log(`✅ Capability updated: ${accountId} - ${capabilityType}: ${status}`);
      console.log(`📊 Account status: charges=${chargesEnabled}, payouts=${payoutsEnabled}`);

      return { processed: true };
    } catch (error) {
      console.error(`❌ Error processing capability update: ${accountId}`, error);
      throw error;
    }
  }

  // ============================================
  // MISSING PAYOUT EVENT HANDLERS
  // ============================================

  /**
   * Handle payout failed events
   * @private
   */
  async _handlePayoutFailed(event) {
    console.log('❌ Processing payout.failed event');

    const payout = event.data.object;
    const stripeAccountId = event.account;

    try {
      // Log failed payout
      const { error } = await supabase
        .from('stripe_payouts')
        .upsert({
          stripe_account_id: stripeAccountId,
          payout_id: payout.id,
          amount: payout.amount / 100, // Convert from cents
          currency: payout.currency,
          status: 'failed',
          failure_reason: payout.failure_message || 'Unknown error',
          created_at: new Date(payout.created * 1000).toISOString()
        });

      if (error) throw error;

      console.log(`✅ Payout failed logged: ${payout.id}`);
      return { processed: true };
    } catch (error) {
      console.error(`❌ Error processing payout failed: ${payout.id}`, error);
      throw error;
    }
  }

  /**
   * Handle payout canceled events
   * @private
   */
  async _handlePayoutCanceled(event) {
    console.log('🚫 Processing payout.canceled event');

    const payout = event.data.object;
    const stripeAccountId = event.account;

    try {
      // Update payout status
      const { error } = await supabase
        .from('stripe_payouts')
        .upsert({
          stripe_account_id: stripeAccountId,
          payout_id: payout.id,
          amount: payout.amount / 100,
          currency: payout.currency,
          status: 'canceled',
          created_at: new Date(payout.created * 1000).toISOString()
        });

      if (error) throw error;

      console.log(`✅ Payout canceled logged: ${payout.id}`);
      return { processed: true };
    } catch (error) {
      console.error(`❌ Error processing payout canceled: ${payout.id}`, error);
      throw error;
    }
  }

  // ============================================
  // MISSING REFUND EVENT HANDLERS
  // ============================================

  /**
   * Handle refund failed events
   * @private
   */
  async _handleRefundFailed(event) {
    console.log('❌ Processing refund.failed event');

    const refund = event.data.object;
    const orderId = refund.metadata?.order_id;

    try {
      // Update refund status
      const { error } = await supabase
        .from('stripe_refunds')
        .update({
          status: 'failed',
          failure_reason: refund.failure_reason || 'Unknown error'
        })
        .eq('refund_id', refund.id);

      if (error) throw error;

      console.log(`✅ Refund failed logged: ${refund.id}`);
      return { processed: true };
    } catch (error) {
      console.error(`❌ Error processing refund failed: ${refund.id}`, error);
      throw error;
    }
  }

  // ============================================
  // SIMPLE STUBS FOR ALL REMAINING EVENTS
  // ============================================

  async _handleChargeDispute(event) {
    console.log('⚖️ Processing charge.dispute.created - stub');
    return { processed: true };
  }

  async _handleChargeDisputeUpdated(event) {
    console.log('⚖️ Processing charge.dispute.updated - stub');
    return { processed: true };
  }

  async _handleChargeDisputeClosed(event) {
    console.log('⚖️ Processing charge.dispute.closed - stub');
    return { processed: true };
  }

  async _handleInvoicePaymentSucceeded(event) {
    console.log('📄 Processing invoice.payment_succeeded - stub');
    return { processed: true };
  }

  async _handleInvoicePaymentFailed(event) {
    console.log('📄 Processing invoice.payment_failed - stub');
    return { processed: true };
  }

  async _handleApplicationFeeCreated(event) {
    console.log('💰 Processing application_fee.created - stub');
    return { processed: true };
  }

  async _handleApplicationFeeRefunded(event) {
    console.log('💰 Processing application_fee.refunded - stub');
    return { processed: true };
  }
}

module.exports = new StripeService();