# Uber Direct Integration Plan - VizionMenu (REVISED)

**🚀 STREAMLINED implementation roadmap based on actual VizionMenu infrastructure analysis**

---

## 🎯 **PROJECT OVERVIEW**

### **Objective**
Integrate Uber Direct white-label delivery service into VizionMenu's **existing delivery infrastructure** to provide seamless delivery experience while maintaining VizionMenu branding.

### **Key Benefits**
- **White-label delivery**: Customers see VizionMenu brand, not Uber
- **New revenue stream**: Delivery service without marketplace commissions
- **Enhanced customer experience**: Real-time tracking and delivery options
- **Competitive advantage**: Own delivery capability vs pickup-only restaurants

### **✅ CRITICAL DISCOVERY**
VizionMenu **ALREADY HAS** complete delivery infrastructure! This integration leverages existing systems instead of building from scratch.

### **🔐 UBER DIRECT ACCESS MODEL**

**CRITICAL:** VizionMenu operates as **Platform Partner** with Uber Direct!

**What This Means:**
- ✅ **Single Master Account**: VizionMenu has one Uber Direct account for ALL restaurants
- ✅ **No Individual Signups**: Restaurant owners do NOT need to create Uber accounts
- ✅ **Unified Integration**: One API integration serves all VizionMenu restaurants
- ✅ **Revenue Model**: VizionMenu can take commission from delivery fees
- ✅ **Simplified Management**: Centralized billing and credential management

### **Test Environment Credentials (Platform Master Account)**
```
Customer ID: 7c307e48-95f3-5205-b5c7-ec8b0074339a
Client ID: zEQd8AIyG2_iwvfmFaG3aDbIvl_3BnKF
Client Secret: ZUT3J3KLxC32NQulzwusYFBc9QXw0Q-ciTpLeNGs
Base URL: https://api.uber.com/v1/customers/7c307e48-95f3-5205-b5c7-ec8b0074339a
Auth URL: https://auth.uber.com/oauth/v2/token
Scope: eats.deliveries
```

---

## 🏗️ **EXISTING ARCHITECTURE ANALYSIS**

### **✅ ALREADY IMPLEMENTED - NO CHANGES NEEDED:**
```
VizionMenu Order Flow (PERFECT for Uber Direct):
/order/[chainSlug] → /order/[chainSlug]/review → /order/[chainSlug]/confirmation

Existing Delivery Support:
✅ order_type: 'delivery' (already implemented)
✅ delivery_address: JSONB field (already exists)
✅ delivery_fee: NUMERIC field (already exists)
✅ Customer info collection (delivery address ready)
✅ Real-time order tracking (/orders/[orderId])
✅ Platform sync infrastructure (/api/v1/platform-sync/)
```

### **🔥 EXISTING DATABASE STRUCTURE - PERFECT MATCH:**
```sql
-- orders table ALREADY has everything needed:
order_type TEXT -- 'dine_in', 'takeaway', 'delivery' ✅
delivery_address JSONB -- Address storage READY ✅
delivery_fee NUMERIC -- Delivery fee field EXISTS ✅
third_party_platform TEXT -- Can add 'uber_direct' ✅
third_party_order_id TEXT -- External order ID READY ✅

-- platform_item_mappings table ALREADY exists for 3rd party platforms ✅
```

---

## ⚡ **STREAMLINED IMPLEMENTATION - 2 WEEKS TOTAL**

### **WEEK 1: Backend Integration (Leverage Existing Infrastructure)**

#### **Day 1-2: Extend Existing Platform-Sync Service**
```javascript
// Extend existing apps/api/api/services/uber-eats.service.js
// OR create new service following exact same pattern
// apps/api/api/services/uber-direct.service.js

const uberDirectService = {
  // OAuth & Token Management (standard pattern)
  async authenticateWithUberDirect() {
    // Standard OAuth2 client_credentials flow
    // Cache token in Redis/memory for 30 days
  },
  
  // Delivery Quote (core feature)
  async createDeliveryQuote(branchId, deliveryAddress) {
    // GET quote from Uber Direct API
    // Return pricing and ETA info
  },
  
  // Create Delivery (integrate with existing order flow)
  async createDelivery(orderId, quoteId) {
    // Create delivery using existing order data
    // Update orders.third_party_platform = 'uber_direct'
  }
}
```

