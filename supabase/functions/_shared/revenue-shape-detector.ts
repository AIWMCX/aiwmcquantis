/**
 * Revenue Shape Detector -- narrow, high-precision fail-closed check
 *
 * The financial engine assumes a steady monthly-transaction revenue shape:
 * every business is funneled through one `mrr` (monthly revenue) variable
 * derived either from recurring-membership or `avg_check * customers`.
 * That fits SaaS subscriptions, cafes, retail, most services -- but does
 * NOT fit contingency-fee, project-based, or lumpy-transaction shapes,
 * because the timing and unit of revenue is fundamentally different.
 *
 * Confirmed live 2026-07-20 in the account's own historical test analyses:
 * business ideas of the form "SaaS + 25% contingency fee on recovered funds"
 * and "% of recovered revenue" were computed through the MRR-shaped engine
 * and produced polished, confident-looking reports whose revenue model
 * doesn't match how the business actually gets paid.
 *
 * This detector runs at ingestion time BEFORE the engine, on the free-text
 * idea. If it matches one of the narrow, high-precision patterns below, the
 * response gets a `model_applicability_warning` metadata block, which the
 * frontend surfaces as a prominent honest banner. The engine STILL RUNS and
 * the report still displays -- we WARN, we do not BLOCK, because false
 * positives on the detector shouldn't hide a possibly-useful analysis.
 *
 * Design bias: HIGH PRECISION over recall. Better to miss ambiguous cases
 * than to false-positive on a real steady-revenue business. Every phrase
 * below was chosen because it's an unambiguous marker of a revenue shape
 * the engine cannot model correctly today.
 *
 * Domain 5 audit (Q41/Q45/Q165/Q179) and Domain 12 (Q119, 2026-07-20
 * profitability audit).
 */

export type DetectedRevenueShape =
  | 'contingency_fee'
  | 'project_based'
  | 'transaction_percentage';

export interface ModelApplicabilityWarning {
  detected_shape: DetectedRevenueShape;
  engine_assumes: 'steady_monthly_transactions';
  severity: 'warn';
  matched_phrase: string;
  explanation: string;
}

// Each rule: a shape and the exact phrases that unambiguously mark it.
// Phrases are lowercased and matched against the lowercased idea; the first
// matching rule wins. Order matters -- more specific patterns first.
const RULES: Array<{
  shape: DetectedRevenueShape;
  phrases: string[];
  explanation: string;
}> = [
  {
    shape: 'contingency_fee',
    phrases: [
      'contingency fee',
      'contingency-fee',
      '% of recovered',
      'percent of recovered',
      'percentage of recovered',
      'take a percentage of recovered',
      'take a % of recovered',
      '% commission on recovered',
      '% of savings',
      'percentage of savings',
    ],
    explanation:
      'This business earns revenue only when a specific event happens (a recovery, a win, a saving). Revenue is event-triggered and lumpy, not steady monthly transactions. Payback, MRR, and margin calculations below assume steady monthly revenue and may not reflect how this business actually generates cash.',
  },
  {
    shape: 'project_based',
    phrases: [
      'per project',
      'per-project',
      'project-based revenue',
      'project-based pricing',
      'per case',
      'per matter',
      'per engagement',
      'per deliverable',
      'fixed-fee project',
      'fixed fee project',
    ],
    explanation:
      'This business bills per completed project or engagement, not on a steady monthly cycle. Revenue timing depends on how many projects close in a given month, which the engine does not model. MRR-based projections below are indicative only, not a reliable cash-flow forecast.',
  },
  {
    shape: 'transaction_percentage',
    phrases: [
      '% of transaction',
      'percent of transaction',
      '% of deal',
      'percent of deal',
      '% of gmv',
      'percent of gmv',
      'take a cut of each transaction',
      '% of each sale',
      'percentage of each sale',
    ],
    explanation:
      'This business earns a percentage cut of underlying transactions, so revenue depends on transaction volume and size the engine does not directly model. Absolute MRR and payback numbers below may not be reliable; treat them as directional.',
  },
];

/**
 * Detect the clearest revenue-shape mismatches on a free-text business idea.
 * Returns null if no unambiguous mismatch is detected -- the engine's normal
 * output is safe to show without a warning. Returns a ModelApplicabilityWarning
 * if a match is found -- the engine still runs, but the frontend must display
 * the warning prominently alongside the report.
 */
export function detectRevenueShapeMismatch(
  ideaText: string,
): ModelApplicabilityWarning | null {
  if (!ideaText || typeof ideaText !== 'string') return null;
  const lower = ideaText.toLowerCase();
  for (const rule of RULES) {
    for (const phrase of rule.phrases) {
      if (lower.includes(phrase)) {
        return {
          detected_shape: rule.shape,
          engine_assumes: 'steady_monthly_transactions',
          severity: 'warn',
          matched_phrase: phrase,
          explanation: rule.explanation,
        };
      }
    }
  }
  return null;
}
