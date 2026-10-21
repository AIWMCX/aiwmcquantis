/** True only for explicitly supplied, finite numeric data (including zero). */
export function hasFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}
