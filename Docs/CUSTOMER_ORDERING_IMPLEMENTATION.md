# CUSTOMER ORDERING SYSTEM IMPLEMENTATION

**Implementation Guide for Chain-Based Customer Ordering System**
*Last Updated: August 28, 2025*

---

## 🎯 OVERVIEW & OBJECTIVES

### Current Problem
- Hardcoded branch ID in customer ordering system: `/order?branch=550e8400-e29b-41d4-a716-446655440002`
- No chain-based customer experience
- No branch selection for web customers
- Security risk with hardcoded fallback values

### Target Solution
**Clean URL-based ordering system with chain isolation:**
```bash
# Web Customers
/order/pizzaleziz → Chain branch selection
/order/pizzaleziz?branch=branch-uuid → Specific branch menu

# QR Customers  
/order/pizzaleziz?branch=branch-uuid&table=5&source=qr → Direct menu
```

### Business Requirements
1. **Web Flow**: Chain → Branch Selection → Menu
2. **QR Flow**: Direct to specific branch menu (unchanged)
3. **Clean URLs**: User-friendly chain slugs instead of UUIDs
4. **Security**: Remove hardcoded branch ID fallback
5. **Multi-tenant**: Perfect chain isolation

---

## 🗄️ DATABASE STRUCTURE (Already Available)

### `restaurant_chains` Table ✅
```sql
- id (uuid, PK)
- slug (text, unique) ← URL routing key  
- name (text)
- description (text)
- logo_url (text)
- is_active (boolean)
- owner_id (uuid, FK to auth.users)
```

### `branches` Table ✅  
```sql
- id (uuid, PK)
- chain_id (uuid, FK to restaurant_chains) ← Chain relationship
- name (text)
- slug (text) 
- address (jsonb) ← For distance calculation
- location (jsonb) ← Coordinates for mapping
- is_active (boolean)
```

### Relationship Validation
```sql
-- Verify chain → branches relationship
SELECT c.name, c.slug, COUNT(b.id) as branch_count
FROM restaurant_chains c
LEFT JOIN branches b ON c.id = b.chain_id AND b.is_active = true
WHERE c.is_active = true
GROUP BY c.id, c.name, c.slug;
```

---

## 🔧 IMPLEMENTATION PHASES

## **PHASE 1: Backend API Foundation**

### 1.1 Chain Resolution Service
**File**: `apps/api/api/services/customer-chains.service.js`

```javascript
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Get chain by slug for customer ordering
 * @param {string} slug - Chain slug from URL
 * @returns {Object} Chain data with basic info
 */
async function getChainBySlug(slug) {
  const { data: chain, error } = await supabase
    .from('restaurant_chains')
    .select('id, name, slug, description, logo_url')
    .eq('slug', slug)
    .eq('is_active', true)
    .single();

  if (error || !chain) {
    throw new Error('Chain not found or inactive');
  }

  return chain;
}

/**
 * Get active branches for a chain
 * @param {string} chainId - Chain ID
 * @returns {Array} Active branches with location data
 */
async function getChainBranches(chainId) {
  const { data: branches, error } = await supabase
    .from('branches')
    .select(`
      id,
      name,
      slug, 
      address,
      location,
      phone,
      email
    `)
    .eq('chain_id', chainId)
    .eq('is_active', true)
    .order('name', { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch branches: ${error.message}`);
  }

  return branches || [];
}

/**
 * Validate branch belongs to chain
 * @param {string} branchId - Branch ID
 * @param {string} chainId - Chain ID  
 * @returns {Object} Branch data if valid
 */
async function validateBranchForChain(branchId, chainId) {
  const { data: branch, error } = await supabase
    .from('branches')
    .select('id, name, chain_id')
    .eq('id', branchId)
    .eq('chain_id', chainId)
    .eq('is_active', true)
    .single();

  if (error || !branch) {
    throw new Error('Branch not found or does not belong to this chain');
  }

  return branch;
}

module.exports = {
  getChainBySlug,
  getChainBranches,
  validateBranchForChain
};
```

### 1.2 Customer Chain Controller
**File**: `apps/api/api/controllers/customer-chains.controller.js`

```javascript
const { handleControllerError } = require('../helpers/error-handler');
const customerChainsService = require('../services/customer-chains.service');

