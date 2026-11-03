/**
 * Phase D — applies a typed delta to a frozen analysis base input and
 * re-runs the SAME deterministic engine (calculateStrictFinancials) used for
 * the original analysis. Never re-runs industry/location/sub-industry
 * detection (drift risk — see analyses.scenario_base_input's column
 * comment); reads the frozen bundle verbatim.
 *
 * persist:false — compute + return, write nothing (free-tier preview /
 * paid try-before-save). Gated only on scenarioCustom.
 * persist:true — additionally gated on scenarioSave. Creates/reuses a
 * scenarios row, appends the next scenario_versions ledger entry, and
 * inserts an idempotent scenario_runs row keyed on canonical_run_key.
 *
 * Follows queue-export/index.ts's auth/entitlement/ownership pattern.
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { requireFeature, EntitlementError } from '../_shared/entitlements.ts';
import { corsHeadersFor } from '../_shared/cors.ts';
import { createLogger } from '../_shared/logger.ts';
import { getRequestId } from '../_shared/request-id.ts';
import { maybeHealthResponse } from '../_shared/health.ts';
import { sha256Hex, ENGINE_VERSION, FORMULA_REGISTRY_VERSION } from '../_shared/analysis-snapshot.ts';
import { normalizeDelta, applyScenarioDelta, type DeltaChange } from '../_shared/scenario-delta.ts';
import { checkScenarioRunCoherence, type ScenarioRunSummary } from '../_shared/scenario-coherence.ts';
import { calculateStrictFinancials } from '../analyze-business/financial-calculator.ts';
import { shapeFinancialAnalysis } from '../analyze-business/financial-analysis-shape.ts';
import { runReconciliationCheck } from '../analyze-business/reconciliation-check.ts';
import { QMath } from '../analyze-business/quantis-math-server.ts';
import { computeSensitivityRanking } from '../_shared/scenario-sensitivity.ts';
import { withScenarioOverrideFlags, type AssumptionOriginMap } from '../_shared/assumption-origin.ts';

const FUNCTION_NAME = 'run-scenario';
const FUNCTION_VERSION = '1.0.0';

interface RunScenarioRequest {
  scenario_set_id: string;
  scenario_id?: string;
  name?: string;
  starting_case?: string;
  changes: DeltaChange[];
  persist: boolean;
  idempotency_key?: string;
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
  engineVersion: string;
  formulaRegistryVersion: string;
  datasetVersion: string;
  /** Absent on analyses saved before the Living Assumption Register shipped. */
  assumptionOrigins?: AssumptionOriginMap;
}

