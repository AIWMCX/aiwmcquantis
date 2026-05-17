import { QuantisMath } from '@/lib/quantis-math';
import type { BusinessAnalysisResult, FinancialAnalysis } from '@/types/analysis';

export type AnalysisContractSeverity = 'error' | 'warning';

export interface AnalysisContractIssue {
  severity: AnalysisContractSeverity;
  path: string;
  message: string;
  expected?: string;
  actual?: unknown;
}

export interface AnalysisContractReport {
  passed: boolean;
  issues: AnalysisContractIssue[];
  checkedFields: number;
}

const MONEY_TOLERANCE = 2;
const RATIO_TOLERANCE = 0.05;
const PERCENT_TOLERANCE = 1.25;

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function approx(actual: number, expected: number, tolerance = MONEY_TOLERANCE): boolean {
  return QuantisMath.abs(QuantisMath.subtract(actual, expected)).lte(tolerance);
}

function objectSum(value: Record<string, unknown> | undefined): number {
  if (!value) return 0;
  return Object.values(value).reduce((sum, item) => {
    return isFiniteNumber(item) ? QuantisMath.round(QuantisMath.add(sum, item)) : sum;
  }, 0);
}

function expectedPercent(numerator: number, denominator: number): number {
  if (!denominator) return 0;
  return QuantisMath.toNumber(QuantisMath.percentage(numerator, denominator), 1);
}

function push(
  issues: AnalysisContractIssue[],
  severity: AnalysisContractSeverity,
  path: string,
  message: string,
  expected?: string,
  actual?: unknown,
): void {
  issues.push({ severity, path, message, expected, actual });
}

function requireNumber(
  issues: AnalysisContractIssue[],
  value: unknown,
  path: string,
  options: { min?: number; max?: number; allowZero?: boolean } = {},
): value is number {
  if (!isFiniteNumber(value)) {
    push(issues, 'error', path, 'Missing or non-finite numeric value', 'finite number', value);
    return false;
  }
  if (options.allowZero !== true && value === 0) {
    push(issues, 'error', path, 'Unexpected zero value', 'non-zero unless explicitly impossible', value);
    return false;
  }
  if (options.min !== undefined && value < options.min) {
    push(issues, 'error', path, 'Value below minimum', `>= ${options.min}`, value);
    return false;
  }
  if (options.max !== undefined && value > options.max) {
    push(issues, 'error', path, 'Value above maximum', `<= ${options.max}`, value);
    return false;
  }
  return true;
}

