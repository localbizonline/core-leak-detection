import { z } from 'zod';

/** Schema for phase-N-status.json files written by build-report.mjs */
export const PhaseStatusFile = z.object({
  phase: z.string().min(1),
  status: z.enum(['complete', 'failed', 'skipped', 'partial']),
  agent: z.string().min(1),
  timestamp: z.string().datetime(),
  duration_ms: z.number().nullable().optional(),
  summary: z.string().default(''),
  warnings: z.number().int().default(0),
  errors: z.number().int().default(0),
  artifacts: z.record(z.string(), z.string()).optional(),
  validation: z.object({
    hexValid: z.boolean().optional(),
    logoMatch: z.boolean().optional(),
    wcagPass: z.boolean().optional(),
    servicesCount: z.number().int().optional(),
    pricingPage: z.boolean().optional(),
    placeholders: z.array(z.string()).optional(),
    reviewsMapped: z.boolean().optional(),
    imagesValid: z.boolean().optional(),
    modelCorrect: z.boolean().optional(),
  }).optional(),
});

/** Schema for the error summary output */
export const ErrorSummary = z.object({
  totalErrors: z.number().int(),
  totalWarnings: z.number().int(),
  totalSkips: z.number().int(),
  totalFallbacks: z.number().int(),
  issues: z.array(z.string()),
});
