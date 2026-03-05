// ============================================================================
// uniqueness-presets.mjs
// ============================================================================
// Maps design directions to CSS variation axes and compatible alternatives.
// Used by apply-uniqueness.mjs to select per-build visual tweaks.
//
// v2 — Niche-tier system: constraints block inappropriate axes per business
// type. Emergency trades get bold/simple, scheduled trades get clean/sturdy,
// premium services can have more visual polish.
// ============================================================================

/**
 * Niche tiers — determines which CSS axes are allowed/blocked.
 *
 * Tier 1: Emergency trades — big phone numbers, bold CTAs, no visual fluff
 * Tier 2: Scheduled trades — clean and sturdy, showcase work quality
 * Tier 3: Premium/lifestyle — more visual polish acceptable
 */
export const NICHE_TIERS = {
  // Tier 1: Emergency — people are panicking, need to call NOW
  plumber:        { tier: 1, label: 'Emergency Trade' },
  plumbing:       { tier: 1, label: 'Emergency Trade' },
  electrician:    { tier: 1, label: 'Emergency Trade' },
  electrical:     { tier: 1, label: 'Emergency Trade' },
  locksmith:      { tier: 1, label: 'Emergency Trade' },
  towing:         { tier: 1, label: 'Emergency Trade' },
  'garage door':  { tier: 1, label: 'Emergency Trade' },
  'glass repair': { tier: 1, label: 'Emergency Trade' },
  'burst pipe':   { tier: 1, label: 'Emergency Trade' },
  drain:          { tier: 1, label: 'Emergency Trade' },
  'blocked drain':{ tier: 1, label: 'Emergency Trade' },
  geyser:         { tier: 1, label: 'Emergency Trade' },
  hvac:           { tier: 1, label: 'Emergency Trade' },
  security:       { tier: 1, label: 'Emergency Trade' },
  alarm:          { tier: 1, label: 'Emergency Trade' },
  'gate motor':   { tier: 1, label: 'Emergency Trade' },
  'fire protection': { tier: 1, label: 'Emergency Trade' },

  // Tier 2: Scheduled trades — trust, quality, portfolio
  painting:       { tier: 2, label: 'Scheduled Trade' },
  fencing:        { tier: 2, label: 'Scheduled Trade' },
  roofing:        { tier: 2, label: 'Scheduled Trade' },
  cleaning:       { tier: 2, label: 'Scheduled Trade' },
  renovation:     { tier: 2, label: 'Scheduled Trade' },
  building:       { tier: 2, label: 'Scheduled Trade' },
  construction:   { tier: 2, label: 'Scheduled Trade' },
  concrete:       { tier: 2, label: 'Scheduled Trade' },
  welding:        { tier: 2, label: 'Scheduled Trade' },
  aircon:         { tier: 2, label: 'Scheduled Trade' },
  'air conditioning': { tier: 2, label: 'Scheduled Trade' },
  glass:          { tier: 2, label: 'Scheduled Trade' },
  waterproofing:  { tier: 2, label: 'Scheduled Trade' },
  tiling:         { tier: 2, label: 'Scheduled Trade' },
  flooring:       { tier: 2, label: 'Scheduled Trade' },
  carpentry:      { tier: 2, label: 'Scheduled Trade' },
  'pest control': { tier: 2, label: 'Scheduled Trade' },
  paving:         { tier: 2, label: 'Scheduled Trade' },
  demolition:     { tier: 2, label: 'Scheduled Trade' },
  earthworks:     { tier: 2, label: 'Scheduled Trade' },
  handyman:       { tier: 2, label: 'Scheduled Trade' },

  // Tier 3: Premium/lifestyle — visual polish is appropriate
  landscaping:    { tier: 3, label: 'Premium Service' },
  'interior design': { tier: 3, label: 'Premium Service' },
  pool:           { tier: 3, label: 'Premium Service' },
  'pool service': { tier: 3, label: 'Premium Service' },
  solar:          { tier: 3, label: 'Premium Service' },
  blinds:         { tier: 3, label: 'Premium Service' },
  kitchen:        { tier: 3, label: 'Premium Service' },
  bathroom:       { tier: 3, label: 'Premium Service' },
  garden:         { tier: 3, label: 'Premium Service' },
  irrigation:     { tier: 3, label: 'Premium Service' },
  automation:     { tier: 3, label: 'Premium Service' },
  'home automation': { tier: 3, label: 'Premium Service' },
};

