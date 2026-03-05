#!/usr/bin/env node
// ============================================================================
// apply-uniqueness.mjs
// ============================================================================
// Applies CSS micro-variations to make each template-built site visually unique.
// Runs as Phase 7.5 after the initial build validates.
//
// v2 — Niche-tier system: blocks inappropriate CSS axes per business type,
//       adds conversion-focused CSS per tier, resolves divider conflicts.
//
// Usage:
//   node scripts/apply-uniqueness.mjs --project /path --direction "Industrial" --seed "Company Name" --niche "plumber"
//   node scripts/apply-uniqueness.mjs --project /path --config uniqueness-config.json
//
// Reads:  src/styles/global.css
// Writes: src/styles/global.css (appended), uniqueness-config.json
// ============================================================================

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { buildLog } from './lib/build-logger.mjs';
import { getPreset, CSS_AXES, TIER_CONVERSION_CSS, getNicheTier } from './lib/uniqueness-presets.mjs';

// Consistent marker used by both this script and generate-theme.mjs
const UNIQUENESS_MARKER = '/* --- UNIQUENESS TWEAKS --- */';

// ---------------------------------------------------------------------------
// CLI argument parsing
// ---------------------------------------------------------------------------
function parseArgs() {
  const args = process.argv.slice(2);
  const parsed = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i]?.startsWith('--')) {
      const key = args[i].slice(2);
      const val = args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : 'true';
      parsed[key] = val;
      if (val !== 'true') i++;
    }
  }
  return parsed;
}

// ---------------------------------------------------------------------------
// CSS generators — one function per axis
// ---------------------------------------------------------------------------

function cssBorderRadius(value) {
  const map = { sharp: '0px', soft: '8px', rounded: '16px', pill: '999px' };
  const r = map[value] || '8px';
  const btnExtra = value === 'pill'
    ? `\n/* Pill buttons */\na[class*="bg-accent"], button[class*="bg-accent"],\na[class*="border-"] { border-radius: 999px; }`
    : '';
  return `/* Border radius: ${value} */
:root { --radius: ${r}; }
.rounded-md { border-radius: ${r}; }
.rounded-lg { border-radius: ${value === 'pill' ? '999px' : r}; }${btnExtra}`;
}

function cssShadowStyle(value) {
  const map = {
    none: 'none',
    subtle: '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.06)',
    elevated: '0 4px 14px rgba(0,0,0,0.1), 0 2px 6px rgba(0,0,0,0.06)',
    dramatic: '0 10px 30px rgba(0,0,0,0.12), 0 4px 10px rgba(0,0,0,0.08)',
  };
  const shadow = map[value] || map.subtle;
  const hoverMap = {
    none: 'none',
    subtle: '0 2px 6px rgba(0,0,0,0.1)',
    elevated: '0 8px 24px rgba(0,0,0,0.14), 0 4px 10px rgba(0,0,0,0.08)',
    dramatic: '0 16px 40px rgba(0,0,0,0.16), 0 6px 14px rgba(0,0,0,0.1)',
  };
  return `/* Shadow: ${value} */
:root { --shadow-card: ${shadow}; --shadow-card-hover: ${hoverMap[value]}; }
.shadow-sm, .shadow-md { box-shadow: var(--shadow-card); }
.hover\\:shadow-md:hover, .hover\\:shadow-xl:hover { box-shadow: var(--shadow-card-hover); }`;
}

function cssSectionSpacing(value) {
  const map = {
    compact: 'clamp(2rem, 4vw, 3rem)',
    standard: 'clamp(3rem, 5vw, 5rem)',
    generous: 'clamp(4rem, 7vw, 7rem)',
  };
  return `/* Section spacing: ${value} */
section { padding-block: ${map[value] || map.standard}; }`;
}

function cssCardStyle(value) {
  const styles = {
    flat: `box-shadow: none; border: none; background: var(--color-background);`,
    elevated: `box-shadow: var(--shadow-card, 0 4px 14px rgba(0,0,0,0.1)); border: none;`,
    bordered: `box-shadow: none; border: 1px solid color-mix(in srgb, var(--color-muted) 25%, transparent);`,
    glass: `box-shadow: 0 4px 16px rgba(0,0,0,0.06); border: 1px solid rgba(255,255,255,0.2); backdrop-filter: blur(8px); background: rgba(255,255,255,0.85);`,
  };
  return `/* Card style: ${value} */
.bg-background.rounded-md, .bg-surface.rounded-md { ${styles[value] || styles.elevated} }`;
}

