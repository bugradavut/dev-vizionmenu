# VizionMenu - AI Assistant Guide

**Modern enterprise restaurant management platform with advanced commission engine**

---

## 🏗️ **PROJECT ARCHITECTURE**

### **💼 Business Model**
- **Multi-tenant B2B SaaS** for restaurant chains
- **Commission-based revenue**: Platform earns commission on orders
- **Source-specific rates**: Website (3%), QR (1%), Mobile (2%), Third-party (0%)
- **Three-tier hierarchy**: Platform → Chain → Branch settings

### **🎯 Core Features**
- **Commission Engine**: Complete source-based commission management (95% complete)
- **Multi-tenant Architecture**: Restaurant chains with multiple branches
- **Order Management**: Real-time order processing with kitchen screens
- **Menu Management**: Dynamic menus with scheduling and presets
- **User Management**: Role-based access control (Platform Admin, Chain Owner, Branch Manager)
- **Campaign System**: Discount codes and promotions
- **Bilingual Support**: English/Canadian French

### **🔧 Tech Stack**
```typescript
Frontend: Next.js 15 + React 19 + TypeScript + ShadCN UI + Tailwind CSS
Backend:  Express.js + Node.js (Unified architecture - no separate API server)
Database: Supabase (PostgreSQL + Auth + Row-Level Security)
Deploy:   Vercel (Frontend + Backend together)
UI:       ShadCN components (ALWAYS use existing components first)
```

---

## 🎨 **UI/UX STANDARDS**

### **🎨 Design System**
- **Component Library**: ShadCN UI exclusively - check `/components/ui/` first
- **Icons**: Lucide React - descriptive, professional icons
- **Mobile-first**: All interfaces must be mobile responsive
- **Loading States**: Professional spinners and skeleton loaders
- **Error Handling**: Graceful fallbacks with user-friendly messages

### **🌍 Internationalization**
- **Languages**: English (default) + Canadian French
- **Implementation**: `useLanguage()` context + `translations` object
- **UI Text**: Always provide both EN/FR versions

### **📱 Component Patterns**
- **Modal Design**: Clean list-based layouts with consistent spacing
- **Tables**: Sortable, filterable with ShadCN Table component
- **Forms**: ShadCN Form component with validation
- **Navigation**: Sidebar + Breadcrumb pattern
- **Cards**: Consistent card layouts with hover states

---

## 📊 **DATABASE ARCHITECTURE**

### **🏢 Multi-tenant Structure**
```sql
restaurant_chains (Pizza Palace, McDonald's, etc.)
├── branches (Downtown, Mall, Airport locations)
│   ├── users (managers, staff, cashiers)
│   ├── menu_categories → menu_items → menu_item_variants
│   ├── orders → order_items → order_item_variants
│   └── commission_settings (branch-specific rates)
├── commission_settings (chain-specific rates)
└── coupons/campaigns
```

### **🔐 Security Model**
- **Row-Level Security**: All tables filtered by user's branch/chain access
- **Role Hierarchy**: platform_admin > chain_owner > branch_manager > branch_staff > branch_cashier
- **Authentication**: Supabase Auth + JWT tokens
- **Authorization**: Middleware validates user access per endpoint

---

## 💰 **COMMISSION ENGINE (Production Ready)**

### **✅ Complete Features**
- **Source-based Rates**: 8 different order sources with configurable rates
- **Multi-level Configuration**: Platform defaults → Chain overrides → Branch overrides
- **Admin Interface**: Professional UI with tab-based settings (Chain/Branch)
- **Real-time Calculation**: Commission calculated per order
- **Inheritance Logic**: Branch > Chain > Default rate priority

### **📊 Commission Tables**
```sql
default_commission_rates     -- Platform defaults (website: 3%, qr: 1%, etc.)
commission_settings         -- Chain/branch overrides
commission_transactions     -- Historical commission records
orders                     -- Contains commission fields per order
```

### **🎯 API Endpoints (15+ endpoints ready)**
```javascript
GET /api/v1/commission/defaults              // Platform rates
PUT /api/v1/commission/defaults/:sourceType  // Update platform rate
GET /api/v1/commission/settings/:chainId     // Chain settings
PUT /api/v1/commission/settings/:chainId/:sourceType // Set chain rate
GET /api/v1/commission/branch-settings/:branchId     // Branch settings
PUT /api/v1/commission/branch-settings/:branchId/:sourceType // Set branch rate
```

