#!/usr/bin/env node
// ============================================================================
// convert-large-pngs.mjs
// ============================================================================
// Converts PNG images > 1MB to JPEG at 85% quality to reduce repo size.
// Removes the original PNG after successful conversion.
//
// Usage:
//   node scripts/lib/convert-large-pngs.mjs --project /path/to/project
//
// Scans: src/assets/images/ recursively
// Requires: sharp (installed as devDependency)
// ============================================================================

import fs from 'node:fs';
import path from 'node:path';
import { buildLog } from './build-logger.mjs';

const SIZE_THRESHOLD = 1_000_000; // 1MB

function parseArgs() {
  const args = process.argv.slice(2);
  const flags = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i]?.startsWith('--')) {
      const key = args[i].slice(2);
      const val = args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : 'true';
      flags[key] = val;
      if (val !== 'true') i++;
    }
  }
  return flags;
}

function findPngs(dir) {
  const results = [];
  if (!fs.existsSync(dir)) return results;

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...findPngs(fullPath));
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.png')) {
      const stat = fs.statSync(fullPath);
      if (stat.size > SIZE_THRESHOLD) {
        results.push({ path: fullPath, size: stat.size });
      }
    }
  }
  return results;
}

async function main() {
  const flags = parseArgs();
  const projectPath = flags.project || process.cwd();
  const log = buildLog(projectPath);

  const imagesDir = path.join(projectPath, 'src', 'assets', 'images');
  const largePngs = findPngs(imagesDir);

  if (largePngs.length === 0) {
    console.log('No PNGs > 1MB found — nothing to convert.');
    return;
  }

  console.log(`Found ${largePngs.length} PNG(s) > 1MB to convert:`);

  // Try to import sharp — it may not be installed
  let sharp;
  try {
    sharp = (await import('sharp')).default;
  } catch {
    console.warn('sharp not installed — skipping PNG conversion. Run: npm i -D sharp');
    log.warning('convert-large-pngs', `${largePngs.length} large PNGs found but sharp not installed`);
    return;
  }

  let converted = 0;
  for (const png of largePngs) {
    const jpgPath = png.path.replace(/\.png$/i, '.jpg');
    const sizeMB = (png.size / 1_000_000).toFixed(2);
    const relPath = path.relative(projectPath, png.path);

    try {
      await sharp(png.path).jpeg({ quality: 85 }).toFile(jpgPath);
      const newStat = fs.statSync(jpgPath);
      const newSizeMB = (newStat.size / 1_000_000).toFixed(2);

      // Delete original PNG
      fs.unlinkSync(png.path);
      converted++;

      console.log(`  ✓ ${relPath}: ${sizeMB}MB PNG → ${newSizeMB}MB JPG`);
    } catch (err) {
      console.warn(`  ✗ Failed to convert ${relPath}: ${err.message}`);
      // Clean up partial JPG if it exists
      if (fs.existsSync(jpgPath)) fs.unlinkSync(jpgPath);
    }
  }

  log.info('convert-large-pngs', `Converted ${converted}/${largePngs.length} large PNGs to JPEG`);
  console.log(`\nConverted ${converted}/${largePngs.length} PNGs.`);
}

main();
