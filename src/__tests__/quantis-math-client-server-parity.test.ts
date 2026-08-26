/**
 * Cross-consistency test between the two independent "canonical math"
 * implementations this codebase maintains:
 *   - src/lib/quantis-math.ts (QuantisMath) -- client/browser.
 *   - supabase/functions/analyze-business/quantis-math-server.ts (QMath) --
 *     Deno edge-function runtime. Its own header comment calls itself a
 *     "port of src/lib/quantis-math.ts" and several of its methods'
 *     docstrings say "Mirrors src/lib/quantis-math.ts exactly."
 *
 * GTM-audit item #9 (2026-08-25): "Is there one canonical place 'profit,'
 * 'margin,' and 'payback' are defined, or do independent code paths
 * redefine them slightly differently?" There isn't one place -- there are
 * two, by necessity of the Deno/browser runtime split -- and until this
 * test, nothing verified they actually agree. This proves parity for the
 * functions that share a signature/contract and are documented as
 * intentional mirrors.
 *
 * NOT covered here: roi() and the 4-arg ltv() are a real, separate
 * finding -- same names, genuinely DIFFERENT formulas/units on the two
 * sides (see the divergence-warning docstrings added to both files).
 * They're excluded from this parity test on purpose: asserting they
 * "match" would be asserting a false thing. Confirmed via real call-site
 * tracing (not assumed) that neither currently sits on a live, executed
 * code path today -- QMath.ltv()'s only caller is financial-engine.ts's
 * generate12MonthProjections(), itself never invoked in production (only
 * its IndustryBenchmarks type is imported elsewhere); QuantisMath.ltv()'s
 * only caller is the reference-only formula-registry.ts, not the live
 * analyze-business engine.
 */
import { describe, it, expect } from 'vitest';
import { QuantisMath } from '../lib/quantis-math';
import { QMath } from '../../supabase/functions/analyze-business/quantis-math-server';

function n(d: { toNumber: () => number } | number): number {
  return typeof d === 'number' ? d : d.toNumber();
}

describe('QuantisMath (client) vs QMath (server) parity', () => {
  it('cacPaybackMonths agrees on a representative range of inputs', () => {
    const cases: Array<[number, number, number]> = [
      [150, 75, 0.65],
      [500, 200, 0.4],
      [0, 100, 0.5],
      [100, 0, 0.5],
      [1000000, 50, 0.9],
    ];
    for (const [cac, avgTicket, gm] of cases) {
      const client = n(QuantisMath.cacPaybackMonths(cac, avgTicket, gm));
      const server = n(QMath.cacPaybackMonths(cac, avgTicket, gm));
      expect(client).toBeCloseTo(server, 6);
    }
  });

  it('ltvFromPrimitives agrees on a representative range of inputs', () => {
    const cases: Array<[number, number, number]> = [
      [75, 0.65, 0.08],
      [200, 0.4, 0],
      [50, 0, 0.1],
      [100, 0.5, 0.5],
    ];
    for (const [avgTicket, gm, churn] of cases) {
      const client = n(QuantisMath.ltvFromPrimitives(avgTicket, gm, churn));
      const server = n(QMath.ltvFromPrimitives(avgTicket, gm, churn));
      expect(client).toBeCloseTo(server, 6);
    }
  });

  it('projectPaybackYears agrees, including both sentinel cases', () => {
    const cases: Array<[number, number]> = [
      [20000, 4500],
      [20000, 0],
      [0, 4500],
      [20000, -100],
    ];
    for (const [investment, annualProfit] of cases) {
      const client = n(QuantisMath.projectPaybackYears(investment, annualProfit));
      const server = n(QMath.projectPaybackYears(investment, annualProfit));
      expect(client).toBeCloseTo(server, 6);
    }
  });

  it('ltvCacRatio agrees', () => {
    const cases: Array<[number, number]> = [[900, 150], [0, 150], [900, 0]];
    for (const [ltv, cac] of cases) {
      const client = n(QuantisMath.ltvCacRatio(ltv, cac));
      const server = QMath.ltvCacRatio(ltv, cac); // server returns a plain number, 1dp-rounded
      expect(client).toBeCloseTo(server, 1);
    }
  });

  it('breakEvenRevenue agrees, including the near-zero-margin floor', () => {
    const cases: Array<[number, number]> = [[5000, 0.4], [5000, 0.005], [5000, 0]];
    for (const [fixed, margin] of cases) {
      const client = n(QuantisMath.breakEvenRevenue(fixed, margin));
      const server = n(QMath.breakEvenRevenue(fixed, margin));
      expect(client).toBeCloseTo(server, 6);
    }
  });

  it('npv agrees on a representative projection', () => {
    const client = n(QuantisMath.npv(20000, 1500, 36, 0.10));
    const server = n(QMath.npv(20000, 1500, 36, 0.10));
    expect(client).toBeCloseTo(server, 4);
  });

  it('mean/median/percentile/standardDeviation agree on the same dataset', () => {
    const data = [10, 22, 35, 41, 8, 60, 15];
    expect(n(QuantisMath.mean(data))).toBeCloseTo(n(QMath.mean(data)), 6);
    expect(n(QuantisMath.median(data))).toBeCloseTo(n(QMath.median(data)), 6);
    expect(n(QuantisMath.percentile(data, 75))).toBeCloseTo(n(QMath.percentile(data, 75)), 6);
    expect(n(QuantisMath.standardDeviation(data))).toBeCloseTo(n(QMath.standardDeviation(data)), 6);
  });

  it('clamp agrees', () => {
    expect(n(QuantisMath.clamp(150, 1, 120))).toBe(n(QMath.clamp(150, 1, 120)));
    expect(n(QuantisMath.clamp(-5, 1, 120))).toBe(n(QMath.clamp(-5, 1, 120)));
    expect(n(QuantisMath.clamp(50, 1, 120))).toBe(n(QMath.clamp(50, 1, 120)));
  });
});
