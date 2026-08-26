/**
 * Pure reshape of a `StrictFinancialResult` (the raw calculator output) into
 * the `financial_analysis` wire shape every analysis-depth endpoint returns.
 *
 * Extracted from `transformResponse()` in `index.ts` (Phase D, 2026-08-01) so
 * `run-scenario` can produce output in the EXACT same shape as a live
 * analysis without duplicating this logic — the two paths can never drift in
 * field naming. No behavior change versus the inline version it replaced.
 */
import { checkScenarioMonotonicity, checkFinancialInvariants } from './payback-contract.ts';
import { QMath } from './quantis-math-server.ts';
import type { StrictFinancialResult } from './financial-calculator.ts';
import type { IndustryBenchmarks } from './index.ts';

// Maps industry IDs to the appropriate label for COGS in reports.
// Software companies don't have "inventory" — they have infrastructure/hosting costs.
const INDUSTRY_COGS_LABELS: Record<string, string> = {
  saas: 'infrastructure_and_hosting',
  fintech: 'infrastructure_and_hosting',
  education: 'content_and_platform',
  media: 'content_production',
  consulting: 'service_delivery',
  healthcare: 'medical_supplies',
  fitness: 'equipment_and_supplies',
  food_service: 'inventory_replenishment',
  ecommerce: 'inventory_replenishment',
  logistics: 'fleet_and_fuel',
  real_estate: 'property_costs',
  general: 'cost_of_goods_sold',
};

// Maps industry IDs to investment categories (no "inventory" for software).
const INDUSTRY_INVESTMENT_CATEGORIES: Record<string, { labels: Record<string, number> }> = {
  saas: { labels: { product_development: 0.40, cloud_infrastructure: 0.15, legal: 0.05, marketing_initial: 0.10 } },
  fintech: { labels: { product_development: 0.35, compliance_and_licensing: 0.15, cloud_infrastructure: 0.10, legal: 0.10, marketing_initial: 0.10 } },
  consulting: { labels: { office_setup: 0.20, tools_and_software: 0.15, legal: 0.10, marketing_initial: 0.15 } },
  education: { labels: { content_development: 0.35, platform_setup: 0.15, legal: 0.05, marketing_initial: 0.15 } },
};

export interface ShapeFinancialAnalysisResult {
  // deno-lint-ignore no-explicit-any
  financialAnalysis: Record<string, any>;
  scenarioContradictions: Array<{ code: string; message: string }>;
}

