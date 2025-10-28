#!/usr/bin/env tsx

/**
 * SW-78 Screenshot Automation
 * Captures PNG screenshots of all 12 HTML evidence pages
 */

import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer';

// Mapping from HTML files to screenshot names
const SCREENSHOT_MAPPINGS = [
  {
    html: '01-enrolment-form.html',
    screenshot: 'enrolment-form-config-01.png',
    title: 'Enrolment Form Configuration',
  },
  {
    html: '02-enrolment-submit.html',
    screenshot: 'enrolment-submit-headers-02.png',
    title: 'Enrolment Submit Headers',
  },
  {
    html: '03-enrolment-success.html',
    screenshot: 'enrolment-success-201-03.png',
    title: 'Enrolment Success Response',
  },
  {
    html: '04-enrolment-certificate.html',
    screenshot: 'enrolment-certificate-details-04.png',
    title: 'Enrolment Certificate Details',
  },
  {
    html: '05-annulation-confirm-ui.html',
    screenshot: 'annulation-confirm-dialog-05.png',
    title: 'Annulation Confirmation UI',
  },
  {
    html: '06-reenrolment-submit.html',
    screenshot: 'reenrolment-submit-newkey-06.png',
    title: 'Re-enrolment Submit (New Key)',
  },
  {
    html: '07-reenrolment-success.html',
    screenshot: 'reenrolment-success-201-07.png',
    title: 'Re-enrolment Success Response',
  },
  {
    html: '08-mtls-settings.html',
    screenshot: 'mtls-config-certificates-08.png',
    title: 'mTLS Configuration',
  },
  {
    html: '09-utilisateur-request.html',
    screenshot: 'mtls-utilisateur-test-09.png',
    title: 'mTLS /utilisateur Test',
  },
  {
    html: '10-transaction-request.html',
    screenshot: 'mtls-transaction-signature-10.png',
    title: 'mTLS /transaction Signature Test',
  },
  {
    html: '11-document-request.html',
    screenshot: 'mtls-document-test-11.png',
    title: 'mTLS /document Test',
  },
  {
    html: '12-master-summary.html',
    screenshot: 'master-summary-overview-12.png',
    title: 'Master Summary Overview',
  },
];

async function captureScreenshots(): Promise<void> {
  // Check for command-line arguments (for DEV support)
  const customPagesDir = process.argv[2];
  const customOutputDir = process.argv[3];

  const pagesDir = customPagesDir || path.join('docs', 'sw78-evidence', 'pages');
  const outputDir = customOutputDir || path.join('tmp', 'logs', 'SW78-SCREENSHOTS');
  const envLabel = customPagesDir ? 'DEV' : 'ESSAI';

  console.log(`📸 SW-78 SCREENSHOT AUTOMATION (${envLabel})\n`);

  if (!fs.existsSync(pagesDir)) {
    throw new Error(`❌ Pages directory not found: ${pagesDir}. Run appropriate evidence builder first.`);
  }

  // Create output directory
  fs.mkdirSync(outputDir, { recursive: true });

  console.log('🌐 Launching headless browser...\n');

  // Launch Puppeteer
  const browser = await puppeteer.launch({
    headless: true,
    defaultViewport: {
      width: 1920,
      height: 1080,
    },
  });

  const page = await browser.newPage();

  console.log('📸 Capturing screenshots...\n');

  const results: Array<{ html: string; screenshot: string; path: string; size: number }> = [];

  for (const mapping of SCREENSHOT_MAPPINGS) {
    const htmlPath = path.join(pagesDir, mapping.html);
    const screenshotPath = path.join(outputDir, mapping.screenshot);

    if (!fs.existsSync(htmlPath)) {
      console.log(`  ⚠️  ${mapping.html} not found, skipping`);
      continue;
    }

    // Load HTML file - convert to absolute path
    const absolutePath = path.resolve(htmlPath);
    const htmlUrl = `file:///${absolutePath.replace(/\\/g, '/')}`;
    await page.goto(htmlUrl, { waitUntil: 'networkidle0' });

    // Wait a bit for rendering
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Take screenshot (full page)
    await page.screenshot({
      path: screenshotPath,
      fullPage: true,
      type: 'png',
    });

    const stats = fs.statSync(screenshotPath);
    results.push({
      html: mapping.html,
      screenshot: mapping.screenshot,
      path: screenshotPath,
      size: stats.size,
    });

    console.log(`  ✓ ${mapping.screenshot} (${(stats.size / 1024).toFixed(1)} KB)`);
  }

  await browser.close();

  console.log('\n📋 Generating shots-index.md...\n');

  // Generate shots-index.md
  const indexContent = generateIndex(results);
  const indexPath = path.join(outputDir, 'shots-index.md');
  fs.writeFileSync(indexPath, indexContent);

  console.log(`  ✓ shots-index.md\n`);

  // Summary
  const totalSize = results.reduce((sum, r) => sum + r.size, 0);

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ SCREENSHOT CAPTURE COMPLETE\n');
  console.log(`📁 Output: ${outputDir}`);
  console.log(`📸 Screenshots: ${results.length} files`);
  console.log(`📦 Total Size: ${(totalSize / 1024).toFixed(1)} KB`);
  console.log(`📋 Index: shots-index.md`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

function generateIndex(
  results: Array<{ html: string; screenshot: string; path: string; size: number }>
): string {
  const timestamp = new Date().toISOString();

  let md = `# SW-78 Screenshots Index

**Generated**: ${timestamp}
**Screenshot Count**: ${results.length}

---

## Screenshots

`;

  for (const result of results) {
    const mapping = SCREENSHOT_MAPPINGS.find((m) => m.html === result.html);

    md += `### ${mapping?.title || result.html}\n\n`;
    md += `**HTML Source**: [${result.html}](../../../docs/sw78-evidence/pages/${result.html})\n\n`;
    md += `**Screenshot**: \`${result.screenshot}\`\n\n`;
    md += `**File Path**: \`${result.path}\`\n\n`;
    md += `**Size**: ${(result.size / 1024).toFixed(1)} KB\n\n`;
    md += `---\n\n`;
  }

  md += `## Summary

- **Total Screenshots**: ${results.length}
- **Total Size**: ${(results.reduce((sum, r) => sum + r.size, 0) / 1024).toFixed(1)} KB
- **Format**: PNG (Full Page)
- **Resolution**: 1920×1080 viewport (full page height)

---

**Next Steps**: Review screenshots for clarity and completeness before packaging for SW-78 submission.
`;

  return md;
}

// Run
captureScreenshots().catch((err) => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
