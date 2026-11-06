/**
 * Phase D step 7 (spec AIWMC_Quantis_Scenario_Evidence_System_Spec.md §9):
 * promotes a saved scenario run into a NEW analysis row (Analysis v2).
 *
 * Rules enforced here, verbatim from the spec's §4.3 relationship rules:
 *   - Scenario edits never mutate Analysis v1 — this function issues zero
 *     UPDATE statements against the original analyses row.
 *   - "Promote to baseline" creates Analysis v2 with lineage
 *     (parent_analysis_id, origin_scenario_run_id) to the scenario run.
 *   - The new analysis gets its own analysis_snapshots row and its own
 *     scenario_base_input (recomputed via the same applyScenarioDelta used
 *     by run-scenario), so it can itself be further scenario-modeled.
 *
 * Follows queue-export/index.ts's auth/entitlement/ownership pattern.
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { requireFeature, EntitlementError } from '../_shared/entitlements.ts';
import { corsHeadersFor } from '../_shared/cors.ts';
import { createLogger } from '../_shared/logger.ts';
import { getRequestId } from '../_shared/request-id.ts';
import { maybeHealthResponse } from '../_shared/health.ts';
import { applyScenarioDelta, needsResolvedBase, ScenarioDeltaError, type DeltaChange } from '../_shared/scenario-delta.ts';
import { resolveScenarioBase } from '../_shared/scenario-sensitivity.ts';
import {
  mergeScenarioIntoAnalysisResult,
  getMonthlyProfitMirror,
  getPaybackMonthsMirror,
} from '../_shared/scenario-analysis-promotion.ts';

const FUNCTION_NAME = 'promote-scenario-to-analysis';
const FUNCTION_VERSION = '1.0.0';

interface PromoteToAnalysisRequest {
  scenario_run_id: string;
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
      await requireFeature(adminClient, userId, 'scenarioPromote', '/promote-scenario-to-analysis');
    } catch (e) {
      if (e instanceof EntitlementError) return e.toResponse(corsHeaders);
      throw e;
    }

    const body: PromoteToAnalysisRequest = await req.json();
    const { scenario_run_id } = body;
    if (!scenario_run_id) {
      return new Response(
        JSON.stringify({ error: 'scenario_run_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Ownership + full lineage chain: run -> version -> scenario -> set -> analysis.
    const { data: run, error: runError } = await supabase
      .from('scenario_runs')
      .select('id, scenario_version_id, user_id, normalized_delta, output, output_hash, input_hash, engine_version, formula_version, dataset_version, reconciliation_status, reconciliation_issues')
      .eq('id', scenario_run_id)
      .eq('user_id', userId)
      .maybeSingle();

    if (runError || !run) {
      return new Response(
        JSON.stringify({ error: 'Scenario run not found or access denied', code: 'NOT_FOUND' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const { data: version, error: versionError } = await supabase
      .from('scenario_versions')
      .select('scenario_id')
      .eq('id', run.scenario_version_id)
      .eq('user_id', userId)
      .maybeSingle();
    if (versionError || !version) {
      return new Response(
        JSON.stringify({ error: 'Scenario version not found', code: 'NOT_FOUND' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const { data: scenario, error: scenarioError } = await supabase
      .from('scenarios')
      .select('scenario_set_id, name')
      .eq('id', version.scenario_id)
      .eq('user_id', userId)
      .maybeSingle();
    if (scenarioError || !scenario) {
      return new Response(
        JSON.stringify({ error: 'Scenario not found', code: 'NOT_FOUND' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const { data: scenarioSet, error: scenarioSetError } = await supabase
      .from('scenario_sets')
      .select('analysis_id')
      .eq('id', scenario.scenario_set_id)
      .eq('user_id', userId)
      .maybeSingle();
    if (scenarioSetError || !scenarioSet) {
      return new Response(
        JSON.stringify({ error: 'Scenario set not found', code: 'NOT_FOUND' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const { data: originalAnalysis, error: analysisError } = await supabase
      .from('analyses')
      .select('id, user_id, idea, location, result, depth, confidence_score, scenario_base_input')
      .eq('id', scenarioSet.analysis_id)
      .eq('user_id', userId)
      .maybeSingle();
    if (analysisError || !originalAnalysis) {
      return new Response(
        JSON.stringify({ error: 'Original analysis not found', code: 'NOT_FOUND' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }
    if (!originalAnalysis.scenario_base_input) {
      return new Response(
        JSON.stringify({ error: 'Original analysis has no scenario base input', code: 'BASE_INPUT_UNAVAILABLE' }),
        { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // deno-lint-ignore no-explicit-any
    const scenarioOutput = run.output as any;
    const mergedResult = mergeScenarioIntoAnalysisResult(
      originalAnalysis.result as Record<string, unknown>,
      scenarioOutput.financial_analysis,
    );

    // Recompute this scenario's exact effective base input from the ORIGINAL
    // frozen bundle + the same normalized_delta run-scenario applied — so the
    // new analysis stays scenario-modelable without re-deriving detection.
    // deno-lint-ignore no-explicit-any
    const originalBase = originalAnalysis.scenario_base_input as any;
    const promotedChanges = run.normalized_delta as DeltaChange[];
    let newBaseInput: Record<string, unknown>;
    try {
      newBaseInput = applyScenarioDelta(
        originalBase,
        promotedChanges,
        needsResolvedBase(originalBase, promotedChanges)
          ? resolveScenarioBase(originalBase, originalBase.benchmarks, originalBase.subIndustry)
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

    const newCorrelationId = crypto.randomUUID();

    const { data: newAnalysis, error: newAnalysisError } = await supabase
      .from('analyses')
      .insert({
        user_id: userId,
        idea: `${originalAnalysis.idea} — Scenario: ${scenario.name}`,
        location: originalAnalysis.location,
        result: mergedResult,
        confidence_score: originalAnalysis.confidence_score,
        startup_investment: mergedResult.financial_analysis?.startup_investment?.total ?? null,
        monthly_profit: getMonthlyProfitMirror(mergedResult.financial_analysis),
        payback_months: getPaybackMonthsMirror(mergedResult.financial_analysis),
        depth: originalAnalysis.depth,
        analysis_correlation_id: newCorrelationId,
        scenario_base_input: newBaseInput,
        parent_analysis_id: originalAnalysis.id,
        origin_scenario_run_id: run.id,
      })
      .select('id')
      .single();

    if (newAnalysisError || !newAnalysis) {
      log.error('Failed to create promoted analysis:', newAnalysisError);
      return new Response(
        JSON.stringify({ error: 'Failed to create promoted analysis' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const fallbackPayback = {
      status: 'NOT_APPLICABLE' as const,
      months: null,
      horizonMonths: 0,
      formulaId: 'investment_payback.cumulative_fcf.v1',
      reasonCode: 'SCENARIO_PROMOTION_NO_TYPED_RESULT',
    };

    await adminClient.from('analysis_snapshots').insert({
      correlation_id: newCorrelationId,
      analysis_id: newAnalysis.id,
      user_id: userId,
      engine_version: run.engine_version,
      formula_registry_version: run.formula_version,
      dataset_version: run.dataset_version,
      input_hash: run.input_hash,
      numeric_output_hash: run.output_hash,
      investment_payback: mergedResult.financial_analysis?.returns?.investment_payback_result ?? fallbackPayback,
      validation_status: run.reconciliation_status === 'passed' ? 'PASS' : 'WARN',
      validation_issues: run.reconciliation_issues ?? [],
    }).then(({ error }) => {
      if (error) log.warn(`Snapshot insert for promoted analysis failed (non-fatal): ${error.message}`);
    });

    log.info(`Promoted scenario_run=${run.id} -> new analysis=${newAnalysis.id}, parent=${originalAnalysis.id}`);

    return new Response(
      JSON.stringify({
        analysis_id: newAnalysis.id,
        parent_analysis_id: originalAnalysis.id,
        origin_scenario_run_id: run.id,
      }),
      { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    log.error('promote-scenario-to-analysis error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeadersFor(req), 'Content-Type': 'application/json' } },
    );
  }
});
