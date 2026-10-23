// Iron audit 2026-10-23: D2 (LTV uses churn), D3 (CAC 0), D4 (neutral notes), D5 (consistency).
import { describe, expect, it } from 'vitest';
import { calculateStrictFinancials } from '../../supabase/functions/analyze-business/financial-calculator';
import { formatLtvCac } from '@/lib/ltv-cac-display';
import type { IndustryBenchmarks } from '../../supabase/functions/analyze-business/index';
import type { LocationMultiplierResult } from '../../supabase/functions/analyze-business/location-intelligence';

const loc: LocationMultiplierResult = { overall: 1, salary: 1, rent: 1, utility: 1, marketing: 1, matched: false, matchedCity: null, region: 'test', confidence: 0 };
const bench: IndustryBenchmarks = {
  id: 'services', name: 'Professional services', cogs_percent: 40,
  salaries_fixed: 8000, rent_fixed: 1500, utilities_fixed: 300, other_fixed: 700,
  cac_min: 100, cac_max: 5000, cac_typical: 800, average_check_min: 200, average_check_max: 10000,
  orders_per_client: 1, client_lifetime_months: 18, ltv_cac_min: 1, ltv_cac_max: 10,
  net_margin_min: 5, net_margin_max: 25, keywords: [],
};
const run = (o: { churn?: number; cac?: number; price?: number; customers?: number; rev?: number; ltv?: number } = {}) =>
  calculateStrictFinancials(o.rev ?? 30000, 20000, o.cac ?? 500, o.ltv ?? 0, o.price ?? 3000, bench, loc, null, 22000, o.churn, o.customers ?? 10);

describe('D2 LTV follows the churn the user typed', () => {
  it('2% churn = 50-month lifetime; 10% = 10 months; none = industry 18', () => {
    expect(run({ churn: 2 }).ltv).toBe(Math.round(3000 * 0.6 * 50));
    expect(run({ churn: 10 }).ltv).toBe(Math.round(3000 * 0.6 * 10));
    expect(run({}).ltv).toBe(Math.round(3000 * 0.6 * 18));
  });
  it('0% churn is capped at 120 months, not infinite', () => {
    expect(run({ churn: 0 }).ltv).toBe(Math.round(3000 * 0.6 * 120));
  });
  it('the audit says where the lifetime came from', () => {
    const n = run({ churn: 2 }).audit.find((a) => a.formula.startsWith('LTV ='))?.notes ?? '';
    expect(n).toContain('1 ÷ your 2.0% monthly churn');
  });
});

describe('D3 LTV:CAC with a $0 CAC is not meaningful', () => {
  it('audit never prints "0x (healthy"', () => {
    const n = run({ cac: 0 }).audit.find((a) => a.formula.startsWith('LTV:CAC'))?.notes ?? '';
    expect(n).toMatch(/^Not meaningful/);
  });
  it('display helper shows n/a, and a real ratio otherwise', () => {
    expect(formatLtvCac({ cac: 0, ltv_cac_ratio: 0 })).toBe('n/a (CAC is $0)');
    expect(formatLtvCac({ cac: 500, ltv_cac_ratio: 3.6 })).toBe('3.6x');
  });
});

describe('D4 notes are neutral and keep the user figure', () => {
  it('no "unrealistically" wording; every note says the user figure is used or checks it', () => {
    for (const c of [...run({ cac: 50 }).corrections, ...run({ cac: 0 }).corrections, ...run({ price: 1 }).corrections]) {
      expect(c.reason).not.toMatch(/unrealistic/i);
      expect(c.reason).toMatch(/^Check th(is|ese) /);
    }
  });
  it('no LTV note when no LTV was supplied', () => {
    expect(run({}).corrections.some((c) => c.field === 'ltv')).toBe(false);
  });
});

describe('D5 contradictory inputs are flagged, never changed', () => {
  it('0 customers with revenue', () => {
    const r = run({ customers: 0 });
    expect(r.corrections.some((c) => c.field === 'expected_customers')).toBe(true);
    expect(r.mrr).toBe(30000);
  });
  it('price x customers far from revenue', () => {
    expect(run({ price: 1 }).corrections.some((c) => c.field === 'average_price' && /One of the three/.test(c.reason))).toBe(true);
    expect(run({ price: 3000 }).corrections.some((c) => c.field === 'average_price')).toBe(false);
  });
});