/**
 * GET /api/v1/customer/chains/:slug
 * Get chain information for customer ordering
 */
const getChainBySlug = async (req, res) => {
  try {
    const { slug } = req.params;
    
    if (!slug) {
      return res.status(400).json({
        error: { code: 'MISSING_CHAIN_SLUG', message: 'Chain slug is required' }
      });
    }

    const chain = await customerChainsService.getChainBySlug(slug);
    
    res.json({ data: chain });
  } catch (error) {
    handleControllerError(error, 'get chain by slug', res);
  }
};

/**
 * GET /api/v1/customer/chains/:slug/branches  
 * Get branches for a chain
 */
const getChainBranches = async (req, res) => {
  try {
    const { slug } = req.params;
    
    // Get chain first to validate and get ID
    const chain = await customerChainsService.getChainBySlug(slug);
    const branches = await customerChainsService.getChainBranches(chain.id);
    
    res.json({
      data: {
        chain: chain,
        branches: branches,
        total: branches.length
      }
    });
  } catch (error) {
    handleControllerError(error, 'get chain branches', res);
  }
};

module.exports = {
  getChainBySlug,
  getChainBranches
};
```

### 1.3 Routes Configuration
**File**: `apps/api/api/routes/customer-chains.routes.js`

```javascript
const express = require('express');
const customerChainsController = require('../controllers/customer-chains.controller');

const router = express.Router();

// Public endpoints - no authentication required
router.get('/:slug', customerChainsController.getChainBySlug);
router.get('/:slug/branches', customerChainsController.getChainBranches);

module.exports = router;
```

**Mount Routes** (in `apps/api/api/index.js`):
```javascript
const customerChainsRoutes = require('./routes/customer-chains.routes');
app.use('/api/v1/customer/chains', customerChainsRoutes);
```

---

## **PHASE 2: Frontend Route Architecture**

### 2.1 Dynamic Route Structure
**File**: `apps/web/src/app/order/[chainSlug]/page.tsx`

```typescript
import { use, useState, useEffect } from 'react'
import { notFound } from 'next/navigation'
import { customerChainsService } from '@/services/customer-chains.service'
import { customerMenuService } from '@/services/customer-menu.service'
import { BranchSelectionFlow } from './components/branch-selection-flow'
import { MenuExperience } from '../components/menu-experience'
import type { Chain, Branch, CustomerMenu } from '@/types/customer-ordering'

interface ChainOrderPageProps {
  params: Promise<{ chainSlug: string }>
  searchParams: Promise<{
    branch?: string
    table?: string
    source?: 'qr' | 'web'
  }>
}

