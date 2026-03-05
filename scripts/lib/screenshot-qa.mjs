#!/usr/bin/env node
// ============================================================================
// screenshot-qa.mjs
// ============================================================================
// Takes full-page + above-the-fold screenshots of all site pages using
// Playwright at 3 viewports: desktop (1440), tablet (768), mobile (375).
//
// Route discovery:
//   1. Reads page-registry.json (single source of truth) if it exists
//   2. Falls back to --pages CLI argument
//
// Usage:
//   node scripts/lib/screenshot-qa.mjs --project /path --url https://site.netlify.app
//   node scripts/lib/screenshot-qa.mjs --project /path --url https://site.netlify.app --pages "/,/about-us/"
//   node scripts/lib/screenshot-qa.mjs --project /path --url http://localhost:4399 --pages "/" --output enhanced-screenshots
//
// Outputs:
//   {projectPath}/qa-screenshots/         (or custom --output dir)
//     ├── {slug}-desktop.png              (1440px full page)
//     ├── {slug}-desktop-fold.png         (1440px above fold only)
//     ├── {slug}-tablet.png               (768px full page)
//     ├── {slug}-mobile.png               (375px full page)
//     ├── {slug}-mobile-fold.png          (375px above fold only)
//     ├── manifest.json                   (schema-compliant manifest)
//     └── _take-screenshots.cjs           (temp Playwright script)
//
// Requires: npx playwright (auto-installs chromium if needed)
// ============================================================================

import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { execSync } from 'node:child_process';

function parseArgs() {
  const args = process.argv.slice(2);
  const parsed = {};
  for (let i = 0; i < args.length; i += 2) {
    const key = args[i]?.replace(/^--/, '');
    const value = args[i + 1];
    if (key && value) parsed[key] = value;
  }
  return parsed;
}

/**
 * Discover all routes from page-registry.json.
 * Returns array of route strings like ["/", "/about-us/", "/services/", ...]
 */
function discoverRoutes(projectPath) {
  const registryPath = join(projectPath, 'page-registry.json');
  if (!existsSync(registryPath)) return null;

  try {
    const registry = JSON.parse(readFileSync(registryPath, 'utf-8'));
    const routes = [];

    if (Array.isArray(registry)) {
      // Array format: [{ route: "/", ... }, ...]
      for (const entry of registry) {
        if (entry.route) routes.push(entry.route);
        else if (entry.path) routes.push(entry.path);
      }
    } else if (registry.pages && Array.isArray(registry.pages)) {
      // Object format: { pages: [{ route: "/", ... }] }
      for (const entry of registry.pages) {
        if (entry.route) routes.push(entry.route);
        else if (entry.path) routes.push(entry.path);
      }
    }

    if (routes.length > 0) {
      console.log(`  Discovered ${routes.length} routes from page-registry.json`);
      return routes;
    }
  } catch (e) {
    console.warn(`  Warning: Could not parse page-registry.json: ${e.message}`);
  }
  return null;
}

