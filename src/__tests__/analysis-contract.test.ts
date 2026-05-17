import { describe, expect, it } from 'vitest';
import { validateAnalysisContract } from '@/lib/analysis-contract';
import type { BusinessAnalysisResult } from '@/types/analysis';

function makeResult(overrides: Partial<BusinessAnalysisResult> = {}): BusinessAnalysisResult {
  const result: BusinessAnalysisResult = {
    financial_analysis: {
      inputs: {
        price_per_unit: 100,
        units_sold_monthly: 500,
        purchase_frequency: 1,
        upsell_per_customer: 0,
        cogs_per_unit: 35,
        fixed_opex: 19000,
        marketing_budget: 6000,
        cac: 120,
        startup_investment: 90000,
        capex: 40000,
        ltv: 1300,
        churn_rate: 0.05,
      },
      mrr: 50000,
      arr: 600000,
      scenarios: {
        pessimistic: { revenue: 40000, variable_costs: 19000, fixed_costs: 19950, gross_profit: 24000, net_profit: 1050, gross_margin: 60, net_margin: 2.6 },
        base: { revenue: 50000, variable_costs: 23500, fixed_costs: 19000, gross_profit: 32500, net_profit: 7500, gross_margin: 65, net_margin: 15 },
        optimistic: { revenue: 62500, variable_costs: 28500, fixed_costs: 18050, gross_profit: 41875, net_profit: 15950, gross_margin: 67, net_margin: 25.5 },
      },
      unit_economics: {
        contribution_margin: 65,
        contribution_margin_ratio: 0.65,
        cac: 120,
        cac_payback_months: 1.8,
        ltv: 1300,
        ltv_cac_ratio: 10.83,
      },
      breakeven: { breakeven_units: 462, breakeven_revenue: 46154, breakeven_months: 12 },
      returns: { payback_period_months: 12, roi_year_1: 55, roi_year_3: 300, npv_3_years: 130000 },
      startup_investment: { total: 90000, breakdown: { rent_deposit: 10000, equipment: 30000, inventory: 10000, legal: 5000, marketing_initial: 15000, working_capital: 20000 }, reasoning: 'Fixture' },
      monthly_expenses: { total: 42500, variable_costs: 23500, fixed_costs: 19000, breakdown: { rent: 5000, utilities: 1000, salaries: 10000, inventory_replenishment: 17500, marketing: 6000, other: 3000 } },
      monthly_profit: 7500,
      payback_period_months: 12,
      calculations_summary: 'Fixture audit',
    },
    business_plan: {
      executive_summary: 'Fixture', product_description: 'Fixture', target_audience: 'Fixture', competitive_advantages: 'Fixture', operations: 'Fixture',
      launch_steps: [1, 2, 3].map((step) => ({ step, title: `Step ${step}`, description: 'Do it', duration: '2 weeks', cost: 1000 })),
      risks: [1, 2, 3].map((i) => ({ risk: `Risk ${i}`, probability: 'средняя', impact: 'средний', mitigation: 'Mitigate' })),
    },
    marketing_plan: { positioning: 'Fixture', pricing_strategy: 'Fixture', channels: [{ channel: 'SEO', description: 'Fixture', budget_monthly: 1000, expected_roi: '2x' }], cac: 120, ltv: 1300, first_3_months_plan: 'Fixture' },
    market_analysis: { market_size: { tam: '$1B', sam: '$100M', som: '$1M' }, trends: ['Trend'], competition: { main_competitors: ['A'], competitive_landscape: 'Fixture', market_gaps: 'Fixture' }, barriers_to_entry: 'Fixture', growth_opportunities: 'Fixture' },
    confidence_score: 82,
    data_sources: ['Fixture benchmark'],
    limitations: ['Fixture limitation'],
    metadata: { idea: 'Fixture business', location: 'Berlin', generated_at: '2026-05-17T00:00:00Z', model: 'test', version: 'contract-v1' },
  };
  return { ...result, ...overrides };
}

describe('Analysis value contract', () => {
  it('passes a complete internally consistent analysis result', () => {
    const report = validateAnalysisContract(makeResult());
    expect(report.passed, report.issues.map((i) => `${i.path}: ${i.message}`).join('\n')).toBe(true);
    expect(report.checkedFields).toBeGreaterThanOrEqual(10);
  });

  it('fails contradictory values before they can ship to users', () => {
    const broken = makeResult();
    broken.financial_analysis.arr = 123;
    broken.financial_analysis.scenarios!.base.net_profit = -5000;
    broken.financial_analysis.returns!.payback_period_months = 0;
    broken.marketing_plan.cac = 999;

    const report = validateAnalysisContract(broken);
    expect(report.passed).toBe(false);
    expect(report.issues.map((i) => i.path)).toEqual(expect.arrayContaining([
      'financial_analysis.arr',
      'financial_analysis.scenarios.base.net_profit',
      'financial_analysis.returns.payback_period_months',
      'marketing_plan.cac',
    ]));
  });

  it('rejects "0.1 month CAC payback" when base case is unprofitable (R-CAC-NEG-NOPAY)', () => {
    // Reviewer-reported pattern: scenario card showed 0.1 mo while benchmark table showed 999 mo.
    const broken = makeResult();
    broken.financial_analysis.scenarios!.base.net_profit = -900;
    broken.financial_analysis.scenarios!.base.net_margin = -3.3;
    broken.financial_analysis.monthly_profit = -900;
    broken.financial_analysis.unit_economics!.cac_payback_months = 0.1;
    broken.financial_analysis.returns!.payback_period_months = 999;

    const report = validateAnalysisContract(broken);
    expect(report.passed).toBe(false);
    expect(report.issues.map((i) => i.path)).toContain('financial_analysis.unit_economics.cac_payback_months');
  });

  it('rejects implausible LTV:CAC > 50x even when business is profitable (R-LTVCAC-HARD-CAP)', () => {
    const broken = makeResult();
    broken.financial_analysis.unit_economics!.ltv = 29250;
    broken.financial_analysis.unit_economics!.cac = 120;
    broken.financial_analysis.unit_economics!.ltv_cac_ratio = 243.8;
    broken.marketing_plan.ltv = 29250;

    const report = validateAnalysisContract(broken);
    expect(report.passed).toBe(false);
    expect(report.issues.map((i) => i.path)).toContain('financial_analysis.unit_economics.ltv_cac_ratio');
  });

  it('rejects LTV:CAC > 4x when base case is unprofitable (R-LTVCAC-CAP-UNPROFITABLE)', () => {
    const broken = makeResult();
    broken.financial_analysis.scenarios!.base.net_profit = -900;
    broken.financial_analysis.scenarios!.base.net_margin = -3.3;
    broken.financial_analysis.monthly_profit = -900;
    broken.financial_analysis.returns!.payback_period_months = 999;
    broken.financial_analysis.unit_economics!.cac_payback_months = 999;
    broken.financial_analysis.unit_economics!.ltv = 5000;
    broken.financial_analysis.unit_economics!.ltv_cac_ratio = 41.6;
    broken.marketing_plan.ltv = 5000;

    const report = validateAnalysisContract(broken);
    expect(report.passed).toBe(false);
    expect(report.issues.map((i) => i.path)).toContain('financial_analysis.unit_economics.ltv_cac_ratio');
  });
});