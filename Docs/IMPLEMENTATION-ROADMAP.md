# Implementation Roadmap - Delivery Platform Integration

**Step-by-step implementation guide for Uber Eats, DoorDash, and SkipTheDishes integration with Vizion Menu**

---

## 🎯 ROADMAP PURPOSE

This document provides a **detailed, actionable implementation plan** for integrating Vizion Menu with delivery platforms. It serves as:

- **Day-by-day implementation schedule**
- **Code-level implementation instructions**
- **Testing procedures and validation steps**
- **Deployment and rollout strategy**
- **Risk mitigation and contingency planning**

**Target Audience**: AI development assistants, technical implementers, and project managers requiring exact implementation steps.

---

## 📅 MASTER TIMELINE OVERVIEW

### **Week 1: Foundation & Database Layer**
- **Days 1-2**: Database schema creation and RLS policies
- **Days 3-4**: Platform mapping services development
- **Days 5-6**: Basic CRUD API endpoints
- **Day 7**: Testing and validation

### **Week 2: Menu Synchronization**
- **Days 1-2**: Platform format converters development
- **Days 3-4**: Menu sync services with mock APIs
- **Days 5-6**: Sync controllers and routes
- **Day 7**: Frontend sync interface

### **Week 3: Order Integration**
- **Days 1-2**: Webhook endpoint development
- **Days 3-4**: Order format conversion and processing
- **Days 5-6**: Integration with existing order system
- **Day 7**: Error handling and monitoring

### **Week 4: Status Updates & Admin UI**
- **Days 1-2**: Status update service extension
- **Days 3-4**: Platform-specific status synchronization
- **Days 5-6**: Admin UI for mapping management
- **Day 7**: Multi-language support implementation

### **Week 5: Testing & Documentation**
- **Days 1-3**: Comprehensive testing and bug fixes
- **Days 4-5**: Documentation and client preparation
- **Days 6-7**: Client demonstration and feedback

---

## 🗓️ WEEK 1: FOUNDATION & DATABASE LAYER

### **Day 1: Database Schema Creation**

#### **Morning (4 hours): Table Creation**

**Task 1.1: Create platform_item_mappings table**
```sql
-- File: apps/api/database/migrations/001_platform_item_mappings.sql
CREATE TABLE platform_item_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID REFERENCES branches(id) NOT NULL,
  menu_item_id UUID REFERENCES menu_items(id) NOT NULL,
  platform VARCHAR(50) NOT NULL CHECK (platform IN ('uber_eats', 'doordash', 'skipthedishes')),
  platform_item_id VARCHAR(255) NOT NULL,
  platform_menu_id VARCHAR(255),
  platform_category_id VARCHAR(255),
  last_sync_at TIMESTAMP WITH TIME ZONE,
  sync_status VARCHAR(50) DEFAULT 'pending' CHECK (sync_status IN ('pending', 'synced', 'failed', 'syncing')),
  sync_error_message TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(branch_id, menu_item_id, platform),
  INDEX idx_platform_mappings_branch_platform (branch_id, platform),
  INDEX idx_platform_mappings_sync_status (sync_status),
  INDEX idx_platform_mappings_last_sync (last_sync_at)
);

-- RLS Policy for multi-tenant access
CREATE POLICY "branch_access_platform_mappings" ON platform_item_mappings
FOR ALL USING (EXISTS (
  SELECT 1 FROM branch_users 
  WHERE branch_users.branch_id = platform_item_mappings.branch_id 
  AND branch_users.user_id = auth.uid()
));

-- Enable RLS
ALTER TABLE platform_item_mappings ENABLE ROW LEVEL SECURITY;
```

**Task 1.2: Create platform_sync_logs table**
```sql
-- File: apps/api/database/migrations/002_platform_sync_logs.sql
CREATE TABLE platform_sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID REFERENCES branches(id) NOT NULL,
  platform VARCHAR(50) NOT NULL,
  sync_type VARCHAR(50) NOT NULL CHECK (sync_type IN ('menu_upload', 'order_sync', 'status_update', 'item_mapping')),
  operation VARCHAR(100) NOT NULL, -- Specific operation description
  status VARCHAR(50) NOT NULL CHECK (status IN ('started', 'success', 'failed', 'partial')),
  items_processed INTEGER DEFAULT 0,
  items_succeeded INTEGER DEFAULT 0,
  items_failed INTEGER DEFAULT 0,
  error_details JSONB,
  sync_duration_ms INTEGER,
  triggered_by UUID REFERENCES auth.users(id),
  metadata JSONB, -- Additional sync information
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Indexes
  INDEX idx_sync_logs_branch_platform (branch_id, platform),
  INDEX idx_sync_logs_status (status),
  INDEX idx_sync_logs_created_at (created_at),
  INDEX idx_sync_logs_sync_type (sync_type)
);

-- RLS Policy
CREATE POLICY "branch_access_sync_logs" ON platform_sync_logs
FOR ALL USING (EXISTS (
  SELECT 1 FROM branch_users 
  WHERE branch_users.branch_id = platform_sync_logs.branch_id 
  AND branch_users.user_id = auth.uid()
));

ALTER TABLE platform_sync_logs ENABLE ROW LEVEL SECURITY;
```