---

## 📋 **CURRENT PROJECT STATUS**

### **✅ Production Ready Components**
- **Commission Engine**: 95% complete (see COMMISSION_ENGINE_WEEK_PLAN.md)
- **Menu Management**: Categories, items, variants, scheduling
- **User Management**: Full RBAC system with role assignments
- **Order System**: Real-time order processing and kitchen screens
- **Campaign System**: Discount codes and promo validation
- **Branch Settings**: Timing, delivery, minimum order configuration

### **🚨 Critical Missing Features**
1. **Order Flow Integration**: Commission calculation not integrated in customer order submission
2. **Source Detection Testing**: QR vs Website source tagging needs validation
3. **Commission Reports UI**: Backend ready, need analytics dashboard

### **⏳ Future Enhancements**
- **Stripe Connect**: Automated commission deduction from payments
- **Advanced Analytics**: Revenue trends and performance metrics
- **Mobile App**: React Native app for customers

---

## 🎯 **DEVELOPMENT GUIDELINES**

### **🔍 Before Coding**
1. **Check existing components**: Look in `/components/ui/` and `/components/` first
2. **Review similar patterns**: Find existing implementations to follow
3. **Understand multi-tenancy**: Ensure proper branch/chain filtering
4. **Consider mobile**: Design mobile-first, tablet-second, desktop-third

### **💻 Code Standards**
- **TypeScript**: Strict mode, proper interfaces/types
- **ESLint**: Follow existing configuration
- **Error Handling**: Try-catch blocks with user-friendly error messages
- **Loading States**: Always show loading indicators for async operations
- **State Management**: React Query for server state, local state for UI

### **🔐 Security Requirements**
- **Input Validation**: Validate all user inputs
- **SQL Injection**: Use parameterized queries
- **Auth Checks**: Verify user permissions before operations
- **RLS Policy**: Ensure database-level security

### **🧪 Testing Approach**
- **Manual Testing**: Test all user flows manually
- **Edge Cases**: Test with empty states, errors, large datasets
- **Cross-browser**: Test Chrome, Safari, Firefox
- **Mobile Testing**: Test responsive behavior on actual devices

---

## 📚 **KEY FILES TO REFERENCE**

### **Commission System**
- `apps/api/api/services/commission.service.js` - All commission logic
- `apps/web/src/app/admin-settings/commission/page.tsx` - Main admin UI
- `apps/web/src/components/commission/configure-commission-modal.tsx` - Modal with tabs
- `apps/web/src/components/commission/branch-settings-tab.tsx` - Branch-specific UI

### **Architecture Patterns**
- `apps/web/src/app/admin-settings/branches/page.tsx` - Multi-tenant list pattern
- `apps/web/src/app/settings/branch/page.tsx` - Settings page pattern
- `apps/web/src/app/order/review/page.tsx` - Customer order flow (needs commission integration)

### **Reusable Components**
- `apps/web/src/components/ui/` - All ShadCN base components
- `apps/web/src/components/dashboard-layout.tsx` - Main layout wrapper
- `apps/web/src/components/auth-guard.tsx` - Route protection
- `apps/web/src/components/dynamic-breadcrumb.tsx` - Navigation breadcrumbs

---

## 🚀 **IMMEDIATE PRIORITIES (Next Session)**

### **🔴 CRITICAL: Order Flow Integration (Start Here)**
**Problem**: Commission Engine 95% ready but NO orders calculate commission = $0 tracking
**Solution**: Integrate commission calculation into customer order submission flow
**File**: `apps/web/src/app/order/review/page.tsx` - submitOrder function
**Tasks**: 
- Add source detection (QR vs Website)
- Calculate commission before order submission  
- Store commission data in orders table
- Test with real order flow

### **🟡 PRIORITY 2: Source Detection Testing**
- Verify QR code orders → order_source = 'qr', 1% commission
- Verify Website orders → order_source = 'website', 3% commission
- Check database records for accuracy

### **🟢 PRIORITY 3: Commission Reports UI** 
- Build `/admin-settings/commission-reports` dashboard
- Revenue analytics and export functionality

**Focus**: Order Flow Integration is the missing 5% that makes the entire Commission Engine functional.

---

**💡 Remember**: This is a production-scale enterprise application. Code quality, security, and user experience are paramount. Always consider the restaurant owner's perspective and the end customer's experience.

**Last Updated**: January 2025 | **Commission Engine**: 95% Complete