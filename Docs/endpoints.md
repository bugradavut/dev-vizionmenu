# Vizion Menu API Endpoints - Complete Reference

## **API Base Configuration**

```
Development: http://localhost:3001
Production: https://dev-vizionmenu-web.vercel.app (Vercel deployment)
```

**Architecture:** Modern Express.js with Controller-Service-Route pattern (MVC)
**Code Structure:** Modular backend with clean separation of concerns
**Database:** Supabase PostgreSQL with Row-Level Security (RLS)
**Authentication:** Bearer JWT Token from Supabase with custom claims
**Error Handling:** Centralized error handler with standardized responses

```javascript
Headers: {
  "Authorization": "Bearer <jwt_token>",
  "Content-Type": "application/json"
}
```

---

## **🔧 System Endpoints**

### `GET /health`
- **Status:** ✅ **READY**
- **Purpose:** API server health check
- **Auth Required:** No
- **Response:**
```json
{
  "status": "ok", 
  "timestamp": "2025-07-28T10:30:00Z",
  "uptime": "2h 15m 30s"
}
```

---

## **🔐 Authentication Endpoints**

### `GET /auth/profile`
- **Status:** ✅ **READY**
- **Purpose:** Get current user profile with role/permissions
- **Auth Required:** Yes (Bearer token)
- **Response:**
```json
{
  "data": {
    "id": "uuid",
    "email": "user@restaurant.com",
    "full_name": "John Doe",
    "role": "branch_manager",
    "branch_id": "uuid",
    "chain_id": "uuid",
    "permissions": ["can_manage_users", "can_edit_orders"]
  }
}
```

### Authentication Notes:
- **Login/Logout:** Use Supabase SDK directly in mobile app
- **Session Management:** Handled by Supabase Auth
- **Token Refresh:** Automatic via Supabase SDK

---

## **👥 User Management Endpoints**

### `POST /api/v1/users`
- **Status:** ✅ **READY** (Production implemented)
- **Purpose:** Create new user with role assignment
- **Auth Required:** Yes (Manager+ role with hierarchy validation)
- **Implementation:** Express.js endpoint with Supabase Auth integration
- **Request Body:**
```json
{
  "email": "newuser@restaurant.com",
  "password": "secure_password",
  "full_name": "Jane Smith",
  "phone": "+1 416 555 1234",
  "branch_id": "uuid",
  "role": "branch_staff",
  "permissions": ["orders:read", "orders:write"]
}
```
- **Response:** 
```json
{
  "data": {
    "message": "User created successfully",
    "user_id": "uuid",
    "branch_user": {
      "user_id": "uuid",
      "branch_id": "uuid", 
      "role": "branch_staff",
      "permissions": ["orders:read", "orders:write"],
      "is_active": true
    }
  }
}
```

### `GET /api/v1/users/branch/:branchId`
- **Status:** ✅ **READY** (Production implemented)
- **Purpose:** List all users in a branch with complete profile data
- **Auth Required:** Yes (Any authenticated user in same branch)
- **Implementation:** Express.js with Supabase Admin API integration
- **Query Parameters:**
  - `page=1` (pagination - supported)
  - `limit=50` (default limit, configurable)
- **Response:**
```json
{
  "data": {
    "users": [
      {
        "user_id": "uuid",
        "branch_id": "uuid",
        "role": "branch_manager",
        "permissions": ["users:read", "users:write", "orders:read"],
        "is_active": true,
        "created_at": "2025-01-15T10:30:00Z",
        "updated_at": "2025-01-15T10:30:00Z",
        "user": {
          "user_id": "uuid",
          "email": "manager@restaurant.com",
          "full_name": "John Manager",
          "phone": "+1 416 555 0100",
          "avatar_url": null
        }
      }
    ],
    "total": 25,
    "page": 1,
    "limit": 50
  }
}
```