/**
 * Get the tier for a niche. Defaults to tier 2 (scheduled trade) if unknown.
 */
export function getNicheTier(niche) {
  const lower = niche.toLowerCase();
  // Direct match
  if (NICHE_TIERS[lower]) return NICHE_TIERS[lower];
  // Partial match
  for (const [key, val] of Object.entries(NICHE_TIERS)) {
    if (lower.includes(key) || key.includes(lower)) return val;
  }
  return { tier: 2, label: 'General Trade' };
}

/**
 * Axes that are BLOCKED per tier.
 * These options make no sense for the business type and hurt conversions.
 */
const TIER_BLOCKED_AXES = {
  1: {
    // Emergency trades: no decorative fluff — customers are stressed
    cardStyle: ['glass'],           // glassmorphism is SaaS, not plumbing
    imageShape: ['blob', 'clipped'], // keep images clean, no funky shapes
    buttonStyle: ['ghost', 'outline'], // CTAs must be bold and obvious
    backgroundPattern: ['dots'],    // dots are playful, not urgent
    hoverEffect: ['glow', 'underline'], // glow is techy, underline is editorial
    heroTitleDecoration: ['bracket', 'badge-frame', 'side-lines'], // keep hero clean and readable
    headingHighlight: ['background-mark'], // too editorial for emergency
    headingWeight: ['medium'],      // emergency = bold/black, not light
    headingCase: ['normal'],        // uppercase works for urgency
    sectionDividerShape: ['torn', 'zigzag'], // keep it simple
  },
  2: {
    // Scheduled trades: no trendy tech aesthetics
    cardStyle: ['glass'],           // glassmorphism doesn't fit trades
    imageShape: ['blob'],           // blob shapes look out of place for contractors
    buttonStyle: ['ghost'],         // ghost buttons are too subtle for conversion
    backgroundPattern: ['dots'],    // dots are playful, trades are serious
    hoverEffect: ['glow'],          // glow is techy
    heroTitleDecoration: ['badge-frame'], // too decorative for trades
  },
  3: {
    // Premium services: fewer restrictions, but still no extremes
    imageShape: ['blob'],           // blob still looks unprofessional
    buttonStyle: ['ghost'],         // ghost buttons hurt conversion everywhere
  },
};

/**
 * Conversion-focused enhancements per tier.
 * These are CSS-level tweaks that actually help the niche convert.
 */
export const TIER_CONVERSION_CSS = {
  1: {
    // Emergency: make phone numbers, WhatsApp, and CTAs impossible to miss
    css: `/* Tier 1: Emergency trade — conversion-focused overrides */

/* Enlarge phone number links */
a[href^="tel:"] {
  font-size: 1.25em;
  font-weight: 800;
  letter-spacing: 0.02em;
}

/* Make WhatsApp links stand out */
a[href*="wa.me"], a[href*="whatsapp"] {
  font-weight: 700;
}

/* Bold, high-contrast CTA buttons */
a[class*="bg-accent"], button[class*="bg-accent"] {
  font-weight: 800;
  font-size: 1.05rem;
  padding: 0.85em 2em;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

/* Mobile: full-width CTAs for fat-finger friendliness */
@media (max-width: 640px) {
  a[class*="bg-accent"], button[class*="bg-accent"] {
    width: 100%;
    text-align: center;
    padding: 1em 1.5em;
    font-size: 1.1rem;
  }
}`,
  },
  2: {
    // Scheduled trades: trust and professionalism
    css: `/* Tier 2: Scheduled trade — trust-focused overrides */

/* Slightly larger phone links for easy contact */
a[href^="tel:"] {
  font-weight: 700;
}

/* Clean, confident buttons */
a[class*="bg-accent"], button[class*="bg-accent"] {
  font-weight: 700;
  letter-spacing: 0.02em;
}`,
  },
  3: {
    // Premium: subtle polish
    css: `/* Tier 3: Premium service — polished overrides */

/* Refined button styling */
a[class*="bg-accent"], button[class*="bg-accent"] {
  font-weight: 600;
  letter-spacing: 0.01em;
}`,
  },
};

