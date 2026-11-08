/**
 * Search Console sitemaps + URL Inspection -> ext_metrics_daily rows
 * (source 'indexing'). Same service account and token as gsc.ts. Pure except
 * fetchSitemaps() / inspectUrl() / runIndexing().
 *
 * Docs:
 *   sitemaps.list  https://developers.google.com/webmaster-tools/v1/sitemaps/list
 *     GET https://www.googleapis.com/webmasters/v3/sites/{siteUrl}/sitemaps
 *     Resource: https://developers.google.com/webmaster-tools/v1/sitemaps
 *     contents[].indexed is documented as "Deprecated; do not use": it is
 *     stored as returned and the page says not to trust it.
 *   urlInspection  https://developers.google.com/webmaster-tools/v1/urlInspection.index/inspect
 *     POST https://searchconsole.googleapis.com/v1/urlInspection/index:inspect
 *     {inspectionUrl, siteUrl, languageCode}. Scope webmasters.readonly.
 *     Result fields: .../urlInspection.index/UrlInspectionResult
 *     It reports the version in Google's index, not a live test.
 *
 * The service account has Restricted permission on sc-domain:aiwmcquantis.com.
 * Google does not document which permission each endpoint needs. A 403
 * (other than "API not enabled") is recorded as permission_denied with
 * Google's exact message, and the other endpoint and sources still run.
 */
import { dimsKey, numOrNull, strOrNull, type MetricRow, type MetricValue } from './rows.ts';
import { absoluteUrl } from './targets.ts';

export const URL_INSPECTION_ENDPOINT = 'https://searchconsole.googleapis.com/v1/urlInspection/index:inspect';

export function sitemapsListUrl(siteUrl: string): string {
  return `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/sitemaps`;
}

export function buildInspectionRequest(inspectionUrl: string, siteUrl: string): Record<string, string> {
  return { inspectionUrl, siteUrl, languageCode: 'en-US' };
}

/** A Google API error with the HTTP status and Google's own status/message kept apart. */
export class GoogleApiError extends Error {
  constructor(
    readonly endpoint: string,
    readonly httpStatus: number,
    readonly googleStatus: string | null,
    readonly googleMessage: string,
  ) {
    super(`${endpoint}: HTTP ${httpStatus}${googleStatus ? ` ${googleStatus}` : ''} ${googleMessage}`.trim());
    this.name = 'GoogleApiError';
  }
}

/**
 * True for "this login may not do that". A 403 that says the API is not
 * enabled in the GCP project is a setup error, not a permission level.
 */
export function isPermissionDenied(e: unknown): e is GoogleApiError {
  if (!(e instanceof GoogleApiError) || e.httpStatus !== 403) return false;
  return !/has not been used in project|is disabled|SERVICE_DISABLED|accessNotConfigured/i.test(e.googleMessage);
}

async function googleJson(
  endpoint: string,
  url: string,
  init: RequestInit,
  fetchImpl: typeof fetch,
): Promise<unknown> {
  const res = await fetchImpl(url, init);
  const body = (await res.json().catch(() => ({}))) as { error?: { message?: string; status?: string } };
  if (!res.ok) throw new GoogleApiError(endpoint, res.status, body.error?.status ?? null, body.error?.message ?? '');
  return body;
}

// ── sitemaps.list ───────────────────────────────────────────────────────────

export interface SitemapsResponse {
  sitemap?: Array<{
    path?: string;
    lastSubmitted?: string;
    isPending?: boolean;
    isSitemapsIndex?: boolean;
    type?: string;
    lastDownloaded?: string;
    warnings?: string | number;
    errors?: string | number;
    contents?: Array<{ type?: string; submitted?: string | number; indexed?: string | number }>;
  }>;
}

const sumOrNull = (vals: unknown[]): number | null => {
  const nums = vals.map(numOrNull).filter((v): v is number => v !== null);
  return nums.length ? nums.reduce((a, b) => a + b, 0) : null;
};
const bool01 = (v: unknown): number | null => (typeof v === 'boolean' ? (v ? 1 : 0) : null);

/** One 'indexing_sitemap' row per submitted sitemap, on `day`. int64 fields arrive as strings. */
export function mapSitemaps(res: SitemapsResponse, day: string): MetricRow[] {
  return (res.sitemap ?? []).filter((s) => strOrNull(s.path)).map((s) => {
    const contents = s.contents ?? [];
    const metrics: Record<string, MetricValue> = {
      type: strOrNull(s.type),
      is_pending: bool01(s.isPending),
      is_index: bool01(s.isSitemapsIndex),
      last_submitted: strOrNull(s.lastSubmitted),
      last_downloaded: strOrNull(s.lastDownloaded),
      errors: numOrNull(s.errors),
      warnings: numOrNull(s.warnings),
      submitted: sumOrNull(contents.map((c) => c.submitted)),
      // Deprecated by Google ("do not use"); kept only as returned.
      indexed: sumOrNull(contents.map((c) => c.indexed)),
    };
    const dims = { path: s.path as string };
    return { source: 'indexing', day, report: 'indexing_sitemap', dims, metrics, dims_key: dimsKey(dims) };
  });
}

export async function fetchSitemaps(siteUrl: string, token: string, fetchImpl: typeof fetch = fetch): Promise<SitemapsResponse> {
  return (await googleJson('sitemaps.list', sitemapsListUrl(siteUrl), {
    headers: { Authorization: `Bearer ${token}` },
  }, fetchImpl)) as SitemapsResponse;
}

