import fs from 'node:fs';
import path from 'node:path';
import { BuildState, PHASE_IDS, createInitialState } from '../schemas/build-state.schema.mjs';
import { validateSiteConfig } from './config-validator.mjs';

const BUILD_STATE_FILE = 'build-state.json';

// ============================================================================
// Image dimension reader — reads JPEG SOF0 marker, no dependencies
// ============================================================================

/**
 * Read JPEG dimensions from file header (SOF0/SOF2 marker).
 * Returns { width, height } or null if not a valid JPEG.
 */
function readJpegDimensions(filePath) {
  try {
    const buf = fs.readFileSync(filePath);
    if (buf[0] !== 0xFF || buf[1] !== 0xD8) return null; // not JPEG

    let offset = 2;
    while (offset < buf.length - 1) {
      if (buf[offset] !== 0xFF) return null;
      const marker = buf[offset + 1];

      // SOF0 (0xC0) or SOF2 (0xC2) — contains dimensions
      if (marker === 0xC0 || marker === 0xC2) {
        const height = buf.readUInt16BE(offset + 5);
        const width = buf.readUInt16BE(offset + 7);
        return { width, height };
      }

      // Skip non-SOF markers
      if (marker === 0xD9) return null; // EOI
      if (marker === 0xDA) return null; // SOS — no SOF found before scan data

      const segLen = buf.readUInt16BE(offset + 2);
      offset += 2 + segLen;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Read PNG dimensions from IHDR chunk.
 * Returns { width, height } or null if not a valid PNG.
 */
function readPngDimensions(filePath) {
  try {
    const buf = fs.readFileSync(filePath, { length: 32 });
    // PNG signature: 137 80 78 71 13 10 26 10
    if (buf[0] !== 0x89 || buf[1] !== 0x50 || buf[2] !== 0x4E || buf[3] !== 0x47) return null;
    const width = buf.readUInt32BE(16);
    const height = buf.readUInt32BE(20);
    return { width, height };
  } catch {
    return null;
  }
}

/**
 * Read image dimensions (JPEG or PNG).
 * Returns { width, height } or null.
 */
function readImageDimensions(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.jpg' || ext === '.jpeg') return readJpegDimensions(filePath);
  if (ext === '.png') return readPngDimensions(filePath);
  return null; // webp/svg/gif not checked — only FAL outputs matter
}

// ============================================================================
// Required aspect ratios per placement (from IMAGE-PROMPT-REFERENCE.md)
// ============================================================================

// Tolerance: allow 5% deviation from expected ratio to account for rounding
const ASPECT_RATIO_TOLERANCE = 0.05;

const PLACEMENT_DIMENSIONS = {
  'card':    { expectedWidth: 1024, expectedHeight: 768,  label: '4:3' },
  'hero':    { expectedWidth: 1920, expectedHeight: 823,  label: '~21:9' },
  'content': { expectedWidth: 1200, expectedHeight: 800,  label: '3:2' },
  'home-hero':    { expectedWidth: 1920, expectedHeight: 823, label: '~21:9' },
  'inner-hero':   { expectedWidth: 1920, expectedHeight: 823, label: '~21:9' },
  'service-areas': { expectedWidth: 1920, expectedHeight: 823, label: '~21:9' },
  'og-image':     { expectedWidth: 1200, expectedHeight: 630, label: 'OG 1200x630' },
};

/**
 * Check if image dimensions match the expected ratio for its placement.
 * @param {number} width
 * @param {number} height
 * @param {{ expectedWidth: number, expectedHeight: number }} expected
 * @returns {boolean}
 */
function dimensionsMatchPlacement(width, height, expected) {
  const actualRatio = width / height;
  const expectedRatio = expected.expectedWidth / expected.expectedHeight;
  return Math.abs(actualRatio - expectedRatio) / expectedRatio <= ASPECT_RATIO_TOLERANCE;
}

/**
 * Detect flux/schnell default output: all images are exactly 1024x576 (16:9).
 * This is the smoking gun for wrong model usage.
 * @param {{ width: number, height: number }[]} dimensions
 * @returns {boolean}
 */
function detectFluxSchnellSignature(dimensions) {
  if (dimensions.length < 3) return false;
  return dimensions.every(d => d.width === 1024 && d.height === 576);
}

// ============================================================================
// Phase prerequisite map — which phases must be complete before each phase
// ============================================================================

const PHASE_PREREQUISITES = {
  'phase-1':   ['phase-0'],
  'phase-2':   ['phase-1'],
  'phase-3':   ['phase-1'],
  'phase-4':   ['phase-3'],
  'phase-5':   ['phase-4'],
  'phase-6':   ['phase-3'],
  'phase-6b':  ['phase-6'],
  'phase-7a':  ['phase-5'],
  'phase-7b':  ['phase-7a'],
  'phase-7':   ['phase-6b'],
  'phase-7.5': ['phase-7'],
  'phase-7.6': ['phase-7.5'],
  'phase-7.7': ['phase-7.6'],
  'phase-7.8': ['phase-7.7'],
  'phase-7.9': ['phase-7.8'],
  'phase-8':   ['phase-7.9'],
  'phase-9':   ['phase-8'],
  'phase-10':  ['phase-9'],
};

// ============================================================================
// Status file naming validation
// ============================================================================

/**
 * Check that phase status files use correct naming convention.
 * Dots in phase IDs (e.g. phase-7.5) should use dots in filenames,
 * not hyphens (phase-7.5-status.json NOT phase-7-5-status.json).
 * @param {string} projectPath
 * @returns {string|null} Error message or null
 */
function validateStatusFileNaming(projectPath) {
  const files = fs.readdirSync(projectPath).filter(f => f.startsWith('phase-') && f.endsWith('-status.json'));
  const badFiles = [];

  for (const file of files) {
    // Extract the phase part: "phase-7-8-status.json" → "7-8", "phase-7.8-status.json" → "7.8"
    const match = file.match(/^phase-(.+)-status\.json$/);
    if (!match) continue;
    const phaseNum = match[1];

    // Check if this looks like it should have a dot (e.g., "7-5" should be "7.5")
    // Valid: "1", "2", "6a", "6b", "7", "B-start"
    // Invalid: "7-5" (should be "7.5"), "7-6" (should be "7.6"), "7-8" (should be "7.8")
    const hyphenatedSubPhase = phaseNum.match(/^(\d+)-(\d+)$/);
    if (hyphenatedSubPhase) {
      const correctName = `phase-${hyphenatedSubPhase[1]}.${hyphenatedSubPhase[2]}-status.json`;
      badFiles.push(`"${file}" should be "${correctName}" (use dots for sub-phases)`);
    }
  }

  if (badFiles.length > 0) {
    return `Status file naming violations:\n  - ${badFiles.join('\n  - ')}`;
  }
  return null;
}

// ============================================================================
// BUILD-REPORT.md section validation
// ============================================================================

/**
 * Check that BUILD-REPORT.md has sections for all completed phases.
 * Each phase section should start with "## Phase N" or "## Phase N.N".
 * @param {string} projectPath
 * @param {object} phases - The phases object from build-state.json
 * @returns {string|null} Error message or null
 */
function validateBuildReportSections(projectPath, phases) {
  const reportPath = path.join(projectPath, 'BUILD-REPORT.md');
  if (!fs.existsSync(reportPath)) return null; // checked elsewhere

  const content = fs.readFileSync(reportPath, 'utf-8');

  // Extract all phase headings from the report
  const reportedPhases = new Set();
  const headingMatches = content.matchAll(/^##\s+Phase\s+([\d.]+\w?)/gm);
  for (const m of headingMatches) {
    reportedPhases.add(m[1]);
  }
  // Also match "## Phase B-start" style
  const specialMatches = content.matchAll(/^##\s+Phase\s+([A-Z]-\w+)/gm);
  for (const m of specialMatches) {
    reportedPhases.add(m[1]);
  }

  // Check which completed phases are missing from the report
  const missing = [];
  for (const [phaseId, phaseData] of Object.entries(phases)) {
    if (phaseData.status !== 'completed') continue;

    // Extract the phase number from the ID: "phase-6b" → "6b", "phase-7.5" → "7.5"
    const phaseNum = phaseId.replace('phase-', '');

    // Skip phases that aren't typically logged (0, 7a, 7b)
    if (['0', '7a', '7b'].includes(phaseNum)) continue;

    if (!reportedPhases.has(phaseNum)) {
      missing.push(phaseId);
    }
  }

  if (missing.length > 0) {
    return `BUILD-REPORT.md missing sections for completed phases: ${missing.join(', ')}. Every teammate MUST log via build-report.mjs.`;
  }
  return null;
}

// ============================================================================
// Artifact checks per phase — verifies files actually exist on disk
// ============================================================================

const ARTIFACT_CHECKS = {
  'phase-1': (projectPath, builderType) => {
    const configPath = path.join(projectPath, 'client-config.json');
    if (!fs.existsSync(configPath)) return 'client-config.json does not exist';
    return null;
  },
  'phase-3': (projectPath, builderType) => {
    const siteConfig = path.join(projectPath, 'src', 'site.config.ts');
    const pkg = path.join(projectPath, 'package.json');
    const buildReport = path.join(projectPath, 'BUILD-REPORT.md');
    const buildLog = path.join(projectPath, 'BUILD-LOG.md');
    const businessContext = path.join(projectPath, 'BUSINESS-CONTEXT.md');
    if (!fs.existsSync(siteConfig)) return 'src/site.config.ts does not exist';
    if (!fs.existsSync(pkg)) return 'package.json does not exist';
    if (!fs.existsSync(buildReport) && !fs.existsSync(buildLog)) return 'BUILD-REPORT.md does not exist — initialize with build-report.mjs --init';
    if (!fs.existsSync(businessContext)) return 'BUSINESS-CONTEXT.md does not exist — must be created before Phase 3 clone (see SKILL.md)';
    return null;
  },
  'phase-4': (projectPath, builderType) => {
    if (builderType === 'template') {
      const config = path.join(projectPath, 'src', 'site.config.ts');
      if (!fs.existsSync(config)) return 'src/site.config.ts does not exist';

      // Run full Zod config validation
      const validation = validateSiteConfig(projectPath);
      if (!validation.valid) {
        return `Config validation failed: ${validation.errors[0]}`;
      }
    } else {
      const contentDir = path.join(projectPath, 'src', 'content');
      if (!fs.existsSync(contentDir)) return 'src/content/ directory does not exist';
      const registry = path.join(projectPath, 'page-registry.json');
      if (!fs.existsSync(registry)) return 'page-registry.json does not exist';
    }
    return null;
  },
  'phase-5': (projectPath, builderType) => {
    if (builderType === 'template') {
      const css = path.join(projectPath, 'src', 'styles', 'global.css');
      if (!fs.existsSync(css)) return 'src/styles/global.css does not exist';
    } else {
      const registry = path.join(projectPath, 'page-registry.json');
      if (!fs.existsSync(registry)) return 'page-registry.json does not exist';
    }
    return null;
  },

  // Phase 6: Airtable image downloads (Stage A)
  'phase-6': (projectPath, builderType) => {
    if (builderType !== 'template') {
      const manifest = path.join(projectPath, 'image-manifest.json');
      if (!fs.existsSync(manifest)) return 'image-manifest.json does not exist';
      return null;
    }

    const imagesTs = path.join(projectPath, 'src', 'images.ts');
    if (!fs.existsSync(imagesTs)) return 'src/images.ts does not exist';
    const content = fs.readFileSync(imagesTs, 'utf-8');
    if (!content.includes('import.meta.glob')) {
      return 'src/images.ts does not use import.meta.glob() — may be outdated';
    }

    // Verify key placement folders exist and have real images (not placeholder stubs)
    const imagesBase = path.join(projectPath, 'src', 'assets', 'images');
    const requiredFolders = ['home-hero', 'inner-hero', 'gallery'];
    for (const folder of requiredFolders) {
      const dir = path.join(imagesBase, folder);
      if (!fs.existsSync(dir)) return `Missing required image folder: ${folder}/`;
      const files = fs.readdirSync(dir).filter(f => /\.(jpg|jpeg|png|webp|svg|gif)$/.test(f));
      if (files.length === 0) return `Image folder empty: ${folder}/`;
      const stubs = files.filter(f => fs.statSync(path.join(dir, f)).size < 1024);
      if (stubs.length === files.length) return `All images in ${folder}/ are placeholders (< 1KB)`;
    }

    return null;
  },

  // Phase 6b: AI image generation (Stage B) — THE HARDENED GATE
  'phase-6b': (projectPath, builderType) => {
    if (builderType !== 'template') return null;

    // 1. IMAGE-PROMPTS.md must exist
    const imagePrompts = path.join(projectPath, 'IMAGE-PROMPTS.md');
    if (!fs.existsSync(imagePrompts)) {
      return 'IMAGE-PROMPTS.md does not exist — must be generated before image generation (see image-processor teammate)';
    }

    // 2. generated-images-manifest.json must exist with correct model
    const manifestPath = path.join(projectPath, 'generated-images-manifest.json');
    if (!fs.existsSync(manifestPath)) {
      return 'generated-images-manifest.json does not exist. Images must be generated via fal-api.mjs.';
    }

    let manifest;
    try {
      manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    } catch (e) {
      return `generated-images-manifest.json is invalid JSON: ${e.message}`;
    }

    const REQUIRED_MODEL = 'fal-ai/nano-banana-pro';
    if (manifest.model !== REQUIRED_MODEL) {
      return `Wrong FAL model in manifest: "${manifest.model}". Required: "${REQUIRED_MODEL}".`;
    }
    if (manifest.promptSource !== 'IMAGE-PROMPTS.md') {
      return `Images not generated from IMAGE-PROMPTS.md (promptSource: "${manifest.promptSource || 'missing'}").`;
    }

    // 3. Verify each service has card/hero/content images with CORRECT DIMENSIONS
    const imagesBase = path.join(projectPath, 'src', 'assets', 'images');
    const siteConfigPath = path.join(projectPath, 'src', 'site.config.ts');
    const allDimensions = [];
    const dimensionErrors = [];

    if (fs.existsSync(siteConfigPath)) {
      const configContent = fs.readFileSync(siteConfigPath, 'utf-8');
      const slugMatches = [...configContent.matchAll(/slug:\s*["']([^"']+)["']/g)];

      for (const [, slug] of slugMatches) {
        for (const placement of ['card', 'hero', 'content']) {
          const dir = path.join(imagesBase, 'services', slug, placement);
          if (!fs.existsSync(dir)) return `Missing service image folder: services/${slug}/${placement}/`;
          const files = fs.readdirSync(dir).filter(f => /\.(jpg|jpeg|png|webp)$/.test(f));
          if (files.length === 0) return `No image in services/${slug}/${placement}/`;
          if (files.every(f => fs.statSync(path.join(dir, f)).size < 1024)) {
            return `Placeholder stub in services/${slug}/${placement}/ — needs FAL generation`;
          }

          // Check dimensions of the first real image
          const realFile = files.find(f => fs.statSync(path.join(dir, f)).size >= 1024);
          if (realFile) {
            const dims = readImageDimensions(path.join(dir, realFile));
            if (dims) {
              allDimensions.push(dims);
              const expected = PLACEMENT_DIMENSIONS[placement];
              if (expected && !dimensionsMatchPlacement(dims.width, dims.height, expected)) {
                dimensionErrors.push(
                  `services/${slug}/${placement}: ${dims.width}x${dims.height} — expected ${expected.label} (${expected.expectedWidth}x${expected.expectedHeight})`
                );
              }
            }
          }
        }
      }
    }

    // 4. Check brand image dimensions
    for (const [folder, expected] of Object.entries(PLACEMENT_DIMENSIONS)) {
      if (['card', 'hero', 'content'].includes(folder)) continue; // service placements checked above
      const dir = path.join(imagesBase, folder);
      if (!fs.existsSync(dir)) continue; // not all brand folders are required at this gate
      const files = fs.readdirSync(dir).filter(f => /\.(jpg|jpeg|png|webp)$/.test(f));
      const realFile = files.find(f => fs.statSync(path.join(dir, f)).size >= 1024);
      if (realFile) {
        const dims = readImageDimensions(path.join(dir, realFile));
        if (dims) {
          allDimensions.push(dims);
          if (!dimensionsMatchPlacement(dims.width, dims.height, expected)) {
            dimensionErrors.push(
              `${folder}: ${dims.width}x${dims.height} — expected ${expected.label} (${expected.expectedWidth}x${expected.expectedHeight})`
            );
          }
        }
      }
    }

    // 5. SMOKING GUN: detect flux/schnell signature (all images 1024x576)
    if (detectFluxSchnellSignature(allDimensions)) {
      return `ALL generated images are 1024x576 (16:9) — this is the default output of fal-ai/flux/schnell, not nano-banana-pro. ` +
        `nano-banana-pro produces placement-specific dimensions (21:9 for heroes, 4:3 for cards, 3:2 for content). ` +
        `The manifest model field appears to be faked. Re-generate ALL images using the correct model with correct aspect ratios.`;
    }

    // 6. Report individual dimension mismatches
    if (dimensionErrors.length > 0) {
      return `Image dimension mismatches (wrong aspect ratios):\n  - ${dimensionErrors.join('\n  - ')}\n` +
        `Required: hero=21:9 (1920x823), card=4:3 (1024x768), content=3:2 (1200x800). Re-generate with correct image_size params.`;
    }

    // 7. Check manifest entries match actual files on disk
    if (manifest.images && Array.isArray(manifest.images)) {
      for (const entry of manifest.images) {
        const imgPath = path.join(projectPath, entry.path);
        if (!fs.existsSync(imgPath)) {
          return `Manifest references "${entry.path}" but file does not exist on disk.`;
        }
        // Cross-check manifest dimensions vs actual file dimensions
        if (entry.width && entry.height) {
          const actualDims = readImageDimensions(imgPath);
          if (actualDims && (actualDims.width !== entry.width || actualDims.height !== entry.height)) {
            return `Manifest claims "${entry.path}" is ${entry.width}x${entry.height} but actual file is ${actualDims.width}x${actualDims.height}. Manifest appears fabricated.`;
          }
        }
      }
    }

    return null;
  },

  // Phase 7.5: Uniqueness tweaks
  'phase-7.5': (projectPath, builderType) => {
    if (builderType !== 'template') return null;

    // uniqueness-config.json should exist documenting what was applied
    const configPath = path.join(projectPath, 'uniqueness-config.json');
    if (!fs.existsSync(configPath)) {
      return 'uniqueness-config.json does not exist — uniqueness-tweaker must write its config';
    }

    // Verify the phase status file uses correct naming
    const correctStatusFile = path.join(projectPath, 'phase-7.5-status.json');
    const wrongStatusFile = path.join(projectPath, 'phase-7-5-status.json');
    if (fs.existsSync(wrongStatusFile) && !fs.existsSync(correctStatusFile)) {
      return 'Status file uses wrong naming: "phase-7-5-status.json" should be "phase-7.5-status.json" (dots, not hyphens for sub-phases)';
    }

    return null;
  },

  // Phase 7.7: Build checklist (post-build.mjs validation)
  'phase-7.7': (projectPath, builderType) => {
    if (builderType !== 'template') return null;

    const checklist = path.join(projectPath, 'BUILD-CHECKLIST.md');
    if (!fs.existsSync(checklist)) {
      return 'BUILD-CHECKLIST.md does not exist — Phase 7.7 requires running post-build.mjs';
    }

    return null;
  },

  // Phase 7.8: Design enhancement
  'phase-7.8': (projectPath, builderType) => {
    if (builderType !== 'template') return null;

    const enhancements = path.join(projectPath, 'DESIGN-ENHANCEMENTS.md');
    if (!fs.existsSync(enhancements)) {
      return 'DESIGN-ENHANCEMENTS.md does not exist — design-enhancer must document its changes';
    }

    // Verify correct status file naming
    const correctStatusFile = path.join(projectPath, 'phase-7.8-status.json');
    const wrongStatusFile = path.join(projectPath, 'phase-7-8-status.json');
    if (fs.existsSync(wrongStatusFile) && !fs.existsSync(correctStatusFile)) {
      return 'Status file uses wrong naming: "phase-7-8-status.json" should be "phase-7.8-status.json"';
    }

    return null;
  },

  // Phase 7.9: Final production build
  'phase-7.9': (projectPath, builderType) => {
    if (builderType !== 'template') return null;

    // dist/ must exist
    const dist = path.join(projectPath, 'dist');
    if (!fs.existsSync(dist)) {
      return 'dist/ does not exist — Phase 7.9 final build did not produce output';
    }

    // Verify correct status file naming
    const correctStatusFile = path.join(projectPath, 'phase-7.9-status.json');
    const wrongStatusFile = path.join(projectPath, 'phase-7-9-status.json');
    if (fs.existsSync(wrongStatusFile) && !fs.existsSync(correctStatusFile)) {
      return 'Status file uses wrong naming: "phase-7-9-status.json" should be "phase-7.9-status.json"';
    }

    return null;
  },

  'phase-8': (projectPath, builderType) => {
    const stateFile = path.join(projectPath, 'build-state.json');
    if (!fs.existsSync(stateFile)) return 'build-state.json does not exist';
    try {
      const state = JSON.parse(fs.readFileSync(stateFile, 'utf-8'));
      if (!state.metadata?.deployUrl) {
        return 'deployUrl not set in build-state.json metadata — deploy must record it via updateMetadata()';
      }
      try { new URL(state.metadata.deployUrl); } catch {
        return `deployUrl "${state.metadata.deployUrl}" is not a valid URL`;
      }
    } catch (e) {
      return `Cannot read build-state.json: ${e.message}`;
    }
    return null;
  },
  'phase-9': (projectPath, builderType) => {
    const requiredResults = [
      { file: 'seo-qa-results.json', agent: 'seo-qa' },
      { file: 'design-review.json', agent: 'design-reviewer' },
      { file: 'image-qa-results.json', agent: 'image-qa' },
    ];

    for (const { file, agent } of requiredResults) {
      const filePath = path.join(projectPath, file);
      if (!fs.existsSync(filePath)) {
        return `${file} does not exist — ${agent} agent did not run`;
      }
      try {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        if (typeof data.passed !== 'boolean') {
          return `${file} missing "passed" field — may be corrupt`;
        }
        if (data.agent !== agent) {
          return `${file} has agent="${data.agent}", expected "${agent}"`;
        }
      } catch (e) {
        return `${file} is invalid JSON: ${e.message}`;
      }
    }

    const manifestPath = path.join(projectPath, 'qa-screenshots', 'manifest.json');
    if (!fs.existsSync(manifestPath)) {
      return 'qa-screenshots/manifest.json does not exist — design-reviewer did not capture screenshots';
    }
    try {
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
      if (!manifest.screenshots || manifest.screenshots.length === 0) {
        return 'Screenshot manifest has no entries';
      }
      const successful = manifest.screenshots.filter(s => s.status === 'ok');
      if (successful.length === 0) {
        return 'No successful screenshots in manifest';
      }
    } catch (e) {
      return `qa-screenshots/manifest.json is invalid: ${e.message}`;
    }

    const mergedPath = path.join(projectPath, 'qa-results.json');
    if (!fs.existsSync(mergedPath)) {
      return 'qa-results.json does not exist — run validate-qa.mjs to merge results';
    }

    return null;
  },
};

// ============================================================================
// Core gate functions
// ============================================================================

/** Read and validate build-state.json */
export function getBuildState(projectPath) {
  const filePath = path.join(projectPath, BUILD_STATE_FILE);
  if (!fs.existsSync(filePath)) {
    return { exists: false, error: `${BUILD_STATE_FILE} not found at ${filePath}` };
  }
  const raw = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  const result = BuildState.safeParse(raw);
  if (!result.success) {
    return { exists: true, valid: false, error: `Invalid build-state.json: ${result.error.message}` };
  }
  return { exists: true, valid: true, state: result.data };
}

/** Initialize build-state.json */
export function initBuildState(projectPath, buildId, builderType, metadata = {}) {
  if (!fs.existsSync(projectPath)) {
    fs.mkdirSync(projectPath, { recursive: true });
  }
  const state = createInitialState(buildId, builderType, projectPath, metadata);
  const filePath = path.join(projectPath, BUILD_STATE_FILE);
  fs.writeFileSync(filePath, JSON.stringify(state, null, 2));
  return state;
}

/** Check if a required phase is completed, including artifact validation */
export function checkGate(projectPath, requiredPhaseId) {
  const result = getBuildState(projectPath);
  if (!result.exists) return { passed: false, reason: result.error };
  if (!result.valid) return { passed: false, reason: result.error };

  const { state } = result;
  const phase = state.phases[requiredPhaseId];
  if (!phase) return { passed: false, reason: `Unknown phase: ${requiredPhaseId}` };
  if (phase.status !== 'completed') {
    return { passed: false, reason: `${requiredPhaseId} status is "${phase.status}", expected "completed"` };
  }

  // Run artifact checks if defined
  const artifactCheck = ARTIFACT_CHECKS[requiredPhaseId];
  if (artifactCheck) {
    const artifactError = artifactCheck(projectPath, state.builderType);
    if (artifactError) {
      return { passed: false, reason: `${requiredPhaseId} artifacts invalid: ${artifactError}` };
    }
  }

  return { passed: true };
}

/** Check that ALL phases up to (and including) a given phase are completed */
export function checkAllGates(projectPath, upToPhaseId) {
  const result = getBuildState(projectPath);
  if (!result.exists) return { passed: false, reason: result.error };
  if (!result.valid) return { passed: false, reason: result.error };

  const idx = PHASE_IDS.indexOf(upToPhaseId);
  if (idx === -1) return { passed: false, reason: `Unknown phase: ${upToPhaseId}` };

  const failures = [];
  for (let i = 0; i <= idx; i++) {
    const gate = checkGate(projectPath, PHASE_IDS[i]);
    if (!gate.passed) failures.push(gate.reason);
  }

  if (failures.length > 0) {
    return { passed: false, reason: `Gate failures:\n  - ${failures.join('\n  - ')}` };
  }
  return { passed: true };
}

/** Mark a phase as completed — runs prerequisite + artifact checks first */
export function completePhase(projectPath, phaseId, artifacts = {}, { skipArtifactCheck = false } = {}) {
  const result = getBuildState(projectPath);
  if (!result.exists || !result.valid) throw new Error(result.error);

  const { state } = result;

  // Enforce phase ordering: check prerequisites are completed
  const prereqs = PHASE_PREREQUISITES[phaseId];
  if (prereqs) {
    for (const prereq of prereqs) {
      const prereqPhase = state.phases[prereq];
      if (!prereqPhase || prereqPhase.status !== 'completed') {
        throw new Error(
          `Cannot complete ${phaseId} — prerequisite ${prereq} is "${prereqPhase?.status || 'missing'}", must be "completed". ` +
          `Run phases in order.`
        );
      }
    }
  }

  // Run artifact validation before allowing completion (unless explicitly skipped)
  if (!skipArtifactCheck) {
    const artifactCheck = ARTIFACT_CHECKS[phaseId];
    if (artifactCheck) {
      const artifactError = artifactCheck(projectPath, state.builderType);
      if (artifactError) {
        throw new Error(`Cannot complete ${phaseId} — artifact check failed: ${artifactError}`);
      }
    }
  }

  state.phases[phaseId] = {
    status: 'completed',
    completedAt: new Date().toISOString(),
    artifacts,
  };

  const filePath = path.join(projectPath, BUILD_STATE_FILE);
  fs.writeFileSync(filePath, JSON.stringify(state, null, 2));
  return state;
}

/** Mark a phase as failed */
export function failPhase(projectPath, phaseId, errorMessage) {
  const result = getBuildState(projectPath);
  if (!result.exists || !result.valid) throw new Error(result.error);

  const state = result.state;
  state.phases[phaseId] = {
    status: 'failed',
    error: errorMessage,
  };

  const filePath = path.join(projectPath, BUILD_STATE_FILE);
  fs.writeFileSync(filePath, JSON.stringify(state, null, 2));
  return state;
}

/** Mark a phase as in_progress — checks prerequisites first */
export function startPhase(projectPath, phaseId) {
  const result = getBuildState(projectPath);
  if (!result.exists || !result.valid) throw new Error(result.error);

  const { state } = result;

  // Enforce prerequisites before even starting a phase
  const prereqs = PHASE_PREREQUISITES[phaseId];
  if (prereqs) {
    for (const prereq of prereqs) {
      const prereqPhase = state.phases[prereq];
      if (!prereqPhase || prereqPhase.status !== 'completed') {
        throw new Error(
          `Cannot start ${phaseId} — prerequisite ${prereq} is "${prereqPhase?.status || 'missing'}". Complete it first.`
        );
      }
    }
  }

  state.phases[phaseId] = { status: 'in_progress' };

  const filePath = path.join(projectPath, BUILD_STATE_FILE);
  fs.writeFileSync(filePath, JSON.stringify(state, null, 2));
  return state;
}

/** Update metadata (e.g., deployUrl after deploy) */
export function updateMetadata(projectPath, updates) {
  const result = getBuildState(projectPath);
  if (!result.exists || !result.valid) throw new Error(result.error);

  const state = result.state;
  Object.assign(state.metadata, updates);

  const filePath = path.join(projectPath, BUILD_STATE_FILE);
  fs.writeFileSync(filePath, JSON.stringify(state, null, 2));
  return state;
}

/** Reset a single phase back to pending */
export function resetPhase(projectPath, phaseId) {
  const result = getBuildState(projectPath);
  if (!result.exists || !result.valid) throw new Error(result.error);

  const state = result.state;
  if (!state.phases[phaseId]) throw new Error(`Unknown phase: ${phaseId}`);

  state.phases[phaseId] = { status: 'pending' };

  const filePath = path.join(projectPath, BUILD_STATE_FILE);
  fs.writeFileSync(filePath, JSON.stringify(state, null, 2));
  return state;
}

/** Reset all phases from a given phase onwards back to pending */
export function resetPhasesFrom(projectPath, fromPhaseId) {
  const result = getBuildState(projectPath);
  if (!result.exists || !result.valid) throw new Error(result.error);

  const state = result.state;
  const fromIdx = PHASE_IDS.indexOf(fromPhaseId);
  if (fromIdx === -1) throw new Error(`Unknown phase: ${fromPhaseId}`);

  const resetPhases = [];
  for (let i = fromIdx; i < PHASE_IDS.length; i++) {
    state.phases[PHASE_IDS[i]] = { status: 'pending' };
    resetPhases.push(PHASE_IDS[i]);
  }

  const filePath = path.join(projectPath, BUILD_STATE_FILE);
  fs.writeFileSync(filePath, JSON.stringify(state, null, 2));
  return { state, resetPhases };
}

/** Run all integrity checks on the project (status file naming, BUILD-REPORT sections) */
export function runIntegrityChecks(projectPath) {
  const result = getBuildState(projectPath);
  if (!result.exists || !result.valid) {
    return { passed: false, errors: [result.error] };
  }

  const errors = [];

  // Check status file naming convention
  const namingError = validateStatusFileNaming(projectPath);
  if (namingError) errors.push(namingError);

  // Check BUILD-REPORT.md sections
  const reportError = validateBuildReportSections(projectPath, result.state.phases);
  if (reportError) errors.push(reportError);

  return { passed: errors.length === 0, errors };
}

/** Print a summary of the build state */
export function printStatus(projectPath) {
  const result = getBuildState(projectPath);
  if (!result.exists) {
    console.error(`No build state found at ${projectPath}`);
    return;
  }
  if (!result.valid) {
    console.error(`Invalid build state: ${result.error}`);
    return;
  }

  const { state } = result;
  console.log(`\nBuild: ${state.buildId}`);
  console.log(`Type: ${state.builderType}`);
  console.log(`Started: ${state.startedAt}`);
  console.log(`Company: ${state.metadata.companyName || 'N/A'}`);
  console.log(`\nPhase Status:`);

  const labels = {
    'phase-0':   'Health Check',
    'phase-1':   'Data Gathering',
    'phase-2':   'Design Direction',
    'phase-3':   'Project Scaffold',
    'phase-4':   'Content/Config',
    'phase-5':   'Theme/Locations',
    'phase-6':   'Images (Airtable)',
    'phase-6b':  'Images (AI/FAL)',
    'phase-7a':  'Fast Build',
    'phase-7b':  'Fast Deploy',
    'phase-7':   'Initial Build',
    'phase-7.5': 'Uniqueness Tweaks',
    'phase-7.6': 'Post-Uniqueness Build',
    'phase-7.7': 'Build Checklist',
    'phase-7.8': 'Design Enhancement',
    'phase-7.9': 'Final Build',
    'phase-8':   'Deploy (final)',
    'phase-9':   'QA Verification',
    'phase-10':  'Learn',
  };

  for (const id of PHASE_IDS) {
    const p = state.phases[id];
    const icon = p.status === 'completed' ? '✓' : p.status === 'failed' ? '✗' : p.status === 'in_progress' ? '→' : '○';
    const label = labels[id] || id;
    const extra = p.error ? ` (${p.error})` : '';
    console.log(`  ${icon} ${id}: ${label} [${p.status}]${extra}`);
  }

  // Run integrity checks
  const integrity = runIntegrityChecks(projectPath);
  if (!integrity.passed) {
    console.log(`\nIntegrity Issues:`);
    for (const err of integrity.errors) {
      console.error(`  ! ${err}`);
    }
  }

  console.log('');
}

// --- CLI (only when executed directly, not when imported) ---
const isDirectExecution = process.argv[1]?.endsWith('phase-gate.mjs');
if (isDirectExecution && process.argv.slice(2).length > 0) {
  const args = process.argv.slice(2);
  const flags = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('--')) {
      const key = args[i].slice(2);
      const val = args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : 'true';
      flags[key] = val;
      if (val !== 'true') i++;
    }
  }

  const projectPath = flags.project || process.cwd();

  if (flags.init) {
    const buildId = flags['build-id'] || `build-${Date.now()}`;
    const builderType = flags.builder || 'template';
    const metadata = {};
    if (flags.company) metadata.companyName = flags.company;
    if (flags.niche) metadata.niche = flags.niche;
    initBuildState(projectPath, buildId, builderType, metadata);
    console.log(`Initialized build state: ${buildId} (${builderType})`);
    process.exit(0);
  }

  if (flags.check) {
    const requires = flags.requires;
    if (!requires) {
      console.error('--requires <phase-id> is required');
      process.exit(1);
    }
    const gate = checkGate(projectPath, requires);
    if (gate.passed) {
      console.log(`Gate passed: ${requires}`);
      process.exit(0);
    } else {
      console.error(`Gate FAILED: ${gate.reason}`);
      process.exit(1);
    }
  }

  if (flags['check-all']) {
    const upTo = flags['up-to'];
    if (!upTo) {
      console.error('--up-to <phase-id> is required');
      process.exit(1);
    }
    const gate = checkAllGates(projectPath, upTo);
    if (gate.passed) {
      console.log(`All gates passed through ${upTo}`);
      process.exit(0);
    } else {
      console.error(`Gates FAILED:\n${gate.reason}`);
      process.exit(1);
    }
  }

  if (flags.complete) {
    const phase = flags.phase;
    if (!phase) {
      console.error('--phase <phase-id> is required');
      process.exit(1);
    }
    let artifacts = {};
    if (flags.artifacts) {
      try { artifacts = JSON.parse(flags.artifacts); } catch { artifacts = {}; }
    }
    try {
      completePhase(projectPath, phase, artifacts);
      console.log(`Phase completed: ${phase}`);
      process.exit(0);
    } catch (err) {
      console.error(`Phase completion REJECTED: ${err.message}`);
      process.exit(1);
    }
  }

  if (flags.fail) {
    const phase = flags.phase;
    const error = flags.error || 'Unknown error';
    if (!phase) {
      console.error('--phase <phase-id> is required');
      process.exit(1);
    }
    failPhase(projectPath, phase, error);
    console.error(`Phase failed: ${phase} — ${error}`);
    process.exit(1);
  }

  if (flags.start) {
    const phase = flags.phase;
    if (!phase) {
      console.error('--phase <phase-id> is required');
      process.exit(1);
    }
    try {
      startPhase(projectPath, phase);
      console.log(`Phase started: ${phase}`);
      process.exit(0);
    } catch (err) {
      console.error(`Phase start REJECTED: ${err.message}`);
      process.exit(1);
    }
  }

  if (flags.status) {
    printStatus(projectPath);
    process.exit(0);
  }

  if (flags.integrity) {
    const result = runIntegrityChecks(projectPath);
    if (result.passed) {
      console.log('All integrity checks passed');
      process.exit(0);
    } else {
      console.error('Integrity check FAILED:');
      for (const err of result.errors) {
        console.error(`  - ${err}`);
      }
      process.exit(1);
    }
  }

  if (flags.reset) {
    const phase = flags.phase;
    const from = flags.from;

    if (from) {
      const { resetPhases } = resetPhasesFrom(projectPath, from);
      console.log(`Reset phases: ${resetPhases.join(', ')}`);
      process.exit(0);
    } else if (phase) {
      resetPhase(projectPath, phase);
      console.log(`Reset phase: ${phase}`);
      process.exit(0);
    } else {
      console.error('--reset requires either --phase <phase-id> or --from <phase-id>');
      process.exit(1);
    }
  }

  console.error('Unknown command. Use --init, --check, --check-all, --complete, --fail, --start, --reset, --status, or --integrity');
  process.exit(1);
}
