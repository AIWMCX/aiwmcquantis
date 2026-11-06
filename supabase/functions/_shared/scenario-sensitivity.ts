/**
 * Sensitivity ranking + breakpoint solver — real numerical methods against
 * the same calculateStrictFinancials engine every analysis and scenario
 * already uses. No LLM, no research, no new I/O: pure, synchronous,
 * deterministic math, matching the Unified Decision Framework's explicit
 * requirement ("zero LLM/web-search cost for slider recalculation").
 *
 * Sensitivity ranking: central-difference elasticity of a target metric
 * (default netProfit) with respect to each assumption, perturbed ±10%.
 * Ranked by absolute DOLLAR impact, not raw elasticity — elasticity is
 * pctChange(metric)/pctChange(input), which is numerically unstable (or
 * outright meaningless) whenever the base metric is near zero, exactly the
 * case a marginal/underwater business sits in (the real production analysis
 * that exposed the net_profit contradiction bug was one such case: a
 * near-breakeven SaaS). Dollar impact never divides by the metric itself,
 * so it stays meaningful in every case, including unprofitable baselines.
 *
 * Breakpoint solver: bisection root-finding for the % change in one driver
 * at which the target metric crosses a target value (default: net profit
 * crossing zero). Standard, well-understood method — correct whenever the
 * metric is monotonic in the search interval; if it isn't, bisection still
 * finds *a* sign-crossing root, which is disclosed as a limitation, not
 * hidden.
 */
import { applyScenarioDelta, resolvedBaseFromCalc, type AssumptionKey, ASSUMPTION_KEYS, type ResolvedScenarioBase, type ScenarioDeltaTarget } from './scenario-delta.ts';
import { calculateStrictFinancials, type StrictFinancialResult } from '../analyze-business/financial-calculator.ts';

// deno-lint-ignore no-explicit-any
type AnyBenchmarks = any;
// deno-lint-ignore no-explicit-any
type AnySubIndustry = any;

export interface ScenarioComputeInput extends ScenarioDeltaTarget {
  rawLtv: number;
}

export type TargetMetric = 'netProfit' | 'mrr' | 'grossProfit' | 'ltvCacRatio';

function readMetric(calc: StrictFinancialResult, metric: TargetMetric): number {
  switch (metric) {
    case 'netProfit': return calc.netProfit;
    case 'mrr': return calc.mrr;
    case 'grossProfit': return calc.grossProfit;
    case 'ltvCacRatio': return calc.ltvCacRatio;
  }
}

function runCalc(
  base: ScenarioComputeInput,
  benchmarks: AnyBenchmarks,
  subIndustry: AnySubIndustry,
  pctChange: number,
  assumptionKey: AssumptionKey,
  resolved: ResolvedScenarioBase,
): StrictFinancialResult {
  const effective = applyScenarioDelta(base, [{ assumption_key: assumptionKey, operation: 'increase_pct', value: pctChange }], resolved);
  return calculateStrictFinancials(
    effective.rawMrr, effective.rawInvestment, effective.rawCac, base.rawLtv, effective.rawAvgCheck,
    benchmarks, effective.locationMultipliers as AnyBenchmarks, subIndustry,
    effective.userProvidedCosts, effective.userProvidedChurnRate, effective.userProvidedCustomers,
  );
}

/** Runs the frozen base once and returns the values a % delta on an untyped input starts from. */
export function resolveScenarioBase(base: ScenarioComputeInput, benchmarks: AnyBenchmarks, subIndustry: AnySubIndustry): ResolvedScenarioBase {
  return resolvedBaseFromCalc(calculateStrictFinancials(
    base.rawMrr, base.rawInvestment, base.rawCac, base.rawLtv, base.rawAvgCheck,
    benchmarks, base.locationMultipliers as AnyBenchmarks, subIndustry,
    base.userProvidedCosts, base.userProvidedChurnRate, base.userProvidedCustomers,
  ));
}

export interface SensitivityResult {
  assumption_key: AssumptionKey;
  base_metric: number;
  metric_up_10pct: number;
  metric_down_10pct: number;
  /** Average absolute swing in the target metric per 10-point move — the
   *  primary ranking signal. Always defined, never divides by the metric. */
  dollar_impact_per_10pct: number;
  /** pctChange(metric) / pctChange(input), central difference. Null when
   *  base_metric's magnitude is below a safe floor ($10) — elasticity is
   *  not a meaningful number there, not silently reported as a huge one. */
  elasticity: number | null;
}

const ELASTICITY_SAFE_FLOOR = 10;
const SENSITIVITY_PERTURBATION_PCT = 10;

/**
 * Ranks every assumption by its dollar impact on the target metric,
 * descending. One-at-a-time (ceteris paribus) local sensitivity — the
 * standard, defensible technique for "which driver matters most from here."
 */
