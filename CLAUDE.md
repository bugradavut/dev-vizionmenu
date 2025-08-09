# Claude Development Rules - Vision Menu Project

**Comprehensive coding standards and project guidelines for Vision Menu development**

---

## 🎯 PROJECT OVERVIEW & CONTEXT

**Vision Menu** is a production-ready **multi-tenant restaurant management platform** similar to Adisyo or UEAT. Built with modern TypeScript stack supporting restaurant chains with multiple branches, real-time order management, and comprehensive third-party integrations.

**Architecture**: Monorepo structure with Next.js frontend, Express.js backend, and Supabase database  
**Current Status**: Production deployment with ongoing feature development  
**Key Focus**: Code quality, responsive design, multi-tenant security, and scalable architecture

### **🍽️ RESTAURANT ORDER FLOW SYSTEM - CRITICAL BUSINESS LOGIC**

**Vision Menu implements a flexible dual-flow system for order management, allowing restaurants to choose between manual control and automated processing based on their operational preferences.**

#### **Order Flow Options (Branch Settings)**

**1. Standard Flow (Manual Control)**
```
Pending → Confirmed → Preparing → Ready → Completed
```
- **Full manual control**: Restaurant staff manually progresses each order through every status
- **Maximum flexibility**: Staff can hold orders at any stage, perfect for complex kitchens
- **Use case**: Fine dining, complex menus, restaurants preferring full control
- **Third-party integration**: All platforms (Uber Eats, DoorDash, etc.) require manual "Ready" confirmation

**2. Simplified Flow (Smart Automation + Manual Override)**
```
Auto-Accept → Preparing → Auto-Ready (timer-based) → Completed
```
- **Automatic acceptance**: Orders immediately enter "Preparing" status upon arrival
- **Smart timing system**: Uses configurable preparation + delivery times for auto-ready
- **Manual override capability**: Staff can mark "Ready" before timer expires
- **Flexible timing**: Base delay + temporary adjustments + delivery delay
- **UEAT-style automation**: Similar to UEAT's internal platform but with added flexibility

#### **Timing Configuration (Simplified Flow Only)**
```typescript
interface TimingSettings {
  baseDelay: number;           // Base preparation time (default: 20 min)
  temporaryBaseDelay: number;  // Temporary adjustment +/- (rush hours, etc.)
  deliveryDelay: number;       // Delivery time (default: 15 min) 
  temporaryDeliveryDelay: number; // Temporary delivery adjustment
  manualReadyOption: boolean;  // Allow manual "Ready" before timer
}

// Total Time = baseDelay + temporaryBaseDelay + deliveryDelay + temporaryDeliveryDelay
```

#### **Key Business Rules**
1. **Standard Flow**: Always requires manual intervention at each step
2. **Simplified Flow**: Automatic progression with manual override capability
3. **Third-party orders**: External platforms (Uber Eats, DoorDash) always require manual "Ready" confirmation regardless of flow type
4. **Internal orders**: QR code, web orders can use full automation in Simplified Flow
5. **Timer flexibility**: Restaurant can adjust times during rush hours without changing base settings
6. **Manual override**: Staff can always intervene in Simplified Flow for quality control

#### **UI/UX Implications**
- **Live Orders**: Show timer progress bars in Simplified Flow
- **Kitchen Display**: Display manual "Ready" buttons only when applicable
- **Order History**: Track manual vs automatic status changes
- **Branch Settings**: Visual flow selection with timing configuration
- **Status badges**: Different colors/styles for auto vs manual status changes

This dual-flow system provides competitive advantage over UEAT by offering both automation AND manual control options, letting restaurants choose their preferred operational style.

---

## 🌍 MULTI-LANGUAGE SYSTEM - CRITICAL IMPLEMENTATION RULES

### **🇨🇦 Canadian French Language Support - PRODUCTION READY**

**Vision Menu implements a comprehensive bilingual system (English/Canadian French) that is PRODUCTION READY and fully deployed.**