#### **Day 3-4: Minimal Database Updates**
```sql
-- MINIMAL changes to existing structure:

-- 1. Extend platform constraint (30 seconds)
ALTER TABLE platform_item_mappings DROP CONSTRAINT IF EXISTS platform_item_mappings_platform_check;
ALTER TABLE platform_item_mappings ADD CONSTRAINT platform_item_mappings_platform_check 
    CHECK (platform IN ('uber_eats', 'doordash', 'skipthedishes', 'uber_direct'));

-- 2. Optional: Add Uber-specific fields to existing orders table (5 minutes)
ALTER TABLE orders ADD COLUMN uber_direct_quote_id TEXT;
ALTER TABLE orders ADD COLUMN courier_info JSONB;
ALTER TABLE orders ADD COLUMN delivery_tracking_url TEXT;

-- THAT'S IT! No new tables needed - leverage existing structure
```

#### **Day 5: API Routes & Environment**
```javascript
// Add to existing apps/api/api/routes/platform-sync.routes.js
router.post('/uber-direct/quote', uberDirectController.getQuote);
router.post('/uber-direct/delivery', uberDirectController.createDelivery);
router.post('/uber-direct/webhooks', uberDirectController.processWebhook);

// Environment variables
UBER_DIRECT_CLIENT_ID=zEQd8AIyG2_iwvfmFaG3aDbIvl_3BnKF
UBER_DIRECT_CLIENT_SECRET=ZUT3J3KLxC32NQulzwusYFBc9QXw0Q-ciTpLeNGs
UBER_DIRECT_CUSTOMER_ID=7c307e48-95f3-5205-b5c7-ec8b0074339a
```

**Week 1 Deliverables:**
- [ ] Uber Direct service integrated with existing platform-sync pattern
- [ ] OAuth authentication and token management
- [ ] Quote and delivery creation endpoints
- [ ] Minimal database constraint updates
- [ ] Integration with existing order system

---

### **WEEK 2: Frontend Enhancement (Leverage Existing Delivery Option)**

#### **Day 1-3: Enhance Existing Order Review Components**
```tsx
// EXISTING: apps/web/src/app/order/[chainSlug]/review/page.tsx
// EXISTING: apps/web/src/app/order/review/components/customer-information-section.tsx

// ✅ DELIVERY OPTION ALREADY EXISTS!
type OrderType = 'dine_in' | 'takeaway' | 'delivery' // ← ALREADY IMPLEMENTED

// Just enhance existing delivery option with Uber Direct integration:
const handleOrderTypeChange = (orderType) => {
  if (orderType === 'delivery') {
    // NEW: Get Uber Direct quote when delivery selected
    fetchUberDirectQuote(deliveryAddress);
  }
};
```

#### **Day 4-5: Add Quote Display to Existing Components**
```tsx
// Enhance existing order-review-container.tsx
const [deliveryQuote, setDeliveryQuote] = useState(null);
const [quoteLoading, setQuoteLoading] = useState(false);

// Add quote display to existing delivery option
{selectedOrderType === 'delivery' && (
  <div className="delivery-quote-section">
    <div className="quote-pricing">
      <span>Delivery Fee: ${deliveryQuote?.total || 'Calculating...'}</span>
      <span>ETA: {deliveryQuote?.eta || 'Estimating...'}</span>
    </div>
    {quoteLoading && <div>Getting quote...</div>}
  </div>
)}
```

#### **Day 6-7: Real-time Updates Integration**
```tsx
// Leverage existing real-time infrastructure
// EXISTING: apps/web/src/app/orders/[orderId]/page.tsx

// Add delivery status to existing order tracking
const [deliveryStatus, setDeliveryStatus] = useState(null);

// Use existing Supabase real-time subscription pattern
useEffect(() => {
  const subscription = supabase
    .channel(`order_${orderId}`)
    .on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public', 
      table: 'orders',
      filter: `id=eq.${orderId}`
    }, (payload) => {
      // Handle delivery status updates
      if (payload.new.third_party_platform === 'uber_direct') {
        setDeliveryStatus(payload.new.courier_info);
      }
    })
    .subscribe();
}, [orderId]);
```

