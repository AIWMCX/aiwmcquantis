import { breakEvenMonthsForDisplay, canonicalBreakEven } from './break-even';
import type { BusinessAnalysisResult } from '@/types/analysis';
import type {
  CanonicalModelSnapshot,
  ScenarioRunRef,
  QuoteVersionRef,
  DocumentVariable,
} from '@/types/canonical-document-model';

/**
 * CANONICAL DOCUMENT VARIABLE MAPPER
 * ===================================
 * Replaces the fragmented auto-fill logic previously in
 * useAnalysisAutoFill.ts / AutoFillButton.tsx, which read paths that don't
 * exist on BusinessAnalysisResult at all (`result.business_name`,
 * `result.financial_metrics`, `result.scenarios` at the top level,
 * `result.market_data`) and fabricated Year 2/3 revenue via hardcoded
 * `* 1.5` / `* 2` multipliers instead of reading real projected figures.
 *
 * Every canonical key here resolves against the REAL BusinessAnalysisResult
 * shape (src/types/analysis.ts). If a path has no value, the variable is
 * returned with `renderedValue: null` and a user-facing `unavailableReason`
 * — never an unrelated metric, never an invented growth path.
 */

type Resolved = { value: number | string | null; unit?: string; currency?: string; period?: string };
type Resolver = (result: Partial<BusinessAnalysisResult>) => Resolved;

interface KeyDef {
  sourcePath: string;
  resolve: Resolver;
}

// The engine computes in USD (benchmarks are USD). Prefer a currency the
// analysis itself records; fall back to USD only as the engine's basis,
// never as a guess about the client's books (R&D F06).
const ENGINE_BASE_CURRENCY = 'USD';
function currencyOf(r: Partial<BusinessAnalysisResult>): string {
  const rec = r as Record<string, unknown>;
  const fa = (rec.financial_analysis ?? {}) as Record<string, unknown>;
  const c = rec.currency ?? fa.currency;
  return typeof c === 'string' && /^[A-Z]{3}$/.test(c) ? c : ENGINE_BASE_CURRENCY;
}