### `PATCH /api/v1/users/:userId/branch/:branchId`
- **Status:** ✅ **READY** (Production implemented)
- **Purpose:** Update user profile information and status
- **Auth Required:** Yes (Manager+ role with hierarchy validation)
- **Implementation:** Role hierarchy enforcement with cross-branch protection
- **Request Body:**
```json
{
  "email": "updated@restaurant.com",
  "full_name": "Updated Name",
  "phone": "+1 416 555 9999",
  "is_active": true
}
```
- **Response:**
```json
{
  "data": { "success": true }
}
```

### `POST /api/v1/users/:userId/branch/:branchId/assign-role`
- **Status:** ✅ **READY** (Production implemented)
- **Purpose:** Assign new role with automatic permission management
- **Auth Required:** Yes (Manager+ role, can only assign equal/lower roles)
- **Implementation:** Automatic permission assignment based on role
- **Request Body:**
```json
{
  "role": "branch_manager"
}
```
- **Role Options:** `chain_owner`, `branch_manager`, `branch_staff`, `branch_cashier`
- **Response:**
```json
{
  "data": {
    "message": "Role assigned successfully",
    "user_id": "uuid",
    "branch_id": "uuid",
    "new_role": "branch_manager",
    "updated_user": {
      "role": "branch_manager",
      "permissions": ["users:read", "users:write", "menu:read", "menu:write"],
      "updated_at": "2025-01-15T10:30:00Z"
    }
  }
}
```

### `DELETE /api/v1/users/:userId/branch/:branchId`
- **Status:** ✅ **READY** (Production implemented)
- **Purpose:** Permanently delete user with cascade handling
- **Auth Required:** Yes (Manager+ role with hierarchy validation)
- **Implementation:** Smart deletion - removes from branch, deletes completely if no other branches
- **Response:**
```json
{
  "data": {
    "message": "User deleted successfully"
  }
}
```

---

## **🏢 Branch/Restaurant Endpoints**

### `GET /api/v1/branches`
- **Status:** ❌ **NOT IMPLEMENTED**
- **Priority:** 🔥 **HIGH** (Mobile needs this)
- **Purpose:** List user's accessible branches
- **Planned Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Downtown Location",
      "address": "123 Main St, Toronto",
      "phone": "+1 416 555 0100"
    }
  ]
}
```

### `GET /api/v1/branches/:branchId`
- **Status:** ❌ **NOT IMPLEMENTED**
- **Priority:** ⚡ **MEDIUM**
- **Purpose:** Get specific branch details

### `GET /api/v1/branch/:branchId/settings`
- **Status:** ✅ **READY** (Production implemented)
- **Purpose:** Get branch-specific settings including auto-ready configuration
- **Auth Required:** Yes (Branch context required)
- **Implementation:** Settings management with auto-ready toggle system
- **Response:**
```json
{
  "data": {
    "branch_id": "uuid",
    "auto_ready_enabled": true,
    "base_delay": 20,
    "temporary_base_delay": 0,
    "delivery_delay": 15,
    "temporary_delivery_delay": 0,
    "auto_accept_orders": false,
    "notification_settings": {
      "new_orders": true,
      "status_updates": true,
      "email_notifications": false
    },
    "updated_at": "2025-01-13T10:30:00Z"
  }
}
```

### `PUT /api/v1/branch/:branchId/settings`
- **Status:** ✅ **READY** (Production implemented)
- **Purpose:** Update branch settings including timing configuration
- **Auth Required:** Yes (Manager+ permissions)
- **Implementation:** Settings validation with real-time timer updates
- **Request Body:**
```json
{
  "auto_ready_enabled": true,
  "base_delay": 25,
  "temporary_base_delay": -5,
  "delivery_delay": 20,
  "temporary_delivery_delay": 10,
  "auto_accept_orders": false
}
```

---

## **🍽️ Menu Management Endpoints**

### `GET /api/v1/menu/categories`
- **Status:** ✅ **READY** (Production implemented)
- **Purpose:** List all menu categories for branch with optional items
- **Auth Required:** Yes (Branch context required) 
- **Implementation:** Controller-Service-Route pattern with advanced filtering
- **Query Parameters:**
  - `includeItems=true|false` (include menu items in response)
  - `includeInactive=true|false` (include inactive categories)
  - `page=1&limit=50` (pagination)
  - `sortBy=name|display_order|created_at`
  - `sortOrder=asc|desc`
- **Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Pizzas",
      "description": "Fresh wood-fired pizzas",
      "display_order": 1,
      "is_active": true,
      "items_count": 12,
      "available_items": 10,
      "created_at": "2025-01-13T10:30:00Z",
      "updated_at": "2025-01-13T10:30:00Z",
      "items": [] // if includeItems=true
    }
  ],
  "meta": {
    "total": 8,
    "page": 1,
    "limit": 50,
    "active": 7,
    "inactive": 1
  }
}
```

