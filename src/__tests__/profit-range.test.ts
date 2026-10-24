// The advertised 1,000-iteration Monte Carlo now runs on every report.
// Expected values are derived independently from the input ranges, not from engine output.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { computeProfitRange, PROFIT_RANGE_ASSUMPTIONS } from '@/lib/profit-range';

describe('computeProfitRange', () => {
  it('runs exactly 1,000 iterations and stays inside the analytic bounds', async () => {
    // revenue 10,000 in [8,000, 12,000], costs 6,000 in [5,400, 6,900]
    const r = (await computeProfitRange({ monthlyRevenue: 10_000, monthlyCosts: 6_000, seedKey: 'a' }))!;
    expect(r.iterations).toBe(1000);
    expect(r.min).toBeGreaterThanOrEqual(8_000 - 6_900);
    expect(r.max).toBeLessThanOrEqual(12_000 - 5_400);
    expect(r.p10).toBeLessThan(r.median);
    expect(r.median).toBeLessThan(r.p90);
    // Mode of each triangular is the input, so the median sits near 4,000.
    // Triangular means: revenue 10,000; costs (5,400+6,000+6,900)/3 = 6,100, so mean profit = 3,900.
    expect(Math.abs(r.mean - 3_900)).toBeLessThan(150);
    expect(r.probabilityPositive).toBe(100);
  });

  it('is deterministic per seed key and differs across keys', async () => {
    const a1 = await computeProfitRange({ monthlyRevenue: 5_000, monthlyCosts: 5_000, seedKey: 'report-1' });
    const a2 = await computeProfitRange({ monthlyRevenue: 5_000, monthlyCosts: 5_000, seedKey: 'report-1' });
    const b = await computeProfitRange({ monthlyRevenue: 5_000, monthlyCosts: 5_000, seedKey: 'report-2' });
    expect(a1).toEqual(a2);
    expect(b!.mean).not.toBe(a1!.mean);
  });

  it('break-even inputs give a mixed probability; invalid inputs give null', async () => {
    const r = (await computeProfitRange({ monthlyRevenue: 5_000, monthlyCosts: 5_000, seedKey: 'x' }))!;
    // Costs skew up (to 115%) while revenue is symmetric, so fewer than half of months are profitable.
    expect(r.probabilityPositive).toBeGreaterThan(20);
    expect(r.probabilityPositive).toBeLessThan(50);
    expect(await computeProfitRange({ monthlyRevenue: 0, monthlyCosts: 0, seedKey: 'x' })).toBeNull();
    expect(await computeProfitRange({ monthlyRevenue: Number.NaN, monthlyCosts: 1, seedKey: 'x' })).toBeNull();
    expect(await computeProfitRange({ monthlyRevenue: -1, monthlyCosts: 1, seedKey: 'x' })).toBeNull();
  });

  it('uses the same ranges as the scenario engine and is wired into the report', () => {
    expect(PROFIT_RANGE_ASSUMPTIONS).toEqual({ revenue: { min: 0.8, max: 1.2 }, costs: { min: 0.9, max: 1.15 } });
    const se = readFileSync('src/services/scenario-engine.ts', 'utf8');
    expect(se).toContain('adjusted.monthlyRevenue * 0.8');
    expect(se).toContain('adjusted.monthlyCosts * 1.15');
    expect(readFileSync('src/components/analysis/AccuracyTransparentResults.tsx', 'utf8')).toContain('<ProfitRangeCard');
  });
});