**Week 2 Deliverables:**
- [ ] Enhanced existing delivery option with Uber Direct quotes
- [ ] Real-time quote display in order review
- [ ] Integration with existing order tracking system
- [ ] Webhook processing for delivery status updates
- [ ] Customer notification system leveraging existing infrastructure

---

## 🎯 **DETAILED IMPLEMENTATION GUIDE**

### **Backend Service Implementation**
```javascript
// apps/api/api/services/uber-direct.service.js (NEW)
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const uberDirectService = {
  // OAuth Authentication (30-day token lifecycle) 
  async authenticateWithUberDirect() {
    // CRITICAL: Token lifecycle and rate limiting
    // - Token valid for 30 days (2,592,000 seconds)
    // - Rate limit: 100 tokens/hour  
    // - Max 100 tokens exist - oldest gets invalidated
    // - MUST cache token, do NOT regenerate per request
    
    const response = await fetch('https://auth.uber.com/oauth/v2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.UBER_DIRECT_CLIENT_ID,
        client_secret: process.env.UBER_DIRECT_CLIENT_SECRET,
        grant_type: 'client_credentials',
        scope: 'eats.deliveries'
      })
    });
    
    const { access_token, expires_in, token_type } = await response.json();
    
    // Response format:
    // {
    //   "access_token": "xxx",
    //   "token_type": "Bearer", 
    //   "expires_in": 2592000,  // 30 days in seconds
    //   "scope": "eats.deliveries"
    // }
    
    // Cache token with expiry - critical for rate limiting
    await this.cacheToken(access_token, expires_in);
    return access_token;
  },

  // Get Delivery Quote (15-minute validity)
  async createDeliveryQuote(branchId, dropoffAddress) {
    const token = await this.getValidToken();
    
    // Get branch store_id from branches table  
    const { data: branch } = await supabase
      .from('branches')
      .select('id, name, address')
      .eq('id', branchId)
      .single();
    
    // CRITICAL: Request format - all endpoints except auth use application/json
    const response = await fetch(`${process.env.UBER_DIRECT_BASE_URL}/delivery_quotes`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        pickup_address: {
          street_address: [branch.address.street || "425 Market St"],
          city: branch.address.city || "San Francisco",
          state: branch.address.state || "CA", 
          zip_code: branch.address.zip || "94105",
          country: "US"
        },
        dropoff_address: {
          street_address: [dropoffAddress.street],
          city: dropoffAddress.city,
          state: dropoffAddress.state,
          zip_code: dropoffAddress.zip,
          country: "US"
        },
        pickup_times: [0] // ASAP delivery
      })
    });
    
    const quote = await response.json();
    
    // Response format:
    // {
    //   "kind": "delivery_quote",
    //   "id": "quote_12345",
    //   "created": "2025-01-07T10:30:00Z",
    //   "expires": "2025-01-07T10:45:00Z",  // 15 minutes validity!
    //   "fee": {
    //     "amount": 558,  // CENTS format ($5.58)
    //     "currency_code": "USD"
    //   },
    //   "dropoff_eta": "2025-01-07T11:14:00Z",
    //   "pickup_duration": 18,      // minutes to pickup
    //   "delivery_duration": 44,    // total delivery time
    //   "dropoff_deadline": "2025-01-07T11:30:00Z"
    // }
    
    return quote;
  },

  // Create Delivery (after order confirmation)
  async createDelivery(orderId, quoteId) {
    const token = await this.getValidToken();
    
    // Get order details from existing orders table
    const { data: order } = await supabase
      .from('orders')
      .select(`
        *,
        order_items(*)
      `)
      .eq('id', orderId)
      .single();
    
    const deliveryData = {
      estimate_id: quoteId,
      external_order_id: orderId,
      order_items: order.order_items.map(item => ({
        name: item.menu_item_name,
        quantity: item.quantity,
        price: Math.round(item.menu_item_price * 100), // Convert to cents
        currency_code: 'CAD'
      })),
      pickup: {
        store_id: order.branch_id,
        instructions: 'Call when arrived'
      },
      dropoff: {
        address: order.delivery_address,
        contact: {
          first_name: order.customer_name?.split(' ')[0] || 'Customer',
          last_name: order.customer_name?.split(' ')[1] || '',
          email: order.customer_email,
          phone: order.customer_phone
        },
        instructions: order.special_instructions || 'Standard delivery'
      }
    };
    
    const response = await fetch(`${process.env.UBER_DIRECT_BASE_URL}/deliveries`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(deliveryData)
    });
    
    const delivery = await response.json();
    
    // Update existing orders table with Uber Direct info
    await supabase
      .from('orders')
      .update({
        third_party_platform: 'uber_direct',
        third_party_order_id: delivery.order_id,
        uber_direct_quote_id: quoteId,
        delivery_tracking_url: delivery.order_tracking_url
      })
      .eq('id', orderId);
    
    return delivery;
  }
};
```

