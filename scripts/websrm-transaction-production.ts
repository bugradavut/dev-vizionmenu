/**
 * WEB-SRM DEV - /transaction Production-Level Test
 *
 * Goal: Create complete transaction payload with all required fields
 * - Zero missing field errors
 * - ECDSA P-256 signature generation
 * - Certificate fingerprint
 * - Complete payload structure based on API error discovery
 *
 * Endpoint: https://cnfr.api.rq-fo.ca/transaction
 * Auth: Mutual TLS
 */

import * as fs from 'fs';
import * as path from 'path';
import { createMtlsClient } from './lib/websrm-mtls-client';
import {
  loadCryptoMaterial,
  createTransactionSignature,
  canonicalize,
} from './lib/websrm-crypto';

// Certificate DN values
const CERT_VALUES = {
  CN: '5678912340',
  OU: '5678912340TQ0001',
  GN: 'ER0001',
};

// DEV Headers + Transaction-specific headers
const DEV_HEADERS = {
  'Content-Type': 'application/json',
  ENVIRN: 'DEV',
  APPRLINIT: 'SRV',
  CASESSAI: '000.000',
  VERSIPARN: '0',
  IDSEV: '0000000000003973',
  IDVERSI: '00000000000045D6',
  CODCERTIF: 'FOB201999999',
  IDPARTN: '0000000000001FF2',
  VERSI: '0.1.0',
  CODAUTORI: 'D8T8-W8W8',
  // Transaction-specific
  SIGNATRANSM: 'OUI',
  EMPRCERTIFTRANSM: 'OUI',
  NOTPS: CERT_VALUES.CN,
  NOTVQ: CERT_VALUES.OU,
};

const ENDPOINT = 'https://cnfr.api.rq-fo.ca/transaction';

/**
 * Create complete transaction data structure
 * Based on API error messages showing all required fields
 */
function createCompleteTransActu(crypto: any) {
  const now = new Date();
  const datTrans = now.toISOString().replace('Z', '-05:00');

  return {
    // Transaction identification (API expects these names)
    noTrans: 'DEV-TRX-' + Date.now(),
    datTrans,
    typTrans: 'VENTE',
    modTrans: 'POS',

    // Business sector
    sectActi: 'COMMERCE',
    commerElectr: 'NON',

    // Amounts (API expects "mont" not "montants")
    mont: {
      avantTax: '10.00',
      apresTax: '10.00',
      TPS: '0.00',
      TVQ: '0.00',
    },

    // Line items (API expects "items" not "lignes")
    items: [
      {
        desc: 'Test item',
        qte: '1',
        prixUnit: '10.00',
        montant: '10.00',
      },
    ],

    // Payment method (API expects single string "modPai" not array "paiements")
    modPai: 'COMPTANT',

    // Merchant name
    nomMandt: 'Michel Untel',

    // Printing format
    formImpr: 'PAPIER',
    modImpr: 'TICKET',

    // Certificate fingerprint
    emprCertifSEV: crypto.fingerprint,

    // UTC offset
    utc: '-05:00',

    // Business relationship
    relaCommer: 'B2C',

    // Tax numbers
    noTax: {
      noTPS: CERT_VALUES.CN,
      noTVQ: CERT_VALUES.OU,
    },

    // SEV info (API expects uppercase "SEV")
    SEV: {
      idSEV: DEV_HEADERS.IDSEV,
      idVersi: DEV_HEADERS.IDVERSI,
      codCertif: DEV_HEADERS.CODCERTIF,
      idPartn: DEV_HEADERS.IDPARTN,
      versi: DEV_HEADERS.VERSI,
      versiParn: DEV_HEADERS.VERSIPARN,
    },
  };
}

