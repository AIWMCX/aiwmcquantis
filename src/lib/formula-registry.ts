/**
 * QUANTIS FORMULA REGISTRY
 * 
 * Centralized registry for every formula used in AIWMC Quantis.
 * Every formula is:
 * - Named and versioned
 * - Self-documenting with inputs/outputs
 * - Tested with built-in test cases
 * - Confidence-weighted
 * 
 * No anonymous inline calculations. Everything is traceable.
 * 
 * @module FormulaRegistry
 * @version 1.0.0
 */

import { QuantisMath, Decimal } from './quantis-math';
import { roiYear1Percent as roiYear1PercentShared, ROI_YEAR1_EXPRESSION } from '../../supabase/functions/analyze-business/roi-year1';

import { logger } from '@/lib/logger';
// ========== TYPES ==========

export interface FormulaInput {
  name: string;
  description: string;
  unit?: string;
  min?: number;
  max?: number;
  required: boolean;
}

export interface TestCase {
  name: string;
  inputs: number[];
  expectedOutput: number;
  tolerance?: number; // default 0.01
}

export interface FormulaDefinition {
  id: string;
  name: string;
  description: string;
  category: 'unit_economics' | 'profitability' | 'investment' | 'statistical' | 'growth' | 'risk';
  criticality: 'critical' | 'standard' | 'informational';
  units: string; // e.g. 'USD', '%', 'months', 'ratio', 'count'
  validRange?: { min: number; max: number }; // output sanity bounds
  inputs: FormulaInput[];
  formula: (...args: number[]) => number;
  formulaExpression: string;
  confidenceWeight: number;
  testCases: TestCase[];
  version: string;
  lastVerified: string;
}

export interface FormulaExecutionResult {
  formulaId: string;
  formulaName: string;
  inputs: Record<string, number>;
  output: number;
  confidence: number;
  auditTrail: string;
  isValid: boolean;
  warnings: string[];
}

// ========== FORMULA REGISTRY SINGLETON ==========

class FormulaRegistryImpl {
  private formulas: Map<string, FormulaDefinition> = new Map();

  register(definition: FormulaDefinition): void {
    if (this.formulas.has(definition.id)) {
      logger.warn(`Formula ${definition.id} already registered, overwriting.`);
    }
    this.formulas.set(definition.id, definition);
  }

  get(id: string): FormulaDefinition | undefined {
    return this.formulas.get(id);
  }

  execute(id: string, ...args: number[]): FormulaExecutionResult {
    const formula = this.formulas.get(id);
    if (!formula) {
      throw new Error(`Formula '${id}' not registered. Available: ${[...this.formulas.keys()].join(', ')}`);
    }

    const warnings: string[] = [];

    // Validate inputs
    for (let i = 0; i < formula.inputs.length; i++) {
      const input = formula.inputs[i];
      const value = args[i];

      if (input.required && (value === undefined || value === null || !Number.isFinite(value))) {
        warnings.push(`Input '${input.name}' is required but got ${value}`);
      }

      if (value !== undefined && Number.isFinite(value)) {
        if (input.min !== undefined && value < input.min) {
          warnings.push(`Input '${input.name}' (${value}) is below minimum (${input.min})`);
        }
        if (input.max !== undefined && value > input.max) {
          warnings.push(`Input '${input.name}' (${value}) exceeds maximum (${input.max})`);
        }
      }
    }

    // Execute
    const output = formula.formula(...args);
    const isValid = Number.isFinite(output) && warnings.length === 0;

    // Build audit trail
    const inputMap: Record<string, number> = {};
    formula.inputs.forEach((inp, i) => {
      inputMap[inp.name] = args[i];
    });

    const auditTrail = `${formula.formulaExpression} | Inputs: ${JSON.stringify(inputMap)} → Output: ${output}`;

    return {
      formulaId: id,
      formulaName: formula.name,
      inputs: inputMap,
      output: Number.isFinite(output) ? output : 0,
      confidence: isValid ? formula.confidenceWeight : Math.max(0, formula.confidenceWeight - 30),
      auditTrail,
      isValid,
      warnings,
    };
  }

