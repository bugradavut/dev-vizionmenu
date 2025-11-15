/**
 * WEB-SRM Runtime Adapter - Phase 6 (Refactored)
 *
 * Purpose: Generate real signatures, headers, QR codes for orders
 * Security: NO network calls - local persist only
 * Environment: Disabled in production (NODE_ENV=production)
 * Profile-based: Uses ComplianceProfile instead of ENV variables
 */

import { mapOrderToReqTrans, mapClosingToReqFer } from '@vizionmenu/websrm-core';
import type { TransactionRequest } from '@vizionmenu/websrm-core';
import { computeBodySignatures } from './body-signer';
import { buildCanonicalBaseString, buildOfficialHeaders } from './headers-builder';
import { buildOfficialQr } from './qr-builder';
import { persistReceipt, PersistTarget } from './persist';
import { ComplianceProfile } from './profile-resolver';
import { fingerprintSha1 } from './signature-ecdsa';
import { createHash } from 'crypto';

/**
 * Format amount for Quebec WEB-SRM API
 * Format: [+/-]XXXXXXXXX.XX (13 characters total)
 * Example: +000000003.49
 */
function formatQuebecAmount(amountInCents: number): string {
  const amountInDollars = amountInCents / 100;
  const sign = amountInDollars >= 0 ? '+' : '-';
  const abs = Math.abs(amountInDollars).toFixed(2);
  const [integer, decimal] = abs.split('.');
  const padded = integer.padStart(9, '0');
  return `${sign}${padded}.${decimal}`;
}

/**
 * Format quantity for Quebec WEB-SRM API
 * Format: [+/-]XXXXX.XX (9 characters total)
 * Example: +00001.00
 */
function formatQuebecQuantity(qty: number): string {
  const sign = qty >= 0 ? '+' : '-';
  const abs = Math.abs(qty).toFixed(2);
  const [integer, decimal] = abs.split('.');
  const padded = integer.padStart(5, '0');
  return `${sign}${padded}.${decimal}`;
}

/**
 * Round amount using Quebec's "round half up" method
 * 0.005 and above rounds up to 0.01
 */
function roundQuebecAmount(amount: number): number {
  return Math.round(amount * 100) / 100;
}

/**
 * Transform internal TransactionRequest format to Quebec API transActu format
 *
 * Our format uses: idTrans, acti, typServ, dtTrans, montST, montTPS, montTVQ, montTot, desc[]
 * Quebec expects: noTrans, datTrans, typTrans, mont{}, items[], SEV{}, noTax{}, etc.
 */