### `GET /api/v1/menu/categories/:id`
- **Status:** ✅ **READY** (Production implemented)
- **Purpose:** Get detailed category information with items
- **Auth Required:** Yes (Branch context required)
- **Response:**
```json
{
  "data": {
    "id": "uuid",
    "name": "Pizzas",
    "description": "Fresh wood-fired pizzas",
    "display_order": 1,
    "is_active": true,
    "items": [
      {
        "id": "uuid",
        "name": "Margherita Pizza", 
        "price": 18.99,
        "is_available": true
      }
    ],
    "created_at": "2025-01-13T10:30:00Z",
    "updated_at": "2025-01-13T10:30:00Z"
  }
}
```

### `POST /api/v1/menu/categories`
- **Status:** ✅ **READY** (Production implemented)
- **Purpose:** Create new menu category
- **Auth Required:** Yes (Manager+ permissions)
- **Request Body:**
```json
{
  "name": "New Category",
  "description": "Category description",
  "display_order": 5
}
```

### `PUT /api/v1/menu/categories/:id`
- **Status:** ✅ **READY** (Production implemented)
- **Purpose:** Update existing category
- **Auth Required:** Yes (Manager+ permissions)
- **Request Body:**
```json
{
  "name": "Updated Category Name",
  "description": "Updated description",
  "display_order": 3,
  "is_active": true
}
```

### `DELETE /api/v1/menu/categories/:id`
- **Status:** ✅ **READY** (Production implemented) 
- **Purpose:** Delete category (moves items to uncategorized)
- **Auth Required:** Yes (Manager+ permissions)
- **Implementation:** Safe deletion with item reassignment

### `PATCH /api/v1/menu/categories/:id/toggle`
- **Status:** ✅ **READY** (Production implemented)
- **Purpose:** Toggle category availability instantly  
- **Auth Required:** Yes (Staff+ permissions)
- **Implementation:** Instant on/off toggle for categories

### `PUT /api/v1/menu/categories/reorder`
- **Status:** ✅ **READY** (Production implemented)
- **Purpose:** Reorder categories (drag & drop support)
- **Auth Required:** Yes (Manager+ permissions)
- **Request Body:**
```json
{
  "reorderData": [
    {"id": "cat-uuid-1", "display_order": 1},
    {"id": "cat-uuid-2", "display_order": 2}
  ]
}
```

### `GET /api/v1/menu/items`
- **Status:** ✅ **READY** (Production implemented)
- **Purpose:** List menu items with advanced filtering and search
- **Auth Required:** Yes (Branch context required)
- **Implementation:** Advanced filtering, search, pagination, and sorting
- **Query Parameters:**
  - `categoryId=uuid` (filter by category)
  - `search=text` (search name/description)
  - `isAvailable=true|false` (availability filter)
  - `priceMin=10.00&priceMax=50.00` (price range)
  - `allergens=dairy,gluten` (comma-separated allergens)
  - `dietaryInfo=vegetarian,vegan` (comma-separated dietary info)
  - `includeVariants=true|false` (include item variants)
  - `page=1&limit=50` (pagination, max 100)
  - `sortBy=name|price|display_order|created_at`
  - `sortOrder=asc|desc`
