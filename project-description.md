
# Vision Menu - Complete Technical Project Description

## 🎯 Project Overview

**Vision Menu** is an enterprise-grade **multi-tenant restaurant ordering and management platform** similar to Adisyo or UEAT. Built with modern TypeScript stack, the system supports restaurant chains with multiple branches, sophisticated role-based access control, real-time order management, and comprehensive third-party integrations.

---

## 🏗️ Architecture & Design Principles

### Multi-Tenant Architecture
- **Restaurant Chains**: Top-level organizations containing multiple branches
- **Branch-Level Isolation**: Data segregation and access control per restaurant location
- **Role-Based Security**: Hierarchical permission system with cross-branch protection
- **Scalable Design**: Supports unlimited chains and branches with consistent performance

### Monorepo Structure
```
vision-menu/
├── apps/
│   ├── api/        # Unified Express.js + NestJS Backend
│   ├── web/        # Next.js 15 Frontend Application
│   └── worker/     # Background Job Processing Service
├── packages/
│   ├── types/      # Shared TypeScript Definitions
│   ├── ui/         # React Component Library (ShadCN)
│   └── config/     # Shared Configuration Factory
└── docs/           # Documentation & Database Schema
```

---

## 🛠️ Technology Stack

### **Frontend Stack**
- **Framework**: Next.js 15 with App Router architecture
- **UI Library**: React 19 with TypeScript
- **Styling**: Tailwind CSS with custom design system
- **Components**: ShadCN UI with Radix primitives
- **State Management**: React Context + Zustand for complex state
- **Forms**: React Hook Form with Zod validation
- **Authentication**: Supabase Auth with custom JWT parsing
- **Real-time**: Supabase real-time subscriptions

### **Backend Stack**
- **Framework**: Unified Express.js (production) + NestJS (development/archived)
- **Language**: TypeScript with strict type checking
- **Database**: Supabase (PostgreSQL) with Row-Level Security (RLS)
- **Authentication**: Supabase Auth with custom JWT claims
- **Validation**: Zod schemas with automatic TypeScript inference
- **Security**: CORS, rate limiting, input sanitization
- **Documentation**: Swagger/OpenAPI with automatic generation

### **Infrastructure & DevOps**
- **Monorepo**: PNPM workspaces with Turborepo build orchestration
- **Queue System**: Redis + BullMQ for background job processing
- **Caching**: Redis-based application and session caching
- **Deployment**: Vercel for both frontend and API (unified Express.js)
- **Environment**: Multi-environment configuration with type safety
- **Monitoring**: Winston logging with structured error tracking

### **Third-Party Integrations**
- **Payments**: Stripe with webhook handling and tokenization
- **Email**: SMTP integration for order notifications
- **Food Delivery**: Uber Eats and DoorDash API integration
- **Real-time**: WebSocket support for live order updates

---

## 🏢 Business Domain Model

### **Restaurant Chain Structure**
```typescript
Restaurant Chain (e.g., "Pizza Palace")
├── Branch: Downtown Location
├── Branch: Mall Location  
└── Branch: Airport Location

Each Branch:
├── Menu (categories, items, variations)
├── Orders (multi-channel: QR, web, third-party)
├── Users (staff with roles and permissions)
└── Settings (local configuration)
```

### **User Role Hierarchy**
```typescript
chain_owner (Level 3)      // Full access across all branches
├── branch_manager (Level 2)  // Branch-specific management
├── branch_staff (Level 1)    // Limited operations access
└── branch_cashier (Level 0)  // Payment processing focus
```

### **Permission System**
```typescript
// Resource-based permissions
type Permission = 
  | "users:read" | "users:write" | "users:delete"
  | "menu:read" | "menu:write" 
  | "orders:read" | "orders:write"
  | "reports:read" | "settings:read" | "settings:write"
  | "branch:read" | "branch:write";

// Role-based permission assignment
const DEFAULT_PERMISSIONS: Record<BranchRole, Permission[]> = {
  chain_owner: ["*"], // All permissions
  branch_manager: ["users:read", "users:write", "menu:read", "menu:write", ...],
  branch_staff: ["orders:read", "orders:write", "reports:read"],
  branch_cashier: ["orders:read", "orders:write", "payments:read", "payments:write"]
};
```

---

## 📊 Core Business Features

