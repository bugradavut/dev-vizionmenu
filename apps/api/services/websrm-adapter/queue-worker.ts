/**
 * WEB-SRM Queue Worker - Phase 7 + Phase 8
 *
 * Purpose: Process websrm_transaction_queue asynchronously
 * Features:
 * - Pending → Processing → Completed/Failed state transitions
 * - Exponential backoff for retryable errors
 * - Idempotency key generation and deduplication
 * - Signature chain (previousActu from last completed receipt)
 * - Audit logging (request/response hashes, cod_retour, duration)
 * - Concurrency limiting (max 5 parallel - Phase 8)
 * - Circuit breaker (5 consecutive TEMP_UNAVAILABLE - Phase 8)
 *
 * Security:
 * - NO PII in logs
 * - Production hard block
 * - Network controlled by WEBSRM_NETWORK_ENABLED flag
 */

import { createClient } from '@supabase/supabase-js';
import { createHash } from 'crypto';
import pLimit from 'p-limit';
import {
  postTransaction,
  generateIdempotencyKey,
  isNetworkEnabled,
  getWebSrmBaseUrl,
  WebSrmResponse,
} from './websrm-client';
import { mapWebSrmError, calculateBackoff } from './error-mapper';
import { handleOrderForWebSrm, handleClosingForWebSrm } from './runtime-adapter';
import { resolveProfile, ComplianceProfile } from './profile-resolver';

// Supabase client (sandbox or production based on ENV)
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Circuit breaker configuration
const CIRCUIT_BREAKER_THRESHOLD = 5; // 5 consecutive TEMP_UNAVAILABLE errors
const CIRCUIT_BREAKER_TIMEOUT = 60000; // 1 minute cooldown

/**
 * Get circuit breaker key for current environment and tenant
 * Format: '<env>:<tenantId>:transaction' (e.g., 'essai:tenant-123:transaction')
 *
 * Phase 9.1: Changed from env-only to tenant-aware to prevent one tenant's
 * circuit breaker from blocking all tenants in the same environment.
 *
 * @param tenantId - Optional tenant ID (defaults to 'global')
 */
function getCircuitBreakerKey(tenantId?: string): string {
  const env = (process.env.WEBSRM_ENV || 'dev').toLowerCase();
  const tenant = tenantId || 'global';
  return `${env}:${tenant}:transaction`;
}

/**
 * Get circuit breaker state from database
 * Phase 9: DB-backed shared state (replaces in-memory)
 * Phase 9.1: Tenant-aware
 *
 * @param tenantId - Tenant ID for scoped CB
 */
async function getCircuitBreakerState(tenantId?: string): Promise<{
  consecutiveFailures: number;
  state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
  openedAt: Date | null;
}> {
  const key = getCircuitBreakerKey(tenantId);

  const { data, error } = await supabase
    .from('websrm_circuit_breaker')
    .select('*')
    .eq('key', key)
    .single();

  if (error || !data) {
    // Circuit breaker entry doesn't exist - create it
    await supabase
      .from('websrm_circuit_breaker')
      .insert({
        key,
        consecutive_failures: 0,
        state: 'CLOSED',
      })
      .select()
      .single();

    return {
      consecutiveFailures: 0,
      state: 'CLOSED',
      openedAt: null,
    };
  }

  return {
    consecutiveFailures: data.consecutive_failures,
    state: data.state,
    openedAt: data.opened_at ? new Date(data.opened_at) : null,
  };
}

/**
 * Update circuit breaker state in database
 * Phase 9.1: Tenant-aware
 *
 * @param tenantId - Tenant ID for scoped CB
 * @param update - State update
 */
async function updateCircuitBreakerState(
  tenantId: string | undefined,
  update: {
    consecutiveFailures?: number;
    state?: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
    openedAt?: Date | null;
  }
): Promise<void> {
  const key = getCircuitBreakerKey(tenantId);

  const dbUpdate: any = {
    updated_at: new Date().toISOString(),
  };

  if (update.consecutiveFailures !== undefined) {
    dbUpdate.consecutive_failures = update.consecutiveFailures;
  }

  if (update.state) {
    dbUpdate.state = update.state;
  }

  if (update.openedAt !== undefined) {
    dbUpdate.opened_at = update.openedAt ? update.openedAt.toISOString() : null;
  }

  await supabase
    .from('websrm_circuit_breaker')
    .upsert({
      key,
      ...dbUpdate,
    });
}

