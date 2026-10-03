/**
 * Builds the blinded IndependentDecisionPacket sent to a DecisionReviewer.
 *
 * Deliberately excludes the Quantis verdict (anchoring risk — JEV contract
 * §6) and all PII (email, name, raw documents, billing). Reads the same
 * `analyses.result` JSONB blob the rest of the app reads (see
 * `src/types/analysis.ts`'s `BusinessAnalysisResult`), defensively — every
 * field is optional on that type in practice, so every access here falls
 * back to a safe "unknown" value rather than throwing or inventing a number.
 *
 * This module does not call the database itself — callers pass in the
 * already-fetched `analyses` row, keeping this a pure, independently
 * testable function (JEV contract §22, "packet builder" unit tests).
 */
import type {
  CriticalAssumption,
  EvidenceSummary,
  IndependentDecisionPacket,
  ScenarioSummary,
  TypedFinancialMetric,
} from './contracts.ts';
import { DECISION_PACKET_SCHEMA_VERSION } from './contracts.ts';

// deno-lint-ignore no-explicit-any
type AnyResult = any;

function asNumberOrNull(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string') {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

/** Exported so callers can compute the canonical-result hash BEFORE building the full packet (the packet embeds that hash). */
export function extractMetrics(fa: AnyResult): TypedFinancialMetric[] {
  const metrics: TypedFinancialMetric[] = [];
  const push = (key: string, value: unknown, unit: TypedFinancialMetric['unit']) => {
    const n = asNumberOrNull(value);
    if (n !== null) metrics.push({ key, value: n, unit });
  };

  push('mrr', fa?.mrr, 'usd_per_month');
  push('net_profit_monthly', fa?.scenarios?.base?.net_profit ?? fa?.monthly_profit, 'usd_per_month');
  push('startup_investment_total', fa?.startup_investment?.total, 'usd');
  push('ltv_cac_ratio', fa?.unit_economics?.ltv_cac_ratio, 'ratio');
  push('cac', fa?.unit_economics?.cac, 'usd');
  push('ltv', fa?.unit_economics?.ltv, 'usd');
  push('cac_payback_months', fa?.unit_economics?.cac_payback_months, 'months');
  push('breakeven_months', fa?.breakeven?.breakeven_months ?? fa?.break_even_months, 'months');
  push('payback_period_months', fa?.returns?.payback_period_months ?? fa?.payback_period_months, 'months');
  push('contribution_margin_ratio', fa?.unit_economics?.contribution_margin_ratio, 'percent');

  return metrics;
}

function extractScenarios(fa: AnyResult): ScenarioSummary[] {
  const scenarios = fa?.scenarios;
  if (!scenarios) return [];
  const labels: Array<'pessimistic' | 'base' | 'optimistic'> = ['pessimistic', 'base', 'optimistic'];
  return labels
    .filter((label) => scenarios[label])
    .map((label) => ({
      label,
      net_profit_monthly: asNumberOrNull(scenarios[label]?.net_profit),
      mrr: asNumberOrNull(scenarios[label]?.mrr ?? scenarios[label]?.revenue),
    }));
}

/** Top-N critical assumptions, preferring the real assumption-graph critical path over actionable insights. */
function extractCriticalAssumptions(result: AnyResult, limit = 5): CriticalAssumption[] {
  const criticalPath = result?.assumption_graph?.criticalPath;
  if (Array.isArray(criticalPath) && criticalPath.length > 0) {
    return criticalPath.slice(0, limit).map((node: AnyResult) => ({
      key: String(node?.assumption ?? 'unknown'),
      label: String(node?.assumption ?? 'Unknown assumption'),
      currentValue: asNumberOrNull(node?.currentValue),
      provenance: 'DERIVED',
      evidenceStrength: 'unknown',
    }));
  }

  const insights = result?.actionable_insights?.insights;
  if (Array.isArray(insights) && insights.length > 0) {
    const priorityRank: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
    return [...insights]
      .sort((a: AnyResult, b: AnyResult) => (priorityRank[a?.priority] ?? 9) - (priorityRank[b?.priority] ?? 9))
      .slice(0, limit)
      .map((insight: AnyResult) => ({
        key: String(insight?.metric_name ?? 'unknown'),
        label: String(insight?.headline ?? insight?.metric_name ?? 'Unknown assumption'),
        currentValue: asNumberOrNull(insight?.current_value),
        provenance: 'UNKNOWN',
        evidenceStrength: 'unknown',
      }));
  }

  return [];
}

/**
 * Evidence strength summary. Deliberately conservative: if the result has
 * no structured RVCE/validation signal to derive strength from, this
 * returns an empty array rather than inventing a plausible-looking one —
 * JEV contract §6 forbids sending fabricated evidence confidence.
 */
function extractEvidence(result: AnyResult): EvidenceSummary[] {
  const flags = result?.sanity_flags;
  if (!Array.isArray(flags) || flags.length === 0) return [];
  return flags.slice(0, 10).map((f: AnyResult) => ({
    claim: String(f?.rule_id ?? 'unspecified'),
    strength: f?.severity === 'block' || f?.severity === 'critical' ? 'contradicted' : 'partial',
    sourceCount: 0,
  }));
}

function deriveIntegrity(result: AnyResult): IndependentDecisionPacket['integrity'] {
  const flags: AnyResult[] = Array.isArray(result?.sanity_flags) ? result.sanity_flags : [];
  const hasBlock = flags.some((f) => f?.severity === 'block' || f?.severity === 'critical');
  const hasWarn = flags.length > 0;

  return {
    reportIntegrity: hasBlock ? 'BLOCK' : hasWarn ? 'NEEDS_REVIEW' : 'OK',
    reconciliationStatus: result?.validation?.reconciliation_status ?? (result?.used_fallback ? 'WARNING' : 'UNKNOWN'),
    sourceCoverageStatus:
      Array.isArray(result?.data_sources) && result.data_sources.length > 0
        ? result.data_sources.length >= 3
          ? 'SUFFICIENT'
          : 'PARTIAL'
        : 'UNKNOWN',
  };
}

export function buildDecisionPacket(args: {
  canonicalResultHash: string;
  decisionType?: string | null;
  result: AnyResult; // analyses.result JSONB (BusinessAnalysisResult-shaped)
}): IndependentDecisionPacket {
  const { result, canonicalResultHash } = args;
  const fa = result?.financial_analysis ?? {};

  return {
    schemaVersion: DECISION_PACKET_SCHEMA_VERSION,
    decision: {
      type: args.decisionType ?? result?.detected_archetype ?? 'business_viability',
      // metadata.idea is the business idea text itself (not a personal
      // identifier) — the one piece of "decision description" worth
      // sending. Never pass metadata.location or anything else from
      // `metadata` here; it is not needed to answer the bounded questions.
      description: typeof result?.metadata?.idea === 'string' ? result.metadata.idea.slice(0, 2000) : '',
      capitalAtRisk:
        asNumberOrNull(fa?.startup_investment?.total) !== null
          ? { amount: asNumberOrNull(fa.startup_investment.total)!, currency: 'USD' }
          : null,
      deadline: null,
    },
    financialState: {
      canonicalResultHash,
      metrics: extractMetrics(fa),
      scenarios: extractScenarios(fa),
    },
    criticalAssumptions: extractCriticalAssumptions(result),
    evidence: extractEvidence(result),
    constraints: [],
    integrity: deriveIntegrity(result),
  };
}
