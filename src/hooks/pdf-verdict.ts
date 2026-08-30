/**
 * Pure verdict-derivation logic for the PDF executive report, extracted out
 * of usePdfExport.ts (which imports @react-pdf/renderer and can't
 * practically be rendered in Vitest/jsdom) so it can be exercised with a
 * real function call and a real assertion on its return value, not just a
 * regex match against source text (CodeRabbit catch on PR #88: "these
 * tests scan source files with regular expressions... a source token can
 * remain after the runtime behavior regresses, so the tests can pass while
 * PDF output is incorrect").
 */

export interface ReportVerdict {
  text: string;
  tone: 'success' | 'warning' | 'danger';
}

/**
 * FIX (2026-08-29, Phase 5 5.12 independent re-verification): the two
 * flags below used to be computed inline in usePdfExport.ts as
 * `(rawResult as any)?.used_fallback` and `(rawResult as any)?.report_
 * integrity === 'BLOCK'` -- exactly the un-extracted, only-regex-tested
 * pattern this file's own header comment says was already fixed once
 * (CodeRabbit catch on PR #88). It wasn't fully fixed: `deriveReportVerdict`
 * got extracted and got real tests, but the FLAG DERIVATION feeding it
 * did not, and `used_fallback` derivation was silently broken --
 * confirmed against analyze-business/index.ts, `used_fallback`/
 * `fallback_mode` are set INSIDE the `metadata` object, not at the top
 * level of the response, so `rawResult.used_fallback` was always
 * `undefined` in production. This function is the same kind of pure,
 * directly-testable extraction as deriveReportVerdict above, so the next
 * time this shape changes, a real assertion on real output catches it --
 * not a regex match against source text.
 */
export function deriveDegradedFlags(rawResult: unknown): { isDegraded: boolean; integrityBlocked: boolean } {
  const r = rawResult as { metadata?: { used_fallback?: unknown }; report_integrity?: unknown } | null | undefined;
  return {
    isDegraded: Boolean(r?.metadata?.used_fallback),
    integrityBlocked: r?.report_integrity === 'BLOCK',
  };
}

/**
 * GTM-audit item #2 (2026-08-25): a report that failed its own accounting-
 * integrity check (integrityBlocked) can never present a clean verdict,
 * regardless of confidence/profit/payback -- this is the direct fix for
 * the CashMatch AI incident, whose scenarios were mathematically
 * impossible yet still showed a plain "VIABLE". Every other branch gets a
 * "(DETERMINISTIC ONLY)" qualifier when the AI narrator never ran
 * (isDegraded), so a degraded report is never mistaken for a fully
 * AI-narrated one.
 */
export function deriveReportVerdict(input: {
  confidenceScore: number;
  monthlyProfit: number;
  paybackMonths: number;
  isDegraded: boolean;
  integrityBlocked: boolean;
}): ReportVerdict {
  const { confidenceScore, monthlyProfit, paybackMonths, isDegraded, integrityBlocked } = input;

  if (integrityBlocked) {
    return { text: 'REVIEW REQUIRED', tone: 'danger' };
  }
  const suffix = isDegraded ? ' (DETERMINISTIC ONLY)' : '';
  if (confidenceScore >= 75 && monthlyProfit > 0 && paybackMonths <= 18) {
    return { text: `VIABLE${suffix}`, tone: 'success' };
  }
  if (confidenceScore >= 50 && monthlyProfit > 0) {
    return { text: `NEEDS REFINEMENT${suffix}`, tone: 'warning' };
  }
  return { text: `HIGH RISK${suffix}`, tone: 'danger' };
}
