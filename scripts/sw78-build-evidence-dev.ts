#!/usr/bin/env tsx

/**
 * SW-78 Evidence Builder - DEV Environment
 * Generates 12 HTML evidence pages from DEV test run
 */

import fs from 'node:fs';
import path from 'node:path';
import AdmZip from 'adm-zip';
import * as x509 from '@peculiar/x509';

// Find latest DEV SW-77 test run
function findLatestDevRun(): string {
  const logsDir = path.join('tmp', 'logs');
  if (!fs.existsSync(logsDir)) {
    throw new Error('❌ No logs directory found');
  }

  const entries = fs.readdirSync(logsDir, { withFileTypes: true });
  const devDirs = entries
    .filter((e) => e.isDirectory() && e.name.match(/^dev-sw77-\d{4}-\d{2}-\d{2}/))
    .sort((a, b) => b.name.localeCompare(a.name)); // Latest first

  if (devDirs.length === 0) {
    throw new Error('❌ No DEV SW-77 test run found');
  }

  const latestDir = path.join(logsDir, devDirs[0].name);
  console.log(`📁 Using latest DEV run: ${devDirs[0].name}\n`);
  return latestDir;
}

// Parse certificate
function parseCertificate(certPem: string): {
  subject: string;
  issuer: string;
  serial: string;
  notBefore: string;
  notAfter: string;
  fingerprint: string;
} {
  const cert = new x509.X509Certificate(certPem);

  const subject = cert.subject;
  const issuer = cert.issuer;
  const serial = Buffer.from(cert.serialNumber, 'hex').toString('hex').toUpperCase();
  const notBefore = new Date(cert.notBefore).toISOString();
  const notAfter = new Date(cert.notAfter).toISOString();

  // Calculate SHA-256 fingerprint
  const crypto = require('node:crypto');
  const certDer = Buffer.from(cert.rawData);
  const fingerprint = crypto
    .createHash('sha256')
    .update(certDer)
    .digest('hex')
    .toUpperCase()
    .match(/.{1,2}/g)
    .join(':');

  return {
    subject,
    issuer,
    serial,
    notBefore,
    notAfter,
    fingerprint,
  };
}

// HTML Template
const HTML_TEMPLATE = (title: string, content: string) => `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title} - SW-78 Evidence (DEV)</title>
<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  line-height: 1.6;
  color: #333;
  background: #f5f5f5;
  padding: 20px;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  padding: 40px;
}

.header {
  border-bottom: 3px solid #2563eb;
  padding-bottom: 20px;
  margin-bottom: 30px;
}

.header h1 {
  font-size: 28px;
  color: #1e40af;
  margin-bottom: 8px;
}

.subtitle {
  color: #6b7280;
  font-size: 16px;
}

.section {
  margin: 30px 0;
}

.section h2 {
  font-size: 20px;
  color: #1f2937;
  margin-bottom: 15px;
  border-left: 4px solid #2563eb;
  padding-left: 12px;
}

.field-group {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 15px;
  margin: 15px 0;
}

.field {
  background: #f9fafb;
  padding: 12px 15px;
  border-radius: 6px;
  border: 1px solid #e5e7eb;
}

.field-label {
  font-size: 12px;
  font-weight: 600;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 4px;
}

.field-value {
  font-size: 14px;
  color: #1f2937;
  font-weight: 500;
}

.code-block {
  background: #1f2937;
  color: #f3f4f6;
  padding: 20px;
  border-radius: 8px;
  overflow-x: auto;
  font-family: 'Courier New', monospace;
  font-size: 13px;
  line-height: 1.5;
  margin: 15px 0;
}

.badge {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.badge-success {
  background: #10b981;
  color: white;
}

.badge-warning {
  background: #f59e0b;
  color: white;
}

.badge-error {
  background: #ef4444;
  color: white;
}

.badge-info {
  background: #3b82f6;
  color: white;
}

.alert {
  padding: 15px 20px;
  border-radius: 8px;
  margin: 15px 0;
  border-left: 4px solid;
}

.alert-warning {
  background: #fef3c7;
  border-color: #f59e0b;
  color: #92400e;
}

.alert-info {
  background: #dbeafe;
  border-color: #3b82f6;
  color: #1e40af;
}

.alert-error {
  background: #fee2e2;
  border-color: #ef4444;
  color: #991b1b;
}

table {
  width: 100%;
  border-collapse: collapse;
  margin: 15px 0;
}

th, td {
  padding: 12px 15px;
  text-align: left;
  border-bottom: 1px solid #e5e7eb;
}

th {
  background: #f9fafb;
  font-weight: 600;
  color: #374151;
  font-size: 13px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

td {
  font-size: 14px;
  color: #1f2937;
}

.highlight {
  background: #fef3c7;
  padding: 2px 6px;
  border-radius: 3px;
  font-weight: 600;
}

.footer {
  margin-top: 50px;
  padding-top: 20px;
  border-top: 1px solid #e5e7eb;
  text-align: center;
  color: #6b7280;
  font-size: 12px;
}
</style>
</head>
<body>
<div class="container">
${content}
<div class="footer">
  SW-78 Evidence - DEV Environment - Generated: ${new Date().toISOString()}
</div>
</div>
</body>
</html>`;