#### **Afternoon (4 hours): Database Functions and Triggers**

**Task 1.3: Create database helper functions**
```sql
-- File: apps/api/database/functions/platform_helpers.sql

-- Function to update sync status
CREATE OR REPLACE FUNCTION update_mapping_sync_status(
  p_branch_id UUID,
  p_menu_item_id UUID,
  p_platform VARCHAR(50),
  p_status VARCHAR(50),
  p_error_message TEXT DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
  UPDATE platform_item_mappings 
  SET 
    sync_status = p_status,
    sync_error_message = p_error_message,
    last_sync_at = CASE WHEN p_status = 'synced' THEN NOW() ELSE last_sync_at END,
    updated_at = NOW()
  WHERE 
    branch_id = p_branch_id 
    AND menu_item_id = p_menu_item_id 
    AND platform = p_platform;
END;
$$ LANGUAGE plpgsql;

-- Function to log platform operations
CREATE OR REPLACE FUNCTION log_platform_sync(
  p_branch_id UUID,
  p_platform VARCHAR(50),
  p_sync_type VARCHAR(50),
  p_operation VARCHAR(100),
  p_status VARCHAR(50),
  p_items_processed INTEGER DEFAULT 0,
  p_items_succeeded INTEGER DEFAULT 0,
  p_items_failed INTEGER DEFAULT 0,
  p_error_details JSONB DEFAULT NULL,
  p_sync_duration_ms INTEGER DEFAULT NULL,
  p_triggered_by UUID DEFAULT NULL,
  p_metadata JSONB DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  log_id UUID;
BEGIN
  INSERT INTO platform_sync_logs (
    branch_id, platform, sync_type, operation, status,
    items_processed, items_succeeded, items_failed,
    error_details, sync_duration_ms, triggered_by, metadata
  ) VALUES (
    p_branch_id, p_platform, p_sync_type, p_operation, p_status,
    p_items_processed, p_items_succeeded, p_items_failed,
    p_error_details, p_sync_duration_ms, p_triggered_by, p_metadata
  ) RETURNING id INTO log_id;
  
  RETURN log_id;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_platform_mappings_updated_at
  BEFORE UPDATE ON platform_item_mappings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

**Task 1.4: Data validation and constraints**
```sql
-- File: apps/api/database/validations/platform_validations.sql

-- Add check constraints for data integrity
ALTER TABLE platform_item_mappings 
ADD CONSTRAINT check_platform_item_id_not_empty 
CHECK (LENGTH(TRIM(platform_item_id)) > 0);

ALTER TABLE platform_item_mappings 
ADD CONSTRAINT check_valid_menu_item_reference
CHECK (menu_item_id IS NOT NULL);

-- Create indexes for performance
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_platform_mappings_active
ON platform_item_mappings (branch_id, platform, is_active)
WHERE is_active = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_platform_mappings_sync_pending
ON platform_item_mappings (branch_id, platform)
WHERE sync_status = 'pending';
```

**Testing Commands:**
```bash
# Test database creation
npm run db:migrate
npm run db:test-connection

# Verify tables exist
psql -d your_db -c "\dt platform_*"

# Test RLS policies
npm run test:database:rls
```

---

### **Day 2: Service Layer Foundation**

#### **Morning (4 hours): Core Services Setup**

**Task 2.1: Create platform-mappings.service.js**
```javascript
// File: apps/api/api/services/platform-mappings.service.js
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Create a new platform item mapping
 * @param {Object} mappingData - Mapping data
 * @param {Object} userBranch - User branch context
 * @returns {Object} Created mapping
 */
async function createItemMapping(mappingData, userBranch) {
  const { menu_item_id, platform, platform_item_id, platform_menu_id, platform_category_id } = mappingData;
  
  // Validate permissions
  if (!canManagePlatformMappings(userBranch.role)) {
    throw new Error('Insufficient permissions to create platform mappings');
  }
  
  // Validate menu item exists and belongs to branch
  const { data: menuItem, error: menuItemError } = await supabase
    .from('menu_items')
    .select('id, name, category_id, menu_categories!inner(branch_id)')
    .eq('id', menu_item_id)
    .eq('menu_categories.branch_id', userBranch.branch_id)
    .single();
    
  if (menuItemError || !menuItem) {
    throw new Error('Menu item not found or access denied');
  }
  
  // Check for existing mapping
  const { data: existingMapping } = await supabase
    .from('platform_item_mappings')
    .select('id')
    .eq('branch_id', userBranch.branch_id)
    .eq('menu_item_id', menu_item_id)
    .eq('platform', platform)
    .single();
    
  if (existingMapping) {
    throw new Error(`Mapping already exists for ${platform}`);
  }
  
  // Create mapping
  const { data: mapping, error } = await supabase
    .from('platform_item_mappings')
    .insert({
      branch_id: userBranch.branch_id,
      menu_item_id,
      platform,
      platform_item_id,
      platform_menu_id,
      platform_category_id,
      sync_status: 'pending'
    })
    .select(`
      *,
      menu_items!inner(name, description, price)
    `)
    .single();
    
  if (error) {
    throw new Error(`Failed to create mapping: ${error.message}`);
  }
  
  // Log the operation
  await logPlatformOperation(
    userBranch.branch_id,
    platform,
    'item_mapping',
    'create_mapping',
    'success',
    1,
    1,
    0,
    null,
    userBranch.user_id
  );
  
  return mapping;
}

