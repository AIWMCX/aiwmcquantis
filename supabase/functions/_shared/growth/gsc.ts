/**
 * Search Console API searchanalytics.query report specs, request building and
 * response -> ext_metrics_daily row mapping. Pure except fetchGscReport().
 *
 * Docs: https://developers.google.com/webmaster-tools/v1/searchanalytics/query
 * Data lags 2-3 days and covers at most 16 months. Rows grouped by query
 * omit anonymized queries, so query totals are below the overview totals.
 */
import { isIsoDay } from './dates.ts';
import { dimsKey, num, topNPerDay, type GrowthReport, type MetricRow } from './rows.ts';

export const GSC_DEFAULT_SITE_URL = 'sc-domain:aiwmcquantis.com';

export interface GscReportSpec {
  report: GrowthReport;
  dimension: 'query' | 'page' | 'country' | 'device' | null;
  /** Rows kept per day, ranked by clicks then impressions. */
  topPerDay: number;
}

export const GSC_REPORTS: readonly GscReportSpec[] = [
  { report: 'gsc_overview', dimension: null, topPerDay: Infinity },
  { report: 'gsc_query', dimension: 'query', topPerDay: 200 },
  { report: 'gsc_page', dimension: 'page', topPerDay: 200 },
  { report: 'gsc_country', dimension: 'country', topPerDay: Infinity },
  { report: 'gsc_device', dimension: 'device', topPerDay: Infinity },
];

/** API maximum rowLimit. */
export const GSC_PAGE_LIMIT = 25_000;
export const GSC_MAX_PAGES = 10;

export function gscQueryUrl(siteUrl: string): string {
  return `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`;
}

export function buildGscRequest(spec: GscReportSpec, from: string, to: string, startRow = 0): Record<string, unknown> {
  const dimensions = ['date'];
  if (spec.dimension) dimensions.push(spec.dimension);
  return {
    startDate: from,
    endDate: to,
    dimensions,
    type: 'web',
    rowLimit: GSC_PAGE_LIMIT,
    startRow,
    // Default 'final': only finalized days, so a re-fetch never lowers a number.
    dataState: 'final',
  };
}

export interface GscResponse {
  rows?: Array<{
    keys?: string[];
    clicks?: number;
    impressions?: number;
    ctr?: number;
    position?: number;
  }>;
  responseAggregationType?: string;
}

/** keys[] follow the request's dimensions order: ['date', dimension?]. */
export function mapGscResponse(spec: GscReportSpec, res: GscResponse): MetricRow[] {
  const out: MetricRow[] = [];
  for (const row of res.rows ?? []) {
    const keys = row.keys ?? [];
    const day = keys[0] ?? '';
    if (!isIsoDay(day)) continue;
    const dims: Record<string, string> = {};
    if (spec.dimension) dims[spec.dimension] = keys[1] ?? '';
    out.push({
      source: 'gsc',
      day,
      report: spec.report,
      dims,
      metrics: {
        clicks: num(row.clicks),
        impressions: num(row.impressions),
        ctr: num(row.ctr),
        position: num(row.position),
      },
      dims_key: dimsKey(dims),
    });
  }
  return out;
}

export function finalizeGscRows(spec: GscReportSpec, rows: MetricRow[]): MetricRow[] {
  return topNPerDay(rows, spec.topPerDay, 'clicks', 'impressions');
}

/** Network: every page of one report for [from, to]. */
export async function fetchGscReport(
  spec: GscReportSpec,
  siteUrl: string,
  from: string,
  to: string,
  accessToken: string,
  fetchImpl: typeof fetch = fetch,
): Promise<{ rows: MetricRow[]; pages: number; truncated: boolean }> {
  const all: MetricRow[] = [];
  let startRow = 0;
  let pages = 0;
  let truncated = true;
  for (; pages < GSC_MAX_PAGES; pages++) {
    const res = await fetchImpl(gscQueryUrl(siteUrl), {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(buildGscRequest(spec, from, to, startRow)),
    });
    const body = (await res.json().catch(() => ({}))) as GscResponse & { error?: { message?: string; status?: string } };
    if (!res.ok) {
      throw new Error(`GSC ${spec.report} ${from}..${to}: ${body.error?.status ?? res.status} ${body.error?.message ?? ''}`.trim());
    }
    const got = body.rows?.length ?? 0;
    all.push(...mapGscResponse(spec, body));
    startRow += got;
    if (got < GSC_PAGE_LIMIT) {
      pages++;
      truncated = false;
      break;
    }
  }
  return { rows: finalizeGscRows(spec, all), pages, truncated };
}
