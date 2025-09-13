// =====================================================
// WEBHOOK TEST CONTROLLER
// Testing webhook reliability and error scenarios
// =====================================================

const stripeService = require('../services/stripe.service');
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Test webhook processing with mock events
 * POST /api/v1/webhook-test/simulate
 */
async function simulateWebhookEvent(req, res) {
  try {
    const { eventType, testData = {} } = req.body;

    console.log(`🧪 Simulating webhook event: ${eventType}`);

    // Create mock webhook event
    const mockEvent = {
      id: `evt_test_${Date.now()}`,
      type: eventType,
      api_version: '2024-11-20.acacia',
      created: Math.floor(Date.now() / 1000),
      data: {
        object: {
          id: testData.id || `test_${Date.now()}`,
          ...testData
        }
      },
      livemode: false,
      pending_webhooks: 1,
      request: {
        id: `req_test_${Date.now()}`,
        idempotency_key: null
      }
    };

    // Add event-specific mock data
    switch (eventType) {
      case 'payment_intent.succeeded':
        mockEvent.data.object = {
          ...mockEvent.data.object,
          amount: testData.amount || 5000, // $50.00
          currency: 'cad',
          metadata: {
            order_id: testData.orderId || `order_test_${Date.now()}`
          },
          charges: {
            data: [{
              fees_details: [{ amount: 150 }] // $1.50 Stripe fee
            }]
          }
        };
        break;

      case 'payment_intent.payment_failed':
        mockEvent.data.object = {
          ...mockEvent.data.object,
          amount: testData.amount || 3000,
          currency: 'cad',
          last_payment_error: {
            message: testData.errorMessage || 'Your card was declined.'
          },
          metadata: {
            order_id: testData.orderId || `order_test_${Date.now()}`
          }
        };
        break;

      case 'account.updated':
        mockEvent.data.object = {
          ...mockEvent.data.object,
          id: testData.accountId || 'acct_test_123',
          charges_enabled: testData.chargesEnabled !== undefined ? testData.chargesEnabled : true,
          payouts_enabled: testData.payoutsEnabled !== undefined ? testData.payoutsEnabled : true,
          capabilities: {
            card_payments: testData.cardPayments || 'active',
            transfers: testData.transfers || 'active'
          },
          requirements: {
            currently_due: testData.currentlyDue || [],
            past_due: testData.pastDue || []
          },
          details_submitted: testData.detailsSubmitted !== undefined ? testData.detailsSubmitted : true
        };
        break;

      case 'payout.created':
        mockEvent.data.object = {
          ...mockEvent.data.object,
          id: testData.payoutId || `po_test_${Date.now()}`,
          amount: testData.amount || 4500, // $45.00
          currency: 'cad',
          destination: testData.accountId || 'acct_test_123',
          status: 'pending',
          arrival_date: Math.floor((Date.now() + 86400000) / 1000), // Tomorrow
          type: 'bank_account',
          method: 'standard'
        };
        break;

      case 'payout.paid':
        mockEvent.data.object = {
          ...mockEvent.data.object,
          id: testData.payoutId || `po_test_${Date.now()}`,
          amount: testData.amount || 4500,
          currency: 'cad',
          destination: testData.accountId || 'acct_test_123',
          status: 'paid'
        };
        break;

      default:
        return res.status(400).json({
          success: false,
          error: `Unsupported test event type: ${eventType}`,
          supportedTypes: [
            'payment_intent.succeeded',
            'payment_intent.payment_failed',
            'account.updated',
            'payout.created',
            'payout.paid'
          ]
        });
    }

    // Process the mock webhook event
    const result = await stripeService.handleWebhookEvent(mockEvent);

    res.json({
      success: true,
      data: {
        mockEvent: {
          id: mockEvent.id,
          type: mockEvent.type,
          created: mockEvent.created
        },
        processingResult: result,
        message: `Successfully simulated ${eventType} webhook`
      }
    });

  } catch (error) {
    console.error('❌ Error simulating webhook:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to simulate webhook event',
      message: error.message
    });
  }
}

/**
 * Get webhook processing statistics
 * GET /api/v1/webhook-test/stats
 */
async function getWebhookStats(req, res) {
  try {
    const { days = 7 } = req.query;
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    // Get webhook logs from database
    const { data: webhookLogs, error } = await supabase
      .from('stripe_webhook_logs')
      .select('event_type, status, created_at, processing_result')
      .gte('created_at', startDate)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    // Calculate statistics
    const stats = {
      totalEvents: webhookLogs?.length || 0,
      eventsByType: {},
      eventsByStatus: {},
      successRate: 0,
      averageProcessingTime: 0,
      errorSummary: []
    };

    let totalProcessingTime = 0;
    let processedCount = 0;
    const errorMessages = {};

    webhookLogs?.forEach(log => {
      // Count by type
      stats.eventsByType[log.event_type] = (stats.eventsByType[log.event_type] || 0) + 1;

      // Count by status
      stats.eventsByStatus[log.status] = (stats.eventsByStatus[log.status] || 0) + 1;

      // Calculate processing time if available
      if (log.processing_result?.processing_time_ms) {
        totalProcessingTime += log.processing_result.processing_time_ms;
        processedCount++;
      }

      // Collect error messages
      if (log.status === 'failed' && log.processing_result?.error) {
        const errorMsg = log.processing_result.error;
        errorMessages[errorMsg] = (errorMessages[errorMsg] || 0) + 1;
      }
    });

    // Calculate success rate
    const successfulEvents = stats.eventsByStatus.processed || 0;
    stats.successRate = stats.totalEvents > 0 
      ? Math.round((successfulEvents / stats.totalEvents) * 100) 
      : 100;

    // Calculate average processing time
    stats.averageProcessingTime = processedCount > 0 
      ? Math.round(totalProcessingTime / processedCount) 
      : 0;

    // Top error messages
    stats.errorSummary = Object.entries(errorMessages)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([error, count]) => ({ error, count }));

    res.json({
      success: true,
      data: {
        period: { days: parseInt(days), startDate },
        statistics: stats
      }
    });

  } catch (error) {
    console.error('❌ Error getting webhook stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get webhook statistics',
      message: error.message
    });
  }
}

/**
 * Test webhook endpoint health
 * GET /api/v1/webhook-test/health
 */
async function testWebhookHealth(req, res) {
  try {
    const healthChecks = {
      database: false,
      stripeService: false,
      notifications: false
    };

    // Test database connection
    try {
      const { data, error } = await supabase
        .from('stripe_webhook_logs')
        .select('count')
        .limit(1);
      
      healthChecks.database = !error;
    } catch (error) {
      console.error('Database health check failed:', error);
    }

    // Test Stripe service
    try {
      const testResult = typeof stripeService.handleWebhookEvent === 'function';
      healthChecks.stripeService = testResult;
    } catch (error) {
      console.error('Stripe service health check failed:', error);
    }

    // Test notifications system
    try {
      const { broadcastNotification } = require('./notifications.controller');
      healthChecks.notifications = typeof broadcastNotification === 'function';
    } catch (error) {
      console.error('Notifications health check failed:', error);
    }

    const allHealthy = Object.values(healthChecks).every(check => check);

    res.status(allHealthy ? 200 : 503).json({
      success: allHealthy,
      data: {
        overall: allHealthy ? 'healthy' : 'degraded',
        components: healthChecks,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Error checking webhook health:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check webhook health',
      message: error.message
    });
  }
}

module.exports = {
  simulateWebhookEvent,
  getWebhookStats,
  testWebhookHealth
};