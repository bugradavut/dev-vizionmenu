# Platform API Reference - Complete Documentation

**Comprehensive API documentation for Uber Eats, DoorDash, and SkipTheDishes integration with Vizion Menu**

---

## 📚 DOCUMENTATION PURPOSE

This document provides **complete technical specifications** for integrating Vizion Menu with three major Canadian delivery platforms. It serves as the **single source of truth** for:

- API endpoint specifications
- Authentication methods
- Data formats and schemas
- Webhook implementations
- Error handling procedures
- Rate limits and constraints
- Integration requirements

**Target Audience**: AI development assistants, technical implementers, and project stakeholders requiring detailed platform integration knowledge.

---

## 🚗 UBER EATS API DOCUMENTATION

### **Official Resources**
- **Primary Documentation**: https://developer.uber.com/docs/eats/introduction
- **API Reference**: https://developer.uber.com/docs/eats/references/api
- **Postman Collection**: https://www.postman.com/uber/uber-eats-marketplace-api
- **Getting Started Guide**: https://developer.uber.com/docs/eats/guides/getting-started
- **Webhook Documentation**: https://developer.uber.com/docs/eats/guides/webhooks

### **Authentication & Authorization**

#### **OAuth 2.0 Implementation**
```javascript
// Authentication Flow
const authConfig = {
  baseUrl: 'https://login.uber.com/oauth/v2/token',
  grantType: 'client_credentials',
  scope: 'eats.store eats.orders.read eats.pos_provisioning',
  clientId: process.env.UBER_EATS_CLIENT_ID,
  clientSecret: process.env.UBER_EATS_CLIENT_SECRET
};

// Token Request
const tokenRequest = {
  method: 'POST',
  url: 'https://login.uber.com/oauth/v2/token',
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded'
  },
  body: new URLSearchParams({
    client_id: authConfig.clientId,
    client_secret: authConfig.clientSecret,
    grant_type: 'client_credentials',
    scope: authConfig.scope
  })
};

// Response Format
{
  "access_token": "Ka5jbIiLCynbzjzFBiKEhKrQJjGN4BQ6NlKHhAKO",
  "token_type": "Bearer",
  "expires_in": 2592000,
  "scope": "eats.store"
}
```

#### **API Request Headers**
```javascript
const headers = {
  'Authorization': `Bearer ${accessToken}`,
  'Content-Type': 'application/json',
  'Accept': 'application/json'
};
```

### **Core API Endpoints**

#### **Store Management**
```javascript
// Get Store Information
GET /v1/eats/stores/{store_id}

// Response Schema
{
  "id": "d7ddc2a3-2890-3f4b-b3d6-91e6e7b9d2f4",
  "name": "Pizza Palace Downtown",
  "address": {
    "street_address": "123 Main St",
    "city": "Toronto",
    "state": "ON",
    "postal_code": "M5V 3A8",
    "country": "CA"
  },
  "phone_number": "+14161234567",
  "cuisine_types": ["Italian", "Pizza"],
  "hours": {
    "monday": [{"start": "11:00", "end": "23:00"}],
    // ... other days
  },
  "status": "online" // online, offline, temporarily_offline
}
```

#### **Menu Management**
```javascript
// Upload/Update Menu
PUT /v1/eats/stores/{store_id}/menus

// Request Schema
{
  "menus": [
    {
      "menu_id": "main_menu",
      "title": "Main Menu",
      "subtitle": "Our delicious offerings",
      "sections": [
        {
          "section_id": "appetizers",
          "title": "Appetizers",
          "items": [
            {
              "id": "item_001",
              "external_data": "viz_menu_item_123",
              "title": "Caesar Salad",
              "description": "Fresh romaine lettuce with parmesan",
              "price": 1299, // Price in cents
              "images": [
                {
                  "url": "https://example.com/caesar.jpg",
                  "width": 640,
                  "height": 480
                }
              ],
              "dietary_info": ["vegetarian"],
              "allergens": ["dairy", "eggs"],
              "nutritional_info": {
                "calories": 280,
                "fat_grams": 15
              },
              "available": true,
              "preparation_time_seconds": 600,
              "max_quantity": 10,
              "modifiers": [
                {
                  "id": "size_modifier",
                  "title": "Size",
                  "min_selections": 1,
                  "max_selections": 1,
                  "options": [
                    {
                      "id": "small",
                      "title": "Small",
                      "price": 0
                    },
                    {
                      "id": "large", 
                      "title": "Large",
                      "price": 300
                    }
                  ]
                }
              ]
            }
          ]
        }
      ]
    }
  ]
}

// Response Schema
{
  "menu_upload_id": "upload_123456",
  "status": "success",
  "warnings": [],
  "errors": []
}
```