export default function ChainOrderPage({ params, searchParams }: ChainOrderPageProps) {
  const resolvedParams = use(params)
  const resolvedSearchParams = use(searchParams)
  
  const [chain, setChain] = useState<Chain | null>(null)
  const [branches, setBranches] = useState<Branch[]>([])
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null)
  const [customerMenu, setCustomerMenu] = useState<CustomerMenu | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Extract URL context
  const orderContext = {
    chainSlug: resolvedParams.chainSlug,
    branchId: resolvedSearchParams.branch,
    tableNumber: resolvedSearchParams.table ? parseInt(resolvedSearchParams.table) : undefined,
    source: (resolvedSearchParams.source as 'qr' | 'web') || 'web',
    isQROrder: resolvedSearchParams.source === 'qr'
  }

  // Load chain and branches
  useEffect(() => {
    const loadChainData = async () => {
      try {
        setLoading(true)
        setError(null)

        // Get chain by slug
        const chainData = await customerChainsService.getChainBySlug(orderContext.chainSlug)
        setChain(chainData)

        // Get chain branches
        const branchesData = await customerChainsService.getChainBranches(chainData.id)
        setBranches(branchesData)

        // If specific branch requested, validate and load menu
        if (orderContext.branchId) {
          const branch = branchesData.find(b => b.id === orderContext.branchId)
          if (!branch) {
            throw new Error('Branch not found or does not belong to this chain')
          }
          setSelectedBranch(branch)
          
          // Load menu for selected branch
          const menu = await customerMenuService.getCustomerMenu(orderContext.branchId)
          setCustomerMenu(menu)
        }
      } catch (err) {
        console.error('Failed to load chain data:', err)
        if (err.message.includes('Chain not found')) {
          notFound() // 404 page for invalid chain slug
        }
        setError(err instanceof Error ? err.message : 'Failed to load chain data')
      } finally {
        setLoading(false)
      }
    }

    loadChainData()
  }, [orderContext.chainSlug, orderContext.branchId])

  // Handle branch selection
  const handleBranchSelect = async (branch: Branch) => {
    try {
      setSelectedBranch(branch)
      
      // Update URL without page reload
      const newUrl = `/order/${orderContext.chainSlug}?branch=${branch.id}`
      window.history.pushState({}, '', newUrl)
      
      // Load menu for selected branch
      const menu = await customerMenuService.getCustomerMenu(branch.id)
      setCustomerMenu(menu)
    } catch (err) {
      console.error('Failed to load menu:', err)
      setError('Failed to load menu for selected branch')
    }
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  // Error state  
  if (error || !chain) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <h1 className="text-2xl font-bold mb-4">Unable to Load Restaurant</h1>
          <p className="text-muted-foreground mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  // QR Flow: Direct to menu if branch specified
  if (orderContext.isQROrder && selectedBranch && customerMenu) {
    return (
      <MenuExperience 
        chain={chain}
        branch={selectedBranch}
        customerMenu={customerMenu}
        orderContext={orderContext}
      />
    )
  }

  // Web Flow: Menu if branch selected
  if (selectedBranch && customerMenu) {
    return (
      <MenuExperience 
        chain={chain}
        branch={selectedBranch}
        customerMenu={customerMenu}
        orderContext={orderContext}
        showBranchSwitcher={true} // Allow branch switching for web users
      />
    )
  }

  // Web Flow: Branch selection
  return (
    <BranchSelectionFlow 
      chain={chain}
      branches={branches}
      onBranchSelect={handleBranchSelect}
    />
  )
}
```

### 2.2 Customer Chains Service  
**File**: `apps/web/src/services/customer-chains.service.ts`

```typescript
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://your-api-domain.com'

export interface Chain {
  id: string
  name: string
  slug: string
  description?: string
  logo_url?: string
}

export interface Branch {
  id: string
  name: string
  slug: string
  address?: any
  location?: any
  phone?: string
  email?: string
}

class CustomerChainsService {
  /**
   * Get chain by slug
   */
  async getChainBySlug(slug: string): Promise<Chain> {
    const response = await fetch(`${API_BASE_URL}/api/v1/customer/chains/${slug}`)
    
    if (!response.ok) {
      throw new Error(`Chain not found: ${response.statusText}`)
    }
    
    const result = await response.json()
    return result.data
  }

  /**
   * Get branches for a chain
   */
  async getChainBranches(chainId: string): Promise<Branch[]> {
    const response = await fetch(`${API_BASE_URL}/api/v1/customer/chains/${chainId}/branches`)
    
    if (!response.ok) {
      throw new Error(`Failed to fetch branches: ${response.statusText}`)
    }
    
    const result = await response.json()
    return result.data.branches
  }

  /**
   * Get chain data by slug with branches
   */
  async getChainWithBranches(slug: string): Promise<{ chain: Chain; branches: Branch[] }> {
    const chain = await this.getChainBySlug(slug)
    const branches = await this.getChainBranches(chain.id)
    
    return { chain, branches }
  }
}

export const customerChainsService = new CustomerChainsService()
```

---

## **PHASE 3: Customer Experience Components**

### 3.1 Branch Selection Component
**File**: `apps/web/src/app/order/[chainSlug]/components/branch-selection-flow.tsx`

```typescript
'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { MapPin, Phone, Clock } from 'lucide-react'
import type { Chain, Branch } from '@/services/customer-chains.service'

interface BranchSelectionFlowProps {
  chain: Chain
  branches: Branch[]
  onBranchSelect: (branch: Branch) => void
}