/**
 * Get platform mappings with filtering
 * @param {Object} filters - Filter parameters
 * @param {Object} userBranch - User branch context
 * @returns {Object} Paginated mappings
 */
async function getPlatformMappings(filters, userBranch) {
  const { platform, sync_status, page = 1, limit = 50 } = filters;
  
  // Build query
  let query = supabase
    .from('platform_item_mappings')
    .select(`
      *,
      menu_items!inner(
        id,
        name,
        description,
        price,
        image_url,
        is_available,
        menu_categories!inner(name, branch_id)
      )
    `)
    .eq('branch_id', userBranch.branch_id)
    .order('created_at', { ascending: false });
    
  // Apply filters
  if (platform) {
    query = query.eq('platform', platform);
  }
  
  if (sync_status) {
    query = query.eq('sync_status', sync_status);
  }
  
  // Pagination
  const offset = (page - 1) * limit;
  query = query.range(offset, offset + limit - 1);
  
  const { data: mappings, error } = await query;
  
  if (error) {
    throw new Error(`Failed to fetch mappings: ${error.message}`);
  }
  
  // Get total count
  let countQuery = supabase
    .from('platform_item_mappings')
    .select('id', { count: 'exact' })
    .eq('branch_id', userBranch.branch_id);
    
  if (platform) countQuery = countQuery.eq('platform', platform);
  if (sync_status) countQuery = countQuery.eq('sync_status', sync_status);
  
  const { count, error: countError } = await countQuery;
  
  if (countError) {
    throw new Error(`Failed to fetch count: ${countError.message}`);
  }
  
  return {
    mappings,
    pagination: {
      page,
      limit,
      total: count,
      totalPages: Math.ceil(count / limit)
    }
  };
}

/**
 * Update platform mapping
 * @param {string} mappingId - Mapping ID
 * @param {Object} updateData - Update data
 * @param {Object} userBranch - User branch context
 * @returns {Object} Updated mapping
 */
async function updateItemMapping(mappingId, updateData, userBranch) {
  // Validate permissions
  if (!canManagePlatformMappings(userBranch.role)) {
    throw new Error('Insufficient permissions to update platform mappings');
  }
  
  // Get existing mapping
  const { data: existingMapping, error: fetchError } = await supabase
    .from('platform_item_mappings')
    .select('*')
    .eq('id', mappingId)
    .eq('branch_id', userBranch.branch_id)
    .single();
    
  if (fetchError || !existingMapping) {
    throw new Error('Mapping not found or access denied');
  }
  
  // Update mapping
  const { data: mapping, error } = await supabase
    .from('platform_item_mappings')
    .update({
      ...updateData,
      updated_at: new Date().toISOString()
    })
    .eq('id', mappingId)
    .select(`
      *,
      menu_items!inner(name, description, price)
    `)
    .single();
    
  if (error) {
    throw new Error(`Failed to update mapping: ${error.message}`);
  }
  
  return mapping;
}

/**
 * Delete platform mapping
 * @param {string} mappingId - Mapping ID
 * @param {Object} userBranch - User branch context
 * @returns {Object} Success response
 */
async function deleteItemMapping(mappingId, userBranch) {
  // Validate permissions
  if (!canManagePlatformMappings(userBranch.role)) {
    throw new Error('Insufficient permissions to delete platform mappings');
  }
  
  // Verify mapping exists and belongs to branch
  const { data: existingMapping, error: fetchError } = await supabase
    .from('platform_item_mappings')
    .select('platform')
    .eq('id', mappingId)
    .eq('branch_id', userBranch.branch_id)
    .single();
    
  if (fetchError || !existingMapping) {
    throw new Error('Mapping not found or access denied');
  }
  
  // Delete mapping
  const { error } = await supabase
    .from('platform_item_mappings')
    .delete()
    .eq('id', mappingId);
    
  if (error) {
    throw new Error(`Failed to delete mapping: ${error.message}`);
  }
  
  // Log the operation
  await logPlatformOperation(
    userBranch.branch_id,
    existingMapping.platform,
    'item_mapping',
    'delete_mapping',
    'success',
    1,
    1,
    0,
    null,
    userBranch.user_id
  );
  
  return { success: true };
}