#### **Order Management**
```javascript
// Get Order Details
GET /v1/eats/order/{order_id}

// Response Schema
{
  "id": "order_abc123",
  "display_id": "#1234",
  "type": "delivery", // delivery, pickup
  "state": "accepted", // created, accepted, denied, finished, cancelled
  "placed_at": "2025-01-18T10:30:00Z",
  "estimated_ready_for_pickup_at": "2025-01-18T11:00:00Z",
  "eater": {
    "first_name": "John",
    "last_name": "Doe", 
    "phone": "+14161234567",
    "phone_sms_enabled": true
  },
  "cart": {
    "items": [
      {
        "id": "item_001",
        "external_data": "viz_menu_item_123",
        "title": "Caesar Salad",
        "quantity": 2,
        "price": 1299,
        "special_instructions": "No croutons please",
        "modifiers": [
          {
            "id": "size_modifier",
            "title": "Size",
            "option": {
              "id": "large",
              "title": "Large",
              "price": 300
            }
          }
        ]
      }
    ],
    "special_instructions": "Please ring doorbell"
  },
  "payment": {
    "charges": {
      "subtotal": 2598, // Price in cents
      "tax": 338,
      "tip": 500,
      "bag_fee": 15,
      "total": 3451
    }
  },
  "delivery": {
    "location": {
      "address": "456 Oak Street, Toronto, ON M4X 1Y7",
      "latitude": 43.6532,
      "longitude": -79.3832
    },
    "notes": "Apartment 4B, blue door"
  }
}

// Accept Order
POST /v1/eats/orders/{order_id}/accept_pos_order
{
  "reason": "ACCEPTED",
  "estimated_ready_for_pickup_time": "2025-01-18T11:15:00Z"
}

// Deny Order
POST /v1/eats/orders/{order_id}/deny_pos_order
{
  "reason": "STORE_CLOSED", // STORE_CLOSED, OUT_OF_ITEM, TOO_BUSY, OTHER
  "explanation": "We are temporarily closed for maintenance"
}

// Update Order Status
POST /v1/eats/orders/{order_id}/status
{
  "status": "preparing" // accepted, preparing, ready_for_pickup, completed
}
```

### **Webhook Implementation**

#### **Webhook Configuration**
```javascript
// Webhook URL Setup (via Developer Dashboard)
const webhookConfig = {
  url: 'https://yourdomain.com/api/v1/webhooks/uber-eats',
  events: [
    'orders.notification',
    'orders.cancel',
    'orders.status_change'
  ],
  version: '1.0'
};
```

#### **Webhook Security**
```javascript
// Webhook Signature Verification
const crypto = require('crypto');

function verifyUberWebhook(signature, body, secret) {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(body, 'utf8')
    .digest('hex');
  
  return signature === `sha256=${expectedSignature}`;
}

// Usage in webhook endpoint
app.post('/api/v1/webhooks/uber-eats', express.raw({type: 'application/json'}), (req, res) => {
  const signature = req.headers['x-uber-signature'];
  const isValid = verifyUberWebhook(signature, req.body, process.env.UBER_WEBHOOK_SECRET);
  
  if (!isValid) {
    return res.status(401).send('Unauthorized');
  }
  
  // Process webhook
});
```

#### **Webhook Payload Examples**
```javascript
// New Order Webhook
{
  "event_id": "event_123",
  "event_time": "2025-01-18T10:30:00Z",
  "event_type": "orders.notification",
  "meta": {
    "user_id": "store_456",
    "resource_id": "order_abc123"
  },
  "order": {
    // Full order object (same as GET /v1/eats/order/{order_id})
  }
}

// Order Cancellation Webhook
{
  "event_id": "event_124", 
  "event_time": "2025-01-18T10:45:00Z",
  "event_type": "orders.cancel",
  "meta": {
    "user_id": "store_456",
    "resource_id": "order_abc123"
  },
  "cancellation": {
    "cancelled_by": "eater", // eater, restaurant, uber
    "reason": "EATER_CANCELLED",
    "details": "Customer changed mind"
  }
}
```

