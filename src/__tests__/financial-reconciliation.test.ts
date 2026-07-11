/**
 * Financial Integrity — Row Reconciliation Tests (Handbook §19 Wave 1)
 * Proves reconcileMonthlyRow() recomputes the full income-statement-to-cash
 * waterfall from raw inputs and flags a broken cash roll-forward.
 */
import { describe, expect, it } from 'vitest';
import { reconcileMonthlyRow } from '@/financial/reconcile';

describe('monthly financial reconciliation', () => {
  it('passes a reconciled month', () => {
    const issues = reconcileMonthlyRow({
      month: 1,
      revenue: '1000',
      cogs: '300',
      grossProfit: '700',
      opex: '400',
      ebitda: '300',
      depreciation: '20',
      amortization: '0',
      interestExpense: '10',
      taxes: '54',
      netIncome: '216',
      capex: '50',
      deltaWorkingCapital: '20',
      debtPrincipal: '0',
      newDebt: '0',
      newEquity: '0',
      freeCashFlow: '166',
      beginningCash: '500',
      endingCash: '666',
    });
    expect(issues).toEqual([]);
  });

  it('blocks a report when the cash roll-forward is wrong', () => {
    const issues = reconcileMonthlyRow({
      month: 1,
      revenue: '1000',
      cogs: '300',
      grossProfit: '700',
      opex: '400',
      ebitda: '300',
      depreciation: '20',
      amortization: '0',
      interestExpense: '10',
      taxes: '54',
      netIncome: '216',
      capex: '50',
      deltaWorkingCapital: '20',
      debtPrincipal: '0',
      newDebt: '0',
      newEquity: '0',
      freeCashFlow: '166',
      beginningCash: '500',
      endingCash: '999',
    });
    expect(issues.some((issue) => issue.code === 'CASH_ROLLFORWARD_RECONCILIATION')).toBe(true);
  });
});
