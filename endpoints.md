# Vision Menu API Endpoints - Complete Reference

## **API Base Configuration**

```
Development: http://localhost:3001
Production: https://dev-vizionmenu-web.vercel.app (Vercel deployment)
```

**Architecture:** Unified Express.js backend (same code for dev + production)
**Database:** Supabase PostgreSQL with Row-Level Security (RLS)
**Authentication:** Bearer JWT Token from Supabase with custom claims

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

---

## **🚀 Implementation Status Overview**

### **✅ Completed & Production Ready**
- **User Management System**: Complete CRUD with role-based hierarchy
- **Authentication**: Multi-tenant auth with Supabase integration
- **Authorization**: Role-based access control with cross-branch protection
- **API Architecture**: Unified Express.js backend deployed on Vercel
- **Database**: Supabase with Row-Level Security policies
- **Frontend**: Next.js 15 application with real-time order dashboard

### **🔄 In Active Development**
- **Order Management Endpoints**: Core CRUD operations for orders
- **Menu Management System**: Category and item management
- **Analytics Dashboard**: Order statistics and reporting
- **Real-time Features**: WebSocket integration for live updates

### **📋 Planned Features**
- **Third-party Integrations**: Uber Eats, DoorDash API sync
- **Background Jobs**: Email notifications, webhook processing
- **Mobile API**: Enhanced endpoints for mobile applications
- **Advanced Analytics**: Performance metrics and insights

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