function transformToQuebecFormat(reqTrans: TransactionRequest, profile: ComplianceProfile): any {
  // Map action types: ENR → VENTE, ANN → ANNULATION, MOD → MODIFICATION
  const typTransMap: Record<string, string> = {
    'ENR': 'VENTE',
    'ANN': 'ANNULATION',
    'MOD': 'MODIFICATION'
  };

  // Get certificate fingerprint (SHA-1 of DER-encoded cert, 40 hex chars)
  const emprCertifSEV = profile.certPem
    ? fingerprintSha1(profile.certPem)
    : '';

  // Generate 10-char numeric noTrans from UUID (Quebec format: X(10) numeric)
  // Extract last 10 digits from UUID hex representation
  const noTransNumeric = reqTrans.idTrans
    .replace(/[^0-9]/g, '') // Remove non-digits
    .slice(-10)             // Take last 10 digits
    .padStart(10, '0');     // Pad with zeros if needed

  // QUEBEC TAX RECALCULATION (per SW-73 requirements)
  // GST (TPS) = 5%, QST (TVQ) = 9.975%
  // SRS must recalculate to ensure: avantTax + TPS + TVQ = apresTax
  const subtotalCents = reqTrans.montST; // Amount in cents from Supabase
  const subtotalDollars = subtotalCents / 100;

  // Calculate Quebec taxes with official rates
  const gstCalculated = roundQuebecAmount(subtotalDollars * 0.05);
  const qstCalculated = roundQuebecAmount(subtotalDollars * 0.09975);
  const totalCalculated = roundQuebecAmount(subtotalDollars + gstCalculated + qstCalculated);

  // Convert back to cents for Quebec format functions
  const gstCents = Math.round(gstCalculated * 100);
  const qstCents = Math.round(qstCalculated * 100);
  const totalCents = Math.round(totalCalculated * 100);

  // Check if there's a difference from Supabase values (for ajus/mtdu if needed)
  const supabaseTotalCents = reqTrans.montTot;
  const differenceCents = totalCents - supabaseTotalCents;

  // Log recalculation for debugging
  console.log('[WEB-SRM] 🧮 Tax Recalculation:');
  console.log(`  Subtotal: $${subtotalDollars.toFixed(2)} (${subtotalCents} cents)`);
  console.log(`  GST (5%): $${gstCalculated.toFixed(2)} (${gstCents} cents)`);
  console.log(`  QST (9.975%): $${qstCalculated.toFixed(2)} (${qstCents} cents)`);
  console.log(`  Total (calculated): $${totalCalculated.toFixed(2)} (${totalCents} cents)`);
  console.log(`  Total (Supabase): $${(supabaseTotalCents / 100).toFixed(2)} (${supabaseTotalCents} cents)`);
  if (differenceCents !== 0) {
    console.log(`  ⚠️  Difference: ${differenceCents} cents (will use ajus/mtdu if needed)`);
  }

  return {
    // Transaction identification (Quebec field names)
    noTrans: noTransNumeric,
    datTrans: reqTrans.dtTrans,
    typTrans: 'RFER', // Quebec API requirement: ALL transactions use RFER (closing receipt type)
    modTrans: 'OPE', // Operating mode (normal operation)

    // Business sector (Restaurant/Bar/Cafeteria)
    sectActi: {
      abrvt: 'RBC',      // Restaurant/Bar/Cafeteria
      typServ: 'TBL',    // Table service
      noTabl: '====1',   // Table number (optional, use ==== for unknown)
      nbClint: '001'     // Number of clients (default 1)
    },
    commerElectr: reqTrans.eCommerce ? 'O' : 'N', // Quebec expects 'O' or 'N', not 'OUI'/'NON'

    // Amounts (Quebec expects specific format: [+/-]XXXXXXXXX.XX)
    // Use recalculated taxes to ensure: avantTax + TPS + TVQ = apresTax
    mont: {
      avantTax: formatQuebecAmount(subtotalCents),
      TPS: formatQuebecAmount(gstCents),
      TVQ: formatQuebecAmount(qstCents),
      apresTax: formatQuebecAmount(totalCents),
    },

    // FILE NUMBER (MANDATORY!) - Format: "ER0001" for restaurant test (SW-77 example)
    noDossFO: 'ER0001', // Restaurant file number (ER for restaurant, 0001 per SW-77 doc)

    // Line items (Quebec expects formatted quantities and amounts)
    items: reqTrans.desc.map((item: any) => ({
      qte: formatQuebecQuantity(item.qte),           // Format: [+/-]XXXXX.XX
      descr: item.desc,                              // "descr" not "desc"!
      prix: formatQuebecAmount(item.prixUnit),       // "prix" not "prixUnit"!
      tax: 'FP',                                     // Both TPS and TVQ apply (mandatory!)
      acti: 'RES'                                    // Restaurant activity subsector (mandatory!)
    })),

    // Payment method
    modPai: reqTrans.modPai,

    // Merchant name (TODO: Get from tenant profile)
    nomMandt: 'VizionMenu', // Placeholder

    // Printing format (Quebec codes: PAP/ELE/PEL/NON, not PAPIER/ABREGE)
    formImpr: 'PAP', // Always "PAP" (paper) for now
    modImpr: 'FAC',  // Always "FAC" (facture/bill) - only valid value

    // Certificate fingerprint
    emprCertifSEV,

    // UTC offset (Quebec requires trailing "N" for night/EST timezone)
    utc: '-05:00N',

    // Business relationship
    relaCommer: 'B2C',

    // Tax numbers (Quebec format: GST=9digits+RT+4digits, QST=10digits+TQ+4digits)
    noTax: {
      noTPS: profile.gstNumber || '567891234RT0001', // Must include RT0001 suffix
      noTVQ: profile.qstNumber || '5678912340TQ0001',
    },

    // SEV info (Quebec expects uppercase "SEV")
    SEV: {
      idSEV: profile.softwareId,
      idVersi: profile.softwareVersion,
      codCertif: profile.certCode,
      idPartn: profile.partnerId,
      versi: profile.versi,
      versiParn: profile.versiParn,
    },
  };
}

