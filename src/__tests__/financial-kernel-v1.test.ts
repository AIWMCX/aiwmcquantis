/**
 * Financial kernel v1 (Phase 1): golden vectors, contract rules, and parity with
 * the live engine (calculateStrictFinancials + operating-projection.ts) that
 * paying customers' reports come from. No existing call site uses the kernel yet;
 * this suite is the gate for switching them (docs/phase1/financial-kernel-plan.md).
 */
import { describe, expect, it } from 'vitest';
import Decimal from 'decimal.js';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  computeFinancialKernelV1,
  FORMULA_REGISTRY_V1,
  FORMULA_IDS,
  GOLDEN_VECTORS_V1,
  KERNEL_VERSION,
  KernelInputError,
  projectMonth,
  type KernelInputV1,
  type KernelResultV1,
} from '../../supabase/functions/_shared/financial-kernel/index.ts';
import { calculateStrictFinancials } from '../../supabase/functions/analyze-business/financial-calculator.ts';
import { projectOperatingMonth } from '../../supabase/functions/analyze-business/operating-projection.ts';
import type { IndustryBenchmarks } from '../../supabase/functions/analyze-business/index.ts';
import type { LocationMultiplierResult } from '../../supabase/functions/analyze-business/location-intelligence.ts';
import { GOLDEN_VECTORS } from '@/lib/golden-test-vectors';
import { runVectorThroughEngine } from '@/lib/golden-vector-engine-runner';
import type { StrictFinancialResult } from '../../supabase/functions/analyze-business/financial-calculator.ts';

type MetricKey = keyof KernelResultV1['metrics'];

describe('kernel v1 golden vectors', () => {
  for (const v of GOLDEN_VECTORS_V1) {
    it(v.vector_code, () => {
      const out = computeFinancialKernelV1(v.input_data);
      for (const [key, exp] of Object.entries(v.expected_ranges)) {
        const m = out.metrics[key as MetricKey];
        expect(m.status, `${key} status`).toBe('VALUE');
        const diff = new Decimal(m.value!).minus(exp!.target).abs();
        expect(diff.lte(exp!.abs_tolerance), `${key}: ${m.value} vs ${exp!.target}`).toBe(true);
      }
      for (const [key, status] of Object.entries(v.expected_statuses)) {
        const m = out.metrics[key as MetricKey];
        expect(m.status, key).toBe(status);
        if (status !== 'VALUE') {
          expect(m.value).toBeNull();
          expect(m.reasonCode).toBeTruthy();
        }
      }
    });
  }

  it('vectors have the golden_test_vectors row shape and stay candidates until reviewed', () => {
    const codes = new Set<string>();
    for (const v of GOLDEN_VECTORS_V1) {
      expect(codes.has(v.vector_code)).toBe(false);
      codes.add(v.vector_code);
      expect(v.promotion_status).toBe('candidate');
      expect(v.reviewer_finance).toBeNull();
      expect(Object.keys(v.expected_ranges).length + Object.keys(v.expected_statuses).length).toBeGreaterThan(0);
    }
  });
});

