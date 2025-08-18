// =====================================================
// CUSTOMER MENU SERVICE
// Business logic for public customer menu
// =====================================================

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Get customer-facing menu (categories + items + active presets)
 * Public endpoint - no authentication required
 */
async function getCustomerMenu(branchId, currentTime = new Date()) {
  try {
    // 1. Get active categories with items
    const { data: categories, error: categoriesError } = await supabase
      .from('menu_categories')
      .select(`
        id,
        name,
        description,
        display_order,
        icon,
        menu_items!category_id (
          id,
          name,
          description,
          price,
          image_url,
          allergens,
          dietary_info,
          preparation_time,
          is_available,
          display_order
        )
      `)
      .eq('branch_id', branchId)
      .eq('is_active', true)
      .order('display_order', { ascending: true });

    if (categoriesError) {
      throw new Error(`Failed to fetch categories: ${categoriesError.message}`);
    }

    // 2. Check for active presets and apply filters
    const { data: activePresets, error: presetsError } = await supabase
      .from('menu_presets')
      .select('*')
      .eq('branch_id', branchId)
      .eq('is_active', true)
      .eq('auto_apply', true);

    if (presetsError) {
      console.warn('Failed to fetch active presets:', presetsError.message);
    }

    // 3. Apply preset filtering if there's an active preset
    let filteredCategories = categories || [];
    let activePreset = null;

    if (activePresets && activePresets.length > 0) {
      // Filter presets by current time
      const now = new Date(currentTime);
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();
      const currentTimeInMinutes = currentHour * 60 + currentMinute;

      for (const preset of activePresets) {
        let isCurrentlyActive = false;

        if (preset.schedule_type === 'daily' && preset.daily_start_time && preset.daily_end_time) {
          // Parse daily time strings (HH:MM:SS format)
          const startParts = preset.daily_start_time.split(':');
          const endParts = preset.daily_end_time.split(':');
          const startTimeInMinutes = parseInt(startParts[0]) * 60 + parseInt(startParts[1]);
          const endTimeInMinutes = parseInt(endParts[0]) * 60 + parseInt(endParts[1]);

          isCurrentlyActive = currentTimeInMinutes >= startTimeInMinutes && currentTimeInMinutes <= endTimeInMinutes;
        } else if (preset.schedule_type === 'one-time' && preset.scheduled_start && preset.scheduled_end) {
          // Check if current time is within scheduled period
          const startTime = new Date(preset.scheduled_start);
          const endTime = new Date(preset.scheduled_end);
          isCurrentlyActive = now >= startTime && now <= endTime;
        }

        if (isCurrentlyActive) {
          activePreset = preset;
          break; // Use the first active preset found
        }
      }
    }

    // Apply preset filtering if there's an active preset
    if (activePreset) {      
      // Apply preset category/item filtering
      if (activePreset.selected_category_ids && activePreset.selected_category_ids.length > 0) {
        // Category-based filtering
        filteredCategories = filteredCategories.filter(cat => 
          activePreset.selected_category_ids.includes(cat.id)
        );
      }
      
      if (activePreset.selected_item_ids && activePreset.selected_item_ids.length > 0) {
        // Item-based filtering
        filteredCategories = filteredCategories.map(category => ({
          ...category,
          menu_items: category.menu_items.filter(item => 
            activePreset.selected_item_ids.includes(item.id)
          )
        })).filter(category => category.menu_items.length > 0);
      }
    }

    // 4. Filter out unavailable items and empty categories
    const customerCategories = filteredCategories
      .map(category => ({
        id: category.id,
        name: category.name,
        description: category.description,
        icon: category.icon,
        display_order: category.display_order,
        items: category.menu_items
          .filter(item => item.is_available)
          .sort((a, b) => a.display_order - b.display_order)
          .map(item => ({
            id: item.id,
            name: item.name,
            description: item.description,
            price: item.price,
            image_url: item.image_url,
            allergens: item.allergens || [],
            dietary_info: item.dietary_info || [],
            preparation_time: item.preparation_time,
            category_id: category.id
          }))
      }))
      .filter(category => category.items.length > 0)
      .sort((a, b) => a.display_order - b.display_order);

    // 5. Get branch information
    const { data: branchData } = await supabase
      .from('branches')
      .select('id, name, address, phone, email')
      .eq('id', branchId)
      .single();

    return {
      categories: customerCategories,
      metadata: {
        branchId: branchId,
        branchName: branchData?.name || 'Restaurant',
        branchAddress: branchData?.address,
        activePreset: activePreset ? {
          id: activePreset.id,
          name: activePreset.name,
          description: activePreset.description,
          schedule_type: activePreset.schedule_type,
          daily_start_time: activePreset.daily_start_time,
          daily_end_time: activePreset.daily_end_time
        } : null,
        totalCategories: customerCategories.length,
        totalItems: customerCategories.reduce((sum, cat) => sum + cat.items.length, 0),
        lastUpdated: new Date().toISOString()
      }
    };

  } catch (error) {
    console.error('Customer menu service error:', error);
    throw new Error(`Failed to get customer menu: ${error.message}`);
  }
}

/**
 * Get branch information for customers
 */
async function getBranchInfo(branchId) {
  try {
    const { data: branchData, error } = await supabase
      .from('branches')
      .select(`
        id,
        name,
        address,
        phone,
        email,
        website,
        description,
        opening_hours,
        branch_settings (
          order_flow_type,
          auto_ready_enabled,
          base_delay_minutes,
          delivery_delay_minutes
        )
      `)
      .eq('id', branchId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        throw new Error('Branch not found');
      }
      throw new Error(`Failed to fetch branch info: ${error.message}`);
    }

    return {
      id: branchData.id,
      name: branchData.name,
      address: branchData.address,
      phone: branchData.phone,
      email: branchData.email,
      website: branchData.website,
      description: branchData.description,
      opening_hours: branchData.opening_hours,
      order_settings: branchData.branch_settings ? {
        auto_ready_enabled: branchData.branch_settings.auto_ready_enabled,
        estimated_prep_time: branchData.branch_settings.base_delay_minutes || 20,
        estimated_delivery_time: branchData.branch_settings.delivery_delay_minutes || 15
      } : null
    };

  } catch (error) {
    console.error('Branch info service error:', error);
    throw error;
  }
}

module.exports = {
  getCustomerMenu,
  getBranchInfo
};