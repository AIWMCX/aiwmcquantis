import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  enforceNarrativeIntegrity,
  narrativeMismatch,
  type NarrativeIntegrityCalc,
} from '../../supabase/functions/analyze-business/ai-safety-guardrails.ts';

// 2026-10-26 live: after #328 the grooming run still showed "summary was
// regenerated". Yearly figures now count as anchors, and the reason is recorded.
const calc: NarrativeIntegrityCalc = {
  mrr: 13260,
  netProfit: 3500,
  cac: 120,
  ltv: 2200,
  ltvCacRatio: 18.4,
  startupInvestment: 62000,
  paybackMonths: 19,
  breakEvenRevenue: 9000,
  isProfitable: true,
  expenses: { cogs: 4500, salaries: 3000, rent: 0, utilities: 200, marketing: 900, other: 1160 },
};
const log = { warn: () => {} };

describe('narrative mismatch reason', () => {
  it('accepts yearly versions of monthly figures', () => {
    expect(narrativeMismatch('That is about $159,120 in yearly revenue and $42,000 a year in profit.', calc)).toBeNull();
  });

  it('names the figure that failed', () => {
    expect(narrativeMismatch('Revenue could reach $450,000 a month.', calc)).toBe('unanchored_dollar:$450,000');
    const r = enforceNarrativeIntegrity('Revenue could reach $450,000 a month.', calc, 'Pet Services', 'Columbus, OH', log);
    expect(r.reason).toBe('unanchored_dollar:$450,000');
  });

  it('the report metadata records it', () => {
    const src = readFileSync('supabase/functions/analyze-business/index.ts', 'utf8');
    expect(src).toContain('narrative_integrity: { replaced: narrativeWasModified, reason: narrativeIntegrityReason },');
  });
});

describe('gross profit and total costs are anchors', () => {
  it('accepts the $11,220 gross profit that triggered a replacement on 2026-10-26', () => {
    const live: NarrativeIntegrityCalc = { ...calc, mrr: 20400, netProfit: 6930, expenses: { ...calc.expenses, cogs: 9180 } };
    expect(narrativeMismatch('Gross profit is about $11,220 a month.', live)).toBeNull();
  });
});