describe('kernel v1 contract', () => {
  const saas = GOLDEN_VECTORS_V1[0].input_data;

  it('is deterministic and stamps its version and formula ids', () => {
    const a = computeFinancialKernelV1(saas);
    const b = computeFinancialKernelV1({ ...saas });
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    expect(a.kernel).toEqual({ name: 'aiwmc.financial-kernel', version: KERNEL_VERSION });
    expect(a.metrics.roiYear1Percent.formulaId).toBe('roi_year1.ramp_model.v1');
    expect(a.metrics.investmentPaybackMonthsFractional.formulaId).toBe('investment_payback.cumulative_fcf.v1');
  });

  it('every value is a finite decimal string and no output carries a placeholder number', () => {
    for (const v of GOLDEN_VECTORS_V1) {
      const out = computeFinancialKernelV1(v.input_data);
      for (const [key, m] of Object.entries(out.metrics)) {
        if (m.status === 'VALUE') {
          expect(typeof m.value, key).toBe('string');
          expect(new Decimal(m.value!).isFinite(), key).toBe(true);
        } else {
          expect(m.value, key).toBeNull();
        }
      }
      // sentinel-scan-ignore: the forbidden placeholder strings are named here on purpose
      expect(JSON.stringify(out)).not.toMatch(/"999"|"Infinity"|"NaN"|"-0"/); // sentinel-scan-ignore
    }
  });

  it('rejects non-decimal inputs as caller bugs', () => {
    expect(() => computeFinancialKernelV1({ ...saas, monthlyRevenue: 'abc' })).toThrow(KernelInputError);
    expect(() => computeFinancialKernelV1({ ...saas, monthlyRevenue: '' })).toThrow(KernelInputError);
    expect(() => computeFinancialKernelV1({ ...saas, horizonMonths: 0 })).toThrow(KernelInputError);
  });

  it('negative P&L lines are INVALID_INPUTS, not silently zeroed', () => {
    const out = computeFinancialKernelV1({ ...saas, monthlyCogs: '-5' });
    expect(out.metrics.netProfit.status).toBe('INVALID_INPUTS');
    expect(out.metrics.investmentPaybackMonth.reasonCode).toBe('NEGATIVE_PNL_LINE');
    expect(out.totals.isProfitable).toBe(false);
  });

  it('caps lifetime at 120 months and flags it', () => {
    const out = computeFinancialKernelV1({ ...saas, monthlyChurnRate: '0.001' });
    expect(out.metrics.customerLifetimeMonths.value).toBe('120.0');
    expect(out.metrics.customerLifetimeMonths.flags).toContain('LIFETIME_CAPPED');
    expect(computeFinancialKernelV1({ ...saas, monthlyChurnRate: '0' }).metrics.customerLifetimeMonths.flags).toContain('ZERO_CHURN_CAPPED');
    expect(computeFinancialKernelV1({ ...saas, monthlyChurnRate: '1.5' }).metrics.customerLifetimeMonths.status).toBe('INVALID_INPUTS');
  });

  it('echoes provenance without reading it', () => {
    const prov = { monthlyRevenue: 'customer_input', cac: 'benchmark' };
    const a = computeFinancialKernelV1({ ...saas, provenance: prov });
    expect(a.provenance).toEqual(prov);
    const { provenance: _p, ...rest } = a;
    const { provenance: _q, ...restNoProv } = computeFinancialKernelV1(saas);
    expect(rest).toEqual(restNoProv);
  });

  it('honours an explicit discount rate and NPV horizon', () => {
    const zero = computeFinancialKernelV1({ ...saas, annualDiscountRate: '0', npvHorizonMonths: 12 });
    expect(zero.metrics.npv.value).toBe(new Decimal(20264).times(12).minus(150000).toFixed(2));
    expect(computeFinancialKernelV1({ ...saas, annualDiscountRate: '-1' }).metrics.npv.status).toBe('INVALID_INPUTS');
  });

  it('formula registry rows cover every formula id the kernel emits', () => {
    const registered = new Set(FORMULA_REGISTRY_V1.map((r) => r.formula_id));
    for (const id of Object.values(FORMULA_IDS)) expect(registered.has(id), id).toBe(true);
    for (const r of FORMULA_REGISTRY_V1) {
      expect(r.formula_id).toMatch(/\.v\d+$/);
      expect(r.metric_code).toMatch(/^[a-z0-9_]+$/);
    }
  });

  it('imports nothing runtime-specific', () => {
    const dir = resolve(__dirname, '../../supabase/functions/_shared/financial-kernel');
    for (const f of ['kernel.ts', 'decimal.ts', 'projection.ts', 'version.ts', 'golden-vectors.v1.ts', 'index.ts']) {
      const src = readFileSync(resolve(dir, f), 'utf8');
      const specifiers = [...src.matchAll(/from\s+['"]([^'"]+)['"]/g)].map((m) => m[1]);
      for (const s of specifiers) expect(s === 'npm:decimal.js@10.4.3' || s.startsWith('./'), `${f}: ${s}`).toBe(true);
      expect(src).not.toMatch(/\bDeno\.|process\.env|import\.meta\.env|window\./);
    }
  });
});

describe('kernel v1 projection matches operating-projection.ts', () => {
  it.each([1, 2, 6, 7, 12, 36, 60])('month %i', (m) => {
    const live = projectOperatingMonth(50000, 29736, m);
    const k = projectMonth(new Decimal(50000) as never, new Decimal(29736) as never, m);
    expect(Math.abs(Number(k.revenue) - live.revenue)).toBeLessThan(1e-6);
    expect(Math.abs(Number(k.expenses) - live.expenses)).toBeLessThan(1e-6);
  });
});