Deno.serve(async (req) => {
  const __health = maybeHealthResponse(req, FUNCTION_NAME, FUNCTION_VERSION);
  if (__health) return __health;
  const reqId = getRequestId(req);
  const log = createLogger(FUNCTION_NAME, reqId);
  const startedAt = Date.now();

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
      await requireFeature(adminClient, userId, 'scenarioCustom', '/run-scenario');
    } catch (e) {
      if (e instanceof EntitlementError) return e.toResponse(corsHeaders);
      throw e;
    }

    const body: RunScenarioRequest = await req.json();
    const { scenario_set_id, scenario_id, name, starting_case, changes, persist, idempotency_key } = body;

    if (!scenario_set_id || !Array.isArray(changes)) {
      return new Response(
        JSON.stringify({ error: 'scenario_set_id and changes are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    let normalizedChanges: DeltaChange[];
    try {
      normalizedChanges = normalizeDelta(changes);
    } catch (e) {
      return new Response(
        JSON.stringify({ error: e instanceof Error ? e.message : 'Invalid delta', code: 'INVALID_DELTA' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Ownership: scenario_set_id must belong to this user.
    const { data: scenarioSet, error: scenarioSetError } = await supabase
      .from('scenario_sets')
      .select('id, analysis_id, user_id')
      .eq('id', scenario_set_id)
      .eq('user_id', userId)
      .maybeSingle();

    if (scenarioSetError || !scenarioSet) {
      return new Response(
        JSON.stringify({ error: 'Scenario set not found or access denied', code: 'NOT_FOUND' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // If reusing an existing scenario, verify it belongs to this set and isn't locked.
    if (scenario_id) {
      const { data: existingScenario, error: existingScenarioError } = await supabase
        .from('scenarios')
        .select('id, scenario_set_id, locked')
        .eq('id', scenario_id)
        .eq('user_id', userId)
        .maybeSingle();

      if (existingScenarioError || !existingScenario || existingScenario.scenario_set_id !== scenario_set_id) {
        return new Response(
          JSON.stringify({ error: 'Scenario not found or access denied', code: 'NOT_FOUND' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }
      if (existingScenario.locked) {
        return new Response(
          JSON.stringify({ error: 'This scenario is locked and cannot accept new versions', code: 'SCENARIO_LOCKED' }),
          { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }
    }

    // Resolve the frozen base input via the analysis, never via detection re-run.
    const { data: analysis, error: analysisError } = await supabase
      .from('analyses')
      .select('id, scenario_base_input, analysis_correlation_id')
      .eq('id', scenarioSet.analysis_id)
      .eq('user_id', userId)
      .maybeSingle();

    if (analysisError || !analysis || !analysis.scenario_base_input) {
      return new Response(
        JSON.stringify({ error: 'Base analysis input unavailable — re-run the analysis to enable scenarios', code: 'BASE_INPUT_UNAVAILABLE' }),
        { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const baseInput = analysis.scenario_base_input as ScenarioBaseInputBundle;
    const effective = applyScenarioDelta(
      {
        rawMrr: baseInput.rawMrr,
        rawInvestment: baseInput.rawInvestment,
        rawCac: baseInput.rawCac,
        rawAvgCheck: baseInput.rawAvgCheck,
        userProvidedCosts: baseInput.userProvidedCosts,
        userProvidedChurnRate: baseInput.userProvidedChurnRate,
        userProvidedCustomers: baseInput.userProvidedCustomers,
        locationMultipliers: baseInput.locationMultipliers,
      },
      normalizedChanges,
    );

    const calc = calculateStrictFinancials(
      effective.rawMrr,
      effective.rawInvestment,
      effective.rawCac,
      baseInput.rawLtv,
      effective.rawAvgCheck,
      baseInput.benchmarks,
      // deno-lint-ignore no-explicit-any
      effective.locationMultipliers as any,
      baseInput.subIndustry,
      effective.userProvidedCosts,
      effective.userProvidedChurnRate,
      effective.userProvidedCustomers,
    );

    const { financialAnalysis } = shapeFinancialAnalysis(calc, baseInput.benchmarks, log);

    // Sensitivity ranking against the CURRENT effective position (post-delta),
    // so it always answers "from here, what matters most" — cheap, pure,
    // zero LLM/research cost. See _shared/scenario-sensitivity.ts.
    const sensitivity = computeSensitivityRanking(
      { ...effective, rawLtv: baseInput.rawLtv },
      baseInput.benchmarks,
      baseInput.subIndustry,
      'netProfit',
    );

    const cacPaybackMonths = !calc.isProfitable
      ? 999
      : QMath.roundTo(QMath.cacPaybackMonths(calc.cac, calc.averageCheck, (100 - baseInput.benchmarks.cogs_percent) / 100, baseInput.benchmarks.orders_per_client), 1);

    // Cross-scenario coherence: only meaningful once siblings with runs exist.
    let scenarioCoherent = true;
    let candidateVersionNumber = 1;
    if (scenario_id) {
      const { data: siblingVersions } = await supabase
        .from('scenario_versions')
        .select('id, version_number')
        .eq('scenario_id', scenario_id)
        .order('version_number', { ascending: false });
      candidateVersionNumber = (siblingVersions?.[0]?.version_number ?? 0) + 1;

      if (siblingVersions && siblingVersions.length > 0) {
        const { data: siblingRuns } = await supabase
          .from('scenario_runs')
          .select('scenario_version_id, output')
          .in('scenario_version_id', siblingVersions.map((v) => v.id));

        const siblingSummaries: ScenarioRunSummary[] = (siblingRuns ?? [])
          .map((run) => {
            const version = siblingVersions.find((v) => v.id === run.scenario_version_id);
            // deno-lint-ignore no-explicit-any
            const base = (run.output as any)?.financial_analysis?.scenarios?.base;
            if (!version || !base) return null;
            return { versionNumber: version.version_number, revenue: base.revenue, netProfit: base.net_profit };
          })
          .filter((s): s is ScenarioRunSummary => s !== null);

        const candidateSummary: ScenarioRunSummary = {
          versionNumber: candidateVersionNumber,
          revenue: calc.mrr,
          netProfit: calc.netProfit,
        };
        const issues = checkScenarioRunCoherence(candidateSummary, siblingSummaries);
        scenarioCoherent = issues.length === 0;
      }
    }

    const reconciliation = runReconciliationCheck({
      mrr: calc.mrr,
      grossProfit: calc.grossProfit,
      netProfit: calc.netProfit,
      totalExpenses: calc.totalExpenses,
      grossMarginPercent: calc.grossMarginPercent,
      clientsActive: calc.clientsActive,
      ltv: calc.ltv,
      cacPaybackMonths: calc.isProfitable ? cacPaybackMonths : null,
      ltvCacRatio: calc.ltvCacRatio,
      expenses: calc.expenses,
      expenseSource: calc.expenseSource,
      scenarioCoherent,
    });

    const assumptionOrigins = baseInput.assumptionOrigins
      ? withScenarioOverrideFlags(baseInput.assumptionOrigins, normalizedChanges.map((c) => c.assumption_key))
      : null;

    const output = {
      financial_analysis: financialAnalysis,
      metadata: { industry_detected: calc.industryDetected },
      reconciliation,
      sensitivity,
      assumption_origins: assumptionOrigins,
    };

    if (!persist) {
      return new Response(
        JSON.stringify({ persisted: false, output, reconciliation_status: reconciliation.all_passed ? 'passed' : 'failed' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Persisted path requires scenarioSave in addition to scenarioCustom.
    try {
      await requireFeature(adminClient, userId, 'scenarioSave', '/run-scenario');
    } catch (e) {
      if (e instanceof EntitlementError) return e.toResponse(corsHeaders);
      throw e;
    }

    // A real analysis_snapshots row is mandatory for scenario_runs.base_snapshot_id (NOT NULL).
    const { data: latestSnapshot } = await supabase
      .from('analysis_snapshots')
      .select('id, input_hash')
      .eq('correlation_id', analysis.analysis_correlation_id ?? '')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!latestSnapshot) {
      return new Response(
        JSON.stringify({ error: 'No analysis snapshot available to anchor this scenario run to', code: 'SNAPSHOT_UNAVAILABLE' }),
        { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    let resolvedScenarioId = scenario_id;
    if (!resolvedScenarioId) {
      const { data: newScenario, error: newScenarioError } = await supabase
        .from('scenarios')
        .insert({
          scenario_set_id,
          user_id: userId,
          name: name ?? 'Custom Scenario',
          starting_case: starting_case ?? 'custom',
        })
        .select('id')
        .single();

      if (newScenarioError || !newScenario) {
        log.error('Failed to create scenario:', newScenarioError);
        return new Response(
          JSON.stringify({ error: 'Failed to create scenario' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }
      resolvedScenarioId = newScenario.id;
    }

    const delta = {
      schema_version: 1,
      base_snapshot_id: latestSnapshot.id,
      changes: normalizedChanges,
    };

    const engineVersion = baseInput.engineVersion || ENGINE_VERSION;
    const formulaVersion = baseInput.formulaRegistryVersion || FORMULA_REGISTRY_VERSION;
    const datasetVersion = baseInput.datasetVersion || 'unknown';

    const canonicalRunKey = await sha256Hex({
      baseSnapshotHash: latestSnapshot.input_hash,
      normalizedDelta: normalizedChanges,
      engineVersion,
      formulaVersion,
      datasetVersion,
      researchSnapshotId: null,
    });

    // Idempotency: an identical delta against the same base already ran.
    const { data: existingRun } = await supabase
      .from('scenario_runs')
      .select('id, scenario_version_id, output, reconciliation_status')
      .eq('canonical_run_key', canonicalRunKey)
      .maybeSingle();

    if (existingRun) {
      log.info(`Deduplicated scenario run via canonical_run_key for scenario=${resolvedScenarioId}`);
      return new Response(
        JSON.stringify({
          persisted: true,
          deduplicated: true,
          scenario_id: resolvedScenarioId,
          version_id: existingRun.scenario_version_id,
          run_id: existingRun.id,
          output: existingRun.output,
          reconciliation_status: existingRun.reconciliation_status,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const { data: newVersion, error: newVersionError } = await supabase
      .from('scenario_versions')
      .insert({
        scenario_id: resolvedScenarioId,
        user_id: userId,
        version_number: candidateVersionNumber,
        delta,
      })
      .select('id')
      .single();

    if (newVersionError || !newVersion) {
      log.error('Failed to create scenario_version:', newVersionError);
      return new Response(
        JSON.stringify({ error: 'Failed to create scenario version' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const [inputHash, outputHash] = await Promise.all([
      sha256Hex(delta),
      sha256Hex(output),
    ]);

    const { data: newRun, error: newRunError } = await supabase
      .from('scenario_runs')
      .insert({
        scenario_version_id: newVersion.id,
        user_id: userId,
        base_snapshot_id: latestSnapshot.id,
        canonical_run_key: canonicalRunKey,
        normalized_delta: normalizedChanges,
        engine_version: engineVersion,
        formula_version: formulaVersion,
        dataset_version: datasetVersion,
        research_snapshot_id: null,
        input_hash: inputHash,
        output_hash: outputHash,
        output,
        reconciliation_status: reconciliation.all_passed ? 'passed' : 'failed',
        reconciliation_issues: reconciliation.checks.filter((c) => !c.pass),
        latency_ms: Date.now() - startedAt,
      })
      .select('id')
      .single();

    if (newRunError || !newRun) {
      log.error('Failed to create scenario_run:', newRunError);
      return new Response(
        JSON.stringify({ error: 'Failed to create scenario run' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    log.info(`Persisted scenario run=${newRun.id} scenario=${resolvedScenarioId} version=${newVersion.id}`);

    return new Response(
      JSON.stringify({
        persisted: true,
        scenario_id: resolvedScenarioId,
        version_id: newVersion.id,
        run_id: newRun.id,
        output,
        reconciliation_status: reconciliation.all_passed ? 'passed' : 'failed',
      }),
      { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    log.error('run-scenario error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeadersFor(req), 'Content-Type': 'application/json' } },
    );
  }
});
