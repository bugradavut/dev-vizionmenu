// =====================================================
// DASHBOARD SERVICE
// Dashboard statistics and analytics for branch managers
// =====================================================

const { createClient } = require('@supabase/supabase-js');

// Create Supabase client with service_role key (bypasses RLS)
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Get dashboard statistics for a specific branch
 * @param {string} branchId - Branch ID
 * @returns {Promise<Object>} Dashboard stats
 */
const getBranchDashboardStats = async (branchId) => {
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const yesterdayStr = new Date(today.getTime() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  // Get last 7 days for sparklines
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(today);
    date.setDate(date.getDate() - (6 - i));
    return date.toISOString().split('T')[0];
  });

  try {
    const [
      todaySalesResult,
      yesterdaySalesResult,
      todayOrdersResult,
      yesterdayOrdersResult,
      pendingOrdersResult,
      couponsResult,
      expiringCouponsResult,
      menuItemsResult,
      unavailableItemsResult
    ] = await Promise.all([
      // Today's sales - use order_status and payment_status (succeeded = paid via Stripe)
      supabase
        .from('orders')
        .select('total_amount')
        .eq('branch_id', branchId)
        .gte('created_at', `${todayStr}T00:00:00`)
        .lte('created_at', `${todayStr}T23:59:59`)
        .in('payment_status', ['paid', 'succeeded', 'pending']),

      // Yesterday's sales (for comparison)
      supabase
        .from('orders')
        .select('total_amount')
        .eq('branch_id', branchId)
        .gte('created_at', `${yesterdayStr}T00:00:00`)
        .lte('created_at', `${yesterdayStr}T23:59:59`)
        .in('payment_status', ['paid', 'succeeded', 'pending']),

      // Today's orders count
      supabase
        .from('orders')
        .select('id', { count: 'exact', head: true })
        .eq('branch_id', branchId)
        .gte('created_at', `${todayStr}T00:00:00`)
        .lte('created_at', `${todayStr}T23:59:59`),

      // Yesterday's orders count
      supabase
        .from('orders')
        .select('id', { count: 'exact', head: true })
        .eq('branch_id', branchId)
        .gte('created_at', `${yesterdayStr}T00:00:00`)
        .lte('created_at', `${yesterdayStr}T23:59:59`),

      // Pending/preparing orders - use order_status column
      supabase
        .from('orders')
        .select('id', { count: 'exact', head: true })
        .eq('branch_id', branchId)
        .in('order_status', ['pending', 'preparing', 'scheduled']),

      // Active coupons
      supabase
        .from('coupons')
        .select('id', { count: 'exact', head: true })
        .eq('branch_id', branchId)
        .eq('is_active', true)
        .lte('valid_from', new Date().toISOString())
        .gte('valid_until', new Date().toISOString()),

      // Expiring coupons (within 7 days)
      supabase
        .from('coupons')
        .select('id', { count: 'exact', head: true })
        .eq('branch_id', branchId)
        .eq('is_active', true)
        .lte('valid_until', new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString())
        .gte('valid_until', new Date().toISOString()),

      // Total menu items
      supabase
        .from('menu_items')
        .select('id', { count: 'exact', head: true })
        .eq('branch_id', branchId),

      // Unavailable menu items
      supabase
        .from('menu_items')
        .select('id', { count: 'exact', head: true })
        .eq('branch_id', branchId)
        .eq('is_available', false)
    ]);

    // Get sparkline data
    const [salesSparkline, ordersSparkline] = await Promise.all([
      getSalesSparkline(branchId, last7Days),
      getOrdersSparkline(branchId, last7Days)
    ]);

    // Calculate totals
    const todaySalesTotal = todaySalesResult.data?.reduce((sum, order) => sum + Number(order.total_amount || 0), 0) || 0;
    const yesterdaySalesTotal = yesterdaySalesResult.data?.reduce((sum, order) => sum + Number(order.total_amount || 0), 0) || 0;

    const todayOrdersCount = todayOrdersResult.count || 0;
    const yesterdayOrdersCount = yesterdayOrdersResult.count || 0;

    // Calculate change percentages
    const salesChangePercent = yesterdaySalesTotal > 0
      ? ((todaySalesTotal - yesterdaySalesTotal) / yesterdaySalesTotal) * 100
      : todaySalesTotal > 0 ? 100 : 0;

    const ordersChangePercent = yesterdayOrdersCount > 0
      ? ((todayOrdersCount - yesterdayOrdersCount) / yesterdayOrdersCount) * 100
      : todayOrdersCount > 0 ? 100 : 0;

    return {
      todaySales: {
        total: todaySalesTotal,
        changePercent: salesChangePercent,
        sparkline: salesSparkline
      },
      newOrders: {
        count: todayOrdersCount,
        changePercent: ordersChangePercent,
        pendingCount: pendingOrdersResult.count || 0,
        sparkline: ordersSparkline
      },
      activeCoupons: {
        count: couponsResult.count || 0,
        expiringCount: expiringCouponsResult.count || 0,
        changePercent: 0,
        sparkline: []
      },
      menuItems: {
        total: menuItemsResult.count || 0,
        unavailable: unavailableItemsResult.count || 0,
        changePercent: 0,
        sparkline: []
      }
    };
  } catch (error) {
    throw error;
  }
};

