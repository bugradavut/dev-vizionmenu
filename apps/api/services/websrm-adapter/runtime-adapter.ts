/**
 * WEB-SRM Runtime Adapter - Phase 6 (Refactored)
 *
 * Purpose: Generate real signatures, headers, QR codes for orders
 * Security: NO network calls - local persist only
 * Environment: Disabled in production (NODE_ENV=production)
 * Profile-based: Uses ComplianceProfile instead of ENV variables
 */

import { mapOrderToReqTrans, mapClosingToReqFer } from '@vizionmenu/websrm-core';
import { computeBodySignatures } from './body-signer';
import { buildCanonicalBaseString, buildOfficialHeaders } from './headers-builder';
import { buildOfficialQr } from './qr-builder';
import { persistReceipt, PersistTarget } from './persist';
import { ComplianceProfile } from './profile-resolver';

export interface WebSrmRuntimeOptions {
  persist: PersistTarget;
  previousActu?: string; // For signature chain (future enhancement)
}

export interface WebSrmResult {
  headers: Record<string, string>;
  payload: any;
  qr: string;
  sigs: {
    preced: string;
    actu: string;
    canonical: string;
    sha256Hex: string;
  };
  profile: {
    deviceId: string;
    env: string;
  };
}

/**
 * Process order for WEB-SRM compliance (Profile-based)
 * Generates signatures, headers, QR code and persists locally
 *
 * @param order - Order object with items
 * @param profile - Compliance profile (from profile-resolver)
 * @param options - Runtime options (persist target, signature chain)
 * @returns Generated WEB-SRM artifacts
 */
export async function handleOrderForWebSrm(
  order: any,
  profile: ComplianceProfile,
  options: WebSrmRuntimeOptions = { persist: 'files' }
): Promise<WebSrmResult> {
  // 1) Order → WEB-SRM payload (signature placeholder, will be computed after)
  const payload = mapOrderToReqTrans(order, '='.repeat(88));

  // 2) Body signatures (canonical + signature chain)
  const sigs = computeBodySignatures(payload, {
    privateKeyPem: profile.privateKeyPem,
    previousActu: options.previousActu, // Load from storage if available
  });

  // 3) Base string + official headers
  const base = buildCanonicalBaseString(
    'POST',
    '/transaction',
    sigs.canonical,
    {
      IDAPPRL: profile.deviceId,
      IDSEV: profile.softwareId,
      IDVERSI: profile.softwareVersion,
      CODCERTIF: profile.certCode,
      IDPARTN: profile.partnerId,
      VERSI: profile.versi,
      VERSIPARN: profile.versiParn,
      ENVIRN: profile.env,
      // CASESSAI: profile.env === 'ESSAI' ? '000.000' : undefined,
    }
  );

  const headers = buildOfficialHeaders(
    {
      env: profile.env,
      idApprl: profile.deviceId,
      idSev: profile.softwareId,
      idVersi: profile.softwareVersion,
      codCertif: profile.certCode,
      idPartn: profile.partnerId,
      versi: profile.versi,
      versiParn: profile.versiParn,
      privateKeyPem: profile.privateKeyPem,
      certPem: profile.certPem,
    },
    base
  );

  // 4) QR code generation
  const qr = buildOfficialQr(payload, sigs.actu);

  // 5) Persist locally (files/db/none)
  await persistReceipt(options.persist, {
    tenantId: order.tenant_id || profile.tenantId,
    orderId: order.id,
    printMode: 'PAPER',
    format: 'CUSTOMER',
    signaPreced: sigs.preced,
    signaActu: sigs.actu,
    payloadHash: sigs.sha256Hex,
    qrData: qr,
    websrmTransactionId: payload.idTrans,
    transactionTimestamp: payload.dtTrans || new Date().toISOString(),
    headers, // Debug/audit purposes
    payloadCanonical: sigs.canonical,
    // Phase 6.1: Device/software metadata
    deviceId: profile.deviceId,
    env: profile.env,
    softwareId: profile.softwareId,
    softwareVersion: profile.softwareVersion,
    metadata: {
      partnerId: profile.partnerId,
      certCode: profile.certCode,
      versi: profile.versi,
      versiParn: profile.versiParn,
      deviceLocalId: profile.deviceLocalId,
    },
  });

  return {
    headers,
    payload,
    qr,
    sigs,
    profile: {
      deviceId: profile.deviceId,
      env: profile.env,
    },
  };
}

/**
 * Process daily closing for WEB-SRM compliance (FER transaction)
 * SW-78 FO-115: Daily closing receipts
 * Generates signatures, headers for FER (Fermeture) transactions
 *
 * @param closing - Daily closing record
 * @param profile - Compliance profile (from profile-resolver)
 * @param options - Runtime options (persist target, signature chain)
 * @returns Generated WEB-SRM artifacts
 */
export async function handleClosingForWebSrm(
  closing: any,
  profile: ComplianceProfile,
  options: WebSrmRuntimeOptions = { persist: 'none' }
): Promise<WebSrmResult> {
  // 1) Daily closing → WEB-SRM FER payload (signature placeholder, will be computed after)
  const payload = mapClosingToReqFer(closing, '='.repeat(88));

  // 2) Body signatures (canonical + signature chain)
  const sigs = computeBodySignatures(payload, {
    privateKeyPem: profile.privateKeyPem,
    previousActu: options.previousActu,
  });

  // 3) Base string + official headers
  const base = buildCanonicalBaseString(
    'POST',
    '/closing', // FER endpoint
    sigs.canonical,
    {
      IDAPPRL: profile.deviceId,
      IDSEV: profile.softwareId,
      IDVERSI: profile.softwareVersion,
      CODCERTIF: profile.certCode,
      IDPARTN: profile.partnerId,
      VERSI: profile.versi,
      VERSIPARN: profile.versiParn,
      ENVIRN: profile.env,
    }
  );

  const headers = buildOfficialHeaders(
    {
      env: profile.env,
      idApprl: profile.deviceId,
      idSev: profile.softwareId,
      idVersi: profile.softwareVersion,
      codCertif: profile.certCode,
      idPartn: profile.partnerId,
      versi: profile.versi,
      versiParn: profile.versiParn,
      privateKeyPem: profile.privateKeyPem,
      certPem: profile.certPem,
    },
    base
  );

  // 4) QR code generation (FER doesn't need QR, but keep for consistency)
  const qr = buildOfficialQr(payload, sigs.actu);

  // 5) Persist is typically 'none' for FER (no receipts table for closings)
  // If persist is needed, it would go to a different table

  return {
    headers,
    payload,
    qr,
    sigs,
    profile: {
      deviceId: profile.deviceId,
      env: profile.env,
    },
  };
}