- **Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Pizza Margherita", 
      "description": "Fresh mozzarella, tomatoes, basil",
      "price": 18.99,
      "image_url": "https://storage-url/image.jpg",
      "allergens": ["dairy", "gluten"],
      "dietary_info": ["vegetarian"],
      "preparation_time": 15,
      "is_available": true,
      "display_order": 1,
      "category": {
        "id": "cat-uuid",
        "name": "Pizzas",
        "is_active": true
      },
      "variants": [
        {
          "id": "variant-uuid",
          "name": "Large",
          "price_modifier": 5.00,
          "is_default": false,
          "display_order": 1
        }
      ],
      "created_at": "2025-01-13T10:30:00Z",
      "updated_at": "2025-01-13T10:30:00Z"
    }
  ],
  "meta": {
    "total": 25,
    "page": 1,
    "limit": 50,
    "totalPages": 1,
    "hasNextPage": false,
    "hasPreviousPage": false,
    "available": 23,
    "unavailable": 2
  }
}
```

### `GET /api/v1/menu/items/:id`
- **Status:** ✅ **READY** (Production implemented)
- **Purpose:** Get detailed menu item information with variants
- **Auth Required:** Yes (Branch context required)

### `POST /api/v1/menu/items`
- **Status:** ✅ **READY** (Production implemented)
- **Purpose:** Create new menu item with instant photo upload
- **Auth Required:** Yes (Manager+ permissions)
- **Content-Type:** `multipart/form-data`
- **Implementation:** Instant photo upload (vs UEAT's 3-5 day review process)
- **Form Fields:**
  - `name`: "Pizza Margherita" (required)
  - `description`: "Fresh mozzarella, tomatoes, basil"
  - `price`: 18.99 (required, positive number)
  - `category_id`: "category-uuid" (optional)
  - `allergens`: ["dairy", "gluten"] (JSON array)
  - `dietary_info`: ["vegetarian"] (JSON array)
  - `preparation_time`: 15 (minutes, optional)
  - `display_order`: 1 (optional, auto-increments)
  - `variants`: [{"name": "Large", "price_modifier": 5.00}] (JSON array)
  - `photo`: [IMAGE FILE] (optional, max 5MB)

### `PUT /api/v1/menu/items/:id`
- **Status:** ✅ **READY** (Production implemented)
- **Purpose:** Update menu item with photo replacement
- **Auth Required:** Yes (Manager+ permissions)
- **Content-Type:** `multipart/form-data`
- **Implementation:** Smart photo replacement with auto-cleanup

### `DELETE /api/v1/menu/items/:id`
- **Status:** ✅ **READY** (Production implemented)
- **Purpose:** Delete menu item with photo cleanup
- **Auth Required:** Yes (Manager+ permissions)
- **Implementation:** Complete cleanup including photo deletion

### `PATCH /api/v1/menu/items/:id/toggle`
- **Status:** ✅ **READY** (Production implemented)
- **Purpose:** Toggle menu item availability instantly
- **Auth Required:** Yes (Staff+ permissions)
- **Implementation:** Instant on/off toggle for menu items

### `POST /api/v1/menu/items/:id/duplicate`
- **Status:** ✅ **READY** (Production implemented)
- **Purpose:** Duplicate menu item with optional modifications
- **Auth Required:** Yes (Manager+ permissions)
- **Implementation:** Smart duplication with customization options
- **Request Body:**
```json
{
  "name": "New Item Name (Copy)",
  "price": 15.99,
  "category_id": "different-category-uuid",
  "includeVariants": true
}
```

### `PUT /api/v1/menu/items/reorder`
- **Status:** ✅ **READY** (Production implemented)
- **Purpose:** Reorder menu items (drag & drop support)
- **Auth Required:** Yes (Manager+ permissions)
- **Request Body:**
```json
{
  "reorderData": [
    {"id": "item-uuid-1", "display_order": 1},
    {"id": "item-uuid-2", "display_order": 2}
  ]
}
```

### `POST /api/v1/menu/items/bulk`
- **Status:** ✅ **READY** (Production implemented)
- **Purpose:** Advanced bulk operations on menu items (Superior to UEAT)
- **Auth Required:** Yes (Manager+ permissions)
- **Implementation:** Bulk availability, pricing, and category operations
- **Request Body Examples:**
```json
// Bulk Availability Update
{
  "itemIds": ["uuid1", "uuid2", "uuid3"],
  "operation": "availability",
  "data": {"is_available": false}
}