### **Rate Limits & Constraints**
```javascript
const rateLimits = {
  menuUpload: {
    limit: '10 requests per minute',
    note: 'Menu updates are processed asynchronously'
  },
  orderStatus: {
    limit: '100 requests per minute per store',
    note: 'Status updates should be real-time'
  },
  orderRetrieval: {
    limit: '1000 requests per minute per store',
    note: 'Use webhooks instead of polling'
  }
};
```

### **Error Handling**
```javascript
// Common Error Responses
{
  "error": {
    "code": "invalid_request",
    "message": "The request was invalid",
    "details": "Menu item price cannot be negative"
  }
}

// Error Codes
const errorCodes = {
  'invalid_request': 'Request format is incorrect',
  'unauthorized': 'Invalid or expired token',
  'forbidden': 'Insufficient permissions',
  'not_found': 'Resource not found',
  'rate_limited': 'Rate limit exceeded',
  'server_error': 'Internal server error'
};
```

---

## 🚪 DOORDASH API DOCUMENTATION

### **Official Resources**
- **Primary Documentation**: https://developer.doordash.com/en-US/
- **Marketplace API**: https://developer.doordash.com/en-US/api/marketplace/
- **Drive API**: https://developer.doordash.com/en-US/api/drive/
- **Getting Started**: https://developer.doordash.com/en-US/docs/drive/tutorials/get_started/
- **Webhook Guide**: https://developer.doordash.com/en-US/docs/drive/how_to/webhooks/

### **Authentication & Authorization**

#### **JWT Authentication**
```javascript
// JWT Configuration
const jwtConfig = {
  developerId: process.env.DOORDASH_DEVELOPER_ID,
  keyId: process.env.DOORDASH_KEY_ID,
  signingSecret: process.env.DOORDASH_SIGNING_SECRET,
  algorithm: 'HS256'
};

// Generate JWT Token
const jwt = require('jsonwebtoken');

function generateDoorDashToken() {
  const payload = {
    aud: 'doordash',
    iss: jwtConfig.developerId,
    kid: jwtConfig.keyId,
    exp: Math.floor(Date.now() / 1000) + 300, // 5 minutes
    iat: Math.floor(Date.now() / 1000)
  };
  
  return jwt.sign(payload, jwtConfig.signingSecret, {
    algorithm: jwtConfig.algorithm
  });
}

// API Request Headers
const headers = {
  'Authorization': `Bearer ${generateDoorDashToken()}`,
  'Content-Type': 'application/json'
};
```

### **Core API Endpoints**

#### **Store Management**
```javascript
// Get Store Information
GET /developer/v1/stores/{store_id}

// Response Schema
{
  "id": "store_123",
  "name": "Pizza Palace",
  "phone_number": "+14161234567",
  "address": {
    "street": "123 Main St",
    "city": "Toronto",
    "state": "ON",
    "zip_code": "M5V 3A8",
    "country": "CA"
  },
  "business_id": "business_456",
  "is_active": true,
  "timezone": "America/Toronto",
  "merchant_supplied_id": "viz_branch_789"
}
```

#### **Menu Management**
```javascript
// Update Menu
PUT /developer/v1/stores/{store_id}/menu

// Request Schema
{
  "menu": {
    "categories": [
      {
        "name": "Appetizers",
        "active": true,
        "sort_order": 1,
        "items": [
          {
            "external_id": "viz_item_123",
            "name": "Caesar Salad",
            "description": "Fresh romaine with parmesan",
            "price": 12.99,
            "is_active": true,
            "tags": ["vegetarian"],
            "allergens": ["dairy", "eggs"],
            "image_url": "https://example.com/caesar.jpg",
            "modifiers": [
              {
                "name": "Size",
                "min_selections": 1,
                "max_selections": 1,
                "modifier_options": [
                  {
                    "name": "Small",
                    "price": 0.00
                  },
                  {
                    "name": "Large", 
                    "price": 3.00
                  }
                ]
              }
            ]
          }
        ]
      }
    ]
  }
}

// Response Schema
{
  "status": "success",
  "menu_id": "menu_abc123",
  "validation_errors": []
}
```