/**
 * Get sales sparkline data for last N days
 * @param {string} branchId - Branch ID
 * @param {string[]} dates - Array of date strings
 * @returns {Promise<Array<{value: number}>>}
 */
const getSalesSparkline = async (branchId, dates) => {
  const results = [];

  for (const date of dates) {
    const { data } = await supabase
      .from('orders')
      .select('total_amount')
      .eq('branch_id', branchId)
      .gte('created_at', `${date}T00:00:00`)
      .lte('created_at', `${date}T23:59:59`)
      .in('payment_status', ['paid', 'succeeded', 'pending']);

    const total = data?.reduce((sum, order) => sum + Number(order.total_amount || 0), 0) || 0;
    results.push({ value: total });
  }

  return results;
};

/**
 * Get sales chart data with dates for last 7 days
 * @param {string} branchId - Branch ID
 * @returns {Promise<Array<{date: string, sales: number, label: string}>>}
 */
const getSalesChartData = async (branchId) => {
  const today = new Date();
  const results = [];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  for (let i = 6; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    const dayName = dayNames[date.getDay()];

    const { data } = await supabase
      .from('orders')
      .select('total_amount')
      .eq('branch_id', branchId)
      .gte('created_at', `${dateStr}T00:00:00`)
      .lte('created_at', `${dateStr}T23:59:59`)
      .in('payment_status', ['paid', 'succeeded', 'pending']);

    const total = data?.reduce((sum, order) => sum + Number(order.total_amount || 0), 0) || 0;
    results.push({
      date: dateStr,
      sales: total,
      label: dayName
    });
  }

  return results;
};

/**
 * Get previous week sales total (days 8-14 ago) for week-over-week comparison
 * @param {string} branchId - Branch ID
 * @returns {Promise<number>} Previous week total sales
 */
const getPreviousWeekSalesTotal = async (branchId) => {
  const today = new Date();
  let total = 0;

  // Calculate sales for days 8-14 ago (previous week)
  for (let i = 13; i >= 7; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];

    const { data } = await supabase
      .from('orders')
      .select('total_amount')
      .eq('branch_id', branchId)
      .gte('created_at', `${dateStr}T00:00:00`)
      .lte('created_at', `${dateStr}T23:59:59`)
      .in('payment_status', ['paid', 'succeeded', 'pending']);

    const dayTotal = data?.reduce((sum, order) => sum + Number(order.total_amount || 0), 0) || 0;
    total += dayTotal;
  }

  return total;
};

/**
 * Get orders sparkline data for last N days
 * @param {string} branchId - Branch ID
 * @param {string[]} dates - Array of date strings
 * @returns {Promise<Array<{value: number}>>}
 */
const getOrdersSparkline = async (branchId, dates) => {
  const results = [];

  for (const date of dates) {
    const { count } = await supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('branch_id', branchId)
      .gte('created_at', `${date}T00:00:00`)
      .lte('created_at', `${date}T23:59:59`);

    results.push({ value: count || 0 });
  }

  return results;
};

/**
 * Get order sources breakdown for last 7 days
 * @param {string} branchId - Branch ID
 * @returns {Promise<{data: Array<{source: string, count: number, label: string}>, totalOrders: number}>}
 */
const getOrderSourcesData = async (branchId) => {
  const today = new Date();
  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const { data, error } = await supabase
    .from('orders')
    .select('order_source')
    .eq('branch_id', branchId)
    .gte('created_at', sevenDaysAgo.toISOString())
    .in('payment_status', ['paid', 'succeeded', 'pending']);

  if (error) {
    return { data: [], totalOrders: 0 };
  }

  // Count by source
  const sourceCounts = {};
  data?.forEach(order => {
    const source = order.order_source || 'other';
    sourceCounts[source] = (sourceCounts[source] || 0) + 1;
  });

  // Convert to array format
  const sourceLabels = {
    website: 'Website',
    qr_menu: 'QR Menu',
    counter: 'Counter',
    phone: 'Phone',
    app: 'Mobile App',
    other: 'Other'
  };

  const result = Object.entries(sourceCounts).map(([source, count]) => ({
    source,
    count,
    label: sourceLabels[source] || source
  }));

  // Sort by count descending
  result.sort((a, b) => b.count - a.count);

  return {
    data: result,
    totalOrders: data?.length || 0
  };
};