/**
 * All available CSS variation axes and their options.
 */
export const CSS_AXES = {
  borderRadius: {
    options: ['sharp', 'soft', 'rounded', 'pill'],
    description: 'Border radius on cards, buttons, badges, icon containers',
  },
  shadowStyle: {
    options: ['none', 'subtle', 'elevated', 'dramatic'],
    description: 'Box-shadow depth on cards and sections',
  },
  sectionSpacing: {
    options: ['compact', 'standard', 'generous'],
    description: 'Vertical padding on major sections',
  },
  cardStyle: {
    options: ['flat', 'elevated', 'bordered', 'glass'],
    description: 'Visual treatment of card containers',
  },
  headingCase: {
    options: ['uppercase', 'title-case', 'normal'],
    description: 'Text transform on h1-h4',
  },
  headingWeight: {
    options: ['black', 'bold', 'medium'],
    description: 'Font weight on headings (900, 700, 500)',
  },
  headingSizeScale: {
    options: ['compact', 'standard', 'bold'],
    description: 'Font size ratio across heading levels',
  },
  letterSpacing: {
    options: ['tight', 'normal', 'wide'],
    description: 'Letter spacing on headings',
  },
  headingHighlight: {
    options: ['none', 'accent-color', 'underline-brush', 'background-mark'],
    description: 'Highlight style on one key word in major headings',
  },
  buttonStyle: {
    options: ['solid', 'outline', 'pill', 'ghost'],
    description: 'CTA button appearance',
  },
  hoverEffect: {
    options: ['scale', 'lift', 'glow', 'underline'],
    description: 'Hover state on interactive elements',
  },
  sectionDividers: {
    options: ['none', 'line', 'accent-line'],
    description: 'CSS border divider between major sections',
  },
  imageShape: {
    options: ['default', 'rounded-lg', 'blob', 'clipped'],
    description: 'Shape treatment on gallery/service/headshot images',
  },
  accentBorders: {
    options: ['none', 'top-bar', 'left-bar', 'bottom-underline'],
    description: 'Accent border on cards and section headings',
  },
  backgroundPattern: {
    options: ['solid', 'gradient', 'dots'],
    description: 'Background treatment on surface sections',
  },
  heroTitleDecoration: {
    options: ['none', 'underline-accent', 'top-rule', 'side-lines', 'bracket', 'badge-frame', 'overline-underline'],
    description: 'Decorative element around the hero H1',
  },
  sectionDividerShape: {
    options: ['none', 'wave', 'angle', 'curve', 'zigzag', 'arrow', 'torn'],
    description: 'SVG shape divider between body sections',
  },
  ctaBannerVariant: {
    options: ['full-bleed-accent', 'split-image', 'stats-bar', 'testimonial-cta', 'emergency-urgent', 'map-cta'],
    description: 'Pre-footer CTA banner visual variant (informational — no CSS generated)',
  },
};

/**
 * Design direction presets.
 */
