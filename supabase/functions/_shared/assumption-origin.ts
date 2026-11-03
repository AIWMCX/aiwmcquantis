/**
 * Living Assumption Register — classifies, for each scenario AssumptionKey,
 * where its value actually came from at analysis time: the user, an AI
 * extraction pass, or a benchmark/location prior. This is the #1-ranked gap
 * in the Multiplier System backlog ("Living Assumption Register", priority
 * 93) — the scenario builder showed raw numbers with no indication of which
 * ones were facts versus modeled priors.
 *
 * Must be called at analyze-business time, not later. By the time a value
 * reaches `scenario_base_input`, the `userInputs?.x || fa.x || benchmark`
 * chain in transformResponse() has already collapsed to one number — the
 * information about *which branch fired* only exists at the call site. This
 * module mirrors that exact chain (see analyze-business/index.ts lines
 * ~1677-1689) so the origin classification can never drift from the real
 * value-resolution logic.
 *
 * Deliberately does not invent evidence: `evidence_range` is null unless a
 * real benchmark min/max exists for that assumption (no benchmark range
 * exists for churn or itemized costs today, so those stay null rather than
 * being backfilled with an invented range).
 */
import type { AssumptionKey } from './scenario-delta.ts';

export type AssumptionOriginClass =
  | 'USER_ACTUAL'
  | 'DERIVED'
  | 'MODELED_BENCHMARK_PRIOR'
  | 'SYSTEM_ASSUMPTION'
  | 'PLACEHOLDER';

export interface AssumptionOrigin {
  origin: AssumptionOriginClass;
  /** [low, high] only when a real benchmark range backs this assumption. */
  evidence_range: [number, number] | null;
  /** 0-100. Not a probability of correctness — a source-quality signal. */
  confidence: number;
  label: string;
  /** True when the current scenario run's delta touches this key — set by
   *  withScenarioOverrideFlags(), not by classifyAssumptionOrigins(). */
  overridden_in_scenario?: boolean;
}

export type AssumptionOriginMap = Record<AssumptionKey, AssumptionOrigin>;

/**
 * Marks which assumptions the current scenario delta actually changes. The
 * base origin/evidence/confidence from analysis time is preserved — a
 * scenario override doesn't retroactively make the original value more or
 * less evidenced, it just means "you're no longer looking at this one."
 */
export function withScenarioOverrideFlags(
  origins: AssumptionOriginMap,
  changedKeys: readonly AssumptionKey[],
): AssumptionOriginMap {
  const changed = new Set(changedKeys);
  const result = {} as AssumptionOriginMap;
  for (const key of Object.keys(origins) as AssumptionKey[]) {
    result[key] = { ...origins[key], overridden_in_scenario: changed.has(key) };
  }
  return result;
}

const LABELS: Record<AssumptionOriginClass, string> = {
  USER_ACTUAL: 'Your input',
  DERIVED: 'AI-extracted from your description',
  MODELED_BENCHMARK_PRIOR: 'Industry benchmark prior',
  SYSTEM_ASSUMPTION: 'System-derived from your other inputs',
  PLACEHOLDER: 'Default placeholder (no evidence)',
};

function entry(origin: AssumptionOriginClass, confidence: number, evidence_range: [number, number] | null = null): AssumptionOrigin {
  return { origin, evidence_range, confidence: Math.round(Math.min(100, Math.max(0, confidence))), label: LABELS[origin] };
}

export interface ClassifyAssumptionOriginsInput {
  userInputs?: {
    monthly_revenue?: number;
    startup_investment?: number;
    cac?: number;
    average_price?: number;
    monthly_costs?: number;
    churn_rate?: number;
    expected_customers?: number;
  };
  // deno-lint-ignore no-explicit-any
  fa: Record<string, any>;
  // deno-lint-ignore no-explicit-any
  mp: Record<string, any>;
  benchmarks: {
    cac_typical: number;
    cac_min: number;
    cac_max: number;
    average_check_min: number;
    average_check_max: number;
  };
  locationMultipliers: { confidence?: number };
  subIndustry: { confidence?: number } | null;
  /**
   * Who wrote `fa`'s numbers. 'narrator' (default): the AI estimated them
   * from the description. 'industry_default': the deterministic fallback
   * built them from the benchmark, so they are a benchmark prior, not an AI
   * extraction (2026-11-03; they were labelled AI-extracted before).
   */
  estimateSource?: 'narrator' | 'industry_default';
}

/**
 * Mirrors transformResponse()'s value-resolution chain exactly:
 *   rawMrr        = userInputs?.monthly_revenue || fa.mrr || 50000
 *   rawInvestment = userInputs?.startup_investment || fa.startup_investment || 100000
 *   rawCac        = userInputs?.cac ?? benchmarks.cac_typical  (never the AI's estimate)
 *   rawAvgCheck   = userInputs?.average_price || fa.average_check || benchmark midpoint
 */
export function classifyAssumptionOrigins(input: ClassifyAssumptionOriginsInput): AssumptionOriginMap {
  const { userInputs, fa, mp, benchmarks, locationMultipliers, subIndustry } = input;
  const benchmarkConfidence = locationMultipliers.confidence ?? subIndustry?.confidence ?? 50;
  const extractionConfidence = subIndustry?.confidence ?? 60;
  const fromBenchmark = input.estimateSource === 'industry_default';
  // An `fa` value is an AI extraction, unless the benchmark fallback wrote it.
  const estimated = (range: [number, number] | null = null) =>
    fromBenchmark
      ? entry('MODELED_BENCHMARK_PRIOR', benchmarkConfidence, range)
      : entry('DERIVED', extractionConfidence, range);

  return {
    monthly_revenue: userInputs?.monthly_revenue
      ? entry('USER_ACTUAL', 100)
      : fa.mrr
        ? estimated()
        : entry('PLACEHOLDER', 15),

    startup_investment: userInputs?.startup_investment
      ? entry('USER_ACTUAL', 100)
      : fa.startup_investment
        ? estimated()
        : entry('PLACEHOLDER', 15),

    cac: typeof userInputs?.cac === 'number'
      ? entry('USER_ACTUAL', 100)
      : entry('MODELED_BENCHMARK_PRIOR', benchmarkConfidence, [benchmarks.cac_min, benchmarks.cac_max]),

    average_price: userInputs?.average_price
      ? entry('USER_ACTUAL', 100)
      : fa.average_check
        ? estimated([benchmarks.average_check_min, benchmarks.average_check_max])
        : entry('MODELED_BENCHMARK_PRIOR', benchmarkConfidence, [benchmarks.average_check_min, benchmarks.average_check_max]),

    monthly_costs: typeof userInputs?.monthly_costs === 'number'
      ? entry('USER_ACTUAL', 100)
      : entry('SYSTEM_ASSUMPTION', 50),

    churn_rate: typeof userInputs?.churn_rate === 'number'
      ? entry('USER_ACTUAL', 100)
      : entry('MODELED_BENCHMARK_PRIOR', 40),

    expected_customers: typeof userInputs?.expected_customers === 'number'
      ? entry('USER_ACTUAL', 100)
      : entry('DERIVED', 50),

    rent: entry('MODELED_BENCHMARK_PRIOR', benchmarkConfidence),
  };
}
