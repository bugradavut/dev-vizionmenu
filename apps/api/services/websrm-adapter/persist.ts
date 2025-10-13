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

    // !!! SANDBOX ONLY !!!
    // Production database must NEVER be used here
    // Uncomment when sandbox credentials are configured:

    // const { createClient } = require('@supabase/supabase-js');
    // const supabase = createClient(
    //   process.env.SANDBOX_URL!,
    //   process.env.SANDBOX_KEY!
    // );
    //
    // await supabase.from('receipts').insert({
    //   tenant_id: data.tenantId,
    //   order_id: data.orderId,
    //   print_mode: data.printMode,
    //   format: data.format,
    //   signa_preced: data.signaPreced,
    //   signa_actu: data.signaActu,
    //   payload_hash: data.payloadHash,
    //   qr_data: data.qrData,
    //   websrm_transaction_id: data.websrmTransactionId,
    //   transaction_timestamp: data.transactionTimestamp,
    // });

    console.info('[WEB-SRM] DB persist placeholder - implement when sandbox ready');
  }
}
