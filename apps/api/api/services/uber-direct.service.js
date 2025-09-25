/**
 * Uber Direct Service
 * Handles API communication with Uber Direct platform
 * ✅ SAFE TEST MODE - Uses sandbox credentials, no real deliveries
 */

const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Uber Direct Service Class
 * Manages OAuth authentication, quote generation, and delivery creation
 */
class UberDirectService {
  constructor() {
    // ✅ TEST CREDENTIALS - Safe for development
    this.clientId = process.env.UBER_DIRECT_CLIENT_ID || 'zEQd8AIyG2_iwvfmFaG3aDbIvl_3BnKF';
    this.clientSecret = process.env.UBER_DIRECT_CLIENT_SECRET || 'ZUT3J3KLxC32NQulzwusYFBc9QXw0Q-ciTpLeNGs';
    this.customerId = process.env.UBER_DIRECT_CUSTOMER_ID || '7c307e48-95f3-5205-b5c7-ec8b0074339a';
    this.baseUrl = process.env.UBER_DIRECT_BASE_URL || 'https://api.uber.com/v1/customers/7c307e48-95f3-5205-b5c7-ec8b0074339a';
    this.authUrl = 'https://auth.uber.com/oauth/v2/token';
    this.scope = 'eats.deliveries';

    // Token caching to avoid rate limits
    this.cachedToken = null;
    this.tokenExpiresAt = null;

    // 🧪 Test mode detection
    this.isTestMode = process.env.UBER_DIRECT_TEST_MODE === 'true' ||
                      this.customerId === '7c307e48-95f3-5205-b5c7-ec8b0074339a';

    console.log(`🧪 Uber Direct Service initialized in ${this.isTestMode ? 'TEST' : 'PRODUCTION'} mode`);
  }

  /**
   * Get valid OAuth access token
   * Implements caching to avoid rate limits (30-day token lifecycle)
   *
   * @returns {Promise<string>} Valid access token
   */
  async getValidToken() {
    try {
      // Check if cached token is still valid (with 5-minute buffer)
      const now = Date.now();
      const bufferTime = 5 * 60 * 1000; // 5 minutes

      if (this.cachedToken && this.tokenExpiresAt && now < (this.tokenExpiresAt - bufferTime)) {
        console.log('🔄 Using cached Uber Direct token');
        return this.cachedToken;
      }

      // Generate new token
      console.log('🔑 Generating new Uber Direct token...');
      return await this.authenticateWithUberDirect();

    } catch (error) {
      console.error('❌ Uber Direct token error:', error.message);
      throw new Error(`Authentication failed: ${error.message}`);
    }
  }

  /**
   * Authenticate with Uber Direct OAuth 2.0
   * Critical: Token valid for 30 days, Rate limit: 100 tokens/hour
   *
   * @returns {Promise<string>} Access token
   */
  async authenticateWithUberDirect() {
    try {
      const response = await fetch(this.authUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json'
        },
        body: new URLSearchParams({
          client_id: this.clientId,
          client_secret: this.clientSecret,
          grant_type: 'client_credentials',
          scope: this.scope
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error_description || `HTTP ${response.status}: ${response.statusText}`);
      }

      const tokenData = await response.json();

      // Cache token with expiration (30 days - 2592000 seconds)
      this.cachedToken = tokenData.access_token;
      this.tokenExpiresAt = Date.now() + (tokenData.expires_in * 1000);

      console.log(`✅ Uber Direct authentication successful (${this.isTestMode ? 'TEST' : 'PROD'} mode)`);
      console.log(`📅 Token expires in ${Math.round(tokenData.expires_in / 86400)} days`);

      return this.cachedToken;

    } catch (error) {
      console.error('❌ Uber Direct authentication failed:', error.message);
      throw error;
    }
  }