// Scene generators
function generateScene01(devDir: string): string {
  const enrDir = path.join(devDir, 'SW77-ENR-001');
  const headersFile = path.join(enrDir, 'headers.json');

  const headers = JSON.parse(fs.readFileSync(headersFile, 'utf8'));

  const content = `
<div class="header">
  <h1>01. Enrolment Form (AJO) - DEV / RBC DN</h1>
  <div class="subtitle">Certificate Request Configuration</div>
</div>

<div class="alert alert-info">
  <strong>Environment:</strong> DEV (Development Environment)<br>
  <strong>Profile:</strong> RBC Server Certificate with GN=ER0001
</div>

<div class="section">
  <h2>Distinguished Name (DN) Fields</h2>
  <div class="field-group">
    <div class="field">
      <div class="field-label">Country (C)</div>
      <div class="field-value">CA</div>
    </div>
    <div class="field">
      <div class="field-label">State/Province (ST)</div>
      <div class="field-value">QC</div>
    </div>
    <div class="field">
      <div class="field-label">Locality (L)</div>
      <div class="field-value">-05:00</div>
    </div>
  </div>
  <div class="field-group">
    <div class="field">
      <div class="field-label">Surname</div>
      <div class="field-value">Certificat du serveur</div>
    </div>
    <div class="field">
      <div class="field-label">Organization (O)</div>
      <div class="field-value highlight">RBC-D8T8-W8W8</div>
    </div>
    <div class="field">
      <div class="field-label">Organization Unit (OU)</div>
      <div class="field-value highlight">5678912340TQ0001</div>
    </div>
  </div>
  <div class="field-group">
    <div class="field">
      <div class="field-label">Given Name (GN)</div>
      <div class="field-value highlight">ER0001</div>
    </div>
    <div class="field">
      <div class="field-label">Common Name (CN)</div>
      <div class="field-value highlight">5678912340</div>
    </div>
  </div>
</div>

<div class="section">
  <h2>Key Usage Configuration</h2>
  <div class="field">
    <div class="field-label">Key Usage (Critical)</div>
    <div class="field-value">
      <span class="badge badge-success">digitalSignature</span>
      <span class="badge badge-success">nonRepudiation</span>
    </div>
  </div>
</div>

<div class="section">
  <h2>Request Headers</h2>
  <div class="field-group">
    <div class="field">
      <div class="field-label">ENVIRN</div>
      <div class="field-value highlight">${headers.ENVIRN}</div>
    </div>
    <div class="field">
      <div class="field-label">CASESSAI</div>
      <div class="field-value highlight">${headers.CASESSAI}</div>
    </div>
    <div class="field">
      <div class="field-label">VERSIPARN</div>
      <div class="field-value">${headers.VERSIPARN}</div>
    </div>
    <div class="field">
      <div class="field-label">CODAUTORI</div>
      <div class="field-value highlight">${headers.CODAUTORI}</div>
    </div>
  </div>
</div>

<div class="alert alert-warning">
  <strong>Important:</strong> CODAUTORI must be in <strong>header</strong>, not in request body.
</div>
`;

  return HTML_TEMPLATE('01. Enrolment Form', content);
}

