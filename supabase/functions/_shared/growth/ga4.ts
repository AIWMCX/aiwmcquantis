/**
 * GA4 Data API v1beta (properties/{id}:runReport) report specs, request
 * building and response -> ext_metrics_daily row mapping. Pure except
 * fetchGa4Report(), which takes the fetch implementation as an argument.
 *
 * Docs: https://developers.google.com/analytics/devguides/reporting/data/v1/rest/v1beta/properties/runReport
 */
import { ga4DateToIso } from './dates.ts';
import { dimsKey, num, topNPerDay, type GrowthReport, type MetricRow } from './rows.ts';

export const GA4_DEFAULT_PROPERTY_ID = '520326058';

export const GA4_OVERVIEW_METRICS = [
  'activeUsers', 'newUsers', 'sessions', 'engagedSessions', 'screenPageViews',
  'eventCount', 'keyEvents', 'averageSessionDuration', 'bounceRate',
] as const;

export const GA4_BREAKDOWN_METRICS = [
  'activeUsers', 'sessions', 'engagedSessions', 'screenPageViews', 'keyEvents',
] as const;

export interface Ga4ReportSpec {
  report: GrowthReport;
  /** The non-date dimension, or null for the overview. */
  dimension: string | null;
  metrics: readonly string[];
  /** Rows kept per day, ranked by sessions. */
  topPerDay: number;
}

export const GA4_REPORTS: readonly Ga4ReportSpec[] = [
  { report: 'ga4_overview', dimension: null, metrics: GA4_OVERVIEW_METRICS, topPerDay: Infinity },
  { report: 'ga4_channel', dimension: 'sessionDefaultChannelGroup', metrics: GA4_BREAKDOWN_METRICS, topPerDay: Infinity },
  { report: 'ga4_landing_page', dimension: 'landingPagePlusQueryString', metrics: GA4_BREAKDOWN_METRICS, topPerDay: 50 },
  { report: 'ga4_source_medium', dimension: 'sessionSourceMedium', metrics: GA4_BREAKDOWN_METRICS, topPerDay: 50 },
  { report: 'ga4_country', dimension: 'country', metrics: GA4_BREAKDOWN_METRICS, topPerDay: 30 },
  { report: 'ga4_device', dimension: 'deviceCategory', metrics: GA4_BREAKDOWN_METRICS, topPerDay: Infinity },
];

/** Rows per page; the API maximum is 250,000. */
export const GA4_PAGE_LIMIT = 10_000;
export const GA4_MAX_PAGES = 20;

export function ga4RunReportUrl(propertyId: string): string {
  return `https://analyticsdata.googleapis.com/v1beta/properties/${encodeURIComponent(propertyId)}:runReport`;
}

export function buildGa4Request(spec: Ga4ReportSpec, from: string, to: string, offset = 0): Record<string, unknown> {
  const dimensions = [{ name: 'date' }];
  if (spec.dimension) dimensions.push({ name: spec.dimension });
  return {
    dateRanges: [{ startDate: from, endDate: to }],
    dimensions,
    metrics: spec.metrics.map((name) => ({ name })),
    orderBys: [
      { dimension: { dimensionName: 'date' } },
      { metric: { metricName: 'sessions' }, desc: true },
    ],
    limit: GA4_PAGE_LIMIT,
    offset,
    keepEmptyRows: false,
    returnPropertyQuota: true,
  };
}

/** The subset of a runReport response this module reads. */
export interface Ga4Response {
  dimensionHeaders?: Array<{ name: string }>;
  metricHeaders?: Array<{ name: string; type?: string }>;
  rows?: Array<{
    dimensionValues?: Array<{ value?: string }>;
    metricValues?: Array<{ value?: string }>;
  }>;
  rowCount?: number;
  metadata?: {
    subjectToThresholding?: boolean;
    dataLossFromOtherRow?: boolean;
    samplingMetadatas?: Array<{ samplesReadCount?: string; samplingSpaceSize?: string }>;
    currencyCode?: string;
    timeZone?: string;
  };
  propertyQuota?: Record<string, { consumed?: number; remaining?: number }>;
}