### **Order Management System**
- **Multi-channel Orders**: QR codes, web app, mobile, third-party platforms
- **Real-time Dashboard**: Live order tracking with status updates
- **Order Sources**: Direct orders, Uber Eats, DoorDash, phone orders
- **Status Workflow**: Pending → Confirmed → Preparing → Ready → Delivered
- **Payment Integration**: Stripe with webhook handling
- **Customer Management**: Contact information and order history

### **Menu Management**
- **Hierarchical Structure**: Menu → Categories → Items → Variations
- **Dynamic Pricing**: Base prices with variation adjustments
- **Inventory Tracking**: Stock levels and availability scheduling
- **Dietary Information**: Allergens, dietary restrictions, nutritional data
- **Multi-branch Menus**: Shared or branch-specific menu configurations

### **User & Staff Management**
- **Multi-branch Users**: Staff can work across multiple locations
- **Role Assignment**: Hierarchical permission management
- **Invitation System**: Email-based user onboarding
- **Profile Management**: Personal information and preferences
- **Access Control**: Branch-level and resource-level permissions

### **Analytics & Reporting**
- **Order Analytics**: Revenue, quantity, and performance metrics
- **Branch Comparison**: Multi-location performance analysis
- **Time-based Reports**: Daily, weekly, monthly reporting
- **Source Analysis**: Order channel performance tracking
- **User Activity**: Staff performance and activity logs

---

## 🔄 Background Job Processing

### **Queue Architecture**
```typescript
// Four main job queues
const QUEUES = {
  EMAIL: "email-queue",           // Order confirmations, notifications
  WEBHOOK: "webhook-queue",       // Stripe, third-party webhooks
  SYNC: "sync-queue",            // Menu/order synchronization  
  NOTIFICATION: "notification-queue" // Push notifications, SMS
};
```

### **Job Types & Processing**
- **Email Jobs**: Order confirmations, status updates, password resets
- **Webhook Jobs**: Payment processing, third-party order webhooks
- **Sync Jobs**: Uber Eats/DoorDash order synchronization
- **Notification Jobs**: Real-time push notifications to staff/customers

### **Reliability Features**
- **Retry Logic**: Exponential backoff with 3 retry attempts
- **Dead Letter Queue**: Failed job handling and analysis
- **Job Monitoring**: Real-time job status and performance tracking
- **Horizontal Scaling**: Configurable worker concurrency

---

## 🛡️ Security Implementation

### **Authentication Architecture**
```typescript
// Multi-layer authentication flow
1. Supabase Auth → JWT Token Generation
2. Custom API Validation → Branch Context Loading
3. Permission Check → Resource Access Control
4. Audit Logging → Security Event Tracking
```

### **Authorization Patterns**
- **Branch-Level RLS**: Database-level row security policies
- **Cross-Branch Protection**: Prevents unauthorized data access
- **Role-Based Guards**: Controller-level permission enforcement
- **Resource Scoping**: API endpoints filtered by user context

### **Data Security**
- **SQL Injection Prevention**: Parameterized queries via Supabase
- **Input Validation**: Comprehensive request sanitization
- **Password Security**: bcrypt hashing with salt rounds
- **Session Management**: JWT tokens with refresh capabilities
- **CORS Configuration**: Strict cross-origin policies

---

## 📱 Frontend Architecture

### **Next.js App Router Structure**
```typescript
app/
├── (auth)/
│   └── login/              # Authentication pages
├── dashboard/              # Main dashboard overview
├── orders/
│   ├── live/              # Real-time order management
│   ├── history/           # Historical order data
│   └── [orderId]/         # Dynamic order details
├── settings/
│   ├── general/           # Theme and preferences
│   └── users/             # User management
└── layout.tsx             # Root layout with providers
```

### **State Management Strategy**
```typescript
// Context Providers (Global State)
AuthContext       → Authentication and user session
ThemeContext      → Dark/light theme preferences
LanguageContext   → Internationalization (EN/FR)

// Zustand Stores (Feature State)  
useAuth()         → Enhanced auth with API integration
useUsers()        → User management with CRUD operations
useOrders()       → Order state with real-time updates
```

### **Component Architecture**
- **Design System**: ShadCN components with custom variants
- **Form Handling**: React Hook Form with Zod validation
- **Real-time Updates**: Supabase subscriptions with optimistic updates
- **Error Boundaries**: Graceful error handling and recovery
- **Loading States**: Skeleton screens and progress indicators

---

## 🔧 Development Workflow