/**
 * Check if circuit breaker is open
 * Auto-closes after timeout period (60s)
 * Phase 9: DB-backed shared state
 * Phase 9.1: Tenant-aware
 *
 * @param tenantId - Tenant ID for scoped CB
 */
async function isCircuitBreakerOpen(tenantId?: string): Promise<boolean> {
  const state = await getCircuitBreakerState(tenantId);

  if (state.state !== 'OPEN') {
    return false;
  }

  // Check if timeout has expired
  if (state.openedAt && Date.now() - state.openedAt.getTime() > CIRCUIT_BREAKER_TIMEOUT) {
    console.info('[WEB-SRM] Circuit breaker timeout expired - closing circuit');

    // Auto-close circuit and reset
    await updateCircuitBreakerState(tenantId, {
      state: 'CLOSED',
      consecutiveFailures: 0,
      openedAt: null,
    });

    return false;
  }

  return true;
}

/**
 * Record circuit breaker state after processing
 * Phase 9: DB-backed shared state
 * Phase 9.1: Tenant-aware
 *
 * @param tenantId - Tenant ID for scoped CB
 * @param errorCode - Error code from transaction ('OK', 'TEMP_UNAVAILABLE', etc.)
 */
async function recordCircuitBreakerState(
  tenantId: string | undefined,
  errorCode: string
): Promise<void> {
  const state = await getCircuitBreakerState(tenantId);

  if (errorCode === 'TEMP_UNAVAILABLE') {
    const newFailureCount = state.consecutiveFailures + 1;

    if (newFailureCount >= CIRCUIT_BREAKER_THRESHOLD) {
      // Threshold reached - open circuit
      console.warn(
        `[WEB-SRM] Circuit breaker opened after ${newFailureCount} consecutive failures`
      );

      await updateCircuitBreakerState(tenantId, {
        consecutiveFailures: newFailureCount,
        state: 'OPEN',
        openedAt: new Date(),
      });
    } else {
      // Increment failure counter
      await updateCircuitBreakerState(tenantId, {
        consecutiveFailures: newFailureCount,
      });
    }
  } else if (errorCode === 'OK') {
    // Success - reset circuit breaker
    if (state.state !== 'CLOSED' || state.consecutiveFailures > 0) {
      console.info('[WEB-SRM] Circuit breaker reset after successful transaction');

      await updateCircuitBreakerState(tenantId, {
        consecutiveFailures: 0,
        state: 'CLOSED',
        openedAt: null,
      });
    }
  }
  // Non-retryable errors don't affect circuit breaker
}

/**
 * Process one queue item
 *
 * @param queueId - Queue item ID
 * @returns Processing result
 *
 * State transitions:
 * - pending → processing → completed (success)
 * - pending → processing → pending (retryable error, retry_count++, next_retry_at set)
 * - pending → processing → failed (non-retryable error OR max retries exceeded)
 */