function validateFinancial(issues: AnalysisContractIssue[], financial: FinancialAnalysis | undefined): number {
  let checked = 0;
  if (!financial) {
    push(issues, 'error', 'financial_analysis', 'Financial analysis section is missing');
    return checked;
  }

  checked += 1;
  const mrrOk = requireNumber(issues, financial.mrr, 'financial_analysis.mrr', { min: 1 });
  const arrOk = requireNumber(issues, financial.arr, 'financial_analysis.arr', { min: 1 });
  if (mrrOk && arrOk) {
    checked += 1;
    const expectedArr = QuantisMath.round(QuantisMath.multiply(financial.mrr!, 12));
    if (!approx(financial.arr!, expectedArr)) {
      push(issues, 'error', 'financial_analysis.arr', 'ARR must equal MRR × 12', String(expectedArr), financial.arr);
    }
  }

  const startupTotal = financial.startup_investment?.total;
  if (requireNumber(issues, startupTotal, 'financial_analysis.startup_investment.total', { min: 0, allowZero: true })) {
    checked += 1;
    const breakdown = financial.startup_investment?.breakdown as unknown as Record<string, unknown> | undefined;
    const sum = objectSum(breakdown);
    if (!approx(startupTotal, sum)) {
      push(issues, 'error', 'financial_analysis.startup_investment.breakdown', 'Startup investment breakdown must sum to total', startupTotal.toLocaleString(), sum);
    }
  }

  const expenseTotal = financial.monthly_expenses?.total;
  const expenseBreakdown = financial.monthly_expenses?.breakdown as unknown as Record<string, unknown> | undefined;
  if (requireNumber(issues, expenseTotal, 'financial_analysis.monthly_expenses.total', { min: 0, allowZero: true })) {
    checked += 1;
    const sum = objectSum(expenseBreakdown);
    if (!approx(expenseTotal, sum)) {
      push(issues, 'error', 'financial_analysis.monthly_expenses.breakdown', 'Monthly expense breakdown must sum to total', expenseTotal.toLocaleString(), sum);
    }
    const fixed = financial.monthly_expenses.fixed_costs ?? 0;
    const variable = financial.monthly_expenses.variable_costs ?? 0;
    if (isFiniteNumber(fixed) && isFiniteNumber(variable) && !approx(expenseTotal, QuantisMath.round(QuantisMath.add(fixed, variable)))) {
      push(issues, 'error', 'financial_analysis.monthly_expenses.total', 'Monthly expenses must equal fixed_costs + variable_costs', `${fixed + variable}`, expenseTotal);
    }
  }

  for (const scenarioName of ['pessimistic', 'base', 'optimistic'] as const) {
    const scenario = financial.scenarios?.[scenarioName];
    if (!scenario) {
      push(issues, 'error', `financial_analysis.scenarios.${scenarioName}`, 'Scenario is missing');
      continue;
    }
    checked += 1;
    const expectedNet = QuantisMath.round(QuantisMath.subtract(scenario.revenue, QuantisMath.add(scenario.variable_costs, scenario.fixed_costs)));
    if (!approx(scenario.net_profit, expectedNet)) {
      push(issues, 'error', `financial_analysis.scenarios.${scenarioName}.net_profit`, 'Scenario net profit must equal revenue - variable costs - fixed costs', expectedNet.toLocaleString(), scenario.net_profit);
    }
    const grossMargin = expectedPercent(scenario.gross_profit, scenario.revenue);
    if (!approx(scenario.gross_margin, grossMargin, PERCENT_TOLERANCE)) {
      push(issues, 'error', `financial_analysis.scenarios.${scenarioName}.gross_margin`, 'Gross margin must equal gross profit / revenue', `${grossMargin}%`, scenario.gross_margin);
    }
    const netMargin = expectedPercent(scenario.net_profit, scenario.revenue);
    if (!approx(scenario.net_margin, netMargin, PERCENT_TOLERANCE)) {
      push(issues, 'error', `financial_analysis.scenarios.${scenarioName}.net_margin`, 'Net margin must equal net profit / revenue', `${netMargin}%`, scenario.net_margin);
    }
  }

  const unit = financial.unit_economics;
  if (!unit) {
    push(issues, 'error', 'financial_analysis.unit_economics', 'Unit economics section is missing');
  } else {
    checked += 1;
    const price = financial.inputs?.price_per_unit ?? 0;
    const cogsPerUnit = financial.inputs?.cogs_per_unit ?? 0;
    const expectedContribution = QuantisMath.round(QuantisMath.subtract(price, cogsPerUnit));
    if (price > 0 && !approx(unit.contribution_margin, expectedContribution)) {
      push(issues, 'error', 'financial_analysis.unit_economics.contribution_margin', 'Contribution margin must equal price_per_unit - cogs_per_unit', expectedContribution, unit.contribution_margin);
    }
    const expectedRatio = price > 0 ? QuantisMath.toNumber(QuantisMath.divide(expectedContribution, price), 4) : 0;
    if (price > 0 && !approx(unit.contribution_margin_ratio, expectedRatio, RATIO_TOLERANCE)) {
      push(issues, 'error', 'financial_analysis.unit_economics.contribution_margin_ratio', 'Contribution margin ratio must match contribution margin / price', expectedRatio, unit.contribution_margin_ratio);
    }
    const expectedLtvCac = QuantisMath.toNumber(QuantisMath.ltvCacRatio(unit.ltv, unit.cac), 2);
    if (!approx(unit.ltv_cac_ratio, expectedLtvCac, RATIO_TOLERANCE)) {
      push(issues, 'error', 'financial_analysis.unit_economics.ltv_cac_ratio', 'LTV:CAC must equal LTV / CAC', expectedLtvCac, unit.ltv_cac_ratio);
    }
    const expectedCacPayback = QuantisMath.toNumber(QuantisMath.cacPaybackMonths(unit.cac, price, unit.contribution_margin_ratio), 1);
    if (price > 0 && !approx(unit.cac_payback_months, expectedCacPayback, 1.1)) {
      push(issues, 'error', 'financial_analysis.unit_economics.cac_payback_months', 'CAC payback must use canonical CAC ÷ (avg ticket × gross margin) formula', expectedCacPayback, unit.cac_payback_months);
    }
  }

  const baseProfit = financial.scenarios?.base?.net_profit ?? financial.monthly_profit ?? 0;
  const payback = financial.returns?.payback_period_months ?? financial.payback_period_months;
  if (requireNumber(issues, payback, 'financial_analysis.returns.payback_period_months', { min: 0, allowZero: true })) {
    checked += 1;
    if (baseProfit <= 0 && payback < 999) {
      push(issues, 'error', 'financial_analysis.returns.payback_period_months', 'Unprofitable base case must use 999 sentinel, never 0 months', '999', payback);
    }
    if (baseProfit > 0 && payback <= 0) {
      push(issues, 'error', 'financial_analysis.returns.payback_period_months', 'Profitable base case must have a positive project payback period', '> 0', payback);
    }
  }

  const breakeven = financial.breakeven;
  if (!breakeven) {
    push(issues, 'error', 'financial_analysis.breakeven', 'Breakeven section is missing');
  } else {
    checked += 1;
    const price = financial.inputs?.price_per_unit ?? 0;
    if (price > 0) {
      const expectedUnits = QuantisMath.ceil(QuantisMath.divide(breakeven.breakeven_revenue, price));
      if (!approx(breakeven.breakeven_units, expectedUnits, 1)) {
        push(issues, 'error', 'financial_analysis.breakeven.breakeven_units', 'Breakeven units must equal breakeven revenue / average ticket', expectedUnits, breakeven.breakeven_units);
      }
    }
  }

  if (financial.monthly_profit !== undefined && !approx(financial.monthly_profit, baseProfit)) {
    push(issues, 'error', 'financial_analysis.monthly_profit', 'Legacy monthly_profit must mirror base scenario net profit', baseProfit, financial.monthly_profit);
  }
  if (financial.payback_period_months !== undefined && payback !== undefined && financial.payback_period_months !== payback) {
    push(issues, 'error', 'financial_analysis.payback_period_months', 'Legacy payback field must mirror returns.payback_period_months', payback, financial.payback_period_months);
  }

  return checked;
}

