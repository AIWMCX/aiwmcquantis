/**
 * Immutable analysis snapshot emitter — Handbook §19 item 9.
 *
 * Writes one row to analysis_snapshots per completed analysis: engine/
 * formula-registry versions, SHA-256 hashes of the normalized input and the
 * deterministic numeric output, and the typed investment-payback result.
 * See migration 20260711180000_analysis_snapshots.sql for the architectural
 * note on why analysis_id is nullable and correlation_id is the real anchor
 * at write time.
 *
 * Fire-and-forget: a failed write MUST NOT cause an otherwise-good analysis
 * to return non-200. Log the error, continue. Matches the established
 * pattern in analysis-complete-event.ts.
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import type { MonthsMetricResult } from '../analyze-business/payback-contract.ts';
import type { LockedNumericPayload } from './locked-numeric-payload.ts';
import { CANONICAL_JSON_VERSION, canonicalSha256 } from './canonical-json.ts';

export const ENGINE_VERSION = '2.0.0-precision';
export const FORMULA_REGISTRY_VERSION = '1.0.0';

export interface AnalysisSnapshotInput {
  correlationId: string;
  analysisId?: string | null;
  userId?: string | null;
  datasetVersion?: string | null;
  normalizedInput: Record<string, unknown>;
  // Item 11: was Record<string, unknown> -- any shape, any subset of fields,
  // no embedded process versioning, no canonical rounding. Now a strict,
  // pre-hashed, runtime-immutable LockedNumericPayload (see
  // locked-numeric-payload.ts) built once at the call site via
  // lockNumericPayload(), so numeric_output_hash below is exactly
  // payload.hash rather than a second, redundant hash of the whole object.
  numericOutput: LockedNumericPayload;
  investmentPayback: MonthsMetricResult;
  cacPayback?: MonthsMetricResult | null;
  validationStatus: 'PASS' | 'WARN' | 'BLOCK';
  validationIssues?: unknown[];
}

/**
 * Content hash of a snapshot input. Uses canonical-json-v2 (every nested
 * value counts, NaN rejected). Rows written before this change carry
 * input_hash_version NULL = legacy v1, whose hash ignored nested keys
 * (R&D F01) and must not be treated as proof of identical inputs.
 */
export async function sha256Hex(value: unknown): Promise<string> {
  return await canonicalSha256(value);
}
export const INPUT_HASH_VERSION = CANONICAL_JSON_VERSION;

let cachedClient: ReturnType<typeof createClient> | null = null;
function getServiceClient() {
  if (cachedClient) return cachedClient;
  const url = Deno.env.get('SUPABASE_URL') ?? '';
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  if (!url || !serviceKey) return null;
  cachedClient = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return cachedClient;
}

export async function emitAnalysisSnapshot(input: AnalysisSnapshotInput): Promise<void> {
  try {
    const client = getServiceClient();
    if (!client) {
      console.warn('[analysis-snapshot] service client unavailable, skipping');
      return;
    }
    const inputHash = await sha256Hex(input.normalizedInput);
    // input.numericOutput is a LockedNumericPayload -- already self-hashed by
    // lockNumericPayload() at the call site, over its own canonicalized
    // fields + embedded engine/formula-registry versions. Use that hash
    // directly rather than re-hashing the whole (now-typed, frozen) object,
    // which would just be a redundant hash-of-a-hash-bearing-object.
    const numericOutputHash = input.numericOutput.hash;
    const { error } = await client.from('analysis_snapshots').insert({
      correlation_id: input.correlationId,
      analysis_id: input.analysisId ?? null,
      user_id: input.userId ?? null,
      engine_version: ENGINE_VERSION,
      formula_registry_version: FORMULA_REGISTRY_VERSION,
      dataset_version: input.datasetVersion ?? null,
      input_hash: inputHash,
      input_hash_version: INPUT_HASH_VERSION,
      numeric_output_hash: numericOutputHash,
      investment_payback: input.investmentPayback,
      cac_payback: input.cacPayback ?? null,
      validation_status: input.validationStatus,
      validation_issues: input.validationIssues ?? [],
    });
    if (error) {
      console.warn('[analysis-snapshot] insert failed:', error.message);
    }
  } catch (err) {
    console.warn('[analysis-snapshot] unexpected failure (non-fatal):', (err as Error)?.message);
  }
}