#### **Order Management**
```javascript
// Order Webhook Payload
{
  "event": {
    "type": "OrderCreate",
    "status": "NEW"
  },
  "order": {
    "id": "order_456",
    "display_id": "D-12345",
    "state": "confirmed",
    "ordered_at": "2025-01-18T10:30:00Z",
    "estimated_pickup_time": "2025-01-18T11:00:00Z",
    "customer": {
      "name": "John Doe",
      "phone_number": "+14161234567",
      "email": "john@example.com"
    },
    "delivery_address": {
      "street": "456 Oak St",
      "city": "Toronto",
      "state": "ON",
      "zip_code": "M4X 1Y7"
    },
    "items": [
      {
        "external_id": "viz_item_123",
        "name": "Caesar Salad",
        "quantity": 2,
        "unit_price": 12.99,
        "total_price": 25.98,
        "special_instructions": "No croutons",
        "modifiers": [
          {
            "name": "Size",
            "option": "Large",
            "price": 3.00
          }
        ]
      }
    ],
    "subtotal": 25.98,
    "tax": 3.38,
    "tip": 5.00,
    "delivery_fee": 2.99,
    "total": 37.35,
    "special_instructions": "Ring doorbell twice"
  }
}

// Confirm Order
POST /developer/v1/orders/{order_id}/confirm
{
  "confirmation_status": "accepted",
  "estimated_pickup_time": "2025-01-18T11:15:00Z"
}

// Reject Order
POST /developer/v1/orders/{order_id}/confirm
{
  "confirmation_status": "rejected",
  "rejection_reason": "store_closed"
}

// Update Order Status
POST /developer/v1/orders/{order_id}/status
{
  "status": "being_prepared" // confirmed, being_prepared, ready_for_pickup, picked_up, delivered
}
```

### **Webhook Implementation**

#### **Webhook Security**
```javascript
// DoorDash uses Basic Auth or OAuth for webhook authentication
const webhookAuth = {
  type: 'basic', // or 'oauth'
  username: process.env.DOORDASH_WEBHOOK_USERNAME,
  password: process.env.DOORDASH_WEBHOOK_PASSWORD
};

// Webhook endpoint with authentication
app.post('/api/v1/webhooks/doordash', (req, res) => {
  const auth = req.headers.authorization;
  
  if (!auth || !validateDoorDashAuth(auth)) {
    return res.status(401).send('Unauthorized');
  }
  
  // Process webhook
  const { event, order } = req.body;
  // Handle order based on event type
});
```

### **Rate Limits & Constraints**
```javascript
const rateLimits = {
  menuUpdate: {
    limit: '5 requests per minute',
    note: 'Menu changes take 5-10 minutes to reflect'
  },
  orderOperations: {
    limit: '100 requests per minute',
    note: 'Order confirmations must be within 2 minutes'
  }
};
```

---

## 🍽️ SKIPTHEDISHES INTEGRATION OPTIONS

### **Current Status**
SkipTheDishes does **not** provide a public API for restaurant integrations. Integration must be achieved through:

1. **Third-Party Integration Platforms**
2. **Direct Business Partnership**
3. **Manual/CSV-Based Processes**

### **Third-Party Integration Options**

#### **Option 1: Otter (KitchenHub)**
```javascript
// Otter Integration Details
const otterIntegration = {
  provider: 'Otter (KitchenHub)',
  website: 'https://www.trykitchenhub.com',
  capabilities: [
    'Menu synchronization',
    'Order management', 
    'Real-time updates',
    'Multi-platform support'
  ],
  pricing: 'Subscription-based, ~$200-500/month per location',
  integration: 'API-based integration with Otter platform',
  skiptheDishesSupport: true
};

// Example Otter API Integration
const otterConfig = {
  baseUrl: 'https://api.otter.io/v1',
  apiKey: process.env.OTTER_API_KEY,
  restaurantId: process.env.OTTER_RESTAURANT_ID
};

// Sync Menu to SkipTheDishes via Otter
async function syncMenuViaOtter(menuData) {
  const response = await fetch(`${otterConfig.baseUrl}/restaurants/${otterConfig.restaurantId}/menu`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${otterConfig.apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      platforms: ['skipthedishes'],
      menu: menuData
    })
  });
  
  return response.json();
}
```

