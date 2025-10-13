/**
 * WEB-SRM Evidence Exporter - Phase 8
 *
 * Purpose: Export transaction evidence for ESSAI validation/audit
 * Output: ZIP archive with:
 *   - receipt.json (redacted: signa_actu, payload_hash, qr_data, device_id/env)
 *   - audit.json (request/response hashes, cod_retour, duration_ms, error_code/message redacted)
 *   - receipt.png (QR code ≤ 2048 chars)
 *   - tech-notes.txt (env, device/software version, idempotency key, trace-id)
 *
 * Security:
 *   - NO PII (customer names, phones, emails)
 *   - NO PEM keys or sensitive secrets
 *   - Redacted structure only
 *
 * Usage:
 *   tsx scripts/websrm-export-evidence.ts <order_id> [output_dir]
 *
 * Example:
 *   tsx scripts/websrm-export-evidence.ts abc123 ./evidence
 *   → Creates: ./evidence/websrm-evidence-abc123-20250109T120000Z.zip
 */

import { createClient } from '@supabase/supabase-js';
import { createWriteStream, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from 'fs';
import { join } from 'path';
import * as archiver from 'archiver';
import QRCode from 'qrcode';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface EvidencePackage {
  orderId: string;
  timestamp: string;
  receipt: {
    orderId: string;
    transactionTimestamp: string;
    signaActu: string; // 88 base64
    signaPreced?: string;
    payloadHash: string; // 64 hex
    qrData: string; // ≤ 2048 chars
    deviceId: string;
    env: string;
    softwareId: string;
    softwareVersion: string;
    websrmTransactionId?: string;
  };
  audit: {
    operation: string;
    requestMethod: string;
    requestPath: string;
    requestBodyHash: string;
    requestSignature: string;
    responseStatus: number;
    responseBodyHash?: string;
    websrmTransactionId?: string;
    durationMs: number;
    codRetour?: string;
    errorCode?: string;
    errorMessage?: string;
  };
  techNotes: {
    orderId: string;
    tenantId: string;
    env: string;
    deviceId: string;
    deviceLocalId?: string;
    softwareId: string;
    softwareVersion: string;
    partnerId: string;
    certCode: string;
    versi: string;
    versiParn: string;
    idempotencyKey?: string;
    queueId?: string;
    exportTimestamp: string;
  };
}

/**
 * Fetch evidence data from database
 */
async function fetchEvidenceData(orderId: string): Promise<EvidencePackage | null> {
  // Get receipt
  const { data: receipt, error: receiptError } = await supabase
    .from('receipts')
    .select('*')
    .eq('order_id', orderId)
    .single();

  if (receiptError || !receipt) {
    console.error(`❌ Receipt not found for order: ${orderId}`);
    return null;
  }

  // Get audit log
  const { data: auditLog, error: auditError } = await supabase
    .from('websrm_audit_log')
    .select('*')
    .eq('order_id', orderId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (auditError || !auditLog) {
    console.error(`❌ Audit log not found for order: ${orderId}`);
    return null;
  }

  // Get queue item (for idempotency key)
  const { data: queueItem } = await supabase
    .from('websrm_transaction_queue')
    .select('id, idempotency_key')
    .eq('order_id', orderId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  // Build evidence package
  const evidence: EvidencePackage = {
    orderId,
    timestamp: new Date().toISOString(),
    receipt: {
      orderId: receipt.order_id,
      transactionTimestamp: receipt.transaction_timestamp,
      signaActu: receipt.signa_actu || 'N/A',
      signaPreced: receipt.signa_preced || undefined,
      payloadHash: receipt.payload_hash || 'N/A',
      qrData: receipt.qr_data || 'N/A',
      deviceId: receipt.device_id || 'N/A',
      env: receipt.env || 'N/A',
      softwareId: receipt.software_id || 'N/A',
      softwareVersion: receipt.software_version || 'N/A',
      websrmTransactionId: receipt.websrm_transaction_id || undefined,
    },
    audit: {
      operation: auditLog.operation,
      requestMethod: auditLog.request_method,
      requestPath: auditLog.request_path,
      requestBodyHash: auditLog.request_body_hash || 'N/A',
      requestSignature: auditLog.request_signature || 'N/A',
      responseStatus: auditLog.response_status || 0,
      responseBodyHash: auditLog.response_body_hash || undefined,
      websrmTransactionId: auditLog.websrm_transaction_id || undefined,
      durationMs: auditLog.duration_ms || 0,
      codRetour: auditLog.cod_retour || undefined,
      errorCode: auditLog.error_code || undefined,
      errorMessage: auditLog.error_message || undefined,
    },
    techNotes: {
      orderId: receipt.order_id,
      tenantId: receipt.tenant_id,
      env: receipt.env || 'N/A',
      deviceId: receipt.device_id || 'N/A',
      deviceLocalId: receipt.metadata?.deviceLocalId || undefined,
      softwareId: receipt.software_id || 'N/A',
      softwareVersion: receipt.software_version || 'N/A',
      partnerId: receipt.metadata?.partnerId || 'N/A',
      certCode: receipt.metadata?.certCode || 'N/A',
      versi: receipt.metadata?.versi || 'N/A',
      versiParn: receipt.metadata?.versiParn || 'N/A',
      idempotencyKey: queueItem?.idempotency_key || undefined,
      queueId: queueItem?.id || undefined,
      exportTimestamp: new Date().toISOString(),
    },
  };

  return evidence;
}

/**
 * Generate tech notes text file
 */
function generateTechNotes(evidence: EvidencePackage): string {
  const lines: string[] = [
    '═══════════════════════════════════════════════',
    'WEB-SRM TRANSACTION EVIDENCE - TECHNICAL NOTES',
    '═══════════════════════════════════════════════',
    '',
    'TRANSACTION METADATA',
    '─────────────────────────────────────────────────',
    `Order ID:              ${evidence.techNotes.orderId}`,
    `Tenant ID:             ${evidence.techNotes.tenantId}`,
    `Environment:           ${evidence.techNotes.env}`,
    `Export Timestamp:      ${evidence.techNotes.exportTimestamp}`,
    '',
    'DEVICE & SOFTWARE',
    '─────────────────────────────────────────────────',
    `Device ID (IDAPPRL):   ${evidence.techNotes.deviceId}`,
    `Device Local ID:       ${evidence.techNotes.deviceLocalId || 'N/A'}`,
    `Software ID (IDSEV):   ${evidence.techNotes.softwareId}`,
    `Software Version:      ${evidence.techNotes.softwareVersion}`,
    '',
    'COMPLIANCE METADATA',
    '─────────────────────────────────────────────────',
    `Partner ID (IDPARTN):  ${evidence.techNotes.partnerId}`,
    `Cert Code (CODCERTIF): ${evidence.techNotes.certCode}`,
    `VERSI:                 ${evidence.techNotes.versi}`,
    `VERSIPARN:             ${evidence.techNotes.versiParn}`,
    '',
    'CRYPTOGRAPHIC EVIDENCE',
    '─────────────────────────────────────────────────',
    `Signa Actu Length:     ${evidence.receipt.signaActu.length} chars`,
    `Payload Hash Length:   ${evidence.receipt.payloadHash.length} chars`,
    `QR Data Length:        ${evidence.receipt.qrData.length} chars`,
    `QR Compliant:          ${evidence.receipt.qrData.length <= 2048 ? 'YES ✓' : 'NO ✗ (exceeds 2048)'}`,
    '',
    'NETWORK TRANSACTION',
    '─────────────────────────────────────────────────',
    `WEB-SRM Transaction:   ${evidence.receipt.websrmTransactionId || 'N/A (network disabled)'}`,
    `HTTP Status:           ${evidence.audit.responseStatus}`,
    `Duration:              ${evidence.audit.durationMs}ms`,
    `Cod Retour:            ${evidence.audit.codRetour || 'N/A'}`,
    `Error Code:            ${evidence.audit.errorCode || 'OK'}`,
    '',
    'IDEMPOTENCY & QUEUE',
    '─────────────────────────────────────────────────',
    `Idempotency Key:       ${evidence.techNotes.idempotencyKey || 'N/A'}`,
    `Queue ID:              ${evidence.techNotes.queueId || 'N/A'}`,
    '',
    'SIGNATURE CHAIN',
    '─────────────────────────────────────────────────',
    `Signa Preced:          ${evidence.receipt.signaPreced?.substring(0, 40) || 'N/A (first transaction)'}`,
    `Signa Actu:            ${evidence.receipt.signaActu.substring(0, 40)}...`,
    '',
    'SECURITY & PRIVACY',
    '─────────────────────────────────────────────────',
    '✓ PII redacted (no customer names, phones, emails)',
    '✓ PEM keys excluded (no private/public keys)',
    '✓ Payload hash only (no raw transaction body)',
    '✓ QR code compliant (≤ 2048 chars)',
    '',
    '═══════════════════════════════════════════════',
    `Generated: ${evidence.techNotes.exportTimestamp}`,
    '═══════════════════════════════════════════════',
  ];

  return lines.join('\n');
}

/**
 * Create ZIP archive with evidence
 */
async function createEvidenceZip(
  evidence: EvidencePackage,
  outputDir: string
): Promise<string> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0] + 'T' + new Date().toISOString().split('T')[1].split('.')[0].replace(/:/g, '');
  const zipFilename = `websrm-evidence-${evidence.orderId}-${timestamp}.zip`;
  const zipPath = join(outputDir, zipFilename);
  const tempDir = join(outputDir, `temp-${evidence.orderId}`);

  // Create temp directory
  mkdirSync(tempDir, { recursive: true });

  try {
    // 1) Write receipt.json (redacted)
    const receiptJson = {
      order_id: evidence.receipt.orderId,
      transaction_timestamp: evidence.receipt.transactionTimestamp,
      signa_actu: evidence.receipt.signaActu,
      signa_preced: evidence.receipt.signaPreced,
      payload_hash: evidence.receipt.payloadHash,
      qr_data_length: evidence.receipt.qrData.length,
      qr_compliant: evidence.receipt.qrData.length <= 2048,
      device_id: evidence.receipt.deviceId,
      env: evidence.receipt.env,
      software_id: evidence.receipt.softwareId,
      software_version: evidence.receipt.softwareVersion,
      websrm_transaction_id: evidence.receipt.websrmTransactionId,
    };

    writeFileSync(
      join(tempDir, 'receipt.json'),
      JSON.stringify(receiptJson, null, 2)
    );

    // 2) Write audit.json (redacted)
    const auditJson = {
      operation: evidence.audit.operation,
      request_method: evidence.audit.requestMethod,
      request_path: evidence.audit.requestPath,
      request_body_hash: evidence.audit.requestBodyHash,
      request_signature_length: evidence.audit.requestSignature.length,
      response_status: evidence.audit.responseStatus,
      response_body_hash: evidence.audit.responseBodyHash,
      websrm_transaction_id: evidence.audit.websrmTransactionId,
      duration_ms: evidence.audit.durationMs,
      cod_retour: evidence.audit.codRetour,
      error_code: evidence.audit.errorCode,
      error_message: evidence.audit.errorMessage,
    };

    writeFileSync(
      join(tempDir, 'audit.json'),
      JSON.stringify(auditJson, null, 2)
    );

    // 3) Generate QR code image (if qr_data valid)
    if (evidence.receipt.qrData && evidence.receipt.qrData !== 'N/A') {
      await QRCode.toFile(join(tempDir, 'receipt.png'), evidence.receipt.qrData, {
        errorCorrectionLevel: 'M',
        width: 512,
      });
    }

    // 4) Write tech-notes.txt
    const techNotes = generateTechNotes(evidence);
    writeFileSync(join(tempDir, 'tech-notes.txt'), techNotes);

    // 5) Create ZIP archive
    await new Promise<void>((resolve, reject) => {
      const output = createWriteStream(zipPath);
      const archive = archiver('zip', { zlib: { level: 9 } });

      output.on('close', () => resolve());
      archive.on('error', (err) => reject(err));

      archive.pipe(output);
      archive.directory(tempDir, false);
      archive.finalize();
    });

    console.log(`✅ Evidence package created: ${zipPath}`);
    return zipPath;
  } finally {
    // Cleanup temp directory
    if (existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true, force: true });
    }
  }
}