/** Data-quality flags GA4 attaches to a response; stored in ext_sync_runs.details. */
export interface Ga4Quality {
  subjectToThresholding: boolean;
  dataLossFromOtherRow: boolean;
  sampled: boolean;
  timeZone: string | null;
  tokensPerDayRemaining: number | null;
}

export function ga4Quality(res: Ga4Response): Ga4Quality {
  const md = res.metadata ?? {};
  return {
    subjectToThresholding: md.subjectToThresholding === true,
    dataLossFromOtherRow: md.dataLossFromOtherRow === true,
    sampled: Array.isArray(md.samplingMetadatas) && md.samplingMetadatas.length > 0,
    timeZone: md.timeZone ?? null,
    tokensPerDayRemaining: res.propertyQuota?.tokensPerDay?.remaining ?? null,
  };
}

/**
 * Map one response page to rows. Header order comes from the response, never
 * assumed. Rows with an unparseable date are dropped. Does NOT apply the
 * per-day top-N cut (that needs every page): see finalizeGa4Rows().
 */
export function mapGa4Response(spec: Ga4ReportSpec, res: Ga4Response): MetricRow[] {
  const dimNames = (res.dimensionHeaders ?? []).map((h) => h.name);
  const metricNames = (res.metricHeaders ?? []).map((h) => h.name);
  const dateIdx = dimNames.indexOf('date');
  if (dateIdx < 0) return [];
  const out: MetricRow[] = [];
  for (const row of res.rows ?? []) {
    const dv = row.dimensionValues ?? [];
    const day = ga4DateToIso(dv[dateIdx]?.value ?? '');
    if (!day) continue;
    const dims: Record<string, string> = {};
    dimNames.forEach((name, i) => {
      if (name !== 'date') dims[name] = dv[i]?.value ?? '';
    });
    const metrics: Record<string, number> = {};
    metricNames.forEach((name, i) => {
      metrics[name] = num(row.metricValues?.[i]?.value);
    });
    out.push({ source: 'ga4', day, report: spec.report, dims, metrics, dims_key: dimsKey(dims) });
  }
  return out;
}

export function finalizeGa4Rows(spec: Ga4ReportSpec, rows: MetricRow[]): MetricRow[] {
  return topNPerDay(rows, spec.topPerDay, 'sessions', 'activeUsers');
}

/** Network: every page of one report for [from, to]. */
export async function fetchGa4Report(
  spec: Ga4ReportSpec,
  propertyId: string,
  from: string,
  to: string,
  accessToken: string,
  fetchImpl: typeof fetch = fetch,
): Promise<{ rows: MetricRow[]; quality: Ga4Quality; pages: number; truncated: boolean }> {
  const all: MetricRow[] = [];
  let quality: Ga4Quality | null = null;
  let offset = 0;
  let pages = 0;
  let truncated = true;
  for (; pages < GA4_MAX_PAGES; pages++) {
    const res = await fetchImpl(ga4RunReportUrl(propertyId), {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(buildGa4Request(spec, from, to, offset)),
    });
    const body = (await res.json().catch(() => ({}))) as Ga4Response & { error?: { message?: string; status?: string } };
    if (!res.ok) {
      throw new Error(`GA4 ${spec.report} ${from}..${to}: ${body.error?.status ?? res.status} ${body.error?.message ?? ''}`.trim());
    }
    const q = ga4Quality(body);
    quality = quality
      ? {
          ...q,
          subjectToThresholding: quality.subjectToThresholding || q.subjectToThresholding,
          dataLossFromOtherRow: quality.dataLossFromOtherRow || q.dataLossFromOtherRow,
          sampled: quality.sampled || q.sampled,
        }
      : q;
    const pageRows = mapGa4Response(spec, body);
    all.push(...pageRows);
    const got = body.rows?.length ?? 0;
    offset += got;
    if (got === 0 || offset >= (body.rowCount ?? 0)) {
      pages++;
      truncated = false;
      break;
    }
  }
  return {
    rows: finalizeGa4Rows(spec, all),
    quality: quality ?? ga4Quality({}),
    pages,
    truncated,
  };
}
