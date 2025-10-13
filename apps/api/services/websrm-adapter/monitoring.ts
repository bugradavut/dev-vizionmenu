/**
 * WEB-SRM Monitoring & Metrics Logger - Phase 9
 *
 * Purpose: Basic operational metrics for WEB-SRM queue and circuit breaker
 * Security: NO PII, aggregated data only
 * Output: Console logs + webhook placeholder (future)
 *
 * Features:
 * - Queue status (pending/processing/completed/failed counts)
 * - Circuit breaker state monitoring
 * - Error distribution (cod_retour breakdown)
 * - QR overflow detection (>2048 chars)
 */

import { createClient } from '@supabase/supabase-js';

// Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export interface QueueMetrics {
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  total: number;
  timestamp: string;
}

export interface CircuitBreakerMetrics {
  key: string;
  state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
  consecutiveFailures: number;
  openedAt: string | null;
  timestamp: string;
}

export interface ErrorDistribution {
  errorCode: string;
  count: number;
  percentage: number;
}

/**
 * Get queue status metrics
 *
 * @param tenantId - Optional tenant filter (default: all tenants)
 * @returns Queue metrics by status
 */
export async function logQueueMetrics(tenantId?: string): Promise<QueueMetrics> {
  const query = supabase
    .from('websrm_transaction_queue')
    .select('status', { count: 'exact' });

  if (tenantId) {
    query.eq('tenant_id', tenantId);
  }

  const { data, count, error } = await query;

  if (error) {
    console.error('[WEB-SRM Monitoring] Failed to fetch queue metrics:', error.message);
    return {
      pending: 0,
      processing: 0,
      completed: 0,
      failed: 0,
      total: 0,
      timestamp: new Date().toISOString(),
    };
  }

  // Count by status
  const metrics = {
    pending: 0,
    processing: 0,
    completed: 0,
    failed: 0,
    total: count || 0,
    timestamp: new Date().toISOString(),
  };

  if (data) {
    for (const row of data) {
      if (row.status === 'pending') metrics.pending++;
      if (row.status === 'processing') metrics.processing++;
      if (row.status === 'completed') metrics.completed++;
      if (row.status === 'failed') metrics.failed++;
    }
  }

  console.info('[WEB-SRM Monitoring] Queue Metrics:', {
    tenant: tenantId || 'all',
    ...metrics,
  });

  return metrics;
}

/**
 * Get circuit breaker state for all environments
 *
 * @returns Array of circuit breaker states
 */
export async function logCircuitBreakerState(): Promise<CircuitBreakerMetrics[]> {
  const { data, error } = await supabase
    .from('websrm_circuit_breaker')
    .select('*')
    .order('key', { ascending: true });

  if (error) {
    console.error('[WEB-SRM Monitoring] Failed to fetch CB state:', error.message);
    return [];
  }

  const metrics: CircuitBreakerMetrics[] = (data || []).map((row) => ({
    key: row.key,
    state: row.state,
    consecutiveFailures: row.consecutive_failures,
    openedAt: row.opened_at,
    timestamp: new Date().toISOString(),
  }));

  console.info('[WEB-SRM Monitoring] Circuit Breaker State:', metrics);

  // Alert on OPEN circuits
  const openCircuits = metrics.filter((m) => m.state === 'OPEN');
  if (openCircuits.length > 0) {
    console.warn('[WEB-SRM Monitoring] ALERT: Circuit breaker(s) OPEN:', openCircuits);
    // TODO: Send webhook/notification
    // await sendWebhookAlert('CIRCUIT_BREAKER_OPEN', openCircuits);
  }

  return metrics;
}

/**
 * Get error distribution from audit log
 *
 * @param hours - Hours to look back (default: 24)
 * @param tenantId - Optional tenant filter
 * @returns Error distribution by cod_retour
 */