  /** Run all test cases for a formula. Returns pass/fail results. */
  test(id: string): { passed: boolean; results: { name: string; passed: boolean; expected: number; actual: number }[] } {
    const formula = this.formulas.get(id);
    if (!formula) throw new Error(`Formula '${id}' not registered`);

    const results = formula.testCases.map(tc => {
      const actual = formula.formula(...tc.inputs);
      const tolerance = tc.tolerance ?? 0.01;
      const passed = Math.abs(actual - tc.expectedOutput) <= tolerance;
      return { name: tc.name, passed, expected: tc.expectedOutput, actual };
    });

    return { passed: results.every(r => r.passed), results };
  }

  /** Run all test cases for all formulas */
  testAll(): { totalPassed: number; totalFailed: number; results: Record<string, { passed: boolean; results: { name: string; passed: boolean; expected: number; actual: number }[] }> } {
    let totalPassed = 0;
    let totalFailed = 0;
    const results: Record<string, ReturnType<typeof this.test>> = {};

    for (const [id] of this.formulas) {
      const result = this.test(id);
      results[id] = result;
      result.results.forEach(r => r.passed ? totalPassed++ : totalFailed++);
    }

    return { totalPassed, totalFailed, results };
  }

  /** List all registered formulas */
  list(): FormulaDefinition[] {
    return [...this.formulas.values()];
  }

  /** Get formulas by category */
  byCategory(category: FormulaDefinition['category']): FormulaDefinition[] {
    return this.list().filter(f => f.category === category);
  }

  get size(): number {
    return this.formulas.size;
  }
}

// ========== SINGLETON EXPORT ==========

export const FormulaRegistry = new FormulaRegistryImpl();

// ========== REGISTER ALL CORE FORMULAS ==========

const TODAY = '2026-03-03';

// --- UNIT ECONOMICS ---

FormulaRegistry.register({
  id: 'ltv',
  name: 'Customer Lifetime Value (Margin-Adjusted)',
  description: 'Revenue a customer generates over their lifetime, adjusted for gross margin. LTV = AvgCheck × GrossMarginFraction × OrdersPerMonth × LifetimeMonths',
  category: 'unit_economics',
  criticality: 'critical',
  units: 'USD',
  validRange: { min: 0, max: 10000000 },
  formulaExpression: 'LTV = Avg_Check × (1 - COGS%) × Orders/Mo × Lifetime_Mo',
  inputs: [
    { name: 'avgCheck', description: 'Average transaction value', unit: 'USD', min: 0, required: true },
    { name: 'grossMarginFraction', description: '1 - COGS%', min: 0, max: 1, required: true },
    { name: 'ordersPerMonth', description: 'Orders per client per month', min: 0, required: true },
    { name: 'lifetimeMonths', description: 'Average customer lifetime', unit: 'months', min: 0, required: true },
  ],
  formula: (avgCheck, grossMargin, orders, lifetime) => {
    return QuantisMath.round(
      QuantisMath.ltv(avgCheck, grossMargin, orders, lifetime)
    );
  },
  confidenceWeight: 95,
  version: '2.0.0',
  lastVerified: TODAY,
  testCases: [
    { name: 'SaaS $200/mo, 80% margin, 1 order, 24mo', inputs: [200, 0.8, 1, 24], expectedOutput: 3840 },
    { name: 'E-com $50, 45% margin, 3 orders, 12mo', inputs: [50, 0.45, 3, 12], expectedOutput: 810 },
    { name: 'Zero avg check', inputs: [0, 0.8, 1, 24], expectedOutput: 0 },
    { name: 'Zero lifetime', inputs: [200, 0.8, 1, 0], expectedOutput: 0 },
  ],
});

