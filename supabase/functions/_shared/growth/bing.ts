/**
 * Bing Webmaster Tools API -> ext_metrics_daily rows (source 'bing').
 * Optional: only called when the BING_WEBMASTER_API_KEY edge secret is set.
 * Pure except fetchBing().
 *
 * Endpoint names and payloads are taken from the official reference
 * (Microsoft Learn, IWebmasterApi), not guessed:
 *   GetRankAndTrafficStats(siteUrl) -> List<RankAndTrafficStats> {Clicks, Date, Impressions}
 *     https://learn.microsoft.com/en-us/dotnet/api/microsoft.bing.webmaster.api.interfaces.iwebmasterapi.getrankandtrafficstats
 *   GetCrawlStats(siteUrl) -> List<CrawlStats> for the last 6 months
 *     {AllOtherCodes, BlockedByRobotsTxt, Code2xx, Code301, Code302, Code4xx, Code5xx,
 *      ContainsMalware, CrawlErrors, CrawledPages, Date, InIndex, InLinks}
 *     https://learn.microsoft.com/en-us/dotnet/api/microsoft.bing.webmaster.api.interfaces.iwebmasterapi.getcrawlstats
 *   JSON form: GET https://ssl.bing.com/webmaster/api.svc/json/<Method> with the
 *   query parameters siteUrl and apikey; the response is {"d": [...]} and
 *   Date is a WCF date string "/Date(1316156400000-0700)/".
 *
 * Every call returns Bing's whole recent history (one entry per day), so the
 * daily run simply upserts all of it; there is no separate backfill.
 */
import { dimsKey, numOrNull, type MetricRow } from './rows.ts';
import { redact } from './psi.ts';

export const BING_API_BASE = 'https://ssl.bing.com/webmaster/api.svc/json';
export const BING_SITE_URL = 'https://www.aiwmcquantis.com/';
export type BingMethod = 'GetRankAndTrafficStats' | 'GetCrawlStats';

export function bingRequestUrl(method: BingMethod, siteUrl: string, apiKey: string): string {
  const q = new URLSearchParams();
  q.set('siteUrl', siteUrl);
  q.set('apikey', apiKey);
  return `${BING_API_BASE}/${method}?${q.toString()}`;
}

/**
 * "/Date(1316156400000-0700)/" -> "2011-09-16": the calendar day in the
 * offset Bing sent (its days are Pacific). ISO strings are accepted too.
 */
export function parseBingDate(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  const m = /^\/Date\((-?\d+)([+-])(\d{2})(\d{2})\)\/$/.exec(v) ?? /^\/Date\((-?\d+)\)\/$/.exec(v);
  if (m) {
    const ms = Number(m[1]);
    const offsetMin = m[2] ? (m[2] === '-' ? -1 : 1) * (Number(m[3]) * 60 + Number(m[4])) : 0;
    const d = new Date(ms + offsetMin * 60_000);
    return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
  }
  const iso = /^(\d{4}-\d{2}-\d{2})T/.exec(v);
  return iso ? iso[1] : null;
}

export interface BingResponse<T> {
  d?: T[];
}

export interface RankAndTrafficStats {
  Clicks?: number;
  Impressions?: number;
  Date?: string;
}

export interface CrawlStats {
  AllOtherCodes?: number;
  BlockedByRobotsTxt?: number;
  Code2xx?: number;
  Code301?: number;
  Code302?: number;
  Code4xx?: number;
  Code5xx?: number;
  ContainsMalware?: number;
  CrawlErrors?: number;
  CrawledPages?: number;
  Date?: string;
  InIndex?: number;
  InLinks?: number;
}

/** One 'bing_traffic' row per day; two entries on the same day are summed. */
export function mapBingTraffic(res: BingResponse<RankAndTrafficStats>): MetricRow[] {
  const byDay = new Map<string, { clicks: number; impressions: number }>();
  for (const e of res.d ?? []) {
    const day = parseBingDate(e.Date);
    if (!day) continue;
    const cur = byDay.get(day) ?? { clicks: 0, impressions: 0 };
    cur.clicks += numOrNull(e.Clicks) ?? 0;
    cur.impressions += numOrNull(e.Impressions) ?? 0;
    byDay.set(day, cur);
  }
  return [...byDay.entries()].sort(([a], [b]) => (a < b ? -1 : 1)).map(([day, m]) => ({
    source: 'bing', day, report: 'bing_traffic', dims: {}, metrics: { ...m }, dims_key: dimsKey({}),
  }));
}

