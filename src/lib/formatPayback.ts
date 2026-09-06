/**
 * Centralized payback period display formatter.
 * Handles the 999 sentinel value (meaning "never pays back")
 * and negative-profit scenarios.
 */
export function formatPaybackDisplay(months: number, profit?: number): string {
  if (profit !== undefined && profit <= 0) return 'N/A (unprofitable)';
  if (!months) return 'N/A (unprofitable)';
  if (months >= 999) {
    // The 999 sentinel means two different things upstream (financial-
    // calculator.ts): a genuinely unprofitable business, OR a profitable
    // one whose investment is simply too large to pay back within the
    // 60-month simulation horizon. `profit` (when the caller has it) is
    // the only signal available here to tell them apart -- collapsing both
    // to "unprofitable" falsely labels a profitable, capital-intensive
    // business as a loss-making one.
    return profit !== undefined && profit > 0
      ? 'N/A (exceeds 5-year horizon)'
      : 'N/A (unprofitable)';
  }
  if (months < 12) return `${Math.round(months)} months`;
  const years = months / 12;
  return `${years.toFixed(1)} years`;
}
