# Campaign History & Usage Statistics - Implementation Plan

**Project**: VizionMenu - Campaign Management Enhancement  
**Date**: January 2025  
**Status**: Planning Phase  

---

## 🎯 Requirements Analysis

**Customer Feedback:**
> "Kupon kampanyaları: Tamamlanan kampanyalar için bir geçmiş görülebilsin; "yenile/tekrarla" ile aynı ayarları kopyalayıp yeni tarih aralığıyla hızla başlatılabilsin—restoranın bilgileri yeniden doldurması gerekmesin."

**Feature Requirements:**
1. ✅ Campaign history view for completed/expired campaigns
2. ✅ "Repeat/Duplicate" functionality - copy campaign with new dates
3. ✅ Pre-fill all campaign data (no re-entering restaurant info)
4. ✅ **BONUS**: Campaign usage statistics (uses count & savings)

---

## 🏗️ Technical Analysis

### Current State
- ✅ Campaign CRUD operations exist
- ✅ Active/Inactive status toggle
- ✅ Backend `coupon_usages` table exists
- ✅ Usage tracking is implemented
- ❌ No filter system for campaign status
- ❌ No repeat/duplicate functionality
- ❌ No usage statistics display

### Backend Infrastructure
- **Database**: Supabase with `coupons` and `coupon_usages` tables
- **API**: Express.js with campaign service methods
- **Usage Tracking**: `recordCampaignUsage()` function exists

---

## 🚀 Implementation Phases

### 📊 PHASE 0: Backend Enhancement (Usage Statistics)

#### 0.1 Add Campaign Usage Stats Function
**File**: `apps/api/api/services/campaigns.service.js`

```javascript
/**
 * Get campaign usage statistics
 */
async function getCampaignStats(campaignId, branchId) {
  try {
    const { data: usageStats, error } = await supabase
      .from('coupon_usages')
      .select('id, discount_amount, created_at')
      .eq('coupon_id', campaignId);

    if (error) {
      throw new Error(`Failed to fetch campaign stats: ${error.message}`);
    }

    const totalUsages = usageStats?.length || 0;
    const totalSavings = usageStats?.reduce((sum, usage) => sum + usage.discount_amount, 0) || 0;

    return {
      totalUsages,
      totalSavings: Math.round(totalSavings * 100) / 100
    };
  } catch (error) {
    console.error('getCampaignStats error:', error);
    throw error;
  }
}
```

#### 0.2 Update getCampaigns to Include Stats
```javascript
// Modify existing getCampaigns function to include usage statistics
async function getCampaigns(branchId, options = {}) {
  // ... existing code ...
  
  // Add usage stats for each campaign
  const campaignsWithStats = await Promise.all(data.map(async (campaign) => {
    const stats = await getCampaignStats(campaign.id, branchId);
    return {
      ...campaign,
      usage_stats: stats
    };
  }));

  return {
    campaigns: campaignsWithStats || [],
    total: count || campaignsWithStats?.length || 0,
    page,
    limit
  };
}
```

#### 0.3 Export New Function
```javascript
module.exports = {
  // ... existing exports ...
  getCampaignStats
};
```

---

### 📱 PHASE 1: Frontend Type Updates

#### 1.1 Update Campaign Interface
**File**: `apps/web/src/types/campaign.ts`

```typescript
export interface Campaign {
  id: string;
  code: string;
  type: 'percentage' | 'fixed_amount';
  value: number;
  valid_from: string;
  valid_until: string;
  applicable_categories: string[] | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by: string;
  // 🆕 NEW FIELD
  usage_stats?: {
    totalUsages: number;
    totalSavings: number;
  };
}
```

#### 1.2 Campaign Status Logic
**File**: `apps/web/src/app/campaigns/create/page.tsx`

```typescript
enum CampaignStatus {
  ACTIVE = 'active',           // is_active=true AND not expired  
  EXPIRED = 'expired',         // valid_until < today
  INACTIVE = 'inactive',       // is_active=false AND not expired
  ALL = 'all'
}

const getCampaignStatus = (campaign: Campaign): CampaignStatus => {
  const isExpired = new Date(campaign.valid_until) < new Date()
  if (isExpired) return CampaignStatus.EXPIRED
  return campaign.is_active ? CampaignStatus.ACTIVE : CampaignStatus.INACTIVE
}
```

