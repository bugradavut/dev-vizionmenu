/**
 * WEB-SRM Configuration Validator
 *
 * Purpose: Validate CSR against GOLDEN CONFIGURATION
 * This prevents regressions by checking all critical requirements
 *
 * Run: npx tsx scripts/websrm-validate-config.ts <csr-file>
 *
 * Exit Codes:
 *   0 = PASS (CSR meets golden config)
 *   1 = FAIL (CSR violates golden config)
 */

import { execSync } from 'child_process';
import { readFileSync } from 'fs';
import * as crypto from 'crypto';

// ANSI colors for output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  bold: '\x1b[1m',
};

interface ValidationResult {
  passed: boolean;
  rule: string;
  message: string;
  critical: boolean;
}

const results: ValidationResult[] = [];

function pass(rule: string, message: string, critical = false) {
  results.push({ passed: true, rule, message, critical });
  console.log(`${colors.green}✅ ${message}${colors.reset}`);
}

function fail(rule: string, message: string, critical = true) {
  results.push({ passed: false, rule, message, critical });
  console.log(`${colors.red}${critical ? '❌' : '⚠️'} ${message}${colors.reset}`);
}

function validateCSR(csrPath: string): boolean {
  console.log(`${colors.bold}╔════════════════════════════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.bold}║  WEB-SRM Golden Configuration Validator                       ║${colors.reset}`);
  console.log(`${colors.bold}╚════════════════════════════════════════════════════════════════╝${colors.reset}\n`);

  console.log(`📄 CSR File: ${csrPath}\n`);

  // Read CSR file
  let csrContent: string;
  try {
    csrContent = readFileSync(csrPath, 'utf8');
  } catch (err: any) {
    fail('file-read', `Failed to read CSR file: ${err.message}`);
    return false;
  }

  // Rule 1: PEM Format - Must be exactly 3 lines
  console.log(`${colors.blue}═══ PEM Format Validation ═══${colors.reset}`);
  const lines = csrContent.split('\n').filter(l => l.length > 0);
  if (lines.length === 3) {
    pass('pem-line-count', 'PEM has exactly 3 lines (BEGIN, base64, END)', true);
  } else {
    fail('pem-line-count', `PEM has ${lines.length} lines, expected 3 (BEGIN, base64, END)`, true);
  }

  // Rule 2: Base64 is single line (no wrapping)
  if (lines.length >= 2) {
    const base64Line = lines[1];
    if (!base64Line.includes('\r') && !base64Line.includes('\n')) {
      pass('pem-no-wrap', `Base64 is single line (${base64Line.length} chars, no wrapping)`, true);
    } else {
      fail('pem-no-wrap', 'Base64 contains line breaks (should be single continuous line)', true);
    }
  }

  // Rule 3: OpenSSL Parse
  console.log(`\n${colors.blue}═══ OpenSSL CSR Validation ═══${colors.reset}`);
  let opensslOutput: string;
  try {
    opensslOutput = execSync(`openssl req -in "${csrPath}" -noout -text`, {
      encoding: 'utf8',
    });
    pass('openssl-parse', 'CSR is structurally valid (OpenSSL parse successful)');
  } catch (err: any) {
    fail('openssl-parse', `OpenSSL failed to parse CSR: ${err.message}`);
    return false;
  }

  // Rule 4: Algorithm must be ECDSA P-256 + SHA-256
  if (opensslOutput.includes('Public Key Algorithm: id-ecPublicKey') &&
      opensslOutput.includes('NIST CURVE: P-256') &&
      opensslOutput.includes('Signature Algorithm: ecdsa-with-SHA256')) {
    pass('algorithm', 'Algorithm: ECDSA P-256 + SHA-256', true);
  } else {
    fail('algorithm', 'Algorithm must be ECDSA P-256 + SHA-256', true);
  }

  // Rule 5: KeyUsage must have digitalSignature + nonRepudiation
  console.log(`\n${colors.blue}═══ KeyUsage Validation ═══${colors.reset}`);
  const keyUsageMatch = opensslOutput.match(/X509v3 Key Usage:(.*?)(\n\s+.*?)(?=\n\S|\n$)/s);
  if (keyUsageMatch) {
    const keyUsageText = keyUsageMatch[0];
    const hasDigitalSignature = keyUsageText.includes('Digital Signature');
    const hasNonRepudiation = keyUsageText.includes('Non Repudiation');
    const hasOtherBits = keyUsageText.match(/Key Encipherment|Data Encipherment|Key Agreement|Certificate Sign|CRL Sign/);

    if (hasDigitalSignature && hasNonRepudiation && !hasOtherBits) {
      pass('keyusage-bits', 'KeyUsage: digitalSignature + nonRepudiation ONLY (no other bits)', true);
    } else {
      if (!hasDigitalSignature) {
        fail('keyusage-bits', 'KeyUsage: digitalSignature bit is MISSING (REQUIRED)', true);
      }
      if (!hasNonRepudiation) {
        fail('keyusage-bits', 'KeyUsage: nonRepudiation bit is MISSING (REQUIRED)', true);
      }
      if (hasOtherBits) {
        fail('keyusage-bits', `KeyUsage: Contains extra bits (${hasOtherBits[0]}) - should ONLY have digitalSignature + nonRepudiation`, true);
      }
    }
  } else {
    fail('keyusage-bits', 'KeyUsage extension not found in CSR', true);
  }

  // Rule 6: ExtendedKeyUsage should NOT be present (server adds it)
  console.log(`\n${colors.blue}═══ ExtendedKeyUsage Validation ═══${colors.reset}`);
  if (!opensslOutput.includes('X509v3 Extended Key Usage:')) {
    pass('eku-absent', 'ExtendedKeyUsage: NOT present (server adds clientAuth automatically)', false);
  } else {
    fail('eku-absent', 'ExtendedKeyUsage: Should NOT be in CSR (server adds clientAuth)', false);
  }

  // Rule 7: Subject DN validation
  console.log(`\n${colors.blue}═══ Subject DN Validation ═══${colors.reset}`);
  const subjectMatch = opensslOutput.match(/Subject: (.*?)(?=\n\S)/s);
  if (subjectMatch) {
    const subject = subjectMatch[1].replace(/\n/g, ' ').trim();
    console.log(`   DN: ${subject}\n`);

    // Check for required fields
    const hasC = subject.includes('C=CA');
    const hasST = subject.includes('ST=QC');
    const hasL = subject.includes('L=-05:00');
    const hasSN = subject.includes('SN=Certificat du serveur');
    const hasO = subject.match(/O=(RBC-|FOB-)/);
    const hasCN = subject.match(/CN=/);

    // CRITICAL: Check that SN uses surname (shows as "SN=" in OpenSSL, not "serialNumber=")
    // OpenSSL displays 2.5.4.4 as "SN=" and 2.5.4.5 as "serialNumber="
    const usesSerialNumberOID = subject.includes('serialNumber=');

    if (hasC) pass('dn-country', 'DN: C=CA');
    else fail('dn-country', 'DN: C=CA is MISSING', true);

    if (hasST) pass('dn-state', 'DN: ST=QC');
    else fail('dn-state', 'DN: ST=QC is MISSING', true);

    if (hasL) pass('dn-locality', 'DN: L=-05:00');
    else fail('dn-locality', 'DN: L=-05:00 is MISSING', true);

    if (hasSN && !usesSerialNumberOID) {
      pass('dn-surname', 'DN: SN=Certificat du serveur (using surname OID 2.5.4.4)', true);
    } else if (usesSerialNumberOID) {
      fail('dn-surname', 'DN: Using serialNumber OID (2.5.4.5) - must use surname (2.5.4.4)!', true);
    } else {
      fail('dn-surname', 'DN: SN=Certificat du serveur is MISSING', true);
    }

    if (hasO) pass('dn-org', `DN: Organization format is valid (${hasO[0]})`);
    else fail('dn-org', 'DN: Organization must be RBC-* or FOB-*', true);

    if (hasCN) pass('dn-cn', 'DN: CN is present');
    else fail('dn-cn', 'DN: CN is MISSING', true);
  } else {
    fail('dn-parse', 'Failed to parse Subject DN from CSR', true);
  }

  return true;
}

