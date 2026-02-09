/**
 * Centralized payback period display formatter.
 * Handles the 999 sentinel value (meaning "never pays back")
 * and negative-profit scenarios.
 */
export function formatPaybackDisplay(months: number, profit?: number): string {
  if (profit !== undefined && profit <= 0) return 'N/A (unprofitable)';
  if (!months || months >= 999) return 'N/A (unprofitable)';
  if (months < 12) return `${Math.round(months)} months`;
  const years = months / 12;
  return `${years.toFixed(1)} years`;
}
