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

  // Q6 (2026-11-03): small figures are now checked too. Before, every amount
  // of $100 or less was skipped, so "CAC $90" could never be caught. A small
  // figure that is the engine's own average ticket still passes.
  it('accepts a small dollar figure that is the engine\'s average ticket', () => {
    const text = `Average ticket price is $15, well within the $9,396 CAC and $6,389 LTV envelope.`;
    const result = enforceNarrativeIntegrity(text, { ...baseCalc, averageCheck: 15 }, 'B2B SaaS', 'Austin, TX', noOpLog);
    expect(result.wasModified).toBe(false);
  });

  it('catches a small dollar figure that matches nothing the engine computed', () => {
    const text = `Average ticket price is $15, well within the $9,396 CAC and $6,389 LTV envelope.`;
    const result = enforceNarrativeIntegrity(text, { ...baseCalc, averageCheck: 22 }, 'B2B SaaS', 'Austin, TX', noOpLog);
    expect(result.wasModified).toBe(true);
    expect(result.reason).toBe('unanchored_dollar:$15');
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

/**
 * CONFLICT-FIXTURE COVERAGE — charter 5.13 (2026-08-29, Phase 5
 * re-validation, docs/execution/2026-08-27-phase5-revalidation.md).
 * 5.13 asks for fixtures covering six classes of narrative/engine
 * conflict: wrong totals, wrong units, wrong currency, wrong period,
 * reversed verdict, and stale benchmark cohorts. The describe block
 * above already covers "wrong totals." This block covers the other
 * five.
 *
 * Updated 2026-08-29 (same day, second pass): the original version of
 * this block found wrong currency and reversed verdict were genuinely
 * undetectable and left them as documented-gap canaries. Both are now
 * FIXED in ai-safety-guardrails.ts (NON_USD_CURRENCY_PATTERN and the
 * STRONG_PROFITABLE_CLAIMS/STRONG_UNPROFITABLE_CLAIMS checks added to
 * narrativeReconciles()) — the tests below were flipped from "confirms
 * the gap" to "confirms the fix," not silently left stale.
 *
 * Wrong period and stale benchmark cohort remain genuinely open: fixing
 * either requires changing NarrativeIntegrityCalc's shape (adding a
 * period/label context or a dataset-vintage field) and updating its
 * construction at the real call site in analyze-business/index.ts —
 * larger, riskier surgery on the core analysis path than this pass's
 * scope, deliberately deferred rather than bundled in.
 */
describe('enforceNarrativeIntegrity — conflict-fixture coverage (charter 5.13)', () => {
  it('WRONG UNITS: catches an order-of-magnitude error ($675 cited for a real $67,500 startup investment)', () => {
    // A real detection case: $675 is > $100 (not skipped) and is not
    // within 10% of any anchor in baseCalc (nearest candidates are
    // $500 and $1,000, both well outside the 10% band around $675).
    const text = `With a lean startup investment of $675, this business reaches breakeven quickly.`;
    const result = enforceNarrativeIntegrity(text, baseCalc, 'B2B SaaS', 'Austin, TX', noOpLog);
    expect(result.wasModified).toBe(true);
    expect(result.executiveSummary).not.toContain('$675');
  });

  it('WRONG CURRENCY: fixed 2026-08-29 — a non-USD currency symbol is now caught regardless of the underlying number', () => {
    const text = `Monthly recurring revenue stands at €225,000, reflecting strong early traction.`;
    const result = enforceNarrativeIntegrity(text, baseCalc, 'B2B SaaS', 'Austin, TX', noOpLog);
    expect(result.wasModified).toBe(true);
    expect(result.executiveSummary).not.toContain('€225,000');
  });

  it('WRONG CURRENCY: also catches £ and ¥, and a currency symbol trailing the number', () => {
    expect(enforceNarrativeIntegrity(`CAC is estimated at £9,396 for this market.`, baseCalc, 'B2B SaaS', 'Austin, TX', noOpLog).wasModified).toBe(true);
    expect(enforceNarrativeIntegrity(`Startup costs of 67,500¥ are required.`, baseCalc, 'B2B SaaS', 'Austin, TX', noOpLog).wasModified).toBe(true);
  });

  it('WRONG PERIOD (still a known, open limitation): a dollar figure matching the wrong anchor by value passes, even though its label describes a different concept/period', () => {
    // $15,000 is baseCalc's breakEvenRevenue (a one-time/cumulative
    // threshold), not its MRR ($2,235, a recurring monthly figure).
    // The check only verifies "is this number within 10% of ANY anchor
    // in the set" -- it has no concept of which anchor a number is
    // supposed to correspond to, so mislabeling the break-even figure
    // as monthly revenue passes silently. Not touched by the 2026-08-29
    // currency/verdict fix -- fixing this needs period context plumbed
    // into NarrativeIntegrityCalc, deferred (see block comment above).
    const text = `This business already generates $15,000 in monthly revenue, well ahead of plan.`;
    const result = enforceNarrativeIntegrity(text, baseCalc, 'B2B SaaS', 'Austin, TX', noOpLog);
    expect(result.wasModified).toBe(false);
    expect(result.executiveSummary).toBe(text);
  });

  it('REVERSED VERDICT: fixed 2026-08-29 — a strong, unhedged profitability claim contradicting calc.isProfitable is now caught', () => {
    // baseCalc.isProfitable is false (net loss of $31,916/mo). This is
    // the EXACT example AI_SAFETY_ARCHITECTURE.md named as a currently-
    // open gap ("prose calling the business 'highly profitable' while
    // net_margin_percent is negative") -- now closed.
    const text = `This is a highly profitable business with excellent unit economics and strong near-term upside.`;
    const result = enforceNarrativeIntegrity(text, baseCalc, 'B2B SaaS', 'Austin, TX', noOpLog);
    expect(result.wasModified).toBe(true);
  });

  it('REVERSED VERDICT: also catches the mirror case (calling a profitable business unprofitable)', () => {
    const profitableCalc: NarrativeIntegrityCalc = { ...baseCalc, isProfitable: true, netProfit: 4832 };
    const text = `Unfortunately, this remains a failing business with no path to sustainability.`;
    const result = enforceNarrativeIntegrity(text, profitableCalc, 'B2B SaaS', 'Austin, TX', noOpLog);
    expect(result.wasModified).toBe(true);
  });

  it('REVERSED VERDICT: does NOT flag a hedged claim ("could become profitable") — deliberately narrow to avoid false positives', () => {
    // The whole point of keeping this check narrow: this function's only
    // remedy is a wholesale executive_summary replacement, so it must
    // not fire on legitimate, honestly-hedged language just because the
    // word "profitable" appears near a negative outcome.
    const text = `This business could become profitable with optimization, though current unit economics of $9,396 CAC and $6,389 LTV are challenging.`;
    const result = enforceNarrativeIntegrity(text, baseCalc, 'B2B SaaS', 'Austin, TX', noOpLog);
    expect(result.wasModified).toBe(false);
  });

  it('REVERSED VERDICT: does NOT flag a plain "profitable" mention with correctly-anchored numbers', () => {
    const profitableCalc: NarrativeIntegrityCalc = { ...baseCalc, isProfitable: true, netProfit: 4832 };
    const text = `The business is profitable, generating $4,832 in monthly net profit.`;
    const result = enforceNarrativeIntegrity(text, profitableCalc, 'B2B SaaS', 'Austin, TX', noOpLog);
    expect(result.wasModified).toBe(false);
  });

  it('STALE BENCHMARK COHORT (still a known, open limitation): a claim about dataset vintage is entirely outside this function\'s scope', () => {
    // NarrativeIntegrityCalc has no dataset_version/cohort field at all
    // -- there is nothing in this function's signature it COULD check a
    // benchmark-vintage claim against, even in principle. Not touched by
    // the 2026-08-29 fix -- deferred, see block comment above.
    const text = `Based on our 2023 industry benchmark dataset, this concept shows strong market alignment.`;
    const result = enforceNarrativeIntegrity(text, baseCalc, 'B2B SaaS', 'Austin, TX', noOpLog);
    expect(result.wasModified).toBe(false);
    expect(result.executiveSummary).toBe(text);
  });
});