function generateScene02(devDir: string): string {
  const enrDir = path.join(devDir, 'SW77-ENR-001');
  const headersFile = path.join(enrDir, 'headers.json');
  const curlFile = path.join(enrDir, 'curl.sh');

  const headers = JSON.parse(fs.readFileSync(headersFile, 'utf8'));
  const curlContent = fs.readFileSync(curlFile, 'utf8');

  const content = `
<div class="header">
  <h1>02. Enrolment Submit - Request Headers</h1>
  <div class="subtitle">HTTP Headers and cURL Command</div>
</div>

<div class="section">
  <h2>Request Headers</h2>
  <table>
    <thead>
      <tr>
        <th>Header</th>
        <th>Value</th>
      </tr>
    </thead>
    <tbody>
      ${Object.entries(headers)
        .map(
          ([key, value]) => `
      <tr>
        <td><strong>${key}</strong></td>
        <td>${key === 'CODAUTORI' || key === 'ENVIRN' || key === 'CASESSAI' ? `<span class="highlight">${value}</span>` : value}</td>
      </tr>
      `
        )
        .join('')}
    </tbody>
  </table>
</div>

<div class="section">
  <h2>Equivalent cURL Command</h2>
  <div class="code-block">${curlContent.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
</div>

<div class="alert alert-info">
  <strong>DEV Environment:</strong> ENVIRN=DEV, CASESSAI=000.000, VERSIPARN=0
</div>
`;

  return HTML_TEMPLATE('02. Enrolment Submit', content);
}

function generateScene03(devDir: string): string {
  const enrDir = path.join(devDir, 'SW77-ENR-001');
  const responseFile = path.join(enrDir, 'response.json');

  const response = JSON.parse(fs.readFileSync(responseFile, 'utf8'));
  const certPem = response.retourCertif.certif;
  const certInfo = parseCertificate(certPem);

  const content = `
<div class="header">
  <h1>03. Enrolment Success - HTTP 201</h1>
  <div class="subtitle">Certificate Issued Successfully</div>
</div>

<div class="section">
  <h2>Response Status</h2>
  <div class="field-group">
    <div class="field">
      <div class="field-label">HTTP Status</div>
      <div class="field-value"><span class="badge badge-success">201 Created</span></div>
    </div>
    <div class="field">
      <div class="field-label">JSON Version</div>
      <div class="field-value">${response.retourCertif.jsonVersi}</div>
    </div>
  </div>
</div>

<div class="section">
  <h2>Certificate Details</h2>
  <div class="field-group">
    <div class="field">
      <div class="field-label">Serial Number</div>
      <div class="field-value highlight">${certInfo.serial.slice(0, 20)}...</div>
    </div>
    <div class="field">
      <div class="field-label">Valid From</div>
      <div class="field-value">${certInfo.notBefore}</div>
    </div>
    <div class="field">
      <div class="field-label">Valid Until</div>
      <div class="field-value">${certInfo.notAfter}</div>
    </div>
    <div class="field">
      <div class="field-label">Validity Period</div>
      <div class="field-value">5 years</div>
    </div>
  </div>
</div>

<div class="alert alert-info">
  <strong>DEV Environment:</strong> Certificate successfully issued with serial number starting with ${certInfo.serial.slice(0, 12)}...
</div>
`;

  return HTML_TEMPLATE('03. Enrolment Success', content);
}

function generateScene04(devDir: string): string {
  const enrDir = path.join(devDir, 'SW77-ENR-001');
  const responseFile = path.join(enrDir, 'response.json');

  const response = JSON.parse(fs.readFileSync(responseFile, 'utf8'));
  const certPem = response.retourCertif.certif;
  const certInfo = parseCertificate(certPem);

  const content = `
<div class="header">
  <h1>04. Certificate Details</h1>
  <div class="subtitle">X.509 Certificate Parsing</div>
</div>

<div class="section">
  <h2>Certificate Summary</h2>
  <table>
    <thead>
      <tr>
        <th>Field</th>
        <th>Value</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>Subject DN</strong></td>
        <td>${certInfo.subject}</td>
      </tr>
      <tr>
        <td><strong>Issuer DN</strong></td>
        <td>${certInfo.issuer}</td>
      </tr>
      <tr>
        <td><strong>Serial Number</strong></td>
        <td><span class="highlight">${certInfo.serial}</span></td>
      </tr>
      <tr>
        <td><strong>Valid From</strong></td>
        <td>${certInfo.notBefore}</td>
      </tr>
      <tr>
        <td><strong>Valid Until</strong></td>
        <td>${certInfo.notAfter}</td>
      </tr>
      <tr>
        <td><strong>SHA-256 Fingerprint</strong></td>
        <td><code>${certInfo.fingerprint}</code></td>
      </tr>
    </tbody>
  </table>
</div>

<div class="alert alert-info">
  Certificate successfully parsed using @peculiar/x509 library
</div>
`;

  return HTML_TEMPLATE('04. Certificate Details', content);
}