export async function processQueueItem(queueId: string): Promise<{
  success: boolean;
  status: 'completed' | 'pending' | 'failed';
  message: string;
}> {
  // 1) Get queue item
  const { data: queueItem, error: fetchError } = await supabase
    .from('websrm_transaction_queue')
    .select('*')
    .eq('id', queueId)
    .single();

  if (fetchError || !queueItem) {
    return {
      success: false,
      status: 'failed',
      message: `Queue item not found: ${queueId}`,
    };
  }

  // 2) Check if already processing or completed
  if (queueItem.status === 'processing') {
    return {
      success: false,
      status: 'pending',
      message: 'Already processing',
    };
  }

  if (queueItem.status === 'completed') {
    return {
      success: true,
      status: 'completed',
      message: 'Already completed',
    };
  }

  // Check circuit breaker (tenant-scoped)
  if (await isCircuitBreakerOpen(queueItem.tenant_id)) {
    console.warn('[WEB-SRM] Circuit breaker is OPEN - skipping queue item', queueId);
    return {
      success: false,
      status: 'pending',
      message: 'Circuit breaker is open - service temporarily unavailable',
    };
  }

  // 3) Update to processing
  const startTime = Date.now();
  await supabase
    .from('websrm_transaction_queue')
    .update({
      status: 'processing',
      started_at: new Date().toISOString(),
    })
    .eq('id', queueId);

  try {
    // 4) Check network flag
    if (!isNetworkEnabled()) {
      // Network disabled - skip POST, mark as completed (dry-run)
      await supabase
        .from('websrm_transaction_queue')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          response_code: 'NETWORK_DISABLED',
        })
        .eq('id', queueId);

      return {
        success: true,
        status: 'completed',
        message: 'Network disabled - dry-run mode',
      };
    }

    // 5) Check if this is an order or closing transaction
    const isClosing = !!queueItem.closing_id;
    let result: any;
    let profile: ComplianceProfile;
    let entityId: string;
    let transactionTimestamp: string;
    let totalAmount: number;

    if (isClosing) {
      // FER (Fermeture) transaction - daily closing
      const { data: closing } = await supabase
        .from('daily_closings')
        .select('*')
        .eq('id', queueItem.closing_id)
        .single();

      if (!closing) {
        throw new Error(`Daily closing not found: ${queueItem.closing_id}`);
      }

      profile = await resolveProfile(
        queueItem.tenant_id,
        closing.branch_id,
        null // No device_id for FER transactions
      );

      // Generate FER payload (similar to handleOrderForWebSrm but for closings)
      result = await handleClosingForWebSrm(closing, profile, {
        persist: 'db', // Persist receipt to database
        previousActu: await getPreviousActu(queueItem.tenant_id, profile.deviceId),
      });

      entityId = closing.id;
      transactionTimestamp = closing.closing_date;
      totalAmount = closing.net_sales;
    } else {
      // Regular ENR/ANN/MOD transaction - order
      const { data: order } = await supabase
        .from('orders')
        .select('*, order_items(*)')
        .eq('id', queueItem.order_id)
        .single();

      if (!order) {
        throw new Error(`Order not found: ${queueItem.order_id}`);
      }

      profile = await resolveProfile(
        queueItem.tenant_id,
        order.branch_id,
        order.device_id
      );

      // 6) Generate WEB-SRM payload and signatures
      result = await handleOrderForWebSrm(order, profile, {
        persist: 'db', // Persist receipt to database
        previousActu: await getPreviousActu(queueItem.tenant_id, profile.deviceId),
      });

      entityId = order.id;
      transactionTimestamp = result.payload.dtTrans;
      totalAmount = result.payload.montTot;
    }

    // 7) Generate idempotency key (with env for cross-env isolation)
    const idempotencyKey = generateIdempotencyKey(
      profile.env,
      queueItem.tenant_id,
      entityId,
      transactionTimestamp,
      result.sigs.actu,
      totalAmount
    );

    // 8) POST to WEB-SRM API (with complete payload wrapper)
    const baseUrl = getWebSrmBaseUrl(profile.env);

    // Add NOTPS and NOTVQ headers (Quebec format: GST=9digits+RT+4digits, QST=10digits+TQ+4digits)
    const transactionHeaders = {
      ...result.headers,
      NOTPS: profile.gstNumber || '567891234RT0001', // Must include RT0001 suffix
      NOTVQ: profile.qstNumber || '5678912340TQ0001',
    };

    // Canonicalize the complete payload (with reqTrans/transActu wrapper)
    const { canonicalizePayload } = require('./body-signer');
    const payloadCanonical = canonicalizePayload(result.payload);

    const response = await postTransaction(
      {
        baseUrl,
        env: profile.env,
        // casEssai: ONLY for enrolment/annulation/modification, NOT for transaction
        certPem: profile.certPem, // mTLS client certificate
        keyPem: profile.privateKeyPem, // mTLS client private key
      },
      '/transaction',
      payloadCanonical,
      transactionHeaders,
      idempotencyKey
    );

    const endTime = Date.now();
    const durationMs = endTime - startTime;

    // 9) Map error
    const mappedError = mapWebSrmError(response);

    // 10) Log audit trail
    await logAudit({
      tenantId: queueItem.tenant_id,
      orderId: isClosing ? null : entityId,
      closingId: isClosing ? entityId : null,
      operation: isClosing ? 'closing' : 'transaction',
      requestMethod: 'POST',
      requestPath: isClosing ? '/closing' : '/transaction',
      requestBodyHash: result.sigs.sha256Hex,
      requestSignature: result.sigs.actu,
      responseStatus: response.httpStatus,
      responseBodyHash: response.rawBody
        ? createHash('sha256').update(response.rawBody, 'utf8').digest('hex')
        : null,
      websrmTransactionId: response.body?.retourTrans?.retourTransActu?.psiNoTrans || response.body?.retourFer?.retourFerActu?.psiNoFer || null,
      durationMs,
      errorCode: mappedError.code !== 'OK' ? mappedError.code : null,
      errorMessage: mappedError.rawMessage || null,
      codRetour: mappedError.rawCode || null,
    });

    // 11) Record circuit breaker state (tenant-scoped)
    await recordCircuitBreakerState(queueItem.tenant_id, mappedError.code);

    // 12) Handle response
    if (mappedError.code === 'OK') {
      // Success - update queue
      await supabase
        .from('websrm_transaction_queue')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          websrm_transaction_id: response.body?.retourTrans?.retourTransActu?.psiNoTrans || response.body?.retourFer?.retourFerActu?.psiNoFer || null,
          response_code: 'OK',
        })
        .eq('id', queueId);

      if (isClosing) {
        // Update daily_closings table with WEB-SRM transaction ID
        await supabase
          .from('daily_closings')
          .update({
            websrm_transaction_id: response.body?.retourFer?.retourFerActu?.psiNoFer || null,
          })
          .eq('id', entityId)
          .eq('branch_id', profile.branchId || queueItem.tenant_id);
      } else {
        // Update receipts table with WEB-SRM transaction ID
        await supabase
          .from('receipts')
          .update({
            websrm_transaction_id: response.body?.retourTrans?.retourTransActu?.psiNoTrans || null,
          })
          .eq('order_id', entityId)
          .eq('tenant_id', queueItem.tenant_id);
      }

      return {
        success: true,
        status: 'completed',
        message: `${isClosing ? 'Closing' : 'Transaction'} completed: ${response.body?.retourTrans?.retourTransActu?.psiNoTrans || response.body?.retourFer?.retourFerActu?.psiNoFer}`,
      };
    } else if (mappedError.retryable) {
      // Retryable error - check max retries
      const newRetryCount = queueItem.retry_count + 1;

      if (newRetryCount >= queueItem.max_retries) {
        // Max retries exceeded - mark as failed
        await supabase
          .from('websrm_transaction_queue')
          .update({
            status: 'failed',
            error_message: `Max retries exceeded: ${mappedError.rawMessage}`,
            last_error_at: new Date().toISOString(),
            response_code: mappedError.code,
          })
          .eq('id', queueId);

        return {
          success: false,
          status: 'failed',
          message: `Max retries exceeded (${newRetryCount}/${queueItem.max_retries})`,
        };
      }

      // Calculate backoff and schedule retry
      const backoffMs = calculateBackoff(newRetryCount);
      const nextRetryAt = new Date(Date.now() + backoffMs);

      await supabase
        .from('websrm_transaction_queue')
        .update({
          status: 'pending',
          retry_count: newRetryCount,
          next_retry_at: nextRetryAt.toISOString(),
          error_message: mappedError.rawMessage || 'Retryable error',
          last_error_at: new Date().toISOString(),
          response_code: mappedError.code,
        })
        .eq('id', queueId);

      return {
        success: false,
        status: 'pending',
        message: `Retryable error - retry ${newRetryCount}/${queueItem.max_retries} scheduled at ${nextRetryAt.toISOString()}`,
      };
    } else {
      // Non-retryable error - mark as failed
      await supabase
        .from('websrm_transaction_queue')
        .update({
          status: 'failed',
          error_message: mappedError.rawMessage || 'Non-retryable error',
          last_error_at: new Date().toISOString(),
          response_code: mappedError.code,
        })
        .eq('id', queueId);

      return {
        success: false,
        status: 'failed',
        message: `Non-retryable error: ${mappedError.code}`,
      };
    }
  } catch (error: any) {
    // Unexpected error - mark as failed
    await supabase
      .from('websrm_transaction_queue')
      .update({
        status: 'failed',
        error_message: error.message || 'Unexpected error',
        last_error_at: new Date().toISOString(),
      })
      .eq('id', queueId);

    return {
      success: false,
      status: 'failed',
      message: `Unexpected error: ${error.message}`,
    };
  }
}

