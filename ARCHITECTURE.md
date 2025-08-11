# Vision Menu - Complete System Architecture

**Comprehensive architectural overview of Vision Menu multi-tenant restaurant management platform**

---

## 🎯 Executive Summary

Vision Menu is an enterprise-grade **multi-tenant restaurant management platform** built with modern TypeScript stack. The system supports restaurant chains with multiple branches, featuring sophisticated role-based access control, real-time order management, and comprehensive third-party integrations.

**Architecture Type**: Microservices with unified backend deployment  
**Multi-tenancy**: Branch-level data isolation with chain-wide management  
**Deployment**: Vercel serverless functions with Supabase backend  
**Security**: JWT-based authentication with Row-Level Security (RLS)

---

## 🏗️ High-Level Architecture

### **System Overview**

```
┌─────────────────────────────────────────────────────────────┐
│                     VISION MENU PLATFORM                   │
├─────────────────────────────────────────────────────────────┤
│  Frontend (Next.js 15)     │    Backend (Express.js)       │
│  ┌─────────────────────┐   │   ┌─────────────────────────┐  │
│  │ • React 19          │   │   │ • Modern MVC Structure  │  │
│  │ • App Router        │   │   │ • Controller-Service    │  │
│  │ • ShadCN UI         │   │   │ • Multi-tenant Auth     │  │
│  │ • Real-time Updates │   │   │ • Supabase Integration  │  │
│  └─────────────────────┘   │   └─────────────────────────┘  │
├─────────────────────────────────────────────────────────────┤
│                   Background Worker (Node.js)              │
│   ┌──────────────────────────────────────────────────────┐  │
│   │ • Email Processing  • Third-party Sync              │  │
│   │ • Webhook Handling  • Push Notifications            │  │
│   └──────────────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────────────┤
│                 Data Layer (Supabase)                      │
│   ┌──────────────────────────────────────────────────────┐  │
│   │ • PostgreSQL Database    • Row-Level Security       │  │
│   │ • Real-time Subscriptions • Authentication Service  │  │
│   │ • File Storage          • Edge Functions            │  │
│   └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## 🏢 Multi-Tenant Architecture

### **Hierarchical Data Model**

```typescript
// Multi-tenant hierarchy
Restaurant Chain (Pizza Palace)
├── Branch: Downtown Location
│   ├── Users: [Manager, Staff, Cashier]
│   ├── Menu: [Categories → Items → Variations]
│   ├── Orders: [Pending, Preparing, Ready, Delivered]
│   └── Settings: [Local configuration]
├── Branch: Mall Location
│   └── [Same structure as Downtown]
└── Branch: Airport Location
    └── [Same structure as Downtown]
```

### **Data Isolation Strategy**

1. **Branch-Level Isolation**: Each branch's data is completely separated
2. **Cross-Branch Access Control**: Users cannot access other branches without permission
3. **Chain-Level Management**: Chain owners can manage all branches
4. **Role-Based Security**: Hierarchical permissions within each branch

### **Database Schema Design**

```sql
-- Core multi-tenant tables
restaurant_chains (id, name, slug, settings)
├── branches (id, chain_id, name, slug, address)
    ├── branch_users (user_id, branch_id, role, permissions)
    ├── menu_categories (branch_id, name, display_order)
    │   └── menu_items (category_id, name, price, variations)
    └── orders (branch_id, customer_info, status, total)
        └── order_items (order_id, menu_item, quantity, price)