### **Controller Implementation**
```javascript
// Add to existing apps/api/api/controllers/platform-sync.controller.js

// Get delivery quote for frontend
async function getUberDirectQuote(req, res) {
  try {
    const { branch_id, dropoff_address } = req.body;
    const quote = await uberDirectService.createDeliveryQuote(branch_id, dropoff_address);
    
    res.json({
      success: true,
      data: {
        quote_id: quote.estimate_id,
        delivery_fee: quote.estimates[0].delivery_fee.total / 100, // Convert to dollars
        eta_minutes: Math.round((quote.estimates[0].etd - Date.now()) / 60000),
        expires_at: quote.expires_at
      }
    });
  } catch (error) {
    console.error('Uber Direct quote error:', error);
    res.status(500).json({
      error: 'Quote failed',
      message: error.message
    });
  }
}

// Create delivery after order completion
async function createUberDirectDelivery(req, res) {
  try {
    const { order_id, quote_id } = req.body;
    const delivery = await uberDirectService.createDelivery(order_id, quote_id);
    
    res.json({
      success: true,
      data: {
        uber_delivery_id: delivery.order_id,
        tracking_url: delivery.order_tracking_url,
        status: 'created'
      }
    });
  } catch (error) {
    console.error('Uber Direct delivery creation error:', error);
    res.status(500).json({
      error: 'Delivery creation failed', 
      message: error.message
    });
  }
}

// Process Uber Direct webhooks
async function processUberDirectWebhook(req, res) {
  try {
    // CRITICAL: Verify webhook signature with HMAC-SHA256
    const signature = req.headers['x-uber-signature'];
    const isValid = verifyUberWebhookSignature(req.body, signature);
    
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid signature' });
    }
    
    const { event_type, event_time, resource } = req.body;
    
    // Webhook event types: delivery_status, courier_update
    if (event_type === 'delivery_status') {
      // Status values: pending, pickup, pickup_complete, dropoff, delivered, canceled, returned
      
      // Real-time webhook payload example:
      // {
      //   "event_type": "delivery_status",
      //   "event_time": "2025-01-07T10:45:00Z",
      //   "resource": {
      //     "order_id": "delivery_abc123",
      //     "status": "pickup_complete",
      //     "courier": {
      //       "name": "Mike Smith", 
      //       "phone": "+1-555-987-6543",
      //       "location": {
      //         "lat": 40.7128,
      //         "lng": -74.0060
      //       }
      //     },
      //     "estimated_arrival_time": "2025-01-07T11:15:00Z"
      //   }
      // }
      
      // Update existing orders table with real-time data
      await supabase
        .from('orders')
        .update({
          courier_info: {
            name: resource.courier?.name,
            phone: resource.courier?.phone,
            location: resource.courier?.location,
            estimated_arrival: resource.estimated_arrival_time
          },
          delivery_status: resource.status,
          updated_at: new Date().toISOString()
        })
        .eq('third_party_order_id', resource.order_id);
    }
    
    res.status(200).json({ received: true });
  } catch (error) {
    console.error('Webhook processing error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
}
```