function cssHeadingCase(value) {
  const map = { uppercase: 'uppercase', 'title-case': 'capitalize', normal: 'none' };
  return `/* Heading case: ${value} */
h1, h2, h3, h4, h5, h6 { text-transform: ${map[value] || 'uppercase'}; }`;
}

function cssHeadingWeight(value) {
  const map = { black: '900', bold: '700', medium: '500' };
  return `/* Heading weight: ${value} */
h1, h2, h3, h4 { font-weight: ${map[value] || '700'}; }`;
}

function cssHeadingSizeScale(value) {
  if (value === 'standard') return '/* Heading size: standard (template defaults) */';
  if (value === 'compact') {
    return `/* Heading size: compact */
h1 { font-size: clamp(2rem, 4vw, 3.25rem); }
h2 { font-size: clamp(1.5rem, 3vw, 2.25rem); }
h3 { font-size: clamp(1.125rem, 2vw, 1.5rem); }`;
  }
  return `/* Heading size: bold */
h1 { font-size: clamp(2.75rem, 6vw, 5rem); }
h2 { font-size: clamp(1.75rem, 3.5vw, 2.75rem); }
h3 { font-size: clamp(1.25rem, 2vw, 1.75rem); }`;
}

function cssLetterSpacing(value) {
  const map = { tight: '-0.02em', normal: '0', wide: '0.05em' };
  return `/* Letter spacing: ${value} */
h1, h2, h3, h4 { letter-spacing: ${map[value] || '0'}; }`;
}

function cssHeadingHighlight(value) {
  if (value === 'none') return '/* Heading highlight: none */';
  const styles = {
    'accent-color': `color: var(--color-accent);`,
    'underline-brush': `background-image: linear-gradient(var(--color-accent), var(--color-accent));
  background-position: 0 88%;
  background-size: 100% 0.2em;
  background-repeat: no-repeat;
  padding-bottom: 0.05em;`,
    'background-mark': `background: var(--color-accent);
  color: white;
  padding: 0.05em 0.2em;
  border-radius: 2px;`,
  };
  return `/* Heading highlight: ${value} */
.heading-highlight { ${styles[value] || styles['accent-color']} }`;
}

function cssButtonStyle(value) {
  if (value === 'solid') return '/* Button style: solid (template default) */';
  const styles = {
    outline: `a[class*="bg-accent"] {
  background: transparent;
  border: 2px solid var(--color-accent);
  color: var(--color-accent);
}
a[class*="bg-accent"]:hover {
  background: var(--color-accent);
  color: white;
}`,
    pill: `a[class*="bg-accent"], button[class*="bg-accent"],
a[class*="border-2"] { border-radius: 999px; }`,
    ghost: `a[class*="bg-accent"] {
  background: transparent;
  color: var(--color-accent);
  text-decoration: underline;
  text-underline-offset: 4px;
  box-shadow: none;
}
a[class*="bg-accent"]:hover {
  background: color-mix(in srgb, var(--color-accent) 10%, transparent);
  text-decoration-thickness: 2px;
}`,
  };
  return `/* Button style: ${value} */\n${styles[value] || ''}`;
}

function cssHoverEffect(value) {
  const effects = {
    scale: `transform: scale(1.03); transition: transform 0.2s ease;`,
    lift: `transform: translateY(-4px); box-shadow: var(--shadow-card-hover, 0 8px 24px rgba(0,0,0,0.14)); transition: all 0.2s ease;`,
    glow: `box-shadow: 0 0 20px color-mix(in srgb, var(--color-accent) 30%, transparent); transition: box-shadow 0.2s ease;`,
    underline: `text-decoration: underline; text-underline-offset: 4px; text-decoration-color: var(--color-accent); transition: all 0.2s ease;`,
  };
  return `/* Hover effect: ${value} */
.group:hover, a.hover\\:-translate-y-1:hover { ${effects[value] || effects.lift} }`;
}

