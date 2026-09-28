/**
 * Break-even display resolver — the one place UI surfaces and document
 * mappers read break-even from a stored analysis.
 *
 * Why this exists (financial reconciliation audit, 2026-09-28):
 *  - `financial_analysis.breakeven.breakeven_months` is written by the
 *    engine as `isProfitable ? min(paybackMonths, 24) : 0`, so `0` is a
 *    sentinel for "never reached", not "reached immediately". Four surfaces
 *    rendered it as "0 mo" for loss-making businesses (107 of 116 reports
 *    in the 90 days before this fix carried the sentinel).
 *  - `breakeven.breakeven_revenue/_units` (legacy) is computed from the
 *    benchmark COGS % with contribution margin floor-guarded at 1%, while
 *    `cvp.breakEven` (formula cvp.contribution_margin_breakeven.v1) uses the
 *    analysis's own price and unit cost with no floor. The two disagreed by
 *    >10% in 66 of 73 reports that carried both, and the result view showed
 *    both. CVP is canonical; legacy is only a fallback for analyses saved
 *    before the CVP block existed.
 */


function num(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

function obj(v: unknown): Record<string, unknown> | undefined {
  return v && typeof v === 'object' ? (v as Record<string, unknown>) : undefined;
}

/** Months to break-even, or null when not reached / unknown. Never 0-as-"never". */
export function breakEvenMonthsForDisplay(analysis: unknown): number | null {
  const fa = obj(analysis);
  const raw = num(obj(fa?.breakeven)?.breakeven_months) ?? num(fa?.break_even_months);
  if (raw === null || raw <= 0) return null;
  return raw;
}

export type CanonicalBreakEven =
  | { status: 'value'; units: number | null; revenue: number; source: 'cvp' | 'legacy' }
  | { status: 'inconsistent'; units: null; revenue: null; source: null }
  | { status: 'not_achievable'; units: null; revenue: null; source: 'cvp' }
  | { status: 'unknown'; units: null; revenue: null; source: null };

/**
 * True when the report's own base scenario does not reconcile:
 * revenue − variable costs − fixed costs ≠ net profit. Happens when a user
 * supplies total monthly costs below the benchmark COGS + fixed-cost line
 * items: profit follows the user's total, while break-even/CVP follow the
 * unscaled benchmark fixed costs (financial-calculator.ts user-cost
 * override). In that case no break-even figure in the report is reliable.
 */
export function costsReconcile(analysis: unknown): boolean {
  const base = obj(obj(obj(analysis)?.scenarios)?.base);
  const rev = num(base?.revenue);
  const vc = num(base?.variable_costs);
  const fc = num(base?.fixed_costs);
  const np = num(base?.net_profit);
  if (rev === null || vc === null || fc === null || np === null) return true; // nothing to contradict
  return Math.abs(rev - vc - fc - np) <= Math.max(0.02 * Math.abs(rev), 50);
}

/** Break-even units/revenue: CVP when present, legacy only for pre-CVP analyses. */
export function canonicalBreakEven(analysis: unknown): CanonicalBreakEven {
  const fa = obj(analysis);
  if (!costsReconcile(fa)) return { status: 'inconsistent', units: null, revenue: null, source: null };
  const cvpBe = obj(obj(fa?.cvp)?.breakEven);
  if (cvpBe) {
    if (cvpBe.status === 'NOT_ACHIEVABLE') return { status: 'not_achievable', units: null, revenue: null, source: 'cvp' };
    const revenue = num(cvpBe.breakEvenRevenue);
    if (cvpBe.status === 'VALUE' && revenue !== null) {
      const units = num(cvpBe.breakEvenUnits);
      return { status: 'value', units: units === null ? null : Math.ceil(units), revenue, source: 'cvp' };
    }
  }
  const legacy = obj(fa?.breakeven);
  const legacyRevenue = num(legacy?.breakeven_revenue);
  if (legacyRevenue !== null && legacyRevenue > 0) {
    return { status: 'value', units: num(legacy?.breakeven_units), revenue: legacyRevenue, source: 'legacy' };
  }
  return { status: 'unknown', units: null, revenue: null, source: null };
}

/** Label for a break-even-months metric card. */
export function breakEvenMonthsLabel(fa: unknown, monthlyProfit: number | null | undefined): string {
  const m = breakEvenMonthsForDisplay(fa);
  if (m !== null) return `${Math.round(m)} mo`;
  if (monthlyProfit != null && monthlyProfit <= 0) return 'Not reached';
  return 'N/A';
}