---

## 🔐 **SECURITY & CONFIGURATION**

### **Environment Variables**
```bash
# Add to existing environment configuration
UBER_DIRECT_CLIENT_ID=zEQd8AIyG2_iwvfmFaG3aDbIvl_3BnKF
UBER_DIRECT_CLIENT_SECRET=ZUT3J3KLxC32NQulzwusYFBc9QXw0Q-ciTpLeNGs
UBER_DIRECT_CUSTOMER_ID=7c307e48-95f3-5205-b5c7-ec8b0074339a
UBER_DIRECT_BASE_URL=https://api.uber.com/v1/customers/7c307e48-95f3-5205-b5c7-ec8b0074339a
```

### **Webhook Security**
```javascript
// Webhook signature verification
function verifyUberWebhookSignature(rawBody, signature) {
  const expectedSignature = crypto
    .createHmac('sha256', process.env.UBER_DIRECT_CLIENT_SECRET)
    .update(rawBody, 'utf8')
    .digest('hex')
    .toLowerCase();
    
  return signature.toLowerCase() === expectedSignature;
}
```

### **Error Handling**
```javascript
// Centralized error handling for Uber Direct
const handleUberDirectError = (error, context) => {
  const errorMappings = {
    'INVALID_QUOTE': 'Quote expired, please get a new quote',
    'DELIVERY_UNAVAILABLE': 'Delivery not available in this area',
    'PAYMENT_FAILED': 'Payment processing failed',
    'AUTHENTICATION_FAILED': 'Authentication with Uber failed'
  };
  
  console.error('Uber Direct Error:', { error, context });
  throw new Error(errorMappings[error.code] || 'Delivery service temporarily unavailable');
};
```

---

## 📊 **SUCCESS METRICS & TESTING**

### **Technical Metrics**
- **API Response Time**: < 2 seconds for quotes
- **Webhook Processing**: < 500ms latency  
- **Integration Success Rate**: > 99%
- **Order Success Rate**: Match existing platform rates

### **Business Metrics**
- **Delivery Adoption Rate**: % of orders choosing delivery
- **Average Order Value**: Delivery vs pickup comparison
- **Customer Satisfaction**: Delivery experience rating
- **Revenue Impact**: Additional delivery fee revenue

### **Testing Checklist**
```javascript
// Unit Tests
✅ OAuth authentication flow
✅ Quote generation and validation  
✅ Delivery creation process
✅ Webhook signature verification
✅ Error handling scenarios

// Integration Tests  
✅ End-to-end order flow with delivery
✅ Real-time status updates
✅ Frontend quote display
✅ Database updates and consistency

// User Acceptance Tests
✅ Customer can select delivery option
✅ Quote displays correctly with timer
✅ Order completes successfully
✅ Real-time tracking works
✅ Status updates arrive properly
```

---

## 🚀 **DEPLOYMENT STRATEGY**

### **Phase 1: Development Environment**
- Set up test credentials
- Configure local environment
- Implement core functionality
- Unit testing

### **Phase 2: Staging Environment**  
- Deploy to staging with test data
- Integration testing with real Uber Direct API
- Frontend testing across devices
- Performance testing

### **Phase 3: Production Rollout**
- Feature flag implementation
- Gradual rollout to select restaurants
- Monitor metrics and error rates
- Full deployment after validation

### **Rollback Plan**
```javascript
// Feature flag to disable Uber Direct instantly
const UBER_DIRECT_ENABLED = process.env.UBER_DIRECT_ENABLED === 'true';

// Graceful fallback in frontend
{UBER_DIRECT_ENABLED && selectedOrderType === 'delivery' && (
  <UberDirectQuoteDisplay />
)}
```

---

## 🎯 **FINAL IMPLEMENTATION CHECKLIST**

### **✅ WHAT'S ALREADY READY (No work needed):**
- [x] Orders table with delivery support (order_type, delivery_address, delivery_fee)
- [x] Platform sync infrastructure (/api/v1/platform-sync/)
- [x] Order review components with delivery option
- [x] Real-time order tracking system
- [x] Multi-tenant database architecture
- [x] Customer information collection system
- [x] Third-party platform integration pattern

