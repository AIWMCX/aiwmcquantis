import type { BusinessAnalysisResult } from '@/types/analysis';

const toFiniteNumber = (value: unknown, fallback: number): number => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (!normalized || normalized.includes('n/a') || normalized.includes('unprofitable') || normalized.includes('never')) return fallback;
    const parsed = Number(normalized.replace(/[^0-9.-]/g, ''));
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
};

/**
 * Last-mile contract guard for old cached rows and any malformed backend output.
 * It keeps display language separate from machine-readable financial numbers.
 */
export function normalizeAnalysisResult(result: BusinessAnalysisResult): BusinessAnalysisResult {
  const clone = structuredClone(result) as BusinessAnalysisResult;
  const financials = clone.financial_analysis;
  if (!financials) return clone;

  const baseProfit = toFiniteNumber(financials.scenarios?.base?.net_profit ?? financials.monthly_profit, 0);
  const paybackFallback = baseProfit <= 0 ? 999 : 99;
  const projectPayback = toFiniteNumber(financials.payback_period_months ?? financials.returns?.payback_period_months, paybackFallback);
  financials.payback_period_months = projectPayback;

  if (financials.returns) {
    financials.returns.payback_period_months = toFiniteNumber(financials.returns.payback_period_months, projectPayback);
  }

  if (financials.unit_economics) {
    financials.unit_economics.cac_payback_months = toFiniteNumber(
      financials.unit_economics.cac_payback_months,
      baseProfit <= 0 ? 999 : 0,
    );
    financials.unit_economics.ltv_cac_ratio = toFiniteNumber(financials.unit_economics.ltv_cac_ratio, 0);
    financials.unit_economics.cac = toFiniteNumber(financials.unit_economics.cac, 0);
    financials.unit_economics.ltv = toFiniteNumber(financials.unit_economics.ltv, 0);
  }

  clone.data_sources = Array.isArray(clone.data_sources) ? clone.data_sources : [];
  clone.limitations = Array.isArray(clone.limitations) ? clone.limitations : [];
  clone.confidence_score = toFiniteNumber(clone.confidence_score, 50);

  return clone;
}