/**
 * Get previousActu signature for signature chain
 *
 * Strategy: Get last completed receipt for same tenant+device, order by timestamp DESC
 * If no previous receipt, return '=' * 88 (default empty signature)
 *
 * @param tenantId - Tenant ID
 * @param deviceId - Device ID (IDAPPRL)
 * @returns previousActu signature (88 base64) or '=' * 88
 */
async function getPreviousActu(tenantId: string, deviceId: string): Promise<string> {
  const { data: lastReceipt } = await supabase
    .from('receipts')
    .select('signa_actu')
    .eq('tenant_id', tenantId)
    .eq('device_id', deviceId)
    .order('transaction_timestamp', { ascending: false })
    .limit(1)
    .single();

  if (lastReceipt && lastReceipt.signa_actu) {
    return lastReceipt.signa_actu;
  }

  // No previous receipt - return default empty signature
  return '='.repeat(88);
}

/**
 * Log audit entry
 * SW-78 FO-115: Updated to support both order and closing transactions
 */
async function logAudit(params: {
  tenantId: string;
  orderId: string | null;
  closingId?: string | null;
  operation: string;
  requestMethod: string;
  requestPath: string;
  requestBodyHash: string | null;
  requestSignature: string | null;
  responseStatus: number | null;
  responseBodyHash: string | null;
  websrmTransactionId: string | null;
  durationMs: number;
  errorCode: string | null;
  errorMessage: string | null;
  codRetour: string | null;
}): Promise<void> {
  await supabase.from('websrm_audit_log').insert({
    tenant_id: params.tenantId,
    order_id: params.orderId,
    closing_id: params.closingId,
    operation: params.operation,
    request_method: params.requestMethod,
    request_path: params.requestPath,
    request_body_hash: params.requestBodyHash,
    request_signature: params.requestSignature,
    response_status: params.responseStatus,
    response_body_hash: params.responseBodyHash,
    websrm_transaction_id: params.websrmTransactionId,
    duration_ms: params.durationMs,
    error_code: params.errorCode,
    error_message: params.errorMessage,
    cod_retour: params.codRetour,
  });
}

