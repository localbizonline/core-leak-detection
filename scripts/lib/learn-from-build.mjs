import fs from 'node:fs';
import path from 'node:path';
import { getBuildState } from './phase-gate.mjs';

// ============================================================================
// learn-from-build.mjs
// ============================================================================
// Post-build learning. Parses BUILD-REPORT.md and phase-status files to
// aggregate knowledge into ~/.claude/knowledge/ for future builds.
//
// Usage:
//   node learn-from-build.mjs --project /path/to/project --status success
//   node learn-from-build.mjs --project /path/to/project --status qa-failed
//   node learn-from-build.mjs --insights   # show all-time insights
// ============================================================================

const KNOWLEDGE_BASE = path.join(process.env.HOME || '', '.claude', 'knowledge');

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function readJSON(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch {
    return null;
  }
}

function writeJSON(filePath, data) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

/** Normalize array-or-wrapped formats (e.g. {patterns:[...]} → [...]) */
function asArray(data, wrapperKey) {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data[wrapperKey])) return data[wrapperKey];
  if (data && typeof data === 'object') {
    for (const v of Object.values(data)) {
      if (Array.isArray(v)) return v;
    }
  }
  return [];
}

// ---------------------------------------------------------------------------
// Parse BUILD-REPORT.md into structured sections
// ---------------------------------------------------------------------------
function parseBuildReport(projectPath) {
  const reportPath = path.join(projectPath, 'BUILD-REPORT.md');
  if (!fs.existsSync(reportPath)) return null;

  const content = fs.readFileSync(reportPath, 'utf-8');
  const sections = [];
  const phaseRegex = /^## Phase (.+?): (.+)$/gm;
  let match;
  const positions = [];

  while ((match = phaseRegex.exec(content)) !== null) {
    positions.push({
      phase: match[1].trim(),
      label: match[2].trim(),
      start: match.index,
    });
  }

  for (let i = 0; i < positions.length; i++) {
    const start = positions[i].start;
    const end = i + 1 < positions.length ? positions[i + 1].start : content.length;
    const body = content.slice(start, end);

    const statusMatch = body.match(/\*\*Status:\*\* (\w+)/);
    const agentMatch = body.match(/\*\*Agent:\*\* (\S+)/);
    const durationMatch = body.match(/\*\*Duration:\*\* (\d+)s/);
    const summaryMatch = body.match(/\*\*Summary:\*\* (.+)/);

    sections.push({
      phase: positions[i].phase,
      label: positions[i].label,
      status: statusMatch ? statusMatch[1].toLowerCase() : 'unknown',
      agent: agentMatch ? agentMatch[1] : 'unknown',
      duration: durationMatch ? parseInt(durationMatch[1]) : null,
      summary: summaryMatch ? summaryMatch[1] : '',
      body,
    });
  }

  return { sections, raw: content };
}

// ---------------------------------------------------------------------------
// Collect all phase-N-status.json files
// ---------------------------------------------------------------------------
function collectPhaseStatuses(projectPath) {
  const statuses = {};
  const files = fs.readdirSync(projectPath).filter(f => /^phase-.*-status\.json$/.test(f));
  for (const f of files) {
    const data = readJSON(path.join(projectPath, f));
    if (data) statuses[data.phase || f.replace('-status.json', '')] = data;
  }
  return statuses;
}

// ---------------------------------------------------------------------------
// 1. Log build record
// ---------------------------------------------------------------------------
function logBuildRecord(projectPath, status) {
  const state = getBuildState(projectPath);
  const buildState = state.exists && state.valid ? state.state : {};
  const clientConfig = readJSON(path.join(projectPath, 'client-config.json')) || {};
  const designTokens = readJSON(path.join(projectPath, 'design-tokens.json')) || {};
  const report = parseBuildReport(projectPath);
  const phaseStatuses = collectPhaseStatuses(projectPath);

  const buildId = buildState.buildId || `build-${Date.now()}`;
  const buildsDir = path.join(KNOWLEDGE_BASE, 'builds');

  const record = {
    buildId,
    timestamp: new Date().toISOString(),
    status,
    companyName: buildState.metadata?.companyName || clientConfig.companyName || 'unknown',
    niche: buildState.metadata?.niche || clientConfig.niche || 'unknown',
    primaryCity: clientConfig.primaryCity || clientConfig.city || 'unknown',
    services: clientConfig.services?.map(s => s.title || s.name || s) || [],
    serviceCount: clientConfig.services?.length || 0,
    designDirection: designTokens.aesthetic || designTokens.direction || 'unknown',
    fonts: {
      display: designTokens.displayFont || designTokens.fonts?.display || 'unknown',
      body: designTokens.bodyFont || designTokens.fonts?.body || 'unknown',
    },
    colors: {
      primary: designTokens.primaryColor || designTokens.colors?.primary || 'unknown',
      accent: designTokens.accentColor || designTokens.colors?.accent || null,
    },
    deployUrl: buildState.metadata?.deployUrl || null,
    phaseCount: report ? report.sections.length : 0,
    failedPhases: report ? report.sections.filter(s => s.status === 'failed').map(s => s.phase) : [],
    totalDuration: report ? report.sections.reduce((sum, s) => sum + (s.duration || 0), 0) : 0,
    qaResults: phaseStatuses['9'] || phaseStatuses['9a'] || null,
  };

  writeJSON(path.join(buildsDir, `${buildId}.json`), record);
  console.log(`Build record saved: ${buildId}`);
  return record;
}

