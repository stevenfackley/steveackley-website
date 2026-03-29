/**
 * Generates a clean PDF of the resume from /resume/print using Playwright.
 * Run: node scripts/generate-resume-pdf.mjs
 *
 * The script:
 *   1. Starts astro dev in the background
 *   2. Waits for the server to be ready
 *   3. Uses Playwright to generate the PDF (no print dialog — real PDF output)
 *   4. Saves to public/steve-ackley-resume.pdf
 *   5. Kills the dev server
 */

import { chromium } from '@playwright/test';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const outputPath = path.join(rootDir, 'public', 'steve-ackley-resume.pdf');

const PORT = 4322; // use a spare port to avoid conflicts
const BASE_URL = `http://127.0.0.1:${PORT}`;
const PAGE_URL = `${BASE_URL}/resume/print`;

async function waitForServer(url, timeoutMs = 30_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok || res.status === 404) return; // server is up
    } catch {
      // not ready yet
    }
    await new Promise(r => setTimeout(r, 300));
  }
  throw new Error(`Server at ${url} did not start within ${timeoutMs}ms`);
}

async function main() {
  console.log('🚀 Starting Astro dev server on port', PORT, '...');

  const server = spawn(
    'npx',
    ['astro', 'dev', '--port', String(PORT)],
    {
      cwd: rootDir,
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: true,
    }
  );

  server.stdout.on('data', d => process.stdout.write(d));
  server.stderr.on('data', d => process.stderr.write(d));

  try {
    await waitForServer(`${BASE_URL}/`);
    console.log('\n✅ Server ready. Generating PDF...');

    // Use system Chrome to avoid Playwright headless-shell ICU issues on Windows
    const browser = await chromium.launch({ channel: 'chrome' });
    const page = await browser.newPage();

    // Navigate without triggering the auto-print script
    await page.goto(PAGE_URL, { waitUntil: 'networkidle' });

    // Remove the auto-print script side-effect by just generating PDF directly
    await page.pdf({
      path: outputPath,
      format: 'Letter',
      printBackground: true,
      margin: {
        top: '0.65in',
        bottom: '0.65in',
        left: '0.7in',
        right: '0.7in',
      },
    });

    await browser.close();
    console.log(`\n✅ PDF saved to: ${outputPath}`);
  } finally {
    server.kill('SIGTERM');
    console.log('🛑 Dev server stopped.');
  }
}

main().catch(err => {
  console.error('❌ Failed to generate PDF:', err);
  process.exit(1);
});