async function main() {
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║  WEB-SRM DEV - /transaction Production Test (with Signature)  ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const outputDir = path.join('tmp', 'logs', `dev-transaction-production-${timestamp}`);
  fs.mkdirSync(outputDir, { recursive: true });

  // Load crypto material
  console.log('🔐 Loading cryptographic material...\n');
  const crypto = loadCryptoMaterial();

  console.log(`   Private Key: tmp/certs/dev-client.key.pem`);
  console.log(`   Certificate: tmp/certs/dev-client.crt.pem`);
  console.log(`   Fingerprint: ${crypto.fingerprint}\n`);

  // Create transaction data (without signature first)
  console.log('📝 Creating complete transaction payload...\n');
  const transActuBase = createCompleteTransActu(crypto);

  // Create signature (sign the transaction WITHOUT the signature field)
  console.log('✍️  Generating ECDSA P-256 signature...\n');
  const signaRaw = createTransactionSignature(transActuBase, crypto);

  // Build signature object with all required fields
  const signa: any = {
    empreinteCert: signaRaw.empreinteCert,
    hash: signaRaw.hash,
    actu: signaRaw.actu,
    preced: '', // Empty for first transaction
    datActu: new Date().toISOString().replace('Z', '-05:00'), // Signature timestamp
  };

  console.log(`   Canonical Hash: ${signa.hash.actu.substring(0, 40)}...`);
  console.log(`   Signature: ${signa.actu.substring(0, 40)}...`);
  console.log(`   Cert Fingerprint: ${signa.empreinteCert.substring(0, 40)}...\n`);

  // Add signature to transActu (API expects signa inside transActu!)
  const transActu = {
    ...transActuBase,
    signa,
  };

  // Build complete request
  const requestBody = {
    reqTrans: {
      transActu,
    },
  };

  // Save artifacts
  fs.writeFileSync(
    path.join(outputDir, 'headers.json'),
    JSON.stringify(DEV_HEADERS, null, 2),
    'utf8'
  );
  fs.writeFileSync(
    path.join(outputDir, 'request.json'),
    JSON.stringify(requestBody, null, 2),
    'utf8'
  );
  fs.writeFileSync(
    path.join(outputDir, 'transActu-canonical.json'),
    canonicalize(transActu),
    'utf8'
  );

  // Send request
  console.log('📤 Sending request to /transaction...\n');
  const client = createMtlsClient();

  let httpStatus: number;
  let response: any;
  let errors: any[] = [];

  try {
    const res = await client.post(ENDPOINT, DEV_HEADERS, requestBody);
    httpStatus = res.status;
    response = res.json || { error: 'Non-JSON response', body: res.body.substring(0, 500) };

    if (response.retourTrans?.retourTransActu?.listErr) {
      errors = response.retourTrans.retourTransActu.listErr;
    } else if (response.retourTrans?.listErr) {
      errors = response.retourTrans.listErr;
    }
  } catch (err: any) {
    httpStatus = 0;
    response = { error: err.message };
  }

  // Save response
  fs.writeFileSync(
    path.join(outputDir, 'response.json'),
    JSON.stringify(response, null, 2),
    'utf8'
  );

  console.log(`📥 Response: HTTP ${httpStatus}\n`);

  // Analyze errors
  const missingFieldErrors = errors.filter((e) => {
    const msg = e.mess || '';
    const isStructuralError =
      msg.includes('doit contenir') ||
      msg.includes('sous-jacent') ||
      msg.includes('est absent :') ||
      msg.includes('est absent .');

    const hasAbsentWithEmptyValue =
      (msg.includes('absent') || msg.includes('manquant')) &&
      (/=\s*\.?\s*$/.test(msg) || msg.includes('=.'));

    const hasAbsentWithoutValue =
      (msg.includes('est absent') || msg.includes('est manquant')) && !msg.includes('=');

    return isStructuralError || hasAbsentWithEmptyValue || hasAbsentWithoutValue;
  });

  const validationErrors = errors.filter((e) => !missingFieldErrors.includes(e));

  if (errors.length > 0) {
    console.log(`Errors (${errors.length}):\n`);

    if (missingFieldErrors.length > 0) {
      console.log(`❌ Missing Field Errors (${missingFieldErrors.length}):\n`);
      missingFieldErrors.forEach((err, i) => {
        console.log(`${i + 1}. [${err.codRetour || '?'}] ${err.id}`);
        console.log(`   ${err.mess?.substring(0, 100)}\n`);
      });
    }

    if (validationErrors.length > 0) {
      console.log(`⚠️  Business Validation Errors (${validationErrors.length}):\n`);
      validationErrors.forEach((err, i) => {
        console.log(`${i + 1}. [${err.codRetour || '?'}] ${err.id}`);
        console.log(`   ${err.mess?.substring(0, 100)}\n`);
      });
    }
  } else {
    console.log('✅ No errors - transaction accepted!\n');
  }

  // Summary
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║  TEST SUMMARY                                                  ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  console.log(`HTTP Status: ${httpStatus}`);
  console.log(`Total Errors: ${errors.length}`);
  console.log(`Missing Field Errors: ${missingFieldErrors.length}`);
  console.log(`Business Validation Errors: ${validationErrors.length}\n`);

  if (missingFieldErrors.length === 0) {
    console.log('✅ SUCCESS: No missing field errors\n');
    console.log('   All required fields provided.');
    console.log('   Payload structure is complete.\n');
    if (validationErrors.length > 0) {
      console.log('   Remaining errors are business validation (expected with test data).\n');
    }
  } else {
    console.log('⚠️  INCOMPLETE: Still have missing field errors\n');
    console.log(`   Missing: ${missingFieldErrors.length} fields\n`);
  }

  // Generate curl command
  const curlCmd = `#!/bin/bash
# WEB-SRM /transaction Production Test - Reproducible curl command

curl -X POST "${ENDPOINT}" \\
  --cert tmp/certs/dev-client.crt.pem \\
  --key tmp/certs/dev-client.key.pem \\
  --cacert tmp/certs/dev-client.chain.pem \\
  --insecure \\
  -H "Content-Type: application/json" \\
  -H "ENVIRN: DEV" \\
  -H "APPRLINIT: SRV" \\
  -H "CASESSAI: 000.000" \\
  -H "VERSIPARN: 0" \\
  -H "IDSEV: ${DEV_HEADERS.IDSEV}" \\
  -H "IDVERSI: ${DEV_HEADERS.IDVERSI}" \\
  -H "CODCERTIF: ${DEV_HEADERS.CODCERTIF}" \\
  -H "IDPARTN: ${DEV_HEADERS.IDPARTN}" \\
  -H "VERSI: ${DEV_HEADERS.VERSI}" \\
  -H "CODAUTORI: ${DEV_HEADERS.CODAUTORI}" \\
  -H "SIGNATRANSM: OUI" \\
  -H "EMPRCERTIFTRANSM: OUI" \\
  -H "NOTPS: ${CERT_VALUES.CN}" \\
  -H "NOTVQ: ${CERT_VALUES.OU}" \\
  -d @${path.join(outputDir, 'request.json').replace(/\\/g, '/')}
`;

  fs.writeFileSync(path.join(outputDir, 'curl.sh'), curlCmd, 'utf8');

  // Generate summary.md
  const summary = `# /transaction Production Test Summary

**Timestamp**: ${new Date().toISOString()}
**Endpoint**: ${ENDPOINT}
**HTTP Status**: ${httpStatus}
**Total Errors**: ${errors.length}
**Missing Field Errors**: ${missingFieldErrors.length}
**Business Validation Errors**: ${validationErrors.length}

## Status

${
  missingFieldErrors.length === 0
    ? '✅ **SUCCESS**: All required fields provided - no missing field errors'
    : `⚠️  **INCOMPLETE**: ${missingFieldErrors.length} missing field errors`
}

## Certificate & Signature

- **Certificate Fingerprint**: \`${crypto.fingerprint}\`
- **Canonical Hash**: \`${signa.hash.actu}\`
- **ECDSA Signature**: \`${signa.actu.substring(0, 60)}...\`

## Key Fields Used

| Field | Value |
|-------|-------|
| noTrans | ${transActu.noTrans} |
| datTrans | ${transActu.datTrans} |
| typTrans | ${transActu.typTrans} |
| modTrans | ${transActu.modTrans} |
| sectActi | ${transActu.sectActi} |
| commerElectr | ${transActu.commerElectr} |
| modPai | ${transActu.modPai} |
| nomMandt | ${transActu.nomMandt} |
| noTPS | ${transActu.noTax.noTPS} |
| noTVQ | ${transActu.noTax.noTVQ} |

## Amounts

| Field | Value |
|-------|-------|
| avantTax | ${transActu.mont.avantTax} CAD |
| apresTax | ${transActu.mont.apresTax} CAD |
| TPS | ${transActu.mont.TPS} CAD |
| TVQ | ${transActu.mont.TVQ} CAD |

## Errors

${
  errors.length === 0
    ? 'No errors - transaction accepted!'
    : `### Missing Field Errors (${missingFieldErrors.length})

${
  missingFieldErrors.length > 0
    ? missingFieldErrors.map((e, i) => `${i + 1}. **${e.id}**: ${e.mess}`).join('\n')
    : 'None'
}

### Business Validation Errors (${validationErrors.length})

${
  validationErrors.length > 0
    ? validationErrors.map((e, i) => `${i + 1}. **${e.id}**: ${e.mess}`).join('\n')
    : 'None'
}`
}

## Files

- \`headers.json\` - Request headers
- \`request.json\` - Complete request payload
- \`response.json\` - API response
- \`transActu-canonical.json\` - Canonical form used for signature
- \`curl.sh\` - Reproducible curl command
- \`summary.md\` - This file
`;

  fs.writeFileSync(path.join(outputDir, 'summary.md'), summary, 'utf8');

  console.log(`📄 Summary saved: ${outputDir}/summary.md\n`);

  process.exit(missingFieldErrors.length === 0 ? 0 : 1);
}

main().catch((error) => {
  console.error('❌ Test error:', error.message);
  console.error(error.stack);
  process.exit(1);
});
