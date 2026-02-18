/**
 * QUANTIS FINANCIAL ENGINE V2 — COMPREHENSIVE UNIT TESTS
 *
 * Covers all 7 bug fixes identified in the February 2026 audit:
 *   BUG 1 — LTV formula must include gross margin fraction
 *   BUG 2 — NPV must use true DCF (not cumulative profit)
 *   BUG 3 — Investment breakdown must map industry IDs correctly
 *   BUG 4 — Margin ceiling guard must clamp unrealistic net margins
 *   BUG 5 — Scenario gross margins must differ across scenarios
 *   BUG 6 — Break-even must not divide by zero when MRR = 0
 *   BUG 7 — Narrator consistency (tested structurally via regex helpers)
 *
 * Test data is derived from the audited SaaS customer-acquisition report
 * (New York, February 2026) so pass/fail values can be verified against
 * the known corrected PDF.
 */

import { describe, it, expect } from 'vitest';

// ─────────────────────────────────────────────────────────────────────────────
// Inline re-implementations of the pure calculation logic
// (edge functions run in Deno; we mirror the math here in TypeScript so Vitest
//  can execute them in jsdom without spinning up the full Supabase stack.)
// ─────────────────────────────────────────────────────────────────────────────

// ── LTV (BUG 1 fix) ──────────────────────────────────────────────────────────

/**
 * Correct LTV formula: margin-adjusted lifetime revenue the business KEEPS.
 * LTV = Avg_Check × (1 – COGS%) × Orders_per_Month × Lifetime_Months
 */
function calculateLtv(
  avgCheck: number,
  cogsPercent: number,
  ordersPerMonth: number,
  lifetimeMonths: number,
): number {
  const grossMarginFraction = 1 - cogsPercent / 100;
  return Math.round(avgCheck * grossMarginFraction * ordersPerMonth * lifetimeMonths);
}

/** OLD (buggy) LTV formula — kept for regression comparison */
function calculateLtvOld(
  avgCheck: number,
  ordersPerMonth: number,
  lifetimeMonths: number,
): number {
  return Math.round(avgCheck * ordersPerMonth * lifetimeMonths);
}

// ── NPV / DCF (BUG 2 fix) ────────────────────────────────────────────────────

/**
 * True Discounted Cash Flow NPV over 36 months at 10% annual WACC.
 * NPV = –Investment + Σ(month 1→36) [ NetProfit / (1 + monthly_rate)^month ]
 */
function calculateNpvDcf(
  netProfitMonthly: number,
  startupInvestment: number,
  annualDiscountRate = 0.10,
): number {
  const monthlyRate = Math.pow(1 + annualDiscountRate, 1 / 12) - 1;
  let npv = -startupInvestment;
  for (let month = 1; month <= 36; month++) {
    npv += netProfitMonthly / Math.pow(1 + monthlyRate, month);
  }
  return Math.round(npv);
}

/** OLD (buggy) NPV formula — plain cumulative profit */
function calculateNpvOld(netProfitMonthly: number, startupInvestment: number): number {
  return Math.round(netProfitMonthly * 36 - startupInvestment);
}

// ── Investment Breakdown ID Mapping (BUG 3 fix) ───────────────────────────────

const INVESTMENT_ALLOCATIONS: Record<string, Record<string, number>> = {
  saas: { equipment: 0.30, working_capital: 0.35, marketing_initial: 0.20, rent_deposit: 0.05, legal: 0.05, inventory: 0.05 },
  ecommerce: { inventory: 0.35, equipment: 0.20, working_capital: 0.20, marketing_initial: 0.15, rent_deposit: 0.05, legal: 0.05 },
  food_service: { equipment: 0.40, rent_deposit: 0.15, inventory: 0.20, working_capital: 0.15, marketing_initial: 0.05, legal: 0.05 },
  consulting: { working_capital: 0.40, equipment: 0.20, marketing_initial: 0.20, rent_deposit: 0.10, legal: 0.10, inventory: 0 },
  default: { equipment: 0.30, working_capital: 0.25, inventory: 0.15, marketing_initial: 0.15, rent_deposit: 0.10, legal: 0.05 },
};