FormulaRegistry.register({
  id: 'ltv_cac_ratio',
  name: 'LTV:CAC Ratio',
  description: 'Ratio of customer lifetime value to acquisition cost. Healthy range is 3-8x.',
  category: 'unit_economics',
  criticality: 'critical',
  units: 'ratio',
  validRange: { min: 0, max: 1000 },
  formulaExpression: 'LTV_CAC = LTV / CAC',
  inputs: [
    { name: 'ltv', description: 'Customer Lifetime Value', unit: 'USD', min: 0, required: true },
    { name: 'cac', description: 'Customer Acquisition Cost', unit: 'USD', min: 0, required: true },
  ],
  formula: (ltv, cac) => {
    return QuantisMath.toNumber(QuantisMath.ltvCacRatio(ltv, cac), 1);
  },
  confidenceWeight: 95,
  version: '1.0.0',
  lastVerified: TODAY,
  testCases: [
    { name: 'Healthy ratio', inputs: [3000, 500], expectedOutput: 6.0 },
    { name: 'Poor ratio', inputs: [500, 500], expectedOutput: 1.0 },
    { name: 'Zero CAC', inputs: [3000, 0], expectedOutput: 0 },
    { name: 'High ratio', inputs: [10000, 100], expectedOutput: 100.0 },
  ],
});

FormulaRegistry.register({
  id: 'cac_payback',
  name: 'CAC Payback Months',
  description: 'Months to recover customer acquisition cost from contribution margin.',
  category: 'unit_economics',
  criticality: 'standard',
  units: 'months',
  validRange: { min: 0, max: 999 },
  formulaExpression: 'CAC_Payback = CAC / (Avg_Check × (1 - COGS%) × Orders_per_Month)',
  inputs: [
    { name: 'cac', description: 'Customer Acquisition Cost', unit: 'USD', min: 0, required: true },
    { name: 'contributionPerCustomer', description: 'Monthly contribution per customer', unit: 'USD', min: 0, required: true },
  ],
  formula: (cac, contribution) => {
    if (contribution <= 0) return 999;
    return QuantisMath.ceil(QuantisMath.divide(cac, contribution));
  },
  confidenceWeight: 90,
  version: '1.0.0',
  lastVerified: TODAY,
  testCases: [
    { name: 'Normal payback', inputs: [300, 100], expectedOutput: 3 },
    { name: 'Long payback', inputs: [1000, 50], expectedOutput: 20 },
    { name: 'Zero contribution', inputs: [300, 0], expectedOutput: 999 },
    { name: 'Instant payback', inputs: [100, 200], expectedOutput: 1 },
  ],
});

// --- PROFITABILITY ---

FormulaRegistry.register({
  id: 'gross_profit',
  name: 'Gross Profit',
  description: 'Revenue minus cost of goods sold.',
  category: 'profitability',
  criticality: 'critical',
  units: 'USD',
  formulaExpression: 'Gross_Profit = Revenue - COGS',
  inputs: [
    { name: 'revenue', description: 'Monthly Recurring Revenue', unit: 'USD', min: 0, required: true },
    { name: 'cogs', description: 'Cost of Goods Sold', unit: 'USD', min: 0, required: true },
  ],
  formula: (revenue, cogs) => QuantisMath.round(QuantisMath.subtract(revenue, cogs)),
  confidenceWeight: 100,
  version: '1.0.0',
  lastVerified: TODAY,
  testCases: [
    { name: 'Profitable', inputs: [10000, 3000], expectedOutput: 7000 },
    { name: 'Break-even', inputs: [5000, 5000], expectedOutput: 0 },
    { name: 'Loss', inputs: [3000, 5000], expectedOutput: -2000 },
  ],
});