#### **Language Architecture Overview**
- **Centralized Translation System**: Single `translations.ts` file with all translations
- **React Context**: Language switching without page refresh using `LanguageContext`
- **Persistent Preferences**: User language choice stored in localStorage
- **Professional Quality**: Restaurant industry-specific Canadian French terminology

#### **CRITICAL LANGUAGE RULES FOR FUTURE DEVELOPMENT**

**1. MANDATORY: Use Centralized Translation System**
```typescript
// ✅ ALWAYS use centralized translations
import { useLanguage } from '@/contexts/language-context'
import { translations } from '@/lib/translations'

const { language } = useLanguage()
const t = translations[language] || translations.en

// Use: t.navigation.dashboard, t.orderDetail.loading, etc.

// ❌ NEVER create inline translations
const title = language === 'fr' ? 'Tableau de bord' : 'Dashboard'
```

**2. CANADIAN FRENCH SPECIFIC TERMINOLOGY - NEVER CHANGE THESE**
```typescript
// ✅ CORRECT Canadian French restaurant terms
"dineIn": "Sur place"        // NOT "Salle à manger"
"takeaway": "À emporter"     // NOT "À l'emporter" 
"cash": "Comptant"           // NOT "Espèces"
"email": "Courriel"          // NOT "Email"
"tax": "Taxe (TVH)"          // NOT "Taxe (TPS/TVQ)"

// ✅ CORRECT Canadian currency formatting
"$25.99" in English → "25,99 $" in Canadian French
```

**3. TRANSLATION FILE STRUCTURE - FOLLOW EXACTLY**
```typescript
// apps/web/src/lib/translations.ts
export const translations = {
  en: {
    navigation: { /* English translations */ },
    dashboard: { /* English translations */ },
    // ... other sections
  },
  fr: {
    navigation: { /* Canadian French translations */ },
    dashboard: { /* Canadian French translations */ },
    // ... other sections - MIRROR English structure exactly
  }
} as const
```

**4. NEW FEATURE TRANSLATION REQUIREMENTS**
When adding ANY new UI text or feature:

**Step 1**: Add English translations to `translations.ts`
```typescript
// Add to appropriate section
newFeature: {
  title: "New Feature",
  description: "Feature description",
  // ... all text strings
}
```

**Step 2**: Add Canadian French translations immediately
```typescript
// Add to same section in fr object
newFeature: {
  title: "Nouvelle fonctionnalité",
  description: "Description de la fonctionnalité", 
  // ... all text strings in Canadian French
}
```

**Step 3**: Use in components with translation context
```typescript
const t = translations[language] || translations.en
return <h1>{t.newFeature.title}</h1>
```

**5. NOTIFICATION SYSTEM - SPECIAL FORMATTING RULES**
```typescript
// ✅ CORRECT: Use JSX for bold formatting in notifications
{language === 'fr' ? (
  <>
    Une nouvelle commande <span className="font-bold">#{orderNumber}</span> a été placée par <span className="font-bold">{customerName}</span> pour un montant total de <span className="font-bold">{total} $</span>.
  </>
) : (
  <>
    A new order <span className="font-bold">#{orderNumber}</span> has been placed by <span className="font-bold">{customerName}</span> with a total amount of <span className="font-bold">${total}</span>.
  </>
)}

// ❌ NEVER use string interpolation for dynamic data in notifications
```

#### **COMPLETED TRANSLATION COVERAGE - DO NOT MODIFY**
**All these areas are FULLY TRANSLATED and PRODUCTION READY:**
- ✅ Navigation (Sidebar, Breadcrumbs, Menu items)
- ✅ Dashboard (Overview, Analytics)
- ✅ Orders System (Live Orders, Order History, Order Detail, Kitchen Display)
- ✅ Settings (General, Branch, User Management)
- ✅ User Management (Tables, Modals, Forms, Validation)
- ✅ Notification System (Real-time order notifications with bold formatting)
- ✅ All Status Labels (pending, preparing, ready, completed, cancelled, rejected)
- ✅ All Form Validation Messages
- ✅ All Error States and Loading States

