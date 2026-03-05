import { z } from 'zod';

export const PHASE_IDS = [
  'phase-0',    // Health Check
  'phase-1',    // Data Gathering
  'phase-2',    // Design Direction
  'phase-3',    // Project Scaffold / Clone Template
  'phase-4',    // Content Generation / Populate Config
  'phase-5',    // Theme & Locations / Image Workflow prep
  'phase-6',    // Images (Stage A — Airtable downloads)
  'phase-6b',   // Images (Stage B — AI generation via FAL)
  'phase-7a',   // Fast Build (before images, for progressive deploy)
  'phase-7b',   // Fast Deploy (live URL with placeholders)
  'phase-7',    // Initial Build (post-images)
  'phase-7.5',  // Uniqueness tweaks (CSS axes, accent font)
  'phase-7.6',  // Post-uniqueness rebuild
  'phase-7.7',  // Build checklist (post-build.mjs validation)
  'phase-7.8',  // Design enhancement (competitor-driven)
  'phase-7.9',  // Final production build
  'phase-8',    // Deploy (final)
  'phase-9',    // QA Verification
  'phase-10',   // Learn
];

export const PhaseStatus = z.enum(['pending', 'in_progress', 'completed', 'failed']);

export const PhaseEntry = z.object({
  status: PhaseStatus,
  completedAt: z.string().datetime().optional(),
  artifacts: z.record(z.string(), z.string()).optional(),
  error: z.string().optional(),
});

const DEFAULT_PHASE = { status: 'pending' };

// Preprocess phases to backfill missing phase entries with { status: 'pending' }.
// This ensures backwards compatibility with build-state.json files created before
// Stage B sub-phases (6b, 7.5, 7.6, 7.7, 7.8, 7.9) were added to the schema.
const PhasesSchema = z.preprocess(
  (val) => {
    if (typeof val !== 'object' || val === null) return val;
    const phases = { ...val };
    for (const id of PHASE_IDS) {
      if (!(id in phases)) {
        phases[id] = { ...DEFAULT_PHASE };
      }
    }
    return phases;
  },
  z.object(Object.fromEntries(
    PHASE_IDS.map(id => [id, PhaseEntry])
  ))
);

export const BuildState = z.object({
  buildId: z.string().min(1),
  builderType: z.enum(['custom', 'template']),
  startedAt: z.string().datetime(),
  projectPath: z.string().min(1),
  metadata: z.object({
    companyName: z.string().optional(),
    niche: z.string().optional(),
    deployUrl: z.string().url().optional(),
    repoUrl: z.string().url().optional(),
    templateVersion: z.string().optional(),
  }),
  phases: PhasesSchema,
});

/** Create a fresh build state with all phases pending */
export function createInitialState(buildId, builderType, projectPath, metadata = {}) {
  const phases = {};
  for (const id of PHASE_IDS) {
    phases[id] = { status: 'pending' };
  }
  return {
    buildId,
    builderType,
    startedAt: new Date().toISOString(),
    projectPath,
    metadata,
    phases,
  };
}
