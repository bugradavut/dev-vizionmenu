/**
 * WEB-SRM ESSAI Monitoring & Status
 *
 * Purpose: Display queue metrics, CB state, QR overflow check
 *
 * Usage:
 *   pnpm websrm:monitor
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function getMonitoringSnapshot() {
  console.log('📊 WEB-SRM ESSAI Monitoring Snapshot\n');
  console.log(`Environment: ${process.env.WEBSRM_ENV || 'NOT SET'}`);
  console.log(`Network Enabled: ${process.env.WEBSRM_NETWORK_ENABLED || 'false'}`);
  console.log(`DB Write: ${process.env.WEBSRM_DB_ALLOW_WRITE || 'false'}\n`);

  // 1. Queue Metrics
  console.log('🔄 Queue Status:');
  const { data: queueItems } = await supabase
    .from('websrm_queue')
    .select('status, created_at')
    .order('created_at', { ascending: false })
    .limit(100);

  if (queueItems) {
    const stats = {
      pending: queueItems.filter(i => i.status === 'pending').length,
      processing: queueItems.filter(i => i.status === 'processing').length,
      completed: queueItems.filter(i => i.status === 'completed').length,
      failed: queueItems.filter(i => i.status === 'failed').length,
    };
    console.log(`  Pending: ${stats.pending}`);
    console.log(`  Processing: ${stats.processing}`);
    console.log(`  Completed: ${stats.completed}`);
    console.log(`  Failed: ${stats.failed}`);
  }

  // 2. Circuit Breaker State
  console.log('\n⚡ Circuit Breaker State:');
  const { data: cbStates } = await supabase
    .from('circuit_breaker_state')
    .select('*')
    .order('updated_at', { ascending: false })
    .limit(10);

  if (cbStates && cbStates.length > 0) {
    cbStates.forEach(cb => {
      console.log(`  Key: ${cb.key}`);
      console.log(`  State: ${cb.state.toUpperCase()}`);
      console.log(`  Failures: ${cb.consecutive_failures || 0}`);
      console.log(`  Last Update: ${cb.updated_at}`);
      console.log('');
    });
  } else {
    console.log('  No circuit breaker records found (expected if no failures)');
  }

  // 3. Recent Audit Logs
  console.log('\n📝 Recent Audit Logs (last 5):');
  const { data: auditLogs } = await supabase
    .from('websrm_audit_log')
    .select('order_id, cod_retour, id_trans, created_at')
    .order('created_at', { ascending: false })
    .limit(5);

  if (auditLogs && auditLogs.length > 0) {
    auditLogs.forEach(log => {
      console.log(`  Order: ${log.order_id}`);
      console.log(`  Response: ${log.cod_retour || 'N/A'}`);
      console.log(`  Trans ID: ${log.id_trans || 'N/A'}`);
      console.log(`  Time: ${log.created_at}`);
      console.log('');
    });
  } else {
    console.log('  No audit logs found');
  }

  // 4. QR Overflow Check (receipts with QR > 2048)
  console.log('\n🔍 QR Overflow Check:');
  const { data: receipts } = await supabase
    .from('websrm_receipts')
    .select('order_id, qr_code, created_at')
    .order('created_at', { ascending: false })
    .limit(100);

  if (receipts && receipts.length > 0) {
    const overflowReceipts = receipts.filter(r => r.qr_code && r.qr_code.length > 2048);
    if (overflowReceipts.length > 0) {
      console.log(`  ❌ ALERT: ${overflowReceipts.length} receipts exceed QR limit (2048 chars)`);
      overflowReceipts.forEach(r => {
        console.log(`    Order: ${r.order_id}, QR Length: ${r.qr_code.length}`);
      });
    } else {
      console.log(`  ✅ All ${receipts.length} receipts within QR limit`);
    }
  } else {
    console.log('  No receipts found');
  }

  console.log('\n✅ Monitoring snapshot complete\n');
}

getMonitoringSnapshot().catch(err => {
  console.error('❌ Monitoring failed:', err.message);
  process.exit(1);
});