/**
 * Process pending queue items (worker loop)
 *
 * @param limit - Max items to process (default: 20)
 * @returns Processing summary
 */
export async function consumeQueue(limit: number = 20): Promise<{
  processed: number;
  completed: number;
  pending: number;
  failed: number;
  items: Array<{
    id: string;
    orderId: string;
    status: string;
    message: string;
  }>;
}> {
  // Get pending items (scheduled_at <= now OR next_retry_at <= now)
  const now = new Date().toISOString();

  const { data: queueItems, error } = await supabase
    .from('websrm_transaction_queue')
    .select('id, order_id')
    .eq('status', 'pending')
    .or(`scheduled_at.lte.${now},next_retry_at.lte.${now}`)
    .order('scheduled_at', { ascending: true })
    .limit(limit);

  if (error || !queueItems || queueItems.length === 0) {
    return {
      processed: 0,
      completed: 0,
      pending: 0,
      failed: 0,
      items: [],
    };
  }

  // Process each item with concurrency limit (max 5 parallel)
  const limit5 = pLimit(5);
  const results = await Promise.all(
    queueItems.map((item) =>
      limit5(async () => {
        const result = await processQueueItem(item.id);
        return {
          id: item.id,
          orderId: item.order_id,
          status: result.status,
          message: result.message,
        };
      })
    )
  );

  // Summarize results
  const summary = {
    processed: results.length,
    completed: results.filter((r) => r.status === 'completed').length,
    pending: results.filter((r) => r.status === 'pending').length,
    failed: results.filter((r) => r.status === 'failed').length,
    items: results,
  };

  return summary;
}

