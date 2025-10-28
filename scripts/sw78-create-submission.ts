#!/usr/bin/env tsx

/**
 * SW-78 Submission Package Builder
 * Creates final submission package with:
 * - SW-78.docx (if available)
 * - 12 PNG screenshots
 * - ESSAI Evidence ZIP
 * - SUBMISSION-INDEX.md
 */

import fs from 'node:fs';
import path from 'node:path';
import AdmZip from 'adm-zip';

interface PackageFile {
  sourcePath: string;
  zipPath: string;
  size: number;
  exists: boolean;
}

async function createSubmissionPackage(): Promise<void> {
  // Check for DEV environment flag
  const isDev = process.argv[2] === 'dev';
  const envLabel = isDev ? 'DEV' : 'ESSAI';
  const envSuffix = isDev ? '-DEV' : '';

  console.log(`📦 SW-78 SUBMISSION PACKAGE BUILDER (${envLabel})\n`);

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const submissionDir = path.join('tmp', 'logs', `SW78-SUBMISSION${envSuffix}-${timestamp}`);
  const submissionZipPath = path.join('tmp', 'logs', `SW78-SUBMISSION${envSuffix}-${timestamp}.zip`);

  // Create temp directory
  fs.mkdirSync(submissionDir, { recursive: true });

  console.log('🔍 Collecting files...\n');

  const files: PackageFile[] = [];

  // 1. Find SW-78.docx
  console.log('📄 Looking for SW-78.docx...');
  const docxSearchPaths = [
    path.join('docs', 'SW-78.docx'),
    path.join('Docs', 'SW-78.docx'),
    path.join('documents', 'SW-78.docx'),
    'SW-78.docx',
  ];

  let docxPath: string | null = null;
  for (const searchPath of docxSearchPaths) {
    if (fs.existsSync(searchPath)) {
      docxPath = searchPath;
      break;
    }
  }

  if (docxPath) {
    const stats = fs.statSync(docxPath);
    files.push({
      sourcePath: docxPath,
      zipPath: 'SW-78.docx',
      size: stats.size,
      exists: true,
    });
    console.log(`  ✓ Found: ${docxPath} (${(stats.size / 1024).toFixed(1)} KB)\n`);
  } else {
    console.log(
      '  ⚠️  SW-78.docx not found. Creating placeholder README.\n'
    );
    // Create placeholder README
    const readmePath = path.join(submissionDir, 'SW-78-README.txt');
    const readmeContent = `SW-78 Compliance Document

This submission package includes:
- 12 PNG screenshots from ESSAI test run
- ESSAI evidence package (ZIP with HTML pages)

NOTE: SW-78.docx should be added manually before final submission.
      The Word document should contain the compliance narrative and
      reference the screenshots included in this package.

Please add SW-78.docx to this package root before submitting.
`;
    fs.writeFileSync(readmePath, readmeContent);
    files.push({
      sourcePath: readmePath,
      zipPath: 'SW-78-README.txt',
      size: Buffer.byteLength(readmeContent),
      exists: true,
    });
  }

  // 2. Find 12 PNG screenshots
  console.log('📸 Looking for screenshots...');
  const screenshotsDir = isDev
    ? path.join('tmp', 'logs', 'SW78-SCREENSHOTS-DEV')
    : path.join('tmp', 'logs', 'SW78-SCREENSHOTS');

  if (!fs.existsSync(screenshotsDir)) {
    const cmd = isDev ? 'pnpm websrm:sw78:screenshots:dev' : 'pnpm websrm:sw78:screenshots';
    throw new Error(
      `❌ Screenshots not found. Run \`${cmd}\` first.`
    );
  }

  const pngFiles = fs
    .readdirSync(screenshotsDir)
    .filter((f) => f.endsWith('.png'))
    .sort();

  if (pngFiles.length !== 12) {
    console.log(
      `  ⚠️  Expected 12 PNG files, found ${pngFiles.length}`
    );
  }

  let totalScreenshotSize = 0;
  for (const pngFile of pngFiles) {
    const sourcePath = path.join(screenshotsDir, pngFile);
    const stats = fs.statSync(sourcePath);
    files.push({
      sourcePath,
      zipPath: path.join('screenshots', pngFile),
      size: stats.size,
      exists: true,
    });
    totalScreenshotSize += stats.size;
  }

  console.log(
    `  ✓ Found ${pngFiles.length} screenshots (${(totalScreenshotSize / 1024).toFixed(1)} KB)\n`
  );

  // 3. Find latest Evidence ZIP
  console.log(`📦 Looking for ${envLabel} Evidence ZIP...`);
  const logsDir = path.join('tmp', 'logs');
  const zipPrefix = isDev ? 'SW78-EVIDENCE-PACK-DEV-' : 'SW78-EVIDENCE-PACK-';
  const zipFiles = fs
    .readdirSync(logsDir)
    .filter((f) => f.startsWith(zipPrefix) && f.endsWith('.zip'))
    .sort()
    .reverse();

  if (zipFiles.length === 0) {
    const cmd = isDev ? 'pnpm websrm:sw78:evidence:dev' : 'pnpm websrm:sw78:evidence';
    throw new Error(
      `❌ ${envLabel} Evidence ZIP not found. Run \`${cmd}\` first.`
    );
  }

  const essaiZipPath = path.join(logsDir, zipFiles[0]);
  const essaiZipStats = fs.statSync(essaiZipPath);
  files.push({
    sourcePath: essaiZipPath,
    zipPath: path.join('evidence', zipFiles[0]),
    size: essaiZipStats.size,
    exists: true,
  });

  console.log(
    `  ✓ Found: ${zipFiles[0]} (${(essaiZipStats.size / 1024).toFixed(1)} KB)\n`
  );

  // 4. Generate SUBMISSION-INDEX.md
  console.log('📋 Generating SUBMISSION-INDEX.md...\n');
  const indexContent = generateSubmissionIndex(files, timestamp);
  const indexPath = path.join(submissionDir, 'SUBMISSION-INDEX.md');
  fs.writeFileSync(indexPath, indexContent);

  files.push({
    sourcePath: indexPath,
    zipPath: 'SUBMISSION-INDEX.md',
    size: Buffer.byteLength(indexContent),
    exists: true,
  });

  // 5. Create ZIP package
  console.log('📦 Creating submission ZIP...\n');

  const zip = new AdmZip();

  // Add all files
  for (const file of files) {
    if (file.exists) {
      const fileContent = fs.readFileSync(file.sourcePath);
      zip.addFile(file.zipPath, fileContent);
    }
  }

  zip.writeZip(submissionZipPath);

  // Clean up temp directory
  fs.rmSync(submissionDir, { recursive: true, force: true });

  // Summary
  const totalSize = files.reduce((sum, f) => sum + f.size, 0);
  const zipStats = fs.statSync(submissionZipPath);

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ SW-78 SUBMISSION PACKAGE COMPLETE\n');
  console.log(`📦 Package: ${submissionZipPath}`);
  console.log(`📊 Files Included: ${files.length}`);
  console.log(`   - Documentation: ${docxPath ? '1 (SW-78.docx)' : '1 (README)'}`);
  console.log(`   - Screenshots: ${pngFiles.length} PNG files`);
  console.log(`   - Evidence ZIP: 1`);
  console.log(`   - Index: 1 (SUBMISSION-INDEX.md)`);
  console.log(`📦 Total Content Size: ${(totalSize / 1024).toFixed(1)} KB`);
  console.log(`📦 ZIP Size: ${(zipStats.size / 1024).toFixed(1)} KB`);
  console.log(
    `🗜️  Compression: ${(((totalSize - zipStats.size) / totalSize) * 100).toFixed(1)}%`
  );
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  if (!docxPath) {
    console.log('⚠️  IMPORTANT: SW-78.docx not found!');
    console.log('   Add the Word document manually before final submission.');
    console.log('   See SW-78-README.txt in the ZIP for instructions.\n');
  }

  console.log('📋 Next Steps:');
  console.log('   1. Extract the ZIP and review contents');
  console.log('   2. Add SW-78.docx if not already included');
  console.log('   3. Review SUBMISSION-INDEX.md for completeness');
  console.log('   4. Re-package if needed');
  console.log('   5. Submit to compliance authority\n');
}