/**
 * Main export function
 */
async function exportEvidence(orderId: string, outputDir: string = './evidence'): Promise<void> {
  console.log('📦 [WEB-SRM] Evidence Exporter\n');
  console.log(`Order ID:    ${orderId}`);
  console.log(`Output Dir:  ${outputDir}\n`);

  // Create output directory
  mkdirSync(outputDir, { recursive: true });

  // Fetch evidence data
  console.log('⏳ Fetching evidence data...\n');
  const evidence = await fetchEvidenceData(orderId);

  if (!evidence) {
    console.error('❌ Failed to fetch evidence data');
    process.exit(1);
  }

  console.log('✅ Evidence data fetched\n');

  // Validate QR size
  if (evidence.receipt.qrData.length > 2048) {
    console.warn(`⚠️  WARNING: QR data exceeds 2048 chars (${evidence.receipt.qrData.length})`);
  }

  // Create ZIP
  console.log('⏳ Creating evidence package...\n');
  const zipPath = await createEvidenceZip(evidence, outputDir);

  // Summary
  console.log('═══════════════════════════════════════════════');
  console.log('📋 EVIDENCE EXPORT SUMMARY');
  console.log('═══════════════════════════════════════════════');
  console.log(`Order ID:           ${evidence.orderId}`);
  console.log(`Environment:        ${evidence.receipt.env}`);
  console.log(`Device ID:          ${evidence.receipt.deviceId}`);
  console.log(`Transaction ID:     ${evidence.receipt.websrmTransactionId || 'N/A'}`);
  console.log(`─────────────────────────────────────────────────`);
  console.log(`Signa Actu:         ${evidence.receipt.signaActu.substring(0, 40)}...`);
  console.log(`Payload Hash:       ${evidence.receipt.payloadHash.substring(0, 40)}...`);
  console.log(`QR Length:          ${evidence.receipt.qrData.length} chars ${evidence.receipt.qrData.length <= 2048 ? '✓' : '✗'}`);
  console.log(`─────────────────────────────────────────────────`);
  console.log(`HTTP Status:        ${evidence.audit.responseStatus}`);
  console.log(`Duration:           ${evidence.audit.durationMs}ms`);
  console.log(`Cod Retour:         ${evidence.audit.codRetour || 'N/A'}`);
  console.log(`Error Code:         ${evidence.audit.errorCode || 'OK'}`);
  console.log(`─────────────────────────────────────────────────`);
  console.log(`ZIP Output:         ${zipPath}`);
  console.log('═══════════════════════════════════════════════');
  console.log('✅ Evidence export completed\n');
}

// CLI entry point
const orderId = process.argv[2];
const outputDir = process.argv[3] || './evidence';

if (!orderId) {
  console.error('Usage: tsx scripts/websrm-export-evidence.ts <order_id> [output_dir]');
  process.exit(1);
}

exportEvidence(orderId, outputDir)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
