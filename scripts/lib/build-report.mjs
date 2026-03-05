import fs from 'node:fs';
import path from 'node:path';
import { completePhase, failPhase, startPhase } from './phase-gate.mjs';

// ============================================================================
// build-report.mjs
// ============================================================================
// Structured phase-sectioned build report. Replaces BUILD-LOG.md.
//
// Each agent writes its own section to BUILD-REPORT.md under a phase heading.
// Also writes phase-N-status.json (compact summary for leader) and
// auto-calls completePhase()/failPhase() so build-state.json stays accurate.
//
// Usage (in scripts / agents):
//   import { buildReport } from './build-report.mjs';
//   const report = buildReport('/path/to/project');
//   report.init('JJ Locksmith', 'build-123');
//   report.writePhase({ phase: '2', agent: 'designer', status: 'complete', ... });
//
// Usage (CLI — for teammate agents):
//   node build-report.mjs --project /path --init --company "JJ Locksmith"
//   node build-report.mjs --project /path --phase 2 --agent designer --status complete \
//     --duration 30 --summary "Brutalist, Archivo/Inter" --section "### Decisions\n..."
//   node build-report.mjs --project /path --errors
// ============================================================================

const REPORT_FILE = 'BUILD-REPORT.md';

const PHASE_LABELS = {
  '0': 'Health Check',
  '1': 'Data Fetch',
  '1.2': 'Competitor Research',
  '1.5': 'Review Collection',
  '2': 'Design Direction',
  '3': 'Clone Template',
  '4': 'Content Generation',
  '5': 'Theme & Locations',
  '6a': 'Brand Images (Airtable)',
  '6b': 'AI Image Generation',
  '7': 'Build (placeholder images)',
  '7.5': 'Uniqueness Tweaks',
  '7.6': 'Final Rebuild',
  '7.7': 'Build Checklist',
  '7.8': 'Design Enhancement',
  '7.9': 'Post-Enhancement Rebuild',
  '8': 'Deploy',
  '9a': 'SEO QA',
  '9b': 'Design Review',
  '9c': 'Image QA',
  '9': 'QA Verification',
  '10': 'Self-Learning',
  '11': 'GitHub & CLAUDE.md',
};

// Map sub-phases to their parent phase-gate ID (for completePhase calls)
const PHASE_TO_GATE = {
  '0': 'phase-0',
  '1': 'phase-1',
  '1.2': null, // no gate for sub-phase — leader handles
  '1.5': null,
  '2': 'phase-2',
  '3': 'phase-3',
  '4': 'phase-4',
  '5': 'phase-5',
  '6a': null, // part of phase-6
  '6b': 'phase-6',
  '7': 'phase-7',
  '7.5': null, // no gate
  '7.6': null, // leader re-uses phase-7
  '7.7': null,
  '7.8': null,
  '7.9': null,
  '8': 'phase-8',
  '9a': null, // part of phase-9
  '9b': null,
  '9c': null,
  '9': 'phase-9',
  '10': 'phase-10',
  '11': null,
};

function timestamp() {
  return new Date().toISOString().replace('T', ' ').slice(0, 19);
}

function statusIcon(status) {
  if (status === 'complete') return 'COMPLETE';
  if (status === 'failed') return 'FAILED';
  if (status === 'skipped') return 'SKIPPED';
  if (status === 'partial') return 'PARTIAL';
  return status.toUpperCase();
}

/** Initialize BUILD-REPORT.md with header */
function initReport(projectPath, companyName, buildId) {
  const reportPath = path.join(projectPath, REPORT_FILE);
  const header = `# Build Report: ${companyName}

**Build ID:** ${buildId || 'unknown'}
**Started:** ${timestamp()}
**Template:** local-service-template

---

`;
  fs.writeFileSync(reportPath, header, 'utf-8');
  return reportPath;
}