function generateSubmissionIndex(
  files: PackageFile[],
  timestamp: string
): string {
  const now = new Date().toISOString();

  let md = `# SW-78 Compliance Submission Package

**Package Created**: ${now}
**Package ID**: SW78-SUBMISSION-${timestamp}

---

## Package Contents

This submission package contains all required materials for SW-78 compliance
documentation, including the compliance narrative, test screenshots, and
supporting evidence from ESSAI test environment.

### 📄 Documentation

`;

  const docFile = files.find((f) => f.zipPath === 'SW-78.docx' || f.zipPath === 'SW-78-README.txt');
  if (docFile) {
    if (docFile.zipPath === 'SW-78.docx') {
      md += `- **SW-78.docx** (${(docFile.size / 1024).toFixed(1)} KB)
  - Compliance narrative document
  - References to screenshots and evidence
  - Technical implementation details
  - Test results summary

`;
    } else {
      md += `- **SW-78-README.txt** (${(docFile.size / 1024).toFixed(1)} KB)
  - ⚠️  **Placeholder**: SW-78.docx should be added manually
  - Instructions for completing the submission package

`;
    }
  }

  md += `### 📸 Screenshots (12 files)

All screenshots captured from ESSAI test run HTML pages at 1920×1080
resolution, full page capture.

**Directory**: \`screenshots/\`

`;

  const screenshots = files.filter((f) => f.zipPath.startsWith('screenshots/'));
  for (const screenshot of screenshots) {
    const filename = path.basename(screenshot.zipPath);
    md += `- **${filename}** (${(screenshot.size / 1024).toFixed(1)} KB)\n`;
  }

  md += `\n**Total Screenshot Size**: ${(screenshots.reduce((sum, f) => sum + f.size, 0) / 1024).toFixed(1)} KB

---

### 📦 Evidence Package

Complete ESSAI test run evidence including HTML pages, certificates, and
test artifacts.

**Directory**: \`evidence/\`

`;

  const evidenceZip = files.find((f) => f.zipPath.startsWith('evidence/'));
  if (evidenceZip) {
    const filename = path.basename(evidenceZip.zipPath);
    md += `- **${filename}** (${(evidenceZip.size / 1024).toFixed(1)} KB)
  - Contains: 12 HTML evidence pages (self-contained)
  - Contains: SW78-EVIDENCE-INDEX.md
  - Test Run: ESSAI environment
  - Test Type: Enrol → Annul → Re-enrol + mTLS

`;
  }

  md += `---

### 📋 Index

- **SUBMISSION-INDEX.md** (this file)
  - Complete package inventory
  - File descriptions and locations

---

## Package Structure

\`\`\`
SW78-SUBMISSION-${timestamp}.zip
├── SW-78.docx (or SW-78-README.txt)
├── SUBMISSION-INDEX.md
├── screenshots/
│   ├── enrolment-form-config-01.png
│   ├── enrolment-submit-headers-02.png
│   ├── enrolment-success-201-03.png
│   ├── enrolment-certificate-details-04.png
│   ├── annulation-confirm-dialog-05.png
│   ├── reenrolment-submit-newkey-06.png
│   ├── reenrolment-success-201-07.png
│   ├── mtls-config-certificates-08.png
│   ├── mtls-utilisateur-test-09.png
│   ├── mtls-transaction-signature-10.png
│   ├── mtls-document-test-11.png
│   └── master-summary-overview-12.png
└── evidence/
    └── SW78-EVIDENCE-PACK-[timestamp].zip
\`\`\`

---

## File Summary

`;

  let totalSize = 0;
  for (const file of files) {
    totalSize += file.size;
    const category = file.zipPath.includes('screenshot')
      ? '📸 Screenshot'
      : file.zipPath.includes('evidence')
        ? '📦 Evidence'
        : file.zipPath.includes('.docx')
          ? '📄 Document'
          : file.zipPath.includes('README')
            ? '📄 Placeholder'
            : '📋 Index';

    md += `- ${category}: \`${file.zipPath}\` (${(file.size / 1024).toFixed(1)} KB)\n`;
  }

  md += `\n**Total Files**: ${files.length}
**Total Size**: ${(totalSize / 1024).toFixed(1)} KB

---

## Submission Checklist

Before submitting this package, verify:

- [ ] SW-78.docx is included and complete
- [ ] All 12 screenshots are present and readable
- [ ] Evidence ZIP is included
- [ ] SUBMISSION-INDEX.md is accurate
- [ ] All file sizes are reasonable (no corruption)
- [ ] Package extracts correctly
- [ ] No sensitive data exposed (test environment only)

---

## Compliance Statement

This package contains evidence of SW-78 compliance testing performed in the
ESSAI (test) environment. All certificates, transactions, and API calls were
executed against Quebec government test endpoints with test data only.

**Environment**: ESSAI (Test)
**Test Date**: ${timestamp.split('T')[0]}
**Package Type**: Compliance Evidence
**Submission Status**: Ready for Review

---

**End of Submission Index**
`;

  return md;
}

// Run
createSubmissionPackage().catch((err) => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