/**
 * Enqueue order for WEB-SRM processing
 *
 * @param orderId - Order ID
 * @param tenantId - Tenant ID
 * @returns Queue item ID
 */
export async function enqueueOrder(
  orderId: string,
  tenantId: string
): Promise<{ success: boolean; queueId?: string; message: string }> {
  // Check if already queued
  const { data: existing } = await supabase
    .from('websrm_transaction_queue')
    .select('id, status')
    .eq('order_id', orderId)
    .eq('tenant_id', tenantId)
    .single();

  if (existing) {
    return {
      success: false,
      message: `Already queued: ${existing.status}`,
    };
  }

  // Get order
  const { data: order } = await supabase
    .from('orders')
    .select('id, total_amount')
    .eq('id', orderId)
    .single();

  if (!order) {
    return {
      success: false,
      message: 'Order not found',
    };
  }

  // Generate idempotency key (preliminary - will be regenerated with signature)
  const idempotencyKey = createHash('sha256')
    .update(`${tenantId}|${orderId}|${new Date().toISOString()}`, 'utf8')
    .digest('hex');

  // Create queue item
  const { data: queueItem, error } = await supabase
    .from('websrm_transaction_queue')
    .insert({
      tenant_id: tenantId,
      order_id: orderId,
      idempotency_key: idempotencyKey,
      status: 'pending',
      canonical_payload_hash: '0'.repeat(64), // Placeholder - will be updated on processing
    })
    .select()
    .single();

  if (error || !queueItem) {
    return {
      success: false,
      message: `Failed to enqueue: ${error?.message}`,
    };
  }

  return {
    success: true,
    queueId: queueItem.id,
    message: 'Enqueued successfully',
  };
}

/**
 * Enqueue daily closing for WEB-SRM processing (FER transaction)
 * SW-78 FO-115: Daily closing receipts
 *
 * @param closingId - Daily closing ID
 * @param tenantId - Tenant ID
 * @returns Queue item ID
 */
export async function enqueueDailyClosing(
  closingId: string,
  tenantId: string
): Promise<{ success: boolean; queueId?: string; message: string }> {
  // Check if already queued
  const { data: existing } = await supabase
    .from('websrm_transaction_queue')
    .select('id, status')
    .eq('closing_id', closingId)
    .eq('tenant_id', tenantId)
    .single();

  if (existing) {
    return {
      success: false,
      message: `Already queued: ${existing.status}`,
    };
  }

  // Get closing
  const { data: closing } = await supabase
    .from('daily_closings')
    .select('id, net_sales, branch_id')
    .eq('id', closingId)
    .single();

  if (!closing) {
    return {
      success: false,
      message: 'Daily closing not found',
    };
  }

  // Generate idempotency key (preliminary - will be regenerated with signature)
  const idempotencyKey = createHash('sha256')
    .update(`${tenantId}|closing|${closingId}|${new Date().toISOString()}`, 'utf8')
    .digest('hex');

  // Create queue item
  const { data: queueItem, error } = await supabase
    .from('websrm_transaction_queue')
    .insert({
      tenant_id: tenantId,
      closing_id: closingId,
      idempotency_key: idempotencyKey,
      status: 'pending',
      canonical_payload_hash: '0'.repeat(64), // Placeholder - will be updated on processing
    })
    .select()
    .single();

  if (error || !queueItem) {
    return {
      success: false,
      message: `Failed to enqueue: ${error?.message}`,
    };
  }

  return {
    success: true,
    queueId: queueItem.id,
    message: 'Daily closing enqueued successfully',
  };
}
