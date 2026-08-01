/**
 * Simplified PAIRWISE coherence check for ad-hoc scenario runs (Phase D).
 *
 * `checkScenarioMonotonicity()` (analyze-business/payback-contract.ts) is a
 * fixed 3-way (pessimistic/base/optimistic) contract built for a single
 * analysis's built-in stress scenarios. A saved `run-scenario` call doesn't
 * have that fixed shape — it's one ad-hoc delta compared against whichever
 * sibling `scenario_versions` in the same `scenario_id` already have runs.
 * This is advisory only (feeds `scenario_runs.reconciliation_issues`), never
 * blocks a run from being persisted.
 */

export interface ScenarioCoherenceIssue {
  code: string;
  message: string;
}

export interface ScenarioRunSummary {
  versionNumber: number;
  revenue: number;
  netProfit: number;
}

/**
 * Compares a new run against its siblings (other versions of the same
 * scenario that already have a run). Flags the same "revenue up but profit
 * down" shape checkScenarioMonotonicity looks for, pairwise against each
 * sibling instead of a fixed 3-slot contract. Returns [] (coherent) when
 * there are no siblings yet — a lone version has nothing to contradict.
 */
export function checkScenarioRunCoherence(
  candidate: ScenarioRunSummary,
  siblings: ScenarioRunSummary[],
): ScenarioCoherenceIssue[] {
  const issues: ScenarioCoherenceIssue[] = [];

  for (const sibling of siblings) {
    if (sibling.versionNumber === candidate.versionNumber) continue;

    if (candidate.revenue > sibling.revenue && candidate.netProfit < sibling.netProfit) {
      issues.push({
        code: 'REVENUE_UP_PROFIT_DOWN',
        message: `Version ${candidate.versionNumber} revenue ($${candidate.revenue}) exceeds version ${sibling.versionNumber} ($${sibling.revenue}) but net profit ($${candidate.netProfit}) is worse ($${sibling.netProfit}).`,
      });
    }
    if (candidate.revenue < sibling.revenue && candidate.netProfit > sibling.netProfit) {
      issues.push({
        code: 'REVENUE_DOWN_PROFIT_UP',
        message: `Version ${candidate.versionNumber} revenue ($${candidate.revenue}) is below version ${sibling.versionNumber} ($${sibling.revenue}) but net profit ($${candidate.netProfit}) is better ($${sibling.netProfit}) — verify the delta didn't also change costs unexpectedly.`,
      });
    }
  }

  return issues;
}
