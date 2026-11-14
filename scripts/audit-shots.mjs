/**
 * Audit screenshot pass — captures every page at desktop + mobile widths.
 * Usage: node scripts/audit-shots.mjs [baseUrl]
 * Output: audit-shots/<page>-<viewport>.png
 *
 * Kept out of `test-results/` because Playwright clears that directory at the
 * start of every test run.
 */
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const base = process.argv[2] ?? 'http://localhost:3000';
const outDir = join('audit-shots');
mkdirSync(outDir, { recursive: true });

const pages = [
  { name: 'home', path: '/' },
  { name: 'tree', path: '/tree' },
  { name: 'phone', path: '/phone' },
];

const viewports = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'mobile', width: 390, height: 844 },
];

const browser = await chromium.launch();
const errors = [];

for (const vp of viewports) {
  const context = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    deviceScaleFactor: 1,
    isMobile: vp.name === 'mobile',
    hasTouch: vp.name === 'mobile',
  });
  const page = await context.newPage();
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(`[${vp.name}] console.error: ${msg.text()}`);
  });
  page.on('pageerror', (err) => errors.push(`[${vp.name}] pageerror: ${err.message}`));

  for (const p of pages) {
    const url = `${base}${p.path}`;
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
      // polling never lets the network go idle — settle manually (dev compile can be slow)
      await page.waitForTimeout(5000);
      const file = join(outDir, `${p.name}-${vp.name}.png`);
      // The WebGL fallback renders in software here, so a stable frame takes a while.
      await page.screenshot({ path: file, fullPage: true, timeout: 90000 });
      console.log('shot', file);
    } catch (err) {
      console.error(`FAILED ${url} @ ${vp.name}:`, err.message);
      errors.push(`[${vp.name}] ${p.path}: ${err.message}`);
    }
  }
  await context.close();
}

await browser.close();

if (errors.length) {
  console.log('\n--- console/page errors ---');
  for (const e of errors) console.log(e);
} else {
  console.log('\nNo console or page errors.');
}
