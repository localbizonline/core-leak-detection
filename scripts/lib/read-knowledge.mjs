import fs from 'node:fs';
import path from 'node:path';

// ============================================================================
// read-knowledge.mjs
// ============================================================================
// Pre-build knowledge reader. Queries the knowledge base for niche-specific
// recommendations, common errors, and design decisions from past builds.
//
// Called by config-writer teammate at the start of Phase 1.
//
// Usage:
//   node read-knowledge.mjs --niche "locksmith"
//   node read-knowledge.mjs --niche "plumbing" --city "Cape Town"
//   node read-knowledge.mjs --all   # dump all knowledge
// ============================================================================

const KNOWLEDGE_BASE = path.join(process.env.HOME || '', '.claude', 'knowledge');

function readJSON(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch {
    return null;
  }
}

/** Normalize array-or-wrapped formats (e.g. {patterns:[...]} → [...]) */
function asArray(data, wrapperKey) {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data[wrapperKey])) return data[wrapperKey];
  if (data && typeof data === 'object') {
    // Try first array-valued key
    for (const v of Object.values(data)) {
      if (Array.isArray(v)) return v;
    }
  }
  return [];
}

function readKnowledge(niche, city = null) {
  const result = {
    previousBuilds: [],
    designRecommendations: [],
    commonErrors: [],
    avoidFonts: [],
    nicheNotes: [],
    commonMissingFields: [],
  };

  // 1. Previous builds for this niche
  const buildsDir = path.join(KNOWLEDGE_BASE, 'builds');
  if (fs.existsSync(buildsDir)) {
    const buildFiles = fs.readdirSync(buildsDir).filter(f => f.endsWith('.json'));
    for (const f of buildFiles) {
      const build = readJSON(path.join(buildsDir, f));
      if (!build) continue;

      const nicheMatch = build.niche && build.niche.toLowerCase().includes(niche.toLowerCase());
      const cityMatch = city && build.primaryCity && build.primaryCity.toLowerCase().includes(city.toLowerCase());

      if (nicheMatch || cityMatch) {
        result.previousBuilds.push({
          buildId: build.buildId,
          companyName: build.companyName,
          niche: build.niche,
          city: build.primaryCity,
          status: build.status,
          serviceCount: build.serviceCount,
          designDirection: build.designDirection,
          fonts: build.fonts,
          colors: build.colors,
          failedPhases: build.failedPhases || [],
        });
      }
    }
  }

  // 2. Design recommendations from past successful builds
  const decisionsFile = path.join(KNOWLEDGE_BASE, 'successes', 'design-decisions.json');
  const decisions = asArray(readJSON(decisionsFile), 'decisions');
  const nicheDecisions = decisions.filter(d =>
    d.niche && d.niche.toLowerCase().includes(niche.toLowerCase())
  );

  // Only recommend designs that passed QA
  const goodDesigns = nicheDecisions.filter(d => d.qaScore === 'pass');
  if (goodDesigns.length > 0) {
    result.designRecommendations = goodDesigns.map(d => ({
      direction: d.direction,
      fonts: d.fonts,
      colors: d.colors,
      uniqueness: d.uniqueness,
    }));
  }

  // Track fonts that failed QA — suggest avoiding
  const failedDesigns = nicheDecisions.filter(d => d.qaScore === 'fail');
  const failedFonts = failedDesigns
    .map(d => d.fonts?.display)
    .filter(Boolean);
  result.avoidFonts = [...new Set(failedFonts)];

  // 3. Common error patterns for this niche or all niches
  const patternsFile = path.join(KNOWLEDGE_BASE, 'errors', 'error-patterns.json');
  const patterns = asArray(readJSON(patternsFile), 'patterns');

  // Sort by occurrences, take top 10
  const sortedPatterns = patterns
    .sort((a, b) => (b.occurrences || 1) - (a.occurrences || 1))
    .slice(0, 10);

  result.commonErrors = sortedPatterns.map(p => ({
    phase: p.phase || '—',
    error: p.errorSignature || p.id || p.regex || 'unknown',
    occurrences: p.occurrences || 1,
    lastSeen: p.lastSeen,
  }));

  // 4. Niche-specific notes from build summaries
  for (const build of result.previousBuilds) {
    if (build.failedPhases.length > 0) {
      result.nicheNotes.push(
        `Build ${build.companyName}: phases ${build.failedPhases.join(', ')} failed`
      );
    }
  }

  // 5. Common missing fields (from error patterns that mention "missing")
  const missingPatterns = patterns.filter(p =>
    p.errorSignature && p.errorSignature.toLowerCase().includes('missing')
  );
  result.commonMissingFields = missingPatterns.map(p => p.errorSignature.slice(0, 80));

  return result;
}

function readAllKnowledge() {
  const result = {
    builds: 0,
    successes: 0,
    failures: 0,
    niches: [],
    topErrors: [],
    insightsPath: path.join(KNOWLEDGE_BASE, 'insights.md'),
  };

  const buildsDir = path.join(KNOWLEDGE_BASE, 'builds');
  if (fs.existsSync(buildsDir)) {
    const buildFiles = fs.readdirSync(buildsDir).filter(f => f.endsWith('.json'));
    result.builds = buildFiles.length;

    const niches = new Set();
    for (const f of buildFiles) {
      const build = readJSON(path.join(buildsDir, f));
      if (!build) continue;
      if (build.status === 'success') result.successes++;
      else result.failures++;
      if (build.niche && build.niche !== 'unknown') niches.add(build.niche);
    }
    result.niches = [...niches];
  }

  const patternsFile = path.join(KNOWLEDGE_BASE, 'errors', 'error-patterns.json');
  const patterns = asArray(readJSON(patternsFile), 'patterns');
  result.topErrors = patterns
    .sort((a, b) => (b.occurrences || 1) - (a.occurrences || 1))
    .slice(0, 5)
    .map(p => ({ phase: p.phase || '—', error: p.errorSignature || p.id || p.regex || 'unknown', count: p.occurrences || 1 }));

  return result;
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------
const args = process.argv.slice(2);
if (args.length > 0) {
  const flags = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('--')) {
      const key = args[i].slice(2);
      const val = args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : 'true';
      flags[key] = val;
      if (val !== 'true') i++;
    }
  }

  if (flags.all) {
    const knowledge = readAllKnowledge();
    console.log(JSON.stringify(knowledge, null, 2));
    process.exit(0);
  }

  if (!flags.niche) {
    console.error('Usage: node read-knowledge.mjs --niche "locksmith" [--city "Cape Town"]');
    console.error('       node read-knowledge.mjs --all');
    process.exit(1);
  }

  const knowledge = readKnowledge(flags.niche, flags.city || null);
  console.log(JSON.stringify(knowledge, null, 2));
  process.exit(0);
}

export { readKnowledge, readAllKnowledge };