// Bulk Category Update
{
  "itemIds": ["uuid1", "uuid2"],
  "operation": "category",
  "data": {"category_id": "new-category-uuid"}
}

// Bulk Pricing - Percentage Adjustment  
{
  "itemIds": ["uuid1", "uuid2"],
  "operation": "pricing",
  "data": {
    "price_adjustment_type": "percentage",
    "adjustment": 10.0
  }
}

// Bulk Pricing - Fixed Price
{
  "itemIds": ["uuid1", "uuid2"], 
  "operation": "pricing",
  "data": {
    "price_adjustment_type": "fixed",
    "new_price": 12.99
  }
}
```

---

## **📋 Order Management Endpoints**

### `GET /api/v1/orders`
- **Status:** ✅ **READY** (Production implemented)
- **Purpose:** List branch orders with filtering and pagination
- **Auth Required:** Yes (Branch context required)
- **Implementation:** Controller-Service-Route pattern with advanced filtering
- **Query Parameters:**
  - `status=pending|preparing|ready|completed|cancelled|rejected`
  - `source=qr_code|uber_eats|doordash|phone|web|walk_in`
  - `page=1&limit=20` (pagination)
  - `date_from=2025-01-01` (ISO date)
  - `date_to=2025-01-31` (ISO date)
  - `search=customer_name` (search by customer name)
  - `sortBy=created_at|total|order_number`
  - `sortOrder=asc|desc`
- **Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "order_number": "ORDER-001",
      "customer_name": "John Doe", 
      "customer_phone": "+1 416 555 1234",
      "customer_email": "john@example.com",
      "source": "qr_code",
      "status": "pending", 
      "total": 125.50,
      "order_type": "delivery",
      "payment_status": "paid",
      "items_count": 3,
      "special_instructions": "Extra spicy",
      "created_at": "2025-01-13T10:30:00Z",
      "updated_at": "2025-01-13T10:30:00Z"
    }
  ],
  "meta": {
    "total": 150,
    "page": 1,
    "limit": 20,
    "totalPages": 8,
    "hasNextPage": true,
    "hasPreviousPage": false
  }
}
```

### `GET /api/v1/orders/:orderId`
- **Status:** ✅ **READY** (Production implemented)
- **Purpose:** Get detailed order information with items and customer data
- **Auth Required:** Yes (Branch context required)
- **Implementation:** Complete order details with order items relationship
- **Response:**
```json
{
  "data": {
    "id": "uuid",
    "order_number": "ORDER-001",
    "customer_name": "John Doe",
    "customer_phone": "+1 416 555 1234", 
    "customer_email": "john@example.com",
    "source": "qr_code",
    "status": "preparing",
    "total": 125.50,
    "subtotal": 112.50,
    "tax": 13.00,
    "order_type": "delivery",
    "payment_method": "card",
    "payment_status": "paid",
    "delivery_address": "123 Main St, Toronto",
    "special_instructions": "Extra spicy, no onions",
    "items": [
      {
        "id": "uuid",
        "menu_item_name": "Margherita Pizza",
        "quantity": 2,
        "unit_price": 18.99,
        "total_price": 37.98,
        "special_requests": "Extra cheese"
      }
    ],
    "created_at": "2025-01-13T10:30:00Z",
    "updated_at": "2025-01-13T10:32:00Z"
  }
}
```