// ── Parity with the live engine ───────────────────────────────────────────

/** Kernel input built from the P&L lines the live engine resolved. */
function kernelInputFromLive(calc: StrictFinancialResult, unitGrossMarginRatio: string, churn: string | null, ordersPerCustomer: number): KernelInputV1 {
  const fixed = calc.expenses.salaries + calc.expenses.rent + calc.expenses.utilities + calc.expenses.other;
  return {
    monthlyRevenue: String(calc.mrr),
    monthlyCogs: String(calc.expenses.cogs),
    monthlyVariableOpex: String(calc.expenses.marketing),
    monthlyFixedCosts: String(fixed),
    startupInvestment: String(calc.startupInvestment),
    unitPrice: String(calc.averageCheck),
    // calc.ordersMonthly is orders across all customers; the kernel wants per customer.
    ordersPerCustomerPerMonth: String(ordersPerCustomer),
    unitGrossMarginRatio,
    monthlyChurnRate: churn,
    cac: String(calc.cac),
    targetMonthlyProfit: '45000',
  };
}

const roundNum = (v: string | null) => (v == null ? null : Math.round(Number(v)));

/** Compares kernel output to the live engine on every metric both compute the same way. */
function expectParity(calc: StrictFinancialResult, k: KernelResultV1, label: string) {
  const m = k.metrics;
  // Some live revenues are unrounded floats (e.g. 4333.333…); the kernel reports cents.
  expect(Math.abs(Number(m.netProfit.value) - calc.netProfit), `${label} net`).toBeLessThanOrEqual(0.005);
  expect(Math.abs(Number(k.totals.monthlyTotalExpenses) - calc.totalExpenses), `${label} total`).toBeLessThanOrEqual(0.005);
  expect(Math.round(Number(m.grossMarginRatio.value) * 100), `${label} GM%`).toBe(calc.grossMarginPercent);
  expect(Math.round(Number(m.netMarginRatio.value) * 100), `${label} NM%`).toBe(calc.netMarginPercent);
  // Live floors the contribution ratio at 1%; the kernel reports NOT_ACHIEVABLE instead (plan §5, change K3).
  if (m.breakEvenRevenue.status === 'VALUE') {
    expect(roundNum(m.breakEvenRevenue.value), `${label} BER`).toBe(calc.breakEvenRevenue);
    expect(roundNum(m.revenueForTargetProfit.value), `${label} rev45k`).toBe(calc.revenueFor45kProfit);
  }
  expect(m.operatingBreakEvenMonth.status === 'VALUE' ? Number(m.operatingBreakEvenMonth.value) : null, `${label} BE month`)
    .toBe(calc.breakEvenMonths);
  if (calc.startupInvestment > 0) {
    const livePayback = calc.paybackMonths;
    const kernelPayback = m.investmentPaybackMonth.status === 'VALUE' ? Number(m.investmentPaybackMonth.value) : null;
    expect(kernelPayback ?? 999, `${label} payback`).toBe(livePayback); // sentinel-scan-ignore: live engine's placeholder
    expect(roundNum(m.roiYear1Percent.value), `${label} ROI`).toBe(calc.roiYear1Percent);
    if (calc.paybackResult?.status === 'VALUE') {
      expect(Number(m.investmentPaybackMonthsFractional.value), `${label} payback frac`).toBeCloseTo(Number(calc.paybackResult.months), 2);
    }
  }
  if (calc.npv3Years !== undefined) {
    expect(Math.abs(Number(m.npv.value) - calc.npv3Years), `${label} NPV`).toBeLessThanOrEqual(1);
  }
}

const NO_LOCATION: LocationMultiplierResult = {
  overall: 1, salary: 1, rent: 1, utility: 1, marketing: 1, matched: false, matchedCity: null, region: 'default', confidence: 0,
};
function bench(o: Partial<IndustryBenchmarks> & { name: string }): IndustryBenchmarks {
  return {
    id: o.name, cac_min: 0, cac_max: 999999, cac_typical: 0, average_check_min: 0, average_check_max: 999999,
    orders_per_client: 1, client_lifetime_months: 12, ltv_cac_min: 0, ltv_cac_max: 999, net_margin_min: -100, net_margin_max: 100,
    cogs_percent: 0, salaries_fixed: 0, rent_fixed: 0, utilities_fixed: 0, other_fixed: 0, keywords: [], ...o,
  };
}