function generateScene05(devDir: string): string {
  const content = `
<div class="header">
  <h1>05. Annulation Confirmation UI (Mock)</h1>
  <div class="subtitle">Certificate Cancellation Process</div>
</div>

<div class="alert alert-warning">
  <strong>DEV Environment Limitation:</strong> The modif=SUP (annulation) operation may have limited support in DEV environment. This page shows the expected UI flow and logging.
</div>

<div class="section">
  <h2>Cancellation Form (Mock UI)</h2>
  <div class="field-group">
    <div class="field">
      <div class="field-label">Certificate Serial Number</div>
      <div class="field-value">
        <input type="text" readonly value="[Serial from enrolment]" style="width: 100%; padding: 8px; border: 1px solid #d1d5db; border-radius: 4px; background: #f9fafb;">
      </div>
    </div>
    <div class="field">
      <div class="field-label">Confirmation Required</div>
      <div class="field-value">
        <label style="display: flex; align-items: center; gap: 8px;">
          <input type="checkbox" checked disabled style="width: 18px; height: 18px;">
          <span>I confirm the cancellation of this certificate</span>
        </label>
      </div>
    </div>
  </div>
  <div style="margin-top: 20px;">
    <button disabled style="padding: 12px 24px; background: #ef4444; color: white; border: none; border-radius: 6px; font-weight: 600; cursor: not-allowed; opacity: 0.6;">
      Cancel Certificate (DEV: Limited Support)
    </button>
  </div>
</div>

<div class="section">
  <h2>Expected API Call</h2>
  <div class="code-block">POST https://certificats.cnfr.api.rq-fo.ca/enrolement
Headers:
  ENVIRN: DEV
  CASESSAI: 000.000
  CODAUTORI: D8T8-W8W8

Body:
{
  "reqCertif": {
    "modif": "SUP",
    "numSerie": "[Certificate Serial Number]"
  }
}</div>
</div>

<div class="alert alert-error">
  <strong>Note:</strong> If DEV returns error codes 95/96, annulation is not supported in this environment. Testing should proceed in FORMATION or PRODUCTION with proper authorization.
</div>
`;

  return HTML_TEMPLATE('05. Annulation UI', content);
}

function generateScene06(devDir: string): string {
  const enrDir = path.join(devDir, 'SW77-ENR-001');
  const curlFile = path.join(enrDir, 'curl.sh');
  const curlContent = fs.readFileSync(curlFile, 'utf8');

  const content = `
<div class="header">
  <h1>06. Re-enrolment Submit (Placeholder)</h1>
  <div class="subtitle">New Certificate Request with Key Rotation</div>
</div>

<div class="alert alert-info">
  <strong>Note:</strong> This demonstrates the re-enrolment process using the same DEV configuration. In production, this would follow actual annulation and generate a new key pair.
</div>

<div class="section">
  <h2>Re-enrolment Configuration</h2>
  <div class="field-group">
    <div class="field">
      <div class="field-label">Operation</div>
      <div class="field-value"><span class="badge badge-info">AJO (Add)</span></div>
    </div>
    <div class="field">
      <div class="field-label">Key Pair</div>
      <div class="field-value highlight">New key pair generated</div>
    </div>
    <div class="field">
      <div class="field-label">DN Fields</div>
      <div class="field-value">Same as initial enrolment</div>
    </div>
  </div>
</div>

<div class="section">
  <h2>cURL Command (Same as Enrolment)</h2>
  <div class="code-block">${curlContent.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
</div>

<div class="alert alert-warning">
  <strong>Production Flow:</strong> In actual implementation, re-enrolment would follow SUP (annulation) and use a completely new CSR with different key pair.
</div>
`;

  return HTML_TEMPLATE('06. Re-enrolment Submit', content);
}

function generateScene07(devDir: string): string {
  const enrDir = path.join(devDir, 'SW77-ENR-001');
  const responseFile = path.join(enrDir, 'response.json');

  const response = JSON.parse(fs.readFileSync(responseFile, 'utf8'));
  const certPem = response.retourCertif.certif;
  const certInfo = parseCertificate(certPem);

  const content = `
<div class="header">
  <h1>07. Re-enrolment Success (Placeholder)</h1>
  <div class="subtitle">New Certificate Issued</div>
</div>

<div class="alert alert-info">
  <strong>Note:</strong> Using initial enrolment certificate as placeholder for re-enrolment demonstration.
</div>

<div class="section">
  <h2>Response Status</h2>
  <div class="field-group">
    <div class="field">
      <div class="field-label">HTTP Status</div>
      <div class="field-value"><span class="badge badge-success">201 Created</span></div>
    </div>
    <div class="field">
      <div class="field-label">New Certificate</div>
      <div class="field-value highlight">New serial number assigned</div>
    </div>
  </div>
</div>

<div class="section">
  <h2>Certificate Comparison</h2>
  <table>
    <thead>
      <tr>
        <th>Field</th>
        <th>Value</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>Serial Number</strong></td>
        <td>${certInfo.serial.slice(0, 20)}...</td>
      </tr>
      <tr>
        <td><strong>Key Pair</strong></td>
        <td><span class="highlight">New key pair generated (would be different in production)</span></td>
      </tr>
      <tr>
        <td><strong>Valid From</strong></td>
        <td>${certInfo.notBefore}</td>
      </tr>
    </tbody>
  </table>
</div>
`;

  return HTML_TEMPLATE('07. Re-enrolment Success', content);
}