---

### 🎨 PHASE 2: Campaign Card Enhancement

#### 2.1 Enhanced Campaign Card UI
**File**: `apps/web/src/components/campaign-card.tsx`

**New Features:**
- ➕ Usage statistics display
- ➕ "Repeat" button for expired campaigns
- ➕ Enhanced visual styling for different states
- ➕ Smart action button logic

**Layout Structure:**
```jsx
<Card>
  {/* Top section - Icon, Info, Badge */}
  <div className="p-4">
    <div className="flex gap-3">
      <CampaignIcon />
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <CardTitle>{campaign.code}</CardTitle>
          <DiscountBadge />
        </div>
        <CardDescription>Campaign Type</CardDescription>
        
        {/* 🆕 USAGE STATS ROW */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground mt-2">
          <div className="flex items-center gap-1">
            <TrendingUp className="w-3 h-3" />
            <span>{campaign.usage_stats?.totalUsages || 0} uses</span>
          </div>
          {campaign.usage_stats?.totalSavings > 0 && (
            <div className="flex items-center gap-1">
              <DollarSign className="w-3 h-3" />
              <span>${campaign.usage_stats.totalSavings} saved</span>
            </div>
          )}
        </div>
        
        {/* Existing date/category info */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
          <DateInfo />
          <CategoryInfo />
        </div>
      </div>
      <StatusBadge />
    </div>
  </div>
  
  {/* 🆕 ENHANCED ACTION BUTTONS */}
  <div className="border-t flex">
    <Button onClick={handleEdit}>Edit</Button>
    
    {getCampaignStatus(campaign) === 'expired' ? (
      <Button onClick={handleRepeat} className="text-blue-600">
        <RotateCcw className="w-4 h-4" />
        Repeat
      </Button>
    ) : (
      <Button onClick={handleToggleStatus}>
        {campaign.is_active ? 'Deactivate' : 'Activate'}
      </Button>
    )}
    
    <Button onClick={handleDelete} variant="destructive">Delete</Button>
  </div>
</Card>
```

**Visual Mockup:**
```
┌─────────────────────────────────────────────────┐
│ [%] SAVE20                            [Active]  │
│     Percentage Discount                          │  
│     ↗ 47 uses  💰 $234.50 saved                │  ← NEW
│     📅 Until Dec 31  🎯 Specific categories     │
├─────────────────────────────────────────────────┤
│     [Edit]  [Repeat]  [Delete]                  │
└─────────────────────────────────────────────────┘
```

---

### 🔍 PHASE 3: Filter System Implementation

#### 3.1 Filter Tabs Component
**New File**: `apps/web/src/components/campaign-filter-tabs.tsx`

```jsx
interface FilterTabsProps {
  campaigns: Campaign[];
  activeFilter: CampaignStatus;
  onFilterChange: (filter: CampaignStatus) => void;
}

const FilterTabs = ({ campaigns, activeFilter, onFilterChange }) => {
  const counts = {
    all: campaigns.length,
    active: campaigns.filter(c => getCampaignStatus(c) === 'active').length,
    expired: campaigns.filter(c => getCampaignStatus(c) === 'expired').length,
    inactive: campaigns.filter(c => getCampaignStatus(c) === 'inactive').length
  }
  
  return (
    <div className="flex gap-2 mb-6">
      <FilterTab 
        active={activeFilter === 'all'} 
        count={counts.all}
        onClick={() => onFilterChange('all')}
      >
        All Campaigns
      </FilterTab>
      <FilterTab 
        active={activeFilter === 'active'} 
        count={counts.active}
        onClick={() => onFilterChange('active')}
      >
        Active
      </FilterTab>
      <FilterTab 
        active={activeFilter === 'expired'} 
        count={counts.expired}
        onClick={() => onFilterChange('expired')}
      >
        Expired
      </FilterTab>
      <FilterTab 
        active={activeFilter === 'inactive'} 
        count={counts.inactive}
        onClick={() => onFilterChange('inactive')}
      >
        Inactive
      </FilterTab>
    </div>
  )
}
```

