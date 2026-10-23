// Iron stress test (2026-10-23): 10 categories x 10 adversarial cases through the
// real production calculator, 12 finance invariants each. Violations are
// collected into a report (OS temp dir) and the test fails if any exist.
import { describe, it, expect } from 'vitest';
import { writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { calculateStrictFinancials } from '../../supabase/functions/analyze-business/financial-calculator';
import { roiYear1Percent } from '../../supabase/functions/analyze-business/roi-year1';
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

type Case = { cat: string; rev: number; costs: number; inv: number; cac: number; price: number; customers: number; churn: number };
const cases: Case[] = [];
const add = (cat: string, xs: Array<Partial<Case>>) => xs.forEach((x) => cases.push({ cat, rev: 30000, costs: 22000, inv: 20000, cac: 500, price: 3000, customers: 10, churn: 2, ...x }));
add('1 realistic SMB grid', [5000, 12000, 18000, 30000, 45000, 60000, 80000, 120000, 200000, 350000].map((rev) => ({ rev, costs: Math.round(rev * 0.75), customers: Math.max(1, Math.round(rev / 3000)) })));
add('2 zero revenue', [0, 0, 0, 0, 0, 0, 0, 0, 0, 0].map((_, i) => ({ rev: 0, costs: 1000 * (i + 1), customers: i })));
add('3 costs exceed revenue', [1.01, 1.1, 1.25, 1.5, 2, 3, 5, 10, 50, 100].map((k) => ({ costs: Math.round(30000 * k) })));
add('4 tiny values', [1, 2, 5, 10, 20, 50, 75, 100, 250, 500].map((v) => ({ rev: v, costs: Math.round(v * 0.6), inv: v, cac: 1, price: Math.max(1, v), customers: 1 })));
add('5 huge values', [1e6, 2.5e6, 5e6, 1e7, 2.5e7, 5e7, 1e8, 2.5e8, 5e8, 1e9].map((rev) => ({ rev, costs: rev * 0.7, inv: rev * 2, price: 50000, customers: Math.round(rev / 50000) })));
add('6 zero investment', [5000, 10000, 20000, 30000, 40000, 50000, 60000, 70000, 80000, 90000].map((rev) => ({ rev, costs: rev * 0.8, inv: 0 })));
add('7 churn extremes', [0, 0.1, 1, 5, 10, 20, 35, 50, 75, 100].map((churn) => ({ churn })));
add('8 CAC extremes', [0, 1, 10, 100, 1000, 5000, 10000, 50000, 100000, 1000000].map((cac) => ({ cac })));
add('9 customer count extremes', [0, 1, 2, 3, 10, 100, 1000, 5000, 10000, 100000].map((customers) => ({ customers })));
add('10 price vs revenue mismatch', [1, 10, 100, 500, 1000, 5000, 10000, 30000, 100000, 1000000].map((price) => ({ price })));

const isNum = (x: unknown): x is number => typeof x === 'number';
const near = (a: number, b: number, tol: number) => Math.abs(a - b) <= tol;

describe('iron stress: production calculator', () => {
  it('runs 100 adversarial cases and records every invariant violation', () => {
    const report: Array<{ cat: string; input: Case; violations: string[]; out?: Record<string, unknown> }> = [];
    for (const c of cases) {
      const v: string[] = [];
      let r: ReturnType<typeof calculateStrictFinancials> | null = null;
      try {
        r = calculateStrictFinancials(c.rev, c.inv, c.cac, 0, c.price, bench, loc, null, c.costs, c.churn, c.customers);
      } catch (e) { v.push(`I0 threw: ${(e as Error).message}`); }
      if (r) {
        // I1 finite numbers
        for (const k of ['mrr', 'totalExpenses', 'netProfit', 'netMarginPercent', 'grossProfit', 'grossMarginPercent', 'cac', 'ltv', 'ltvCacRatio', 'paybackMonths', 'roiYear1Percent', 'breakEvenRevenue'] as const) {
          const x = (r as unknown as Record<string, unknown>)[k];
          if (isNum(x) && !Number.isFinite(x)) v.push(`I1 ${k} not finite (${x})`);
        }
        // I2/I3 user totals honoured
        if (!near(r.mrr, c.rev, 1)) v.push(`I3 revenue changed ${c.rev} -> ${r.mrr}`);
        if (!near(r.totalExpenses, c.costs, 1)) v.push(`I3 costs changed ${c.costs} -> ${r.totalExpenses}`);
        if (!near(r.netProfit, r.mrr - r.totalExpenses, 1)) v.push(`I2 netProfit ${r.netProfit} != mrr - costs ${r.mrr - r.totalExpenses}`);
        // I4 ordering
        if (r.grossProfit > r.mrr + 1) v.push(`I4 grossProfit ${r.grossProfit} > revenue ${r.mrr}`);
        if (r.netProfit > r.grossProfit + 1) v.push(`I4 netProfit ${r.netProfit} > grossProfit ${r.grossProfit}`);
        // I5 margin consistency
        if (r.mrr > 0 && !near(r.netMarginPercent, (r.netProfit / r.mrr) * 100, 1)) v.push(`I5 netMargin ${r.netMarginPercent} vs ${((r.netProfit / r.mrr) * 100).toFixed(2)}`);
        if (r.mrr === 0 && r.netMarginPercent !== 0 && Number.isFinite(r.netMarginPercent)) v.push(`I5 margin on zero revenue = ${r.netMarginPercent}`);
        // I6 payback typed vs legacy
        const pr = r.paybackResult;
        if (pr?.status === 'VALUE' && r.paybackMonths >= 999) v.push(`I6 typed payback VALUE ${pr.months} but legacy sentinel ${r.paybackMonths}`);
        if (pr && pr.status !== 'VALUE' && r.paybackMonths < 999 && c.inv > 0) v.push(`I6 typed payback ${pr.status} but legacy says ${r.paybackMonths} months`);
        // I7 zero investment
        if (c.inv === 0 && r.roiYear1Percent !== 0) v.push(`I7 ROI ${r.roiYear1Percent} with zero investment`);
        // I8 CVP
        const be = r.cvp?.breakEven;
        if (be?.status === 'VALUE' && be.breakEvenRevenue !== null && Number(be.breakEvenRevenue) < 0) v.push(`I8 negative break-even revenue ${be.breakEvenRevenue}`);
        // I9 ROI definition
        if (c.inv > 0 && r.roiYear1Percent !== roiYear1Percent(r.mrr, r.totalExpenses, c.inv)) v.push(`I9 ROI ${r.roiYear1Percent} != shared ramp ${roiYear1Percent(r.mrr, r.totalExpenses, c.inv)}`);
        // I10 profitability flag
        if (r.isProfitable !== (r.netProfit > 0)) v.push(`I10 isProfitable=${r.isProfitable} but netProfit=${r.netProfit}`);
        if (r.netProfit <= 0 && pr?.status === 'VALUE') v.push(`I10 loss-making but payback VALUE ${pr.months}`);
        // I11 silent corrections of user inputs
        for (const cor of r.corrections) if (/revenue|mrr|cost|expense|investment/i.test(cor.field)) v.push(`I11 user input corrected: ${cor.field} ${cor.original} -> ${cor.corrected} (${cor.reason})`);
        // I12 LTV/CAC
        if (r.cac > 0 && Number.isFinite(r.ltvCacRatio) && !near(r.ltvCacRatio, r.ltv / r.cac, 0.05)) v.push(`I12 ltvCac ${r.ltvCacRatio} != ${(r.ltv / r.cac).toFixed(2)}`);
      }
      report.push({ cat: c.cat, input: c, violations: v, out: r ? { mrr: r.mrr, costs: r.totalExpenses, net: r.netProfit, gross: r.grossProfit, payback: r.paybackMonths, paybackTyped: r.paybackResult?.status, roi: r.roiYear1Percent, be: r.cvp?.breakEven?.status, ltvCac: r.ltvCacRatio, corrections: r.corrections.length } : undefined });
    }
    writeFileSync(join(tmpdir(), 'iron-stress-report.json'), JSON.stringify(report, null, 1));
    expect(report.length).toBe(100);
    expect(report.filter((x) => x.violations.length).map((x) => `${x.cat}: ${x.violations.join('; ')}`)).toEqual([]);
  });
});