/**
 * Get mappings for a specific menu item across all platforms
 * @param {string} menuItemId - Menu item ID
 * @param {Object} userBranch - User branch context
 * @returns {Array} Platform mappings
 */
async function getMenuItemMappings(menuItemId, userBranch) {
  const { data: mappings, error } = await supabase
    .from('platform_item_mappings')
    .select('*')
    .eq('menu_item_id', menuItemId)
    .eq('branch_id', userBranch.branch_id)
    .order('platform');
    
  if (error) {
    throw new Error(`Failed to fetch item mappings: ${error.message}`);
  }
  
  return mappings;
}

/**
 * Bulk create mappings
 * @param {Array} mappingsData - Array of mapping data
 * @param {Object} userBranch - User branch context
 * @returns {Object} Bulk operation result
 */
async function bulkCreateMappings(mappingsData, userBranch) {
  // Validate permissions
  if (!canManagePlatformMappings(userBranch.role)) {
    throw new Error('Insufficient permissions to create platform mappings');
  }
  
  const results = {
    succeeded: 0,
    failed: 0,
    errors: []
  };
  
  for (const mappingData of mappingsData) {
    try {
      await createItemMapping(mappingData, userBranch);
      results.succeeded++;
    } catch (error) {
      results.failed++;
      results.errors.push({
        mappingData,
        error: error.message
      });
    }
  }
  
  return results;
}

// Helper functions
function canManagePlatformMappings(userRole) {
  const allowedRoles = ['chain_owner', 'branch_manager'];
  return allowedRoles.includes(userRole);
}

async function logPlatformOperation(branchId, platform, syncType, operation, status, processed, succeeded, failed, errorDetails, triggeredBy) {
  try {
    await supabase.rpc('log_platform_sync', {
      p_branch_id: branchId,
      p_platform: platform,
      p_sync_type: syncType,
      p_operation: operation,
      p_status: status,
      p_items_processed: processed,
      p_items_succeeded: succeeded,
      p_items_failed: failed,
      p_error_details: errorDetails,
      p_triggered_by: triggeredBy
    });
  } catch (error) {
    console.error('Failed to log platform operation:', error);
  }
}

module.exports = {
  createItemMapping,
  getPlatformMappings,
  updateItemMapping,
  deleteItemMapping,
  getMenuItemMappings,
  bulkCreateMappings
};
```

#### **Afternoon (4 hours): Platform Formatters**

**Task 2.2: Create platform-formatters.js**
```javascript
// File: apps/api/api/helpers/platform-formatters.js

/**
 * Convert Vizion Menu item to Uber Eats format
 * @param {Object} vizionItem - Vizion menu item
 * @param {Object} mapping - Platform mapping data
 * @returns {Object} Uber Eats formatted item
 */
function convertToUberEatsFormat(vizionItem, mapping) {
  return {
    id: mapping.platform_item_id,
    external_data: vizionItem.id,
    title: vizionItem.name,
    description: vizionItem.description || '',
    price: Math.round(vizionItem.price * 100), // Convert to cents
    images: vizionItem.image_url ? [{
      url: vizionItem.image_url,
      width: 640,
      height: 480
    }] : [],
    available: vizionItem.is_available,
    preparation_time_seconds: (vizionItem.preparation_time || 15) * 60,
    dietary_info: parseDietaryInfo(vizionItem.dietary_info),
    allergens: parseAllergens(vizionItem.allergens),
    nutritional_info: parseNutritionalInfo(vizionItem.nutritional_info),
    max_quantity: vizionItem.max_quantity || 99,
    modifiers: (vizionItem.modifiers || []).map(convertModifierToUberEats)
  };
}

/**
 * Convert modifier to Uber Eats format
 * @param {Object} vizionModifier - Vizion modifier
 * @returns {Object} Uber Eats formatted modifier
 */
function convertModifierToUberEats(vizionModifier) {
  return {
    id: `ue_mod_${vizionModifier.id}`,
    title: vizionModifier.name,
    min_selections: vizionModifier.min_selections || 0,
    max_selections: vizionModifier.max_selections || 1,
    options: (vizionModifier.options || []).map(option => ({
      id: `ue_opt_${option.id}`,
      title: option.name,
      price: Math.round(option.price * 100) // Convert to cents
    }))
  };
}

/**
 * Convert Vizion Menu item to DoorDash format
 * @param {Object} vizionItem - Vizion menu item
 * @param {Object} mapping - Platform mapping data
 * @returns {Object} DoorDash formatted item
 */
function convertToDoorDashFormat(vizionItem, mapping) {
  return {
    external_id: mapping.platform_item_id,
    name: vizionItem.name,
    description: vizionItem.description || '',
    price: vizionItem.price, // DoorDash uses dollars
    is_active: vizionItem.is_available,
    image_url: vizionItem.image_url,
    tags: parseDietaryInfo(vizionItem.dietary_info),
    allergens: parseAllergens(vizionItem.allergens),
    modifiers: (vizionItem.modifiers || []).map(convertModifierToDoorDash)
  };
}