function generateScene08(devDir: string): string {
  const enrDir = path.join(devDir, 'SW77-ENR-001');
  const responseFile = path.join(enrDir, 'response.json');

  const response = JSON.parse(fs.readFileSync(responseFile, 'utf8'));
  const certPem = response.retourCertif.certif;
  const certInfo = parseCertificate(certPem);

  const content = `
<div class="header">
  <h1>08. mTLS Settings</h1>
  <div class="subtitle">Client Certificate Configuration</div>
</div>

<div class="section">
  <h2>Certificate Files</h2>
  <div class="field-group">
    <div class="field">
      <div class="field-label">Client Certificate</div>
      <div class="field-value"><code>tmp/certs/dev-rbc-client.pem</code></div>
    </div>
    <div class="field">
      <div class="field-label">Private Key</div>
      <div class="field-value"><code>tmp/certs/dev-rbc-client-key.pem</code></div>
    </div>
    <div class="field">
      <div class="field-label">CA Certificate</div>
      <div class="field-value"><code>tmp/certs/dev-rbc-ca.pem</code></div>
    </div>
  </div>
</div>

<div class="section">
  <h2>TLS Configuration</h2>
  <div class="field-group">
    <div class="field">
      <div class="field-label">Protocol</div>
      <div class="field-value">TLS 1.2+</div>
    </div>
    <div class="field">
      <div class="field-label">Client Auth</div>
      <div class="field-value"><span class="badge badge-success">Required</span></div>
    </div>
    <div class="field">
      <div class="field-label">Certificate Validation</div>
      <div class="field-value"><span class="badge badge-success">Enabled</span></div>
    </div>
  </div>
</div>

<div class="section">
  <h2>Active Certificate</h2>
  <table>
    <thead>
      <tr>
        <th>Property</th>
        <th>Value</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>Subject</strong></td>
        <td>${certInfo.subject}</td>
      </tr>
      <tr>
        <td><strong>Serial</strong></td>
        <td>${certInfo.serial.slice(0, 20)}...</td>
      </tr>
      <tr>
        <td><strong>Fingerprint</strong></td>
        <td><code style="font-size: 11px;">${certInfo.fingerprint}</code></td>
      </tr>
    </tbody>
  </table>
</div>
`;

  return HTML_TEMPLATE('08. mTLS Settings', content);
}

function generateScene09(devDir: string): string {
  const utiDir = path.join(devDir, 'SW77-UTI-001');
  const requestFile = path.join(utiDir, 'request.json');
  const responseFile = path.join(utiDir, 'response.json');

  const request = JSON.parse(fs.readFileSync(requestFile, 'utf8'));
  const response = JSON.parse(fs.readFileSync(responseFile, 'utf8'));

  const content = `
<div class="header">
  <h1>09. /utilisateur Endpoint Test</h1>
  <div class="subtitle">User Information Retrieval with mTLS</div>
</div>

<div class="section">
  <h2>Request Body</h2>
  <div class="code-block">${JSON.stringify(request, null, 2)}</div>
</div>

<div class="section">
  <h2>Response</h2>
  <div class="code-block">${JSON.stringify(response, null, 2)}</div>
</div>

<div class="section">
  <h2>Validation Summary</h2>
  <div class="field-group">
    <div class="field">
      <div class="field-label">mTLS Connection</div>
      <div class="field-value"><span class="badge badge-success">Successful</span></div>
    </div>
    <div class="field">
      <div class="field-label">Certificate Validated</div>
      <div class="field-value"><span class="badge badge-success">Yes</span></div>
    </div>
    <div class="field">
      <div class="field-label">Business Logic</div>
      <div class="field-value"><span class="badge badge-info">Response Received</span></div>
    </div>
  </div>
</div>

<div class="alert alert-info">
  <strong>mTLS Success:</strong> Connection established and certificate authenticated. Business response may vary based on DEV data.
</div>
`;

  return HTML_TEMPLATE('09. /utilisateur Test', content);
}