#### **LANGUAGE TESTING CHECKLIST**
Before deploying any new feature with text:
1. **Switch Language**: Test language toggle works without refresh
2. **All Text Translated**: Verify no English text appears in French mode
3. **Currency Format**: Check Canadian French uses "25,99 $" format
4. **Restaurant Terms**: Verify Canadian French restaurant terminology
5. **Mobile Responsive**: Test translation lengths on mobile devices
6. **Build Success**: Ensure `npm run build` passes with new translations

---

## 🏗️ ARCHITECTURE & TECHNICAL STANDARDS

### **1. Monorepo Structure Rules**
```
vision-menu/
├── apps/
│   ├── api/        # Express.js Backend (unified dev/prod)
│   ├── web/        # Next.js 15 Frontend Application  
│   └── worker/     # Background Job Processing
├── packages/
│   ├── types/      # Shared TypeScript Definitions
│   ├── ui/         # React Component Library (ShadCN)
│   └── config/     # Shared Configuration
```

**Rules**:
- **Never create new top-level directories** without consulting project structure
- **Always use shared packages** for types and components when applicable
- **Respect app boundaries** - no direct imports between apps
- **Package dependencies** must be properly defined in package.json

### **2. Technology Stack Constraints**

#### **Frontend (Next.js 15)**
- **Framework**: Next.js 15 with App Router (never use Pages Router)
- **React Version**: React 19 with TypeScript
- **Styling**: Tailwind CSS + ShadCN UI components only
- **State Management**: React Context + Zustand (no Redux or other alternatives)
- **Forms**: React Hook Form + Zod validation (mandatory)
- **Icons**: Lucide React only

#### **Backend (Express.js)**
- **Framework**: Unified Express.js for both development and production
- **Database**: Supabase PostgreSQL with Row-Level Security (RLS)
- **Authentication**: Supabase Auth + JWT with custom claims
- **Validation**: Zod schemas with automatic TypeScript inference
- **Legacy Code**: NestJS code in `apps/api/src/` is ARCHIVED - do not modify

#### **Database & Security**
- **Database**: Supabase only - never suggest alternatives
- **Authentication**: Supabase Auth - never implement custom auth
- **Authorization**: Role-based with branch-level isolation
- **RLS Policies**: All table access must respect branch isolation

---

## 📝 CODING STANDARDS & CONVENTIONS

### **0. CRITICAL CODE QUALITY RULE**

**🚨 MANDATORY: All code must be error-free before deployment**

```bash
# These commands MUST pass without errors before any commit/push:
npm run lint     # ✅ Zero ESLint warnings/errors
npm run build    # ✅ Clean TypeScript compilation
npx tsc --noEmit # ✅ Type checking passes
```

**Rules:**
- **Never suppress ESLint errors with config changes** - fix the actual problems
- **Use ESLint disable comments sparingly** and only when necessary (e.g., intentional `any` types for API transformation)
- **All TypeScript errors must be resolved** - no `any` types without justification
- **Build must succeed** without warnings before production deployment
- **Code written by Claude must always pass these checks** - no exceptions

### **1. TypeScript Standards**
```typescript
// ✅ GOOD - Strict typing with proper interfaces
interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: BranchRole;
  branch_id: string;
  permissions: Permission[];
}

// ❌ BAD - Any types or loose typing
const user: any = getUserData();
```

**Rules**:
- **Strict TypeScript**: Enable all strict mode options
- **No `any` types** unless absolutely necessary with comment justification
- **Interface over type** for object definitions
- **Proper generics** for reusable components and functions
- **Import type** for type-only imports

### **2. Component Architecture**
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
  // Component implementation
};