/**
 * Get team members for a branch
 * @param {string} branchId - Branch ID
 * @returns {Promise<Array<{id: string, name: string, email: string, role: string, avatar_url: string}>>}
 */
const getTeamMembers = async (branchId) => {
  const { data, error } = await supabase
    .from('branch_users')
    .select(`
      id,
      role,
      users:user_id (
        id,
        email,
        full_name,
        avatar_url
      )
    `)
    .eq('branch_id', branchId)
    .eq('is_active', true)
    .order('role', { ascending: true });

  if (error) {
    return [];
  }

  return data?.map(item => ({
    id: item.users?.id || item.id,
    name: item.users?.full_name || 'Unknown User',
    email: item.users?.email || '',
    role: item.role,
    avatar_url: item.users?.avatar_url || null
  })) || [];
};

/**
 * Get recent orders for a branch (last 7 days, limit 10)
 * @param {string} branchId - Branch ID
 * @returns {Promise<Array<{id: string, order_number: string, customer_name: string, customer_email: string, total_amount: number, payment_status: string, created_at: string}>>}
 */
const getRecentOrders = async (branchId) => {
  const today = new Date();
  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const { data, error } = await supabase
    .from('orders')
    .select('id, customer_name, customer_email, total_amount, payment_status, created_at')
    .eq('branch_id', branchId)
    .gte('created_at', sevenDaysAgo.toISOString())
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) {
    return [];
  }

  return data || [];
};

/**
 * Get popular items for a branch (last 7 days, top 10)
 * @param {string} branchId - Branch ID
 * @returns {Promise<Array<{id: string, name: string, category: string, total_quantity: number, total_revenue: number, image_url: string}>>}
 */
const getPopularItems = async (branchId) => {
  const today = new Date();
  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const { data, error } = await supabase.rpc('get_popular_items', {
    p_branch_id: branchId,
    p_start_date: sevenDaysAgo.toISOString(),
    p_end_date: today.toISOString(),
    p_limit: 10
  });

  if (error) {
    // Fallback: manual aggregation if RPC doesn't exist
    // Note: order_items.menu_item_id is NULL, so we use menu_item_name instead
    const { data: orderItems, error: fallbackError } = await supabase
      .from('order_items')
      .select(`
        quantity,
        item_total,
        menu_item_name,
        orders!inner (*)
      `)
      .eq('orders.branch_id', branchId)
      .gte('orders.created_at', sevenDaysAgo.toISOString())
      .in('orders.payment_status', ['paid', 'succeeded', 'pending']);

    if (fallbackError) {
      return [];
    }

    // Group and aggregate manually by name
    const itemsMap = {};
    orderItems?.forEach(item => {
      const itemName = item.menu_item_name;
      if (!itemName) return;

      if (!itemsMap[itemName]) {
        itemsMap[itemName] = {
          id: itemName, // Use name as ID since we don't have menu_item_id
          name: itemName,
          image_url: null, // Will lookup later
          total_quantity: 0,
          total_revenue: 0
        };
      }

      itemsMap[itemName].total_quantity += item.quantity || 0;
      itemsMap[itemName].total_revenue += Number(item.item_total || 0);
    });

    // Convert to array and sort by quantity
    const result = Object.values(itemsMap)
      .sort((a, b) => b.total_quantity - a.total_quantity)
      .slice(0, 10);

    // Lookup image URLs from menu_items by name (best effort)
    if (result.length > 0) {
      const itemNames = result.map(item => item.name);
      const { data: menuItems } = await supabase
        .from('menu_items')
        .select('name, image_url')
        .eq('branch_id', branchId)
        .in('name', itemNames);

      // Map image URLs to results
      if (menuItems) {
        const imageMap = {};
        menuItems.forEach(mi => {
          imageMap[mi.name] = mi.image_url;
        });

        result.forEach(item => {
          if (imageMap[item.name]) {
            item.image_url = imageMap[item.name];
          }
        });
      }
    }

    return result;
  }

  return data || [];
};

module.exports = {
  getBranchDashboardStats,
  getSalesSparkline,
  getOrdersSparkline,
  getSalesChartData,
  getPreviousWeekSalesTotal,
  getOrderSourcesData,
  getTeamMembers,
  getRecentOrders,
  getPopularItems
};