### **📋 ACTUAL WORK REQUIRED (2 weeks):**

**Week 1 - Backend:**
- [ ] Create uber-direct.service.js with OAuth & API calls
- [ ] Add 3 optional columns to orders table
- [ ] Update platform_item_mappings constraint
- [ ] Add routes to existing platform-sync.routes.js
- [ ] Environment variable configuration

**Week 2 - Frontend:**  
- [ ] Enhance existing delivery option with quote display
- [ ] Add webhook processing for real-time updates
- [ ] Test end-to-end order flow
- [ ] Deploy and monitor

### **🚀 PRODUCTION DEPLOYMENT:**
- [ ] Feature flag implementation for safe rollout
- [ ] Integration testing with test credentials
- [ ] Performance monitoring setup
- [ ] Customer feedback collection
- [ ] Staff training on new delivery features

---

## 🔍 **COMPLETE UBER DIRECT API SPECIFICATION**

### **📋 API STRUCTURE SUMMARY:**
```
UBER DIRECT API (Complete Specification):
├── Authentication: OAuth 2.0 client_credentials
│   ├── URL: https://auth.uber.com/oauth/v2/token  
│   ├── Content-Type: application/x-www-form-urlencoded
│   ├── Scope: eats.deliveries
│   ├── Token Expiry: 30 days (2,592,000 seconds)
│   ├── Rate Limit: 100 tokens/hour
│   └── Max Tokens: 100 concurrent (oldest invalidated)
├── Base URL: https://api.uber.com/v1/customers/{customer_id}/
├── Request Format: application/json (all endpoints except auth)
├── Core Flow:
│   ├── POST /delivery_quotes (15-minute validity)
│   └── POST /deliveries (requires quote_id)  
├── Management:
│   ├── GET /deliveries (list with filters)
│   ├── GET /deliveries/{id} (individual tracking)
│   └── POST /deliveries/{id}/cancel
├── Webhooks:
│   ├── Events: delivery_status, courier_update
│   ├── Security: HMAC-SHA256 signature verification
│   ├── Statuses: pending → pickup → pickup_complete → dropoff → delivered
│   └── Real-time: courier location, ETA updates
└── Constraints:
    ├── Price Format: CENTS (558 = $5.58)
    ├── Address Format: street_address as ARRAY
    ├── Delivery Range: 20 miles maximum
    └── Quote Expiry: 15 minutes maximum
```

### **🎯 PLATFORM PARTNERSHIP MODEL:**
- **VizionMenu = Uber Direct Platform Partner**  
- **Single credentials serve ALL restaurants**
- **No individual restaurant signups required**
- **Unified billing through VizionMenu** 
- **Commission revenue opportunity for VizionMenu**

## 📊 **SUMMARY: WHY THIS IS NOW A 2-WEEK PROJECT**

### **🔥 EXISTING INFRASTRUCTURE LEVERAGE:**
- **Database**: 95% ready - just need 3 optional columns
- **Frontend**: Delivery option already exists - just add quote display  
- **Backend**: Platform sync pattern already established
- **Authentication**: Multi-platform auth pattern ready
- **Real-time**: Supabase subscription system ready
- **Order flow**: Complete customer journey already implemented
- **API Integration**: Complete technical specification documented

### **⚡ REDUCED SCOPE:**
- **No new tables**: Use existing orders table structure
- **No new pages**: Enhance existing order review and tracking  
- **No complex architecture**: Follow existing platform sync pattern
- **No extensive testing**: Leverage existing QA processes
- **No training complexity**: Minor enhancement to existing features

### **🎯 CORE VALUE DELIVERED:**
- White-label delivery service integration
- Real-time quote display and order creation
- Seamless integration with existing VizionMenu experience
- Full Uber Direct API functionality
- Production-ready implementation

---

**Last Updated**: January 2025  
**Document Version**: 2.0 (REVISED BASED ON ACTUAL INFRASTRUCTURE)  
**Implementation Timeline**: 2 weeks (STREAMLINED)  
**Status**: Ready for Immediate Development 🚀