### `PATCH /api/v1/orders/:orderId/status`
- **Status:** ✅ **READY** (Production implemented)
- **Purpose:** Update order status with validation and business rules
- **Auth Required:** Yes (Staff+ permissions)
- **Implementation:** Status transition validation with auto-ready logic integration
- **Request Body:**
```json
{
  "status": "preparing",
  "notes": "Started cooking - ETA 15 mins"
}
```
- **Valid Status Transitions:** 
  - `pending → preparing → ready → completed`
  - `any → cancelled` (Manager+ only)
  - `pending → rejected` (Manager+ only)
- **Response:**
```json
{
  "data": {
    "id": "uuid",
    "order_number": "ORDER-001",
    "previous_status": "pending",
    "new_status": "preparing", 
    "updated_at": "2025-01-13T10:32:00Z",
    "updated_by": "user_uuid",
    "notes": "Started cooking - ETA 15 mins"
  }
}
```

### `POST /api/v1/orders`
- **Status:** ✅ **READY** (Production implemented)
- **Purpose:** Create new order (QR code orders, manual entry, phone orders)
- **Auth Required:** Yes (Staff+ permissions)
- **Implementation:** Complete order creation with items, customer data, and payment processing
- **Request Body:**
```json
{
  "customer_name": "John Doe",
  "customer_phone": "+1 416 555 1234",
  "customer_email": "john@example.com", 
  "source": "phone",
  "order_type": "pickup",
  "payment_method": "cash",
  "items": [
    {
      "menu_item_id": "uuid",
      "quantity": 2,
      "special_requests": "No onions"
    }
  ],
  "special_instructions": "Call when ready",
  "delivery_address": "123 Main St" // if order_type is delivery
}
```

### `POST /api/v1/orders/auto-accept-check`
- **Status:** ✅ **READY** (Production implemented)
- **Purpose:** Check if orders should be auto-accepted based on branch settings
- **Auth Required:** Yes (System/Background job)
- **Implementation:** Automated system for processing pending orders

### `POST /api/v1/orders/timer-check`
- **Status:** ✅ **READY** (Production implemented)
- **Purpose:** Check if orders should be auto-marked as ready based on timer
- **Auth Required:** Yes (System/Background job)
- **Implementation:** Automated system for timer-based order status updates

---

## **📊 Analytics/Dashboard Endpoints**

### `GET /api/v1/orders/stats/summary`
- **Status:** ❌ **NOT IMPLEMENTED**
- **Priority:** ⚡ **MEDIUM** (Dashboard widgets)
- **Purpose:** Order statistics for dashboard
- **Planned Response:**
```json
{
  "data": {
    "todayOrders": 45,
    "todayRevenue": 2150.75,
    "avgOrderTime": "18 minutes",
    "ordersBySource": {
      "qr_code": 20,
      "uber_eats": 15,
      "phone": 10
    },
    "ordersByStatus": {
      "pending": 5,
      "preparing": 8,
      "ready": 3,
      "completed": 29
    }
  }
}
```

---

## **🔑 Authentication Setup for Mobile**

### Supabase Configuration:
```javascript
const supabaseUrl = 'https://hfaqldkvnefjerosndxr.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
```

### JWT Token Structure:
```json
{
  "sub": "user_uuid",
  "email": "user@restaurant.com", 
  "role": "branch_manager",
  "chain_id": "uuid",
  "branch_id": "uuid",
  "exp": 1640995200
}
```

---

## **📱 Mobile Implementation Priority**

### **Phase 1: User Management (Ready Now)**
- ✅ User authentication (Supabase SDK)
- ✅ User list/create/edit/delete
- ✅ Role management
- ✅ Profile management

