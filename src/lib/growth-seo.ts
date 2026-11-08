/**
 * /admin/growth phase-2 shaping (pure): tool-status chips from ext_sync_runs,
 * and the latest PSI / indexing / IndexNow / Bing rows from ext_metrics_daily.
 * Rows are read under the admin-only RLS policy; nothing here computes or
 * fills in a value the source did not return.
 */
import { GROWTH_SOURCES, type GrowthSource, type MetricValue } from '../../supabase/functions/_shared/growth/rows';

export type { GrowthSource };

export interface SyncRunRow {
  source: GrowthSource;
  mode: string;
  status: string;
  started_at: string;
  finished_at: string | null;
  rows_upserted: number;
  error: string | null;
  details?: Record<string, unknown> | null;
}

export interface ExtRow {
  source: GrowthSource;
  day: string;
  report: string;
  dims: Record<string, string>;
  metrics: Record<string, MetricValue>;
  fetched_at: string;
}

export const SOURCE_LABELS: Record<GrowthSource, string> = {
  ga4: 'GA4',
  gsc: 'Search Console',
  clarity: 'Clarity',
  psi: 'PageSpeed',
  indexing: 'Indexing',
  indexnow: 'IndexNow',
  bing: 'Bing',
};

export type ToolState = 'connected' | 'partial' | 'not_configured' | 'needs_permission' | 'error' | 'running' | 'never_run';

export const TOOL_STATE_LABELS: Record<ToolState, string> = {
  connected: 'connected',
  partial: 'partial',
  not_configured: 'not configured',
  needs_permission: 'needs Full permission in Search Console',
  error: 'error',
  running: 'running',
  never_run: 'never run',
};

export interface ToolStatus {
  source: GrowthSource;
  label: string;
  state: ToolState;
  /** finished_at (or started_at) of the latest run that decided the state. */
  last_run: string | null;
  last_success: string | null;
  error: string | null;
}

function stateOf(status: string): ToolState {
  switch (status) {
    case 'ok': return 'connected';
    case 'partial': return 'partial';
    case 'not_configured': return 'not_configured';
    case 'permission_denied': return 'needs_permission';
    case 'running': return 'running';
    case 'error': return 'error';
    default: return 'never_run';
  }
}

/**
 * One chip per source, in GROWTH_SOURCES order. Runs must be newest first.
 * 'skipped' runs (backfill months outside a source's range) never decide a chip.
 */
export function toolStatuses(runs: readonly SyncRunRow[]): ToolStatus[] {
  return GROWTH_SOURCES.map((source) => {
    const mine = runs.filter((r) => r.source === source && r.status !== 'skipped');
    const latest = mine[0];
    const ok = mine.find((r) => r.status === 'ok');
    return {
      source,
      label: SOURCE_LABELS[source],
      state: latest ? stateOf(latest.status) : 'never_run',
      last_run: latest ? latest.finished_at ?? latest.started_at : null,
      last_success: ok ? ok.finished_at ?? ok.started_at : null,
      error: latest?.error ?? null,
    };
  });
}

const newer = (a: ExtRow, b: ExtRow) => (a.day !== b.day ? a.day > b.day : a.fetched_at > b.fetched_at);

/** The newest row per dims_key-like key (built by `keyOf`) for one report. */
export function latestBy(rows: readonly ExtRow[], report: string, keyOf: (r: ExtRow) => string): Map<string, ExtRow> {
  const out = new Map<string, ExtRow>();
  for (const r of rows) {
    if (r.report !== report) continue;
    const k = keyOf(r);
    const cur = out.get(k);
    if (!cur || newer(r, cur)) out.set(k, r);
  }
  return out;
}

/** Rows of `report` on its newest day only (e.g. today's sitemap list). */
export function latestDayRows(rows: readonly ExtRow[], report: string): ExtRow[] {
  const mine = rows.filter((r) => r.report === report);
  const day = mine.reduce<string | null>((d, r) => (d === null || r.day > d ? r.day : d), null);
  return mine.filter((r) => r.day === day);
}

/** Chart rows: one per day (oldest first), one numeric column per path for `metric` on `device`. */
export function psiTrend(
  rows: readonly ExtRow[],
  paths: readonly string[],
  device: string,
  metric = 'perf_score',
): Array<Record<string, string | number | null>> {
  const byDay = new Map<string, Record<string, string | number | null>>();
  for (const r of rows) {
    if (r.report !== 'psi_url' || r.dims.device !== device || !paths.includes(r.dims.path)) continue;
    const v = r.metrics[metric];
    const row = byDay.get(r.day) ?? { day: r.day.slice(5) };
    row[r.dims.path] = typeof v === 'number' ? v : null;
    byDay.set(r.day, row);
  }
  return [...byDay.entries()].sort(([a], [b]) => (a < b ? -1 : 1)).map(([, v]) => v);
}

export const metricNum = (v: MetricValue | undefined): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);
export const metricStr = (v: MetricValue | undefined): string | null => (typeof v === 'string' && v !== '' ? v : null);
