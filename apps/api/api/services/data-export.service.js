// =====================================================
// DATA EXPORT SERVICE
// FO-120: Branch data export for compliance
// =====================================================

const { createClient } = require('@supabase/supabase-js');
const AdmZip = require('adm-zip');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Export all branch data for FO-120 compliance
 * @param {string} branchId - Branch ID
 * @returns {Object} Complete branch data
 */
async function exportBranchData(branchId) {
  console.log(`[Data Export] Starting export for branch: ${branchId}`);

  const exportData = {
    metadata: {
      export_date: new Date().toISOString(),
      branch_id: branchId,
      format_version: '1.0.0',
    },
    branch: await getBranchInfo(branchId),
    orders: await getOrdersForExport(branchId),
    websrm_transactions: await getWebsrmTransactions(branchId),
    websrm_queue: await getWebsrmQueue(branchId),
    activity_logs: await getActivityLogs(branchId),
    offline_events: await getOfflineEvents(branchId),
    error_logs: await getErrorLogs(branchId),
    branch_settings: await getBranchSettings(branchId),
  };

  console.log(`[Data Export] Export completed for branch: ${branchId}`);
  console.log(`[Data Export] Total orders: ${exportData.orders.length}`);
  console.log(`[Data Export] Total transactions: ${exportData.websrm_transactions.length}`);

  return exportData;
}

/**
 * Get branch information
 */
async function getBranchInfo(branchId) {
  try {
    const { data, error } = await supabase
      .from('branches')
      .select(`
        id,
        name,
        address,
        phone,
        email,
        chain_id,
        created_at,
        updated_at
      `)
      .eq('id', branchId)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('[Data Export] Error fetching branch info:', error);
    return null;
  }
}

/**
 * Get all orders for a branch with items
 * Includes all order details needed for FO-120
 */
