/**
 * Boundary Zod schemas — Step 7 of the Benchmark-First Hardening Plan.
 *
 * Nothing leaves analyze-business without `ResponseSchema.parse(...)`, and
 * nothing enters without `RequestSchema.safeParse(...)`. Guarantees the
 * UI/PDF never receive a malformed `metadata.benchmarks[]` block — they
 * get a valid one or a typed 4xx/5xx error.
 *
 * Kept separate from the engine's internal type-only `schemas.ts` so this
 * file owns runtime validation at the HTTP boundary only.
 */
import { z } from 'npm:zod@3.23.8';

// ── Request ──────────────────────────────────────────────────────────

/**
 * Coerce-and-clamp number: accepts number OR numeric string, drops
 * empty/null/NaN/Infinity to `undefined`. A trust boundary with a known-good
 * internal consumer should interpret what it safely can rather than 400 the
 * user's primary flow over a client serialization quirk (e.g. an input that
 * sent "100" instead of 100). Hard rejection is reserved for fields we cannot
 * interpret (missing idea/location). See BUG-034 in MEGA_MASTER_PROMPT.
 */
const coercedNonnegative = z.preprocess((v) => {
  if (v === '' || v === null || v === undefined) return undefined;
  const n = typeof v === 'string' ? Number(v) : v;
  return typeof n === 'number' && Number.isFinite(n) && n >= 0 ? n : undefined;
}, z.number().nonnegative().optional());

/** Same as above, but clamps to [0, 100] for percentage fields. */
const coercedPercent = z.preprocess((v) => {
  if (v === '' || v === null || v === undefined) return undefined;
  const n = typeof v === 'string' ? Number(v) : v;
  if (typeof n !== 'number' || !Number.isFinite(n)) return undefined;
  return Math.max(0, Math.min(100, n));
}, z.number().min(0).max(100).optional());

export const FinancialInputsSchema = z
  .object({
    monthly_revenue: coercedNonnegative,
    monthly_costs: coercedNonnegative,
    startup_investment: coercedNonnegative,
    expected_customers: coercedNonnegative,
    average_price: coercedNonnegative,
    churn_rate: coercedPercent,
    cac: coercedNonnegative,
    selected_industry: z.coerce.string().max(100).optional(),
  })
  .passthrough();

export const RequestSchema = z
  .object({
    idea: z.string().min(1).max(5000),
    location: z.string().min(1).max(200),
    financial_inputs: FinancialInputsSchema.optional(),
    selected_industry: z.coerce.string().max(100).optional(),
    documents: z.array(z.unknown()).max(10).optional(),
    // Unknown depth → coerce to 'full' rather than reject the request.
    analysis_depth: z.preprocess(
      (v) => (['quick', 'full', 'pro', 'deep'].includes(v as string) ? v : undefined),
      z.enum(['quick', 'full', 'pro', 'deep']).optional()
    ),
  })
  .passthrough();

// ── Response (benchmark-first contract) ──────────────────────────────

export const BenchmarkRecordSchema = z.object({
  metric: z.string().min(1),
  unit: z.enum(['percent', 'months', 'usd', 'ratio']),
  value: z.number().nullable(),
  p25: z.number().nullable(),
  median: z.number().nullable(),
  p75: z.number().nullable(),
  sample_size: z.number().int().nonnegative(),
  source: z.string().nullable(),
  dataset_date: z.string().nullable(),
  match_type: z.enum(['direct', 'similar', 'none']),
  match_level: z.string().nullable(),
});

export const BenchmarkMatchSummarySchema = z.object({
  direct: z.number().int().nonnegative(),
  similar: z.number().int().nonnegative(),
  none: z.number().int().nonnegative(),
  total: z.number().int().nonnegative(),
});

export const MetadataSchema = z
  .object({
    idea: z.string(),
    location: z.string(),
    generated_at: z.string(),
    model: z.string(),
    version: z.string(),
    benchmarks: z.array(BenchmarkRecordSchema).optional(),
    benchmark_mode: z.enum(['live', 'unavailable']).optional(),
    benchmark_match_summary: BenchmarkMatchSummarySchema.optional(),
    fallback_mode: z.boolean().optional(),
    fallback_reason: z.string().nullable().optional(),
  })
  .passthrough();

const NumericPaybackSchema = z.number().finite().nonnegative();

export const FinancialAnalysisWireSchema = z
  .object({
    unit_economics: z
      .object({ cac_payback_months: NumericPaybackSchema.optional() })
      .passthrough()
      .optional(),
    returns: z
      .object({ payback_period_months: NumericPaybackSchema.optional() })
      .passthrough()
      .optional(),
    payback_period_months: NumericPaybackSchema.optional(),
  })
  .passthrough();

export const WirePayloadSchema = z
  .object({
    metadata: MetadataSchema,
    financial_analysis: FinancialAnalysisWireSchema.optional(),
    business_plan: z.unknown().optional(),
    confidence_score: z.number().optional(),
  })
  .passthrough();

export const ResponseSchema = z.object({
  success: z.literal(true),
  data: WirePayloadSchema,
});

export type ValidatedRequest = z.infer<typeof RequestSchema>;
export type ValidatedResponse = z.infer<typeof ResponseSchema>;