export async function logErrorDistribution(
  hours: number = 24,
  tenantId?: string
): Promise<ErrorDistribution[]> {
  const sinceTimestamp = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

  let query = supabase
    .from('websrm_audit_log')
    .select('error_code, cod_retour')
    .gte('created_at', sinceTimestamp)
    .not('error_code', 'is', null);

  if (tenantId) {
    query = query.eq('tenant_id', tenantId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('[WEB-SRM Monitoring] Failed to fetch error distribution:', error.message);
    return [];
  }

  // Count errors by cod_retour
  const errorCounts = new Map<string, number>();
  let totalErrors = 0;

  if (data) {
    for (const row of data) {
      const code = row.cod_retour || row.error_code || 'UNKNOWN';
      errorCounts.set(code, (errorCounts.get(code) || 0) + 1);
      totalErrors++;
    }
  }

  // Convert to distribution
  const distribution: ErrorDistribution[] = Array.from(errorCounts.entries())
    .map(([code, count]) => ({
      errorCode: code,
      count,
      percentage: totalErrors > 0 ? Math.round((count / totalErrors) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count); // Sort by count DESC

  console.info('[WEB-SRM Monitoring] Error Distribution (last ${hours}h):', {
    tenant: tenantId || 'all',
    totalErrors,
    distribution,
  });

  return distribution;
}

/**
 * Check for QR code overflows (>2048 chars)
 *
 * @param hours - Hours to look back (default: 24)
 * @returns Count of overflow receipts
 */
export async function checkQrOverflow(hours: number = 24): Promise<number> {
  const sinceTimestamp = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from('receipts')
    .select('id, qr_data')
    .gte('created_at', sinceTimestamp)
    .not('qr_data', 'is', null);

  if (error) {
    console.error('[WEB-SRM Monitoring] Failed to check QR overflow:', error.message);
    return 0;
  }

  const overflowCount = (data || []).filter(
    (row) => row.qr_data && row.qr_data.length > 2048
  ).length;

  if (overflowCount > 0) {
    console.warn(`[WEB-SRM Monitoring] ALERT: ${overflowCount} QR codes exceed 2048 chars`);
    // TODO: Send webhook/notification
    // await sendWebhookAlert('QR_OVERFLOW', { count: overflowCount, hours });
  } else {
    console.info(`[WEB-SRM Monitoring] QR check OK: 0 overflows (last ${hours}h)`);
  }

  return overflowCount;
}

/**
 * Run all monitoring checks
 *
 * @param options - Monitoring options
 * @returns Summary of all metrics
 */
export async function runMonitoringChecks(options?: {
  tenantId?: string;
  hours?: number;
}): Promise<{
  queue: QueueMetrics;
  circuitBreaker: CircuitBreakerMetrics[];
  errors: ErrorDistribution[];
  qrOverflow: number;
}> {
  console.info('[WEB-SRM Monitoring] Running monitoring checks...');

  const [queue, circuitBreaker, errors, qrOverflow] = await Promise.all([
    logQueueMetrics(options?.tenantId),
    logCircuitBreakerState(),
    logErrorDistribution(options?.hours, options?.tenantId),
    checkQrOverflow(options?.hours),
  ]);

  return {
    queue,
    circuitBreaker,
    errors,
    qrOverflow,
  };
}

/**
 * Webhook placeholder for alerts
 * TODO: Implement webhook integration (Slack, PagerDuty, etc.)
 *
 * @param alertType - Type of alert
 * @param payload - Alert payload
 */
async function sendWebhookAlert(alertType: string, payload: any): Promise<void> {
  // Placeholder for webhook integration
  console.warn('[WEB-SRM Monitoring] Webhook alert triggered:', {
    alertType,
    payload,
    webhook_url: process.env.WEBSRM_ALERT_WEBHOOK_URL || 'NOT_CONFIGURED',
  });

  // TODO: Implement actual webhook POST
  // if (process.env.WEBSRM_ALERT_WEBHOOK_URL) {
  //   await fetch(process.env.WEBSRM_ALERT_WEBHOOK_URL, {
  //     method: 'POST',
  //     headers: { 'Content-Type': 'application/json' },
  //     body: JSON.stringify({ alertType, payload, timestamp: new Date().toISOString() }),
  //   });
  // }
}