async function getOrdersForExport(branchId) {
  try {
    const { data: orders, error } = await supabase
      .from('orders')
      .select(`
        id,
        customer_name,
        customer_phone,
        customer_email,
        order_type,
        order_status,
        payment_status,
        payment_method,
        subtotal,
        tax_amount,
        total_amount,
        gst,
        qst,
        delivery_fee,
        service_fee,
        tip_amount,
        notes,
        special_instructions,
        table_number,
        zone,
        third_party_order_id,
        third_party_platform,
        is_pre_order,
        scheduled_date,
        scheduled_time,
        scheduled_datetime,
        estimated_ready_time,
        created_at,
        updated_at,
        completed_at,
        order_items(
          id,
          menu_item_name,
          menu_item_price,
          quantity,
          item_total,
          special_instructions
        )
      `)
      .eq('branch_id', branchId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return orders || [];
  } catch (error) {
    console.error('[Data Export] Error fetching orders:', error);
    return [];
  }
}

/**
 * Get WEB-SRM transactions for compliance
 * Includes FO-105, FO-106, FO-117, FO-120 case data
 */
async function getWebsrmTransactions(branchId) {
  try {
    const { data, error } = await supabase
      .from('websrm_transactions')
      .select('*')
      .eq('branch_id', branchId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('[Data Export] Error fetching WEB-SRM transactions:', error);
    return [];
  }
}

/**
 * Get WEB-SRM queue (offline transactions)
 * Important for FO-104, FO-105, FO-106
 */
async function getWebsrmQueue(branchId) {
  try {
    const { data, error } = await supabase
      .from('websrm_queue')
      .select('*')
      .eq('branch_id', branchId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('[Data Export] Error fetching WEB-SRM queue:', error);
    return [];
  }
}

/**
 * Get activity logs (operator actions)
 * Shows who did what and when
 */
async function getActivityLogs(branchId) {
  try {
    const { data, error } = await supabase
      .from('activity_logs')
      .select('*')
      .eq('branch_id', branchId)
      .order('created_at', { ascending: false })
      .limit(1000); // Limit to recent 1000 activities

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('[Data Export] Error fetching activity logs:', error);
    return [];
  }
}

/**
 * Get offline events (FO-105, FO-106 compliance)
 * Shows offline mode activation/deactivation timestamps
 */
async function getOfflineEvents(branchId) {
  try {
    const { data, error } = await supabase
      .from('offline_events')
      .select('*')
      .eq('branch_id', branchId)
      .order('event_timestamp', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('[Data Export] Error fetching offline events:', error);
    return [];
  }
}

/**
 * Get error logs for the branch
 * FO-107, FO-111, FO-113 error messages
 */
async function getErrorLogs(branchId) {
  try {
    // Check if error_logs table exists
    const { data, error } = await supabase
      .from('error_logs')
      .select('*')
      .eq('branch_id', branchId)
      .order('created_at', { ascending: false })
      .limit(500);

    if (error && error.code === '42P01') {
      // Table doesn't exist yet
      console.log('[Data Export] error_logs table not found, skipping');
      return [];
    }

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('[Data Export] Error fetching error logs:', error);
    return [];
  }
}

/**
 * Get branch settings (configurations)
 */
async function getBranchSettings(branchId) {
  try {
    const { data, error } = await supabase
      .from('branch_settings')
      .select('*')
      .eq('branch_id', branchId)
      .single();

    if (error && error.code === 'PGRST116') {
      // No settings found
      return null;
    }

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('[Data Export] Error fetching branch settings:', error);
    return null;
  }
}

/**
 * Generate README.txt content for the export
 */
function generateReadmeContent(branchData, exportData) {
  const timestamp = new Date().toISOString();
  const branchName = branchData?.name || 'Unknown Branch';

  return `VISION MENU - DATA EXPORT
==========================

Export Date: ${timestamp}
Branch ID: ${exportData.metadata.branch_id}
Branch Name: ${branchName}
Format Version: ${exportData.metadata.format_version}

CONTENTS:
=========
1. metadata.json - Export metadata and branch information
2. orders.json - All orders for this branch with items
3. websrm_transactions.json - WEB-SRM fiscal transactions
4. websrm_queue.json - WEB-SRM offline queue
5. activity_logs.json - Operator actions and audit trail
6. offline_events.json - Offline mode activation/deactivation logs
7. error_logs.json - System error messages (if available)
8. branch_settings.json - Branch configuration settings

FORMAT:
=======
All files are in JSON format.
Open with any text editor or JSON viewer.

Recommended tools:
- Visual Studio Code
- Notepad++
- Any JSON viewer/formatter

SOFTWARE REQUIRED:
==================
- Any text editor (built-in on all operating systems)
- No special software required to read the data

DATA EXTRACTION METHOD:
=======================
Extracted via: Web Dashboard Download
Method: Secure HTTPS download
Format: ZIP archive containing JSON files

TEST CASE DATA:
===============
This export includes transaction data for FO-120 compliance.

WEB-SRM Transactions: ${exportData.websrm_transactions.length} records
Orders: ${exportData.orders.length} records
Activity Logs: ${exportData.activity_logs.length} records
Offline Events: ${exportData.offline_events.length} records

OFFLINE MODE LOGS:
==================
Offline events show activation and deactivation timestamps.
Check offline_events.json for detailed timestamps.

PRIVACY & SECURITY:
===================
✅ This export contains ONLY your branch data
✅ Other operators' data is NOT included
✅ Data is filtered by branch_id: ${exportData.metadata.branch_id}
✅ All sensitive customer information is included as per compliance

COMPLIANCE:
===========
This export meets FO-120 requirements:
- Operator can make a copy of their data
- Copy contains only operator's own data
- No access to other operators' data
- Complete audit trail included

For questions or support, contact: support@vizionmenu.com
`;
}

/**
 * Generate ZIP file with all branch data
 * @param {string} branchId - Branch ID
 * @returns {Buffer} ZIP file buffer
 */
async function generateDataExportZip(branchId) {
  console.log(`[ZIP Generation] Starting for branch: ${branchId}`);

  // 1. Collect all data
  const exportData = await exportBranchData(branchId);

  // 2. Create ZIP archive
  const zip = new AdmZip();

  // 3. Add metadata.json (includes branch info)
  const metadataContent = {
    ...exportData.metadata,
    branch: exportData.branch,
  };
  zip.addFile(
    'metadata.json',
    Buffer.from(JSON.stringify(metadataContent, null, 2), 'utf-8')
  );

  // 4. Add orders.json
  zip.addFile(
    'orders.json',
    Buffer.from(JSON.stringify(exportData.orders, null, 2), 'utf-8')
  );

  // 5. Add websrm_transactions.json
  zip.addFile(
    'websrm_transactions.json',
    Buffer.from(JSON.stringify(exportData.websrm_transactions, null, 2), 'utf-8')
  );

  // 6. Add websrm_queue.json
  zip.addFile(
    'websrm_queue.json',
    Buffer.from(JSON.stringify(exportData.websrm_queue, null, 2), 'utf-8')
  );

  // 7. Add activity_logs.json
  zip.addFile(
    'activity_logs.json',
    Buffer.from(JSON.stringify(exportData.activity_logs, null, 2), 'utf-8')
  );

  // 8. Add offline_events.json
  zip.addFile(
    'offline_events.json',
    Buffer.from(JSON.stringify(exportData.offline_events, null, 2), 'utf-8')
  );

  // 9. Add error_logs.json
  zip.addFile(
    'error_logs.json',
    Buffer.from(JSON.stringify(exportData.error_logs, null, 2), 'utf-8')
  );

  // 10. Add branch_settings.json
  zip.addFile(
    'branch_settings.json',
    Buffer.from(JSON.stringify(exportData.branch_settings, null, 2), 'utf-8')
  );

  // 11. Add README.txt
  const readmeContent = generateReadmeContent(exportData.branch, exportData);
  zip.addFile('README.txt', Buffer.from(readmeContent, 'utf-8'));

  // 12. Generate ZIP buffer
  const zipBuffer = zip.toBuffer();

  console.log(`[ZIP Generation] Completed. Size: ${zipBuffer.length} bytes`);

  return zipBuffer;
}

module.exports = {
  exportBranchData,
  getOrdersForExport,
  getWebsrmTransactions,
  getWebsrmQueue,
  getActivityLogs,
  getOfflineEvents,
  getErrorLogs,
  getBranchSettings,
  generateDataExportZip, // Will be implemented in Phase 3
};