export interface WebSrmRuntimeOptions {
  persist: PersistTarget;
  previousActu?: string; // For signature chain (future enhancement)
  queueId?: string; // FO-116: Queue ID for unique transaction numbers (multiple transactions per order)
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
 * @param options - Runtime options (persist target, signature chain, queue ID)
 * @returns Generated WEB-SRM artifacts
 */
export async function handleOrderForWebSrm(
  order: any,
  profile: ComplianceProfile,
  options: WebSrmRuntimeOptions = { persist: 'files' }
): Promise<WebSrmResult> {
  // 0) Map Supabase order format to OrderShape (order_items → items)
  // FO-116: Add unique transaction ID from queue ID (for multiple transactions per order)
  const orderWithItems = {
    ...order,
    items: order.order_items || order.items || [],
    _transaction_id: options.queueId || order.id, // Use queue ID for unique transactions
  };

  // 1) Order → WEB-SRM internal format (signature placeholder, will be computed after)
  const reqTransInternal = mapOrderToReqTrans(orderWithItems, '='.repeat(88));

  // 1b) Transform internal format to Quebec API format (transActu)
  const transActuBase = transformToQuebecFormat(reqTransInternal, profile);

  // 2) Compute signature on transActu (WITHOUT signature field first)
  const sigs = computeBodySignatures(transActuBase, {
    privateKeyPem: profile.privateKeyPem,
    previousActu: options.previousActu, // Load from storage if available
  });

  // 2b) Build signature object and add to transActu (Quebec expects signa INSIDE transActu)
  const certFingerprint = profile.certPem
    ? createHash('sha256').update(profile.certPem, 'utf8').digest('hex')
    : '';

  // Signature timestamp in Quebec compact format (YYYYMMDDHHmmss)
  const now = new Date();
  const datActuCompact =
    now.getFullYear().toString() +
    (now.getMonth() + 1).toString().padStart(2, '0') +
    now.getDate().toString().padStart(2, '0') +
    now.getHours().toString().padStart(2, '0') +
    now.getMinutes().toString().padStart(2, '0') +
    now.getSeconds().toString().padStart(2, '0');

  const signa = {
    datActu: datActuCompact, // Quebec compact format (YYYYMMDDHHmmss)
    actu: sigs.actu,
    preced: sigs.preced,
  };

  const transActu = {
    ...transActuBase,
    signa,
  };

  // 2c) Build complete Quebec payload: reqTrans/transActu structure
  const payload = {
    reqTrans: {
      transActu,
    },
  };

  // 3) Base string + official headers
  // NOTE: IDAPPRL header is ONLY for enrolment/annulation/modification, NOT for /transaction
  // Quebec API: "Le champ d'entête IDAPPRL doit être absent" for transaction endpoint
  const baseHeaders: any = {
    // IDAPPRL: NOT USED for /transaction (Quebec requirement)
    IDSEV: profile.softwareId,
    IDVERSI: profile.softwareVersion,
    CODCERTIF: profile.certCode,
    IDPARTN: profile.partnerId,
    VERSI: profile.versi,
    VERSIPARN: profile.versiParn,
    ENVIRN: profile.env,
  };

  // Add CASESSAI for both DEV and ESSAI (DEV always uses "000.000")
  if (profile.env === 'DEV' || profile.env === 'ESSAI') {
    baseHeaders.CASESSAI = profile.casEssai || '000.000';
  }

  const base = buildCanonicalBaseString(
    'POST',
    '/transaction',
    sigs.canonical,
    baseHeaders
  );

  const headers = buildOfficialHeaders(
    {
      env: profile.env,
      caseEssai: (profile.env === 'DEV' || profile.env === 'ESSAI') ? (profile.casEssai || '000.000') : undefined, // CASESSAI for both DEV and ESSAI (DEV uses "000.000")
      idApprl: '', // Empty for transaction endpoint - Quebec: "IDAPPRL doit être absent"
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

  // 4) QR code generation (use reqTransInternal for QR - has idTrans, dtTrans, montTot)
  // SW-76: Use frontend URL for QR code (customer transaction verification)
  const qrBaseUrl = process.env.QR_BASE_URL || 'https://dev-vizionmenu.vercel.app/verify';
  const qr = buildOfficialQr(
    {
      idTrans: reqTransInternal.idTrans,
      dtTrans: reqTransInternal.dtTrans,
      montTot: reqTransInternal.montTot,
    },
    sigs.actu,
    { baseUrl: qrBaseUrl }
  );

  // 5) Persist locally (files/db/none)
  await persistReceipt(options.persist, {
    tenantId: order.tenant_id || profile.tenantId,
    orderId: order.id,
    transactionQueueId: options.queueId, // FO-116: 1:1 receipt-to-transaction mapping
    printMode: 'PAPER',
    format: 'CUSTOMER',
    signaPreced: sigs.preced,
    signaActu: sigs.actu,
    payloadHash: sigs.sha256Hex,
    qrData: qr,
    websrmTransactionId: transActu.noTrans,
    transactionTimestamp: transActu.datTrans || new Date().toISOString(),
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
  const reqFer = mapClosingToReqFer(closing, '='.repeat(88));

  // 1b) Wrap in transaction/reqFer structure (Quebec API format)
  const payload = {
    transaction: {
      reqFer
    }
  };

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
  // SW-76: Use frontend URL for QR code (customer transaction verification)
  const qrBaseUrl = process.env.QR_BASE_URL || 'https://dev-vizionmenu.vercel.app/verify';
  const qr = buildOfficialQr(payload, sigs.actu, { baseUrl: qrBaseUrl });

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