const KEY_DEFS: Record<string, KeyDef> = {
  mrr: {
    sourcePath: 'financial_analysis.mrr',
    resolve: (r) => ({ value: r.financial_analysis?.mrr ?? null, unit: 'currency', currency: currencyOf(r), period: 'monthly' }),
  },
  arr: {
    sourcePath: 'financial_analysis.arr',
    resolve: (r) => ({ value: r.financial_analysis?.arr ?? null, unit: 'currency', currency: currencyOf(r), period: 'annual' }),
  },
  baseRevenue: {
    sourcePath: 'financial_analysis.scenarios.base.revenue',
    resolve: (r) => ({ value: r.financial_analysis?.scenarios?.base?.revenue ?? null, unit: 'currency', currency: currencyOf(r), period: 'monthly' }),
  },
  baseNetProfit: {
    sourcePath: 'financial_analysis.scenarios.base.net_profit',
    resolve: (r) => ({ value: r.financial_analysis?.scenarios?.base?.net_profit ?? null, unit: 'currency', currency: currencyOf(r), period: 'monthly' }),
  },
  baseGrossMargin: {
    sourcePath: 'financial_analysis.scenarios.base.gross_margin',
    resolve: (r) => ({ value: r.financial_analysis?.scenarios?.base?.gross_margin ?? null, unit: 'percent' }),
  },
  baseNetMargin: {
    sourcePath: 'financial_analysis.scenarios.base.net_margin',
    resolve: (r) => ({ value: r.financial_analysis?.scenarios?.base?.net_margin ?? null, unit: 'percent' }),
  },
  optimisticRevenue: {
    sourcePath: 'financial_analysis.scenarios.optimistic.revenue',
    resolve: (r) => ({ value: r.financial_analysis?.scenarios?.optimistic?.revenue ?? null, unit: 'currency', currency: currencyOf(r), period: 'monthly' }),
  },
  pessimisticRevenue: {
    sourcePath: 'financial_analysis.scenarios.pessimistic.revenue',
    resolve: (r) => ({ value: r.financial_analysis?.scenarios?.pessimistic?.revenue ?? null, unit: 'currency', currency: currencyOf(r), period: 'monthly' }),
  },
  cac: {
    sourcePath: 'financial_analysis.unit_economics.cac',
    resolve: (r) => ({ value: r.financial_analysis?.unit_economics?.cac ?? null, unit: 'currency', currency: currencyOf(r) }),
  },
  ltv: {
    sourcePath: 'financial_analysis.unit_economics.ltv',
    resolve: (r) => ({ value: r.financial_analysis?.unit_economics?.ltv ?? null, unit: 'currency', currency: currencyOf(r) }),
  },
  ltvCacRatio: {
    sourcePath: 'financial_analysis.unit_economics.ltv_cac_ratio',
    resolve: (r) => ({ value: r.financial_analysis?.unit_economics?.ltv_cac_ratio ?? null, unit: 'ratio' }),
  },
  cacPaybackMonths: {
    sourcePath: 'financial_analysis.unit_economics.cac_payback_months',
    resolve: (r) => ({ value: r.financial_analysis?.unit_economics?.cac_payback_months ?? null, unit: 'months' }),
  },
  breakEvenMonths: {
    sourcePath: 'financial_analysis.breakeven.breakeven_months',
    resolve: (r) => ({ value: breakEvenMonthsForDisplay(r.financial_analysis), unit: 'months' }),
  },
  breakEvenRevenue: {
    sourcePath: 'financial_analysis.cvp.breakEven.breakEvenRevenue',
    resolve: (r) => ({ value: canonicalBreakEven(r.financial_analysis).revenue, unit: 'currency', currency: currencyOf(r) }),
  },
  // Operating break-even (breakeven_months, above) is kept distinct from
  // investment payback (below) per the framework's identity rules — never
  // merged into a single "payback" figure.
  investmentPaybackMonths: {
    sourcePath: 'financial_analysis.returns.payback_period_months',
    resolve: (r) => ({ value: r.financial_analysis?.returns?.payback_period_months ?? null, unit: 'months' }),
  },
  roiYear1: {
    sourcePath: 'financial_analysis.returns.roi_year_1',
    resolve: (r) => ({ value: r.financial_analysis?.returns?.roi_year_1 ?? null, unit: 'percent', period: 'annual' }),
  },
  roiYear3: {
    sourcePath: 'financial_analysis.returns.roi_year_3',
    resolve: (r) => ({ value: r.financial_analysis?.returns?.roi_year_3 ?? null, unit: 'percent', period: '3-year' }),
  },
  npv3Years: {
    sourcePath: 'financial_analysis.returns.npv_3_years',
    resolve: (r) => ({ value: r.financial_analysis?.returns?.npv_3_years ?? null, unit: 'currency', currency: currencyOf(r), period: '3-year' }),
  },
  startupInvestmentTotal: {
    sourcePath: 'financial_analysis.startup_investment.total',
    resolve: (r) => ({ value: r.financial_analysis?.startup_investment?.total ?? null, unit: 'currency', currency: currencyOf(r) }),
  },
  monthlyExpensesTotal: {
    sourcePath: 'financial_analysis.monthly_expenses.total',
    resolve: (r) => ({ value: r.financial_analysis?.monthly_expenses?.total ?? null, unit: 'currency', currency: currencyOf(r), period: 'monthly' }),
  },
  confidenceScore: {
    sourcePath: 'confidence_score',
    resolve: (r) => ({ value: r.confidence_score ?? null, unit: 'score' }),
  },
  // market_size fields are analyst-written prose strings on the real type
  // (e.g. "Local opportunity in Austin, TX"), not numbers — rendering them
  // as currency would be a fabrication the source doesn't support.
  tam: {
    sourcePath: 'market_analysis.market_size.tam',
    resolve: (r) => ({ value: r.market_analysis?.market_size?.tam ?? null }),
  },
  sam: {
    sourcePath: 'market_analysis.market_size.sam',
    resolve: (r) => ({ value: r.market_analysis?.market_size?.sam ?? null }),
  },
  som: {
    sourcePath: 'market_analysis.market_size.som',
    resolve: (r) => ({ value: r.market_analysis?.market_size?.som ?? null }),
  },
  industryDetected: {
    sourcePath: 'metadata.industry_detected',
    resolve: (r) => ({ value: r.metadata?.industry_detected ?? null }),
  },
};

export function mapCanonicalModelToDocumentVariables(
  modelSnapshot: CanonicalModelSnapshot,
  scenarioRun?: ScenarioRunRef,
  quoteVersion?: QuoteVersionRef,
): Record<string, DocumentVariable> {
  if (scenarioRun?.analysisId && scenarioRun.analysisId !== modelSnapshot.analysisId) {
    throw new Error('Scenario run belongs to a different analysis; refusing to map mismatched financial data.');
  }
  const source: Partial<BusinessAnalysisResult> = scenarioRun?.output ?? modelSnapshot.result;
  const engineVersion = scenarioRun?.engineVersion ?? modelSnapshot.engineVersion;
  const formulaVersion = scenarioRun?.formulaVersion ?? modelSnapshot.formulaVersion;
  const numericOutputHash = scenarioRun?.outputHash ?? modelSnapshot.numericOutputHash;

  const out: Record<string, DocumentVariable> = {};

  for (const [canonicalKey, def] of Object.entries(KEY_DEFS)) {
    let resolved: Resolved;
    try {
      resolved = def.resolve(source);
    } catch {
      resolved = { value: null };
    }

    const variable: DocumentVariable = {
      canonicalKey,
      renderedValue: resolved.value ?? null,
      unit: resolved.unit,
      currency: resolved.currency,
      period: resolved.period,
      sourcePath: def.sourcePath,
      modelSnapshotId: modelSnapshot.snapshotId,
      scenarioRunId: scenarioRun?.scenarioRunId,
      quoteVersionId: quoteVersion?.quoteVersionId,
      numericOutputHash,
      engineVersion,
      formulaVersion,
    };

    if (variable.renderedValue === null) {
      variable.unavailableReason = `No value found at "${def.sourcePath}" in the ${
        scenarioRun ? 'scenario run output' : 'analysis snapshot result'
      }.`;
    }

    out[canonicalKey] = variable;
  }

  return out;
}