/** Write a phase section to BUILD-REPORT.md + phase-N-status.json */
function writePhase(projectPath, {
  phase,
  agent,
  status,
  duration = null,
  summary = '',
  section = '',
  artifacts = {},
  warnings = 0,
  errors = 0,
  validation = null,
  updateGate = true,
}) {
  const reportPath = path.join(projectPath, REPORT_FILE);

  // Ensure report file exists
  if (!fs.existsSync(reportPath)) {
    initReport(projectPath, 'Unknown', 'unknown');
  }

  const label = PHASE_LABELS[phase] || `Phase ${phase}`;
  const durationStr = duration ? ` | **Duration:** ${duration}s` : '';
  const statusStr = statusIcon(status);

  let phaseSection = `
## Phase ${phase}: ${label}
**Status:** ${statusStr}${durationStr}
**Agent:** ${agent}
`;

  if (summary) {
    phaseSection += `**Summary:** ${summary}\n`;
  }

  if (section) {
    phaseSection += `\n${section}\n`;
  }

  phaseSection += `\n---\n`;

  fs.appendFileSync(reportPath, phaseSection, 'utf-8');

  // Write phase-N-status.json
  const statusObj = {
    phase,
    status,
    agent,
    timestamp: new Date().toISOString(),
    duration_ms: duration ? duration * 1000 : null,
    summary,
    warnings,
    errors,
    artifacts: Object.keys(artifacts).length > 0 ? artifacts : undefined,
    validation: validation || undefined,
  };

  // Use phase number as filename (replace dots with dash for sub-phases)
  const statusFilename = `phase-${phase.replace('.', '-')}-status.json`;
  const statusPath = path.join(projectPath, statusFilename);
  fs.writeFileSync(statusPath, JSON.stringify(statusObj, null, 2), 'utf-8');

  // Auto-update build-state.json via phase-gate
  if (updateGate) {
    const gateId = PHASE_TO_GATE[phase];
    if (gateId) {
      try {
        if (status === 'complete' || status === 'partial') {
          completePhase(projectPath, gateId, artifacts, { skipArtifactCheck: status === 'partial' });
        } else if (status === 'failed') {
          failPhase(projectPath, gateId, summary || 'Phase failed');
        }
      } catch (err) {
        // Log but don't crash — build-state update is best-effort
        console.warn(`Warning: Could not update build-state.json for ${gateId}: ${err.message}`);
      }
    }
  }

  return { reportPath, statusPath: statusPath };
}

/** Append an error/warning summary section at the end of the report */
function writeErrorSummary(projectPath) {
  const reportPath = path.join(projectPath, REPORT_FILE);
  if (!fs.existsSync(reportPath)) return null;

  // Collect all phase-status files
  const files = fs.readdirSync(projectPath).filter(f => /^phase-.*-status\.json$/.test(f));
  let totalErrors = 0;
  let totalWarnings = 0;
  let totalSkips = 0;
  let totalFallbacks = 0;
  const issues = [];

  for (const file of files) {
    try {
      const data = JSON.parse(fs.readFileSync(path.join(projectPath, file), 'utf-8'));
      totalErrors += data.errors || 0;
      totalWarnings += data.warnings || 0;
      if (data.status === 'skipped') totalSkips++;
      if (data.status === 'failed') {
        issues.push(`Phase ${data.phase}: ${data.summary || 'Failed'}`);
      }
    } catch { /* skip invalid files */ }
  }

  // Also scan the report content for WARNING/SKIP/FALLBACK/ERROR keywords
  const content = fs.readFileSync(reportPath, 'utf-8');
  const skipMatches = (content.match(/- SKIP:/g) || []).length;
  const fallbackMatches = (content.match(/- FALLBACK:/g) || []).length;
  const warningMatches = (content.match(/- WARNING:/g) || []).length;
  const errorMatches = (content.match(/- ERROR:/g) || []).length;

  totalSkips = Math.max(totalSkips, skipMatches);
  totalFallbacks = Math.max(totalFallbacks, fallbackMatches);
  totalWarnings = Math.max(totalWarnings, warningMatches);
  totalErrors = Math.max(totalErrors, errorMatches);

  const summarySection = `
## Errors & Warnings Summary

| Level | Count |
|-------|-------|
| ERROR | ${totalErrors} |
| WARNING | ${totalWarnings} |
| SKIP | ${totalSkips} |
| FALLBACK | ${totalFallbacks} |

${issues.length > 0 ? '### Failed Phases\n' + issues.map(i => `- ${i}`).join('\n') + '\n' : ''}
`;

  fs.appendFileSync(reportPath, summarySection, 'utf-8');

  return { totalErrors, totalWarnings, totalSkips, totalFallbacks, issues };
}