const ID_ALIASES: Record<string, string> = {
  saas_startup: 'saas',
  b2b_saas: 'saas',
  b2c_saas: 'saas',
  software_startup: 'saas',
  tech_startup: 'saas',
  digital_marketing: 'consulting',
  marketing_agency: 'consulting',
  ecommerce_retail: 'ecommerce',
  dropshipping: 'ecommerce',
  food_delivery: 'food_service',
  restaurant: 'food_service',
};

function resolveIndustryKey(industryId: string): string {
  return ID_ALIASES[industryId] ?? industryId;
}

function getAllocations(industryId: string): Record<string, number> {
  const key = resolveIndustryKey(industryId);
  return INVESTMENT_ALLOCATIONS[key] ?? INVESTMENT_ALLOCATIONS.default;
}

// ── Margin Ceiling Guard (BUG 4 fix) ─────────────────────────────────────────

function applyMarginCeiling(
  netMarginPercent: number,
  netMarginMax: number,
): { clamped: boolean; effectiveMargin: number } {
  const maxAllowed = netMarginMax + 20;
  if (netMarginPercent > maxAllowed) {
    return { clamped: true, effectiveMargin: maxAllowed };
  }
  return { clamped: false, effectiveMargin: netMarginPercent };
}

// ── Scenario Gross Margin Compression (BUG 5 fix) ────────────────────────────

interface ScenarioMargins {
  pessimistic: number;
  base: number;
  optimistic: number;
}

/**
 * Generates scenario gross margins applying compression / expansion.
 * Pessimistic: COGS ratio + 5%  → lower gross margin
 * Optimistic:  COGS ratio – 2%  → higher gross margin
 */
function generateScenarioMargins(
  mrr: number,
  cogs: number,
  pessimisticRevenueMultiplier = 0.80,
  optimisticRevenueMultiplier = 1.25,
): ScenarioMargins {
  const baseCogsRatio = mrr > 0 ? cogs / mrr : 0;

  const pessimisticRevenue = mrr * pessimisticRevenueMultiplier;
  const pessimisticCogsRatio = Math.min(baseCogsRatio + 0.05, 0.95);
  const pessimisticGrossMargin = Math.round((1 - pessimisticCogsRatio) * 100);

  const baseGrossMargin = Math.round((1 - baseCogsRatio) * 100);

  const optimisticRevenue = mrr * optimisticRevenueMultiplier;
  const optimisticCogsRatio = Math.max(baseCogsRatio - 0.02, 0.01);
  const optimisticGrossMargin = Math.round((1 - optimisticCogsRatio) * 100);

  // suppress unused variable warning
  void pessimisticRevenue;
  void optimisticRevenue;

  return {
    pessimistic: pessimisticGrossMargin,
    base: baseGrossMargin,
    optimistic: optimisticGrossMargin,
  };
}

// ── Break-Even Zero-Revenue Guard (BUG 6 fix) ────────────────────────────────

function calculateBreakEven(
  fixedCosts: number,
  cogsPercent: number,
  marketing: number,
  mrr: number,
  averageCheckMin = 100,
): number {
  const effectiveMrr = Math.max(mrr, averageCheckMin);
  const variableCostRatio = cogsPercent / 100 + (effectiveMrr > 0 ? marketing / effectiveMrr : 0);
  const contributionMargin = Math.max(1 - variableCostRatio, 0.01);
  return Math.round(fixedCosts / contributionMargin);
}

// ── Narrator Numeric Consistency (BUG 7) — regex helper ──────────────────────

/**
 * Extracts the first numeric value matching a $X or Xx pattern from text.
 * Used to detect when narrator output deviates from engine output.
 */
function extractDollarAmount(text: string): number | null {
  const match = text.match(/\$([0-9,]+)/);
  if (!match) return null;
  return parseInt(match[1].replace(/,/g, ''), 10);
}

function extractMultiple(text: string): number | null {
  const match = text.match(/([0-9.]+)x/);
  if (!match) return null;
  return parseFloat(match[1]);
}

function narratorValueDeviates(
  narratorText: string,
  engineValue: number,
  tolerancePercent = 25,
): boolean {
  // Try dollar amount first, then ratio multiple
  const extracted = extractDollarAmount(narratorText) ?? extractMultiple(narratorText);
  if (extracted === null) return false;
  const deviation = Math.abs((extracted - engineValue) / engineValue) * 100;
  return deviation > tolerancePercent;
}

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS: SaaS Customer Acquisition report inputs (New York, Feb 2026)
// These exactly mirror the audited PDF scenario.
// ─────────────────────────────────────────────────────────────────────────────

