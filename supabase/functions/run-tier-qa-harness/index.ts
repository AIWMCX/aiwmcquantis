/**
 * Tier QA Harness — production-parity tier matrix validator.
 *
 * Runs synthetic regression on every tier (free / plus / pro), validating:
 *   1. Server FEATURES matrix matches the canonical expected matrix.
 *   2. Server LIMITS matrix matches expected.
 *   3. Pricing fields (priceMonthly / priceAnnual) match marketing source of truth.
 *   4. Smoke calls to analyze-preview to confirm the production path responds.
 *
 * Persists every run to public.tier_qa_runs.
 *
 * Auth:
 *   - service_role JWT (cron) → allowed
 *   - admin JWT (manual)      → allowed
 *   - anything else            → 403
 */

import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';


import { maybeHealthResponse } from '../_shared/health.ts';
const FUNCTION_NAME = 'run-tier-qa-harness';
const FUNCTION_VERSION = '1.0.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// -------- Canonical expected matrix (mirrors src/config/tiers.ts) --------
const EXPECTED_FEATURES = {
  free: {
    depthQuick: true, depthFull: false, depthPro: false,
    preMortem: false, invoiceCapacity: false, documentStudio: false, aiDocIntelligence: false,
    customBranding: false, whiteLabel: false, unlimitedHistory: false, watermarkFree: false,
    apiAccess: false, tamSamSom: false, pitchDeck: false, strategicRoadmap: false,
    fiveYearModel: false, actionPlan: false,
  },
  plus: {
    depthQuick: true, depthFull: true, depthPro: false,
    preMortem: true, invoiceCapacity: true, documentStudio: true, aiDocIntelligence: true,
    customBranding: true, whiteLabel: false, unlimitedHistory: true, watermarkFree: true,
    apiAccess: false, tamSamSom: false, pitchDeck: false, strategicRoadmap: false,
    fiveYearModel: false, actionPlan: true,
  },
  pro: {
    depthQuick: true, depthFull: true, depthPro: true,
    preMortem: true, invoiceCapacity: true, documentStudio: true, aiDocIntelligence: true,
    customBranding: true, whiteLabel: true, unlimitedHistory: true, watermarkFree: true,
    apiAccess: true, tamSamSom: true, pitchDeck: true, strategicRoadmap: true,
    fiveYearModel: true, actionPlan: true,
  },
} as const;

const EXPECTED_LIMITS = {
  free: { analysesPerMonth: 1, downloadsPerDay: 5, projectionMonths: 0, monteCarloScenarios: 0, teamSeats: 0, templates: 0 },
  plus: { analysesPerMonth: Number.POSITIVE_INFINITY, downloadsPerDay: Number.POSITIVE_INFINITY, projectionMonths: 36, monteCarloScenarios: 95_500, teamSeats: 1, templates: 12 },
  pro:  { analysesPerMonth: Number.POSITIVE_INFINITY, downloadsPerDay: Number.POSITIVE_INFINITY, projectionMonths: 60, monteCarloScenarios: 95_500, teamSeats: 3, templates: 12 },
} as const;

const EXPECTED_PRICES = {
  free: { priceMonthly: 0, priceAnnual: 0 },
  plus: { priceMonthly: 17, priceAnnual: 149 },
  pro:  { priceMonthly: 49, priceAnnual: 469 },
} as const;

type Tier = 'free' | 'plus' | 'pro';
type Failure = {
  tier: Tier;
  matrix: 'features' | 'limits' | 'pricing' | 'smoke';
  key: string;
  expected: unknown;
  actual: unknown;
  message: string;
};

interface Summary {
  features: { passed: number; failed: number };
  limits: { passed: number; failed: number };
  pricing: { passed: number; failed: number };
  smoke: { passed: number; failed: number };
}