FormulaRegistry.register({
  id: 'gross_margin_percent',
  name: 'Gross Margin Percentage',
  description: 'Gross profit as a percentage of revenue.',
  category: 'profitability',
  criticality: 'critical',
  units: '%',
  validRange: { min: -100, max: 100 },
  formulaExpression: 'Gross_Margin% = (Gross_Profit / Revenue) × 100',
  inputs: [
    { name: 'grossProfit', description: 'Gross profit amount', unit: 'USD', required: true },
    { name: 'revenue', description: 'Total revenue', unit: 'USD', min: 0, required: true },
  ],
  formula: (grossProfit, revenue) => {
    return QuantisMath.round(QuantisMath.percentage(grossProfit, revenue));
  },
  confidenceWeight: 100,
  version: '1.0.0',
  lastVerified: TODAY,
  testCases: [
    { name: 'SaaS-like', inputs: [8000, 10000], expectedOutput: 80 },
    { name: 'Retail-like', inputs: [4500, 10000], expectedOutput: 45 },
    { name: 'Zero revenue', inputs: [0, 0], expectedOutput: 0 },
  ],
});

FormulaRegistry.register({
  id: 'net_profit',
  name: 'Operating Profit',
  description: 'Revenue minus all expenses (COGS + fixed costs + marketing). This is operating profit / EBITDA-equivalent — it does not subtract depreciation, amortization, interest, or income tax, which this engine does not model.',
  category: 'profitability',
  criticality: 'critical',
  units: 'USD',
  formulaExpression: 'Operating_Profit = MRR - Total_Expenses',
  inputs: [
    { name: 'mrr', description: 'Monthly Recurring Revenue', unit: 'USD', min: 0, required: true },
    { name: 'totalExpenses', description: 'Total monthly expenses', unit: 'USD', min: 0, required: true },
  ],
  formula: (mrr, expenses) => QuantisMath.round(QuantisMath.subtract(mrr, expenses)),
  confidenceWeight: 100,
  version: '1.0.0',
  lastVerified: TODAY,
  testCases: [
    { name: 'Profitable', inputs: [15000, 10000], expectedOutput: 5000 },
    { name: 'Loss', inputs: [8000, 12000], expectedOutput: -4000 },
    { name: 'Break-even', inputs: [10000, 10000], expectedOutput: 0 },
  ],
});

FormulaRegistry.register({
  id: 'net_margin_percent',
  name: 'Operating Margin Percentage',
  description: 'Operating profit as a percentage of revenue (see the Operating Profit formula for why this is not post-tax net margin).',
  category: 'profitability',
  criticality: 'critical',
  units: '%',
  validRange: { min: -500, max: 100 },
  formulaExpression: 'Operating_Margin% = (Operating_Profit / MRR) × 100',
  inputs: [
    { name: 'netProfit', description: 'Operating profit', unit: 'USD', required: true },
    { name: 'mrr', description: 'Monthly Recurring Revenue', unit: 'USD', min: 0, required: true },
  ],
  formula: (netProfit, mrr) => {
    return QuantisMath.round(QuantisMath.percentage(netProfit, mrr));
  },
  confidenceWeight: 100,
  version: '1.0.0',
  lastVerified: TODAY,
  testCases: [
    { name: '20% margin', inputs: [2000, 10000], expectedOutput: 20 },
    { name: 'Negative margin', inputs: [-3000, 10000], expectedOutput: -30 },
    { name: 'Zero revenue', inputs: [0, 0], expectedOutput: 0 },
  ],
});

FormulaRegistry.register({
  id: 'cogs',
  name: 'Cost of Goods Sold',
  description: 'Variable costs directly tied to revenue.',
  category: 'profitability',
  criticality: 'standard',
  units: 'USD',
  validRange: { min: 0, max: 10000000 },
  formulaExpression: 'COGS = MRR × COGS_Percent / 100',
  inputs: [
    { name: 'mrr', description: 'Monthly Recurring Revenue', unit: 'USD', min: 0, required: true },
    { name: 'cogsPercent', description: 'COGS as % of revenue', unit: '%', min: 0, max: 100, required: true },
  ],
  formula: (mrr, cogsPercent) => {
    return QuantisMath.round(QuantisMath.multiply(mrr, QuantisMath.divide(cogsPercent, 100)));
  },
  confidenceWeight: 100,
  version: '1.0.0',
  lastVerified: TODAY,
  testCases: [
    { name: 'SaaS 20% COGS', inputs: [10000, 20], expectedOutput: 2000 },
    { name: 'Retail 55% COGS', inputs: [10000, 55], expectedOutput: 5500 },
    { name: 'Zero revenue', inputs: [0, 35], expectedOutput: 0 },
  ],
});

