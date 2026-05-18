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

export const FinancialInputsSchema = z
  .object({
    monthly_revenue: z.number().nonnegative().optional(),
    monthly_costs: z.number().nonnegative().optional(),
    startup_investment: z.number().nonnegative().optional(),
    expected_customers: z.number().nonnegative().optional(),
    average_price: z.number().nonnegative().optional(),
    churn_rate: z.number().min(0).max(100).optional(),
    cac: z.number().nonnegative().optional(),
    selected_industry: z.string().max(100).optional(),
  })
  .passthrough();

export const RequestSchema = z
  .object({
    idea: z.string().min(1).max(5000),
    location: z.string().min(1).max(200),
    financial_inputs: FinancialInputsSchema.optional(),
    selected_industry: z.string().max(100).optional(),
    documents: z.array(z.unknown()).max(10).optional(),
    analysis_depth: z.enum(['quick', 'full', 'pro', 'deep']).optional(),
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

export const WirePayloadSchema = z
  .object({
    metadata: MetadataSchema,
    financial_analysis: z.unknown().optional(),
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