```

---

## 🛠️ Technology Stack & Components

### **Frontend Stack (Next.js 15)**

```typescript
// Complete frontend architecture
apps/web/src/
├── app/                    # Next.js App Router
│   ├── (auth)/login/      # Authentication pages
│   ├── dashboard/         # Main dashboard
│   ├── orders/            # Order management
│   │   ├── live/         # Real-time orders
│   │   ├── history/      # Order history
│   │   └── [orderId]/    # Dynamic order details
│   └── settings/         # Configuration pages
├── components/           # React components
│   ├── ui/              # ShadCN design system
│   ├── auth/            # Authentication components
│   └── user-management/ # User CRUD components
├── contexts/            # React Context providers
├── hooks/               # Custom React hooks
├── services/            # API integration layer
└── types/               # TypeScript definitions
```

**Key Technologies:**
- **Framework**: Next.js 15 with App Router
- **UI Library**: React 19 with TypeScript
- **Styling**: Tailwind CSS + ShadCN UI components
- **State Management**: React Context + Zustand stores
- **Forms**: React Hook Form + Zod validation
- **Real-time**: Supabase subscriptions

### **Backend Stack (Express.js Unified)**

```typescript
// Unified Express.js architecture
apps/api/
├── api/index.js          # Production Express.js server
├── src/                  # Legacy NestJS (archived)
│   ├── modules/         # Feature modules
│   ├── guards/          # Authorization guards  
│   ├── decorators/      # Custom decorators
│   └── types/           # TypeScript definitions
└── package.json         # Dependencies
```

**Unified Backend Benefits:**
- **Development-Production Parity**: Same code runs everywhere
- **Zero Configuration**: No build transformations needed
- **Simple Debugging**: Consistent behavior across environments
- **Rapid Deployment**: Direct Express.js to Vercel functions

### **Background Worker (Node.js)**

```typescript
// Background job processing architecture
apps/worker/src/
├── processors/          # Job processors
│   ├── email.processor.ts    # Email notifications
│   ├── webhook.processor.ts  # Webhook handling
│   └── sync.processor.ts     # Third-party sync
├── queues/              # Queue management
├── config/              # Worker configuration
└── utils/               # Logging and utilities
```

**Queue System (Redis + BullMQ):**
- **Email Queue**: Order confirmations, status updates
- **Webhook Queue**: Stripe payments, third-party platforms
- **Sync Queue**: Menu/order synchronization
- **Notification Queue**: Push notifications, SMS

---

## 🔐 Security Architecture

### **Multi-Layer Authentication**

```typescript
// Authentication flow
1. User Login → Supabase Auth
2. JWT Token Generation → Custom claims with branch context
3. API Request → Token validation + Branch context loading
4. Database Query → RLS policies enforce branch isolation
5. Response → Filtered data based on user permissions
```

### **Role-Based Access Control (RBAC)**

```typescript
// Role hierarchy with permission levels
const ROLE_HIERARCHY = {
  'chain_owner': 3,      // Full access across all branches
  'branch_manager': 2,   // Branch-specific management
  'branch_staff': 1,     // Limited operations access
  'branch_cashier': 0    // Payment processing focused
};

// Permission system
type Permission = 
  | "users:read" | "users:write" | "users:delete"
  | "menu:read" | "menu:write" 
  | "orders:read" | "orders:write"
  | "reports:read" | "settings:write";

// Role-based permission assignment
const DEFAULT_PERMISSIONS: Record<BranchRole, Permission[]> = {
  chain_owner: ["*"], // All permissions
  branch_manager: ["users:read", "users:write", "menu:read", "menu:write"],
  branch_staff: ["orders:read", "orders:write", "reports:read"],
  branch_cashier: ["orders:read", "orders:write", "payments:read"]
};
```

### **Database Security (Row-Level Security)**

```sql
-- Branch-level data isolation
CREATE POLICY "branch_access" ON orders 
FOR ALL USING (EXISTS (
  SELECT 1 FROM branch_users 
  WHERE branch_users.branch_id = orders.branch_id 
  AND branch_users.user_id = auth.uid()
));

-- Role-based menu access
CREATE POLICY "menu_management" ON menu_items
FOR ALL USING (EXISTS (
  SELECT 1 FROM branch_users 
  WHERE branch_users.branch_id = menu_items.branch_id 
  AND branch_users.user_id = auth.uid()
  AND branch_users.role IN ('chain_owner', 'branch_manager')
));
```

---

## 📊 Data Flow Architecture

### **Order Processing Flow**

```typescript
// Complete order lifecycle
Customer Order → Frontend → API → Database → Queue → Worker → Notification

1. Customer places order (QR code, web, mobile)
2. Frontend validates and submits order
3. API creates order record with branch context
4. Database stores with RLS enforcement
5. Queue triggers background jobs
6. Worker processes email confirmations
7. Real-time updates sent to dashboard
8. Staff receives notification
```

### **User Management Flow**

```typescript
// User creation and management
Manager Action → Frontend → API → Auth Service → Database → Profile Creation