/** Read the full report content (for stage handoff) */
function getReport(projectPath) {
  const reportPath = path.join(projectPath, REPORT_FILE);
  if (!fs.existsSync(reportPath)) return null;
  return fs.readFileSync(reportPath, 'utf-8');
}

/** Read a specific phase status */
function getPhaseStatus(projectPath, phase) {
  const statusFilename = `phase-${phase.replace('.', '-')}-status.json`;
  const statusPath = path.join(projectPath, statusFilename);
  if (!fs.existsSync(statusPath)) return null;
  try {
    return JSON.parse(fs.readFileSync(statusPath, 'utf-8'));
  } catch {
    return null;
  }
}

/** Check if report exists */
function reportExists(projectPath) {
  return fs.existsSync(path.join(projectPath, REPORT_FILE));
}

/** Export the API */
export function buildReport(projectPath) {
  return {
    init: (companyName, buildId) => initReport(projectPath, companyName, buildId),
    writePhase: (opts) => writePhase(projectPath, opts),
    writeErrorSummary: () => writeErrorSummary(projectPath),
    getReport: () => getReport(projectPath),
    getPhaseStatus: (phase) => getPhaseStatus(projectPath, phase),
    exists: () => reportExists(projectPath),
  };
}

// --- CLI ---
const isDirectExecution = process.argv[1]?.endsWith('build-report.mjs');
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
    const company = flags.company || 'Unknown';
    const buildId = flags['build-id'] || `build-${Date.now()}`;
    initReport(projectPath, company, buildId);
    console.log(`Build report initialized: ${path.join(projectPath, REPORT_FILE)}`);
    process.exit(0);
  }

  if (flags.phase) {
    const phase = flags.phase;
    const agent = flags.agent || 'unknown';
    const status = flags.status || 'complete';
    const duration = flags.duration ? parseInt(flags.duration, 10) : null;
    const summary = flags.summary || '';
    // Section can contain \n literals from CLI — convert them
    const section = (flags.section || '').replace(/\\n/g, '\n');
    const updateGate = flags['no-gate'] !== 'true';

    let artifacts = {};
    if (flags.artifacts) {
      try { artifacts = JSON.parse(flags.artifacts); } catch { artifacts = {}; }
    }

    const warnings = flags.warnings ? parseInt(flags.warnings, 10) : 0;
    const errors = flags.errors ? parseInt(flags.errors, 10) : 0;

    const result = writePhase(projectPath, {
      phase, agent, status, duration, summary, section, artifacts, warnings, errors, updateGate,
    });

    console.log(`Phase ${phase} logged to BUILD-REPORT.md`);
    console.log(`Status written to ${result.statusPath}`);
    process.exit(0);
  }

  if (flags.errors || flags['error-summary']) {
    const result = writeErrorSummary(projectPath);
    if (!result) {
      console.error('No BUILD-REPORT.md found');
      process.exit(1);
    }
    console.log(`\nError Summary:`);
    console.log(`  Errors: ${result.totalErrors}`);
    console.log(`  Warnings: ${result.totalWarnings}`);
    console.log(`  Skips: ${result.totalSkips}`);
    console.log(`  Fallbacks: ${result.totalFallbacks}`);
    if (result.issues.length > 0) {
      console.log(`\nFailed Phases:`);
      result.issues.forEach(i => console.log(`  - ${i}`));
    }
    process.exit(0);
  }

  if (flags.read) {
    const phase = flags['read-phase'];
    if (phase) {
      const status = getPhaseStatus(projectPath, phase);
      if (status) {
        console.log(JSON.stringify(status, null, 2));
      } else {
        console.error(`No status found for phase ${phase}`);
        process.exit(1);
      }
    } else {
      const report = getReport(projectPath);
      if (report) {
        console.log(report);
      } else {
        console.error('No BUILD-REPORT.md found');
        process.exit(1);
      }
    }
    process.exit(0);
  }

  console.error('Usage:');
  console.error('  --init --company "Name" [--build-id "id"]');
  console.error('  --phase N --agent name --status complete [--duration N] [--summary "..."] [--section "..."]');
  console.error('  --errors (write error summary section)');
  console.error('  --read [--read-phase N] (read report or phase status)');
  process.exit(1);
}