// --- INVESTMENT ---

FormulaRegistry.register({
  id: 'payback_months',
  name: 'Payback Period',
  description: 'Months to recover initial investment from monthly net profit.',
  category: 'investment',
  criticality: 'critical',
  units: 'months',
  validRange: { min: 0, max: 999 },
  formulaExpression: 'Payback = Investment / Monthly_Net_Profit',
  inputs: [
    { name: 'investment', description: 'Startup investment', unit: 'USD', min: 0, required: true },
    { name: 'monthlyProfit', description: 'Monthly net profit', unit: 'USD', required: true },
  ],
  formula: (investment, monthlyProfit) => {
    return QuantisMath.round(QuantisMath.paybackMonths(investment, monthlyProfit));
  },
  confidenceWeight: 90,
  version: '1.0.0',
  lastVerified: TODAY,
  testCases: [
    { name: 'Normal payback', inputs: [50000, 5000], expectedOutput: 10 },
    { name: 'Quick payback', inputs: [10000, 10000], expectedOutput: 1 },
    { name: 'Unprofitable', inputs: [50000, -1000], expectedOutput: 999 },
    { name: 'Zero investment', inputs: [0, 5000], expectedOutput: 0 },
  ],
});

FormulaRegistry.register({
  id: 'roi_year1',
  name: 'Year 1 ROI',
  description: 'Return on investment for the first year: modeled Year-1 profit (6-month ramp, then growth) over investment. Same definition as the analysis engine (roi-year1.ts).',
  category: 'investment',
  criticality: 'critical',
  units: '%',
  validRange: { min: -100, max: 10000 },
  formulaExpression: ROI_YEAR1_EXPRESSION,
  inputs: [
    { name: 'steadyRevenue', description: 'Steady-state monthly revenue', unit: 'USD', required: true },
    { name: 'steadyExpenses', description: 'Steady-state monthly expenses', unit: 'USD', required: true },
    { name: 'investment', description: 'Startup investment', unit: 'USD', min: 0, required: true },
  ],
  formula: (steadyRevenue, steadyExpenses, investment) => roiYear1PercentShared(steadyRevenue, steadyExpenses, investment),
  confidenceWeight: 85,
  version: '1.0.0',
  lastVerified: TODAY,
  testCases: [
    // Expected values derived independently with Python Decimal (prec 40), not from this code.
    { name: 'Ramp model, profitable', inputs: [10000, 8000, 20000], expectedOutput: 87 },
    { name: 'Ramp model, loss-making', inputs: [10000, 12000, 30000], expectedOutput: -98 },
    { name: 'Zero investment', inputs: [10000, 8000, 0], expectedOutput: 0 },
  ],
});

FormulaRegistry.register({
  id: 'npv_3year',
  name: '3-Year Net Present Value',
  description: 'Discounted cash flow NPV over 36 months at 10% annual WACC.',
  category: 'investment',
  criticality: 'critical',
  units: 'USD',
  formulaExpression: 'NPV = -Investment + Σ(m=1→36)[NetProfit / (1 + r_monthly)^m]',
  inputs: [
    { name: 'investment', description: 'Startup investment', unit: 'USD', min: 0, required: true },
    { name: 'monthlyProfit', description: 'Monthly net profit', unit: 'USD', required: true },
  ],
  formula: (investment, monthlyProfit) => {
    return QuantisMath.round(
      QuantisMath.npv(investment, monthlyProfit, 36, 0.10)
    );
  },
  confidenceWeight: 80,
  version: '1.0.0',
  lastVerified: TODAY,
  testCases: [
    { name: 'Profitable business', inputs: [50000, 5000], expectedOutput: 105932, tolerance: 100 },
    { name: 'Unprofitable', inputs: [50000, -1000], expectedOutput: -81186, tolerance: 100 },
    { name: 'Zero investment', inputs: [0, 5000], expectedOutput: 155932, tolerance: 100 },
  ],
});

