/**
 * NARRATIVE NUMERIC FIREWALL — P0 fix (2026-07-11)
 * ==================================================
 * Real functional test of enforceNarrativeIntegrity, imported directly from
 * the production edge-function file (no Deno-specific imports in this file
 * or its schemas.ts dependency, so it resolves fine under Vitest).
 *
 * Reproduces the exact corpus contradiction that motivated this fix (SubBase,
 * 2026-06-26): narrative cited CAC $100/LTV $3,278/LTV:CAC 32.8x while the
 * unit-economics page reported CAC $9,396/LTV $6,389/0.7x.
 */
import { describe, it, expect } from 'vitest';
import {
  enforceNarrativeIntegrity,
  buildSafeExecutiveSummary,
  type NarrativeIntegrityCalc,
} from '../../supabase/functions/analyze-business/ai-safety-guardrails.ts';

const baseCalc: NarrativeIntegrityCalc = {
  mrr: 2235,
  netProfit: -31916,
  cac: 9396,
  ltv: 6389,
  ltvCacRatio: 0.7,
  startupInvestment: 67500,
  paybackMonths: 999,
  breakEvenRevenue: 15000,
  npv3Years: -50000,
  isProfitable: false,
  expenses: { cogs: 1000, salaries: 20000, rent: 5000, utilities: 500, marketing: 5000, other: 1000 },
};

const noOpLog = { warn: () => {} };

describe('enforceNarrativeIntegrity', () => {
  it('leaves a narrative unchanged when its numbers reconcile with calc', () => {
    const text = `This SaaS opportunity shows monthly revenue of $2,235 against a CAC of $9,396, with LTV of $6,389. The startup investment of $67,500 has not yet reached payback.`;
    const result = enforceNarrativeIntegrity(text, baseCalc, 'B2B SaaS', 'Austin, TX', noOpLog);
    expect(result.wasModified).toBe(false);
    expect(result.executiveSummary).toBe(text);
  });

  it('replaces the narrative on the exact SubBase corpus contradiction (CAC $100 vs real $9,396)', () => {
    const contradictingText = `The executive narrative cites CAC $100, LTV $3,278, and LTV:CAC 32.8x, a highly attractive investment case.`;
    const result = enforceNarrativeIntegrity(contradictingText, baseCalc, 'B2B SaaS', 'Austin, TX', noOpLog);
    expect(result.wasModified).toBe(true);
    expect(result.executiveSummary).not.toContain('$100');
    expect(result.executiveSummary).not.toContain('$3,278');
    // The replacement must itself reconcile with calc (net profit and revenue
    // actually present). Computed with the same bare toLocaleString() the
    // production code uses, so this test is correct under any runtime locale
    // rather than assuming en-US comma grouping.
    expect(result.executiveSummary).toContain(Math.round(baseCalc.netProfit).toLocaleString());
    expect(result.executiveSummary).toContain(Math.round(baseCalc.mrr).toLocaleString());
  });

  it('does not flag small dollar figures under $100 (e.g. per-unit pricing mentions)', () => {
    const text = `Average ticket price is $15, well within the $9,396 CAC and $6,389 LTV envelope.`;
    const result = enforceNarrativeIntegrity(text, baseCalc, 'B2B SaaS', 'Austin, TX', noOpLog);
    expect(result.wasModified).toBe(false);
  });

  it('does not crash and returns the original text on an empty executive_summary', () => {
    const result = enforceNarrativeIntegrity('', baseCalc, 'B2B SaaS', 'Austin, TX', noOpLog);
    expect(result.wasModified).toBe(false);
    expect(result.executiveSummary).toBe('');
  });

  it('does not crash on non-string input (defensive against a malformed AI payload)', () => {
    // Not a real type error under this project's tsconfig.app.json (strict:
    // false), so no @ts-expect-error is needed here — undefined is
    // assignable to `string` without strictNullChecks. The runtime
    // defensiveness this test exercises is still real and still needed
    // (the production caller can hand this a malformed AI payload).
    const result = enforceNarrativeIntegrity(undefined as unknown as string, baseCalc, 'B2B SaaS', 'Austin, TX', noOpLog);
    expect(result.wasModified).toBe(false);
  });

  it('buildSafeExecutiveSummary never contains a sentinel 999 as literal months', () => {
    const summary = buildSafeExecutiveSummary(baseCalc, 'B2B SaaS', 'Austin, TX');
    expect(summary).not.toMatch(/\b999 months\b/);
    expect(summary).toContain('indeterminate until profitability is achieved');
  });

  it('buildSafeExecutiveSummary shows real months when profitable', () => {
    const profitableCalc: NarrativeIntegrityCalc = { ...baseCalc, isProfitable: true, paybackMonths: 14, netProfit: 4832 };
    const summary = buildSafeExecutiveSummary(profitableCalc, 'Coffee Shop', 'Denver, CO');
    expect(summary).toContain('14 months');
    expect(summary).toContain('profitable');
  });
});