/**
 * Convert modifier to DoorDash format
 * @param {Object} vizionModifier - Vizion modifier
 * @returns {Object} DoorDash formatted modifier
 */
function convertModifierToDoorDash(vizionModifier) {
  return {
    name: vizionModifier.name,
    min_selections: vizionModifier.min_selections || 0,
    max_selections: vizionModifier.max_selections || 1,
    modifier_options: (vizionModifier.options || []).map(option => ({
      name: option.name,
      price: option.price // DoorDash uses dollars
    }))
  };
}

/**
 * Convert Vizion Menu category to platform format
 * @param {Object} vizionCategory - Vizion category
 * @param {Array} categoryItems - Items in category
 * @param {string} platform - Target platform
 * @returns {Object} Platform formatted category
 */
function convertCategoryToPlatformFormat(vizionCategory, categoryItems, platform) {
  switch (platform) {
    case 'uber_eats':
      return {
        section_id: `ue_cat_${vizionCategory.id}`,
        title: vizionCategory.name,
        subtitle: vizionCategory.description || '',
        items: categoryItems
      };
      
    case 'doordash':
      return {
        name: vizionCategory.name,
        active: true,
        sort_order: vizionCategory.display_order || 1,
        items: categoryItems
      };
      
    default:
      return {
        name: vizionCategory.name,
        items: categoryItems
      };
  }
}

/**
 * Convert full menu to platform format
 * @param {Object} vizionMenu - Complete Vizion menu data
 * @param {string} platform - Target platform
 * @returns {Object} Platform formatted menu
 */
function convertMenuToPlatformFormat(vizionMenu, platform) {
  switch (platform) {
    case 'uber_eats':
      return {
        menus: [{
          menu_id: `ue_menu_${vizionMenu.branch_id}`,
          title: `${vizionMenu.branch_name} Menu`,
          subtitle: 'Delicious food delivered fresh',
          sections: vizionMenu.categories.map(category => 
            convertCategoryToPlatformFormat(category, category.items, platform)
          )
        }]
      };
      
    case 'doordash':
      return {
        menu: {
          categories: vizionMenu.categories.map(category => 
            convertCategoryToPlatformFormat(category, category.items, platform)
          )
        }
      };
      
    default:
      return vizionMenu;
  }
}

// Order format converters

/**
 * Convert Uber Eats order to Vizion format
 * @param {Object} uberOrder - Uber Eats order data
 * @param {string} branchId - Target branch ID
 * @returns {Object} Vizion formatted order
 */
function convertUberEatsOrderToVizion(uberOrder, branchId) {
  return {
    external_order_id: uberOrder.id,
    branch_id: branchId,
    customer_name: `${uberOrder.eater?.first_name || ''} ${uberOrder.eater?.last_name || ''}`.trim(),
    customer_phone: uberOrder.eater?.phone || '',
    customer_email: uberOrder.eater?.email || '',
    order_type: 'takeaway',
    third_party_platform: 'uber_eats',
    source: 'uber_eats',
    subtotal: (uberOrder.payment?.charges?.subtotal || 0) / 100,
    tax: (uberOrder.payment?.charges?.tax || 0) / 100,
    tip: (uberOrder.payment?.charges?.tip || 0) / 100,
    total: (uberOrder.payment?.charges?.total || 0) / 100,
    special_instructions: uberOrder.cart?.special_instructions || '',
    delivery_info: {
      address: uberOrder.delivery?.location?.address || '',
      notes: uberOrder.delivery?.notes || '',
      estimated_delivery_time: uberOrder.estimated_ready_for_pickup_at
    },
    items: (uberOrder.cart?.items || []).map(item => ({
      external_id: item.external_data,
      name: item.title,
      quantity: item.quantity,
      unit_price: item.price / 100,
      total_price: (item.price * item.quantity) / 100,
      special_instructions: item.special_instructions || '',
      modifiers: (item.modifiers || []).map(mod => ({
        name: mod.title,
        option: mod.option?.title || '',
        price: (mod.option?.price || 0) / 100
      }))
    })),
    payment_method: 'online',
    order_status: 'pending',
    platform_created_at: uberOrder.placed_at
  };
}

/**
 * Convert DoorDash order to Vizion format
 * @param {Object} doorDashOrder - DoorDash order data
 * @param {string} branchId - Target branch ID
 * @returns {Object} Vizion formatted order
 */
function convertDoorDashOrderToVizion(doorDashOrder, branchId) {
  const order = doorDashOrder.order || doorDashOrder;
  
  return {
    external_order_id: order.id,
    branch_id: branchId,
    customer_name: order.customer?.name || '',
    customer_phone: order.customer?.phone_number || '',
    customer_email: order.customer?.email || '',
    order_type: 'takeaway',
    third_party_platform: 'doordash',
    source: 'doordash',
    subtotal: order.subtotal || 0,
    tax: order.tax || 0,
    tip: order.tip || 0,
    total: order.total || 0,
    special_instructions: order.special_instructions || '',
    delivery_info: {
      address: formatAddress(order.delivery_address),
      estimated_delivery_time: order.estimated_pickup_time
    },
    items: (order.items || []).map(item => ({
      external_id: item.external_id,
      name: item.name,
      quantity: item.quantity,
      unit_price: item.unit_price,
      total_price: item.total_price,
      special_instructions: item.special_instructions || '',
      modifiers: (item.modifiers || []).map(mod => ({
        name: mod.name,
        option: mod.option,
        price: mod.price
      }))
    })),
    payment_method: 'online',
    order_status: 'pending',
    platform_created_at: order.ordered_at
  };
}

