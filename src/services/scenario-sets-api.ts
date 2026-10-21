/**
 * Phase D — thin client wrapper around the three scenario edge functions.
 * Deliberately distinct name from src/services/scenario-engine.ts, which is
 * an unrelated, non-persisted client-side Monte-Carlo stress-test widget —
 * do not merge or confuse the two.
 */
import { supabase } from '@/integrations/supabase/client';

export type ScenarioAssumptionKey =
  | 'monthly_revenue'
  | 'startup_investment'
  | 'cac'
  | 'average_price'
  | 'monthly_costs'
  | 'churn_rate'
  | 'expected_customers'
  | 'rent';

export type ScenarioDeltaOperation = 'replace' | 'increase_pct' | 'decrease_pct';

export interface ScenarioDeltaChange {
  assumption_key: ScenarioAssumptionKey;
  operation: ScenarioDeltaOperation;
  value: number;
}

export type ScenarioTargetMetric = 'netProfit' | 'mrr' | 'grossProfit' | 'ltvCacRatio';

export interface ScenarioSensitivityResult {
  assumption_key: ScenarioAssumptionKey;
  base_metric: number;
  metric_up_10pct: number;
  metric_down_10pct: number;
  dollar_impact_per_10pct: number;
  elasticity: number | null;
}

export type ScenarioBreakpointResult =
  | {
      status: 'FOUND';
      assumption_key: ScenarioAssumptionKey;
      target_metric: ScenarioTargetMetric;
      target_value: number;
      breakpoint_pct: number;
      base_metric: number;
    }
  | {
      status: 'NOT_FOUND_IN_RANGE';
      assumption_key: ScenarioAssumptionKey;
      target_metric: ScenarioTargetMetric;
      target_value: number;
      searched_range_pct: [number, number];
      metric_at_low: number;
      metric_at_high: number;
    }
  | {
      status: 'ALREADY_AT_TARGET';
      assumption_key: ScenarioAssumptionKey;
      target_metric: ScenarioTargetMetric;
      target_value: number;
      base_metric: number;
    };

export type AssumptionOriginClass =
  | 'USER_ACTUAL'
  | 'DERIVED'
  | 'MODELED_BENCHMARK_PRIOR'
  | 'SYSTEM_ASSUMPTION'
  | 'PLACEHOLDER';

export interface AssumptionOrigin {
  origin: AssumptionOriginClass;
  evidence_range: [number, number] | null;
  confidence: number;
  label: string;
  overridden_in_scenario?: boolean;
}

export type AssumptionOriginMap = Record<ScenarioAssumptionKey, AssumptionOrigin>;

export interface ScenarioRunOutput {
  // deno-lint-ignore no-explicit-any
  financial_analysis: Record<string, any>;
  metadata: { industry_detected: string };
  reconciliation: {
    checks: Array<{ rule: string; label: string; pass: boolean; skipped?: boolean; note?: string }>;
    all_passed: boolean;
    passed_count: number;
    failed_count: number;
    skipped_count: number;
    engine_version: string;
  };
  sensitivity: ScenarioSensitivityResult[];
  /** Null for analyses saved before the Living Assumption Register shipped (re-run to enable). */
  assumption_origins: AssumptionOriginMap | null;
}

export interface RunScenarioResult {
  persisted: boolean;
  deduplicated?: boolean;
  scenario_id?: string;
  version_id?: string;
  run_id?: string;
  output: ScenarioRunOutput;
  reconciliation_status: 'passed' | 'failed' | 'unknown';
}

export interface ScenarioRunRefPayload {
  scenarioRunId: string;
  analysisId: string;
  outputHash: string;
  engineVersion: string;
  formulaVersion: string;
  output: ScenarioRunOutput;
}

/** Thrown for any entitlement-denied (402) response, so callers can show an upsell. */
export class ScenarioEntitlementError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly feature?: string,
  ) {
    super(message);
    this.name = 'ScenarioEntitlementError';
  }
}

async function invokeScenarioFn<T>(fn: string, body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke(fn, { body });
  if (error) {
    // supabase-js surfaces non-2xx as a generic FunctionsHttpError; the real
    // status/body live on error.context (a Response) for 402s.
    // deno-lint-ignore no-explicit-any
    const context = (error as any)?.context;
    if (context?.status === 402) {
      const payload = await context.json().catch(() => null);
      throw new ScenarioEntitlementError(
        payload?.message ?? 'This feature requires an upgrade.',
        payload?.code ?? 'FEATURE_LOCKED',
        payload?.feature,
      );
    }
    throw new Error(error.message || `${fn} failed`);
  }
  return data as T;
}

export function createScenarioSet(analysisId: string, name?: string) {
  return invokeScenarioFn<{ scenario_set_id: string; used: number; limit: number }>(
    'create-scenario-set',
    { analysis_id: analysisId, name },
  );
}

export function runScenario(params: {
  scenarioSetId: string;
  scenarioId?: string;
  name?: string;
  startingCase?: string;
  changes: ScenarioDeltaChange[];
  persist: boolean;
}) {
  return invokeScenarioFn<RunScenarioResult>('run-scenario', {
    scenario_set_id: params.scenarioSetId,
    scenario_id: params.scenarioId,
    name: params.name,
    starting_case: params.startingCase,
    changes: params.changes,
    persist: params.persist,
  });
}

/**
 * Finds the % change on one assumption at which a target metric crosses a
 * target value (default: net profit crossing zero). Free-tier eligible —
 * gated on 'scenarioCustom' only, same as the live preview run. Applies any
 * client-supplied `changes` first so the breakpoint reflects the user's
 * current builder state, not just the original analysis baseline.
 */
export function findScenarioBreakpoint(params: {
  analysisId: string;
  assumptionKey: ScenarioAssumptionKey;
  changes?: ScenarioDeltaChange[];
  targetMetric?: ScenarioTargetMetric;
  targetValue?: number;
}) {
  return invokeScenarioFn<ScenarioBreakpointResult>('scenario-breakpoint', {
    analysis_id: params.analysisId,
    assumption_key: params.assumptionKey,
    changes: params.changes,
    target_metric: params.targetMetric,
    target_value: params.targetValue,
  });
}

export function promoteScenario(scenarioRunId: string) {
  return invokeScenarioFn<ScenarioRunRefPayload>('promote-scenario', { scenario_run_id: scenarioRunId });
}

export interface PromoteToAnalysisResult {
  analysis_id: string;
  parent_analysis_id: string;
  origin_scenario_run_id: string;
}

/**
 * Promotes a saved scenario run into a NEW analysis (Analysis v2) — spec
 * AIWMC_Quantis_Scenario_Evidence_System_Spec.md §9. The original analysis
 * is never touched; the new one carries parent_analysis_id/
 * origin_scenario_run_id lineage. Distinct from promoteScenario(), which
 * only hands back data for a Docs Studio document — this creates a real
 * baseline the user can keep working from.
 */
export function promoteScenarioToAnalysis(scenarioRunId: string) {
  return invokeScenarioFn<PromoteToAnalysisResult>('promote-scenario-to-analysis', { scenario_run_id: scenarioRunId });
}