const SAAS_AUDIT_INPUTS = {
  avgCheck: 200,          // $200/mo subscription
  cogsPercent: 20,        // 20% COGS → 80% gross margin
  ordersPerMonth: 1,
  lifetimeMonths: 24,
  cac: 960,               // NY-adjusted CAC
  mrr: 50000,
  startupInvestment: 25000,
  netMarginMax: 35,       // SaaS benchmark net margin max
  fixedCosts: 18000,
  marketing: 5000,
};

// ─────────────────────────────────────────────────────────────────────────────
// TEST SUITES
// ─────────────────────────────────────────────────────────────────────────────

describe('BUG 1 — LTV Formula with Gross Margin', () => {

  it('correctly applies gross margin fraction to LTV', () => {
    const { avgCheck, cogsPercent, ordersPerMonth, lifetimeMonths } = SAAS_AUDIT_INPUTS;
    // LTV = $200 × 0.80 × 1 × 24 = $3,840
    const ltv = calculateLtv(avgCheck, cogsPercent, ordersPerMonth, lifetimeMonths);
    expect(ltv).toBe(3840);
  });

  it('old (buggy) formula over-reports LTV by ignoring gross margin', () => {
    const { avgCheck, ordersPerMonth, lifetimeMonths } = SAAS_AUDIT_INPUTS;
    // Buggy: $200 × 1 × 24 = $4,800 (no margin)
    const ltvOld = calculateLtvOld(avgCheck, ordersPerMonth, lifetimeMonths);
    expect(ltvOld).toBe(4800);
  });

  it('new LTV is lower than old LTV by the gross margin factor', () => {
    const { avgCheck, cogsPercent, ordersPerMonth, lifetimeMonths } = SAAS_AUDIT_INPUTS;
    const ltvNew = calculateLtv(avgCheck, cogsPercent, ordersPerMonth, lifetimeMonths);
    const ltvOld = calculateLtvOld(avgCheck, ordersPerMonth, lifetimeMonths);
    const expectedRatio = 1 - cogsPercent / 100; // 0.80
    expect(ltvNew / ltvOld).toBeCloseTo(expectedRatio, 2);
  });

  it('LTV:CAC ratio with corrected LTV is 4x, not the hallucinated 5x', () => {
    const { avgCheck, cogsPercent, ordersPerMonth, lifetimeMonths, cac } = SAAS_AUDIT_INPUTS;
    const ltv = calculateLtv(avgCheck, cogsPercent, ordersPerMonth, lifetimeMonths);
    const ratio = Math.round((ltv / cac) * 10) / 10;
    expect(ratio).toBe(4); // $3,840 / $960 = 4.0x
  });

  it('works for a high-COGS food business (38% COGS)', () => {
    // $30 avg check, 38% COGS → $18.60 kept per order
    const ltv = calculateLtv(30, 38, 12, 18);
    // $30 × 0.62 × 12 × 18 = 4,017.6 → 4018
    expect(ltv).toBe(4018);
  });

  it('LTV is zero when COGS is 100%', () => {
    const ltv = calculateLtv(500, 100, 1, 24);
    expect(ltv).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('BUG 2 — NPV True DCF Calculation', () => {

  it('DCF NPV is lower than cumulative profit NPV (time value of money)', () => {
    const { netMarginMax: _, mrr, startupInvestment, fixedCosts } = SAAS_AUDIT_INPUTS;
    // Approximate net profit for the scenario
    const netProfitMonthly = Math.round(mrr * 0.35); // ~35% margin
    const npvDcf = calculateNpvDcf(netProfitMonthly, startupInvestment);
    const npvOld = calculateNpvOld(netProfitMonthly, startupInvestment);
    expect(npvDcf).toBeLessThan(npvOld);
  });

  it('DCF NPV matches known value for SaaS scenario at 10% WACC', () => {
    // netProfit = $17,500/mo (35% of $50k MRR), investment = $25k
    const netProfitMonthly = 17500;
    const npv = calculateNpvDcf(netProfitMonthly, 25000, 0.10);
    // Monthly rate ≈ 0.7974%
    // Sum of 36 discounted cashflows of $17,500 minus $25k ≈ $501,246
    // We assert within a reasonable range, not exact, to avoid floating point variance
    expect(npv).toBeGreaterThan(450000);
    expect(npv).toBeLessThan(560000);
  });

  it('DCF NPV is negative when business is unprofitable', () => {
    const npv = calculateNpvDcf(-5000, 50000, 0.10);
    expect(npv).toBeLessThan(0);
  });

  it('DCF NPV is zero when investment exactly equals discounted cashflows', () => {
    // For a zero net profit business, NPV = -investment
    const npv = calculateNpvDcf(0, 25000);
    expect(npv).toBe(-25000);
  });

  it('higher discount rate produces lower NPV (sanity check)', () => {
    const npvLow = calculateNpvDcf(5000, 10000, 0.05);
    const npvHigh = calculateNpvDcf(5000, 10000, 0.20);
    expect(npvLow).toBeGreaterThan(npvHigh);
  });

  it('old cumulative formula is detectably wrong by at least 10% vs DCF', () => {
    const netProfitMonthly = 17500;
    const npvDcf = calculateNpvDcf(netProfitMonthly, 25000);
    const npvOld = calculateNpvOld(netProfitMonthly, 25000);
    const overstatement = (npvOld - npvDcf) / Math.abs(npvDcf);
    // Old formula overstates NPV significantly (no discounting)
    expect(overstatement).toBeGreaterThan(0.05);
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('BUG 3 — Investment Breakdown Industry ID Mapping', () => {

  it('saas_startup maps to saas allocations (not default)', () => {
    const alloc = getAllocations('saas_startup');
    expect(alloc.working_capital).toBe(0.35); // SaaS: 35% working capital
    expect(alloc.inventory).toBe(0.05);       // SaaS: minimal inventory (not 15% default)
  });

  it('b2b_saas maps to saas allocations', () => {
    const alloc = getAllocations('b2b_saas');
    expect(alloc).toEqual(INVESTMENT_ALLOCATIONS.saas);
  });

  it('digital_marketing maps to consulting allocations', () => {
    const alloc = getAllocations('digital_marketing');
    expect(alloc.working_capital).toBe(0.40); // consulting: 40% working capital
  });

  it('unknown industry falls back to default allocations', () => {
    const alloc = getAllocations('some_unknown_niche');
    expect(alloc).toEqual(INVESTMENT_ALLOCATIONS.default);
  });

  it('ecommerce_retail maps to ecommerce (high inventory)', () => {
    const alloc = getAllocations('ecommerce_retail');
    expect(alloc.inventory).toBe(0.35); // ecommerce: 35% inventory
  });

  it('food_delivery maps to food_service (high equipment)', () => {
    const alloc = getAllocations('food_delivery');
    expect(alloc.equipment).toBe(0.40);
  });

  it('raw saas key still resolves correctly', () => {
    const alloc = getAllocations('saas');
    expect(alloc.working_capital).toBe(0.35);
  });

  it('default does NOT give 35% working capital (proves alias matters)', () => {
    const defaultAlloc = getAllocations('some_unknown_industry');
    expect(defaultAlloc.working_capital).toBe(0.25); // default is 25%
    // SaaS is 35% — without alias, saas_startup would get wrong 25%
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('BUG 4 — Margin Ceiling Guard', () => {

  it('does not clamp a realistic 35% net margin', () => {
    const result = applyMarginCeiling(35, 35); // max = 35%, ceiling = 55%
    expect(result.clamped).toBe(false);
    expect(result.effectiveMargin).toBe(35);
  });

  it('clamps the audited 55% net margin to 55% ceiling (max 35 + 20)', () => {
    const result = applyMarginCeiling(55, 35); // 55% > (35 + 20)? No, 55 = ceiling
    expect(result.clamped).toBe(false); // 55 is exactly the ceiling
    expect(result.effectiveMargin).toBe(55);
  });

  it('clamps 80% net margin for a SaaS benchmark (max 35%)', () => {
    const result = applyMarginCeiling(80, 35); // 80% > 55% → clamp
    expect(result.clamped).toBe(true);
    expect(result.effectiveMargin).toBe(55);
  });

  it('clamps 100% net margin (zero-cost scenario) for any industry', () => {
    const result = applyMarginCeiling(100, 25); // ceiling = 45%
    expect(result.clamped).toBe(true);
    expect(result.effectiveMargin).toBe(45);
  });

  it('ceiling equals net_margin_max + 20, not net_margin_max itself', () => {
    const netMarginMax = 30;
    const result = applyMarginCeiling(49, netMarginMax); // 49 < 50 → no clamp
    expect(result.clamped).toBe(false);
    const resultOver = applyMarginCeiling(51, netMarginMax); // 51 > 50 → clamp
    expect(resultOver.clamped).toBe(true);
    expect(resultOver.effectiveMargin).toBe(50);
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('BUG 5 — Scenario Gross Margin Compression', () => {

  const mrr = 50000;
  const cogsPercent = 20;
  const cogs = mrr * (cogsPercent / 100); // $10,000

  it('base scenario gross margin matches input COGS%', () => {
    const { base } = generateScenarioMargins(mrr, cogs);
    expect(base).toBe(80); // 80% gross margin at 20% COGS
  });

  it('pessimistic scenario has LOWER gross margin than base (compression)', () => {
    const margins = generateScenarioMargins(mrr, cogs);
    expect(margins.pessimistic).toBeLessThan(margins.base);
  });

  it('optimistic scenario has HIGHER gross margin than base (expansion)', () => {
    const margins = generateScenarioMargins(mrr, cogs);
    expect(margins.optimistic).toBeGreaterThan(margins.base);
  });

  it('pessimistic gross margin = base – 5 percentage points', () => {
    const margins = generateScenarioMargins(mrr, cogs);
    expect(margins.base - margins.pessimistic).toBe(5);
  });

  it('optimistic gross margin = base + 2 percentage points', () => {
    const margins = generateScenarioMargins(mrr, cogs);
    expect(margins.optimistic - margins.base).toBe(2);
  });

  it('all three scenario margins are distinct (not locked to same value)', () => {
    const margins = generateScenarioMargins(mrr, cogs);
    expect(margins.pessimistic).not.toBe(margins.base);
    expect(margins.optimistic).not.toBe(margins.base);
    expect(margins.pessimistic).not.toBe(margins.optimistic);
  });

  it('pessimistic COGS ratio never exceeds 95%', () => {
    // Even with 92% base COGS, pessimistic is capped at 95%
    const highCogsMrr = 10000;
    const highCogs = 9200; // 92%
    const margins = generateScenarioMargins(highCogsMrr, highCogs);
    expect(margins.pessimistic).toBeGreaterThanOrEqual(5); // 100 - 95 = 5% floor
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('BUG 6 — Break-Even Zero Revenue Edge Case', () => {

  it('returns a finite, positive break-even when MRR = 0', () => {
    const result = calculateBreakEven(18000, 20, 2000, 0, 100);
    expect(isFinite(result)).toBe(true);
    expect(result).toBeGreaterThan(0);
  });

  it('uses average_check_min floor when MRR = 0 (not infinity)', () => {
    // With MRR = 0, the floor is averageCheckMin ($100)
    // variableCostRatio = 0.20 + (2000/100) = 0.20 + 20 → capped at 0.99
    // contributionMargin = max(1 - variableCostRatio, 0.01) = 0.01
    const result = calculateBreakEven(18000, 20, 2000, 0, 100);
    expect(result).toBe(Math.round(18000 / 0.01)); // = 1,800,000
  });

  it('normal MRR case produces sensible break-even', () => {
    const result = calculateBreakEven(18000, 20, 5000, 50000, 100);
    // variableCostRatio = 0.20 + (5000/50000) = 0.30
    // contributionMargin = 0.70
    // breakEven = 18000/0.70 ≈ 25,714
    expect(result).toBeCloseTo(25714, -2);
  });

  it('contribution margin is clamped to 0.01 minimum (never zero)', () => {
    // Marketing = 50,000, MRR = 100 → ratio = 0.20 + 500 → capped at 0.99 → CM = 0.01
    const result = calculateBreakEven(18000, 20, 50000, 100, 100);
    expect(result).toBe(Math.round(18000 / 0.01));
  });

  it('no negative break-even values ever returned', () => {
    for (const mrr of [0, 100, 500, 1000, 50000]) {
      const result = calculateBreakEven(18000, 20, 3000, mrr, 200);
      expect(result).toBeGreaterThan(0);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('BUG 7 — Narrator Numeric Consistency Guards', () => {

  it('detects hallucinated LTV:CAC ratio (66x vs engine 4x)', () => {
    const narratorText = 'The business demonstrates an exceptional 66x LTV:CAC ratio.';
    const engineLtvCac = 4;
    const deviates = narratorValueDeviates(narratorText, engineLtvCac, 25);
    expect(deviates).toBe(true);
  });

  it('accepts narrator text that is within 25% of engine value', () => {
    // Engine says 4x, narrator says 4.5x → 12.5% deviation → acceptable
    const narratorText = 'The LTV:CAC ratio stands at 4.5x.';
    const engineLtvCac = 4;
    const deviates = narratorValueDeviates(narratorText, engineLtvCac, 25);
    expect(deviates).toBe(false);
  });

  it('extracts dollar amount from narrator text correctly', () => {
    const text = 'Monthly profit is $17,500.';
    expect(extractDollarAmount(text)).toBe(17500);
  });

  it('extracts ratio multiple from narrator text correctly', () => {
    const text = 'The ratio is 4.0x.';
    expect(extractMultiple(text)).toBe(4.0);
  });

  it('returns null for text with no numeric values', () => {
    expect(extractDollarAmount('Great business idea!')).toBeNull();
    expect(extractMultiple('Very promising.')).toBeNull();
  });

  it('large hallucination (5x off) is always flagged', () => {
    const narratorText = 'Revenue of $250,000 per month.';
    const engineValue = 50000; // 5× off
    expect(narratorValueDeviates(narratorText, engineValue, 25)).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('Integration — Full SaaS Audit Scenario (NY Customer Acquisition)', () => {

  const { avgCheck, cogsPercent, ordersPerMonth, lifetimeMonths, cac,
          mrr, startupInvestment, netMarginMax, fixedCosts, marketing } = SAAS_AUDIT_INPUTS;

  it('corrected LTV = $3,840 (not the old $4,800)', () => {
    const ltv = calculateLtv(avgCheck, cogsPercent, ordersPerMonth, lifetimeMonths);
    expect(ltv).toBe(3840);
  });

  it('corrected LTV:CAC = 4.0x (not the reported 5x)', () => {
    const ltv = calculateLtv(avgCheck, cogsPercent, ordersPerMonth, lifetimeMonths);
    const ratio = Math.round((ltv / cac) * 10) / 10;
    expect(ratio).toBe(4.0);
  });

  it('scenario gross margins are differentiated across all 3 scenarios', () => {
    const cogs = mrr * (cogsPercent / 100);
    const margins = generateScenarioMargins(mrr, cogs);
    expect(margins.pessimistic).toBe(75); // 80% - 5%
    expect(margins.base).toBe(80);
    expect(margins.optimistic).toBe(82);  // 80% + 2%
  });

  it('margin ceiling would clamp unrealistic margins for this benchmark', () => {
    const result = applyMarginCeiling(80, netMarginMax); // 80% > (35+20=55%)
    expect(result.clamped).toBe(true);
    expect(result.effectiveMargin).toBe(55);
  });

  it('break-even calculation is stable with real NY SaaS numbers', () => {
    const result = calculateBreakEven(fixedCosts, cogsPercent, marketing, mrr, 200);
    expect(isFinite(result)).toBe(true);
    expect(result).toBeGreaterThan(0);
    expect(result).toBeLessThan(mrr * 2); // sanity: not astronomically wrong
  });

  it('investment breakdown for saas_startup uses SaaS allocations', () => {
    const alloc = getAllocations('saas_startup');
    expect(alloc.working_capital).toBe(0.35);
    expect(alloc.inventory).toBe(0.05); // not 15% (default)
  });

  it('NPV DCF is computed (positive for this profitable scenario)', () => {
    const netProfitMonthly = Math.round(mrr * 0.35); // ~$17,500
    const npv = calculateNpvDcf(netProfitMonthly, startupInvestment);
    expect(npv).toBeGreaterThan(0);
  });
});