// Status mapping functions

/**
 * Convert Vizion status to platform status
 * @param {string} vizionStatus - Vizion order status
 * @param {string} platform - Target platform
 * @returns {string} Platform status
 */
function convertStatusToPlatform(vizionStatus, platform) {
  const statusMappings = {
    uber_eats: {
      'pending': 'created',
      'confirmed': 'accepted',
      'preparing': 'preparing',
      'ready': 'ready_for_pickup',
      'completed': 'finished',
      'cancelled': 'cancelled'
    },
    doordash: {
      'pending': 'created',
      'confirmed': 'accepted',
      'preparing': 'being_prepared',
      'ready': 'ready_for_pickup',
      'completed': 'delivered',
      'cancelled': 'cancelled'
    },
    skipthedishes: {
      'pending': 'received',
      'confirmed': 'accepted',
      'preparing': 'being_prepared',
      'ready': 'ready',
      'completed': 'completed',
      'cancelled': 'cancelled'
    }
  };
  
  return statusMappings[platform]?.[vizionStatus] || vizionStatus;
}

/**
 * Convert platform status to Vizion status
 * @param {string} platformStatus - Platform order status
 * @param {string} platform - Source platform
 * @returns {string} Vizion status
 */
function convertStatusFromPlatform(platformStatus, platform) {
  const statusMappings = {
    uber_eats: {
      'created': 'pending',
      'accepted': 'confirmed',
      'preparing': 'preparing',
      'ready_for_pickup': 'ready',
      'finished': 'completed',
      'cancelled': 'cancelled'
    },
    doordash: {
      'created': 'pending',
      'accepted': 'confirmed',
      'being_prepared': 'preparing',
      'ready_for_pickup': 'ready',
      'delivered': 'completed',
      'cancelled': 'cancelled'
    }
  };
  
  return statusMappings[platform]?.[platformStatus] || 'pending';
}

// Helper functions

function parseDietaryInfo(dietaryInfo) {
  if (!dietaryInfo) return [];
  if (typeof dietaryInfo === 'string') {
    return dietaryInfo.split(',').map(item => item.trim());
  }
  return Array.isArray(dietaryInfo) ? dietaryInfo : [];
}

function parseAllergens(allergens) {
  if (!allergens) return [];
  if (typeof allergens === 'string') {
    return allergens.split(',').map(item => item.trim());
  }
  return Array.isArray(allergens) ? allergens : [];
}

function parseNutritionalInfo(nutritionalInfo) {
  if (!nutritionalInfo) return {};
  if (typeof nutritionalInfo === 'string') {
    try {
      return JSON.parse(nutritionalInfo);
    } catch {
      return {};
    }
  }
  return nutritionalInfo || {};
}

function formatAddress(addressObj) {
  if (!addressObj) return '';
  if (typeof addressObj === 'string') return addressObj;
  
  const parts = [
    addressObj.street,
    addressObj.city,
    addressObj.state,
    addressObj.zip_code
  ].filter(Boolean);
  
  return parts.join(', ');
}

module.exports = {
  // Menu formatters
  convertToUberEatsFormat,
  convertToDoorDashFormat,
  convertCategoryToPlatformFormat,
  convertMenuToPlatformFormat,
  
  // Order formatters
  convertUberEatsOrderToVizion,
  convertDoorDashOrderToVizion,
  
  // Status formatters
  convertStatusToPlatform,
  convertStatusFromPlatform,
  
  // Helper functions
  parseDietaryInfo,
  parseAllergens,
  formatAddress
};
```

**Testing Commands:**
```bash
# Test service layer
npm run test:services:platform-mappings

# Test format converters
npm run test:helpers:platform-formatters

# Integration test
npm run test:integration:platform-services
```

---

### **Day 3: CRUD API Endpoints**

#### **Morning (4 hours): Controllers Development**

**Task 3.1: Create platform-mappings.controller.js**
```javascript
// File: apps/api/api/controllers/platform-mappings.controller.js
const { handleControllerError } = require('../helpers/error-handler');
const { getUserBranchContext } = require('../helpers/auth');
const platformMappingsService = require('../services/platform-mappings.service');

/**
 * Create new platform item mapping
 * POST /api/v1/platform-mappings
 */