export function BranchSelectionFlow({ 
  chain, 
  branches, 
  onBranchSelect 
}: BranchSelectionFlowProps) {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b">
        <div className="max-w-4xl mx-auto p-6">
          <div className="flex items-center gap-4">
            {chain.logo_url && (
              <img 
                src={chain.logo_url} 
                alt={chain.name}
                className="w-16 h-16 rounded-lg object-cover"
              />
            )}
            <div>
              <h1 className="text-3xl font-bold">{chain.name}</h1>
              {chain.description && (
                <p className="text-muted-foreground mt-1">{chain.description}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Branch Selection */}
      <div className="max-w-4xl mx-auto p-6">
        <div className="mb-6">
          <h2 className="text-2xl font-semibold mb-2">Choose Your Location</h2>
          <p className="text-muted-foreground">
            Select a restaurant location to view the menu and place your order
          </p>
        </div>

        {branches.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center">
              <p className="text-muted-foreground">
                No active locations found for this restaurant chain.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {branches.map((branch) => (
              <Card key={branch.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-primary" />
                    {branch.name}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {/* Address */}
                    {branch.address && (
                      <div className="text-sm text-muted-foreground">
                        <p>{branch.address.street}</p>
                        <p>{branch.address.city}, {branch.address.province} {branch.address.postal_code}</p>
                      </div>
                    )}

                    {/* Phone */}
                    {branch.phone && (
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="h-4 w-4" />
                        <span>{branch.phone}</span>
                      </div>
                    )}

                    {/* Hours placeholder */}
                    <div className="flex items-center gap-2 text-sm text-green-600">
                      <Clock className="h-4 w-4" />
                      <span>Open now</span>
                    </div>

                    {/* Select Button */}
                    <Button 
                      onClick={() => onBranchSelect(branch)}
                      className="w-full mt-4"
                    >
                      Order from this location
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
```

### 3.2 Enhanced Menu Experience
**File**: `apps/web/src/app/order/[chainSlug]/components/menu-experience.tsx`

```typescript
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { ArrowLeft, MapPin } from 'lucide-react'
import { OrderHeader } from '@/app/order/components/order-header'
import { CategorySidebar } from '@/app/order/components/category-sidebar' 
import { MenuGrid } from '@/app/order/components/menu-grid'
import { CartSidebar } from '@/app/order/components/cart-sidebar'
import { MobileCart } from '@/app/order/components/mobile-cart'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useResponsive } from '@/hooks/use-responsive'
import { OrderContextProvider } from '@/app/order/contexts/order-context'
import type { Chain, Branch } from '@/services/customer-chains.service'
import type { CustomerMenu } from '@/services/customer-menu.service'

interface MenuExperienceProps {
  chain: Chain
  branch: Branch
  customerMenu: CustomerMenu
  orderContext: {
    chainSlug: string
    branchId?: string
    tableNumber?: number
    source: 'qr' | 'web'
    isQROrder: boolean
  }
  showBranchSwitcher?: boolean
}

export function MenuExperience({
  chain,
  branch, 
  customerMenu,
  orderContext,
  showBranchSwitcher = false
}: MenuExperienceProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const { isMobile, isTablet, isDesktop } = useResponsive()

  const handleBackToBranches = () => {
    // Navigate back to branch selection
    window.location.href = `/order/${orderContext.chainSlug}`
  }

  // Create order context for existing components
  const legacyOrderContext = {
    source: orderContext.source,
    branchId: branch.id,
    tableNumber: orderContext.tableNumber,
    zone: undefined,
    isQROrder: orderContext.isQROrder
  }

  return (
    <OrderContextProvider value={legacyOrderContext}>
      {isDesktop && (
        <div className="h-screen bg-background flex flex-col overflow-hidden">
          {/* Enhanced Header with Chain/Branch Info */}
          <div className="flex-shrink-0 bg-card border-b">
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-4">
                {showBranchSwitcher && (
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={handleBackToBranches}
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Change Location
                  </Button>
                )}
                
                <div className="flex items-center gap-3">
                  {chain.logo_url && (
                    <img 
                      src={chain.logo_url} 
                      alt={chain.name}
                      className="w-10 h-10 rounded object-cover"
                    />
                  )}
                  <div>
                    <h1 className="font-semibold">{chain.name}</h1>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      <span>{branch.name}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Search */}
              <div className="flex-1 max-w-md mx-8">
                <OrderHeader 
                  branchName={branch.name}
                  branchAddress={branch.address?.street}
                  onSearch={setSearchQuery}
                />
              </div>

              {/* QR Info */}
              {orderContext.isQROrder && orderContext.tableNumber && (
                <div className="text-sm bg-primary/10 px-3 py-2 rounded-lg">
                  Table {orderContext.tableNumber}
                </div>
              )}
            </div>
          </div>
          
          {/* Main Layout */}
          <div className="flex flex-1 min-h-0">
            {/* Left Sidebar - Categories */}
            <div className="w-64 bg-card border-r border-border">
              <CategorySidebar 
                selectedCategory={selectedCategory}
                onCategorySelect={setSelectedCategory}
                customerMenu={customerMenu}
                loading={false}
              />
            </div>
            
            {/* Center - Menu Grid */}
            <div className="flex-1">
              <ScrollArea className="h-full">
                <MenuGrid 
                  selectedCategory={selectedCategory} 
                  customerMenu={customerMenu}
                  loading={false}
                  searchQuery={searchQuery}
                />
              </ScrollArea>
            </div>
            
            {/* Right Sidebar - Cart */}
            <div className="w-80 bg-card border-l border-border">
              <ScrollArea className="h-full">
                <CartSidebar />
              </ScrollArea>
            </div>
          </div>
        </div>
      )}

      {/* Mobile/Tablet layouts... (similar structure) */}
      {(isMobile || isTablet) && (
        <div className="min-h-screen bg-background flex flex-col">
          {/* Mobile header with chain/branch info */}
          <div className="bg-card border-b p-4">
            <div className="flex items-center justify-between">
              {showBranchSwitcher && (
                <Button variant="ghost" size="sm" onClick={handleBackToBranches}>
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              )}
              <div className="flex items-center gap-2">
                {chain.logo_url && (
                  <img src={chain.logo_url} alt={chain.name} className="w-8 h-8 rounded" />
                )}
                <div>
                  <div className="font-semibold text-sm">{chain.name}</div>
                  <div className="text-xs text-muted-foreground">{branch.name}</div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Rest of mobile layout... */}
          <MobileCart />
        </div>
      )}
    </OrderContextProvider>
  )
}
```

---

## **PHASE 4: Integration & Legacy Cleanup**

### 4.1 Update Existing Order Page
**File**: `apps/web/src/app/order/page.tsx`

```typescript
// Redirect legacy /order page to chain selection or error page
import { redirect, notFound } from 'next/navigation'

interface OrderPageProps {
  searchParams: Promise<{
    branch?: string
    source?: string
    table?: string
  }>
}

export default async function LegacyOrderPage({ searchParams }: OrderPageProps) {
  const resolvedSearchParams = await searchParams
  
  // If this is a QR code with branch, we need to identify the chain
  if (resolvedSearchParams.source === 'qr' && resolvedSearchParams.branch) {
    // TODO: Add API call to get chain from branch ID
    // For now, show error message
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <h1 className="text-2xl font-bold mb-4">Invalid QR Code</h1>
          <p className="text-muted-foreground mb-4">
            This QR code appears to be from an older format. Please scan a new QR code from the restaurant.
          </p>
        </div>
      </div>
    )
  }

  // For web users without chain slug, show chain selection page
  // TODO: Implement chain listing page or redirect to default chain
  notFound()
}
```

### 4.2 Remove Hardcoded Branch ID
**Search and replace in codebase:**

```typescript
// BEFORE (Remove this):
branchId: resolvedSearchParams.branch || '550e8400-e29b-41d4-a716-446655440002'

// AFTER (Replace with):
branchId: resolvedSearchParams.branch // No fallback - require explicit branch
```

### 4.3 Update Customer Menu Service
**Modify**: `apps/web/src/services/customer-menu.service.ts`

```typescript
// Add chain validation to getCustomerMenu
async getCustomerMenu(branchId: string, chainId?: string): Promise<CustomerMenu> {
  // Optional: Validate branch belongs to chain if chainId provided
  if (chainId) {
    // Add validation API call
  }
  
  const response = await fetch(`${API_BASE_URL}/api/v1/customer/menu/${branchId}`)
  // ... rest of existing implementation
}
```

---

## 🧪 TESTING SCENARIOS

### Manual Testing Checklist

**Web Customer Flow:**
```bash
# 1. Valid chain slug → Branch selection
✅ /order/pizzaleziz → Shows branch list

# 2. Branch selection → Menu  
✅ Click branch → /order/pizzaleziz?branch=uuid → Shows menu

# 3. Invalid chain slug → 404
✅ /order/invalid-chain → 404 Not Found

# 4. Invalid branch ID → Back to branch selection
✅ /order/pizzaleziz?branch=invalid-uuid → Branch selection with error
```

**QR Customer Flow:**
```bash  
# 1. Valid QR → Direct menu
✅ /order/pizzaleziz?branch=valid-uuid&table=5&source=qr → Direct menu

# 2. QR without branch → Error
✅ /order/pizzaleziz?table=5&source=qr → Error message

# 3. QR with invalid branch → Error
✅ /order/pizzaleziz?branch=invalid-uuid&table=5&source=qr → Error message
```

### Database Test Queries
```sql
-- Verify chain-branch relationships
SELECT 
  c.name as chain_name,
  c.slug as chain_slug,
  b.name as branch_name,
  b.id as branch_id
FROM restaurant_chains c
LEFT JOIN branches b ON c.id = b.chain_id 
WHERE c.is_active = true AND b.is_active = true
ORDER BY c.name, b.name;

-- Test slug uniqueness
SELECT slug, COUNT(*) as count 
FROM restaurant_chains 
WHERE is_active = true
GROUP BY slug 
HAVING COUNT(*) > 1;
```

---

## 🚨 CRITICAL IMPLEMENTATION NOTES

### Security Considerations
1. **No Hardcoded Fallbacks**: Remove all hardcoded branch IDs
2. **Chain Validation**: Always validate branch belongs to requested chain
3. **Active Status**: Only show active chains and branches
4. **SQL Injection**: Use parameterized queries in all database operations

### Performance Optimizations  
1. **Caching**: Consider caching chain/branch lookups
2. **Database Indexes**: Ensure indexes on `slug` columns
3. **API Response Size**: Limit branch data to essential fields
4. **Image Optimization**: Optimize chain logos for fast loading

### Error Handling
1. **404 for Invalid Chains**: Use Next.js `notFound()` for missing chains
2. **Graceful Branch Errors**: Show branch selection if branch invalid
3. **Network Errors**: Show retry buttons for API failures
4. **Loading States**: Show loading spinners during data fetching

### Future Enhancements
1. **Distance Calculation**: Add geolocation-based branch sorting
2. **Chain Landing Pages**: Custom landing pages per chain
3. **Multi-language**: Chain-specific language preferences  
4. **Hours of Operation**: Show open/closed status per branch

---

## 📋 IMPLEMENTATION CHECKLIST

### Backend Tasks
- [ ] Create `customer-chains.service.js`
- [ ] Create `customer-chains.controller.js` 
- [ ] Create `customer-chains.routes.js`
- [ ] Mount routes in main API file
- [ ] Test API endpoints with Postman/curl

### Frontend Tasks  
- [ ] Create `[chainSlug]/page.tsx` dynamic route
- [ ] Create `customer-chains.service.ts` 
- [ ] Create `BranchSelectionFlow` component
- [ ] Create enhanced `MenuExperience` component
- [ ] Update legacy `/order/page.tsx`

### Integration Tasks
- [ ] Remove hardcoded branch IDs from codebase
- [ ] Update customer menu service for validation
- [ ] Test all customer flows (web + QR)
- [ ] Verify chain/branch data integrity in database
- [ ] Update QR code generation (if needed)

### Documentation Tasks
- [ ] Update API documentation with new endpoints
- [ ] Update frontend component documentation  
- [ ] Create integration guide for restaurant partners
- [ ] Update CLAUDE.md with new architecture

---

## 📊 IMPLEMENTATION PROGRESS TRACKING

### **🎯 PROJECT STATUS: PLANNING COMPLETED**
*Last Updated: August 28, 2025*

### **Phase 1: Backend API Foundation** ⏳ `IN PROGRESS`
- [ ] **Task 1.1**: Create `customer-chains.service.js`
  - [ ] `getChainBySlug()` method
  - [ ] `getChainBranches()` method  
  - [ ] `validateBranchForChain()` method
- [ ] **Task 1.2**: Create `customer-chains.controller.js`
  - [ ] GET `/api/v1/customer/chains/:slug` endpoint
  - [ ] GET `/api/v1/customer/chains/:slug/branches` endpoint
- [ ] **Task 1.3**: Create route configuration
  - [ ] `customer-chains.routes.js` file
  - [ ] Mount routes in main API index
- [ ] **Task 1.4**: API Testing
  - [ ] Test chain resolution by slug
  - [ ] Test branch fetching for chain
  - [ ] Verify error handling for invalid slugs

### **Phase 2: Frontend Route Architecture** ⏸️ `PENDING`
- [ ] **Task 2.1**: Create dynamic route structure
  - [ ] `app/order/[chainSlug]/page.tsx` file
  - [ ] URL parameter handling logic
  - [ ] Chain/branch loading states
- [ ] **Task 2.2**: Frontend service layer
  - [ ] `customer-chains.service.ts` TypeScript service
  - [ ] API integration methods
  - [ ] Error handling and types

### **Phase 3: Customer Experience Components** ⏸️ `PENDING`
- [ ] **Task 3.1**: Branch selection component
  - [ ] `BranchSelectionFlow` component
  - [ ] Branch card design with address/phone
  - [ ] Location selection functionality
- [ ] **Task 3.2**: Enhanced menu experience  
  - [ ] `MenuExperience` component with chain/branch context
  - [ ] Branch switcher for web users
  - [ ] QR vs Web flow differentiation

### **Phase 4: Integration & Legacy Cleanup** ⏸️ `PENDING`
- [ ] **Task 4.1**: Update existing order page
  - [ ] Legacy `/order` page redirect logic
  - [ ] QR code compatibility
- [ ] **Task 4.2**: Remove hardcoded values
  - [ ] Find and remove hardcoded branch ID fallback
  - [ ] Update customer menu service validation
- [ ] **Task 4.3**: Integration testing
  - [ ] Web customer flow testing
  - [ ] QR customer flow testing  
  - [ ] Error scenario testing

---

## 🏁 COMPLETION CRITERIA

### **Definition of Done - Each Phase:**
✅ **Phase 1 Complete When:**
- All backend APIs respond correctly
- Chain slug resolution works
- Branch listing returns proper data
- Error handling tested and working

✅ **Phase 2 Complete When:**
- Dynamic routing functional
- Chain/branch loading works
- URL state management correct
- TypeScript types properly defined

✅ **Phase 3 Complete When:**  
- Branch selection UI complete
- Menu experience enhanced
- Both QR and Web flows working
- Responsive design implemented

✅ **Phase 4 Complete When:**
- No hardcoded branch IDs remain
- Legacy compatibility maintained
- All customer flows tested
- Documentation updated

---

## 📋 DAILY PROGRESS LOG

### **August 28, 2025**
- ✅ **COMPLETED**: Problem analysis and solution design
- ✅ **COMPLETED**: Database schema validation (restaurant_chains + branches tables confirmed)
- ✅ **COMPLETED**: Comprehensive implementation plan documentation  
- ✅ **COMPLETED**: Detailed code examples and testing scenarios
- 🎯 **NEXT**: Begin Phase 1 - Backend API Foundation

### **Implementation Notes:**
- All database tables are ready (restaurant_chains, branches)
- Chain-branch relationships validated via foreign keys
- URL structure finalized: `/order/chain-slug` pattern
- Ready to begin backend API development

---

**Implementation Priority**: Backend → Frontend Routes → Components → Integration Testing → Legacy Cleanup

This implementation will provide a clean, scalable customer ordering system with proper chain isolation and user-friendly URLs while maintaining all existing functionality for QR codes and menu management.

---

*🚀 **Ready to Start**: Phase 1 backend development can begin immediately*