#### **Option 2: GetOrder**
```javascript
// GetOrder Integration Details
const getOrderIntegration = {
  provider: 'GetOrder',
  website: 'https://getorder.biz/skipthedishes/',
  capabilities: [
    'SkipTheDishes order integration',
    'Menu synchronization',
    'POS system integration'
  ],
  pricing: 'Per-order fee or monthly subscription',
  integration: 'API or POS-based integration'
};
```

#### **Option 3: Direct Business Partnership**
```javascript
// Business Partnership Approach
const businessPartnership = {
  contactMethod: 'Direct outreach to SkipTheDishes business development',
  requirements: [
    'Significant order volume',
    'Multi-location restaurant chain',
    'Technical integration capabilities',
    'Business case for API access'
  ],
  timeline: '3-6 months negotiation process',
  outcome: 'Custom API access or integration solution'
};
```

### **Manual Integration Approach**
```javascript
// CSV-Based Menu Management
const csvIntegration = {
  menuExport: {
    format: 'CSV with specific SkipTheDishes format',
    fields: ['item_name', 'description', 'price', 'category', 'available'],
    frequency: 'Manual upload when menu changes'
  },
  orderManagement: {
    method: 'SkipTheDishes tablet/app integration',
    orderForwarding: 'Manual entry into Vizion Menu system',
    limitations: 'No real-time synchronization'
  }
};
```

---

## 🔧 INTEGRATION IMPLEMENTATION GUIDE

### **Data Format Standardization**

#### **Vizion Menu Internal Format**
```typescript
interface VizionMenuItem {
  id: string;
  name: string;
  description: string;
  price: number; // In dollars
  category_id: string;
  image_url?: string;
  is_available: boolean;
  allergens?: string[];
  dietary_info?: string[];
  preparation_time?: number; // In minutes
  modifiers?: VizionModifier[];
}

interface VizionModifier {
  id: string;
  name: string;
  min_selections: number;
  max_selections: number;
  options: VizionModifierOption[];
}

interface VizionModifierOption {
  id: string;
  name: string;
  price: number; // Additional price in dollars
}

interface VizionOrder {
  id: string;
  external_order_id?: string;
  customer_name: string;
  customer_phone: string;
  customer_email?: string;
  order_type: 'takeaway' | 'dine_in';
  third_party_platform?: 'uber_eats' | 'doordash' | 'skipthedishes';
  source: 'qr' | 'web' | 'uber_eats' | 'doordash' | 'skipthedishes' | 'phone';
  subtotal: number;
  tax: number;
  total: number;
  items: VizionOrderItem[];
  special_instructions?: string;
  delivery_info?: {
    address?: string;
    delivery_time?: string;
  };
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'completed' | 'cancelled';
  created_at: Date;
}
```

#### **Platform Format Converters**
```javascript
// Uber Eats Format Converter
function convertToUberEatsFormat(vizionMenuItem) {
  return {
    id: `ue_${vizionMenuItem.id}`,
    external_data: vizionMenuItem.id,
    title: vizionMenuItem.name,
    description: vizionMenuItem.description,
    price: Math.round(vizionMenuItem.price * 100), // Convert to cents
    images: vizionMenuItem.image_url ? [{
      url: vizionMenuItem.image_url,
      width: 640,
      height: 480
    }] : [],
    available: vizionMenuItem.is_available,
    preparation_time_seconds: (vizionMenuItem.preparation_time || 10) * 60,
    dietary_info: vizionMenuItem.dietary_info || [],
    allergens: vizionMenuItem.allergens || [],
    modifiers: (vizionMenuItem.modifiers || []).map(convertModifierToUberEats)
  };
}

function convertModifierToUberEats(vizionModifier) {
  return {
    id: `ue_mod_${vizionModifier.id}`,
    title: vizionModifier.name,
    min_selections: vizionModifier.min_selections,
    max_selections: vizionModifier.max_selections,
    options: vizionModifier.options.map(option => ({
      id: `ue_opt_${option.id}`,
      title: option.name,
      price: Math.round(option.price * 100) // Convert to cents
    }))
  };
}

// DoorDash Format Converter
function convertToDoorDashFormat(vizionMenuItem) {
  return {
    external_id: vizionMenuItem.id,
    name: vizionMenuItem.name,
    description: vizionMenuItem.description,
    price: vizionMenuItem.price, // DoorDash uses dollars
    is_active: vizionMenuItem.is_available,
    image_url: vizionMenuItem.image_url,
    tags: vizionMenuItem.dietary_info || [],
    allergens: vizionMenuItem.allergens || [],
    modifiers: (vizionMenuItem.modifiers || []).map(convertModifierToDoorDash)
  };
}

// Order Format Converters
function convertUberEatsOrderToVizion(uberOrder) {
  return {
    external_order_id: uberOrder.id,
    customer_name: `${uberOrder.eater.first_name} ${uberOrder.eater.last_name}`,
    customer_phone: uberOrder.eater.phone,
    customer_email: uberOrder.eater.email,
    order_type: 'takeaway',
    third_party_platform: 'uber_eats',
    source: 'uber_eats',
    subtotal: uberOrder.payment.charges.subtotal / 100,
    tax: uberOrder.payment.charges.tax / 100,
    total: uberOrder.payment.charges.total / 100,
    items: uberOrder.cart.items.map(convertUberEatsItemToVizion),
    special_instructions: uberOrder.cart.special_instructions,
    delivery_info: {
      address: uberOrder.delivery?.location?.address,
      delivery_time: uberOrder.estimated_ready_for_pickup_at
    },
    status: 'pending'
  };
}
```