const CRAWL_FIELDS: Array<[keyof CrawlStats, string]> = [
  ['CrawledPages', 'crawled_pages'],
  ['InIndex', 'in_index'],
  ['InLinks', 'in_links'],
  ['CrawlErrors', 'crawl_errors'],
  ['BlockedByRobotsTxt', 'blocked_by_robots_txt'],
  ['ContainsMalware', 'contains_malware'],
  ['Code2xx', 'code_2xx'],
  ['Code301', 'code_301'],
  ['Code302', 'code_302'],
  ['Code4xx', 'code_4xx'],
  ['Code5xx', 'code_5xx'],
  ['AllOtherCodes', 'all_other_codes'],
];

/** One 'bing_crawl' row per day (last entry wins if Bing repeats a day). */
export function mapBingCrawl(res: BingResponse<CrawlStats>): MetricRow[] {
  const byDay = new Map<string, MetricRow>();
  for (const e of res.d ?? []) {
    const day = parseBingDate(e.Date);
    if (!day) continue;
    const metrics: Record<string, number | null> = {};
    for (const [from, to] of CRAWL_FIELDS) metrics[to] = numOrNull(e[from]);
    byDay.set(day, { source: 'bing', day, report: 'bing_crawl', dims: {}, metrics, dims_key: dimsKey({}) });
  }
  return [...byDay.values()].sort((a, b) => (a.day < b.day ? -1 : 1));
}

export interface BingRunResult {
  status: 'ok' | 'partial' | 'error' | 'not_configured';
  rows: MetricRow[];
  errors: string[];
}

/** Both Bing calls. No key -> 'not_configured' and no network call at all. */
export async function runBing(
  apiKey: string | null | undefined,
  siteUrl: string = BING_SITE_URL,
  fetchImpl: typeof fetch = fetch,
): Promise<BingRunResult> {
  const key = apiKey?.trim();
  if (!key) return { status: 'not_configured', rows: [], errors: ['BING_WEBMASTER_API_KEY is not set'] };
  const [traffic, crawl] = await Promise.allSettled([
    fetchBing<RankAndTrafficStats>('GetRankAndTrafficStats', siteUrl, key, fetchImpl),
    fetchBing<CrawlStats>('GetCrawlStats', siteUrl, key, fetchImpl),
  ]);
  const rows: MetricRow[] = [];
  const errors: string[] = [];
  const reason = (r: PromiseRejectedResult) => (r.reason instanceof Error ? r.reason.message : String(r.reason));
  if (traffic.status === 'fulfilled') rows.push(...mapBingTraffic(traffic.value));
  else errors.push(reason(traffic));
  if (crawl.status === 'fulfilled') rows.push(...mapBingCrawl(crawl.value));
  else errors.push(reason(crawl));
  return { status: errors.length === 0 ? 'ok' : errors.length === 2 ? 'error' : 'partial', rows, errors };
}

/** Network: one Bing call. The error text never contains the request URL (it carries the key). */
export async function fetchBing<T>(
  method: BingMethod,
  siteUrl: string,
  apiKey: string,
  fetchImpl: typeof fetch = fetch,
): Promise<BingResponse<T>> {
  let res: Response;
  try {
    res = await fetchImpl(bingRequestUrl(method, siteUrl, apiKey), {
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      signal: AbortSignal.timeout(30_000),
    });
  } catch (e) {
    throw new Error(redact(`Bing ${method}: ${e instanceof Error ? e.message : String(e)}`, apiKey));
  }
  const text = await res.text().catch(() => '');
  if (!res.ok) {
    // Bing faults look like {"ErrorCode":14,"Message":"..."}.
    let detail = text.slice(0, 200);
    try {
      const f = JSON.parse(text) as { ErrorCode?: number; Message?: string };
      if (f && (f.ErrorCode !== undefined || f.Message)) detail = `ErrorCode ${f.ErrorCode ?? '?'} ${f.Message ?? ''}`.trim();
    } catch { /* not JSON */ }
    throw new Error(redact(`Bing ${method}: HTTP ${res.status} ${detail}`.trim(), apiKey));
  }
  try {
    return JSON.parse(text) as BingResponse<T>;
  } catch {
    throw new Error(`Bing ${method}: response is not JSON`);
  }
}