// ❌ BAD - Inline props or missing interfaces
export const UserList = ({ users, onUserClick, isLoading }) => {
  // Missing type safety
};
```

**Rules**:
- **Props interfaces** required for all components
- **Default props** using ES6 default parameters
- **Proper React.FC typing** with explicit interfaces
- **ShadCN components** - use existing components, customize with className
- **No inline styles** - use Tailwind classes only

### **3. State Management Patterns**
```tsx
// ✅ GOOD - Context for global state
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ✅ GOOD - Zustand for complex feature state
const useUsers = create<UsersStore>((set, get) => ({
  users: [],
  fetchUsers: async () => {
    // Implementation
  }
}));

// ❌ BAD - useState for complex shared state
const [complexSharedState, setComplexSharedState] = useState({});
```

**Rules**:
- **React Context** for global app state (auth, theme, language)
- **Zustand stores** for complex feature state with API integration
- **useState** only for local component state
- **No prop drilling** - use appropriate state management

---

## 🎨 RESPONSIVE DESIGN STANDARDS

### **1. Responsive Layout Patterns**
```tsx
// ✅ GOOD - Flexible responsive containers
<div className="relative flex-1 min-w-0 max-w-md">
  <Input className="pl-10 pr-10 w-full" />
</div>

// ✅ GOOD - Responsive grid layouts
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">

// ❌ BAD - Fixed widths or non-responsive design
<div style={{ width: '300px' }}>
<div className="w-96">
```

**Rules**:
- **Mobile-first approach** - start with mobile, enhance for larger screens
- **Flexible layouts** - use `flex-1 min-w-0` pattern for responsive containers
- **Consistent breakpoints** - sm: 640px, md: 768px, lg: 1024px, xl: 1280px
- **No horizontal scroll** - ensure all components fit within viewport
- **Test on multiple devices** - iPad Air, iPad Mini, iPhone, desktop

### **2. Component Responsive Behavior**
```tsx
// ✅ GOOD - Responsive layout with proper breakpoints
<div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between mb-6">
  {/* Status Filter Buttons */}
  <div className="flex items-center gap-2">
    {/* Filter buttons */}
  </div>
  
  {/* Search Bar - Right side on desktop, separate row on mobile */}
  <div className="relative flex-1 min-w-0 max-w-md">
    {/* Search input */}
  </div>
</div>
```

**Rules**:
- **Progressive enhancement** - mobile layout first, desktop improvements
- **Logical hierarchy** - important elements first on mobile
- **Touch-friendly** - minimum 44px touch targets on mobile
- **Readable text** - appropriate font sizes for all screen sizes

---

## 🔐 SECURITY & MULTI-TENANT RULES

### **1. Authentication & Authorization**
```typescript
// ✅ GOOD - Proper role hierarchy validation
const ROLE_HIERARCHY = {
  'chain_owner': 3,
  'branch_manager': 2,
  'branch_staff': 1,
  'branch_cashier': 0
} as const;

function canEditUser(currentUserRole: BranchRole, targetUserRole: BranchRole): boolean {
  const currentLevel = ROLE_HIERARCHY[currentUserRole] || -1;
  const targetLevel = ROLE_HIERARCHY[targetUserRole] || -1;
  return currentLevel >= targetLevel;
}

// ❌ BAD - Missing role validation
function editUser(userId: string) {
  // Direct edit without permission check
}
```

**Rules**:
- **Always validate permissions** before any user management operation
- **Respect role hierarchy** - users can only manage equal/lower roles
- **Branch context required** - all operations must include branch validation
- **JWT claims validation** - verify branch_id and role in all API calls

### **2. Database Access Patterns**
```typescript
// ✅ GOOD - RLS-aware database queries
const { data: orders } = await supabase
  .from('orders')
  .select('*')
  .eq('branch_id', userBranchId); // RLS will enforce branch isolation

// ❌ BAD - Cross-branch data access
const { data: allOrders } = await supabase
  .from('orders')
  .select('*'); // Could expose other branches' data