function cssSectionDividers(value) {
  if (value === 'none') return '/* Section dividers: none */';
  const styles = {
    line: `section + section { border-top: 1px solid color-mix(in srgb, var(--color-muted) 20%, transparent); }`,
    'accent-line': `section + section { border-top: 3px solid var(--color-accent); }`,
  };
  return `/* Section dividers: ${value} */\n${styles[value] || ''}`;
}

function cssImageShape(value) {
  if (value === 'default') return '/* Image shape: default */';
  const styles = {
    'rounded-lg': `.aspect-\\[4\\/3\\] { border-radius: 16px; overflow: hidden; }
.aspect-\\[4\\/3\\] img { border-radius: 16px; }`,
    blob: `.aspect-\\[4\\/3\\] img { border-radius: 30% 70% 70% 30% / 30% 30% 70% 70%; }`,
    clipped: `.aspect-\\[4\\/3\\] img { clip-path: polygon(0 0, 100% 0, 100% 90%, 0 100%); }`,
  };
  return `/* Image shape: ${value} */\n${styles[value] || ''}`;
}

function cssAccentBorders(value) {
  if (value === 'none') return '/* Accent borders: none */';
  const styles = {
    'top-bar': `.border-t-4 { border-top: 4px solid var(--color-accent); }
.border-l-4 { border-left: none; border-top: 4px solid var(--color-accent); }`,
    'left-bar': `.border-t-4 { border-top: none; border-left: 4px solid var(--color-accent); }
.border-l-4 { border-left: 4px solid var(--color-accent); }`,
    'bottom-underline': `.border-t-4, .border-l-4 { border: none; }
h2::after {
  content: '';
  display: block;
  width: 60px;
  height: 3px;
  background: var(--color-accent);
  margin-top: 0.5rem;
}
.text-center h2::after { margin-inline: auto; }`,
  };
  return `/* Accent borders: ${value} */\n${styles[value] || ''}`;
}

function cssBackgroundPattern(value) {
  if (value === 'solid') return '/* Background pattern: solid */';
  const styles = {
    gradient: `.bg-surface {
  background: linear-gradient(135deg, var(--color-surface) 0%, color-mix(in srgb, var(--color-primary) 4%, var(--color-surface)) 100%);
}`,
    dots: `.bg-surface {
  background-image: radial-gradient(circle, color-mix(in srgb, var(--color-muted) 15%, transparent) 1px, transparent 1px);
  background-size: 20px 20px;
}`,
  };
  return `/* Background pattern: ${value} */\n${styles[value] || ''}`;
}

function cssHeroTitleDecoration(value) {
  if (value === 'none') return '/* Hero title decoration: none */';
  const styles = {
    'underline-accent': `/* Hero title decoration: underline-accent */
.hero-section h1::after {
  content: '';
  display: block;
  width: 80px;
  height: 4px;
  background: var(--color-accent);
  margin-top: 0.75rem;
  border-radius: 2px;
}`,
    'top-rule': `/* Hero title decoration: top-rule */
.hero-section h1::before {
  content: '';
  display: block;
  width: 50px;
  height: 2px;
  background: var(--color-accent);
  margin-bottom: 0.75rem;
}`,
    'side-lines': `/* Hero title decoration: side-lines */
.hero-title-decorated {
  display: flex;
  align-items: center;
  gap: 1.25rem;
}
.hero-title-decorated::before,
.hero-title-decorated::after {
  content: '';
  flex: 0 0 40px;
  height: 1px;
  background: rgba(255, 255, 255, 0.35);
}
@media (max-width: 640px) {
  .hero-title-decorated::before,
  .hero-title-decorated::after { display: none; }
}`,
    'bracket': `/* Hero title decoration: bracket */
.hero-title-decorated::before { content: '['; }
.hero-title-decorated::after { content: ']'; }
.hero-title-decorated::before,
.hero-title-decorated::after {
  color: var(--color-accent);
  font-weight: 300;
  font-size: 1.3em;
  opacity: 0.7;
  line-height: 1;
}`,
    'badge-frame': `/* Hero title decoration: badge-frame */
.hero-title-decorated {
  display: inline-block;
  border: 2px solid var(--color-accent);
  padding: 0.4em 0.8em;
  position: relative;
}
.hero-title-decorated::before,
.hero-title-decorated::after {
  content: '';
  position: absolute;
  width: 12px;
  height: 12px;
  border-color: var(--color-accent);
  border-style: solid;
}
.hero-title-decorated::before {
  top: -3px; left: -3px;
  border-width: 3px 0 0 3px;
}
.hero-title-decorated::after {
  bottom: -3px; right: -3px;
  border-width: 0 3px 3px 0;
}`,
    'overline-underline': `/* Hero title decoration: overline-underline */
.hero-section h1::before {
  content: '';
  display: block;
  width: 40px;
  height: 1px;
  background: rgba(255, 255, 255, 0.5);
  margin-bottom: 0.75rem;
}
.hero-section h1::after {
  content: '';
  display: block;
  width: 80px;
  height: 3px;
  background: var(--color-accent);
  margin-top: 0.75rem;
}`,
  };
  return styles[value] || `/* Hero title decoration: ${value} (unknown) */`;
}

