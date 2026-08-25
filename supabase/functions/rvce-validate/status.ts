/**
 * Pure RVCE status/formatting helpers, extracted out of index.ts so they
 * have zero Deno-specific imports and can be exercised with Vitest (this
 * directory has no Deno test harness wired into CI -- see the note in
 * ../analyze-business/investment-verdict.test.ts for the same situation).
 */

/**
 * Rounds a value to the SAME precision fmtMetricValue() displays it at
 * (whole dollars for $, 1dp for %/months, 2dp for ratio). CodeRabbit catch
 * on PR #86: the first rounding-boundary fix rounded p25/p75 to a fixed 2dp
 * for classification, but fmtMetricValue() displays currency as whole
 * dollars and percent/months to 1dp -- so a dollar value could still
 * classify as outside the range while displaying identically to its bound
 * (e.g. $200.49 classifies > a $200.49 p75, but both show as "$200").
 * Rounding to the FORMATTER's own precision before classification closes
 * that gap for every unit, not just the specific case already fixed.
 */
function roundToDisplayPrecision(metric: string, value: number): number {
  if (metric.includes('pct')) return Math.round(value * 10) / 10;
  if (metric.includes('ratio')) return Math.round(value * 100) / 100;
  if (metric.includes('months')) return Math.round(value * 10) / 10;
  return Math.round(value);
}

/**
 * The single source of truth for OK/WARN/OUTLIER, used by both the
 * web-search path (validateMetric) and the internal-benchmark-fallback path
 * (internalBenchmarkFallback) in index.ts so this decision can never drift
 * between them again the way it did before the 2026-08-25 fix.
 *
 * P0 (2026-08-25 RVCE audit): status was previously decided PURELY by a
 * sigma-based `discrepancy` measure, entirely independent of the p25/p75
 * band actually displayed to the user. Because the effective standard
 * deviation used to compute that sigma can be wider than the p25-p75
 * interval (e.g. a skewed source distribution), a value could sit
 * numerically OUTSIDE the displayed range and still register
 * |discrepancy| < 1.0 -> status 'OK' -> a green "Validated" badge. A real
 * production report showed exactly this: Customer LTV $391 above a
 * displayed P75 of $200, and Rent $156 below a displayed P25 of $235, both
 * marked "Validated".
 *
 * 'OK' now requires the value to sit within [p25, p75] -- full stop. The
 * sigma-based `discrepancy` is used ONLY to grade severity once a value is
 * already known to be outside that range (WARN vs OUTLIER), never to
 * overrule range membership itself. `metric` is required so classification
 * always happens at the SAME precision the value is displayed at (see
 * roundToDisplayPrecision), not an arbitrary fixed precision that can
 * itself drift from what index.ts's payload/notes format.
 */
export function computeRvceStatus(
  metric: string,
  value: number,
  p25: number,
  p75: number,
  discrepancy: number,
): 'OK' | 'WARN' | 'OUTLIER' {
  const v = roundToDisplayPrecision(metric, value);
  const lo = roundToDisplayPrecision(metric, p25);
  const hi = roundToDisplayPrecision(metric, p75);
  if (v >= lo && v <= hi) return 'OK';
  return Math.abs(discrepancy) < 2.0 ? 'WARN' : 'OUTLIER';
}

/**
 * Unit-aware value formatting for server-built notes/messages strings.
 * P0 (2026-08-25 RVCE audit): every notes/message string in index.ts
 * previously hardcoded a literal `$` prefix regardless of the metric's real
 * unit, so a percentage metric like gross_margin_pct produced text like
 * "median ($71)" for a 71% value -- a real production report showed exactly
 * this ("Gross-margin warning formats a percentage median as $71"). Mirrors
 * the client-side `fmt()`/`fmtMetric()` dispatch in ValidationSection.tsx /
 * ValidationStatusBadge.tsx so server text and UI text never disagree about
 * units for the same metric. Uses the SAME precision as
 * roundToDisplayPrecision() so formatted text and classification can never
 * disagree about what a value "rounds to".
 */
export function fmtMetricValue(metric: string, value: number): string {
  if (!Number.isFinite(value)) return '—';
  if (metric.includes('pct')) return `${value.toFixed(1)}%`;
  if (metric.includes('ratio')) return `${value.toFixed(2)}x`;
  if (metric.includes('months')) return `${value.toFixed(1)} mo`;
  return `$${Math.round(value).toLocaleString()}`;
}
