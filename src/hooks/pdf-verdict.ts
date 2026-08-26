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