// ---------------------------------------------------------------------------
// 2. Update error patterns
// ---------------------------------------------------------------------------
function updateErrorPatterns(projectPath) {
  const report = parseBuildReport(projectPath);
  if (!report) return;

  const patternsFile = path.join(KNOWLEDGE_BASE, 'errors', 'error-patterns.json');
  let patterns = asArray(readJSON(patternsFile), 'patterns');

  const failedSections = report.sections.filter(s => s.status === 'failed');
  for (const section of failedSections) {
    // Extract error details from section body
    const issuesMatch = section.body.match(/### Issues\n([\s\S]*?)(?=\n##|\n---|\n$)/);
    const issues = issuesMatch ? issuesMatch[1].trim() : section.summary;

    const existing = patterns.find(p =>
      p.phase === section.phase && p.errorSignature === issues.slice(0, 100)
    );

    if (existing) {
      existing.occurrences = (existing.occurrences || 1) + 1;
      existing.lastSeen = new Date().toISOString();
    } else {
      patterns.push({
        phase: section.phase,
        agent: section.agent,
        errorSignature: issues.slice(0, 100),
        detail: issues.slice(0, 300),
        occurrences: 1,
        firstSeen: new Date().toISOString(),
        lastSeen: new Date().toISOString(),
      });
    }
  }

  // Keep last 100 patterns
  if (patterns.length > 100) patterns = patterns.slice(-100);
  writeJSON(patternsFile, patterns);
  console.log(`Error patterns updated: ${failedSections.length} failures processed`);
}

// ---------------------------------------------------------------------------
// 3. Update design decisions
// ---------------------------------------------------------------------------
function updateDesignDecisions(projectPath) {
  const designTokens = readJSON(path.join(projectPath, 'design-tokens.json'));
  const clientConfig = readJSON(path.join(projectPath, 'client-config.json'));
  const uniquenessConfig = readJSON(path.join(projectPath, 'uniqueness-config.json'));
  if (!designTokens) return;

  const decisionsFile = path.join(KNOWLEDGE_BASE, 'successes', 'design-decisions.json');
  let decisions = asArray(readJSON(decisionsFile), 'decisions');

  const qaStatus = readJSON(path.join(projectPath, 'phase-9-status.json'));

  decisions.push({
    timestamp: new Date().toISOString(),
    niche: clientConfig?.niche || 'unknown',
    direction: designTokens.aesthetic || designTokens.direction || 'unknown',
    fonts: {
      display: designTokens.displayFont || designTokens.fonts?.display || 'unknown',
      body: designTokens.bodyFont || designTokens.fonts?.body || 'unknown',
      accent: uniquenessConfig?.accentFont || null,
    },
    colors: {
      primary: designTokens.primaryColor || designTokens.colors?.primary || 'unknown',
      secondary: designTokens.secondaryColor || designTokens.colors?.secondary || null,
      accent: designTokens.accentColor || designTokens.colors?.accent || null,
    },
    uniqueness: uniquenessConfig ? {
      borderRadius: uniquenessConfig.borderRadius || null,
      shadowStyle: uniquenessConfig.shadowStyle || null,
      buttonStyle: uniquenessConfig.buttonStyle || null,
      headingHighlight: uniquenessConfig.headingHighlight || null,
    } : null,
    qaScore: qaStatus?.summary?.errors !== undefined
      ? (qaStatus.summary.errors === 0 ? 'pass' : 'fail')
      : 'unknown',
  });

  if (decisions.length > 50) decisions = decisions.slice(-50);
  writeJSON(decisionsFile, decisions);
  console.log(`Design decision logged for niche: ${clientConfig?.niche || 'unknown'}`);
}

// ---------------------------------------------------------------------------
// 4. Update performance metrics
// ---------------------------------------------------------------------------
function updatePerformanceMetrics(projectPath, buildRecord) {
  const metricsFile = path.join(KNOWLEDGE_BASE, 'metrics', 'performance-history.json');
  let metrics = asArray(readJSON(metricsFile), 'metrics');

  metrics.push({
    timestamp: new Date().toISOString(),
    buildId: buildRecord.buildId,
    niche: buildRecord.niche,
    status: buildRecord.status,
    serviceCount: buildRecord.serviceCount,
    phaseCount: buildRecord.phaseCount,
    failedPhases: buildRecord.failedPhases,
    totalDurationSeconds: buildRecord.totalDuration,
  });

  if (metrics.length > 100) metrics = metrics.slice(-100);
  writeJSON(metricsFile, metrics);
  console.log(`Performance metrics updated`);
}

// ---------------------------------------------------------------------------
// 5. Generate insights.md
// ---------------------------------------------------------------------------
function generateInsights() {
  const buildsDir = path.join(KNOWLEDGE_BASE, 'builds');
  const decisionsFile = path.join(KNOWLEDGE_BASE, 'successes', 'design-decisions.json');
  const patternsFile = path.join(KNOWLEDGE_BASE, 'errors', 'error-patterns.json');
  const metricsFile = path.join(KNOWLEDGE_BASE, 'metrics', 'performance-history.json');

  const builds = [];
  if (fs.existsSync(buildsDir)) {
    for (const f of fs.readdirSync(buildsDir).filter(f => f.endsWith('.json'))) {
      const data = readJSON(path.join(buildsDir, f));
      if (data) builds.push(data);
    }
  }

  const decisions = asArray(readJSON(decisionsFile), 'decisions');
  const patterns = asArray(readJSON(patternsFile), 'patterns');
  const metrics = asArray(readJSON(metricsFile), 'metrics');

  const totalBuilds = builds.length;
  const successBuilds = builds.filter(b => b.status === 'success').length;
  const niches = [...new Set(builds.map(b => b.niche).filter(n => n !== 'unknown'))];
  const topErrors = patterns
    .sort((a, b) => (b.occurrences || 1) - (a.occurrences || 1))
    .slice(0, 10);

  const avgDuration = metrics.length > 0
    ? Math.round(metrics.reduce((sum, m) => sum + (m.totalDurationSeconds || 0), 0) / metrics.length)
    : 0;

  // Niche-specific design stats
  const nicheDesigns = {};
  for (const d of decisions) {
    if (!nicheDesigns[d.niche]) nicheDesigns[d.niche] = [];
    nicheDesigns[d.niche].push(d);
  }

  let md = `# Build Insights

**Generated:** ${new Date().toISOString().slice(0, 10)}
**Total Builds:** ${totalBuilds}
**Success Rate:** ${totalBuilds > 0 ? Math.round((successBuilds / totalBuilds) * 100) : 0}%
**Avg Duration:** ${avgDuration}s
**Niches Built:** ${niches.join(', ') || 'none yet'}

---

## Top Error Patterns

| Phase | Error | Occurrences | Last Seen |
|-------|-------|-------------|-----------|
${topErrors.map(e => {
    const label = e.errorSignature || e.id || e.regex || 'unknown';
    return `| ${e.phase || '—'} | ${String(label).slice(0, 60)} | ${e.occurrences || 1} | ${(e.lastSeen || '').slice(0, 10)} |`;
  }).join('\n') || '| — | No errors recorded | — | — |'}

## Design Decisions by Niche

${Object.entries(nicheDesigns).map(([niche, designs]) => {
    const latest = designs[designs.length - 1];
    return `### ${niche}
- **Direction:** ${latest.direction}
- **Display Font:** ${latest.fonts?.display || '—'}
- **Body Font:** ${latest.fonts?.body || '—'}
- **Primary Color:** ${latest.colors?.primary || '—'}
- **QA Result:** ${latest.qaScore || '—'}
- **Builds:** ${designs.length}`;
  }).join('\n\n') || 'No design decisions recorded yet.'}

## Performance Trend

${metrics.length > 0 ? metrics.slice(-10).map(m =>
    `- ${(m.timestamp || '').slice(0, 10)} | ${m.niche || '—'} | ${m.status || '—'} | ${m.serviceCount || 0} services | ${m.totalDurationSeconds || 0}s | ${(m.failedPhases || []).length} failures`
  ).join('\n') : 'No metrics recorded yet.'}
`;

  const insightsPath = path.join(KNOWLEDGE_BASE, 'insights.md');
  ensureDir(KNOWLEDGE_BASE);
  fs.writeFileSync(insightsPath, md);
  console.log(`Insights written: ${insightsPath}`);
  return md;
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------
function learnFromBuild(projectPath, status) {
  console.log(`\nLearning from build: ${projectPath}`);
  console.log(`Status: ${status}\n`);

  const record = logBuildRecord(projectPath, status);
  updateErrorPatterns(projectPath);
  updateDesignDecisions(projectPath);
  updatePerformanceMetrics(projectPath, record);
  generateInsights();

  console.log(`\nLearning complete. Knowledge base: ${KNOWLEDGE_BASE}`);
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

  if (flags.insights) {
    const md = generateInsights();
    console.log(md);
    process.exit(0);
  }

  const projectPath = flags.project;
  if (!projectPath) {
    console.error('Usage: node learn-from-build.mjs --project <path> --status <success|qa-failed>');
    console.error('       node learn-from-build.mjs --insights');
    process.exit(1);
  }

  const status = flags.status || 'unknown';
  learnFromBuild(projectPath, status);
  process.exit(0);
}

export { learnFromBuild, generateInsights, parseBuildReport };