### **Phase 2: Order Management (Week 3)**
- ⏳ Order listing and filtering  
- ⏳ Order detail view
- ⏳ Order status updates
- ⏳ Order statistics

### **Phase 3: Advanced Features**
- ⏳ Real-time order updates
- ⏳ Push notifications
- ⏳ File uploads
- ⏳ Offline support

---

## **🎯 Campaign Management Endpoints**

### `GET /api/v1/campaigns`
- **Status:** ✅ **READY** (Production implemented)
- **Purpose:** List all campaigns for branch with filtering and pagination
- **Auth Required:** Yes (Branch context required)
- **Implementation:** Controller-Service-Route pattern with advanced filtering
- **Query Parameters:**
  - `page=1&limit=50` (pagination)
  - `isActive=true|false` (filter by campaign status)
- **Response:**
```json
{
  "data": {
    "campaigns": [
      {
        "id": "uuid",
        "name": "Summer Special 20% Off",
        "code": "SUMMER20",
        "description": "Get 20% off on all pizzas this summer",
        "discount_type": "percentage",
        "discount_value": 20.00,
        "min_order_amount": 25.00,
        "max_discount_amount": 10.00,
        "is_active": true,
        "start_date": "2025-06-01",
        "end_date": "2025-08-31",
        "usage_count": 150,
        "usage_limit": 1000,
        "created_at": "2025-01-15T10:30:00Z"
      }
    ],
    "total": 15,
    "page": 1,
    "limit": 50
  }
}
```

### `POST /api/v1/campaigns`
- **Status:** ✅ **READY** (Production implemented)
- **Purpose:** Create new promotional campaign
- **Auth Required:** Yes (Manager+ permissions)
- **Request Body:**
```json
{
  "name": "Holiday Special",
  "code": "HOLIDAY25",
  "description": "25% off for holiday season",
  "discount_type": "percentage",
  "discount_value": 25.00,
  "min_order_amount": 30.00,
  "max_discount_amount": 15.00,
  "start_date": "2025-12-01",
  "end_date": "2025-12-31",
  "usage_limit": 500
}
```

### `PUT /api/v1/campaigns/:id`
- **Status:** ✅ **READY** (Production implemented)
- **Purpose:** Update existing campaign
- **Auth Required:** Yes (Manager+ permissions)

### `DELETE /api/v1/campaigns/:id`
- **Status:** ✅ **READY** (Production implemented)
- **Purpose:** Delete campaign (only inactive campaigns)
- **Auth Required:** Yes (Manager+ permissions)

### `POST /api/v1/campaigns/validate`
- **Status:** ✅ **READY** (Production implemented)
- **Purpose:** Validate campaign code for customer orders (public endpoint)
- **Auth Required:** No (Public endpoint for customers)
- **Request Body:**
```json
{
  "code": "SUMMER20",
  "branchId": "uuid",
  "orderTotal": 35.50
}
```
- **Response:**
```json
{
  "data": {
    "isValid": true,
    "campaign": {
      "id": "uuid",
      "name": "Summer Special 20% Off",
      "discount_type": "percentage",
      "discount_value": 20.00,
      "calculated_discount": 7.10
    }
  }
}
```

---

## **🚨 Error Handling**

### Standard Error Response Format:
```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Insufficient permissions",
    "details": "branch_staff cannot edit branch_manager users"
  }
}
```

