// =====================================================
// UBER EATS WEBHOOK ROUTES
// Receives order notifications and events from Uber Eats
// =====================================================

const express = require('express');
const router = express.Router();
const crypto = require('crypto');

/**
 * Verify webhook signature from Uber
 */
function verifyWebhookSignature(req) {
  const signature = req.headers['x-uber-signature'];
  const signingKey = process.env.UBER_WEBHOOK_SECRET;

  if (!signature || !signingKey) {
    return false;
  }

  // Uber uses HMAC-SHA256 for webhook signatures
  const body = JSON.stringify(req.body);
  const hmac = crypto.createHmac('sha256', signingKey);
  hmac.update(body);
  const expectedSignature = hmac.digest('hex');

  return signature === expectedSignature;
}

/**
 * Main webhook endpoint - receives all Uber Eats events
 * POST /api/v1/uber-eats/webhooks
 */
router.post('/', async (req, res) => {
  try {
    // Verify webhook signature
    if (!verifyWebhookSignature(req)) {
      console.error('⚠️ Invalid webhook signature from Uber Eats');
      return res.status(401).json({ error: 'Invalid signature' });
    }

    const event = req.body;
    const eventType = event.event_type;

    console.log(`📥 Uber Eats webhook received: ${eventType}`);
    console.log('Event data:', JSON.stringify(event, null, 2));

    // Acknowledge webhook immediately (Uber requires 200 response within seconds)
    res.status(200).json({ received: true });

    // Process webhook asynchronously
    processWebhookAsync(event).catch(error => {
      console.error('Webhook processing error:', error);
    });

  } catch (error) {
    console.error('Webhook handler error:', error);
    // Still return 200 to prevent Uber from retrying
    res.status(200).json({ received: true, error: error.message });
  }
});

/**
 * Process webhook events asynchronously
 */
async function processWebhookAsync(event) {
  const { event_type, resource_href, meta } = event;
  const storeId = meta?.user_id; // Store UUID

  switch (event_type) {
    case 'orders.notification':
      await handleNewOrder(resource_href, storeId);
      break;

    case 'orders.cancel':
    case 'orders.failure':
      await handleOrderCancellation(resource_href, storeId);
      break;

    case 'store.provisioned':
      await handleStoreProvisioned(storeId, event);
      break;

    case 'store.deprovisioned':
      await handleStoreDeprovisioned(storeId, event);
      break;

    default:
      console.log(`ℹ️ Unhandled event type: ${event_type}`);
  }
}

/**
 * Handle new order notification
 */
async function handleNewOrder(resourceHref, storeId) {
  console.log(`🆕 New order for store: ${storeId}`);
  console.log(`Order details URL: ${resourceHref}`);

  // TODO: Fetch order details from resourceHref
  // TODO: Create order in database
  // TODO: Send notification to restaurant
  // TODO: Accept or deny order via API
}

/**
 * Handle order cancellation
 */
async function handleOrderCancellation(resourceHref, storeId) {
  console.log(`❌ Order cancelled for store: ${storeId}`);
  console.log(`Order details URL: ${resourceHref}`);

  // TODO: Update order status in database
  // TODO: Notify restaurant
}

/**
 * Handle store provisioned event
 */
async function handleStoreProvisioned(storeId, event) {
  console.log(`✅ Store provisioned: ${storeId}`);

  // TODO: Update integration status in database
}

/**
 * Handle store deprovisioned event
 */
async function handleStoreDeprovisioned(storeId, event) {
  console.log(`🔌 Store deprovisioned: ${storeId}`);

  // TODO: Update integration status in database
}

/**
 * Test endpoint to manually trigger webhook processing
 * POST /api/v1/uber-eats/webhooks/test
 */
router.post('/test', async (req, res) => {
  try {
    console.log('🧪 Test webhook triggered');

    const mockEvent = {
      event_id: 'test-' + Date.now(),
      event_time: new Date().toISOString(),
      event_type: 'orders.notification',
      meta: {
        user_id: 'test-store-id',
        resource_id: 'test-order-id'
      },
      resource_href: 'https://api.uber.com/v1/eats/order/test-order-id'
    };

    await processWebhookAsync(mockEvent);

    res.json({
      success: true,
      message: 'Test webhook processed',
      event: mockEvent
    });

  } catch (error) {
    console.error('Test webhook error:', error);
    res.status(500).json({
      error: 'Test failed',
      message: error.message
    });
  }
});

module.exports = router;
