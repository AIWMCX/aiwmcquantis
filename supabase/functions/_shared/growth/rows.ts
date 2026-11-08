/**
 * Row shape for public.ext_metrics_daily and the helpers every source mapper
 * shares (pure; imported by vitest).
 */

export type GrowthSource = 'ga4' | 'gsc' | 'clarity';

export type GrowthReport =
  | 'ga4_overview'
  | 'ga4_channel'
  | 'ga4_landing_page'
  | 'ga4_source_medium'
  | 'ga4_country'
  | 'ga4_device'
  | 'gsc_overview'
  | 'gsc_query'
  | 'gsc_page'
  | 'gsc_country'
  | 'gsc_device'
  | 'clarity_overview';

export const GROWTH_REPORTS: readonly GrowthReport[] = [
  'ga4_overview', 'ga4_channel', 'ga4_landing_page', 'ga4_source_medium', 'ga4_country', 'ga4_device',
  'gsc_overview', 'gsc_query', 'gsc_page', 'gsc_country', 'gsc_device',
  'clarity_overview',
];

export interface MetricRow {
  source: GrowthSource;
  day: string; // YYYY-MM-DD
  report: GrowthReport;
  dims: Record<string, string>;
  metrics: Record<string, number>;
  dims_key: string;
}

/**
 * Stable string for a dims object: keys sorted, values as given, JSON-encoded.
 * {} -> '{}' so dimensionless reports (overview) still have one row per day.
 * Key order in the input never changes the output.
 */
export function dimsKey(dims: Record<string, string>): string {
  const keys = Object.keys(dims).sort();
  const ordered: Record<string, string> = {};
  for (const k of keys) ordered[k] = String(dims[k] ?? '');
  return JSON.stringify(ordered);
}

/** Parse an API metric value ("12", "0.53", 12) to a finite number, else 0. */
export function num(v: unknown): number {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Keep the top `n` rows per day by `metric` (ties broken by dims_key so the
 * cut is deterministic). Dimensionless or small reports pass n = Infinity.
 */
export function topNPerDay(rows: MetricRow[], n: number, metric: string, tiebreak?: string): MetricRow[] {
  if (!Number.isFinite(n)) return rows;
  const byDay = new Map<string, MetricRow[]>();
  for (const r of rows) {
    const list = byDay.get(r.day);
    if (list) list.push(r);
    else byDay.set(r.day, [r]);
  }
  const out: MetricRow[] = [];
  for (const day of [...byDay.keys()].sort()) {
    const list = byDay.get(day)!;
    list.sort((a, b) =>
      (b.metrics[metric] ?? 0) - (a.metrics[metric] ?? 0)
      || (tiebreak ? (b.metrics[tiebreak] ?? 0) - (a.metrics[tiebreak] ?? 0) : 0)
      || (a.dims_key < b.dims_key ? -1 : a.dims_key > b.dims_key ? 1 : 0));
    out.push(...list.slice(0, n));
  }
  return out;
}

/**
 * Drop duplicate (source, day, report, dims_key) rows, keeping the last one.
 * A single upsert batch that hits the same unique key twice fails in Postgres
 * ("ON CONFLICT DO UPDATE command cannot affect row a second time").
 */
export function dedupeRows(rows: MetricRow[]): MetricRow[] {
  const map = new Map<string, MetricRow>();
  for (const r of rows) map.set(`${r.source}|${r.day}|${r.report}|${r.dims_key}`, r);
  return [...map.values()];
}