async function takeScreenshots(projectPath, deployUrl, pages, outputDir) {
  const screenshotDir = join(projectPath, outputDir || 'qa-screenshots');
  mkdirSync(screenshotDir, { recursive: true });

  // Ensure Playwright browsers are installed
  try {
    execSync('npx playwright install chromium --with-deps 2>/dev/null || npx playwright install chromium', {
      stdio: 'pipe',
      timeout: 120_000,
    });
  } catch (e) {
    console.error('Failed to install Playwright browsers:', e.message);
    process.exit(1);
  }

  // Generate a Playwright script that takes all screenshots at 3 viewports
  const playwrightScript = `
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const results = [];

  const pages = ${JSON.stringify(pages)};
  const deployUrl = ${JSON.stringify(deployUrl)};
  const screenshotDir = ${JSON.stringify(screenshotDir)};

  const viewports = [
    { name: 'desktop', width: 1440, height: 900, isMobile: false, foldCrop: true },
    { name: 'tablet',  width: 768,  height: 1024, isMobile: false, foldCrop: false },
    { name: 'mobile',  width: 375,  height: 812,  isMobile: true,  foldCrop: true },
  ];

  for (const route of pages) {
    const slug = route === '/' ? 'home' : route.replace(/^\\/|\\/$/g, '').replace(/\\//g, '-');
    const url = deployUrl.replace(/\\/$/, '') + route;
    const entry = { route, slug, status: 'ok' };

    try {
      for (const vp of viewports) {
        const ctx = await browser.newContext({
          viewport: { width: vp.width, height: vp.height },
          isMobile: vp.isMobile,
          userAgent: vp.isMobile
            ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1'
            : 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        });
        const page = await ctx.newPage();

        // Navigate with fallback
        await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 }).catch(() =>
          page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 })
        );

        // Wait for fonts/images to settle
        await page.waitForTimeout(1500);

        // Dismiss common cookie/popup overlays
        try {
          const dismissSelectors = [
            '[class*="cookie"] button',
            '[class*="consent"] button',
            '[class*="popup"] [class*="close"]',
            '[aria-label="Close"]',
            '.modal-close',
          ];
          for (const sel of dismissSelectors) {
            const btn = await page.$(sel);
            if (btn) {
              await btn.click().catch(() => {});
              await page.waitForTimeout(500);
              break;
            }
          }
        } catch {} // Ignore overlay dismissal failures

        // Full-page screenshot
        const fullPath = screenshotDir + '/' + slug + '-' + vp.name + '.png';
        await page.screenshot({ path: fullPath, fullPage: true });
        entry[vp.name] = fullPath;

        // Above-the-fold crop (viewport-only screenshot)
        if (vp.foldCrop) {
          // Scroll to top first
          await page.evaluate(() => window.scrollTo(0, 0));
          await page.waitForTimeout(300);
          const foldPath = screenshotDir + '/' + slug + '-' + vp.name + '-fold.png';
          await page.screenshot({ path: foldPath, fullPage: false });
          entry[vp.name + 'Fold'] = foldPath;
        }

        await ctx.close();
      }

      console.log('  \\u2713 ' + route + ' (desktop + tablet + mobile)');
    } catch (err) {
      entry.status = 'error';
      entry.error = err.message;
      console.error('  \\u2717 ' + route + ': ' + err.message);
    }

    results.push(entry);
  }

  await browser.close();

  // Write results manifest (schema-compliant with qa-results.schema.mjs)
  const fs = require('fs');
  fs.writeFileSync(
    screenshotDir + '/manifest.json',
    JSON.stringify({
      deployUrl,
      timestamp: new Date().toISOString(),
      screenshots: results
    }, null, 2)
  );

  const okCount = results.filter(r => r.status === 'ok').length;
  console.log('\\nScreenshots saved to: ' + screenshotDir);
  console.log('Total: ' + okCount + '/' + results.length + ' pages captured');
  console.log('Viewports: desktop (1440px), tablet (768px), mobile (375px)');
  console.log('Above-fold crops: desktop + mobile');
})();
`;

  const scriptPath = join(screenshotDir, '_take-screenshots.cjs');
  writeFileSync(scriptPath, playwrightScript, 'utf-8');

  try {
    execSync(`node "${scriptPath}"`, {
      stdio: 'inherit',
      timeout: 300_000, // 5 min max
      cwd: projectPath,
    });
  } catch (e) {
    console.error('Screenshot capture failed:', e.message);
  }

  // Read manifest
  const manifestPath = join(screenshotDir, 'manifest.json');
  if (existsSync(manifestPath)) {
    return JSON.parse(readFileSync(manifestPath, 'utf-8'));
  }
  return { screenshots: [] };
}

// CLI entry
const args = parseArgs();
if (!args.project || !args.url) {
  console.error('Usage: node screenshot-qa.mjs --project /path --url https://site.netlify.app [--pages "/,/about/"] [--output qa-screenshots]');
  process.exit(1);
}

// Route discovery: page-registry.json first, then --pages flag, then "/" fallback
let pages;
if (args.pages) {
  pages = args.pages.split(',').map(p => p.trim());
  console.log(`Using ${pages.length} routes from --pages argument`);
} else {
  const discovered = discoverRoutes(args.project);
  if (discovered) {
    pages = discovered;
  } else {
    console.warn('No page-registry.json found and no --pages provided. Screenshotting / only.');
    pages = ['/'];
  }
}

console.log(`\nCapturing screenshots for ${pages.length} pages at 3 viewports...`);
console.log(`Target: ${args.url}\n`);

takeScreenshots(args.project, args.url, pages, args.output).then(result => {
  const total = result.screenshots?.length || 0;
  const ok = result.screenshots?.filter(s => s.status === 'ok').length || 0;
  console.log(`\nCapture complete: ${ok}/${total} pages captured successfully`);
  if (ok < total) process.exit(1);
});