  /**
   * Create delivery quote for given addresses
   * Quote validity: 15 minutes
   *
   * @param {string} branchId - Branch ID for pickup location
   * @param {object} dropoffAddress - Customer delivery address
   * @returns {Promise<object>} Quote with price and ETA
   */
  async createDeliveryQuote(branchId, dropoffAddress) {
    try {
      const token = await this.getValidToken();

      // Get branch information from database
      const { data: branch, error: branchError } = await supabase
        .from('branches')
        .select('id, name, address, phone')
        .eq('id', branchId)
        .single();

      if (branchError || !branch) {
        throw new Error(`Branch not found: ${branchError?.message || 'Invalid branch ID'}`);
      }

      // Prepare pickup address from branch data
      const pickupAddress = {
        street_address: [branch.address?.street || branch.address?.line1 || "425 Market St"],
        city: branch.address?.city || "San Francisco",
        state: branch.address?.state || branch.address?.province || "CA",
        zip_code: branch.address?.zip || branch.address?.postal_code || "94105",
        country: branch.address?.country || "US"
      };

      // Prepare dropoff address
      const formattedDropoffAddress = {
        street_address: [dropoffAddress.street || dropoffAddress.line1 || dropoffAddress.address_line_1],
        city: dropoffAddress.city,
        state: dropoffAddress.state || dropoffAddress.province,
        zip_code: dropoffAddress.zip || dropoffAddress.postal_code,
        country: dropoffAddress.country || "US"
      };

      const quotePayload = {
        pickup_address: pickupAddress,
        dropoff_address: formattedDropoffAddress,
        pickup_times: [0] // ASAP delivery
      };

      console.log(`📋 Creating Uber Direct quote for branch ${branch.name}...`);

      const response = await fetch(`${this.baseUrl}/delivery_quotes`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(quotePayload)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      const quote = await response.json();

      // Format response for VizionMenu system
      const formattedQuote = {
        quote_id: quote.id || quote.estimate_id,
        delivery_fee: quote.fee ? (quote.fee.amount / 100) : 0, // Convert cents to dollars
        currency: quote.fee?.currency_code || 'USD',
        eta_minutes: quote.pickup_duration ? (quote.pickup_duration + quote.delivery_duration) : 45,
        dropoff_eta: quote.dropoff_eta,
        expires_at: quote.expires || new Date(Date.now() + 15 * 60000).toISOString(), // 15 minutes
        pickup_duration: quote.pickup_duration || 15,
        delivery_duration: quote.delivery_duration || 30,
        raw_response: this.isTestMode ? quote : undefined // Include raw response in test mode
      };

      console.log(`✅ Quote generated: $${formattedQuote.delivery_fee} (ETA: ${formattedQuote.eta_minutes} min)`);

      return formattedQuote;

    } catch (error) {
      console.error('❌ Uber Direct quote error:', error.message);
      throw error;
    }
  }

  /**
   * Create delivery order with Uber Direct
   * Dispatches courier for pickup and delivery
   *
   * @param {string} orderId - VizionMenu order ID
   * @param {string} quoteId - Previously generated quote ID
   * @returns {Promise<object>} Delivery information
   */
  async createDelivery(orderId, quoteId) {
    try {
      const token = await this.getValidToken();

      // Get order details from database
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .select(`
          *,
          order_items(
            id,
            quantity,
            menu_item_name,
            menu_item_price,
            total_price,
            special_requests
          ),
          branches(
            id,
            name,
            address,
            phone
          )
        `)
        .eq('id', orderId)
        .single();

      if (orderError || !order) {
        throw new Error(`Order not found: ${orderError?.message || 'Invalid order ID'}`);
      }

      // Prepare delivery payload
      const deliveryPayload = {
        external_order_id: orderId,
        quote_id: quoteId,
        pickup_contact: {
          first_name: order.branches.name || "Restaurant",
          phone: order.branches.phone || "+1-555-000-0000"
        },
        pickup_instructions: `Order #${order.order_number || orderId}. Please call when arrived.`,
        dropoff_contact: {
          first_name: order.customer_name?.split(' ')[0] || 'Customer',
          last_name: order.customer_name?.split(' ').slice(1).join(' ') || '',
          email: order.customer_email || '',
          phone: order.customer_phone || ''
        },
        dropoff_instructions: order.special_instructions || 'Standard delivery',
        order_items: order.order_items.map(item => ({
          name: item.menu_item_name,
          quantity: item.quantity,
          price: Math.round(item.menu_item_price * 100), // Convert to cents
          currency_code: 'CAD'
        })),
        order_total: {
          amount: Math.round((order.total_amount || 0) * 100), // Convert to cents
          currency_code: 'CAD'
        }
      };

      console.log(`🚚 Creating Uber Direct delivery for order ${order.order_number || orderId}...`);

      const response = await fetch(`${this.baseUrl}/deliveries`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(deliveryPayload)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      const delivery = await response.json();

      // Update order in database with Uber Direct information
      const { error: updateError } = await supabase
        .from('orders')
        .update({
          uber_delivery_id: delivery.id || delivery.delivery_id,
          third_party_platform: 'uber_direct',
          third_party_order_id: delivery.id || delivery.delivery_id,
          delivery_tracking_url: delivery.tracking_url || delivery.tracking?.url,
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId);

      if (updateError) {
        console.warn('⚠️ Failed to update order with Uber delivery info:', updateError.message);
      }

      const deliveryInfo = {
        uber_delivery_id: delivery.id || delivery.delivery_id,
        tracking_url: delivery.tracking_url || delivery.tracking?.url,
        status: delivery.status || 'created',
        courier_info: delivery.courier || null,
        estimated_arrival: delivery.dropoff_eta || delivery.estimated_arrival_time,
        raw_response: this.isTestMode ? delivery : undefined // Include raw response in test mode
      };

      console.log(`✅ Uber Direct delivery created: ${deliveryInfo.uber_delivery_id}`);
      console.log(`📍 Tracking URL: ${deliveryInfo.tracking_url || 'N/A'}`);

      return deliveryInfo;

    } catch (error) {
      console.error('❌ Uber Direct delivery creation failed:', error.message);
      throw error;
    }
  }

  /**
   * Cancel delivery (for testing purposes)
   *
   * @param {string} deliveryId - Uber delivery ID
   * @returns {Promise<object>} Cancellation result
   */
  async cancelDelivery(deliveryId) {
    try {
      const token = await this.getValidToken();

      console.log(`🚫 Cancelling Uber Direct delivery: ${deliveryId}...`);

      const response = await fetch(`${this.baseUrl}/deliveries/${deliveryId}/cancel`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      console.log(`✅ Delivery cancelled successfully: ${deliveryId}`);

      return {
        delivery_id: deliveryId,
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        raw_response: this.isTestMode ? result : undefined
      };

    } catch (error) {
      console.error('❌ Uber Direct cancellation failed:', error.message);
      throw error;
    }
  }

  /**
   * Process webhook payload from Uber Direct
   * Handles delivery status updates and courier information
   *
   * @param {object} webhookPayload - Webhook data from Uber
   * @returns {Promise<boolean>} Processing success
   */
  async processWebhook(webhookPayload) {
    try {
      const { event_type, resource, event_time } = webhookPayload;

      console.log(`📡 Processing Uber Direct webhook: ${event_type}`);

      if (event_type === 'delivery_status') {
        const { order_id, status, courier, estimated_arrival_time } = resource;

        // Update order in database
        const updateData = {
          delivery_status: status,
          updated_at: new Date().toISOString()
        };

        if (courier) {
          updateData.courier_info = {
            name: courier.name,
            phone: courier.phone,
            location: courier.location,
            estimated_arrival: estimated_arrival_time
          };
        }

        const { error: updateError } = await supabase
          .from('orders')
          .update(updateData)
          .eq('uber_delivery_id', order_id);

        if (updateError) {
          console.warn('⚠️ Failed to update order from webhook:', updateError.message);
          return false;
        }

        console.log(`✅ Order updated from webhook: ${order_id} -> ${status}`);
      }

      return true;

    } catch (error) {
      console.error('❌ Webhook processing failed:', error.message);
      return false;
    }
  }
}

// Export singleton instance
const uberDirectService = new UberDirectService();
module.exports = uberDirectService;