export const DIRECTION_PRESETS = {
  Industrial: {
    borderRadius: 'sharp',
    shadowStyle: 'none',
    sectionSpacing: 'standard',
    cardStyle: 'bordered',
    headingCase: 'uppercase',
    headingWeight: 'black',
    headingSizeScale: 'bold',
    letterSpacing: 'wide',
    headingHighlight: 'none',
    buttonStyle: 'solid',
    hoverEffect: 'lift',
    sectionDividers: 'accent-line',
    imageShape: 'default',
    accentBorders: 'top-bar',
    backgroundPattern: 'solid',
    heroTitleDecoration: 'underline-accent',
    sectionDividerShape: 'angle',
    ctaBannerVariant: 'full-bleed-accent',
  },
  Brutalist: {
    borderRadius: 'sharp',
    shadowStyle: 'none',
    sectionSpacing: 'standard',
    cardStyle: 'flat',
    headingCase: 'uppercase',
    headingWeight: 'black',
    headingSizeScale: 'bold',
    letterSpacing: 'wide',
    headingHighlight: 'background-mark',
    buttonStyle: 'solid',
    hoverEffect: 'lift',
    sectionDividers: 'accent-line',
    imageShape: 'clipped',
    accentBorders: 'left-bar',
    backgroundPattern: 'solid',
    heroTitleDecoration: 'underline-accent',
    sectionDividerShape: 'angle',
    ctaBannerVariant: 'emergency-urgent',
  },
  'Tech/Modern': {
    borderRadius: 'soft',
    shadowStyle: 'subtle',
    sectionSpacing: 'compact',
    cardStyle: 'elevated',
    headingCase: 'normal',
    headingWeight: 'medium',
    headingSizeScale: 'standard',
    letterSpacing: 'tight',
    headingHighlight: 'underline-brush',
    buttonStyle: 'outline',
    hoverEffect: 'lift',
    sectionDividers: 'line',
    imageShape: 'rounded-lg',
    accentBorders: 'bottom-underline',
    backgroundPattern: 'gradient',
    heroTitleDecoration: 'top-rule',
    sectionDividerShape: 'curve',
    ctaBannerVariant: 'stats-bar',
  },
  Playful: {
    borderRadius: 'rounded',
    shadowStyle: 'elevated',
    sectionSpacing: 'generous',
    cardStyle: 'elevated',
    headingCase: 'title-case',
    headingWeight: 'bold',
    headingSizeScale: 'bold',
    letterSpacing: 'normal',
    headingHighlight: 'accent-color',
    buttonStyle: 'pill',
    hoverEffect: 'scale',
    sectionDividers: 'none',
    imageShape: 'rounded-lg',
    accentBorders: 'none',
    backgroundPattern: 'solid',
    heroTitleDecoration: 'top-rule',
    sectionDividerShape: 'wave',
    ctaBannerVariant: 'testimonial-cta',
  },
  Organic: {
    borderRadius: 'rounded',
    shadowStyle: 'subtle',
    sectionSpacing: 'generous',
    cardStyle: 'elevated',
    headingCase: 'title-case',
    headingWeight: 'bold',
    headingSizeScale: 'standard',
    letterSpacing: 'normal',
    headingHighlight: 'accent-color',
    buttonStyle: 'solid',
    hoverEffect: 'scale',
    sectionDividers: 'none',
    imageShape: 'rounded-lg',
    accentBorders: 'none',
    backgroundPattern: 'gradient',
    heroTitleDecoration: 'top-rule',
    sectionDividerShape: 'wave',
    ctaBannerVariant: 'split-image',
  },
  Editorial: {
    borderRadius: 'soft',
    shadowStyle: 'none',
    sectionSpacing: 'generous',
    cardStyle: 'flat',
    headingCase: 'normal',
    headingWeight: 'medium',
    headingSizeScale: 'compact',
    letterSpacing: 'tight',
    headingHighlight: 'underline-brush',
    buttonStyle: 'outline',
    hoverEffect: 'underline',
    sectionDividers: 'line',
    imageShape: 'rounded-lg',
    accentBorders: 'bottom-underline',
    backgroundPattern: 'solid',
    heroTitleDecoration: 'overline-underline',
    sectionDividerShape: 'none',
    ctaBannerVariant: 'testimonial-cta',
  },
  Luxury: {
    borderRadius: 'soft',
    shadowStyle: 'dramatic',
    sectionSpacing: 'generous',
    cardStyle: 'bordered',
    headingCase: 'normal',
    headingWeight: 'medium',
    headingSizeScale: 'standard',
    letterSpacing: 'tight',
    headingHighlight: 'underline-brush',
    buttonStyle: 'solid',
    hoverEffect: 'lift',
    sectionDividers: 'accent-line',
    imageShape: 'rounded-lg',
    accentBorders: 'bottom-underline',
    backgroundPattern: 'gradient',
    heroTitleDecoration: 'side-lines',
    sectionDividerShape: 'curve',
    ctaBannerVariant: 'stats-bar',
  },
  'Clean Professional': {
    borderRadius: 'soft',
    shadowStyle: 'subtle',
    sectionSpacing: 'standard',
    cardStyle: 'elevated',
    headingCase: 'title-case',
    headingWeight: 'bold',
    headingSizeScale: 'standard',
    letterSpacing: 'normal',
    headingHighlight: 'none',
    buttonStyle: 'solid',
    hoverEffect: 'lift',
    sectionDividers: 'line',
    imageShape: 'default',
    accentBorders: 'top-bar',
    backgroundPattern: 'solid',
    heroTitleDecoration: 'underline-accent',
    sectionDividerShape: 'none',
    ctaBannerVariant: 'full-bleed-accent',
  },
};

