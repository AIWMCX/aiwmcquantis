// D8: the expense line items are a modeled split, and the report says so.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { expenseBreakdownNote } from '@/lib/expense-basis';

const ex = (basis?: 'user_total_benchmark_split' | 'benchmark_estimate') =>
  ({ total: 10000, breakdown: { rent: 1, utilities: 1, salaries: 1, inventory_replenishment: 1, marketing: 1, other: 1 }, breakdown_basis: basis });

describe('expense breakdown basis', () => {
  it('describes each basis truthfully', () => {
    expect(expenseBreakdownNote(ex('user_total_benchmark_split'))).toMatch(/^Total is your figure/);
    expect(expenseBreakdownNote(ex('benchmark_estimate'))).toMatch(/^Estimated from industry benchmarks/);
    expect(expenseBreakdownNote(ex())).toMatch(/benchmark proportions, not your own ledger/);
  });
  it('the engine records the basis and both report surfaces show the note', () => {
    expect(readFileSync('supabase/functions/analyze-business/financial-analysis-shape.ts', 'utf8')).toContain("breakdown_basis: calc.expenseSource === 'user'");
    expect(readFileSync('src/components/analysis/FinancialSummary.tsx', 'utf8')).toContain('expenseBreakdownNote(financial.monthly_expenses)');
    expect(readFileSync('src/components/pdf/ReportFinancials.tsx', 'utf8')).toContain('expenseBreakdownNote(expenses)');
  });
});