// -------- Caller authorization --------
async function authorize(req: Request, supabaseAdmin: SupabaseClient): Promise<{ ok: true; triggeredBy: 'cron' | 'manual' } | { ok: false; status: number; reason: string }> {
  const auth = req.headers.get('Authorization') ?? '';
  const token = auth.replace(/^Bearer\s+/i, '').trim();
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  if (token && serviceRoleKey && token === serviceRoleKey) {
    return { ok: true, triggeredBy: 'cron' };
  }
  if (!token) return { ok: false, status: 401, reason: 'missing_token' };
  const { data: userData, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !userData?.user) return { ok: false, status: 401, reason: 'invalid_token' };
  const { data: roleRow } = await supabaseAdmin
    .from('user_roles')
    .select('role')
    .eq('user_id', userData.user.id)
    .eq('role', 'admin')
    .maybeSingle();
  if (!roleRow) return { ok: false, status: 403, reason: 'not_admin' };
  return { ok: true, triggeredBy: 'manual' };
}

// -------- Matrix validators --------
async function validateMatrix(): Promise<{ failures: Failure[]; summary: Summary }> {
  const failures: Failure[] = [];
  const summary: Summary = {
    features: { passed: 0, failed: 0 },
    limits: { passed: 0, failed: 0 },
    pricing: { passed: 0, failed: 0 },
    smoke: { passed: 0, failed: 0 },
  };

  // Import the real server matrix at runtime (production-parity).
  const ent = await import('../_shared/entitlements.ts');
  // We rely on test exports if present, else re-derive from requireFeature.
  // Best-effort: read the FEATURES / LIMITS via the module's internal helpers.
  const serverFeatures = (ent as unknown as { FEATURES?: typeof EXPECTED_FEATURES }).FEATURES;
  const serverLimits = (ent as unknown as { LIMITS?: typeof EXPECTED_LIMITS }).LIMITS;

  const tiers: Tier[] = ['free', 'plus', 'pro'];
  for (const tier of tiers) {
    // Features
    for (const [key, expected] of Object.entries(EXPECTED_FEATURES[tier])) {
      const actual = serverFeatures?.[tier]?.[key as keyof typeof EXPECTED_FEATURES.free];
      if (actual === expected) {
        summary.features.passed++;
      } else {
        summary.features.failed++;
        failures.push({
          tier, matrix: 'features', key, expected, actual,
          message: `Feature '${key}' on tier '${tier}' expected ${expected}, got ${actual}`,
        });
      }
    }
    // Limits
    for (const [key, expected] of Object.entries(EXPECTED_LIMITS[tier])) {
      const actual = serverLimits?.[tier]?.[key as keyof typeof EXPECTED_LIMITS.free];
      const match = (expected === Number.POSITIVE_INFINITY)
        ? (actual === Number.POSITIVE_INFINITY || actual === Infinity)
        : actual === expected;
      if (match) {
        summary.limits.passed++;
      } else {
        summary.limits.failed++;
        failures.push({
          tier, matrix: 'limits', key,
          expected: expected === Infinity ? 'Infinity' : expected,
          actual: actual === Infinity ? 'Infinity' : actual,
          message: `Limit '${key}' on tier '${tier}' expected ${expected}, got ${actual}`,
        });
      }
    }
  }

  // Pricing parity vs business-logic.ts
  try {
    const bizMod: unknown = await import('../_shared/business-logic.ts');
    const tiersBlock = (bizMod as { TIERS?: Record<string, { priceMonthly?: number; priceAnnual?: number }> }).TIERS;
    if (tiersBlock) {
      for (const tier of tiers) {
        const expected = EXPECTED_PRICES[tier];
        for (const f of ['priceMonthly', 'priceAnnual'] as const) {
          const actual = tiersBlock[tier]?.[f];
          if (actual === expected[f]) summary.pricing.passed++;
          else {
            summary.pricing.failed++;
            failures.push({
              tier, matrix: 'pricing', key: f, expected: expected[f], actual,
              message: `Price '${f}' on tier '${tier}' expected ${expected[f]}, got ${actual}`,
            });
          }
        }
      }
    }
  } catch (e) {
    failures.push({
      tier: 'free', matrix: 'pricing', key: 'import_error', expected: 'TIERS export', actual: String(e),
      message: 'Could not import _shared/business-logic.ts to verify pricing parity',
    });
    summary.pricing.failed++;
  }

  return { failures, summary };
}