/**
 * Compatible alternatives for jitter.
 * Grouped by visual feel: "hard" (sharp/industrial) vs "soft" (rounded/organic).
 */
const JITTER_COMPATIBLE = {
  borderRadius: {
    hard: ['sharp', 'soft'],
    soft: ['soft', 'rounded', 'pill'],
  },
  shadowStyle: {
    hard: ['none', 'subtle'],
    soft: ['subtle', 'elevated', 'dramatic'],
  },
  cardStyle: {
    hard: ['flat', 'bordered'],
    soft: ['elevated', 'bordered'],
  },
  buttonStyle: {
    hard: ['solid', 'outline'],
    soft: ['solid', 'pill', 'outline'],
  },
  hoverEffect: {
    hard: ['lift', 'scale'],
    soft: ['scale', 'lift'],
  },
  headingHighlight: {
    hard: ['none', 'accent-color'],
    soft: ['none', 'accent-color', 'underline-brush'],
  },
  imageShape: {
    hard: ['default', 'rounded-lg'],
    soft: ['default', 'rounded-lg'],
  },
  accentBorders: {
    hard: ['none', 'top-bar', 'left-bar'],
    soft: ['none', 'top-bar', 'bottom-underline'],
  },
  heroTitleDecoration: {
    hard: ['none', 'underline-accent', 'overline-underline'],
    soft: ['none', 'underline-accent', 'top-rule'],
  },
  sectionDividerShape: {
    hard: ['none', 'angle', 'arrow'],
    soft: ['none', 'wave', 'curve'],
  },
  ctaBannerVariant: {
    hard: ['full-bleed-accent', 'stats-bar', 'emergency-urgent'],
    soft: ['full-bleed-accent', 'split-image', 'testimonial-cta', 'map-cta'],
  },
};

const HARD_DIRECTIONS = ['Industrial', 'Brutalist', 'Tech/Modern'];

/**
 * Apply tier-based constraints to a selection.
 * Replaces any blocked axis value with the first allowed alternative from
 * the same axis, preferring the direction's default if available.
 */
function applyTierConstraints(selection, niche) {
  const { tier } = getNicheTier(niche);
  const blocked = TIER_BLOCKED_AXES[tier];
  if (!blocked) return { selection, overrides: [] };

  const constrained = { ...selection };
  const overrides = [];

  for (const [axis, blockedValues] of Object.entries(blocked)) {
    if (blockedValues.includes(constrained[axis])) {
      const axisOptions = CSS_AXES[axis]?.options || [];
      const allowed = axisOptions.filter(opt => !blockedValues.includes(opt));
      // Pick 'solid' or first allowed option as safe fallback
      const safe = allowed.includes('solid') ? 'solid'
                 : allowed.includes('default') ? 'default'
                 : allowed.includes('none') ? 'none'
                 : allowed[0] || constrained[axis];
      overrides.push(`${axis}:${constrained[axis]}->${safe} (blocked for tier ${tier})`);
      constrained[axis] = safe;
    }
  }

  return { selection: constrained, overrides };
}