export function validateAnalysisContract(result: BusinessAnalysisResult): AnalysisContractReport {
  const issues: AnalysisContractIssue[] = [];
  let checkedFields = 0;

  checkedFields += validateFinancial(issues, result.financial_analysis);

  if (!requireNumber(issues, result.confidence_score, 'confidence_score', { min: 0, max: 100, allowZero: true })) {
    checkedFields += 1;
  } else {
    checkedFields += 1;
  }

  if (!Array.isArray(result.data_sources) || result.data_sources.length === 0) {
    push(issues, 'error', 'data_sources', 'Every analysis must expose at least one data source');
  }
  if (!Array.isArray(result.limitations) || result.limitations.length === 0) {
    push(issues, 'error', 'limitations', 'Every analysis must expose limitations');
  }

  if ((result.business_plan?.launch_steps?.length ?? 0) < 3) {
    push(issues, 'error', 'business_plan.launch_steps', 'Business plan must include at least 3 launch steps');
  }
  if ((result.business_plan?.risks?.length ?? 0) < 3) {
    push(issues, 'error', 'business_plan.risks', 'Business plan must include at least 3 risks');
  }
  if ((result.marketing_plan?.channels?.length ?? 0) < 1) {
    push(issues, 'error', 'marketing_plan.channels', 'Marketing plan must include at least one channel');
  }
  if (result.financial_analysis?.unit_economics) {
    if (!approx(result.marketing_plan?.cac ?? NaN, result.financial_analysis.unit_economics.cac)) {
      push(issues, 'error', 'marketing_plan.cac', 'Marketing CAC must mirror financial unit economics CAC', result.financial_analysis.unit_economics.cac, result.marketing_plan?.cac);
    }
    if (!approx(result.marketing_plan?.ltv ?? NaN, result.financial_analysis.unit_economics.ltv)) {
      push(issues, 'error', 'marketing_plan.ltv', 'Marketing LTV must mirror financial unit economics LTV', result.financial_analysis.unit_economics.ltv, result.marketing_plan?.ltv);
    }
  }

  for (const key of ['idea', 'location', 'generated_at', 'model', 'version'] as const) {
    if (!result.metadata?.[key]) {
      push(issues, 'error', `metadata.${key}`, 'Required metadata field is missing');
    }
  }

  return {
    passed: issues.filter((issue) => issue.severity === 'error').length === 0,
    issues,
    checkedFields,
  };
}