```

**Rules**:
- **Branch-scoped queries** - always filter by branch_id when appropriate
- **RLS policies active** - trust database policies for data isolation
- **No cross-branch access** - users cannot see other branches' data
- **Service role carefully** - use service role only for admin operations

---

## 🚀 API DEVELOPMENT STANDARDS

### **1. Endpoint Structure**
```typescript
// ✅ GOOD - RESTful endpoint with proper validation
app.patch('/api/v1/users/:userId/branch/:branchId', async (req, res) => {
  try {
    // Validate user permissions
    const currentUser = await validateJWT(req);
    if (!canEditUser(currentUser.role, targetUser.role)) {
      return res.status(403).json({ error: { code: 'INSUFFICIENT_PERMISSIONS' } });
    }
    
    // Implementation
  } catch (error) {
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

// ❌ BAD - Missing validation or inconsistent structure
app.patch('/users/:id', (req, res) => {
  // Missing permission validation
  // No error handling
});
```

**Rules**:
- **RESTful conventions** - proper HTTP methods and status codes
- **Consistent response format** - `{data: ..., meta: ...}` for success, `{error: {...}}` for errors
- **Comprehensive validation** - validate all inputs with Zod schemas
- **Proper error handling** - structured error responses with codes
- **Permission checks** - validate user permissions for all operations

### **2. Response Formats**
```typescript
// ✅ GOOD - Consistent success response
{
  "data": {
    "users": [...],
    "total": 25,
    "page": 1,
    "limit": 50
  }
}

// ✅ GOOD - Consistent error response
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Insufficient permissions",
    "details": "branch_staff cannot edit branch_manager users"
  }
}
```

**Rules**:
- **Standardized responses** - consistent format across all endpoints
- **Meaningful error codes** - use semantic error codes
- **Helpful error messages** - provide actionable error information
- **Pagination support** - include pagination metadata when applicable

---

## 🎯 DEVELOPMENT WORKFLOW RULES

### **1. File Organization**
```
apps/web/src/
├── app/                    # Next.js App Router pages
│   ├── (auth)/            # Authentication routes
│   ├── orders/            # Order management pages
│   │   ├── live/         # Live orders
│   │   ├── history/      # Order history
│   │   └── [orderId]/    # Dynamic order details
│   └── settings/         # Settings pages
├── components/           # React components
│   ├── ui/              # Base ShadCN components
│   ├── auth/            # Authentication components
│   └── user-management/ # Feature-specific components
├── contexts/            # React Context providers
├── hooks/               # Custom React hooks
├── services/            # API integration layer
└── types/               # TypeScript definitions
```

**Rules**:
- **Feature-based organization** - group related components together
- **Clear naming conventions** - descriptive file and directory names
- **Single responsibility** - one component per file
- **Consistent imports** - use absolute imports with path mapping

### **2. Git & Deployment Rules**
```bash
# ✅ GOOD - Semantic commit messages
git commit -m "feat: add responsive search bar to Order History page"
git commit -m "fix: resolve horizontal scroll issue in Kitchen Display"
git commit -m "refactor: optimize sidebar responsive behavior"

# ❌ BAD - Vague commit messages
git commit -m "fix stuff"
git commit -m "updates"
git commit -m "WIP"
```

**Rules**:
- **Conventional commits** - use feat:, fix:, refactor:, docs: prefixes
- **Descriptive messages** - explain what and why, not just what
- **Small, focused commits** - one logical change per commit
- **Test before push** - ensure code builds and runs correctly
- **Production deployment** - only push stable, tested code to main branch

---

## 🧪 TESTING & QUALITY STANDARDS

### **1. Code Quality Requirements**
```typescript
// ✅ GOOD - Comprehensive error handling
try {
  const result = await apiCall();
  return { data: result, error: null };
} catch (error) {
  console.error('API call failed:', error);
  return { data: null, error: error.message };
}

// ❌ BAD - Missing error handling
const result = await apiCall(); // Could throw unhandled error
```

**Rules**:
- **Error boundaries** - wrap components in error boundaries
- **Loading states** - show loading indicators for async operations
- **Optimistic updates** - immediate UI feedback with rollback capability
- **Accessible components** - proper ARIA labels and keyboard navigation
- **Performance conscious** - avoid unnecessary re-renders

### **2. Browser & Device Testing**
```typescript
// ✅ GOOD - Device-aware responsive hook
const useResponsive = () => {
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    const checkMobile = () => {
      // Use document.documentElement.clientWidth for accurate measurement
      setIsMobile(document.documentElement.clientWidth < 720);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  return { isMobile };
};
```

**Rules**:
- **Cross-browser testing** - test in Chrome, Safari, Firefox
- **Device testing** - test on iPad Air, iPad Mini, iPhone, desktop
- **DevTools responsive** - verify behavior with DevTools responsive mode
- **Real device testing** - test on actual devices when possible
- **Performance testing** - monitor Core Web Vitals and loading times

---

## 📊 PERFORMANCE & OPTIMIZATION RULES

### **1. Frontend Performance**
```tsx
// ✅ GOOD - Optimized component with memo
const UserCard = React.memo<UserCardProps>(({ user, onEdit }) => {
  const handleEdit = useCallback(() => {
    onEdit(user.id);
  }, [user.id, onEdit]);
  
  return (
    <Card>{/* Component content */}</Card>
  );
});

// ❌ BAD - Unoptimized component causing re-renders
const UserCard = ({ user, onEdit }) => {
  return (
    <Card onClick={() => onEdit(user.id)}>{/* Component content */}</Card>
  );
};
```

**Rules**:
- **React.memo** for expensive components that re-render frequently
- **useCallback** for event handlers passed to child components
- **useMemo** for expensive calculations
- **Lazy loading** for routes and heavy components
- **Image optimization** - use Next.js Image component

### **2. API & Database Performance**
```typescript
// ✅ GOOD - Efficient database query with pagination
const getUsers = async (branchId: string, page = 1, limit = 50) => {
  const offset = (page - 1) * limit;
  const { data, error } = await supabase
    .from('branch_users')
    .select(`
      *,
      user_profiles:user_id (*)
    `)
    .eq('branch_id', branchId)
    .range(offset, offset + limit - 1);
    
  return { data, error };
};

// ❌ BAD - Inefficient query without pagination
const getAllUsers = async () => {
  const { data } = await supabase.from('users').select('*');
  return data;
};
```

**Rules**:
- **Pagination required** - never fetch all records without pagination
- **Selective queries** - only fetch required fields
- **Proper indexing** - ensure database indexes exist for common queries
- **Caching strategy** - cache expensive operations appropriately
- **Real-time sparingly** - use real-time subscriptions only when necessary

---

## 🔧 DEBUGGING & MAINTENANCE RULES

### **1. Error Handling & Logging**
```typescript
// ✅ GOOD - Comprehensive error logging
const logger = {
  error: (message: string, error: Error, context?: object) => {
    console.error(`[ERROR] ${message}`, {
      error: error.message,
      stack: error.stack,
      context,
      timestamp: new Date().toISOString()
    });
  }
};

// Usage
try {
  await updateUser(userId, userData);
} catch (error) {
  logger.error('Failed to update user', error, { userId, userData });
  throw error;
}
```

**Rules**:
- **Structured logging** - include context and timestamps
- **Error boundaries** - catch and handle React component errors
- **User-friendly errors** - show helpful error messages to users
- **Console cleanup** - remove debug console.log statements before commit
- **Error tracking** - implement error monitoring for production

### **2. Documentation & Comments**
```typescript
// ✅ GOOD - Helpful component documentation
/**
 * UserListTable - Displays paginated list of branch users with role management
 * 
 * Features:
 * - Role-based row actions (edit/delete based on user hierarchy)
 * - Optimistic updates with rollback on error
 * - Responsive table with mobile card view
 * 
 * @param users - Array of user profiles with branch context
 * @param onUserEdit - Callback for user edit action
 * @param isLoading - Loading state for table data
 */
interface UserListTableProps {
  users: UserProfile[];
  onUserEdit: (userId: string) => void;
  isLoading?: boolean;
}
```

**Rules**:
- **Component documentation** - document complex components with JSDoc
- **API documentation** - maintain endpoint documentation in endpoints.md
- **README updates** - keep README.md current with project status
- **Architectural decisions** - document significant technical decisions
- **No code comments** - write self-explanatory code, avoid unnecessary comments

---

## 🚨 CRITICAL RULES & RESTRICTIONS

### **1. NEVER DO THESE THINGS**
- **❌ Never modify archived NestJS code** in `apps/api/src/` - use Express.js only
- **❌ Never create custom authentication** - use Supabase Auth exclusively
- **❌ Never bypass RLS policies** - respect database security constraints
- **❌ Never use CSS modules or styled-components** - Tailwind CSS only
- **❌ Never create new package.json** without understanding workspace structure
- **❌ Never commit sensitive data** - API keys, passwords, tokens
- **❌ Never disable TypeScript strict mode** - maintain type safety
- **❌ Never use deprecated React patterns** - avoid class components, use hooks
- **❌ Never create inline translations** - always use centralized translation system
- **❌ Never modify existing Canadian French translations** - they are production-ready

### **2. ALWAYS DO THESE THINGS**
- **✅ Always validate user permissions** before any operation
- **✅ Always use TypeScript interfaces** for props and API responses
- **✅ Always test responsive design** on multiple devices
- **✅ Always handle error states** in components and API calls
- **✅ Always use semantic HTML** and proper accessibility attributes
- **✅ Always follow component naming conventions** - PascalCase for components
- **✅ Always update documentation** when making significant changes
- **✅ Always commit with descriptive messages** using conventional commit format
- **✅ Always add both English and Canadian French translations** for new features
- **✅ Always test language switching** after adding new translations

---

## 🎯 SPECIFIC PROJECT REQUIREMENTS

### **1. Multi-Tenant Architecture**
- **Branch Context**: Every API call must include proper branch context
- **Role Hierarchy**: Respect role hierarchy in all user management operations
- **Data Isolation**: Ensure branch-level data isolation in all queries
- **Permission Checks**: Validate permissions before any sensitive operation

### **2. Multi-Language Requirements**
- **Bilingual Support**: All UI text must support English and Canadian French
- **Canadian French Priority**: Use Canadian French terminology, not European French
- **Centralized System**: All translations must use the centralized translation system
- **Professional Quality**: Restaurant industry-specific translations required

### **3. Responsive Design Priority**
- **Mobile First**: Design for mobile, enhance for larger screens
- **Tablet Experience**: Ensure excellent iPad experience (both Air and Mini)
- **No Horizontal Scroll**: Eliminate horizontal scrolling on all devices
- **Touch Friendly**: Proper touch targets and gesture support

### **4. Code Quality Standards**
- **TypeScript Strict**: Maintain 95%+ TypeScript coverage
- **ESLint Clean**: Zero ESLint warnings or errors
- **Performance**: Monitor and maintain excellent Core Web Vitals
- **Accessibility**: Ensure proper ARIA labels and keyboard navigation

---

## 📞 DEVELOPMENT SUPPORT & ESCALATION

### **When to Ask for Clarification**
- **Architecture changes** that affect multiple apps
- **Database schema modifications** that impact existing tables
- **New dependencies** or technology additions
- **Security-related implementations** beyond basic validation
- **Performance optimizations** that require significant refactoring
- **Translation changes** to existing Canadian French terms

### **How to Handle Uncertainty**
1. **Check existing patterns** in the codebase first
2. **Review documentation** in markdown files
3. **Follow established conventions** when in doubt
4. **Ask for clarification** before making significant changes
5. **Document decisions** made during development
6. **Test language switching** for any UI changes

---

## 🚀 SUMMARY OF CLAUDE'S RESPONSIBILITIES

**Primary Role**: Maintain and enhance Vision Menu platform following established patterns and standards

**Key Responsibilities**:
1. **Code Quality**: Write clean, type-safe, well-documented code
2. **Responsive Design**: Ensure excellent mobile and tablet experience
3. **Security**: Maintain multi-tenant security and permission validation
4. **Performance**: Optimize for speed and scalability
5. **Multi-Language**: Support bilingual system with Canadian French translations
6. **Standards**: Follow all established conventions and patterns
7. **Documentation**: Keep documentation current and accurate

**Success Criteria**:
- All code builds without errors or warnings
- Responsive design works perfectly across all devices
- Security requirements are met for multi-tenant architecture
- Performance standards are maintained
- Language switching works seamlessly between English and Canadian French
- All new features include proper translations
- Code follows established patterns and conventions

---

## 🔮 FUTURE DEVELOPMENT ROADMAP

### **Backend Refactoring Plan (Target: 6 months)**

**TRIGGER CONDITIONS**: When backend reaches 5,000+ lines or team grows to 2+ developers

**Current Status**: Backend ~2,300 lines (monolithic) - manageable with AI assistance

#### **Kademeli Refactoring Stratejisi:**

**Phase 1: Helper Extraction (Week 1)**
```javascript
apps/api/api/
├── helpers/
│   ├── auth.js           // getUserBranchContext, JWT decode
│   ├── permissions.js    // canEditUser, ROLE_HIERARCHY
│   └── validation.js     // Input validation helpers
└── index.js             // Import helpers, reduce code size
```

**Phase 2: Service Layer (Week 2-3)**
```javascript
apps/api/api/
├── services/
│   ├── users.service.js     // User CRUD operations
│   ├── orders.service.js    // Order management business logic
│   ├── branches.service.js  // Branch settings and operations
│   └── auth.service.js      // Authentication logic
├── helpers/
└── index.js                 // Import services, focus on routing
```

**Phase 3: Controller Layer (Week 4)**
```javascript
apps/api/api/
├── controllers/
│   ├── users.controller.js     // Route handlers only
│   ├── orders.controller.js    // Route handlers only
│   ├── branches.controller.js  // Route handlers only
│   └── auth.controller.js      // Route handlers only
├── services/
├── helpers/
└── index.js                    // Route definitions only (~200 lines)
```

#### **Critical Refactoring Rules:**

**🟢 ZERO IMPACT GUARANTEE:**
- **Frontend**: No changes required - API endpoints remain identical
- **Vercel**: No config changes - entry point stays `apps/api/api/index.js`
- **Database**: No schema changes
- **Authentication**: JWT system unchanged
- **Environment**: Same variables, same deployment process

**🔄 REFACTORING SAFETY CHECKLIST:**
```bash
# Before refactoring:
npm run build  # ✅ Must pass
npm run lint   # ✅ Must pass

# During each phase:
git checkout -b refactor-phase-1
# Make changes
npm run build && npm run lint  # ✅ Must pass
# Deploy to staging first
# Test all endpoints
git merge to main

# After refactoring:
# Same API responses
# Same performance
# Better maintainability
```

#### **Benefits After Refactoring:**
- **New Developer Onboarding**: 2 hours instead of 2 days
- **Bug Fix Speed**: Isolated to specific service/controller
- **Feature Development**: Clear separation of concerns
- **Unit Testing**: Each service testable independently
- **Code Reusability**: Services can be shared across controllers

#### **Timeline:**
- **Month 1-5**: Continue feature development (business priority)
- **Month 6**: Execute refactoring plan
- **Month 7+**: Maintain modular structure

**Note**: Refactoring should happen when business logic stabilizes, not during active feature development.

---

*This document serves as the comprehensive guide for all development work on Vision Menu. Following these rules ensures consistency, quality, and maintainability of the platform.*

**Last Updated**: January 9, 2025 | **Version**: 2.0.0