### Common HTTP Status Codes:
- `200` - Success
- `201` - Created
- `400` - Bad Request (validation error)
- `401` - Unauthorized (invalid/missing token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `500` - Internal Server Error

---

## **📞 Contact & Support**

---

## **🚀 Implementation Status Overview**

### **✅ Completed & Production Ready**
- **User Management System**: Complete CRUD with role-based hierarchy ✅
- **Authentication**: Multi-tenant auth with Supabase integration ✅
- **Authorization**: Role-based access control with cross-branch protection ✅
- **Order Management System**: Full CRUD, status updates, auto-ready system ✅
- **Branch Settings**: Auto-ready configuration, timing controls ✅
- **Menu Categories API**: Full CRUD, toggle, reorder, advanced filtering ✅
- **Menu Items API**: CRUD, instant photo upload, bulk operations, variants ✅
- **API Architecture**: Modern Express.js with Controller-Service-Route pattern ✅
- **Database**: Supabase with RLS policies and optimized schemas ✅
- **Frontend**: Next.js 15 with real-time dashboard and bilingual support ✅

### **🔄 Currently Testing**
- **Menu Items API**: Thunder Client testing in progress
- **Photo Upload System**: Multipart/form-data testing
- **Bulk Operations**: Advanced bulk update testing

### **📋 Next Development Phase**
- **Menu Presets API**: Smart scheduling system with time-based switching
- **Advanced Frontend**: Modern drag & drop Menu Builder interface
- **Analytics Dashboard**: Menu performance tracking and insights
- **Real-time Sync**: WebSocket integration for live menu updates

### **🚀 UEAT-Competitive Advantages Implemented**
- **Instant Photo Upload**: vs UEAT's 3-5 day review process ✅
- **Advanced Bulk Operations**: Superior to UEAT's basic operations ✅
- **Smart Filtering**: Multi-field search and filtering ✅
- **Drag & Drop Management**: Intuitive reordering system ✅
- **Role-based Permissions**: Granular access control ✅
- **Multi-tenant Architecture**: Branch-level isolation ✅

---

## **🏗️ Backend Architecture Notes**

### **Unified Express.js Implementation**
- **Development**: `apps/api/api/index.js` - Express.js server
- **Production**: Same Express.js code deployed as Vercel serverless function
- **Legacy**: `apps/api/src/` contains archived NestJS implementation
- **Benefits**: Simple deployment, consistent behavior, easy debugging

### **Multi-Tenant Security**
```javascript
// Role hierarchy for permission checking
const ROLE_HIERARCHY = {
  'chain_owner': 3,      // Highest level - full access
  'branch_manager': 2,   // Branch management
  'branch_staff': 1,     // Limited operations
  'branch_cashier': 0    // Payment focused
};

// Permission validation
function canEditUser(currentUserRole, targetUserRole) {
  const currentLevel = ROLE_HIERARCHY[currentUserRole] || -1;
  const targetLevel = ROLE_HIERARCHY[targetUserRole] || -1;
  return currentLevel >= targetLevel;
}
```

### **Database Integration**
- **Supabase Client**: Service role for admin operations
- **RLS Policies**: Branch-level data isolation
- **JWT Claims**: Custom user context with branch information
- **Admin API**: User management with Supabase Auth admin functions

---

## **🔧 Development & Testing**

### **Local Development Setup**
```bash
# Start backend API
cd apps/api
npm run dev  # Runs on http://localhost:3001

# Test endpoints
curl -H "Authorization: Bearer <jwt_token>" \
     http://localhost:3001/auth/profile
```

### **Environment Variables**
```bash
# Required for API functionality
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_JWT_SECRET=your-jwt-secret
FRONTEND_URL=http://localhost:3000
```

### **Production Deployment**
- **Frontend**: `dev-vizionmenu.vercel.app`
- **Backend**: `dev-vizionmenu-web.vercel.app`
- **Database**: Production Supabase instance
- **Environment**: Vercel environment variables

---

## **📞 API Support & Updates**

**Current Status**: User management system fully implemented and production-ready
**Next Priority**: Order management endpoints (CRUD operations)
**Architecture**: Scalable Express.js backend with Supabase integration
**Documentation**: This document reflects current implementation status

**Development Notes**:
- All ✅ READY endpoints are tested and production-deployed
- Error handling includes proper HTTP status codes and structured responses
- Authentication uses Supabase JWT tokens with custom branch context
- Authorization enforces role hierarchy and cross-branch protection

**Last Updated**: January 2025 | **Version**: 1.0.0