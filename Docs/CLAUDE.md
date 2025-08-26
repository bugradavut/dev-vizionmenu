# CLAUDE.md - VizionMenu Project Documentation

**Complete project guide for Claude AI - Last Updated: January 26, 2025**

---

## 🎯 PROJECT OVERVIEW

**VizionMenu** is an **enterprise-grade multi-tenant restaurant ordering and management platform** built with modern TypeScript stack. It serves restaurant chains with multiple branches, featuring sophisticated role-based access control, real-time order management, and comprehensive third-party platform integrations.

### **🏗️ Architecture Overview**

**Monorepo Structure (Turborepo + PNPM):**
```
vision-menu/
├── apps/                    # Main applications
│   ├── web/                # Next.js 15 frontend
│   ├── api/                # Express.js unified backend
│   └── worker/             # Node.js background jobs
├── packages/               # Shared packages
│   ├── types/              # TypeScript definitions
│   ├── ui/                 # React component library
│   └── config/             # Shared configuration
├── Docs/                   # Comprehensive documentation
└── photos/                 # Asset storage
```

**Key Features:**
- **Multi-tenant Architecture**: Restaurant chains with branch-level isolation
- **Real-time Order Management**: Live kitchen displays and customer tracking
- **Bilingual System**: English/Canadian French with professional translations
- **Third-party Integrations**: Uber Eats, DoorDash, Skip The Dishes
- **Customer Ordering**: QR code scanning and web ordering interface
- **Campaign System**: Discount codes and promotional campaigns
- **Pre-order System**: Schedule orders up to 10 days in advance

---

## 💻 TECHNOLOGY STACK

### **Frontend (apps/web) - Next.js 15**
- **Framework**: Next.js 15 with App Router (React 19)
- **Styling**: Tailwind CSS + ShadCN UI components
- **State Management**: React Context + Zustand stores
- **Forms**: React Hook Form + Zod validation
- **Real-time**: Supabase WebSocket subscriptions
- **Authentication**: Supabase Auth with custom JWT parsing

### **Backend (apps/api) - Express.js**
- **Architecture**: Unified Express.js (same code dev/production)
- **Pattern**: Controller-Service-Route modular structure
- **Database**: Supabase PostgreSQL with Row-Level Security (RLS)
- **Authentication**: Supabase Auth + JWT with custom claims
- **Error Handling**: Centralized error handler
- **File Structure**:
```
api/
├── controllers/           # Request handlers
├── services/             # Business logic
├── routes/               # Express routes
├── middleware/           # Auth, validation, CORS
└── helpers/              # Utilities and validation
```

### **Database & External Services**
- **Supabase**: PostgreSQL with RLS, real-time subscriptions, auth, storage
- **Redis + BullMQ**: Background job processing
- **Stripe**: Payment processing with webhooks
- **Third-party APIs**: Uber Eats, DoorDash, Skip The Dishes