### **Error Handling Strategies**

#### **Common Error Scenarios**
```javascript
const errorHandlingStrategies = {
  authenticationFailure: {
    uberEats: 'Refresh OAuth token, retry request',
    doorDash: 'Regenerate JWT token, validate credentials',
    handling: 'Automatic retry with exponential backoff'
  },
  
  rateLimitExceeded: {
    detection: 'HTTP 429 response or rate limit headers',
    handling: 'Queue requests, implement backoff strategy',
    monitoring: 'Alert when approaching rate limits'
  },
  
  menuSyncFailure: {
    causes: ['Invalid item format', 'Missing required fields', 'Price validation'],
    handling: 'Validate data before sync, log specific errors',
    fallback: 'Retry with corrected data, manual intervention'
  },
  
  webhookDeliveryFailure: {
    platforms: 'All platforms retry failed webhooks',
    vizionHandling: 'Idempotent webhook processing',
    recovery: 'Poll for missed orders as backup'
  },
  
  orderProcessingError: {
    scenarios: ['Duplicate orders', 'Invalid order data', 'Menu item not found'],
    handling: 'Validate order data, map external IDs to internal IDs',
    communication: 'Send appropriate response to platform'
  }
};

// Example Error Handler Implementation
class PlatformIntegrationError extends Error {
  constructor(platform, operation, originalError, orderData = null) {
    super(`${platform} ${operation} failed: ${originalError.message}`);
    this.platform = platform;
    this.operation = operation;
    this.originalError = originalError;
    this.orderData = orderData;
    this.timestamp = new Date();
  }
}

async function handlePlatformOperation(platform, operation, operationFn) {
  const maxRetries = 3;
  let attempt = 0;
  
  while (attempt < maxRetries) {
    try {
      return await operationFn();
    } catch (error) {
      attempt++;
      
      if (attempt === maxRetries) {
        throw new PlatformIntegrationError(platform, operation, error);
      }
      
      // Exponential backoff
      const delay = Math.pow(2, attempt) * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}
```

### **Testing Strategies**

#### **Mock API Implementations**
```javascript
// Mock Uber Eats API for testing
class MockUberEatsAPI {
  constructor() {
    this.orders = [];
    this.menus = {};
  }
  
  async uploadMenu(storeId, menuData) {
    this.menus[storeId] = menuData;
    console.log(`[MOCK] Uber Eats Menu uploaded for store ${storeId}`);
    return {
      menu_upload_id: `mock_upload_${Date.now()}`,
      status: 'success',
      warnings: [],
      errors: []
    };
  }
  
  async updateOrderStatus(orderId, status) {
    console.log(`[MOCK] Uber Eats Order ${orderId} status updated to ${status}`);
    return { success: true };
  }
  
  simulateIncomingOrder(storeId) {
    const mockOrder = {
      id: `mock_order_${Date.now()}`,
      display_id: `#${Math.floor(Math.random() * 10000)}`,
      state: 'created',
      eater: {
        first_name: 'Test',
        last_name: 'Customer',
        phone: '+14161234567'
      },
      cart: {
        items: [{
          external_data: 'viz_item_123',
          title: 'Test Item',
          quantity: 1,
          price: 1299
        }]
      },
      payment: {
        charges: {
          subtotal: 1299,
          tax: 169,
          total: 1468
        }
      }
    };
    
    this.orders.push(mockOrder);
    return mockOrder;
  }
}