#### 3.2 Update Main Campaign Page
**File**: `apps/web/src/app/campaigns/create/page.tsx`

```tsx
// Add state management
const [activeFilter, setActiveFilter] = useState<CampaignStatus>('all')

// Add filtering logic
const filteredCampaigns = campaigns.filter(campaign => {
  if (activeFilter === 'all') return true
  return getCampaignStatus(campaign) === activeFilter
})

// Add filter tabs to UI
<div className="px-2 py-6 sm:px-4 lg:px-6 bg-background">
  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
    <div className="lg:col-span-8">
      <h1 className="text-3xl font-bold tracking-tight">{t.campaigns.createPageTitle}</h1>
      <p className="text-muted-foreground mt-2 text-lg">
        {language === 'fr' 
          ? 'Gérez et créez vos codes promotionnels et remises pour attirer plus de clients'
          : 'Manage and create promotional codes and discounts to attract more customers'
        }
      </p>
    </div>
    <div className="lg:col-span-4 flex items-center justify-end">
      <Button onClick={() => setIsCreateDialogOpen(true)} className="gap-2">
        <Plus className="h-4 w-4" />
        {t.campaigns.createCampaign}
      </Button>
    </div>
  </div>
  
  {/* 🆕 FILTER TABS */}
  {campaigns.length > 0 && (
    <FilterTabs 
      campaigns={campaigns}
      activeFilter={activeFilter}
      onFilterChange={setActiveFilter}
    />
  )}
</div>
```

---

### 🔄 PHASE 4: Campaign Repeat Functionality

#### 4.1 RepeatCampaignDialog Component
**New File**: `apps/web/src/components/repeat-campaign-dialog.tsx`

```tsx
interface RepeatCampaignDialogProps {
  campaign: Campaign | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function RepeatCampaignDialog({ campaign, open, onOpenChange, onSuccess }) {
  // Pre-fill form with original campaign data
  const defaultValues = {
    code: campaign?.code + '_COPY', // Auto-generate new code
    type: campaign?.type,
    value: campaign?.value,
    validFrom: format(new Date(), 'yyyy-MM-dd'), // Start from today
    validUntil: '', // User must set new end date
    applicableCategories: campaign?.applicable_categories,
    applicableItems: campaign?.applicable_items,
    allCategories: !campaign?.applicable_categories,
    allItems: !campaign?.applicable_items
  }
  
  // Form implementation similar to CreateCampaignDialog
  // but with pre-filled values and "Repeat Campaign" title
}
```

#### 4.2 Integration with Campaign Card
```tsx
// In campaign-card.tsx
const handleRepeat = () => {
  onRepeat(campaign) // New prop to handle repeat action
}

// In main page
const [isRepeatDialogOpen, setIsRepeatDialogOpen] = useState(false)
const [campaignToRepeat, setCampaignToRepeat] = useState<Campaign | null>(null)

const handleRepeatCampaign = (campaign: Campaign) => {
  setCampaignToRepeat(campaign)
  setIsRepeatDialogOpen(true)
}
```

---

### 🌐 PHASE 5: Translations & UX Polish

#### 5.1 Add New Translations
**File**: `apps/web/src/lib/translations.ts`

```typescript
campaigns: {
  // ... existing translations ...
  
  // Filter tabs
  allCampaigns: { en: 'All Campaigns', fr: 'Toutes les campagnes' },
  activeCampaigns: { en: 'Active', fr: 'Actives' },
  expiredCampaigns: { en: 'Expired', fr: 'Expirées' },
  inactiveCampaigns: { en: 'Inactive', fr: 'Inactives' },
  
  // Usage statistics
  usageCount: { 
    en: (count: number) => `${count} use${count !== 1 ? 's' : ''}`,
    fr: (count: number) => `${count} utilisation${count !== 1 ? 's' : ''}`
  },
  totalSavings: { 
    en: (amount: number) => `$${amount} saved`,
    fr: (amount: number) => `${amount} $ économisés`
  },
  noUsage: { 
    en: 'Not used yet', 
    fr: 'Pas encore utilisé' 
  },
  
  // Repeat functionality
  repeatCampaign: { en: 'Repeat Campaign', fr: 'Répéter la campagne' },
  campaignRepeated: { en: 'Campaign repeated successfully', fr: 'Campagne répétée avec succès' },
  selectNewDates: { en: 'Select new dates for the campaign', fr: 'Sélectionner de nouvelles dates' },
  copyOf: { en: 'Copy of', fr: 'Copie de' }
}
```

