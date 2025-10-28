/**
 * WEB-SRM DEV - /transaction Complete Test (Iterative)
 *
 * Goal: Iteratively build complete payload by analyzing error messages
 * Expected: No missing field errors (only business validation errors)
 *
 * Endpoint: https://cnfr.api.rq-fo.ca/transaction
 * Auth: Mutual TLS
 */

import * as fs from 'fs';
import * as path from 'path';
import { createMtlsClient, getCertPaths } from './lib/websrm-mtls-client';

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
  // Transaction-specific (from error messages)
  SIGNATRANSM: 'OUI',
  EMPRCERTIFTRANSM: 'OUI',
  NOTPS: CERT_VALUES.CN,
  NOTVQ: CERT_VALUES.OU,
};

const ENDPOINT = 'https://cnfr.api.rq-fo.ca/transaction';

// Payload iterations (progressively complete)
const PAYLOAD_ITERATIONS = [
  // Iteration 1: Minimal with transActu structure
  {
    reqTrans: {
      transActu: {
        modif: 'AJT',
      },
    },
  },
  // Iteration 2: Add basic transaction fields
  {
    reqTrans: {
      transActu: {
        modif: 'AJT',
        idTrans: 'DEV-TRX-0001',
        horodatage: new Date().toISOString().replace('Z', '-05:00'),
      },
    },
  },
  // Iteration 3: Add transaction details
  {
    reqTrans: {
      transActu: {
        modif: 'AJT',
        idTrans: 'DEV-TRX-0001',
        horodatage: new Date().toISOString().replace('Z', '-05:00'),
        total: {
          montant: '10.00',
          devise: 'CAD',
        },
        lignes: [
          {
            type: 'VENTE',
            qte: '1',
            prixUnit: '10.00',
            tps: '0.50',
            tvq: '1.00',
          },
        ],
      },
    },
  },
];

interface IterationResult {
  iteration: number;
  payload: any;
  httpStatus: number;
  errors: any[];
  missingFieldErrors: string[];
}

async function testIteration(
  client: any,
  iteration: number,
  payload: any,
  outputDir: string
): Promise<IterationResult> {
  console.log(`\n${'='.repeat(70)}`);
  console.log(`Iteration ${iteration + 1}/${PAYLOAD_ITERATIONS.length}`);
  console.log(`${'='.repeat(70)}\n`);

  const iterDir = path.join(outputDir, `iteration-${iteration + 1}`);
  fs.mkdirSync(iterDir, { recursive: true });

  // Save request
  fs.writeFileSync(path.join(iterDir, 'request.json'), JSON.stringify(payload, null, 2), 'utf8');
  fs.writeFileSync(
    path.join(iterDir, 'headers.json'),
    JSON.stringify(DEV_HEADERS, null, 2),
    'utf8'
  );

  console.log(`📤 Sending payload:\n${JSON.stringify(payload, null, 2)}\n`);

  // Make request
  let httpStatus: number;
  let response: any;
  let errors: any[] = [];

  try {
    const res = await client.post(ENDPOINT, DEV_HEADERS, payload);
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
    path.join(iterDir, 'response.json'),
    JSON.stringify(response, null, 2),
    'utf8'
  );

  console.log(`📥 Response: HTTP ${httpStatus}\n`);

  // Analyze errors - only flag truly missing fields (not validation errors)
  const missingFieldErrors = errors
    .filter((e) => {
      const msg = e.mess || '';

      // Check if it's truly absent vs just invalid:
      // - "champ est absent" without value assignment = missing
      // - "absent ou invalide : X=value" with actual value = invalid (not missing)
      // - "absent ou invalide : X=." with empty value = missing
      // - Structural errors ("doit contenir", "sous-jacent") = missing structure

      const isStructuralError =
        msg.includes('doit contenir') ||
        msg.includes('sous-jacent') ||
        msg.includes('est absent :') ||  // "Le champ est absent : field/path"
        msg.includes('est absent .');    // "Un champ est absent."

      const hasAbsentWithEmptyValue =
        (msg.includes('absent') || msg.includes('manquant')) &&
        (/=\s*\.?\s*$/.test(msg) || msg.includes('=.'));

      const hasAbsentWithoutValue =
        (msg.includes('est absent') || msg.includes('est manquant')) &&
        !msg.includes('=');  // No value shown means truly absent

      return isStructuralError || hasAbsentWithEmptyValue || hasAbsentWithoutValue;
    })
    .map((e) => e.mess);

  if (errors.length > 0) {
    console.log(`Errors (${errors.length}):\n`);
    errors.forEach((err, i) => {
      const isMissing =
        err.mess?.includes('absent') || err.mess?.includes('manquant') ? '❌' : '⚠️ ';
      console.log(`${i + 1}. ${isMissing} [${err.codRetour || '?'}] ${err.id}`);
      console.log(`   ${err.mess?.substring(0, 100)}\n`);
    });
  }

  if (missingFieldErrors.length > 0) {
    console.log(`❌ Missing field errors: ${missingFieldErrors.length}\n`);
  } else {
    console.log(`✅ No missing field errors\n`);
  }

  return {
    iteration: iteration + 1,
    payload,
    httpStatus,
    errors,
    missingFieldErrors,
  };
}

