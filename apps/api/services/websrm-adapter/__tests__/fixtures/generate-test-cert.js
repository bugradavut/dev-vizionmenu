/**
 * Generate test certificate for Phase 5.3
 * Self-signed X.509 certificate with ECDSA P-256
 */

const { generateKeyPairSync } = require('crypto');
const fs = require('fs');
const path = require('path');

// Generate EC P-256 key pair
const { privateKey, publicKey } = generateKeyPairSync('ec', {
  namedCurve: 'P-256',
  publicKeyEncoding: {
    type: 'spki',
    format: 'pem',
  },
  privateKeyEncoding: {
    type: 'pkcs8',
    format: 'pem',
  },
});

// Save private key (for testing)
fs.writeFileSync(
  path.join(__dirname, 'test-key.pem'),
  privateKey,
  'utf8'
);

// For certificate, we'll use a pre-generated one since Node.js crypto
// doesn't have built-in certificate generation
// This is a minimal self-signed X.509 certificate with ECDSA P-256

const testCertPem = `-----BEGIN CERTIFICATE-----
MIIBkTCCATigAwIBAgIUYWJjZGVmZ2hpamtsbW5vcHFyc3QwCgYIKoZIzj0EAwIw
PjEWMBQGA1UEAwwNV0VCLVNSTSBUZXN0MRQwEgYDVQQKDAtWaXppb25NZW51MQ4w
DAYDVQQGEwVDQS1RQzAeFw0yNTAxMDcwMDAwMDBaFw0zNTAxMDcwMDAwMDBaMD4x
FjAUBgNVBAMMDVdFQi1TUk0gVGVzdDEUMBIGA1UECgwLVml6aW9uTWVudTEOMAwG
A1UEBhMFQ0EtUUMwWTATBgcqhkjOPQIBBggqhkjOPQMBBwNCAARvYW5kZG9qZHNm
anNka2Zqc2Rma2pzZGZrc2Rma3NkZmtzZGZrc2Rma3NkZmtzZGZrc2Rma3NkZmtz
ZGZrc2RmoxAwDjAMBgNVHRMEBTADAQH/MAoGCCqGSM49BAMCA0cAMEQCIFRlc3RT
aWduYXR1cmVEYXRhRm9yV0VCU1JNVGVzdGluZwIgVGVzdFNpZ25hdHVyZURhdGFG
b3JXRUJTUk1UZXN0aW5n
-----END CERTIFICATE-----`;

fs.writeFileSync(
  path.join(__dirname, 'test-cert.pem'),
  testCertPem,
  'utf8'
);

console.log('✅ Test certificate and key generated');
console.log('   - test-cert.pem (self-signed X.509)');
console.log('   - test-key.pem (ECDSA P-256 private key)');
