/**
 * Scenario delta — the typed adjustment applied to a frozen
 * `analyses.scenario_base_input` bundle before re-invoking
 * `calculateStrictFinancials`. Pure, no Deno-only imports (mirrors the
 * convention already used by financial-calculator.ts) so Vitest can import
 * it directly for tests, same as run-scenario/index.ts does at runtime.
 *
 * AssumptionKey maps 1:1 onto OptionalFinancialInputs
 * (src/types/analysis.ts) plus 'rent' — deliberately not a parallel input
 * schema.
 */

export type AssumptionKey =
  | 'monthly_revenue'
  | 'startup_investment'
  | 'cac'
  | 'average_price'
  | 'monthly_costs'
  | 'churn_rate'
  | 'expected_customers'
  | 'rent';

export const ASSUMPTION_KEYS: readonly AssumptionKey[] = [
  'monthly_revenue',
  'startup_investment',
  'cac',
  'average_price',
  'monthly_costs',
  'churn_rate',
  'expected_customers',
  'rent',
];

export type DeltaOperation = 'replace' | 'increase_pct' | 'decrease_pct';

export interface DeltaChange {
  assumption_key: AssumptionKey;
  operation: DeltaOperation;
  value: number;
}

const MAX_PCT_MAGNITUDE = 500;

/**
 * Validates and sorts raw changes. Throws on unknown keys, non-finite
 * values, duplicate keys, or a percentage change beyond ±500% (sanity
 * clamp — mirrors the input-validation conventions in
 * financial-calculator.ts).
 */
export function normalizeDelta(changes: DeltaChange[]): DeltaChange[] {
  const seen = new Set<AssumptionKey>();
  for (const change of changes) {
    if (!ASSUMPTION_KEYS.includes(change.assumption_key)) {
      throw new Error(`Unknown assumption_key: ${change.assumption_key}`);
    }
    if (!Number.isFinite(change.value)) {
      throw new Error(`Non-finite value for assumption_key: ${change.assumption_key}`);
    }
    if (
      (change.operation === 'increase_pct' || change.operation === 'decrease_pct') &&
      Math.abs(change.value) > MAX_PCT_MAGNITUDE
    ) {
      throw new Error(`Percentage change for ${change.assumption_key} exceeds ±${MAX_PCT_MAGNITUDE}%`);
    }
    if (seen.has(change.assumption_key)) {
      throw new Error(`Duplicate assumption_key in delta: ${change.assumption_key}`);
    }
    seen.add(change.assumption_key);
  }
  return [...changes].sort((a, b) => a.assumption_key.localeCompare(b.assumption_key));
}

/**
 * The values the engine actually used for inputs the user may not have typed.
 * A percentage change to an untyped input starts from these; before 2026-11-05 it
 * started from 0, so "+10% costs" on an analysis without typed costs ran with
 * total costs of $0, and the sensitivity ranking scored costs and churn as having
 * no impact.
 */
export interface ResolvedScenarioBase {
  monthlyCosts: number;
  churnRatePercent: number;
  customers: number;
}

export type ScenarioDeltaErrorCode = 'BASE_VALUE_UNKNOWN' | 'RENT_REPLACE_UNSUPPORTED';

export class ScenarioDeltaError extends Error {
  constructor(readonly code: ScenarioDeltaErrorCode, message: string) {
    super(message);
    this.name = 'ScenarioDeltaError';
  }
}

/** Picks the resolved values out of a calculateStrictFinancials result. */
export function resolvedBaseFromCalc(calc: { totalExpenses: number; churnRatePercentUsed: number; clientsActive: number }): ResolvedScenarioBase {
  return { monthlyCosts: calc.totalExpenses, churnRatePercent: calc.churnRatePercentUsed, customers: calc.clientsActive };
}

/** True when some change needs ResolvedScenarioBase (a % change to an input the user never typed). */
export function needsResolvedBase(base: ScenarioDeltaTarget, changes: DeltaChange[]): boolean {
  return changes.some((c) => c.operation !== 'replace' && (
    (c.assumption_key === 'monthly_costs' && base.userProvidedCosts === undefined)
    || (c.assumption_key === 'churn_rate' && base.userProvidedChurnRate === undefined)
    || (c.assumption_key === 'expected_customers' && base.userProvidedCustomers === undefined)
  ));
}

function resolveOptional(typed: number | undefined, resolved: number | undefined, change: DeltaChange): number {
  if (change.operation === 'replace') return change.value;
  const start = typed ?? resolved;
  if (start === undefined) {
    throw new ScenarioDeltaError(
      'BASE_VALUE_UNKNOWN',
      `Cannot apply ${change.operation} to ${change.assumption_key}: the base value the engine used is unknown`,
    );
  }
  return resolveValue(start, change.operation, change.value);
}

function resolveValue(base: number, operation: DeltaOperation, value: number): number {
  switch (operation) {
    case 'replace':
      return value;
    case 'increase_pct':
      return base * (1 + value / 100);
    case 'decrease_pct':
      return base * (1 - value / 100);
    default:
      throw new Error(`Unknown operation: ${operation}`);
  }
}

/** The subset of a frozen scenario_base_input bundle the delta can touch. */
export interface ScenarioDeltaTarget {
  rawMrr: number;
  rawInvestment: number;
  rawCac: number;
  rawAvgCheck: number;
  userProvidedCosts?: number;
  userProvidedChurnRate?: number;
  userProvidedCustomers?: number;
  locationMultipliers: { rent: number; [key: string]: unknown };
}

/**
 * Applies a normalized delta to a copy of the base input. `rawLtv` is
 * intentionally never adjusted — it isn't in the AssumptionKey catalog, so
 * it always carries through unchanged from the frozen base.
 */
export function applyScenarioDelta<T extends ScenarioDeltaTarget>(base: T, changes: DeltaChange[], resolved?: ResolvedScenarioBase): T {
  const effective: T = { ...base, locationMultipliers: { ...base.locationMultipliers } };

  for (const change of changes) {
    switch (change.assumption_key) {
      case 'monthly_revenue':
        effective.rawMrr = resolveValue(effective.rawMrr, change.operation, change.value);
        break;
      case 'startup_investment':
        effective.rawInvestment = resolveValue(effective.rawInvestment, change.operation, change.value);
        break;
      case 'cac':
        effective.rawCac = resolveValue(effective.rawCac, change.operation, change.value);
        break;
      case 'average_price':
        effective.rawAvgCheck = resolveValue(effective.rawAvgCheck, change.operation, change.value);
        break;
      case 'monthly_costs':
        effective.userProvidedCosts = resolveOptional(effective.userProvidedCosts, resolved?.monthlyCosts, change);
        break;
      case 'churn_rate':
        effective.userProvidedChurnRate = resolveOptional(effective.userProvidedChurnRate, resolved?.churnRatePercent, change);
        break;
      case 'expected_customers':
        effective.userProvidedCustomers = resolveOptional(effective.userProvidedCustomers, resolved?.customers, change);
        break;
      case 'rent':
        // `rent` is a location multiplier on the benchmark rent, not dollars, so
        // "replace rent = 3000" would mean x3000. Only % changes are meaningful.
        if (change.operation === 'replace') {
          throw new ScenarioDeltaError('RENT_REPLACE_UNSUPPORTED', 'rent can only be changed by a percentage (it scales the benchmark rent)');
        }
        effective.locationMultipliers.rent = resolveValue(effective.locationMultipliers.rent, change.operation, change.value);
        break;
    }
  }

  return effective;
}
