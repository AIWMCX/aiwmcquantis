/**
 * Microsoft Clarity Data Export API (project-live-insights). Optional: only
 * called when the CLARITY_API_TOKEN edge secret is set.
 *
 * Docs: https://learn.microsoft.com/en-us/clarity/setup-and-installation/clarity-data-export-api
 *   GET https://www.clarity.ms/export-data/api/v1/project-live-insights?numOfDays=1
 *   Authorization: Bearer <token>; numOfDays 1-3; 10 calls per project per day.
 *
 * The API returns one total for the last N x 24 hours ending at the call, not
 * calendar days, and cannot go further back. So growth-sync calls it once
 * per run (daily mode only, never in backfill) with numOfDays=1 and stores the
 * total on the day before the call (the 13:15 UTC cron's window is mostly the
 * previous Denver day). The admin page labels it that way.
 */
import { addDays } from './dates.ts';
import { num, type MetricRow } from './rows.ts';

export const CLARITY_URL = 'https://www.clarity.ms/export-data/api/v1/project-live-insights';

export function clarityRequestUrl(numOfDays = 1): string {
  const n = Math.min(Math.max(Math.trunc(numOfDays), 1), 3);
  return `${CLARITY_URL}?numOfDays=${n}`;
}

export type ClarityResponse = Array<{
  metricName?: string;
  information?: Array<Record<string, unknown>>;
}>;

/** The "Traffic" metric -> one clarity_overview row for the day before fetchDay. */
export function mapClarityResponse(res: ClarityResponse, fetchDay: string): MetricRow[] {
  if (!Array.isArray(res)) return [];
  const traffic = res.find((m) => (m.metricName ?? '').toLowerCase() === 'traffic');
  const info = traffic?.information?.[0];
  if (!info) return [];
  const metrics: Record<string, number> = {
    sessions: num(info.totalSessionCount),
    bot_sessions: num(info.totalBotSessionCount),
    // The docs spell this field "distantUserCount".
    distinct_users: num(info.distantUserCount ?? info.distinctUserCount),
    pages_per_session: num(info.PagesPerSessionPercentage ?? info.pagesPerSessionPercentage),
  };
  return [{
    source: 'clarity',
    day: addDays(fetchDay, -1),
    report: 'clarity_overview',
    dims: {},
    metrics,
    dims_key: '{}',
  }];
}

export async function fetchClarity(
  token: string,
  fetchDay: string,
  fetchImpl: typeof fetch = fetch,
): Promise<MetricRow[]> {
  const res = await fetchImpl(clarityRequestUrl(1), {
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    // 429 = the 10 calls/day limit.
    throw new Error(`Clarity HTTP ${res.status} ${text.slice(0, 200)}`.trim());
  }
  return mapClarityResponse((await res.json()) as ClarityResponse, fetchDay);
}