function cssSectionDividerShape(value) {
  if (value === 'none') return '/* Section divider shape: none */\n.section-divider { display: none; }';
  return `/* Section divider shape: ${value} — styling handled by SectionDivider.astro */`;
}

function cssCtaBannerPulse(variant) {
  if (variant !== 'emergency-urgent') return '/* CTA Banner: non-emergency variant — no pulse CSS needed */';
  return `/* CTA Banner — emergency pulse dot */
.cta-pulse-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  background: #22c55e;
  border-radius: 50%;
  animation: cta-pulse 2s ease-in-out infinite;
}
@keyframes cta-pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.5; transform: scale(1.6); }
}

/* CTA Banner — stat counter animation */
.cta-stat {
  position: relative;
}
.cta-stat::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 40px;
  height: 2px;
  background: rgba(255, 255, 255, 0.25);
  border-radius: 1px;
}`;
}

// Map axis names to their CSS generator functions
const CSS_GENERATORS = {
  borderRadius: cssBorderRadius,
  shadowStyle: cssShadowStyle,
  sectionSpacing: cssSectionSpacing,
  cardStyle: cssCardStyle,
  headingCase: cssHeadingCase,
  headingWeight: cssHeadingWeight,
  headingSizeScale: cssHeadingSizeScale,
  letterSpacing: cssLetterSpacing,
  headingHighlight: cssHeadingHighlight,
  buttonStyle: cssButtonStyle,
  hoverEffect: cssHoverEffect,
  sectionDividers: cssSectionDividers,
  imageShape: cssImageShape,
  accentBorders: cssAccentBorders,
  backgroundPattern: cssBackgroundPattern,
  heroTitleDecoration: cssHeroTitleDecoration,
  sectionDividerShape: cssSectionDividerShape,
};

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function generateUniquenessCSS(selection, nicheTier, ctaVariant) {
  const blocks = [];

  blocks.push(UNIQUENESS_MARKER);
  blocks.push(`/* Auto-generated by scripts/apply-uniqueness.mjs
   Niche tier: ${nicheTier.tier} (${nicheTier.label})
   DO NOT EDIT MANUALLY — re-run the script to regenerate */`);

  for (const [axis, value] of Object.entries(selection)) {
    const generator = CSS_GENERATORS[axis];
    if (generator) {
      blocks.push(generator(value));
    }
    // ctaBannerVariant has no CSS generator — it's informational for Phase 7.8
  }

  // CTA banner pulse CSS — only for emergency-urgent variant
  blocks.push(cssCtaBannerPulse(ctaVariant || selection.ctaBannerVariant));

  // Tier-specific conversion CSS
  const tierCss = TIER_CONVERSION_CSS[nicheTier.tier];
  if (tierCss?.css) {
    blocks.push(tierCss.css);
  }

  return blocks.join('\n\n');
}