FormulaRegistry.register({
  id: 'break_even_revenue',
  name: 'Break-Even Revenue',
  description: 'Monthly revenue needed to cover all fixed costs given the contribution margin.',
  category: 'investment',
  criticality: 'standard',
  units: 'USD',
  validRange: { min: 0, max: 50000000 },
  formulaExpression: 'BER = Fixed_Costs / Contribution_Margin',
  inputs: [
    { name: 'fixedCosts', description: 'Monthly fixed costs', unit: 'USD', min: 0, required: true },
    { name: 'contributionMargin', description: 'Contribution margin fraction', min: 0, max: 1, required: true },
  ],
  formula: (fixedCosts, contributionMargin) => {
    return QuantisMath.round(QuantisMath.breakEvenRevenue(fixedCosts, contributionMargin));
  },
  confidenceWeight: 90,
  version: '1.0.0',
  lastVerified: TODAY,
  testCases: [
    { name: 'Normal break-even', inputs: [10000, 0.6], expectedOutput: 16667 },
    { name: 'High margin', inputs: [5000, 0.9], expectedOutput: 5556 },
    { name: 'Zero margin', inputs: [10000, 0], expectedOutput: 0 },
  ],
});

// --- GROWTH ---

FormulaRegistry.register({
  id: 'marketing_cost',
  name: 'Monthly Marketing Cost',
  description: 'Cost to acquire new customers to replace churned ones.',
  category: 'growth',
  criticality: 'standard',
  units: 'USD',
  validRange: { min: 0, max: 10000000 },
  formulaExpression: 'Marketing = ceil(Active_Clients × Churn_Rate) × CAC',
  inputs: [
    { name: 'activeClients', description: 'Number of active clients', min: 0, required: true },
    { name: 'churnRate', description: 'Monthly churn rate fraction', min: 0, max: 1, required: true },
    { name: 'cac', description: 'Customer Acquisition Cost', unit: 'USD', min: 0, required: true },
  ],
  formula: (activeClients, churnRate, cac) => {
    const newNeeded = QuantisMath.ceil(QuantisMath.multiply(activeClients, churnRate));
    return QuantisMath.round(QuantisMath.multiply(newNeeded, cac));
  },
  confidenceWeight: 85,
  version: '1.0.0',
  lastVerified: TODAY,
  testCases: [
    { name: 'Normal churn', inputs: [100, 0.05, 200], expectedOutput: 1000 },
    { name: 'No churn', inputs: [100, 0, 200], expectedOutput: 0 },
    { name: 'High churn', inputs: [50, 0.20, 100], expectedOutput: 1000 },
  ],
});

FormulaRegistry.register({
  id: 'location_adjusted_cost',
  name: 'Location-Adjusted Cost',
  description: 'Base cost adjusted by location cost multiplier.',
  category: 'growth',
  criticality: 'informational',
  units: 'USD',
  validRange: { min: 0, max: 50000000 },
  formulaExpression: 'Adjusted = Base_Cost × Location_Multiplier',
  inputs: [
    { name: 'baseCost', description: 'Base cost amount', unit: 'USD', min: 0, required: true },
    { name: 'locationMultiplier', description: 'Location cost multiplier', min: 0, required: true },
  ],
  formula: (baseCost, multiplier) => {
    return QuantisMath.round(QuantisMath.multiply(baseCost, multiplier));
  },
  confidenceWeight: 90,
  version: '1.0.0',
  lastVerified: TODAY,
  testCases: [
    { name: 'SF multiplier', inputs: [5000, 1.8], expectedOutput: 9000 },
    { name: 'No adjustment', inputs: [5000, 1.0], expectedOutput: 5000 },
    { name: 'Discount location', inputs: [5000, 0.6], expectedOutput: 3000 },
  ],
});

