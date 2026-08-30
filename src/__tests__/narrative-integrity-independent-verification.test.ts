/**
 * INDEPENDENT RE-VERIFICATION — Phase 5 closure, 2026-08-29.
 * ============================================================
 * docs/execution/2026-08-27-phase5-revalidation.md's reconciliation
 * matrix requires the currency-mismatch and verdict-contradiction checks
 * to be independently re-verified, not just confirmed by the same test
 * file the implementing author wrote alongside the fix
 * (narrative-integrity.test.ts).
 *
 * Honesty about what "independent" means here: this is still the same
 * agent, in the same session, that wrote the fix in
 * ai-safety-guardrails.ts. There is no second engineer or separate
 * review process available in this environment. What this file DOES
 * provide, deliberately, as the most rigorous substitute available:
 *
 *   1. Zero code sharing with narrative-integrity.test.ts -- no shared
 *      `baseCalc` fixture, no reused sentence text, no copy-pasted
 *      assertions. Every scenario below was constructed fresh, from the
 *      charter's requirement text alone, without re-reading the original
 *      test file while writing this one.
 *   2. A completely different business scenario (a coffee-roasting
 *      subscription box, not the original SubBase/B2B-SaaS numbers) with
 *      its own numbers, so a coincidental pass caused by fixture-specific
 *      quirks (e.g. a currency symbol that happens to also be a valid
 *      dollar-anchor collision) would show up as a failure here even if
 *      it didn't in the original suite.
 *   3. Imports the same production function (`enforceNarrativeIntegrity`)
 *      directly from its real file path -- not a mock, not a copy.
 *   4. Run and its PASS/FAIL result recorded in
 *      docs/execution/2026-08-27-phase5-revalidation.md BEFORE Phase 5
 *      was marked closed, not after.
 */
import { describe, it, expect } from 'vitest';
import {
  enforceNarrativeIntegrity,
  type NarrativeIntegrityCalc,
} from '../../supabase/functions/analyze-business/ai-safety-guardrails.ts';

// Fresh scenario: a profitable coffee-roasting subscription box.
// Numbers deliberately unrelated to narrative-integrity.test.ts's baseCalc.
const roasteryCalc: NarrativeIntegrityCalc = {
  mrr: 18400,
  netProfit: 5210,
  cac: 62,
  ltv: 890,
  ltvCacRatio: 14.4,
  startupInvestment: 34000,
  paybackMonths: 7,
  breakEvenRevenue: 11000,
  npv3Years: 128000,
  isProfitable: true,
  expenses: { cogs: 6100, salaries: 4200, rent: 1800, utilities: 300, marketing: 900, other: 400 },
};

const noOpLog = { warn: () => {} };

describe('INDEPENDENT VERIFICATION — enforceNarrativeIntegrity, fresh fixture set', () => {
  it('baseline: a fully-reconciling narrative for the roastery scenario is left untouched', () => {
    const text = `This coffee-roasting subscription box generates $18,400 in monthly recurring revenue with a lean $62 customer acquisition cost against an $890 lifetime value, an outstanding 14.4x ratio.`;
    const result = enforceNarrativeIntegrity(text, roasteryCalc, 'Subscription Box', 'Portland, OR', noOpLog);
    expect(result.wasModified).toBe(false);
    expect(result.executiveSummary).toBe(text);
  });

  it('CURRENCY: a Canadian-dollar-style figure (using £, distinct symbol from the original suite\'s € test) is caught', () => {
    const text = `Monthly revenue has reached £18,400 according to the latest cohort data.`;
    const result = enforceNarrativeIntegrity(text, roasteryCalc, 'Subscription Box', 'Portland, OR', noOpLog);
    expect(result.wasModified).toBe(true);
    expect(result.executiveSummary).not.toContain('£18,400');
  });

  it('CURRENCY: ₩ (Korean won), a symbol not exercised anywhere in narrative-integrity.test.ts, is also caught', () => {
    const text = `Startup costs of ₩34,000 were required to launch this operation.`;
    const result = enforceNarrativeIntegrity(text, roasteryCalc, 'Subscription Box', 'Portland, OR', noOpLog);
    expect(result.wasModified).toBe(true);
  });

  it('REVERSED VERDICT: this roastery is genuinely PROFITABLE (isProfitable: true) -- calling it "a failing business" must be caught', () => {
    // Mirror-direction case from the original suite's own mirror test, but
    // with entirely fresh wording ("a failing business" appears in both,
    // since it's one of the three phrases in STRONG_UNPROFITABLE_CLAIMS --
    // the point here is a fresh CALC and fresh SURROUNDING TEXT, not a
    // fresh phrase list, which is the implementation's fixed vocabulary).
    const text = `Despite early signs of traction, this remains a failing business unable to cover its own costs.`;
    const result = enforceNarrativeIntegrity(text, roasteryCalc, 'Subscription Box', 'Portland, OR', noOpLog);
    expect(result.wasModified).toBe(true);
  });

  it('REVERSED VERDICT: an UNPROFITABLE scenario (fresh numbers) wrongly called "very profitable" is caught', () => {
    const strugglingCalc: NarrativeIntegrityCalc = { ...roasteryCalc, isProfitable: false, netProfit: -2100 };
    const text = `This is a very profitable venture with a clear path to scale.`;
    const result = enforceNarrativeIntegrity(text, strugglingCalc, 'Subscription Box', 'Portland, OR', noOpLog);
    expect(result.wasModified).toBe(true);
  });

  it('FALSE-POSITIVE CHECK: honest, hedged language about the SAME profitable business is not wrongly flagged', () => {
    const text = `This subscription box has reached profitability, though continued marketing investment of $900/month will be needed to sustain the current 14.4x LTV:CAC ratio.`;
    const result = enforceNarrativeIntegrity(text, roasteryCalc, 'Subscription Box', 'Portland, OR', noOpLog);
    expect(result.wasModified).toBe(false);
  });

  it('DEFERRED GAP RE-CONFIRMED: wrong period is still not caught (fresh numbers, same conclusion as the original suite)', () => {
    // $11,000 is roasteryCalc's breakEvenRevenue, mislabeled here as MRR.
    // Independently reproduces the same open gap with different numbers,
    // confirming it is a structural property of the implementation, not a
    // fixture-specific artifact of the original test's exact figures.
    const text = `The business already generates $11,000 in monthly recurring revenue.`;
    const result = enforceNarrativeIntegrity(text, roasteryCalc, 'Subscription Box', 'Portland, OR', noOpLog);
    expect(result.wasModified).toBe(false);
  });

  it('DEFERRED GAP RE-CONFIRMED: stale benchmark cohort is still not caught (fresh wording)', () => {
    const text = `Per our 2022 specialty-coffee industry benchmarks, this concept is well-positioned.`;
    const result = enforceNarrativeIntegrity(text, roasteryCalc, 'Subscription Box', 'Portland, OR', noOpLog);
    expect(result.wasModified).toBe(false);
  });
});
