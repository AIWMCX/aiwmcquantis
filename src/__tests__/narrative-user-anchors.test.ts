import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  dollarAmountsIn,
  enforceNarrativeIntegrity,
  type NarrativeIntegrityCalc,
} from '../../supabase/functions/analyze-business/ai-safety-guardrails.ts';

// #57, live 2026-10-25: both test runs showed "summary was regenerated … did not
// reconcile" because the narrator quoted the visitor's own figures.
const calc: NarrativeIntegrityCalc = {
  mrr: 26520,
  netProfit: 7521,
  cac: 120,
  ltv: 2200,
  ltvCacRatio: 18.4,
  startupInvestment: 112000,
  paybackMonths: 15,
  breakEvenRevenue: 18000,
  isProfitable: true,
  expenses: { cogs: 9000, salaries: 6000, rent: 0, utilities: 300, marketing: 1500, other: 2000 },
};
const log = { warn: () => {} };

describe('narrative integrity: the visitor\'s own figures are anchors', () => {
  it('reads $5,500, $80K and $1.2M from idea text', () => {
    expect(dollarAmountsIn('Hire at $5,500/mo, $80K build-out, $1.2M loan')).toEqual([5500, 80000, 1200000]);
    expect(dollarAmountsIn(undefined)).toEqual([]);
  });

  it('keeps a summary that quotes the idea\'s own numbers', () => {
    const summary = 'Two vans with a $60,000 build-out reach $26,520 in monthly revenue and $7,521 net profit.';
    const without = enforceNarrativeIntegrity(summary, calc, 'Pet Services', 'Columbus, OH', log);
    const withIdea = enforceNarrativeIntegrity(summary, calc, 'Pet Services', 'Columbus, OH', log, 'Mobile grooming, $60K build-out, 2 vans');
    expect(without.wasModified).toBe(true);
    expect(withIdea.wasModified).toBe(false);
  });

  it('still replaces a summary with an invented figure', () => {
    const r = enforceNarrativeIntegrity('Revenue reaches $450,000 a month.', calc, 'Pet Services', 'Columbus, OH', log, 'Mobile grooming, $60K build-out');
    expect(r.wasModified).toBe(true);
  });

  it('the analysis passes the idea text through', () => {
    const src = readFileSync('supabase/functions/analyze-business/index.ts', 'utf8');
    expect(src).toMatch(/transformResponse\(rawResult,[^\n]*mergedFinancialInputs, idea_clean[,)]/);
  });
});