1. Manager initiates user creation
2. Frontend form with role selection
3. API validates permissions (hierarchy check)
4. Supabase Auth creates user account
5. Database creates user profile and branch association
6. Email invitation sent via background job
7. New user can login with assigned role
```

### **Real-time Updates Flow**

```typescript
// Real-time data synchronization
Database Change → Supabase Realtime → Frontend → UI Update

1. Order status updated in database
2. Supabase triggers real-time event
3. Frontend receives WebSocket notification
4. Component state updated automatically
5. UI reflects new status immediately
6. Optimistic updates provide instant feedback
```

---

## 🚀 Deployment Architecture

### **Vercel Serverless Deployment**

```typescript
// Unified deployment strategy
Development:
  Frontend: http://localhost:3000 (Next.js dev server)
  Backend:  http://localhost:3001 (Express.js server)
  
Production:
  Frontend: https://dev-vizionmenu.vercel.app (Static + SSR)
  Backend:  https://dev-vizionmenu-web.vercel.app (Serverless function)
```

### **Environment Configuration**

```bash
# Production environment variables
SUPABASE_URL=https://project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=service_role_key
SUPABASE_ANON_KEY=anon_key  
SUPABASE_JWT_SECRET=jwt_secret
FRONTEND_URL=https://dev-vizionmenu.vercel.app
NODE_ENV=production
```

### **Build & Deployment Pipeline**

```bash
# Automated deployment workflow
1. git push origin main
2. Vercel detects changes
3. Next.js build process (frontend)
4. Express.js serverless function (backend)
5. Environment variables applied
6. Production deployment complete
7. Health checks validate deployment
```

---

## 🔄 Background Job Architecture

### **Queue System Design**

```typescript
// Queue configuration and job types
const QUEUES = {
  EMAIL: "email-queue",           // Order confirmations, notifications
  WEBHOOK: "webhook-queue",       // Payment webhooks, third-party
  SYNC: "sync-queue",            // Menu/order synchronization
  NOTIFICATION: "notification-queue" // Push notifications, SMS
};

// Job processing with retry logic
defaultJobOptions: {
  removeOnComplete: 100,
  removeOnFail: 50,
  attempts: 3,
  backoff: { type: "exponential", delay: 2000 }
}
```

### **Third-Party Integration Architecture**

```typescript
// External service integration
Uber Eats API ←→ Sync Processor ←→ Vision Menu Database
DoorDash API ←→ Webhook Handler ←→ Order Processing System
Stripe API ←→ Payment Processor ←→ Order Completion Flow

// Integration workflow
1. Third-party webhook received
2. Signature validation
3. Data transformation to internal format
4. Database update with branch context
5. Real-time notification to frontend
6. Email confirmation via queue
```

---

## 📱 Frontend Architecture Patterns

### **Component Architecture**

```typescript
// Component hierarchy and organization
Layout Components (App-wide)
├── AuthGuard (Route protection)
├── Sidebar (Navigation)
├── ThemeProvider (Dark/light themes)
└── LanguageProvider (Internationalization)

Feature Components (Domain-specific)
├── UserManagement/
│   ├── UserListTable
│   ├── CreateUserModal
│   ├── EditUserModal
│   └── RoleAssignmentDropdown
├── OrderManagement/
│   ├── LiveOrdersDashboard
│   ├── OrderHistoryPage
│   └── OrderDetailView
└── Settings/
    ├── GeneralSettings
    └── UserSettings
```

### **State Management Strategy**

```typescript
// Hybrid state management approach
Global State (React Context):
├── AuthContext → User session and permissions
├── ThemeContext → UI theme preferences
└── LanguageContext → Internationalization

Feature State (Zustand):
├── useAuth() → Enhanced authentication with API
├── useUsers() → User management CRUD operations
└── useOrders() → Order state with real-time updates