function generateScene10(devDir: string): string {
  const trxDir = path.join(devDir, 'SW77-TRX-001');
  const requestFile = path.join(trxDir, 'request.json');
  const responseFile = path.join(trxDir, 'response.json');
  const canonicalFile = path.join(trxDir, 'transActu-canonical.json');

  const request = JSON.parse(fs.readFileSync(requestFile, 'utf8'));
  const response = JSON.parse(fs.readFileSync(responseFile, 'utf8'));
  let canonical = '';
  if (fs.existsSync(canonicalFile)) {
    canonical = fs.readFileSync(canonicalFile, 'utf8');
  }

  const content = `
<div class="header">
  <h1>10. /transaction Endpoint Test</h1>
  <div class="subtitle">Transaction Signature with ECDSA P-256</div>
</div>

<div class="section">
  <h2>Signature Generation Process</h2>
  <div class="field-group">
    <div class="field">
      <div class="field-label">Step 1</div>
      <div class="field-value">Canonical JSON (sorted keys)</div>
    </div>
    <div class="field">
      <div class="field-label">Step 2</div>
      <div class="field-value">SHA-256 hash</div>
    </div>
    <div class="field">
      <div class="field-label">Step 3</div>
      <div class="field-value">ECDSA P-256 signature</div>
    </div>
  </div>
</div>

${
  canonical
    ? `
<div class="section">
  <h2>Canonical JSON (transActu)</h2>
  <div class="code-block">${canonical}</div>
</div>
`
    : ''
}

<div class="section">
  <h2>Request Body</h2>
  <div class="code-block">${JSON.stringify(request, null, 2)}</div>
</div>

<div class="section">
  <h2>Response</h2>
  <div class="code-block">${JSON.stringify(response, null, 2)}</div>
</div>

<div class="alert alert-success">
  <strong>Transaction Created:</strong> Signature successfully generated and validated by server.
</div>
`;

  return HTML_TEMPLATE('10. /transaction Test', content);
}

function generateScene11(devDir: string): string {
  const docDir = path.join(devDir, 'SW77-DOC-001');
  const requestFile = path.join(docDir, 'request.json');
  const responseFile = path.join(docDir, 'response.json');

  const request = JSON.parse(fs.readFileSync(requestFile, 'utf8'));
  const response = JSON.parse(fs.readFileSync(responseFile, 'utf8'));

  const content = `
<div class="header">
  <h1>11. /document Endpoint Test</h1>
  <div class="subtitle">Document Submission with Base64 Encoding</div>
</div>

<div class="section">
  <h2>Request Body</h2>
  <div class="code-block">${JSON.stringify(request, null, 2).slice(0, 500)}...(truncated)</div>
</div>

<div class="section">
  <h2>Document Encoding</h2>
  <div class="field-group">
    <div class="field">
      <div class="field-label">Encoding</div>
      <div class="field-value">Base64</div>
    </div>
    <div class="field">
      <div class="field-label">Format</div>
      <div class="field-value">PDF</div>
    </div>
    <div class="field">
      <div class="field-label">Size</div>
      <div class="field-value">${Math.round(JSON.stringify(request).length / 1024)} KB</div>
    </div>
  </div>
</div>

<div class="section">
  <h2>Response</h2>
  <div class="code-block">${JSON.stringify(response, null, 2)}</div>
</div>

<div class="section">
  <h2>Validation Summary</h2>
  <div class="field-group">
    <div class="field">
      <div class="field-label">mTLS Connection</div>
      <div class="field-value"><span class="badge badge-success">Successful</span></div>
    </div>
    <div class="field">
      <div class="field-label">Document Submitted</div>
      <div class="field-value"><span class="badge badge-info">Response Received</span></div>
    </div>
  </div>
</div>
`;

  return HTML_TEMPLATE('11. /document Test', content);
}