const createMapping = async (req, res) => {
  try {
    const userBranch = await getUserBranchContext(req);
    const mappingData = req.body;
    
    // Validate required fields
    const requiredFields = ['menu_item_id', 'platform', 'platform_item_id'];
    for (const field of requiredFields) {
      if (!mappingData[field]) {
        return res.status(400).json({
          error: {
            code: 'MISSING_REQUIRED_FIELD',
            message: `Missing required field: ${field}`
          }
        });
      }
    }
    
    // Validate platform
    const validPlatforms = ['uber_eats', 'doordash', 'skipthedishes'];
    if (!validPlatforms.includes(mappingData.platform)) {
      return res.status(400).json({
        error: {
          code: 'INVALID_PLATFORM',
          message: 'Platform must be one of: uber_eats, doordash, skipthedishes'
        }
      });
    }
    
    const mapping = await platformMappingsService.createItemMapping(mappingData, userBranch);
    
    res.status(201).json({
      data: mapping,
      meta: {
        message: 'Platform mapping created successfully'
      }
    });
    
  } catch (error) {
    handleControllerError(error, 'create platform mapping', res);
  }
};

/**
 * Get platform mappings with filtering and pagination
 * GET /api/v1/platform-mappings
 */
const getMappings = async (req, res) => {
  try {
    const userBranch = await getUserBranchContext(req);
    const filters = {
      platform: req.query.platform,
      sync_status: req.query.sync_status,
      page: parseInt(req.query.page) || 1,
      limit: Math.min(parseInt(req.query.limit) || 50, 100) // Max 100 per page
    };
    
    const result = await platformMappingsService.getPlatformMappings(filters, userBranch);
    
    res.json({
      data: result.mappings,
      meta: {
        pagination: result.pagination
      }
    });
    
  } catch (error) {
    handleControllerError(error, 'get platform mappings', res);
  }
};

/**
 * Get mappings for specific menu item
 * GET /api/v1/platform-mappings/menu-item/:menuItemId
 */
const getMenuItemMappings = async (req, res) => {
  try {
    const userBranch = await getUserBranchContext(req);
    const { menuItemId } = req.params;
    
    if (!menuItemId) {
      return res.status(400).json({
        error: {
          code: 'MISSING_MENU_ITEM_ID',
          message: 'Menu item ID is required'
        }
      });
    }
    
    const mappings = await platformMappingsService.getMenuItemMappings(menuItemId, userBranch);
    
    res.json({
      data: mappings
    });
    
  } catch (error) {
    handleControllerError(error, 'get menu item mappings', res);
  }
};

/**
 * Update platform mapping
 * PATCH /api/v1/platform-mappings/:mappingId
 */
const updateMapping = async (req, res) => {
  try {
    const userBranch = await getUserBranchContext(req);
    const { mappingId } = req.params;
    const updateData = req.body;
    
    if (!mappingId) {
      return res.status(400).json({
        error: {
          code: 'MISSING_MAPPING_ID',
          message: 'Mapping ID is required'
        }
      });
    }
    
    // Validate platform if provided
    if (updateData.platform) {
      const validPlatforms = ['uber_eats', 'doordash', 'skipthedishes'];
      if (!validPlatforms.includes(updateData.platform)) {
        return res.status(400).json({
          error: {
            code: 'INVALID_PLATFORM',
            message: 'Platform must be one of: uber_eats, doordash, skipthedishes'
          }
        });
      }
    }
    
    const mapping = await platformMappingsService.updateItemMapping(mappingId, updateData, userBranch);
    
    res.json({
      data: mapping,
      meta: {
        message: 'Platform mapping updated successfully'
      }
    });
    
  } catch (error) {
    handleControllerError(error, 'update platform mapping', res);
  }
};

/**
 * Delete platform mapping
 * DELETE /api/v1/platform-mappings/:mappingId
 */
const deleteMapping = async (req, res) => {
  try {
    const userBranch = await getUserBranchContext(req);
    const { mappingId } = req.params;
    
    if (!mappingId) {
      return res.status(400).json({
        error: {
          code: 'MISSING_MAPPING_ID',
          message: 'Mapping ID is required'
        }
      });
    }
    
    await platformMappingsService.deleteItemMapping(mappingId, userBranch);
    
    res.json({
      data: { success: true },
      meta: {
        message: 'Platform mapping deleted successfully'
      }
    });
    
  } catch (error) {
    handleControllerError(error, 'delete platform mapping', res);
  }
};

/**
 * Bulk create mappings
 * POST /api/v1/platform-mappings/bulk
 */
const bulkCreateMappings = async (req, res) => {
  try {
    const userBranch = await getUserBranchContext(req);
    const { mappings } = req.body;
    
    if (!Array.isArray(mappings) || mappings.length === 0) {
      return res.status(400).json({
        error: {
          code: 'INVALID_MAPPINGS_DATA',
          message: 'Mappings must be a non-empty array'
        }
      });
    }
    
    if (mappings.length > 100) {
      return res.status(400).json({
        error: {
          code: 'TOO_MANY_MAPPINGS',
          message: 'Cannot create more than 100 mappings at once'
        }
      });
    }
    
    const result = await platformMappingsService.bulkCreateMappings(mappings, userBranch);
    
    res.status(201).json({
      data: result,
      meta: {
        message: `Bulk operation completed: ${result.succeeded} succeeded, ${result.failed} failed`
      }
    });
    
  } catch (error) {
    handleControllerError(error, 'bulk create platform mappings', res);
  }
};