export function computeSensitivityRanking(
  base: ScenarioComputeInput,
  benchmarks: AnyBenchmarks,
  subIndustry: AnySubIndustry,
  targetMetric: TargetMetric = 'netProfit',
): SensitivityResult[] {
  const baseCalc = calculateStrictFinancials(
    base.rawMrr, base.rawInvestment, base.rawCac, base.rawLtv, base.rawAvgCheck,
    benchmarks, base.locationMultipliers as AnyBenchmarks, subIndustry,
    base.userProvidedCosts, base.userProvidedChurnRate, base.userProvidedCustomers,
  );
  const baseMetric = readMetric(baseCalc, targetMetric);
  const resolved = resolvedBaseFromCalc(baseCalc);

  const results: SensitivityResult[] = ASSUMPTION_KEYS.map((key) => {
    const upCalc = runCalc(base, benchmarks, subIndustry, SENSITIVITY_PERTURBATION_PCT, key, resolved);
    const downCalc = runCalc(base, benchmarks, subIndustry, -SENSITIVITY_PERTURBATION_PCT, key, resolved);
    const metricUp = readMetric(upCalc, targetMetric);
    const metricDown = readMetric(downCalc, targetMetric);

    const dollarImpact = Math.abs(metricUp - metricDown) / 2;
    const elasticity = Math.abs(baseMetric) >= ELASTICITY_SAFE_FLOOR
      ? ((metricUp - metricDown) / 2 / baseMetric) / (SENSITIVITY_PERTURBATION_PCT / 100)
      : null;

    return {
      assumption_key: key,
      base_metric: baseMetric,
      metric_up_10pct: metricUp,
      metric_down_10pct: metricDown,
      dollar_impact_per_10pct: dollarImpact,
      elasticity,
    };
  });

  return results.sort((a, b) => b.dollar_impact_per_10pct - a.dollar_impact_per_10pct);
}

export type BreakpointResult =
  | {
      status: 'FOUND';
      assumption_key: AssumptionKey;
      target_metric: TargetMetric;
      target_value: number;
      /** The increase_pct value (can be negative) at which target_metric crosses target_value. */
      breakpoint_pct: number;
      base_metric: number;
    }
  | {
      status: 'NOT_FOUND_IN_RANGE';
      assumption_key: AssumptionKey;
      target_metric: TargetMetric;
      target_value: number;
      searched_range_pct: [number, number];
      metric_at_low: number;
      metric_at_high: number;
    }
  | {
      status: 'ALREADY_AT_TARGET';
      assumption_key: AssumptionKey;
      target_metric: TargetMetric;
      target_value: number;
      base_metric: number;
    };

const BREAKPOINT_SEARCH_RANGE: [number, number] = [-95, 500];
const BREAKPOINT_TOLERANCE = 0.01; // percentage points
const BREAKPOINT_MAX_ITERATIONS = 60;

/**
 * Bisection search for the increase_pct value on `assumptionKey` at which
 * `targetMetric` crosses `targetValue` (default: net profit crossing zero —
 * "the decision breakpoint"). Free-tier eligible per the GTM playbook:
 * "see the decision breakpoint" is listed as part of the bounded free aha
 * moment, before the paywall — correctness is never paywalled here.
 */
export function findBreakpoint(
  base: ScenarioComputeInput,
  benchmarks: AnyBenchmarks,
  subIndustry: AnySubIndustry,
  assumptionKey: AssumptionKey,
  targetMetric: TargetMetric = 'netProfit',
  targetValue = 0,
): BreakpointResult {
  const resolved = resolveScenarioBase(base, benchmarks, subIndustry);
  const evalAt = (pct: number) => readMetric(runCalc(base, benchmarks, subIndustry, pct, assumptionKey, resolved), targetMetric) - targetValue;

  const baseMetric = evalAt(0) + targetValue;
  if (Math.abs(baseMetric - targetValue) < 1e-9) {
    return { status: 'ALREADY_AT_TARGET', assumption_key: assumptionKey, target_metric: targetMetric, target_value: targetValue, base_metric: baseMetric };
  }

  let [lo, hi] = BREAKPOINT_SEARCH_RANGE;
  let fLo = evalAt(lo);
  let fHi = evalAt(hi);

  if ((fLo > 0 && fHi > 0) || (fLo < 0 && fHi < 0)) {
    return {
      status: 'NOT_FOUND_IN_RANGE',
      assumption_key: assumptionKey,
      target_metric: targetMetric,
      target_value: targetValue,
      searched_range_pct: BREAKPOINT_SEARCH_RANGE,
      metric_at_low: fLo + targetValue,
      metric_at_high: fHi + targetValue,
    };
  }

  for (let i = 0; i < BREAKPOINT_MAX_ITERATIONS && (hi - lo) > BREAKPOINT_TOLERANCE; i++) {
    const mid = (lo + hi) / 2;
    const fMid = evalAt(mid);
    if (fMid === 0) { lo = hi = mid; break; }
    if ((fMid > 0) === (fLo > 0)) {
      lo = mid;
      fLo = fMid;
    } else {
      hi = mid;
      fHi = fMid;
    }
  }

  return {
    status: 'FOUND',
    assumption_key: assumptionKey,
    target_metric: targetMetric,
    target_value: targetValue,
    breakpoint_pct: Math.round(((lo + hi) / 2) * 100) / 100,
    base_metric: baseMetric,
  };
}