#### 5.2 UX Enhancements
- **Loading States**: Skeleton components for campaign cards
- **Empty States**: Custom messages for each filter
- **Success Notifications**: Toast messages for actions
- **Responsive Design**: Mobile-optimized filter tabs
- **Accessibility**: ARIA labels and keyboard navigation

---

## 🧪 Testing Checklist

### Backend Testing
- [ ] `getCampaignStats()` returns correct usage count and savings
- [ ] `getCampaigns()` includes usage_stats for each campaign
- [ ] Performance is acceptable with large number of campaigns
- [ ] Error handling works for missing/invalid campaign IDs

### Frontend Testing
- [ ] Filter tabs work correctly with live counts
- [ ] Campaign status logic correctly identifies active/expired/inactive
- [ ] Usage statistics display correctly formatted
- [ ] Expired campaigns show "Repeat" instead of "Activate"
- [ ] Repeat dialog pre-fills all original campaign data
- [ ] New campaign created successfully with updated dates
- [ ] Responsive design works on mobile devices
- [ ] Both English/French translations work correctly

### User Experience Testing
- [ ] Filter transitions are smooth and intuitive
- [ ] Campaign cards are visually distinct for different statuses
- [ ] Repeat functionality saves user time (no re-entering data)
- [ ] Usage statistics provide valuable insights
- [ ] Loading states don't cause UI jumping

---

## 🚀 Implementation Timeline

**Estimated Total Time**: 4-6 hours

1. **Phase 0** (Backend): 1 hour
2. **Phase 1** (Types): 15 minutes
3. **Phase 2** (Campaign Cards): 1.5 hours
4. **Phase 3** (Filter System): 1.5 hours
5. **Phase 4** (Repeat Functionality): 1.5 hours
6. **Phase 5** (Translations & Polish): 30 minutes

---

## 📚 Technical Dependencies

### Required Imports
```typescript
// New icons needed
import { TrendingUp, RotateCcw, Filter } from 'lucide-react'

// New date utilities
import { format, addDays } from 'date-fns'

// Additional UI components (if not already imported)
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
```

### File Structure
```
apps/web/src/
├── components/
│   ├── campaign-card.tsx              # ✏️ MODIFY
│   ├── campaign-filter-tabs.tsx       # 🆕 NEW
│   ├── repeat-campaign-dialog.tsx     # 🆕 NEW
│   └── ...
├── app/campaigns/create/
│   └── page.tsx                       # ✏️ MODIFY
├── types/
│   └── campaign.ts                    # ✏️ MODIFY
├── lib/
│   └── translations.ts                # ✏️ MODIFY
└── services/
    └── campaigns.service.ts           # ✏️ MODIFY (if needed)

apps/api/api/services/
└── campaigns.service.js               # ✏️ MODIFY
```

---

## 🔮 Future Enhancements

### Phase 2 Considerations
1. **Advanced Analytics**: 
   - Usage trends over time
   - Most/least successful campaigns
   - Customer demographics

2. **Campaign Templates**: 
   - Save common campaign configurations
   - Quick-start templates for holidays

3. **Bulk Operations**: 
   - Activate/deactivate multiple campaigns
   - Mass expire old campaigns

4. **Export Functionality**: 
   - Export campaign performance data
   - CSV/PDF reports

---

**Document Version**: 1.0  
**Last Updated**: January 2025  
**Status**: Ready for Implementation  
**Next Action**: Begin Phase 0 - Backend Enhancement