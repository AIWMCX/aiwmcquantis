import type { BusinessAnalysisResult } from '@/types/analysis';

/** One-line disclosure for the expense table: the line items are modeled, not the client's ledger (D8). */
export function expenseBreakdownNote(expenses: BusinessAnalysisResult['financial_analysis']['monthly_expenses']): string {
  switch (expenses.breakdown_basis) {
    case 'user_total_benchmark_split':
      return 'Total is your figure. Line items split it using industry benchmark proportions; they are not your own ledger.';
    case 'benchmark_estimate':
      return 'Estimated from industry benchmarks. Enter your monthly costs to anchor this table to your figures.';
    default:
      // Analyses saved before the basis was recorded.
      return 'Line items use industry benchmark proportions, not your own ledger.';
  }
}
