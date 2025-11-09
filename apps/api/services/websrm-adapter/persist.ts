/**
 * WEB-SRM Persist Layer - Phase 6
 *
 * Purpose: Save receipt data to files or database (NO network calls)
 * Security: DB writes blocked unless WEBSRM_DB_ALLOW_WRITE=true (sandbox only)
 */

import { promises as fs } from 'fs';
import { join } from 'path';

export type PersistTarget = 'files' | 'db' | 'none';

export type PersistInput = {
  tenantId: string;
  orderId: string;
  transactionQueueId?: string; // FO-116: Queue ID for 1:1 receipt-to-transaction mapping
  printMode: 'PAPER' | 'ELECTRONIC';
  format: 'CUSTOMER' | 'MERCHANT' | 'INTERNAL';
  signaPreced: string;   // 88 base64
  signaActu: string;     // 88 base64
  payloadHash: string;   // 64 hex
  qrData: string;        // <= 2048
  websrmTransactionId?: string;
  transactionTimestamp: string; // ISO
  headers?: Record<string, string>;
  payloadCanonical?: string;
  // Phase 6.1: Device/software metadata
  deviceId?: string;     // IDAPPRL
  env?: 'DEV' | 'ESSAI' | 'PROD';
  softwareId?: string;   // IDSEV
  softwareVersion?: string; // IDVERSI
  metadata?: Record<string, any>; // JSONB flexible data
};

/**
 * Persist receipt data to configured target
 * @param target - Where to persist: files, db, or none
 * @param data - Receipt data to persist
 */
export async function persistReceipt(target: PersistTarget, data: PersistInput): Promise<void> {
  if (target === 'none') {
    return;
  }

  if (target === 'files') {
    // Create receipts directory
    const baseDir = join(process.cwd(), 'tmp', 'receipts');
    await fs.mkdir(baseDir, { recursive: true });

    // Generate timestamp for filename (ISO → filename safe)
    const stamp = (data.transactionTimestamp || new Date().toISOString())
      .replace(/[:.]/g, '-')
      .slice(0, 19);

    const filename = `websrm-${data.orderId}-${stamp}.json`;
    const filepath = join(baseDir, filename);

    // Structure output
    const output = {
      meta: {
        tenantId: data.tenantId,
        orderId: data.orderId,
        printMode: data.printMode,
        format: data.format,
        transactionTimestamp: data.transactionTimestamp,
        websrmTransactionId: data.websrmTransactionId,
      },
      signatures: {
        signa_preced: data.signaPreced,
        signa_actu: data.signaActu,
        payload_hash: data.payloadHash,
      },
      qr: data.qrData,
      headers: data.headers ?? {},
      canonical: data.payloadCanonical ?? '',
    };

    await fs.writeFile(filepath, JSON.stringify(output, null, 2), 'utf8');
    return;
  }

  if (target === 'db') {
    // Security check: DB writes must be explicitly allowed
    if (process.env.WEBSRM_DB_ALLOW_WRITE !== 'true') {
      console.warn('[WEB-SRM] DB persist blocked - WEBSRM_DB_ALLOW_WRITE not true');
      return;
    }

    try {
      // Import Supabase client
      const { createClient } = require('@supabase/supabase-js');

      // Use production database (safe in ESSAI mode for testing)
      const supabase = createClient(
        process.env.SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );

      // Convert Quebec timestamp format (YYYYMMDDHHmmss) to ISO 8601
      const convertQuebecTimestamp = (quebecTs: string): string => {
        // Format: YYYYMMDDHHmmss -> YYYY-MM-DDTHH:mm:ss.000Z
        if (quebecTs.length !== 14) {
          return new Date().toISOString(); // Fallback to current time
        }
        const year = quebecTs.substring(0, 4);
        const month = quebecTs.substring(4, 6);
        const day = quebecTs.substring(6, 8);
        const hour = quebecTs.substring(8, 10);
        const minute = quebecTs.substring(10, 12);
        const second = quebecTs.substring(12, 14);
        return `${year}-${month}-${day}T${hour}:${minute}:${second}.000Z`;
      };

      // Insert receipt into database
      const { data: receipt, error } = await supabase
        .from('receipts')
        .insert({
          tenant_id: data.tenantId,
          order_id: data.orderId,
          transaction_queue_id: data.transactionQueueId, // FO-116: 1:1 receipt-to-transaction mapping
          websrm_transaction_id: data.websrmTransactionId,
          transaction_timestamp: convertQuebecTimestamp(data.transactionTimestamp),
          format: data.format,
          print_mode: data.printMode,
          signa_preced: data.signaPreced,
          signa_actu: data.signaActu,
          payload_hash: data.payloadHash,
          qr_data: data.qrData,
          receipt_content: data.payloadCanonical || '',
          device_id: data.deviceId,
          env: data.env,
          software_id: data.softwareId,
          software_version: data.softwareVersion,
          metadata: data.metadata || {},
          is_reproduction: false,
          is_credit_note: false,
          print_status: 'pending',
          print_attempts: 0,
        })
        .select()
        .single();

      if (error) {
        console.error('[WEB-SRM] Failed to persist receipt to database:', error);
        throw new Error(`Database persist failed: ${error.message}`);
      }

      console.info('[WEB-SRM] Receipt persisted to database:', receipt.id);
    } catch (error) {
      console.error('[WEB-SRM] Exception during DB persist:', error);
      // Re-throw to allow caller to handle
      throw error;
    }
  }
}
