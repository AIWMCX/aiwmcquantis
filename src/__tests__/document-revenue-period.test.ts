// D6: document revenue is converted to monthly only when its period is stated.
// Expected values are plain arithmetic on the inputs, not engine output.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { monthlyRevenueFromDocument } from '../../supabase/functions/analyze-business/document-revenue';

describe('monthlyRevenueFromDocument', () => {
  it('uses stated periods: monthly as-is, quarterly / 3, annual / 12, ARR / 12', () => {
    expect(monthlyRevenueFromDocument({ revenue: { monthly: 42000 } })).toEqual({ monthly: 42000, basis: 'document_monthly_revenue' });
    expect(monthlyRevenueFromDocument({ revenue: { quarterly: 90000 } })).toEqual({ monthly: 30000, basis: 'document_quarterly_revenue' });
    expect(monthlyRevenueFromDocument({ revenue: { annual: 600000 } })).toEqual({ monthly: 50000, basis: 'document_annual_revenue' });
    expect(monthlyRevenueFromDocument({ metrics: { arr: 240000 } })).toEqual({ monthly: 20000, basis: 'document_arr' });
  });

  it('prefers MRR, then monthly, over longer periods', () => {
    expect(monthlyRevenueFromDocument({ metrics: { mrr: 11000 }, revenue: { monthly: 9000, annual: 600000 } })).toMatchObject({ monthly: 11000 });
    expect(monthlyRevenueFromDocument({ revenue: { monthly: 9000, annual: 600000 } })).toMatchObject({ monthly: 9000 });
  });

  it('never guesses the period of an unlabeled total (old rule: >50k meant quarterly)', () => {
    for (const total of [40000, 60000, 600000]) {
      const r = monthlyRevenueFromDocument({ revenue: { total } });
      expect(r.monthly).toBeNull();
      expect(r).toHaveProperty('note');
      expect((r as { note: string }).note).toMatch(/does not say what period/);
    }
  });

  it('ignores missing, negative and non-finite values', () => {
    expect(monthlyRevenueFromDocument({})).toEqual({ monthly: null, note: null });
    expect(monthlyRevenueFromDocument({ revenue: { monthly: -5, quarterly: Number.NaN } })).toEqual({ monthly: null, note: null });
  });

  it('analyze-business uses the helper and no longer has the 50k divisor', () => {
    const src = readFileSync('supabase/functions/analyze-business/index.ts', 'utf8');
    expect(src).toContain('monthlyRevenueFromDocument(docFin)');
    expect(src).not.toMatch(/total > 50000 \? 3 : 1/);
  });
});