/**
 * Prevent conflicting divider axes: sectionDividers (CSS borders)
 * and sectionDividerShape (SVG shapes) should not both be active.
 * If both are set, prefer the SVG shape and disable CSS borders.
 */
function resolveDividerConflict(selection) {
  const hasCSSDivider = selection.sectionDividers && selection.sectionDividers !== 'none';
  const hasSVGDivider = selection.sectionDividerShape && selection.sectionDividerShape !== 'none';

  if (hasCSSDivider && hasSVGDivider) {
    // SVG shapes are more visually interesting, disable CSS borders
    selection.sectionDividers = 'none';
    return `sectionDividers:${selection.sectionDividers}->none (conflicts with sectionDividerShape:${selection.sectionDividerShape})`;
  }
  return null;
}

/**
 * Apply random jitter to a preset selection.
 * Randomly swaps 3-5 axes to compatible alternatives.
 * Tier constraints are applied AFTER jitter to ensure no blocked values sneak in.
 */
export function applyJitter(selection, direction, seed) {
  const feel = HARD_DIRECTIONS.includes(direction) ? 'hard' : 'soft';
  const jitterAxes = Object.keys(JITTER_COMPATIBLE);
  const jittered = { ...selection };
  const applied = [];

  // Simple seeded random from string
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash + seed.charCodeAt(i)) | 0;
  }
  const seededRandom = () => {
    hash = (hash * 1103515245 + 12345) & 0x7fffffff;
    return (hash % 1000) / 1000;
  };

  // Shuffle axes and pick 3-5
  const shuffled = [...jitterAxes].sort(() => seededRandom() - 0.5);
  const count = 3 + Math.floor(seededRandom() * 3);

  for (let i = 0; i < Math.min(count, shuffled.length); i++) {
    const axis = shuffled[i];
    const compatible = JITTER_COMPATIBLE[axis][feel];
    const current = jittered[axis];

    const alternatives = compatible.filter((opt) => opt !== current);
    if (alternatives.length > 0) {
      const pick = alternatives[Math.floor(seededRandom() * alternatives.length)];
      jittered[axis] = pick;
      applied.push(`${axis}:${current}->${pick}`);
    }
  }

  return { selection: jittered, jitter: applied };
}

/**
 * Get the full axis selection for a given design direction with optional jitter.
 * Applies niche-tier constraints to ensure appropriate tweaks.
 *
 * @param {string} direction - Design direction (e.g., "Industrial", "Playful")
 * @param {string} [seed] - Optional seed for jitter (company name)
 * @param {string} [niche] - Business niche for tier-based constraints
 * @returns {{ selection: Record<string, string>, direction: string, jitter: string[], tierOverrides: string[], nicheTier: { tier: number, label: string }, dividerConflict: string|null }}
 */
export function getPreset(direction, seed, niche) {
  // Normalize direction name
  const normalized = Object.keys(DIRECTION_PRESETS).find(
    (k) => k.toLowerCase() === direction.toLowerCase()
  );

  const preset = normalized
    ? DIRECTION_PRESETS[normalized]
    : DIRECTION_PRESETS['Clean Professional'];

  const dirName = normalized || 'Clean Professional';

  let selection = { ...preset };
  let jitter = [];

  // Apply jitter if seed provided
  if (seed) {
    const result = applyJitter(preset, dirName, seed);
    selection = result.selection;
    jitter = result.jitter;
  }

  // Apply niche-tier constraints (AFTER jitter — blocks inappropriate values)
  const nicheTier = niche ? getNicheTier(niche) : { tier: 2, label: 'General Trade' };
  const { selection: constrained, overrides: tierOverrides } = niche
    ? applyTierConstraints(selection, niche)
    : { selection, overrides: [] };

  // Resolve divider conflicts (CSS borders vs SVG shapes)
  const dividerConflict = resolveDividerConflict(constrained);

  return {
    selection: constrained,
    direction: dirName,
    jitter,
    tierOverrides,
    nicheTier,
    dividerConflict,
  };
}
