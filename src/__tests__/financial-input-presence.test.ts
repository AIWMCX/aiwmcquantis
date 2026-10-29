import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { hasFiniteNumber } from '../../supabase/functions/_shared/financial-inputs';
import { calculateStrictFinancials } from '../../supabase/functions/analyze-business/financial-calculator';
import {
  calculateInvestmentPaybackMonth,
  calculateOperatingBreakEvenMonth,
} from '../../supabase/functions/analyze-business/operating-projection';
import type { IndustryBenchmarks } from '../../supabase/functions/analyze-business/index';
import type { LocationMultiplierResult } from '../../supabase/functions/analyze-business/location-intelligence';

const noLocation: LocationMultiplierResult = {
  overall: 1, salary: 1, rent: 1, utility: 1, marketing: 1,
  matched: false, matchedCity: null, region: 'test', confidence: 0,
};
const zeroCostBenchmarks: IndustryBenchmarks = {
  id: 'test', name: 'Synthetic local service', cogs_percent: 0,
  salaries_fixed: 1000, rent_fixed: 100, utilities_fixed: 50, other_fixed: 50,
  cac_min: 0, cac_max: 10000, cac_typical: 100,
  average_check_min: 0, average_check_max: 10000, orders_per_client: 1,
  client_lifetime_months: 12, ltv_cac_min: 0, ltv_cac_max: 1000,
  net_margin_min: -100, net_margin_max: 100, keywords: [],
};

const analysisSource = readFileSync(
  resolve(process.cwd(), 'supabase/functions/analyze-business/index.ts'),
  'utf8',
);
const documentSource = readFileSync(
  resolve(process.cwd(), 'supabase/functions/generate-document-content/index.ts'),
  'utf8',
);
const suggestionSource = readFileSync(
  resolve(process.cwd(), 'src/components/docs/AISuggestionButton.tsx'),
  'utf8',
);
const businessPlanSource = readFileSync(
  resolve(process.cwd(), 'src/components/docs/forms/BusinessPlanForm.tsx'),
  'utf8',
);
const financialSummarySource = readFileSync(
  resolve(process.cwd(), 'src/components/analysis/FinancialSummary.tsx'),
  'utf8',
);

describe('financial input presence and provenance', () => {
  it('treats explicit zero as supplied while rejecting absent and non-finite values', () => {
    expect(hasFiniteNumber(0)).toBe(true);
    expect(hasFiniteNumber(12.5)).toBe(true);
    expect(hasFiniteNumber(undefined)).toBe(false);
    expect(hasFiniteNumber(null)).toBe(false);
    expect(hasFiniteNumber(Number.NaN)).toBe(false);
    expect(hasFiniteNumber(Number.POSITIVE_INFINITY)).toBe(false);
  });

  it('keeps explicit zero monthly costs and customer count authoritative in the real calculator', () => {
    const result = calculateStrictFinancials(
      10_000, 0, 100, 1_200, 100,
      zeroCostBenchmarks, noLocation, null,
      0, 10, 0,
    );
    expect(result.expenseSource).toBe('user');
    expect(result.totalExpenses).toBe(0);
    expect(result.expenses.marketing).toBe(0);
  });

  it('does not replace a supplied zero churn rate with a benchmark default', () => {
    const result = calculateStrictFinancials(
      10_000, 0, 100, 1_200, 100,
      zeroCostBenchmarks, noLocation, null,
      undefined, 0, 10,
    );
    const marketing = result.audit.find((entry) => entry.formula === 'Marketing = New_Clients × CAC');
    expect(marketing?.result).toBe(0);
    expect(marketing?.inputs['Monthly Churn Rate']).toBe('0.0%');
  });

  it('computes operating break-even separately from recovering startup investment', () => {
    // Existing ramp: 30%, 45%, 60%, 75%, 90%, 100%; costs are 60% fixed
    // and 40% variable during ramp. At $30k steady revenue / $22k total
    // expenses, monthly operations first turn positive in modeled month 4.
    expect(calculateOperatingBreakEvenMonth(30_000, 22_000)).toBe(4);
    expect(calculateInvestmentPaybackMonth(60_000, 30_000, 22_000)).toBe(11);
    expect(calculateOperatingBreakEvenMonth(0, 10_000)).toBeNull();
  });

  it('uses explicit user zeros before AI estimates in canonical financial inputs', () => {
    expect(analysisSource).toContain('userInputs?.monthly_revenue ?? finite(fa.mrr)');
    expect(analysisSource).toContain('userInputs?.startup_investment ?? finite(fa.startup_investment)');
    // 2026-10-29: blank CAC = industry benchmark (never the AI estimate); an explicit 0 still wins via ??.
    expect(analysisSource).toContain('userInputs?.cac ?? benchmarks.cac_typical');
    expect(analysisSource).toContain('userInputs?.average_price ?? finite(fa.average_check)');
    expect(analysisSource).toContain('Object.values(financial_inputs).filter(hasFiniteNumber)');
    expect(analysisSource).toContain('hasFiniteNumber(mergedFinancialInputs?.churn_rate)');
  });

  it('does not log raw financial inputs, source-document names, business ideas, or email addresses', () => {
    expect(analysisSource).not.toContain("log.info('User-provided inputs:', financial_inputs)");
    expect(analysisSource).not.toContain("log.info('Merged inputs:', mergedFinancialInputs)");
    expect(analysisSource).not.toContain('from ${docFin.source_document}');
    expect(analysisSource).not.toContain('idea=${idea_clean.substring');
    expect(analysisSource).not.toContain('${user.email}');
    expect(analysisSource).toContain("log.info('Financial input merge completed'");
  });

  it('keeps unavailable document metrics absent and never aliases break-even to investment payback', () => {
    expect(documentSource).toContain("revenue: getNumberField(ctx, ['revenue', 'monthly_revenue', 'mrr'])");
    expect(documentSource).toContain("payback_months: getNumberField(ctx, ['payback_months'])");
    expect(documentSource).not.toContain("['payback_months', 'break_even_months']");
    expect(documentSource).toContain('Investment Payback Period:');
    expect(suggestionSource).toContain('payback_months: readNumber(context.payback_months)');
    expect(suggestionSource).not.toContain('readNumber(context.break_even_months)');
    expect(businessPlanSource).not.toContain("form.setValue('break_even_months', data.payback_months)");
    expect(financialSummarySource).not.toContain('payback_period_months || financial.breakeven?.breakeven_months');
  });
});