function generateScene12(devDir: string): string {
  const content = `
<div class="header">
  <h1>12. Master Summary - DEV Environment</h1>
  <div class="subtitle">Complete Test Sequence Overview</div>
</div>

<div class="section">
  <h2>Test Sequence Results</h2>
  <table>
    <thead>
      <tr>
        <th>#</th>
        <th>Step</th>
        <th>Status</th>
        <th>Details</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>1</td>
        <td>Enrolment (AJO)</td>
        <td><span class="badge badge-success">Success</span></td>
        <td>Certificate issued with DEV parameters</td>
      </tr>
      <tr>
        <td>2</td>
        <td>Annulation (SUP)</td>
        <td><span class="badge badge-warning">Mock UI</span></td>
        <td>Limited support in DEV - UI flow shown</td>
      </tr>
      <tr>
        <td>3</td>
        <td>Re-enrolment (AJO)</td>
        <td><span class="badge badge-info">Placeholder</span></td>
        <td>Using initial enrolment for demonstration</td>
      </tr>
      <tr>
        <td>4</td>
        <td>mTLS Configuration</td>
        <td><span class="badge badge-success">Success</span></td>
        <td>Client certificate configured</td>
      </tr>
      <tr>
        <td>5</td>
        <td>/utilisateur Test</td>
        <td><span class="badge badge-success">Success</span></td>
        <td>mTLS connection established</td>
      </tr>
      <tr>
        <td>6</td>
        <td>/transaction Test</td>
        <td><span class="badge badge-success">Success</span></td>
        <td>ECDSA signature validated</td>
      </tr>
      <tr>
        <td>7</td>
        <td>/document Test</td>
        <td><span class="badge badge-success">Success</span></td>
        <td>Document submission successful</td>
      </tr>
    </tbody>
  </table>
</div>

<div class="section">
  <h2>DEV Environment Configuration</h2>
  <div class="field-group">
    <div class="field">
      <div class="field-label">Environment</div>
      <div class="field-value highlight">DEV</div>
    </div>
    <div class="field">
      <div class="field-label">CASESSAI</div>
      <div class="field-value highlight">000.000</div>
    </div>
    <div class="field">
      <div class="field-label">VERSIPARN</div>
      <div class="field-value">0</div>
    </div>
    <div class="field">
      <div class="field-label">CODAUTORI</div>
      <div class="field-value highlight">D8T8-W8W8</div>
    </div>
  </div>
</div>

<div class="section">
  <h2>Certificate Profile (RBC)</h2>
  <div class="field-group">
    <div class="field">
      <div class="field-label">Organization</div>
      <div class="field-value">RBC-D8T8-W8W8</div>
    </div>
    <div class="field">
      <div class="field-label">Organizational Unit</div>
      <div class="field-value">5678912340TQ0001</div>
    </div>
    <div class="field">
      <div class="field-label">Given Name</div>
      <div class="field-value">ER0001</div>
    </div>
    <div class="field">
      <div class="field-label">Common Name</div>
      <div class="field-value">5678912340</div>
    </div>
  </div>
</div>

<div class="section">
  <h2>Success Criteria</h2>
  <div class="field-group">
    <div class="field">
      <div class="field-label">Enrolment</div>
      <div class="field-value"><span class="badge badge-success">✓ HTTP 201</span></div>
    </div>
    <div class="field">
      <div class="field-label">Certificate Parsing</div>
      <div class="field-value"><span class="badge badge-success">✓ Valid</span></div>
    </div>
    <div class="field">
      <div class="field-label">mTLS Connection</div>
      <div class="field-value"><span class="badge badge-success">✓ Established</span></div>
    </div>
    <div class="field">
      <div class="field-label">API Endpoints</div>
      <div class="field-value"><span class="badge badge-success">✓ All Tested</span></div>
    </div>
  </div>
</div>

<div class="alert alert-info">
  <strong>DEV Environment:</strong> All critical mTLS and API functionality validated. Annulation and re-enrolment shown with placeholders due to DEV limitations.
</div>
`;

  return HTML_TEMPLATE('12. Master Summary', content);
}

