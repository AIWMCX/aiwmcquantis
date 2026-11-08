/**
 * IndexNow ping results -> ext_metrics_daily rows (report 'indexnow_ping').
 * Pure; imported by growth-sync and vitest.
 *
 * Nothing here calls IndexNow. scripts/indexnow-ping.mjs pings it after each
 * production deploy and then POSTs a summary to growth-sync
 * ({mode: 'ping', source: 'indexnow', ping: {...}}) with the shared
 * x-cron-secret header, so each real ping leaves one row. IndexNow itself
 * only answers "accepted" (200/202) or an error; it never says whether a
 * search engine crawled or indexed anything.
 */
import { dimsKey, type MetricRow } from './rows.ts';

export interface IndexNowPing {
  http_status: number;
  url_count: number;
  pinged_at: string;
  duration_ms: number | null;
  commit_sha: string | null;
}

/** IndexNow's success codes: 200 OK, 202 accepted (key validation pending). */
export function indexNowAccepted(status: number): boolean {
  return status === 200 || status === 202;
}

const intIn = (v: unknown, lo: number, hi: number): number | null =>
  typeof v === 'number' && Number.isInteger(v) && v >= lo && v <= hi ? v : null;

/**
 * Validate the summary the deploy step sends. Rejects anything that is not a
 * plausible real ping (so a bad caller cannot write junk rows). pinged_at must
 * be within the last 2 days and not more than 10 minutes in the future.
 */
export function parseIndexNowPing(body: unknown, now: Date): { ok: true; ping: IndexNowPing } | { ok: false; error: string } {
  const p = (body && typeof body === 'object' ? (body as { ping?: unknown }).ping : null) as Record<string, unknown> | null;
  if (!p || typeof p !== 'object') return { ok: false, error: 'ping object is required' };
  const http_status = intIn(p.http_status, 100, 599);
  if (http_status === null) return { ok: false, error: 'ping.http_status must be an HTTP status code' };
  const url_count = intIn(p.url_count, 0, 10_000);
  if (url_count === null) return { ok: false, error: 'ping.url_count must be an integer 0-10000' };
  const t = typeof p.pinged_at === 'string' ? new Date(p.pinged_at) : null;
  if (!t || Number.isNaN(t.getTime())) return { ok: false, error: 'ping.pinged_at must be an ISO timestamp' };
  const age = now.getTime() - t.getTime();
  if (age > 2 * 86_400_000 || age < -10 * 60_000) return { ok: false, error: 'ping.pinged_at is not recent' };
  const duration_ms = intIn(p.duration_ms, 0, 600_000);
  const commit_sha = typeof p.commit_sha === 'string' && /^[0-9a-f]{7,40}$/.test(p.commit_sha) ? p.commit_sha : null;
  return { ok: true, ping: { http_status, url_count, pinged_at: t.toISOString(), duration_ms, commit_sha } };
}

/** One row per ping: dims {pinged_at} keeps several deploys on the same day apart. */
export function indexNowRow(ping: IndexNowPing): MetricRow {
  const dims = { pinged_at: ping.pinged_at };
  return {
    source: 'indexnow',
    day: ping.pinged_at.slice(0, 10),
    report: 'indexnow_ping',
    dims,
    metrics: {
      http_status: ping.http_status,
      url_count: ping.url_count,
      accepted: indexNowAccepted(ping.http_status) ? 1 : 0,
      duration_ms: ping.duration_ms,
      commit_sha: ping.commit_sha,
    },
    dims_key: dimsKey(dims),
  };
}
