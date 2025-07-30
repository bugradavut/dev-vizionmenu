# VizionMenu API Endpoints - Mobile Developer Reference

## **API Base Configuration**

```
Development: http://localhost:3001
Production: [TBD - Vercel deployment URL]
```

**Authentication:** Bearer JWT Token from Supabase
```
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
- **Status:** ✅ **READY**
- **Purpose:** Create new user
- **Auth Required:** Yes (Manager+ role)
- **Request Body:**
```json
{
  "email": "newuser@restaurant.com",
  "role": "branch_staff",
  "branchId": "uuid",
  "firstName": "Jane",
  "lastName": "Smith",
  "phone": "+1 416 555 1234"
}
```
- **Response:** User object with generated ID

### `GET /api/v1/users/branch/:branchId`
- **Status:** ✅ **READY** 
- **Purpose:** List all users in a branch
- **Auth Required:** Yes (Manager+ role)
- **Query Parameters:**
  - `page=1` (pagination)
  - `limit=10` (items per page)
  - `search=john` (name/email search)
- **Response:**
```json
{
  "data": [...users],
  "meta": {
    "total": 25,
    "page": 1,
    "limit": 10,
    "totalPages": 3
  }
}
```

### `PATCH /api/v1/users/:userId/branch/:branchId`
- **Status:** ✅ **READY**
- **Purpose:** Update user information
- **Auth Required:** Yes (Manager+ role, hierarchy respected)
- **Request Body:**
```json
{
  "firstName": "Updated Name",
  "lastName": "Updated Surname", 
  "phone": "+1 416 555 9999",
  "role": "branch_manager"
}
```

### `POST /api/v1/users/:userId/branch/:branchId/assign-role`
- **Status:** ✅ **READY**
- **Purpose:** Assign new role to user
- **Auth Required:** Yes (Chain Owner or Manager)
- **Request Body:**
```json
{
  "role": "branch_manager"
}
```
- **Role Options:** `chain_owner`, `branch_manager`, `branch_staff`, `branch_cashier`

### `DELETE /api/v1/users/:userId/branch/:branchId`
- **Status:** ✅ **READY**
- **Purpose:** Permanently delete user
- **Auth Required:** Yes (Manager+ role, hierarchy respected)
- **Response:** Success confirmation

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

---

## **📋 Order Management Endpoints**

### `GET /api/v1/orders`
- **Status:** ❌ **NOT IMPLEMENTED**
- **Priority:** 🔥 **CRITICAL** (Week 3 focus)
- **Purpose:** List branch orders with filtering
- **Planned Query Parameters:**
  - `status=pending|preparing|ready|completed`
  - `source=qr_code|uber_eats|doordash|phone|web`
  - `page=1&limit=20`
  - `date_from=2025-07-01`
  - `date_to=2025-07-28`
- **Planned Response:**
```json
{
  "data": [
    {
      "id": "ORDER-001",
      "orderNumber": "ORDER-001",
      "customerName": "John Doe",
      "customerPhone": "+1 416 555 1234",
      "source": "qr_code",
      "status": "pending",
      "total": 125.50,
      "items": [...],
      "createdAt": "2025-07-28T10:30:00Z"
    }
  ],
  "meta": { "total": 50, "page": 1 }
}
```

### `GET /api/v1/orders/:orderId`
- **Status:** ❌ **NOT IMPLEMENTED**
- **Priority:** 🔥 **CRITICAL** (Needed for detail page)
- **Purpose:** Get detailed order information
- **Planned Response:** Complete order with items, customer, payment info

### `PATCH /api/v1/orders/:orderId/status`
- **Status:** ❌ **NOT IMPLEMENTED**
- **Priority:** 🔥 **CRITICAL** (Core restaurant operation)
- **Purpose:** Update order status
- **Planned Request:**
```json
{
  "status": "preparing",
  "notes": "Started cooking - ETA 15 mins"
}
```

### `POST /api/v1/orders`
- **Status:** ❌ **NOT IMPLEMENTED**
- **Priority:** ⚡ **MEDIUM** (For manual order entry)
- **Purpose:** Create new order (QR code orders, phone orders)

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

**API Status Updates:** Check this document for real-time endpoint status
**Backend Team:** Ready to prioritize mobile-critical endpoints
**Timeline:** Order management endpoints target completion: This week

**Note:** All ✅ READY endpoints are production-ready and tested. Mobile development can begin with user management features while order management endpoints are being completed.