### **Deployment**
- **Frontend**: Vercel (https://dev-vizionmenu.vercel.app)
- **Backend**: Vercel (https://dev-vizionmenu-web.vercel.app)
- **Database**: Supabase production instance
- **Queue**: Upstash Redis for background jobs

---

## 🍽️ RESTAURANT ORDER FLOW SYSTEM

### **Dual-Flow Architecture**

VizionMenu supports two operational modes configurable per branch:

**1. Standard Flow (Manual Control):**
```
Pending → Confirmed → Preparing → Ready → Completed
```
- Full manual control at each step
- Perfect for fine dining or complex kitchens
- Staff manually progresses through all statuses

**2. Simplified Flow (Smart Automation):**
```
Auto-Accept → Preparing → Auto-Ready (timer-based) → Completed
```
- Automatic acceptance and timer-based progression
- Manual override capability at any stage
- Configurable timing with temporary adjustments

### **Timing Configuration (Simplified Flow)**
```typescript
interface TimingSettings {
  baseDelay: number;           // Base preparation time (default: 20 min)
  temporaryBaseDelay: number;  // Temporary adjustment +/- (rush hours)
  deliveryDelay: number;       // Delivery time (default: 15 min) 
  temporaryDeliveryDelay: number; // Temporary delivery adjustment
  manualReadyOption: boolean;  // Allow manual "Ready" before timer
}
```

---

## 🛒 CUSTOMER ORDER FLOW

### **Order Journey Path**
```
/order → /order/review → /order/confirmation → /order/track (optional)
```

**1. Order Page (`/order`)**: Menu browsing and cart management
**2. Review Page (`/order/review`)**: Customer info and checkout
**3. Confirmation Page (`/order/confirmation`)**: Order status tracking

### **Data Management**
- **Cart**: localStorage for persistence across sessions
- **Session**: sessionStorage for order confirmation (auto-cleanup after 10 min)
- **API**: Public endpoints `/api/v1/customer/orders` for order submission and tracking

### **Order Context**
```typescript
interface OrderContext {
  source: 'qr' | 'web';           // Order source
  branchId: string;               // Restaurant branch
  tableNumber?: number;           // Table (QR only)
  zone?: string;                  // Zone/area (QR only)
}
```

---

## 🌍 MULTI-LANGUAGE SYSTEM

### **Bilingual Architecture (English/Canadian French)**

**CRITICAL RULES:**
1. **Always use centralized translations** from `apps/web/src/lib/translations.ts`
2. **Never create inline translations** - use translation context
3. **Canadian French terminology** - restaurant industry specific
4. **Professional quality** - production-ready translations

**Implementation Pattern:**
```typescript
import { useLanguage } from '@/contexts/language-context'
import { translations } from '@/lib/translations'

const { language } = useLanguage()
const t = translations[language] || translations.en

// Usage: t.navigation.dashboard, t.orders.status.pending
```

**Key Canadian French Terms:**
- "Sur place" (dine-in)
- "À emporter" (takeaway)
- "Comptant" (cash)
- "Courriel" (email)
- "25,99 $" (currency format)

**Translation Coverage (100% Complete):**
- Navigation, Dashboard, Orders, Settings
- User Management, Notifications
- All status labels and validation messages
- Error states and loading states

---

## 🏗️ BACKEND ARCHITECTURE - MODERN PATTERN

### **MANDATORY Structure for All New APIs**

**File Organization:**
```
apps/api/api/
├── controllers/     # Route handlers ONLY
├── services/        # Business logic layer
├── routes/          # Route definitions ONLY
├── middleware/      # Auth, validation middleware
├── helpers/         # Utilities (error-handler, auth, permissions)
└── index.js         # Entry point - route mounting
```

**Controller Pattern (REQUIRED):**
```javascript
const { handleControllerError } = require('../helpers/error-handler');
const service = require('../services/feature.service');

const controllerMethod = async (req, res) => {
  try {
    const result = await service.businessMethod(req.params.id);
    res.json({ data: result });
  } catch (error) {
    handleControllerError(error, 'operation description', res);
  }
};

module.exports = { controllerMethod };
```

**Service Pattern (REQUIRED):**
```javascript
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function businessMethod(param) {
  // Validation
  if (!param) throw new Error('Parameter required');
  
  // Database operations
  const { data, error } = await supabase
    .from('table_name')
    .select('*')
    .eq('param', param);
    
  if (error) throw new Error(`Database error: ${error.message}`);
  
  // Business logic
  return processBusinessLogic(data);
}

module.exports = { businessMethod };
```

---

## 🔐 SECURITY & MULTI-TENANT RULES

### **Authentication & Authorization**
- **Supabase Auth**: JWT with custom claims
- **Role Hierarchy**: chain_owner > branch_manager > branch_staff > branch_cashier
- **Branch Isolation**: RLS policies enforce data separation
- **Permission Validation**: Required before all operations

### **Role Hierarchy Validation**
```typescript
const ROLE_HIERARCHY = {
  'chain_owner': 3,
  'branch_manager': 2,
  'branch_staff': 1,
  'branch_cashier': 0
} as const;

function canEditUser(currentRole: BranchRole, targetRole: BranchRole): boolean {
  return (ROLE_HIERARCHY[currentRole] || -1) >= (ROLE_HIERARCHY[targetRole] || -1);
}
```

### **Database Access Pattern**
```typescript
// ✅ CORRECT - Branch-scoped query
const { data } = await supabase
  .from('orders')
  .select('*')
  .eq('branch_id', userBranchId); // RLS enforces isolation

// ❌ WRONG - Could expose cross-branch data
const { data } = await supabase.from('orders').select('*');
```

---

## 📱 RESPONSIVE DESIGN STANDARDS

### **Mobile-First Approach**
- **Breakpoints**: sm:640px, md:768px, lg:1024px, xl:1280px
- **Layout Pattern**: Stack → Flex → Grid progression
- **Touch Targets**: Minimum 44px for mobile interaction
- **No Horizontal Scroll**: All components must fit within viewport

### **Responsive Component Pattern**
```tsx
// ✅ GOOD - Progressive layout enhancement
<div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
  <div className="flex items-center gap-2">
    {/* Mobile: stacked, Desktop: inline */}
  </div>
  <div className="relative flex-1 min-w-0 max-w-md">
    {/* Flexible responsive container */}
  </div>
</div>
```

### **Device Testing Requirements**
- **Required Devices**: iPad Air, iPad Mini, iPhone, desktop
- **Chrome DevTools**: Responsive mode testing
- **Cross-browser**: Chrome, Safari, Firefox
- **Performance**: Core Web Vitals monitoring

---

## 🎯 CODING STANDARDS

### **Critical Quality Rules**
```bash
# MUST pass before any commit:
npm run lint     # ✅ Zero ESLint errors/warnings
npm run build    # ✅ Clean TypeScript compilation
npx tsc --noEmit # ✅ Type checking passes
```

### **TypeScript Standards**
- **Strict typing**: No `any` types without justification
- **Interface over type**: For object definitions
- **Proper generics**: For reusable components
- **Import type**: For type-only imports

### **Component Standards**
```tsx
// ✅ GOOD - Proper component structure
interface UserListProps {
  users: UserProfile[];
  onUserClick: (userId: string) => void;
  isLoading?: boolean;
}

export const UserList: React.FC<UserListProps> = ({ 
  users, 
  onUserClick, 
  isLoading = false 
}) => {
  // Implementation
};
```

### **State Management Rules**
- **React Context**: Global app state (auth, theme, language)
- **Zustand**: Complex feature state with API integration
- **useState**: Local component state only
- **No prop drilling**: Use appropriate state management

---

## 📊 **COMPLETE API ENDPOINTS REFERENCE**

> **Note**: For complete API endpoint documentation with request/response examples, see `Docs/endpoints.md`

### **✅ PRODUCTION READY ENDPOINTS**

#### **🔐 Authentication & User Management**
- `GET /auth/profile` - Current user profile
- `POST /api/v1/users` - Create user with role
- `GET /api/v1/users/branch/:branchId` - List branch users
- `PATCH /api/v1/users/:userId/branch/:branchId` - Update user
- `POST /api/v1/users/:userId/branch/:branchId/assign-role` - Assign role
- `DELETE /api/v1/users/:userId/branch/:branchId` - Delete user

#### **🍽️ Menu Management**
- `GET /api/v1/menu/categories` - List categories with filtering
- `POST /api/v1/menu/categories` - Create category
- `PUT /api/v1/menu/categories/:id` - Update category
- `PATCH /api/v1/menu/categories/:id/toggle` - Toggle availability
- `PUT /api/v1/menu/categories/reorder` - Drag & drop reorder
- `GET /api/v1/menu/items` - List items with advanced filtering
- `POST /api/v1/menu/items` - Create item with photo upload
- `PUT /api/v1/menu/items/:id` - Update item
- `POST /api/v1/menu/items/bulk` - Bulk operations (pricing, availability)

#### **📋 Order Management**
- `GET /api/v1/orders` - List orders with filtering
- `GET /api/v1/orders/:orderId` - Order details
- `PATCH /api/v1/orders/:orderId/status` - Update status
- `POST /api/v1/orders/auto-accept-check` - Auto-accept system
- `POST /api/v1/orders/timer-check` - Timer-based ready system

#### **🏢 Branch Settings**
- `GET /api/v1/branch/:branchId/settings` - Branch configuration
- `PUT /api/v1/branch/:branchId/settings` - Update timing settings

#### **🎯 Campaign System**
- `GET /api/v1/campaigns` - List campaigns
- `POST /api/v1/campaigns` - Create campaign
- `PUT /api/v1/campaigns/:id` - Update campaign
- `DELETE /api/v1/campaigns/:id` - Delete campaign
- `POST /api/v1/campaigns/validate` - Validate promo code (public)

#### **📱 Customer-Facing (Public)**
- `GET /api/v1/customer/menu/:branchId` - Public menu
- `POST /api/v1/customer/orders` - Submit order
- `GET /api/v1/customer/orders/:orderId/status` - Track order

#### **🔄 Platform Integration**
- `POST /api/v1/platform-sync/uber-eats/menu` - Sync to Uber Eats
- `POST /api/v1/platform-sync/doordash/menu` - Sync to DoorDash
- `POST /api/v1/platform-sync/skipthedishes/menu` - Sync to Skip

#### **📈 Menu Presets (Smart Scheduling)**
- `GET /api/v1/menu/presets` - List presets
- `POST /api/v1/menu/presets` - Create preset
- `POST /api/v1/menu/presets/:id/activate` - Apply preset
- `POST /api/v1/menu/presets/check-scheduled` - Auto-scheduling

### **Response Format Standards**
```typescript
// Success Response
{
  "data": {
    "orderId": "uuid",
    "status": "preparing",
    "items": [...],
    "total": 24.75
  }
}

// Error Response
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid order data",
    "details": "Missing required field: customerInfo.name"
  }
}
```

### **Authentication Pattern**
- **Protected Endpoints**: Bearer JWT with branch context validation
- **Public Endpoints**: Customer-facing, rate-limited by IP
- **Branch Scoped**: RLS policies prevent cross-branch access

---

## 🎨 **FRONTEND ARCHITECTURE REFERENCE**

### **📱 Main Application Pages**
```
/dashboard                    # Main dashboard with real-time stats
/login                       # Authentication page
/orders/live                 # Real-time order management
/orders/kitchen              # Kitchen display system
/orders/history             # Order history and analytics
/orders/:orderId            # Individual order details
/menu                       # Menu management hub
/menu/categories            # Category management
/menu/items                 # Item management  
/menu/presets               # Preset scheduling
/campaigns/create           # Campaign creation
/settings                   # Settings hub
/settings/branch            # Branch configuration
/settings/users             # User management
/settings/general           # General settings
```

### **🛒 Customer Ordering Flow**
```
/order                      # Menu browsing & cart
/order/review               # Customer info & checkout  
/order/confirmation         # Order status & tracking
/order/track                # Real-time order tracking
```

### **🔧 Key React Components**
```typescript
// Layout & Navigation
<DashboardLayout />         # Main app layout with sidebar
<AppSidebar />             # Navigation sidebar
<DynamicBreadcrumb />      # Auto-generated breadcrumbs

// Order Management  
<OrderList />              # Order listing with filters
<OrderCard />              # Individual order card
<StatusUpdateButton />     # Order status controls
<KitchenDisplay />         # Real-time kitchen orders

// Menu Management
<MenuGrid />               # Menu item grid display
<ItemModal />              # Create/edit menu items
<CategorySidebar />        # Category navigation
<BulkActions />            # Bulk operations toolbar

// Customer Experience
<CartSidebar />            # Shopping cart
<OrderSummary />           # Order review component
<PaymentMethodSection />   # Payment selection
<TipSection />             # Tip calculator

// User Management
<UserListTable />          # User management table
<CreateUserModal />        # User creation form
<RoleAssignmentDropdown /> # Role selection
```

### **🎯 Context Providers & State**
```typescript
// Global Context
<AuthContext />            # Authentication state
<LanguageContext />        # Bilingual system
<ThemeContext />           # Dark/light theme
<NotificationContext />    # Real-time notifications

// Feature-Specific Context  
<OrderContext />           # Customer order flow
<CartContext />            # Shopping cart state
<OrderFormContext />       # Order management

// Zustand Stores
useOrdersStore()           # Order management state
useMenuStore()             # Menu management state
useUsersStore()            # User management state
```

### **🔌 Custom Hooks**
```typescript
// Authentication
useAuth()                  # Auth state and methods
useEnhancedAuth()          # Extended auth with permissions

// API Integration
useOrders()                # Order CRUD operations
useUsers()                 # User management
useBranchSettings()        # Settings management

// Real-time Features
useOrderNotifications()    # Live order updates
useSmartPolling()          # Intelligent data refresh
useCrossTabNotifications() # Cross-tab sync

// UI/UX
useMobile()                # Mobile responsiveness
useNotificationSound()     # Audio notifications
useOrderTimer()            # Timer displays
```

### **🎨 Design System**
- **UI Library**: ShadCN UI components
- **Styling**: Tailwind CSS with design tokens  
- **Icons**: Lucide React icons
- **Theme**: Dark/light mode support
- **Responsive**: Mobile-first design patterns

---

## 🚨 CRITICAL RULES & RESTRICTIONS

### **NEVER DO THESE:**
- ❌ Create monolithic API code - use Controller-Service-Route pattern
- ❌ Put business logic in controllers - controllers handle request/response only
- ❌ Bypass centralized error handling - always use `handleControllerError`
- ❌ Modify archived NestJS code in `apps/api/src/`
- ❌ Create custom authentication - use Supabase Auth exclusively
- ❌ Use inline translations - use centralized translation system
- ❌ Modify existing Canadian French translations - they are production-ready
- ❌ Commit code that doesn't pass lint/build checks

### **ALWAYS DO THESE:**
- ✅ Create Controller-Service-Route for every new feature
- ✅ Use `handleControllerError` in all controllers
- ✅ Put business logic in services, never controllers
- ✅ Mount new routes in `apps/api/api/index.js`
- ✅ Validate user permissions before operations
- ✅ Test responsive design on multiple devices
- ✅ Add both English and Canadian French translations
- ✅ Run lint and build before committing

---

## 🚀 QUICK REFERENCE - NEW API FEATURE

### **Step-by-Step Process:**

**1. Create Service** (`apps/api/api/services/feature.service.js`)
```javascript
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function businessMethod(param) {
  // Business logic implementation
  return result;
}

module.exports = { businessMethod };
```

**2. Create Controller** (`apps/api/api/controllers/feature.controller.js`)
```javascript
const { handleControllerError } = require('../helpers/error-handler');
const service = require('../services/feature.service');

const controllerMethod = async (req, res) => {
  try {
    const result = await service.businessMethod(req.params.id);
    res.json({ data: result });
  } catch (error) {
    handleControllerError(error, 'operation name', res);
  }
};

module.exports = { controllerMethod };
```

**3. Create Routes** (`apps/api/api/routes/feature.routes.js`)
```javascript
const express = require('express');
const controller = require('../controllers/feature.controller');
const { requireAuth } = require('../middleware/auth.middleware');

const router = express.Router();
router.get('/:id', requireAuth, controller.controllerMethod);

module.exports = router;
```

**4. Mount Routes** (in `apps/api/api/index.js`)
```javascript
const featureRoutes = require('./routes/feature.routes');
app.use('/api/v1/feature', featureRoutes);
```

**5. Validate**
```bash
npm run lint && npm run build  # Must pass
```

---

## 🎯 PROJECT CONTEXT SUMMARY

**VizionMenu** is a production-ready restaurant management platform serving multiple restaurant chains. The system handles:

- **Multi-tenant architecture** with branch-level data isolation
- **Real-time order management** with kitchen displays
- **Customer ordering interface** via QR codes and web
- **Bilingual system** with professional Canadian French translations
- **Third-party integrations** for major food delivery platforms
- **Campaign system** for promotions and discounts

**Current Status**: Active development with ongoing feature enhancements

**Technology Focus**: Modern TypeScript stack with emphasis on type safety, responsive design, and multi-tenant security

**Development Priority**: Code quality, responsive design, multi-language support, and maintainable architecture

---

*This documentation provides Claude AI with comprehensive understanding of the VizionMenu project architecture, standards, and development requirements.*

**Version**: 5.0.0 | **Last Updated**: August 26, 2025