Component State (React useState):
├── Form state (React Hook Form)
├── UI state (modals, dropdowns)
└── Local component state
```

---

## 🔧 Development Architecture

### **Monorepo Structure**

```typescript
// Complete monorepo organization
vision-menu/
├── apps/                 # Applications
│   ├── api/             # Express.js backend
│   ├── web/             # Next.js frontend
│   └── worker/          # Background jobs
├── packages/            # Shared packages
│   ├── types/           # TypeScript definitions
│   ├── ui/              # React components
│   └── config/          # Shared configuration
├── docs/                # Documentation
└── scripts/             # Build and deployment scripts
```

### **Build System (Turborepo)**

```json
// turbo.json configuration
{
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "dist/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {"dependsOn": ["^lint"]},
    "type-check": {"dependsOn": ["^type-check"]}
  }
}
```

### **Development Workflow**

```bash
# Complete development environment
pnpm dev                 # Start all applications
pnpm build              # Build all packages
pnpm lint               # Lint all code
pnpm type-check         # TypeScript validation

# Individual app development
pnpm dev:web            # Frontend development
pnpm dev:api            # Backend development
pnpm dev:worker         # Worker development
```

---

## 📈 Performance & Scalability

### **Frontend Performance**

- **Code Splitting**: Automatic route-based splitting with Next.js
- **Image Optimization**: Next.js automatic image optimization
- **Caching**: Static generation with incremental regeneration
- **Bundle Size**: Tree shaking and dead code elimination
- **Real-time**: Efficient WebSocket connections with Supabase

### **Backend Scalability**

- **Serverless Functions**: Auto-scaling with Vercel
- **Database Connections**: Supabase connection pooling
- **Caching**: Redis-based application caching
- **Rate Limiting**: Built-in request throttling
- **Error Handling**: Comprehensive error tracking and recovery

### **Database Performance**

- **Indexing**: Strategic database indexes for query optimization
- **RLS Policies**: Efficient row-level security enforcement
- **Connection Pooling**: Supabase managed connections
- **Query Optimization**: Optimized database queries with proper joins
- **Real-time**: Efficient change data capture with Supabase

---

## 🛡️ Security Architecture

### **Application Security**

- **Authentication**: Multi-layer JWT validation
- **Authorization**: Role-based access control with hierarchy
- **Input Validation**: Comprehensive request sanitization
- **SQL Injection**: Protected via Supabase parameterized queries
- **XSS Protection**: React built-in XSS protection
- **CSRF Protection**: SameSite cookies and token validation

### **Infrastructure Security**

- **HTTPS Everywhere**: TLS encryption for all communication
- **Environment Variables**: Secure secret management
- **CORS Configuration**: Strict cross-origin policies
- **Rate Limiting**: DDoS protection and abuse prevention
- **Audit Logging**: Comprehensive security event logging

---

## 🎯 Future Architecture Considerations

### **Planned Enhancements**

1. **Microservices Evolution**: Gradual migration to true microservices
2. **API Gateway**: Centralized API management and routing
3. **Event-Driven Architecture**: Enhanced real-time capabilities
4. **Advanced Caching**: Multi-layer caching strategy
5. **Mobile API**: Dedicated mobile application endpoints
6. **Analytics Platform**: Advanced business intelligence
7. **ML Integration**: Predictive analytics and recommendations

### **Scalability Roadmap**

- **Horizontal Scaling**: Multi-region deployment capability
- **Database Sharding**: Branch-based data distribution
- **CDN Integration**: Global content delivery
- **Load Balancing**: Advanced traffic distribution
- **Monitoring**: Comprehensive observability platform

---

## 📞 Architecture Support

**Architecture Status**: ✅ Production-ready with enterprise-grade patterns  
**Scalability**: Designed for multi-tenant restaurant chains  
**Security**: Multi-layer security with branch-level isolation  
**Performance**: Optimized for real-time restaurant operations  
**Maintainability**: Clean architecture with separation of concerns

**Key Strengths**:
- Multi-tenant architecture with complete data isolation
- Unified backend deployment for consistent behavior
- Role-based security with hierarchical permissions
- Real-time capabilities for live restaurant operations
- Scalable monorepo structure with shared packages
- Production-ready deployment with comprehensive monitoring

---

**Last Updated**: January 2025 | **Architecture Version**: 1.0.0