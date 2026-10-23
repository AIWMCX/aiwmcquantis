/**
 * LTV:CAC for display. A ratio over a $0 (or missing) CAC is not a number a
 * reader should see as "0x" (iron audit D3, 2026-10-23).
 */
export function ltvCacMeaningful(ue: { cac?: number | null; ltv_cac_ratio?: number | null } | null | undefined): boolean {
  return typeof ue?.cac === 'number' && ue.cac > 0 && typeof ue?.ltv_cac_ratio === 'number' && Number.isFinite(ue.ltv_cac_ratio);
}

export function formatLtvCac(
  ue: { cac?: number | null; ltv_cac_ratio?: number | null } | null | undefined,
  format: (n: number) => string = (n) => n.toFixed(1),
): string {
  return ltvCacMeaningful(ue) ? `${format(ue!.ltv_cac_ratio as number)}x` : 'n/a (CAC is $0)';
}