function main() {
  const args = parseArgs();
  const projectDir = args.project || process.cwd();

  const log = buildLog(projectDir);

  let selection, direction, jitter, tierOverrides, nicheTier, dividerConflict;

  if (args.config) {
    // Load from config file
    const configPath = join(projectDir, args.config);
    if (!existsSync(configPath)) {
      console.error(`Config file not found: ${configPath}`);
      process.exit(1);
    }
    const config = JSON.parse(readFileSync(configPath, 'utf-8'));
    selection = config.cssAxes || config.selection;
    direction = config.direction || 'Unknown';
    jitter = config.jitter || [];
    tierOverrides = config.tierOverrides || [];
    nicheTier = config.nicheTier || { tier: 2, label: 'General Trade' };
    dividerConflict = config.dividerConflict || null;
  } else {
    // Generate from direction + seed + niche
    const dir = args.direction || 'Clean Professional';
    const seed = args.seed || '';
    const niche = args.niche || '';
    const result = getPreset(dir, seed || undefined, niche || undefined);
    selection = result.selection;
    direction = result.direction;
    jitter = result.jitter;
    tierOverrides = result.tierOverrides;
    nicheTier = result.nicheTier;
    dividerConflict = result.dividerConflict;
  }

  console.log(`\nApplying uniqueness tweaks:`);
  console.log(`  Direction: ${direction}`);
  console.log(`  Niche tier: ${nicheTier.tier} (${nicheTier.label})`);
  console.log(`  Jitter: ${jitter.length > 0 ? jitter.join(', ') : 'none'}`);
  if (tierOverrides.length > 0) {
    console.log(`  Tier overrides: ${tierOverrides.join(', ')}`);
  }
  if (dividerConflict) {
    console.log(`  Divider conflict resolved: ${dividerConflict}`);
  }

  // Generate CSS
  const css = generateUniquenessCSS(selection, nicheTier, selection.ctaBannerVariant);

  // Append to global.css
  const cssPath = join(projectDir, 'src/styles/global.css');
  if (!existsSync(cssPath)) {
    console.error(`global.css not found at: ${cssPath}`);
    process.exit(1);
  }

  const existing = readFileSync(cssPath, 'utf-8');

  // Remove any previous uniqueness block (match BOTH old and new markers for backwards compat)
  const cleaned = existing
    .replace(/\/\* --- UNIQUENESS TWEAKS ---[\s\S]*$/, '')
    .replace(/\/\* =+\n\s+UNIQUENESS TWEAKS[\s\S]*$/, '')
    .trimEnd();

  writeFileSync(cssPath, cleaned + '\n\n' + css + '\n', 'utf-8');
  console.log(`\n  CSS appended to: ${cssPath}`);

  // Heading highlight note for the teammate agent
  if (selection.headingHighlight && selection.headingHighlight !== 'none') {
    console.log(`\n  Heading highlight style "${selection.headingHighlight}" CSS is ready.`);
    console.log(`  The uniqueness-tweaker teammate will inject .heading-highlight spans into site.config.ts heading text.`);
    log.info('apply-uniqueness', `Heading highlight "${selection.headingHighlight}" CSS generated`);
  }

  // Save config artifact
  const configOut = {
    direction,
    nicheTier,
    cssAxes: selection,
    jitter,
    tierOverrides,
    dividerConflict,
    reasoning: `${direction} direction for ${nicheTier.label} (tier ${nicheTier.tier})${jitter.length > 0 ? `, jitter on ${jitter.map(j => j.split(':')[0]).join(', ')}` : ''}${tierOverrides.length > 0 ? `, ${tierOverrides.length} blocked value(s) replaced` : ''}`,
    appliedAt: new Date().toISOString(),
  };

  const configOutPath = join(projectDir, 'uniqueness-config.json');
  writeFileSync(configOutPath, JSON.stringify(configOut, null, 2), 'utf-8');
  console.log(`  Config saved to: ${configOutPath}`);

  // Log to BUILD-LOG.md
  log.info('apply-uniqueness', `Direction: ${direction}, Tier: ${nicheTier.tier} (${nicheTier.label})`);
  const axisEntries = Object.entries(selection).map(([k, v]) => `${k}=${v}`);
  log.info('apply-uniqueness', `CSS axes: ${axisEntries.join(', ')}`);
  if (jitter.length > 0) {
    log.info('apply-uniqueness', `Jitter applied: ${jitter.join(', ')}`);
  }
  if (tierOverrides.length > 0) {
    log.info('apply-uniqueness', `Tier overrides: ${tierOverrides.join(', ')}`);
  }

  console.log('\nDone. Rebuild with `npm run build` to apply changes.\n');
}

main();
