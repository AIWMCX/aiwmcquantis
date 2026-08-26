/**
 * Regression tests for checkFinancialInvariants()
 * (supabase/functions/analyze-business/payback-contract.ts) -- GTM-audit
 * item #1 (2026-08-25): "enforce operating_profit <= gross_profit <= revenue
 * as a runtime gate, not just convention."
 *
 * Imported directly (not mirrored) following the precedent already proven
 * in shape-financial-analysis.test.ts: payback-contract.ts's only import is
 * decimal.js via an esm.sh URL, which vitest.config.ts already aliases to
 * the real npm package, so it has zero Deno-specific runtime dependencies
 * and can be exercised as the real code, not a copy that could drift.
 */
import { describe, it, expect } from 'vitest';
import { checkFinancialInvariants } from '../../supabase/functions/analyze-business/payback-contract.ts';

describe('checkFinancialInvariants', () => {
  it('passes a coherent scenario set with no violations', () => {
    const issues = checkFinancialInvariants({
      pessimistic: { revenue: 66048, gross_profit: 21796, net_profit: 10000 },
      base: { revenue: 82560, gross_profit: 31373, net_profit: 20617 },
      optimistic: { revenue: 103200, gross_profit: 41280, net_profit: 30000 },
    });
    expect(issues).toEqual([]);
  });

  it('real production regression: CashMatch AI (2026-08-24) -- operating profit exceeding gross profit in all three scenarios', () => {
    // Verbatim figures from the exported PDF: gross_profit and net_profit
    // ("Operating Profit" in the UI) for each scenario.
    const issues = checkFinancialInvariants({
      pessimistic: { revenue: 66048, gross_profit: 21796, net_profit: 56005 },
      base: { revenue: 82560, gross_profit: 31373, net_profit: 71360 },
      optimistic: { revenue: 103200, gross_profit: 41280, net_profit: 90157 },
    });

    expect(issues).toHaveLength(3);
    expect(issues.every((i) => i.code === 'OPERATING_PROFIT_EXCEEDS_GROSS_PROFIT')).toBe(true);
    expect(issues.map((i) => i.scope).sort()).toEqual(['base', 'optimistic', 'pessimistic']);
    // Every message must name the actual scenario it came from -- this is
    // what lets a human (or index.ts's log line) tell which of the three
    // scenarios is broken, not just that "something" is.
    expect(issues.find((i) => i.scope === 'base')?.message).toContain('$71360');
    expect(issues.find((i) => i.scope === 'base')?.message).toContain('$31373');
  });

  it('catches gross_profit exceeding revenue independently of the operating-profit check', () => {
    const issues = checkFinancialInvariants({
      pessimistic: { revenue: 100, gross_profit: 50, net_profit: 10 },
      base: { revenue: 100, gross_profit: 150, net_profit: 10 }, // gross_profit > revenue
      optimistic: { revenue: 100, gross_profit: 50, net_profit: 10 },
    });
    expect(issues).toHaveLength(1);
    expect(issues[0].code).toBe('GROSS_PROFIT_EXCEEDS_REVENUE');
    expect(issues[0].scope).toBe('base');
  });

  it('tolerates whole-dollar rounding noise within the $2 tolerance', () => {
    const issues = checkFinancialInvariants({
      pessimistic: { revenue: 100, gross_profit: 50, net_profit: 51 }, // 1 over, within tolerance
      base: { revenue: 100, gross_profit: 50, net_profit: 30 },
      optimistic: { revenue: 100, gross_profit: 50, net_profit: 30 },
    });
    expect(issues).toEqual([]);
  });

  it('does NOT tolerate a violation beyond the rounding-noise tolerance', () => {
    const issues = checkFinancialInvariants({
      pessimistic: { revenue: 100, gross_profit: 50, net_profit: 53 }, // 3 over -- past the $2 tolerance
      base: { revenue: 100, gross_profit: 50, net_profit: 30 },
      optimistic: { revenue: 100, gross_profit: 50, net_profit: 30 },
    });
    expect(issues).toHaveLength(1);
    expect(issues[0].scope).toBe('pessimistic');
  });

  it('checks all three scenarios independently -- a violation in one does not mask or duplicate into another', () => {
    const issues = checkFinancialInvariants({
      pessimistic: { revenue: 100, gross_profit: 50, net_profit: 30 },
      base: { revenue: 100, gross_profit: 50, net_profit: 80 }, // violates here only
      optimistic: { revenue: 100, gross_profit: 50, net_profit: 30 },
    });
    expect(issues).toHaveLength(1);
    expect(issues[0].scope).toBe('base');
  });
});