function printSummary() {
  console.log(`\n${colors.bold}╔════════════════════════════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.bold}║  VALIDATION SUMMARY                                            ║${colors.reset}`);
  console.log(`${colors.bold}╚════════════════════════════════════════════════════════════════╝${colors.reset}\n`);

  const criticalResults = results.filter(r => r.critical);
  const nonCriticalResults = results.filter(r => !r.critical);

  const criticalPassed = criticalResults.filter(r => r.passed).length;
  const criticalFailed = criticalResults.filter(r => !r.passed).length;
  const nonCriticalPassed = nonCriticalResults.filter(r => r.passed).length;
  const nonCriticalFailed = nonCriticalResults.filter(r => !r.passed).length;

  console.log(`Critical Rules:     ${criticalPassed}/${criticalResults.length} passed`);
  console.log(`Non-Critical Rules: ${nonCriticalPassed}/${nonCriticalResults.length} passed\n`);

  if (criticalFailed > 0) {
    console.log(`${colors.red}${colors.bold}❌ VALIDATION FAILED${colors.reset}`);
    console.log(`${colors.red}   ${criticalFailed} critical rule(s) violated${colors.reset}`);
    console.log(`${colors.red}   CSR does NOT meet GOLDEN CONFIGURATION${colors.reset}\n`);
    return false;
  } else if (nonCriticalFailed > 0) {
    console.log(`${colors.yellow}${colors.bold}⚠️  VALIDATION PASSED WITH WARNINGS${colors.reset}`);
    console.log(`${colors.yellow}   ${nonCriticalFailed} non-critical rule(s) violated${colors.reset}`);
    console.log(`${colors.yellow}   CSR may work but deviates from recommended config${colors.reset}\n`);
    return true;
  } else {
    console.log(`${colors.green}${colors.bold}✅ VALIDATION PASSED${colors.reset}`);
    console.log(`${colors.green}   CSR meets GOLDEN CONFIGURATION${colors.reset}\n`);
    return true;
  }
}

// Main
const csrPath = process.argv[2];

if (!csrPath) {
  console.error(`${colors.red}❌ Usage: npx tsx scripts/websrm-validate-config.ts <csr-file>${colors.reset}\n`);
  console.error(`Example: npx tsx scripts/websrm-validate-config.ts tmp/logs/dev-enrolment-2025-10-24T12-19-23/KU-B/csr.pem\n`);
  process.exit(1);
}

try {
  validateCSR(csrPath);
  const success = printSummary();
  process.exit(success ? 0 : 1);
} catch (err: any) {
  console.error(`${colors.red}❌ Validation error: ${err.message}${colors.reset}\n`);
  process.exit(1);
}