// Usage in tests
const mockUberEats = new MockUberEatsAPI();
const testMenu = generateTestMenuData();
await mockUberEats.uploadMenu('test_store', testMenu);
```

### **Monitoring & Logging**

#### **Integration Health Monitoring**
```javascript
const monitoringMetrics = {
  menuSyncSuccess: {
    metric: 'platform_menu_sync_success_rate',
    labels: ['platform', 'store_id'],
    target: '> 99%'
  },
  
  orderProcessingLatency: {
    metric: 'platform_order_processing_duration_seconds',
    labels: ['platform', 'operation'],
    target: '< 5 seconds'
  },
  
  webhookDeliverySuccess: {
    metric: 'platform_webhook_success_rate',
    labels: ['platform', 'event_type'],
    target: '> 99.5%'
  },
  
  apiErrorRate: {
    metric: 'platform_api_error_rate',
    labels: ['platform', 'endpoint', 'error_type'],
    target: '< 1%'
  }
};

// Logging Implementation
class PlatformLogger {
  static logMenuSync(platform, storeId, itemCount, duration, success) {
    console.log({
      event: 'menu_sync',
      platform,
      store_id: storeId,
      items_synced: itemCount,
      duration_ms: duration,
      success,
      timestamp: new Date().toISOString()
    });
  }
  
  static logOrderReceived(platform, orderId, amount) {
    console.log({
      event: 'order_received',
      platform,
      order_id: orderId,
      amount,
      timestamp: new Date().toISOString()
    });
  }
  
  static logError(platform, operation, error, context = {}) {
    console.error({
      event: 'platform_error',
      platform,
      operation,
      error: error.message,
      stack: error.stack,
      context,
      timestamp: new Date().toISOString()
    });
  }
}
```

---

## 📞 SUPPORT & ESCALATION CONTACTS

### **Platform Support Channels**

#### **Uber Eats Developer Support**
- **Documentation Issues**: https://developer.uber.com/docs/eats
- **API Support**: developer-support@uber.com
- **Partner Success**: Contact through Developer Dashboard
- **Technical Issues**: Use GitHub issues or Stack Overflow with `uber-eats-api` tag

#### **DoorDash Developer Support**
- **Technical Support**: developer-support@doordash.com
- **Partnership Inquiries**: partnerships@doordash.com
- **Documentation**: https://developer.doordash.com/en-US/
- **Status Page**: https://status.doordash.com/

#### **SkipTheDishes Business Development**
- **Restaurant Partnerships**: restaurants@skipthedishes.com
- **Business Development**: Contact through main website
- **Technical Integration**: Requires established business relationship
- **Third-Party Integrations**: Contact Otter or GetOrder directly

### **Internal Escalation Process**

When encountering integration challenges:

1. **Technical Issues**: Review platform documentation and error logs
2. **API Access**: Confirm credentials and permissions with your manager
3. **Business Requirements**: Clarify integration scope and priorities
4. **Platform Contact**: Your manager can initiate direct platform communication
5. **Alternative Solutions**: Consider third-party integration options

---

## 📋 IMPLEMENTATION CHECKLIST

### **Pre-Integration Requirements**
- [ ] Platform developer accounts created
- [ ] API credentials obtained and secured
- [ ] Webhook endpoints configured with SSL
- [ ] Testing environment prepared
- [ ] Error monitoring implemented

### **Per-Platform Integration**
- [ ] Authentication flow implemented
- [ ] Menu format converter developed
- [ ] Order webhook handler created
- [ ] Status update mechanism built
- [ ] Error handling implemented
- [ ] Mock API testing completed

### **Production Readiness**
- [ ] Rate limiting respect implemented
- [ ] Comprehensive error logging added
- [ ] Performance monitoring configured
- [ ] Security best practices followed
- [ ] Documentation completed

---

**Last Updated**: January 18, 2025  
**Document Version**: 1.0  
**Maintenance**: Update when platform APIs change or new integration options become available