// ── urlInspection.index.inspect ─────────────────────────────────────────────

export interface InspectionResponse {
  inspectionResult?: {
    inspectionResultLink?: string;
    indexStatusResult?: {
      verdict?: string;
      coverageState?: string;
      robotsTxtState?: string;
      indexingState?: string;
      lastCrawlTime?: string;
      pageFetchState?: string;
      googleCanonical?: string;
      userCanonical?: string;
      crawledAs?: string;
    };
  };
}

/** One 'indexing_url' row for `path` on `day`. Absent fields stay null (e.g. never crawled). */
export function mapInspection(res: InspectionResponse, path: string, day: string): MetricRow {
  const r = res.inspectionResult?.indexStatusResult ?? {};
  const metrics: Record<string, MetricValue> = {
    verdict: strOrNull(r.verdict),
    coverage_state: strOrNull(r.coverageState),
    indexing_state: strOrNull(r.indexingState),
    robots_txt_state: strOrNull(r.robotsTxtState),
    page_fetch_state: strOrNull(r.pageFetchState),
    last_crawl_time: strOrNull(r.lastCrawlTime),
    google_canonical: strOrNull(r.googleCanonical),
    user_canonical: strOrNull(r.userCanonical),
    crawled_as: strOrNull(r.crawledAs),
  };
  const dims = { path };
  return { source: 'indexing', day, report: 'indexing_url', dims, metrics, dims_key: dimsKey(dims) };
}

export async function inspectUrl(
  path: string,
  siteUrl: string,
  token: string,
  fetchImpl: typeof fetch = fetch,
): Promise<InspectionResponse> {
  return (await googleJson('urlInspection.index.inspect', URL_INSPECTION_ENDPOINT, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(buildInspectionRequest(absoluteUrl(path), siteUrl)),
  }, fetchImpl)) as InspectionResponse;
}

// ── one indexing run ───────────────────────────────────────────────────────

export type EndpointStatus = 'ok' | 'partial' | 'error' | 'permission_denied';

export interface EndpointResult {
  status: EndpointStatus;
  calls: number;
  rows: number;
  /** Google's exact error message (permission_denied / error). */
  google_message?: string;
  error?: string;
}

export interface IndexingRunResult {
  rows: MetricRow[];
  endpoints: { sitemaps: EndpointResult; url_inspection: EndpointResult };
}

/**
 * The source status from its two endpoints. permission_denied wins so the
 * page can say exactly what the founder has to change; rows from the other
 * endpoint are still written.
 */
export function combineIndexingStatus(e: IndexingRunResult['endpoints']): 'ok' | 'partial' | 'error' | 'permission_denied' {
  const all = [e.sitemaps.status, e.url_inspection.status];
  if (all.includes('permission_denied')) return 'permission_denied';
  if (all.every((s) => s === 'ok')) return 'ok';
  if (all.every((s) => s === 'error')) return 'error';
  return 'partial';
}

function failure(e: unknown, calls: number, rows: number): EndpointResult {
  if (isPermissionDenied(e)) return { status: 'permission_denied', calls, rows, google_message: e.googleMessage, error: e.message };
  if (e instanceof GoogleApiError) return { status: rows > 0 ? 'partial' : 'error', calls, rows, google_message: e.googleMessage, error: e.message };
  return { status: rows > 0 ? 'partial' : 'error', calls, rows, error: e instanceof Error ? e.message : String(e) };
}

export async function runIndexing(
  siteUrl: string,
  token: string,
  paths: readonly string[],
  day: string,
  opts: { deadline: number; fetchImpl?: typeof fetch; now?: () => number },
): Promise<IndexingRunResult> {
  const fetchImpl = opts.fetchImpl ?? fetch;
  const now = opts.now ?? Date.now;
  const rows: MetricRow[] = [];

  let sitemaps: EndpointResult;
  try {
    const sm = mapSitemaps(await fetchSitemaps(siteUrl, token, fetchImpl), day);
    rows.push(...sm);
    sitemaps = { status: 'ok', calls: 1, rows: sm.length };
  } catch (e) {
    sitemaps = failure(e, 1, 0);
  }

  let inspection: EndpointResult = { status: 'ok', calls: 0, rows: 0 };
  const errors: string[] = [];
  let lastGoogleMessage: string | undefined;
  for (const path of paths) {
    if (now() > opts.deadline) {
      errors.push(`time budget reached before ${path}`);
      break;
    }
    inspection.calls++;
    try {
      rows.push(mapInspection(await inspectUrl(path, siteUrl, token, fetchImpl), path, day));
      inspection.rows++;
    } catch (e) {
      if (isPermissionDenied(e)) {
        // Every other URL would get the same 403: stop here.
        inspection = failure(e, inspection.calls, inspection.rows);
        break;
      }
      if (e instanceof GoogleApiError) lastGoogleMessage = e.googleMessage;
      errors.push(e instanceof Error ? e.message : String(e));
    }
  }
  if (inspection.status === 'ok' && errors.length) {
    inspection = {
      status: inspection.rows > 0 ? 'partial' : 'error',
      calls: inspection.calls,
      rows: inspection.rows,
      ...(lastGoogleMessage !== undefined ? { google_message: lastGoogleMessage } : {}),
      error: errors.slice(0, 3).join(' | ').slice(0, 1000),
    };
  }
  return { rows, endpoints: { sitemaps, url_inspection: inspection } };
}