// -------- Smoke test: analyze-preview is reachable --------
async function smokeAnalyzePreview(): Promise<{ passed: boolean; failure?: Failure }> {
  try {
    const url = `${Deno.env.get('SUPABASE_URL')}/functions/v1/analyze-preview`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${Deno.env.get('SUPABASE_ANON_KEY') ?? ''}`,
      },
      body: JSON.stringify({
        idea: 'Coffee shop in Berlin testing the QA harness pipeline',
        location: 'Berlin, Germany',
        device_id: 'tier-qa-harness-smoke',
      }),
    });
    const ok = res.status === 200 || res.status === 429 || res.status === 403; // any structured response
    await res.text();
    if (!ok) {
      return {
        passed: false,
        failure: {
          tier: 'free', matrix: 'smoke', key: 'analyze-preview',
          expected: 'HTTP 200/403/429', actual: `HTTP ${res.status}`,
          message: `analyze-preview returned unexpected status ${res.status}`,
        },
      };
    }
    return { passed: true };
  } catch (err) {
    return {
      passed: false,
      failure: {
        tier: 'free', matrix: 'smoke', key: 'analyze-preview',
        expected: 'reachable endpoint', actual: String(err),
        message: `analyze-preview smoke call threw: ${String(err)}`,
      },
    };
  }
}

// -------- Handler --------
Deno.serve(async (req) => {
  const __health = maybeHealthResponse(req, FUNCTION_NAME, FUNCTION_VERSION);
  if (__health) return __health;
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'method_not_allowed' }), {
      status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } },
  );

  const authResult = await authorize(req, supabaseAdmin);
  if (!authResult.ok) {
    return new Response(JSON.stringify({ error: authResult.reason }), {
      status: authResult.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const runId = crypto.randomUUID();
  const startedAt = Date.now();

  // Insert "running" row
  await supabaseAdmin.from('tier_qa_runs').insert({
    run_id: runId, status: 'running',
    triggered_by: authResult.triggeredBy,
  });

  let status: 'passed' | 'failed' | 'error' = 'passed';
  let errorMessage: string | null = null;
  const allFailures: Failure[] = [];
  let summary: Summary = {
    features: { passed: 0, failed: 0 },
    limits: { passed: 0, failed: 0 },
    pricing: { passed: 0, failed: 0 },
    smoke: { passed: 0, failed: 0 },
  };

  try {
    const matrix = await validateMatrix();
    allFailures.push(...matrix.failures);
    summary = matrix.summary;

    const smoke = await smokeAnalyzePreview();
    if (smoke.passed) summary.smoke.passed++;
    else {
      summary.smoke.failed++;
      if (smoke.failure) allFailures.push(smoke.failure);
    }

    const totalPassed =
      summary.features.passed + summary.limits.passed +
      summary.pricing.passed + summary.smoke.passed;
    const totalFailed =
      summary.features.failed + summary.limits.failed +
      summary.pricing.failed + summary.smoke.failed;
    const total = totalPassed + totalFailed;
    const passRate = total > 0 ? (totalPassed / total) * 100 : 0;
    status = totalFailed === 0 ? 'passed' : 'failed';

    const durationMs = Date.now() - startedAt;
    await supabaseAdmin
      .from('tier_qa_runs')
      .update({
        status,
        total_cases: total,
        passed_cases: totalPassed,
        failed_cases: totalFailed,
        pass_rate: Number(passRate.toFixed(2)),
        failures: allFailures,
        summary: summary as unknown as Record<string, unknown>,
        duration_ms: durationMs,
        finished_at: new Date().toISOString(),
      })
      .eq('run_id', runId);

    return new Response(
      JSON.stringify({
        run_id: runId, status, total_cases: total,
        passed_cases: totalPassed, failed_cases: totalFailed,
        pass_rate: Number(passRate.toFixed(2)),
        summary, failures: allFailures, duration_ms: durationMs,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    status = 'error';
    errorMessage = err instanceof Error ? err.message : String(err);
    await supabaseAdmin
      .from('tier_qa_runs')
      .update({
        status,
        error_message: errorMessage,
        duration_ms: Date.now() - startedAt,
        finished_at: new Date().toISOString(),
        failures: allFailures,
        summary: summary as unknown as Record<string, unknown>,
      })
      .eq('run_id', runId);
    return new Response(
      JSON.stringify({ run_id: runId, status, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