async function main() {
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║  WEB-SRM DEV - /transaction Complete Test (Iterative)         ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const outputDir = path.join('tmp', 'logs', `dev-transaction-complete-${timestamp}`);
  fs.mkdirSync(outputDir, { recursive: true });

  const client = createMtlsClient();
  const certPaths = client.getPaths();

  console.log(`🔐 Using mTLS certificates:`);
  console.log(`   Key: ${certPaths.key}`);
  console.log(`   Cert: ${certPaths.cert}`);
  console.log(`   CA: ${certPaths.chain}\n`);

  console.log(`📋 Certificate values:`);
  console.log(`   CN (noTPS): ${CERT_VALUES.CN}`);
  console.log(`   OU (noTVQ): ${CERT_VALUES.OU}\n`);

  console.log(`🔄 Testing ${PAYLOAD_ITERATIONS.length} payload iterations...\n`);

  const results: IterationResult[] = [];

  // Run iterations
  for (let i = 0; i < PAYLOAD_ITERATIONS.length; i++) {
    const result = await testIteration(client, i, PAYLOAD_ITERATIONS[i], outputDir);
    results.push(result);

    // Stop if no missing field errors
    if (result.missingFieldErrors.length === 0) {
      console.log(`\n✅ Success! No missing field errors in iteration ${i + 1}`);
      console.log(`   Stopping iterations early.\n`);
      break;
    }
  }

  // Summary
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║  ITERATION SUMMARY                                             ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  console.log('┌──────────┬────────┬─────────────┬──────────────────┐');
  console.log('│ Iteration│ Status │ Total Errors│ Missing Fields   │');
  console.log('├──────────┼────────┼─────────────┼──────────────────┤');

  results.forEach((r) => {
    const iter = String(r.iteration).padEnd(9);
    const status = String(r.httpStatus).padEnd(6);
    const totalErr = String(r.errors.length).padEnd(12);
    const missing = String(r.missingFieldErrors.length).padEnd(17);
    console.log(`│ ${iter}│ ${status} │ ${totalErr}│ ${missing}│`);
  });
  console.log('└──────────┴────────┴─────────────┴──────────────────┘\n');

  const finalResult = results[results.length - 1];

  if (finalResult.missingFieldErrors.length === 0) {
    console.log('✅ SUCCESS: No missing field errors\n');
    console.log(`   Final iteration: ${finalResult.iteration}`);
    console.log(`   HTTP Status: ${finalResult.httpStatus}`);
    console.log(`   Total Errors: ${finalResult.errors.length}`);
    console.log(`   (Remaining errors are business validation)\n`);
  } else {
    console.log('⚠️  INCOMPLETE: Still have missing field errors\n');
    console.log(`   Missing field errors: ${finalResult.missingFieldErrors.length}\n`);
    finalResult.missingFieldErrors.forEach((msg) => console.log(`   - ${msg}`));
    console.log('');
  }

  // Final summary document
  const summary = `# /transaction Complete Test Summary (Iterative)

**Timestamp**: ${new Date().toISOString()}
**Endpoint**: ${ENDPOINT}
**Iterations**: ${results.length}
**Final Status**: ${finalResult.missingFieldErrors.length === 0 ? '✅ SUCCESS' : '⚠️  INCOMPLETE'}

## Certificate Values

- **CN** (noTPS): ${CERT_VALUES.CN}
- **OU** (noTVQ): ${CERT_VALUES.OU}
- **GN**: ${CERT_VALUES.GN}

## Headers (Complete)

\`\`\`json
${JSON.stringify(DEV_HEADERS, null, 2)}
\`\`\`

## Iteration Results

| Iteration | HTTP | Total Errors | Missing Field Errors | Status |
|-----------|------|--------------|----------------------|--------|
${results
  .map(
    (r) =>
      `| ${r.iteration} | ${r.httpStatus} | ${r.errors.length} | ${r.missingFieldErrors.length} | ${r.missingFieldErrors.length === 0 ? '✅' : '❌'} |`
  )
  .join('\n')}

## Final Payload (Iteration ${finalResult.iteration})

\`\`\`json
${JSON.stringify(finalResult.payload, null, 2)}
\`\`\`

## Final Response

\`\`\`json
${JSON.stringify(results[results.length - 1].errors, null, 2)}
\`\`\`

## Analysis

${
  finalResult.missingFieldErrors.length === 0
    ? `✅ **Success**: All required fields provided. No missing field errors.

**Remaining Errors**: ${finalResult.errors.length}
${
  finalResult.errors.length > 0
    ? `\nThese are business validation errors (not structural errors):\n${finalResult.errors.map((e) => `- ${e.id}: ${e.mess}`).join('\n')}`
    : 'No errors - transaction structure is valid.'
}`
    : `⚠️  **Incomplete**: Still missing ${finalResult.missingFieldErrors.length} required fields.

${finalResult.missingFieldErrors.map((msg) => `- ${msg}`).join('\n')}

**Next Steps**: Add these fields to the next iteration.`
}

## Files

${results.map((r) => `- \`iteration-${r.iteration}/\`: Iteration ${r.iteration} artifacts`).join('\n')}
`;

  fs.writeFileSync(path.join(outputDir, 'summary.md'), summary, 'utf8');

  console.log(`📄 Summary saved: ${outputDir}/summary.md\n`);

  process.exit(finalResult.missingFieldErrors.length === 0 ? 0 : 1);
}

main().catch((error) => {
  console.error('❌ Test error:', error.message);
  process.exit(1);
});