### **Environment Configuration**
```bash
# Development Environment
- Frontend: http://localhost:3000 (Next.js dev server)
- Backend: http://localhost:3001 (Express.js with hot reload)
- Database: Supabase instance with development data
- Queue: Local Redis instance for job processing

# Production Environment  
- Frontend: Vercel deployment with optimization
- Backend: Vercel serverless functions (same Express.js code)
- Database: Production Supabase with RLS policies
- Queue: Upstash Redis for scalable job processing
```

### **Build & Deployment Pipeline**
```bash
# Development Commands
pnpm dev           # Start all applications
pnpm build         # Build all packages
pnpm lint          # ESLint + TypeScript checking
pnpm type-check    # Strict TypeScript validation

# Deployment Process
1. Development → dev-vizionmenu.vercel.app (auto-deploy)
2. Testing → Manual validation on dev environment  
3. Production → Company repository deployment
```

---

## 📂 Database Schema Design

### **Core Tables Structure**
```sql
-- Multi-tenant hierarchy
restaurant_chains (id, name, slug, settings)
├── branches (id, chain_id, name, slug, address)
    ├── branch_users (user_id, branch_id, role, permissions)
    ├── menu_categories (branch_id, name, display_order)
    │   └── menu_items (category_id, name, price, variations)
    └── orders (branch_id, customer_info, status, total)
        └── order_items (order_id, menu_item, quantity, price)
```

### **Security Policies (RLS)**
```sql
-- Branch-level data isolation
CREATE POLICY "branch_access" ON orders 
FOR ALL USING (EXISTS (
  SELECT 1 FROM branch_users 
  WHERE branch_users.branch_id = orders.branch_id 
  AND branch_users.user_id = auth.uid()
));
```

---

## 🎯 Implementation Guidelines

### **Development Principles**
1. **Type Safety First**: Every component must be fully typed
2. **Multi-tenant Awareness**: All data access must respect branch isolation
3. **Performance Optimized**: Implement caching and optimistic updates
4. **Security by Design**: Validate all inputs and enforce permissions
5. **Error Resilience**: Graceful degradation and comprehensive error handling
6. **Scalable Architecture**: Design for horizontal scaling and growth

### **Code Standards**
- **TypeScript Strict Mode**: Enable all strict type checking
- **ESLint Configuration**: Enforce consistent code style
- **Component Patterns**: Use composition over inheritance
- **API Design**: RESTful endpoints with consistent response formats
- **Database Design**: Normalize data with proper indexing
- **Testing Strategy**: Unit tests for business logic, integration tests for API

### **Integration Requirements**
- **Third-party APIs**: Robust error handling and retry logic
- **Payment Processing**: PCI compliance and secure tokenization
- **Real-time Features**: WebSocket management and fallback strategies
- **Background Jobs**: Idempotent operations with monitoring
- **Monitoring**: Comprehensive logging and error tracking

---

## 🚀 Future Roadmap

### **Phase 1 - Core Platform** ✅
- Multi-tenant authentication and authorization
- User management system with RBAC
- Real-time order dashboard
- Basic menu management
- Unified Express.js API deployment

### **Phase 2 - Order Management** 🔄
- Complete order lifecycle management
- Advanced filtering and search
- Order status automation
- Customer communication system
- Performance analytics dashboard

### **Phase 3 - Integration & Scale** 📋
- Uber Eats/DoorDash full integration
- Advanced reporting and analytics
- Mobile application API
- Push notification system
- Advanced caching and performance optimization

### **Phase 4 - Enterprise Features** 🎯
- Multi-language support expansion
- Advanced inventory management
- Franchise management features
- Advanced analytics and ML insights
- White-label customization options

---

## 📞 Technical Support & References

### **Documentation Structure**
- **`README.md`**: Project overview and quick start guide
- **`Auth-sql.md`**: Complete database schema and setup
- **`endpoints.md`**: API endpoint documentation and status
- **`DEPLOYMENT.md`**: Deployment procedures and workflow
- **`project-description.md`**: This comprehensive technical overview

### **Development Notes**
- **Unified Backend**: Same Express.js code runs in development and production
- **Type Sharing**: Monorepo packages ensure type consistency
- **Environment Parity**: Development closely matches production
- **Legacy Code**: NestJS implementation archived in `apps/api/src`
- **Migration Path**: Clear upgrade path from development to production

---

**Status**: Production-ready platform with enterprise-grade architecture
**Maintainer**: Solo developer with comprehensive documentation
**Last Updated**: January 2025

