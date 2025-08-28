# CUSTOMER ORDERING SYSTEM IMPLEMENTATION

**UEAT-Style Modal-Based Customer Ordering System**
*Last Updated: August 28, 2025*

---

## 🎯 OVERVIEW

### Problem
- Hardcoded branch ID fallback
- No order type selection (Takeout vs Delivery)
- Multiple page transitions for branch selection
- Poor UX compared to UEAT/DoorDash standards

### Solution
**UEAT-Style Single Page Modal Flow:**
```
/order/burger-king → Order Type Modal → Branch/Address Modal → Menu
```

### Key Features
1. **Order Type First**: Takeout vs Delivery (UEAT-style)
2. **Smart Branch Selection**: By location, address, or city
3. **Single Page Experience**: No page transitions, only modals
4. **Location Intelligence**: Distance-based sorting
5. **Delivery Validation**: Address-based availability
6. **QR Compatibility**: Direct menu for table service

---

## 🎨 UX FLOW

### Web Customers
```
┌─────────────────────────────────────────┐
│ /order/burger-king (Single Page)       │
│                                         │
│ 1️⃣ Order Type Modal                    │
│    🏃 Takeout    🚚 Delivery           │
│                                         │
│ 2️⃣ Branch Selection (Takeout)          │
│    📍 By location | 🏠 Address | 🏙️ City│
│                                         │
│ 2️⃣ Address Input (Delivery)            │
│    Address + Apt # + Validation         │
│                                         │
│ 3️⃣ Menu Experience                     │
│    [Logo] [Branch/Address] [Change]     │
└─────────────────────────────────────────┘
```

### QR Customers
```
/order/burger-king?branch=uuid&table=5&source=qr
→ Direct to menu (skip modals)
```

---

## 🏗️ MODULAR ARCHITECTURE

### Backend Enhancements
**File**: `apps/api/api/services/customer-chains.service.js`
- Add `getBranchesByLocation(lat, lng)` - Distance calculation
- Add `getBranchesByAddress(address)` - Geocoding search  
- Add `getBranchesByCity(chainId)` - City grouping
- Add `getDeliveryAvailableBranches(address)` - Delivery validation

**Database**: PostGIS functions for distance calculations

### Frontend Modular Structure
**IMPORTANT: Use Separation of Concerns - Each component in separate file**

```
/order/[chainSlug]/
├── page.tsx                    # Main orchestrator (100-150 lines)
├── components/
│   ├── order-type-modal.tsx    # Takeout vs Delivery modal
│   ├── takeout-branch-modal.tsx # Branch selection with tabs  
│   ├── delivery-address-modal.tsx # Address input modal
│   ├── branch-list.tsx         # Reusable branch list component
│   ├── address-search.tsx      # Address autocomplete component
│   ├── city-selector.tsx       # City dropdown component
│   └── menu-experience.tsx     # Enhanced menu component
├── hooks/
│   ├── use-location.ts         # Geolocation custom hook
│   ├── use-branch-search.ts    # Branch filtering logic
│   └── use-order-flow.ts       # Modal state management
└── types/
    └── order-flow.types.ts     # TypeScript interfaces
```

### Component Responsibilities (Single Responsibility Principle)
- **page.tsx**: Modal state orchestration and main layout
- **OrderTypeModal**: Only order type selection (Takeout/Delivery)
- **TakeoutBranchModal**: Branch selection with 3 tabs (location/address/city)
- **DeliveryAddressModal**: Address input and delivery validation
- **BranchList**: Reusable branch display component
- **AddressSearch**: Address autocomplete functionality
- **CitySelector**: City-based branch filtering
- **MenuExperience**: Enhanced menu with order context

### Custom Hooks (Logic Separation)
- **useLocation**: Browser geolocation and permission handling
- **useBranchSearch**: Branch filtering, sorting, and search logic
- **useOrderFlow**: Modal state management and flow control

---

## 🔧 IMPLEMENTATION PHASES

### Phase 1: Backend API Enhancement
- [ ] Add location-based branch endpoints
- [ ] Add distance calculation functions  
- [ ] Add delivery validation

### Phase 2: Modal Architecture
- [ ] Refactor main page to single-page modal flow
- [ ] Create Order Type Modal
- [ ] Create Takeout Branch Modal with tabs
- [ ] Create Delivery Address Modal

### Phase 3: Location Services  
- [ ] Browser geolocation
- [ ] Address autocomplete
- [ ] Distance calculation

### Phase 4: Integration
- [ ] Update existing components
- [ ] Test all flows
- [ ] QR compatibility

---

## 🧪 TESTING

### Web Flow
```bash
✅ /order/burger-king → Order Type Modal
✅ Select Takeout → Branch Modal (3 tabs)
✅ Select Delivery → Address Modal  
✅ Branch/Address selection → Menu with context
✅ Change button → Back to Order Type
```

### QR Flow
```bash
✅ /order/burger-king?branch=uuid&table=5&source=qr → Direct menu
```

### Error Cases
```bash
✅ Invalid chain → 404
✅ No delivery available → Error message
✅ Location denied → Fallback to address
```

---

## 📋 QUICK REFERENCE

### API Endpoints
```javascript
GET /api/v1/customer/chains/:slug
GET /api/v1/customer/chains/:slug/branches
GET /api/v1/customer/chains/:slug/branches/location?lat=&lng=
GET /api/v1/customer/chains/:slug/branches/city/:city
GET /api/v1/customer/chains/:slug/delivery/validate
```

### Implementation Order (Modular Development)
```
1. Types & Interfaces:
   - types/order-flow.types.ts

2. Custom Hooks:
   - hooks/use-order-flow.ts (modal state)
   - hooks/use-location.ts (geolocation)

3. Reusable Components:
   - components/branch-list.tsx
   - components/address-search.tsx
   - components/city-selector.tsx

4. Modal Components:
   - components/order-type-modal.tsx
   - components/takeout-branch-modal.tsx
   - components/delivery-address-modal.tsx

5. Main Integration:
   - page.tsx (orchestrator)
   - components/menu-experience.tsx (enhanced)

6. Backend Enhancement:
   - customer-chains.service.js (location features)
   - customer-chains.controller.js (new endpoints)
```

---

## 🎯 SUCCESS METRICS

**UX Improvements:**
- ✅ Single page experience (no page transitions)
- ✅ UEAT-familiar interface
- ✅ Location-smart branch selection
- ✅ Progressive information disclosure
- ✅ Faster order conversion

**Technical Goals:**
- ✅ Remove hardcoded branch IDs
- ✅ Clean URL structure
- ✅ Multi-tenant security
- ✅ QR compatibility maintained

---

*Implementation ready - significantly improved UX while maintaining all existing functionality*