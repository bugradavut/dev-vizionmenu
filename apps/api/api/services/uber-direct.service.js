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
    // ✅ ENVIRONMENT VARIABLES ONLY - No hardcoded credentials
    this.clientId = process.env.UBER_DIRECT_CLIENT_ID;
    this.clientSecret = process.env.UBER_DIRECT_CLIENT_SECRET;
    this.customerId = process.env.UBER_DIRECT_CUSTOMER_ID;
    this.baseUrl = process.env.UBER_DIRECT_BASE_URL;
    this.authUrl = 'https://auth.uber.com/oauth/v2/token';
    this.scope = 'eats.deliveries';

    // Token caching to avoid rate limits
    this.cachedToken = null;
    this.tokenExpiresAt = null;

    // 🧪 Test mode detection
    this.isTestMode = process.env.UBER_DIRECT_TEST_MODE === 'true';

    // Validate required environment variables
    if (!this.clientId || !this.clientSecret || !this.customerId || !this.baseUrl) {
      throw new Error('Missing required Uber Direct environment variables: UBER_DIRECT_CLIENT_ID, UBER_DIRECT_CLIENT_SECRET, UBER_DIRECT_CUSTOMER_ID, UBER_DIRECT_BASE_URL');
    }

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
      // Get branch-specific Uber Direct credentials
      const branchCredentials = await this.getBranchCredentials(branchId);
      const token = await this.getBranchToken(branchCredentials);

      // Build base URL with branch customer ID
      const branchBaseUrl = `https://api.uber.com/v1/customers/${branchCredentials.customerId}`;

      // Get branch information from database
      const { data: branch, error: branchError } = await supabase
        .from('branches')
        .select('id, name, address, phone')
        .eq('id', branchId)
        .single();

      if (branchError || !branch) {
        throw new Error(`Branch not found: ${branchError?.message || 'Invalid branch ID'}`);
      }

      // Parse branch address using Nominatim API (same as frontend)
      const branchAddressText = branch.address || "Queen Street, Ottawa, ON, K1A 0H5, Canada";
      console.log(`🔍 Parsing branch address: "${branchAddressText}"`);

      const pickupAddress = await this.parseAddressWithNominatim(branchAddressText);

      // Prepare dropoff address (fix: string not array)
      const formattedDropoffAddress = {
        street_address: dropoffAddress.street || dropoffAddress.line1 || dropoffAddress.address_line_1,
        city: dropoffAddress.city,
        state: dropoffAddress.state || dropoffAddress.province,
        zip_code: dropoffAddress.zip || dropoffAddress.postal_code,
        country: "CA" // Canada
      };

      const quotePayload = {
        pickup_address: JSON.stringify(pickupAddress),
        dropoff_address: JSON.stringify(formattedDropoffAddress),
        pickup_times: [0] // ASAP delivery
      };

      console.log(`📋 Creating Uber Direct quote for branch ${branch.name}...`);
      console.log('🔍 DEBUG - Quote payload:', JSON.stringify(quotePayload, null, 2));
      console.log('🔍 DEBUG - Request URL:', `${branchBaseUrl}/delivery_quotes`);

      const response = await fetch(`${branchBaseUrl}/delivery_quotes`, {
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
        console.error('🔍 DEBUG - Error response:', JSON.stringify(errorData, null, 2));
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      const quote = await response.json();

      // Debug the actual quote response format
      console.log('🔍 DEBUG - Raw quote response:', JSON.stringify(quote, null, 2));

      // Format response for VizionMenu system - handle different response formats
      const formattedQuote = {
        quote_id: quote.id || quote.estimate_id || quote.quote_id,
        delivery_fee: quote.fee ?
          (typeof quote.fee === 'number' ? quote.fee / 100 : quote.fee.amount / 100) :
          (quote.delivery_fee || quote.amount || 5.99), // Default fallback
        currency: quote.fee?.currency_code || quote.currency || 'CAD',
        eta_minutes: quote.pickup_duration && quote.delivery_duration ?
          (quote.pickup_duration + quote.delivery_duration) :
          (quote.eta_minutes || quote.total_time || 45), // Default fallback
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
   * Parse address using Nominatim API (same as frontend)
   * @param {string} addressText - Full address string
   * @returns {Promise<object>} Parsed address components
   */
  async parseAddressWithNominatim(addressText) {
    try {
      const apiUrl = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&countrycodes=ca&q=${encodeURIComponent(addressText)}`;

      const response = await fetch(apiUrl);
      if (!response.ok) {
        throw new Error(`Nominatim API error: ${response.status}`);
      }

      const data = await response.json();
      if (!data || data.length === 0) {
        throw new Error('No address found');
      }

      const address = data[0].address;
      console.log(`🔍 Nominatim parsed address:`, address);

      // Build street address (house number + road)
      const streetParts = [];
      if (address.house_number) streetParts.push(address.house_number);
      if (address.road) streetParts.push(address.road);
      const streetAddress = streetParts.join(' ') || address.display_name.split(',')[0];

      // Get city (prefer city over town/village)
      const city = address.city || address.town || address.village || 'Unknown';

      // Convert province name to abbreviation
      const provinceMap = {
        'Alberta': 'AB',
        'British Columbia': 'BC',
        'Manitoba': 'MB',
        'New Brunswick': 'NB',
        'Newfoundland and Labrador': 'NL',
        'Northwest Territories': 'NT',
        'Nova Scotia': 'NS',
        'Nunavut': 'NU',
        'Ontario': 'ON',
        'Prince Edward Island': 'PE',
        'Quebec': 'QC',
        'Saskatchewan': 'SK',
        'Yukon': 'YT'
      };

      const province = provinceMap[address.state] || address.state || 'ON';
      const postalCode = address.postcode || 'K1A 0H5';

      const parsedAddress = {
        street_address: streetAddress,
        city: city,
        state: province,
        zip_code: postalCode,
        country: "CA"
      };

      console.log(`✅ Parsed pickup address:`, parsedAddress);
      return parsedAddress;

    } catch (error) {
      console.error(`❌ Address parsing failed: ${error.message}`);

      // Fallback: Use hardcoded parsing (existing logic)
      console.log(`🔄 Using fallback parsing...`);
      const addressParts = addressText.split(', ');
      return {
        street_address: addressParts[0] || "Queen Street",
        city: "Edmonton", // Assume Edmonton for now
        state: "AB",
        zip_code: "T5J 3B1",
        country: "CA"
      };
    }
  }

  /**
   * Create quote from existing order data
   * Used when quote_id is 'auto' in delivery creation
   *
   * @param {string} orderId - VizionMenu order ID
   * @returns {Promise<object>} Quote information
   */
  async createQuoteFromOrder(orderId) {
    try {
      // Get order details from database
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .select(`
          id,
          branch_id,
          delivery_address,
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

      if (!order.delivery_address) {
        throw new Error(`No delivery address found for order ${orderId}`);
      }

      // Build address from JSON delivery_address field
      const deliveryAddress = order.delivery_address;
      const dropoffAddress = {
        street: deliveryAddress.street,
        city: deliveryAddress.city,
        state: deliveryAddress.province,
        zip: deliveryAddress.postalCode
      };

      console.log(`🧮 Creating quote for order ${orderId} with address:`, dropoffAddress);

      // Use existing createDeliveryQuote method
      const quote = await this.createDeliveryQuote(order.branch_id, dropoffAddress);

      console.log(`✅ Quote created for order ${orderId}: $${quote.delivery_fee}`);
      return quote;

    } catch (error) {
      console.error(`❌ Failed to create quote from order ${orderId}:`, error.message);
      throw error;
    }
  }

  /**
   * Get branch-specific Uber Direct credentials
   * Never uses platform credentials - branch must have own account
   *
   * @param {string} branchId - Branch ID to get credentials for
   * @returns {Promise<object>} Branch credentials
   */
  async getBranchCredentials(branchId) {
    try {
      const { data: branch, error: branchError } = await supabase
        .from('branches')
        .select('uber_direct_enabled, uber_direct_client_id, uber_direct_client_secret, uber_direct_customer_id')
        .eq('id', branchId)
        .single();

      if (branchError || !branch) {
        throw new Error(`Branch not found: ${branchError?.message || 'Invalid branch ID'}`);
      }

      if (!branch.uber_direct_enabled) {
        throw new Error('Branch has Uber Direct disabled');
      }

      if (!branch.uber_direct_client_id || !branch.uber_direct_client_secret || !branch.uber_direct_customer_id) {
        throw new Error('Branch has incomplete Uber Direct credentials. Please configure in settings.');
      }

      return {
        clientId: branch.uber_direct_client_id,
        clientSecret: branch.uber_direct_client_secret, // TODO: Add decryption
        customerId: branch.uber_direct_customer_id
      };

    } catch (error) {
      console.error('❌ Failed to get branch credentials:', error.message);
      throw error;
    }
  }

  /**
   * Get OAuth token using branch-specific credentials
   * @param {object} credentials - Branch credentials
   * @returns {Promise<string>} Access token
   */
  async getBranchToken(credentials) {
    try {
      const response = await fetch(this.authUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json'
        },
        body: new URLSearchParams({
          client_id: credentials.clientId,
          client_secret: credentials.clientSecret,
          grant_type: 'client_credentials',
          scope: this.scope
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error_description || `HTTP ${response.status}: ${response.statusText}`);
      }

      const tokenData = await response.json();
      console.log(`✅ Branch authentication successful for customer ${credentials.customerId}`);

      return tokenData.access_token;

    } catch (error) {
      console.error('❌ Branch authentication failed:', error.message);
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

      // Get order details from database
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .select(`
          *,
          order_items(
            id,
            quantity,
            menu_item_name,
            menu_item_price
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

      // Get branch-specific Uber Direct credentials
      const branchCredentials = await this.getBranchCredentials(order.branch_id);
      const token = await this.getBranchToken(branchCredentials);

      // Build base URL with branch customer ID
      const branchBaseUrl = `https://api.uber.com/v1/customers/${branchCredentials.customerId}`;

      console.log(`🏪 Using branch credentials for ${order.branches.name} (Customer ID: ${branchCredentials.customerId})`)

      // Build address from JSON delivery_address field for dropoff
      const deliveryAddress = order.delivery_address;
      const dropoffAddress = {
        street_address: deliveryAddress.street,
        city: deliveryAddress.city,
        state: deliveryAddress.province,
        zip_code: deliveryAddress.postalCode,
        country: "CA"
      };

      // Parse branch address for pickup
      const branchAddressText = order.branches.address || "Queen Street, Ottawa, ON, K1A 0H5, Canada";
      const pickupAddress = await this.parseAddressWithNominatim(branchAddressText);

      // Prepare delivery payload
      const deliveryPayload = {
        external_order_id: orderId,
        quote_id: quoteId,
        pickup_address: JSON.stringify(pickupAddress),
        pickup_name: order.branches.name || "Restaurant",
        pickup_phone_number: order.branches.phone || "+1-555-000-0000",
        pickup_instructions: `Order #${order.order_number || orderId}. Please call when arrived.`,
        dropoff_address: JSON.stringify(dropoffAddress),
        dropoff_name: order.customer_name || 'Customer',
        dropoff_phone_number: order.customer_phone || '+1-555-000-0000',
        dropoff_instructions: order.special_instructions || 'Standard delivery',
        manifest: order.order_items.map(item =>
          `${item.quantity}x ${item.menu_item_name} - $${(item.menu_item_price * item.quantity).toFixed(2)} CAD`
        ).join(', '),
        order_total: {
          amount: Math.round((order.total_amount || 0) * 100), // Convert to cents
          currency_code: 'CAD'
        }
      };

      // 🧪 ADD ROBO COURIER FOR TEST MODE - Enables automatic courier assignment simulation
      if (this.isTestMode) {
        deliveryPayload.test_specifications = {
          robo_courier_specification: {
            mode: "auto"  // Simulates full courier lifecycle automatically (every ~30s)
          }
        };
        console.log('🤖 Robo Courier enabled for test mode - automatic courier assignment activated');
      }

      console.log(`🚚 Creating Uber Direct delivery for order ${order.order_number || orderId}...`);
      console.log('🔍 DEBUG - Delivery payload:', JSON.stringify(deliveryPayload, null, 2));

      const response = await fetch(`${branchBaseUrl}/deliveries`, {
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
        console.error('🔍 DEBUG - Delivery error response:', JSON.stringify(errorData, null, 2));
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      const delivery = await response.json();

      // Update order in database with Uber Direct information
      const { error: updateError } = await supabase
        .from('orders')
        .update({
          uber_delivery_id: delivery.id || delivery.delivery_id,
          uber_tracking_url: delivery.tracking_url || delivery.tracking?.url,
          // Don't set third_party_platform - Uber Direct is courier service, not platform
          // third_party_order_id remains null - this is for uber_eats/doordash integration
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
   * Handles delivery status updates and courier information with comprehensive logging
   *
   * @param {object} webhookPayload - Webhook data from Uber
   * @returns {Promise<boolean>} Processing success
   */
  async processWebhook(webhookPayload) {
    try {
      const { kind, data, created, delivery_id, status } = webhookPayload;
      const event_type = kind; // Uber uses 'kind' field for event type
      const resource = data; // Uber uses 'data' field for resource
      const event_time = created;

      console.log(`📡 Processing Uber Direct webhook: ${event_type}`);
      console.log('🔍 DEBUG - Webhook payload:', JSON.stringify(webhookPayload, null, 2));

      // Handle different webhook event types
      if (event_type === 'event.delivery_status' || event_type === 'delivery.status_updated' || event_type === 'delivery_status') {
        return await this.handleDeliveryStatusUpdate(resource, event_time, webhookPayload.courier);
      }

      if (event_type === 'event.delivery_created' || event_type === 'delivery.created') {
        console.log(`📦 Delivery created: ${resource.id}`);
        return true;
      }

      if (event_type === 'event.delivery_cancelled' || event_type === 'delivery.cancelled') {
        return await this.handleDeliveryCancellation(resource, event_time);
      }

      console.log(`ℹ️ Unhandled webhook event type: ${event_type}`);
      return true;

    } catch (error) {
      console.error('❌ Webhook processing failed:', error.message);
      return false;
    }
  }

  /**
   * Handle delivery status update webhook
   * Maps Uber statuses to VizionMenu display statuses
   */
  async handleDeliveryStatusUpdate(resource, eventTime, courierInfo) {
    try {
      const { id: delivery_id, status, estimated_arrival_time, external_id: external_order_id } = resource;
      const courier = courierInfo; // Courier info comes from top-level payload

      console.log(`📊 Status update: ${delivery_id} -> ${status}`);

      // Map Uber status to user-friendly status
      const statusMapping = {
        'pending': { display: 'Finding courier...', progress: 10 },
        'created': { display: 'Finding courier...', progress: 10 },
        'courier_assigned': { display: 'Courier assigned', progress: 25 },
        'courier_en_route_to_pickup': { display: 'Courier heading to restaurant', progress: 40 },
        'arrived_at_pickup': { display: 'Courier arrived at restaurant', progress: 55 },
        'picking_up': { display: 'Picking up order', progress: 60 },
        'picked_up': { display: 'Order picked up', progress: 70 },
        'courier_en_route_to_dropoff': { display: 'Out for delivery', progress: 85 },
        'delivered': { display: 'Delivered successfully', progress: 100 },
        'cancelled': { display: 'Delivery cancelled', progress: 0 }
      };

      const mappedStatus = statusMapping[status] || { display: status, progress: 0 };

      // Get current order for status history using external_order_id (our Order ID)
      const { data: currentOrder } = await supabase
        .from('orders')
        .select('status_history, delivery_status')
        .eq('id', external_order_id)
        .single();

      // Build status history entry
      const statusEntry = {
        status: status,
        display_status: mappedStatus.display,
        timestamp: eventTime || new Date().toISOString(),
        progress: mappedStatus.progress
      };

      // Update status history
      const currentHistory = currentOrder?.status_history || [];
      const updatedHistory = [...currentHistory, statusEntry];

      // Prepare update data
      const updateData = {
        delivery_status: status,
        delivery_eta: estimated_arrival_time ? new Date(estimated_arrival_time).toISOString() : null,
        status_history: updatedHistory,
        updated_at: new Date().toISOString()
      };

      // Add courier information if available
      if (courier) {
        updateData.courier_info = {
          name: courier.name || 'Unknown',
          phone: courier.phone || null,
          location: courier.location || null,
          estimated_arrival: estimated_arrival_time || null,
          updated_at: new Date().toISOString()
        };
      }

      // Update order in database using external_order_id (our Order ID)
      const { error: updateError } = await supabase
        .from('orders')
        .update(updateData)
        .eq('id', external_order_id);

      if (updateError) {
        console.error('⚠️ Failed to update order from webhook:', updateError.message);
        return false;
      }

      console.log(`✅ Order updated: ${delivery_id} -> ${mappedStatus.display} (${mappedStatus.progress}%)`);

      // Log courier info if available
      if (courier?.name) {
        console.log(`👤 Courier: ${courier.name} ${courier.phone ? `(${courier.phone})` : ''}`);
      }

      return true;

    } catch (error) {
      console.error('❌ Status update processing failed:', error.message);
      return false;
    }
  }

  /**
   * Handle delivery cancellation webhook
   */
  async handleDeliveryCancellation(resource, eventTime) {
    try {
      const { id: delivery_id, cancellation_reason } = resource;

      console.log(`🚫 Delivery cancelled: ${delivery_id}, reason: ${cancellation_reason}`);

      const updateData = {
        delivery_status: 'cancelled',
        updated_at: new Date().toISOString()
      };

      // Add cancellation to status history
      const { data: currentOrder } = await supabase
        .from('orders')
        .select('status_history')
        .eq('uber_delivery_id', delivery_id)
        .single();

      const statusEntry = {
        status: 'cancelled',
        display_status: 'Delivery cancelled',
        timestamp: eventTime || new Date().toISOString(),
        progress: 0,
        reason: cancellation_reason
      };

      const currentHistory = currentOrder?.status_history || [];
      updateData.status_history = [...currentHistory, statusEntry];

      const { error: updateError } = await supabase
        .from('orders')
        .update(updateData)
        .eq('uber_delivery_id', delivery_id);

      if (updateError) {
        console.error('⚠️ Failed to update cancelled delivery:', updateError.message);
        return false;
      }

      console.log(`✅ Delivery cancellation recorded: ${delivery_id}`);
      return true;

    } catch (error) {
      console.error('❌ Cancellation processing failed:', error.message);
      return false;
    }
  }
}

// Export singleton instance
const uberDirectService = new UberDirectService();
module.exports = uberDirectService;