export function shapeFinancialAnalysis(
  calc: StrictFinancialResult,
  benchmarks: IndustryBenchmarks,
  log: { warn: (msg: string) => void } = console,
): ShapeFinancialAnalysisResult {
  let scenarioContradictions: Array<{ code: string; message: string }> = [];

  const calculationsSummary = `
## Financial Calculations Audit

### Input Data
- Revenue (MRR): $${calc.mrr.toLocaleString()}
- Investment: $${calc.startupInvestment.toLocaleString()}
- Average Check: $${calc.averageCheck}
- CAC: $${calc.cac}
- LTV: $${calc.ltv.toLocaleString()}
- Industry: ${calc.industryDetected}

### Expense Structure
| Category | Amount | % of Revenue |
|----------|--------|--------------|
| COGS | $${calc.expenses.cogs.toLocaleString()} | ${Math.round(calc.expenses.cogs / calc.mrr * 100)}% |
| Salaries | $${calc.expenses.salaries.toLocaleString()} | ${Math.round(calc.expenses.salaries / calc.mrr * 100)}% |
| Rent | $${calc.expenses.rent.toLocaleString()} | ${Math.round(calc.expenses.rent / calc.mrr * 100)}% |
| Utilities | $${calc.expenses.utilities.toLocaleString()} | ${Math.round(calc.expenses.utilities / calc.mrr * 100)}% |
| Marketing | $${calc.expenses.marketing.toLocaleString()} | ${Math.round(calc.expenses.marketing / calc.mrr * 100)}% |
| Other | $${calc.expenses.other.toLocaleString()} | ${Math.round(calc.expenses.other / calc.mrr * 100)}% |
| **TOTAL** | **$${calc.totalExpenses.toLocaleString()}** | **${Math.round(calc.totalExpenses / calc.mrr * 100)}%** |

### Profit Calculation
**Profit = Revenue - Expenses**
$${calc.mrr.toLocaleString()} - $${calc.totalExpenses.toLocaleString()} = **$${calc.netProfit.toLocaleString()}** ${calc.isProfitable ? '✓' : '❌ LOSS'}

### Key Metrics
- **Net Margin:** ${calc.netMarginPercent}% ${calc.netMarginPercent >= benchmarks.net_margin_min ? '✓' : '⚠'}
- **LTV:CAC:** ${calc.ltvCacRatio}x ${calc.ltvCacRatio >= benchmarks.ltv_cac_min ? '✓' : '⚠'}
- **Payback:** ${calc.paybackMonths === 999 ? 'never' : calc.paybackMonths + ' months'}
- **Year 1 ROI:** ${calc.roiYear1Percent}%

### Break-even Points
- **For zero profit:** $${calc.breakEvenRevenue.toLocaleString()}/mo
- **For $45k profit:** $${calc.revenueFor45kProfit.toLocaleString()}/mo

### Formula Audit
${calc.audit.map(a => `- ${a.formula}: ${a.notes}`).join('\n')}
`.trim();

  const financialAnalysis = {
    inputs: {
      price_per_unit: calc.averageCheck,
      units_sold_monthly: calc.ordersMonthly,
      purchase_frequency: benchmarks.orders_per_client,
      upsell_per_customer: 0,
      cogs_per_unit: Math.round(calc.averageCheck * (benchmarks.cogs_percent / 100)),
      fixed_opex: calc.expenses.salaries + calc.expenses.rent + calc.expenses.utilities + calc.expenses.other,
      marketing_budget: calc.expenses.marketing,
      cac: calc.cac,
      startup_investment: calc.startupInvestment,
      capex: Math.round(calc.startupInvestment * 0.45),
      ltv: calc.ltv,
      churn_rate: Math.round(100 / benchmarks.client_lifetime_months) / 100
    },
    mrr: calc.mrr,
    arr: calc.mrr * 12,
    scenarios: (() => {
      // CRITICAL FIX: Calculate expenses from breakdown, not calc.totalExpenses
      const fixedCosts = calc.expenses.salaries + calc.expenses.rent + calc.expenses.utilities + calc.expenses.other;
      const baseCogsPercent = calc.mrr > 0 ? calc.expenses.cogs / calc.mrr : 0;
      const baseVariableCosts = calc.expenses.cogs + calc.expenses.marketing;
      const baseTotalExpensesItemized = fixedCosts + baseVariableCosts;
      // RECONCILIATION FIX (P0, 2026-08-03): calc.totalExpenses is the
      // engine's authoritative expense figure (it may come directly from a
      // single user-provided monthly-cost total rather than the itemized
      // fixed/COGS/marketing breakdown above — see calc.expenseSource). When
      // the two diverge, pessimistic/optimistic scenarios previously computed
      // net_profit from the unreconciled itemized total while base.net_profit
      // was already patched to read calc.netProfit directly (see the 2026-08-01
      // fix below) — so a real, unrelated report showed optimistic revenue
      // scaled up 25% but net_profit computed against a cost base that could
      // be roughly double the user's actual reported total, making optimistic
      // profit look worse than base purely from this scale mismatch, not from
      // any genuine cost-scaling assumption. Rescaling pessimistic/optimistic
      // total expenses by the same ratio anchors both to the same reconciled
      // cost base base.net_profit already uses, while leaving gross_profit/
      // gross_margin (driven only by the COGS ratio assumption, not the
      // itemized/authoritative expense divergence) untouched.
      const expenseReconciliationScale = baseTotalExpensesItemized > 0
        ? calc.totalExpenses / baseTotalExpensesItemized
        : null;
      // Degenerate fallback: when the itemized breakdown is entirely zero
      // (no cost basis to scale a ratio from) but calc.totalExpenses is
      // non-zero, scaling by revenue ratio keeps pessimistic/optimistic
      // costs proportional to calc.totalExpenses (the reconciled figure
      // base.net_profit already uses) instead of leaving them computed
      // from an unrelated, disconnected itemized total of zero.
      const reconcileExpenses = (itemizedTotal: number, scenarioRevenue: number): number =>
        expenseReconciliationScale !== null
          ? Math.round(itemizedTotal * expenseReconciliationScale)
          : Math.round(calc.totalExpenses * (calc.mrr > 0 ? scenarioRevenue / calc.mrr : 1));

      // Pessimistic scenario: 20% less revenue + margin COMPRESSION (+5% COGS ratio)
      const pessRevenue = Math.round(calc.mrr * 0.8);
      const pessCogsRatio = Math.min(baseCogsPercent + 0.05, 0.95);
      const pessCogs = Math.round(pessRevenue * pessCogsRatio);
      const pessMarketing = Math.round(calc.expenses.marketing * 0.85);
      const pessFixed = Math.round(fixedCosts * 1.05);
      const pessTotalExpensesItemized = pessCogs + pessMarketing + pessFixed;
      const pessTotalExpenses = reconcileExpenses(pessTotalExpensesItemized, pessRevenue);
      const pessNetProfit = pessRevenue - pessTotalExpenses;
      const pessGrossProfit = pessRevenue - pessCogs;
      const pessNetMargin = pessRevenue > 0 ? Math.round((pessNetProfit / pessRevenue) * 100) : 0;
      const pessGrossMargin = pessRevenue > 0 ? Math.round((pessGrossProfit / pessRevenue) * 100) : 0;

      // Optimistic scenario: 25% more revenue + margin EXPANSION (-2% COGS ratio)
      const optRevenue = Math.round(calc.mrr * 1.25);
      const optCogsRatio = Math.max(baseCogsPercent - 0.02, 0.01);
      const optCogs = Math.round(optRevenue * optCogsRatio);
      const optMarketing = Math.round(calc.expenses.marketing * 1.20);
      const optFixed = Math.round(fixedCosts * 0.95);
      const optTotalExpensesItemized = optCogs + optMarketing + optFixed;
      const optTotalExpenses = reconcileExpenses(optTotalExpensesItemized, optRevenue);
      const optNetProfit = optRevenue - optTotalExpenses;
      const optGrossProfit = optRevenue - optCogs;
      const optNetMargin = optRevenue > 0 ? Math.round((optNetProfit / optRevenue) * 100) : 0;
      const optGrossMargin = optRevenue > 0 ? Math.round((optGrossProfit / optRevenue) * 100) : 0;

      const builtScenarios = {
        pessimistic: {
          revenue: pessRevenue,
          variable_costs: pessCogs + pessMarketing,
          fixed_costs: pessFixed,
          gross_profit: pessGrossProfit,
          net_profit: pessNetProfit,
          gross_margin: pessGrossMargin,
          net_margin: pessNetMargin
        },
        base: {
          revenue: calc.mrr,
          variable_costs: baseVariableCosts,
          fixed_costs: fixedCosts,
          gross_profit: calc.grossProfit,
          // FIXED (P0, 2026-08-01): previously re-derived from the itemized
          // breakdown (fixedCosts + variableCosts), which silently diverges
          // from calc.netProfit/calc.totalExpenses whenever the itemized
          // sum doesn't match the user-provided total monthly cost (the
          // engine's own authoritative expense figure — see calc.expenseSource
          // and the "Expense mismatch detected" warning elsewhere in this
          // file). scenarios.base must report the SAME net profit the engine
          // itself computed, matching how gross_profit/gross_margin already
          // read straight from calc. Caught via a real production analysis
          // where scenarios.base.net_profit and calc.netProfit disagreed
          // ($-7,407 vs $-3,798) for the identical inputs.
          net_profit: calc.netProfit,
          gross_margin: calc.grossMarginPercent,
          net_margin: calc.netMarginPercent
        },
        optimistic: {
          revenue: optRevenue,
          variable_costs: optCogs + optMarketing,
          fixed_costs: optFixed,
          gross_profit: optGrossProfit,
          net_profit: optNetProfit,
          gross_margin: optGrossMargin,
          net_margin: optNetMargin
        }
      };

      try {
        const monotonicityIssues = checkScenarioMonotonicity(builtScenarios);
        scenarioContradictions = monotonicityIssues;
        for (const issue of monotonicityIssues) {
          log.warn(`⚠️ Scenario monotonicity [${issue.code}]: ${issue.message}`);
        }
      } catch (monotonicityErr) {
        log.warn(`Scenario monotonicity check failed (non-fatal): ${String(monotonicityErr)}`);
      }

      // GTM-audit item #1 (2026-08-25): unlike monotonicity above, these are
      // unconditional mathematical impossibilities (operating_profit can
      // never exceed gross_profit, gross_profit can never exceed revenue) --
      // the exact class of contradiction that shipped live in the CashMatch
      // AI incident. index.ts escalates any of these to report_integrity =
      // 'BLOCK' unconditionally (see the CRITICAL_RECONCILIATION_RULES
      // escalation), unlike monotonicity issues which stay informational.
      try {
        const invariantIssues = checkFinancialInvariants(builtScenarios);
        scenarioContradictions = [...scenarioContradictions, ...invariantIssues];
        for (const issue of invariantIssues) {
          log.error(`🛑 Financial invariant violated [${issue.code}]: ${issue.message}`);
        }
      } catch (invariantErr) {
        log.warn(`Financial invariant check failed (non-fatal): ${String(invariantErr)}`);
      }

      return builtScenarios;
    })(),
    unit_economics: {
      contribution_margin: Math.round(calc.averageCheck - calc.averageCheck * (benchmarks.cogs_percent / 100)),
      contribution_margin_ratio: (100 - benchmarks.cogs_percent) / 100,
      cac: calc.cac,
      cac_payback_months: QMath.roundTo(QMath.cacPaybackMonths(calc.cac, calc.averageCheck, (100 - benchmarks.cogs_percent) / 100), 1),
      ltv: calc.ltv,
      ltv_cac_ratio: calc.ltvCacRatio
    },
    cvp: calc.cvp,
    profitability_margins: calc.profitabilityMargins,
    leverage_ratios: calc.leverageRatios,
    breakeven: {
      breakeven_units: Math.ceil(calc.breakEvenRevenue / Math.max(calc.averageCheck, 1)),
      breakeven_revenue: calc.breakEvenRevenue,
      breakeven_months: calc.isProfitable ? Math.min(calc.paybackMonths, 24) : 0
    },
    returns: {
      payback_period_months: calc.paybackMonths,
      investment_payback_result: calc.paybackResult,
      roi_year_1: calc.roiYear1Percent,
      roi_year_3: Math.round((calc.netProfit * 36 / Math.max(calc.startupInvestment, 1)) * 100),
      npv_3_years: (() => {
        const monthlyRate = Math.pow(1.10, 1 / 12) - 1;
        let npv = -calc.startupInvestment;
        for (let m = 1; m <= 36; m++) {
          npv += calc.netProfit / Math.pow(1 + monthlyRate, m);
        }
        return Math.round(npv);
      })(),
    },
    startup_investment: (() => {
      const total = calc.startupInvestment;
      const industryCategories = INDUSTRY_INVESTMENT_CATEGORIES[benchmarks.id];

      if (industryCategories) {
        const breakdown: Record<string, number> = {};
        let allocated = 0;
        for (const [label, pct] of Object.entries(industryCategories.labels)) {
          breakdown[label] = Math.round(total * pct);
          allocated += breakdown[label];
        }
        breakdown.working_capital = total - allocated;
        if (breakdown.working_capital < 0) breakdown.working_capital = 0;

        const breakdownSum = Object.values(breakdown).reduce((a, b) => a + b, 0);
        if (breakdownSum !== total) {
          breakdown.working_capital += (total - breakdownSum);
        }

        return { total, breakdown, reasoning: `Industry-specific ${benchmarks.name} investment allocation` };
      }

      const rentDeposit = Math.round(calc.expenses.rent * 2);
      const equipment = Math.round(total * 0.40);
      const inventory = Math.round(total * 0.15);
      const legal = Math.min(2000, Math.round(total * 0.05));
      const marketingInitial = Math.round(total * 0.10);
      const workingCapital = total - rentDeposit - equipment - inventory - legal - marketingInitial;

      const breakdown: Record<string, number> = {
        rent_deposit: rentDeposit,
        equipment: equipment,
        inventory: inventory,
        legal: legal,
        marketing_initial: marketingInitial,
        working_capital: Math.max(0, workingCapital)
      };

      const breakdownSum = Object.values(breakdown).reduce((a, b) => a + b, 0);
      if (breakdownSum !== total) {
        breakdown.working_capital += (total - breakdownSum);
      }

      return {
        total,
        breakdown,
        reasoning: `Investment $${total.toLocaleString()}: equipment 40%, inventory 15%, working capital ${Math.round(Math.max(0, workingCapital) / total * 100)}%, marketing 10%, deposit & legal ${Math.round((rentDeposit + legal) / total * 100)}%`
      };
    })(),
    monthly_expenses: (() => {
      const cogsLabel = INDUSTRY_COGS_LABELS[benchmarks.id] || INDUSTRY_COGS_LABELS.general;
      const rawBreakdown: Record<string, number> = {
        rent: calc.expenses.rent,
        utilities: calc.expenses.utilities,
        salaries: calc.expenses.salaries,
        [cogsLabel]: calc.expenses.cogs,
        marketing: calc.expenses.marketing,
        other: calc.expenses.other
      };

      const breakdownSum = Object.values(rawBreakdown).reduce((a, b) => a + b, 0);
      const isReconciled = Math.abs(breakdownSum - calc.totalExpenses) > 1;

      // RECONCILIATION FIX (P0, 2026-08-24): when calc.totalExpenses came
      // from a user-provided monthly-cost override (calc.expenseSource ===
      // 'user') smaller than the itemized/benchmark-derived breakdown --
      // most commonly because the user's figure didn't account for a large
      // COGS-equivalent category like SaaS infrastructure/hosting -- this
      // table previously displayed the UNRECONCILED itemized sum while
      // scenarios.base.net_profit (and every profit/margin figure in the
      // report) correctly used the smaller, authoritative calc.totalExpenses.
      // A real production report showed "Infrastructure And Hosting
      // $51,187 / Total Monthly $61,943" next to "Operating Profit $71,360"
      // (86% margin) on $82,560 revenue -- mathematically impossible unless
      // the true deducted cost base was actually ~$11,200, not $61,943.
      // Apply the SAME proportional reconciliation already used for the
      // pessimistic/optimistic scenarios above, so every cost figure in the
      // report is consistent with the profit figure it implies.
      const reconciliationScale = breakdownSum > 0 ? calc.totalExpenses / breakdownSum : 1;
      const breakdown: Record<string, number> = isReconciled
        ? Object.fromEntries(Object.entries(rawBreakdown).map(([k, v]) => [k, Math.round(v * reconciliationScale)]))
        : rawBreakdown;

      if (isReconciled) {
        log.warn(`⚠️ Expense mismatch detected: itemized breakdown sum=$${breakdownSum}, calc.totalExpenses=$${calc.totalExpenses} (source: ${calc.expenseSource}). Reconciled breakdown proportionally to match the authoritative total that profit figures use.`);
      }

      return {
        total: calc.totalExpenses,
        variable_costs: Math.round((calc.expenses.cogs + calc.expenses.marketing) * reconciliationScale),
        fixed_costs: Math.round((calc.expenses.salaries + calc.expenses.rent + calc.expenses.utilities + calc.expenses.other) * reconciliationScale),
        breakdown
      };
    })(),
    risk_analysis: {
      revenue_drop_20: {
        scenario: "Revenue drops 20%",
        description: "Demand decline, seasonality, or competition",
        impact_on_revenue: -20,
        impact_on_costs: 0,
        resulting_profit: Math.round((calc.mrr * 0.8) - calc.totalExpenses * 0.95),
        probability: "medium" as const
      },
      costs_rise_15: {
        scenario: "Costs increase 15%",
        description: "Inflation, supplier price increases, rent hikes",
        impact_on_revenue: 0,
        impact_on_costs: 15,
        resulting_profit: Math.round(calc.mrr - calc.totalExpenses * 1.15),
        probability: "high" as const
      },
      cac_doubles: {
        scenario: "CAC doubles",
        description: "Increased ad competition, market saturation",
        impact_on_revenue: 0,
        impact_on_costs: 0,
        resulting_profit: Math.round(calc.netProfit - calc.expenses.marketing),
        probability: "medium" as const
      },
      churn_increase: {
        scenario: "Churn increases 50%",
        description: "Quality issues, competitor offers, market shift",
        impact_on_revenue: -15,
        impact_on_costs: 0,
        resulting_profit: Math.round((calc.mrr * 0.85) - calc.totalExpenses),
        probability: "medium" as const
      }
    },
    calculations_summary: calculationsSummary,
    industry_detected: calc.industryDetected
  };

  return { financialAnalysis, scenarioContradictions };
}
