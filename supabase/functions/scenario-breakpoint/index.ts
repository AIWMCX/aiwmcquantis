/**
 * Finds the "decision breakpoint" for one selected assumption — the % change
 * at which a target metric (default net profit) crosses a target value
 * (default zero). Pure bisection root-finding against the same deterministic
 * engine every analysis and scenario uses (see _shared/scenario-sensitivity.ts).
 *
 * Gated on 'scenarioCustom' only — the GTM playbook explicitly lists "see the
 * decision breakpoint" as part of the free-tier bounded aha moment, before
 * the paywall. Correctness is never paywalled; only persistence/comparison/
 * documents are.
 *
 * Applies any client-supplied `changes` to the frozen base first, so the
 * breakpoint answers "from where the user currently is in the builder," not
 * just the original analysis baseline — matching run-scenario's sensitivity
 * semantics.
 *
 * Follows queue-export/index.ts's auth/entitlement/ownership pattern. No
 * persistence — pure read + compute.
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { requireFeature, EntitlementError } from '../_shared/entitlements.ts';
import { corsHeadersFor } from '../_shared/cors.ts';
import { createLogger } from '../_shared/logger.ts';
import { getRequestId } from '../_shared/request-id.ts';
import { maybeHealthResponse } from '../_shared/health.ts';
import { normalizeDelta, applyScenarioDelta, needsResolvedBase, ScenarioDeltaError, ASSUMPTION_KEYS, type AssumptionKey, type DeltaChange } from '../_shared/scenario-delta.ts';
import { findBreakpoint, resolveScenarioBase, type TargetMetric } from '../_shared/scenario-sensitivity.ts';

const FUNCTION_NAME = 'scenario-breakpoint';
const FUNCTION_VERSION = '1.0.0';

const VALID_TARGET_METRICS: TargetMetric[] = ['netProfit', 'mrr', 'grossProfit', 'ltvCacRatio'];

interface ScenarioBreakpointRequest {
  analysis_id: string;
  assumption_key: AssumptionKey;
  changes?: DeltaChange[];
  target_metric?: TargetMetric;
  target_value?: number;
}

interface ScenarioBaseInputBundle {
  rawMrr: number;
  rawInvestment: number;
  rawCac: number;
  rawLtv: number;
  rawAvgCheck: number;
  // deno-lint-ignore no-explicit-any
  benchmarks: any;
  locationMultipliers: { rent: number; salary: number; utility: number; overall: number };
  // deno-lint-ignore no-explicit-any
  subIndustry: any;
  userProvidedCosts?: number;
  userProvidedChurnRate?: number;
  userProvidedCustomers?: number;
}

Deno.serve(async (req) => {
  const __health = maybeHealthResponse(req, FUNCTION_NAME, FUNCTION_VERSION);
  if (__health) return __health;
  const reqId = getRequestId(req);
  const log = createLogger(FUNCTION_NAME, reqId);

  const corsHeaders = corsHeadersFor(req);
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabase.auth.getUser(token);
    if (claimsError || !claimsData.user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }
    const userId = claimsData.user.id;

    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    try {
      await requireFeature(adminClient, userId, 'scenarioCustom', '/scenario-breakpoint');
    } catch (e) {
      if (e instanceof EntitlementError) return e.toResponse(corsHeaders);
      throw e;
    }

    const body: ScenarioBreakpointRequest = await req.json();
    const { analysis_id, assumption_key, changes, target_metric, target_value } = body;

    if (!analysis_id || !assumption_key) {
      return new Response(
        JSON.stringify({ error: 'analysis_id and assumption_key are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }
    if (!ASSUMPTION_KEYS.includes(assumption_key)) {
      return new Response(
        JSON.stringify({ error: `Unknown assumption_key: ${assumption_key}`, code: 'INVALID_ASSUMPTION_KEY' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }
    const targetMetric = target_metric ?? 'netProfit';
    if (!VALID_TARGET_METRICS.includes(targetMetric)) {
      return new Response(
        JSON.stringify({ error: `Unknown target_metric: ${targetMetric}`, code: 'INVALID_TARGET_METRIC' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    let normalizedChanges: DeltaChange[] = [];
    if (changes && changes.length > 0) {
      try {
        normalizedChanges = normalizeDelta(changes);
      } catch (e) {
        return new Response(
          JSON.stringify({ error: e instanceof Error ? e.message : 'Invalid delta', code: 'INVALID_DELTA' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }
    }

    const { data: analysis, error: analysisError } = await supabase
      .from('analyses')
      .select('id, scenario_base_input')
      .eq('id', analysis_id)
      .eq('user_id', userId)
      .maybeSingle();

    if (analysisError || !analysis || !analysis.scenario_base_input) {
      return new Response(
        JSON.stringify({ error: 'Base analysis input unavailable — re-run the analysis to enable scenarios', code: 'BASE_INPUT_UNAVAILABLE' }),
        { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const baseInput = analysis.scenario_base_input as ScenarioBaseInputBundle;
    const deltaBase = {
      rawMrr: baseInput.rawMrr,
      rawInvestment: baseInput.rawInvestment,
      rawCac: baseInput.rawCac,
      rawAvgCheck: baseInput.rawAvgCheck,
      userProvidedCosts: baseInput.userProvidedCosts,
      userProvidedChurnRate: baseInput.userProvidedChurnRate,
      userProvidedCustomers: baseInput.userProvidedCustomers,
      locationMultipliers: baseInput.locationMultipliers,
    };
    // A % change to an input the user never typed starts from the value the
    // engine used for it, not from 0 (see ResolvedScenarioBase).
    let effective: typeof deltaBase;
    try {
      effective = applyScenarioDelta(
        deltaBase,
        normalizedChanges,
        needsResolvedBase(deltaBase, normalizedChanges)
          ? resolveScenarioBase({ ...deltaBase, rawLtv: baseInput.rawLtv }, baseInput.benchmarks, baseInput.subIndustry)
          : undefined,
      );
    } catch (e) {
      if (e instanceof ScenarioDeltaError) {
        return new Response(
          JSON.stringify({ error: e.message, code: e.code }),
          { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }
      throw e;
    }

    const result = findBreakpoint(
      { ...effective, rawLtv: baseInput.rawLtv },
      baseInput.benchmarks,
      baseInput.subIndustry,
      assumption_key,
      targetMetric,
      target_value ?? 0,
    );

    log.info(`Breakpoint for analysis=${analysis_id} assumption=${assumption_key}: ${result.status}`);

    return new Response(
      JSON.stringify(result),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    log.error('scenario-breakpoint error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeadersFor(req), 'Content-Type': 'application/json' } },
    );
  }
});