// Same five inputs as src/__tests__/golden-cases.test.ts.
const LIVE_CASES = [
  { name: 'saas_b2b', args: [50000, 150000, 800, 8640, 450] as const, b: { cogs_percent: 20, salaries_fixed: 12000, rent_fixed: 2000, utilities_fixed: 500, other_fixed: 1500, cac_min: 300, cac_max: 3000, cac_typical: 800, average_check_min: 50, average_check_max: 500, orders_per_client: 1, client_lifetime_months: 24, ltv_cac_min: 3, ltv_cac_max: 6, net_margin_min: 10, net_margin_max: 30 } },
  { name: 'professional_services', args: [50000, 80000, 2000, 40800, 4000] as const, b: { cogs_percent: 15, salaries_fixed: 18000, rent_fixed: 2500, utilities_fixed: 500, other_fixed: 1500, cac_min: 800, cac_max: 6000, cac_typical: 2000, average_check_min: 1000, average_check_max: 15000, orders_per_client: 1, client_lifetime_months: 12, ltv_cac_min: 2, ltv_cac_max: 25, net_margin_min: 8, net_margin_max: 25 } },
  { name: 'restaurant', args: [60000, 220000, 25, 1567, 32] as const, b: { cogs_percent: 32, salaries_fixed: 14000, rent_fixed: 8000, utilities_fixed: 1800, other_fixed: 2200, cac_min: 5, cac_max: 60, cac_typical: 20, average_check_min: 15, average_check_max: 60, orders_per_client: 4, client_lifetime_months: 18, ltv_cac_min: 3, ltv_cac_max: 70, net_margin_min: 3, net_margin_max: 12 } },
  { name: 'retail_ecommerce', args: [50000, 100000, 35, 1609, 65] as const, b: { cogs_percent: 45, salaries_fixed: 9000, rent_fixed: 4000, utilities_fixed: 700, other_fixed: 1800, cac_min: 10, cac_max: 80, cac_typical: 30, average_check_min: 30, average_check_max: 150, orders_per_client: 3, client_lifetime_months: 15, ltv_cac_min: 2, ltv_cac_max: 50, net_margin_min: 4, net_margin_max: 15 } },
  { name: 'marketplace_two_sided', args: [45000, 180000, 70, 3240, 90] as const, b: { cogs_percent: 10, salaries_fixed: 22000, rent_fixed: 2500, utilities_fixed: 600, other_fixed: 3000, cac_min: 20, cac_max: 200, cac_typical: 60, average_check_min: 40, average_check_max: 300, orders_per_client: 2, client_lifetime_months: 20, ltv_cac_min: 3, ltv_cac_max: 50, net_margin_min: 5, net_margin_max: 20 } },
];

describe('kernel v1 parity with calculateStrictFinancials (golden cases)', () => {
  for (const c of LIVE_CASES) {
    it(c.name, () => {
      const b = bench({ name: c.name, ...c.b });
      const calc = calculateStrictFinancials(...c.args, b, NO_LOCATION, null);
      const k = computeFinancialKernelV1(kernelInputFromLive(calc, String(1 - b.cogs_percent / 100), String(1 / b.client_lifetime_months), b.orders_per_client));
      expectParity(calc, k, c.name);
      expect(roundNum(k.metrics.ltv.value), 'LTV').toBe(calc.ltv);
      expect(Number(new Decimal(k.metrics.ltvCacRatio.value!).toDecimalPlaces(1)), 'LTV:CAC').toBe(calc.ltvCacRatio);
    });
  }
});

describe('kernel v1 parity with calculateStrictFinancials (10 range vectors)', () => {
  for (const vector of GOLDEN_VECTORS) {
    it(vector.vectorCode, () => {
      const { calc } = runVectorThroughEngine(vector);
      const k = computeFinancialKernelV1(kernelInputFromLive(calc, '0.5', null, 1));
      const lineSum = calc.expenses.cogs + calc.expenses.marketing + calc.expenses.salaries + calc.expenses.rent + calc.expenses.utilities + calc.expenses.other;
      // When a user total is below COGS the live engine caps COGS for margins; the
      // caller must pass the capped line (plan §4). None of the vectors hit that case.
      expect(lineSum).toBe(calc.totalExpenses);
      expectParity(calc, k, vector.vectorCode);
    });
  }
});