/**
 * Get mapping statistics
 * GET /api/v1/platform-mappings/stats
 */
const getMappingStats = async (req, res) => {
  try {
    const userBranch = await getUserBranchContext(req);
    
    // This would be implemented in the service
    const stats = await platformMappingsService.getMappingStatistics(userBranch);
    
    res.json({
      data: stats
    });
    
  } catch (error) {
    handleControllerError(error, 'get mapping statistics', res);
  }
};

module.exports = {
  createMapping,
  getMappings,
  getMenuItemMappings,
  updateMapping,
  deleteMapping,
  bulkCreateMappings,
  getMappingStats
};
```

#### **Afternoon (4 hours): Routes Setup**

**Task 3.2: Create platform-mappings.routes.js**
```javascript
// File: apps/api/api/routes/platform-mappings.routes.js
const express = require('express');
const controller = require('../controllers/platform-mappings.controller');
const { requireAuth, requireAuthWithBranch } = require('../middleware/auth.middleware');

const router = express.Router();

// All routes require authentication with branch context
router.use(requireAuthWithBranch);

// CRUD operations
router.post('/', controller.createMapping);
router.get('/', controller.getMappings);
router.patch('/:mappingId', controller.updateMapping);
router.delete('/:mappingId', controller.deleteMapping);

// Bulk operations
router.post('/bulk', controller.bulkCreateMappings);

// Specific queries
router.get('/menu-item/:menuItemId', controller.getMenuItemMappings);
router.get('/stats', controller.getMappingStats);

module.exports = router;
```

**Task 3.3: Mount routes in main app**
```javascript
// File: apps/api/api/index.js - Add this line with other route imports
const platformMappingsRoutes = require('./routes/platform-mappings.routes');

// Mount the routes (add this line with other route mounts)
app.use('/api/v1/platform-mappings', platformMappingsRoutes);
```

**Task 3.4: Input validation middleware (optional enhancement)**
```javascript
// File: apps/api/api/middleware/validation.middleware.js
const { z } = require('zod');

const platformMappingSchema = z.object({
  menu_item_id: z.string().uuid('Invalid menu item ID format'),
  platform: z.enum(['uber_eats', 'doordash', 'skipthedishes']),
  platform_item_id: z.string().min(1, 'Platform item ID is required'),
  platform_menu_id: z.string().optional(),
  platform_category_id: z.string().optional()
});

const validatePlatformMapping = (req, res, next) => {
  try {
    platformMappingSchema.parse(req.body);
    next();
  } catch (error) {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid request data',
        details: error.errors
      }
    });
  }
};

module.exports = {
  validatePlatformMapping,
  platformMappingSchema
};
```

**Testing Commands:**
```bash
# Test API endpoints
npm run test:controllers:platform-mappings

# Test routes
npm run test:routes:platform-mappings

# Integration test with auth
npm run test:integration:platform-mappings

# Manual API testing
curl -X POST http://localhost:3001/api/v1/platform-mappings \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "menu_item_id": "uuid-here",
    "platform": "uber_eats",
    "platform_item_id": "ue_item_123"
  }'
```

---

### **Day 4: Basic Testing & Validation**

[Continue with testing procedures, validation, and Day 5-7 implementation...]

**Testing Commands for Week 1:**
```bash
# Database tests
npm run test:database:schema
npm run test:database:rls

# Service tests
npm run test:services:platform-mappings
npm run test:helpers:platform-formatters

# API tests
npm run test:controllers:platform-mappings
npm run test:routes:platform-mappings

# Integration tests
npm run test:integration:week1

# Code quality
npm run lint
npm run build
npm run type-check

# End-to-end functionality test
npm run test:e2e:platform-mappings
```

---

## 📝 IMPLEMENTATION NOTES

### **Daily Standup Questions**
1. **What did you complete yesterday?**
2. **What will you work on today?**
3. **Are there any blockers or dependencies?**
4. **Do you need any platform credentials or access?**

### **Code Quality Checkpoints**
- [ ] All code follows CLAUDE.md guidelines
- [ ] ESLint passes without warnings
- [ ] TypeScript compilation succeeds
- [ ] Test coverage > 80%
- [ ] Multi-language support implemented
- [ ] RLS policies tested and working

### **Risk Mitigation**
- **Database Issues**: Have rollback scripts ready
- **API Changes**: Monitor platform documentation for changes
- **Testing Limitations**: Comprehensive mock implementations
- **Performance Issues**: Query optimization and indexing

---

*This roadmap continues with Week 2-5 detailed implementation plans...*

**Next Document**: Week 2-5 detailed daily implementation plans will be included in the complete roadmap.