// --- MINI-DEMO (Landing Page) ---

FormulaRegistry.register({
  id: 'mini_annual_roi',
  name: 'Mini Demo Annual ROI',
  description: 'Simplified annual ROI for the landing page calculator.',
  category: 'investment',
  criticality: 'standard',
  units: '%',
  validRange: { min: -100, max: 10000 },
  formulaExpression: 'ROI = ((Monthly_Profit × 12) / Investment) × 100',
  inputs: [
    { name: 'monthlyProfit', description: 'Monthly profit (revenue - costs)', unit: 'USD', required: true },
    { name: 'investment', description: 'Initial investment', unit: 'USD', min: 0, required: true },
  ],
  formula: (monthlyProfit, investment) => {
    if (investment <= 0) return 0;
    return QuantisMath.toNumber(
      QuantisMath.multiply(
        QuantisMath.divide(QuantisMath.multiply(monthlyProfit, 12), investment),
        100
      ),
      1
    );
  },
  confidenceWeight: 95,
  version: '1.0.0',
  lastVerified: TODAY,
  testCases: [
    { name: 'Positive ROI', inputs: [2000, 10000], expectedOutput: 240.0 },
    { name: 'Negative ROI', inputs: [-500, 10000], expectedOutput: -60.0 },
    { name: 'Zero investment', inputs: [2000, 0], expectedOutput: 0 },
  ],
});

FormulaRegistry.register({
  id: 'mini_payback',
  name: 'Mini Demo Payback',
  description: 'Simplified payback months for the landing page calculator.',
  category: 'investment',
  criticality: 'standard',
  units: 'months',
  validRange: { min: 0, max: 999 },
  formulaExpression: 'Payback = Investment / Monthly_Profit (capped at 999)',
  inputs: [
    { name: 'investment', description: 'Initial investment', unit: 'USD', min: 0, required: true },
    { name: 'monthlyProfit', description: 'Monthly profit', unit: 'USD', required: true },
  ],
  formula: (investment, monthlyProfit) => {
    if (monthlyProfit <= 0) return 999;
    const raw = QuantisMath.toNumber(QuantisMath.divide(investment, monthlyProfit), 2);
    return Math.min(raw, 999);
  },
  confidenceWeight: 95,
  version: '1.0.0',
  lastVerified: TODAY,
  testCases: [
    { name: 'Normal payback', inputs: [10000, 2000], expectedOutput: 5 },
    { name: 'Zero profit', inputs: [10000, 0], expectedOutput: 999 },
    { name: 'Negative profit', inputs: [10000, -500], expectedOutput: 999 },
  ],
});

FormulaRegistry.register({
  id: 'mini_net_margin',
  name: 'Mini Demo Net Margin',
  description: 'Net margin percentage for the landing page calculator.',
  category: 'profitability',
  criticality: 'standard',
  units: '%',
  validRange: { min: -500, max: 100 },
  formulaExpression: 'Net_Margin = (Monthly_Profit / Monthly_Revenue) × 100',
  inputs: [
    { name: 'monthlyProfit', description: 'Monthly profit', unit: 'USD', required: true },
    { name: 'monthlyRevenue', description: 'Monthly revenue', unit: 'USD', min: 0, required: true },
  ],
  formula: (monthlyProfit, monthlyRevenue) => {
    return QuantisMath.toNumber(QuantisMath.percentage(monthlyProfit, monthlyRevenue), 1);
  },
  confidenceWeight: 95,
  version: '1.0.0',
  lastVerified: TODAY,
  testCases: [
    { name: '20% margin', inputs: [2000, 10000], expectedOutput: 20.0 },
    { name: 'Negative', inputs: [-3000, 10000], expectedOutput: -30.0 },
    { name: 'Zero revenue', inputs: [0, 0], expectedOutput: 0 },
  ],
});