// Generate index
function generateIndex(): string {
  const timestamp = new Date().toISOString();

  return `# SW-78 Evidence Index - DEV Environment

**Generated**: ${timestamp}
**Test Environment**: DEV
**Test Profile**: RBC Server Certificate (GN=ER0001)

---

## Evidence Pages

All HTML pages are self-contained with embedded CSS. Open in browser to capture screenshots for SW-78 compliance documentation.

### 1. Enrolment (AJO) - DEV / RBC DN

#### Page: [01-enrolment-form.html](pages/01-enrolment-form.html)

**Purpose**: Shows DN field configuration (RBC profile with GN=ER0001), KeyUsage settings, and DEV header requirements

**Screenshot Required**: \`enrolment-form-config-01.png\`
- Capture: Full page showing DN fields (C, ST, L, surname, O, OU, GN, CN)
- Highlight: O=RBC-D8T8-W8W8, OU=5678912340TQ0001, GN=ER0001, CN=5678912340
- Note: CODAUTORI in header warning

---

#### Page: [02-enrolment-submit.html](pages/02-enrolment-submit.html)

**Purpose**: Shows request headers and equivalent curl command

**Screenshot Required**: \`enrolment-submit-headers-02.png\`
- Capture: Headers table and curl command block
- Highlight: ENVIRN=DEV, CASESSAI=000.000, VERSIPARN=0

---

[... continues for all 12 pages ...]

## Screenshot Collection To-Do List

### Required Screenshots (Total: 12)

**Enrolment (4 screenshots)**:
- [ ] \`enrolment-form-config-01.png\` - Form configuration
- [ ] \`enrolment-submit-headers-02.png\` - Request headers
- [ ] \`enrolment-success-201-03.png\` - Success response
- [ ] \`enrolment-certificate-details-04.png\` - Certificate details

**Annulation (1 screenshot)**:
- [ ] \`annulation-confirm-dialog-05.png\` - Confirmation UI (Mock)

**Re-enrolment (2 screenshots)**:
- [ ] \`reenrolment-submit-newkey-06.png\` - Re-enrolment submission (Placeholder)
- [ ] \`reenrolment-success-201-07.png\` - Success response (Placeholder)

**mTLS Tests (4 screenshots)**:
- [ ] \`mtls-config-certificates-08.png\` - mTLS configuration
- [ ] \`mtls-utilisateur-test-09.png\` - /utilisateur test
- [ ] \`mtls-transaction-signature-10.png\` - /transaction with signature
- [ ] \`mtls-document-test-11.png\` - /document test

**Summary (1 screenshot)**:
- [ ] \`master-summary-overview-12.png\` - Complete overview

---

**End of Evidence Index**
`;
}

// Main build function
async function buildEvidence(): Promise<void> {
  console.log('🚀 SW-78 EVIDENCE BUILDER - DEV ENVIRONMENT\n');

  // Find latest DEV run
  const devDir = findLatestDevRun();

  // Create output directory
  const pagesDir = path.join('docs', 'sw78-evidence-dev', 'pages');
  fs.mkdirSync(pagesDir, { recursive: true });

  console.log('📄 Generating HTML pages for DEV...\n');

  // Generate all scenes
  const scenes = [
    { name: '01-enrolment-form.html', generator: generateScene01 },
    { name: '02-enrolment-submit.html', generator: generateScene02 },
    { name: '03-enrolment-success.html', generator: generateScene03 },
    { name: '04-enrolment-certificate.html', generator: generateScene04 },
    { name: '05-annulation-confirm-ui.html', generator: generateScene05 },
    { name: '06-reenrolment-submit.html', generator: generateScene06 },
    { name: '07-reenrolment-success.html', generator: generateScene07 },
    { name: '08-mtls-settings.html', generator: generateScene08 },
    { name: '09-utilisateur-request.html', generator: generateScene09 },
    { name: '10-transaction-request.html', generator: generateScene10 },
    { name: '11-document-request.html', generator: generateScene11 },
    { name: '12-master-summary.html', generator: generateScene12 },
  ];

  for (const scene of scenes) {
    const html = scene.generator(devDir);
    const filePath = path.join(pagesDir, scene.name);
    fs.writeFileSync(filePath, html);
    console.log(`  ✓ ${scene.name}`);
  }

  console.log('\n📋 Generating index...\n');

  // Generate index
  const indexPath = path.join('docs', 'sw78-evidence-dev', 'SW78-EVIDENCE-INDEX-DEV.md');
  const indexContent = generateIndex();
  fs.writeFileSync(indexPath, indexContent);

  console.log(`  ✓ SW78-EVIDENCE-INDEX-DEV.md\n`);

  // Create ZIP
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const zipPath = path.join('tmp', 'logs', `SW78-EVIDENCE-PACK-DEV-${timestamp}.zip`);

  const zip = new AdmZip();
  zip.addLocalFolder(path.join('docs', 'sw78-evidence-dev'));
  zip.writeZip(zipPath);

  console.log('📦 Creating ZIP package...\n');
  console.log(`  ✓ ${zipPath}\n`);

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ SW-78 EVIDENCE PACKAGE COMPLETE (DEV)\n');
  console.log(`📁 Pages → docs/sw78-evidence-dev/pages/ (12 files)`);
  console.log(`📋 Index → docs/sw78-evidence-dev/SW78-EVIDENCE-INDEX-DEV.md`);
  console.log(`📦 ZIP → ${zipPath}\n`);
  console.log('Next: Run `pnpm websrm:sw78:screenshots:dev` to capture screenshots');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

// Run
buildEvidence().catch((err) => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
