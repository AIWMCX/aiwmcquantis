/**
 * /admin/growth table shaping (pure). Input: admin_growth_summary() JSON.
 * Days are ISO 'YYYY-MM-DD' strings and are handled in UTC so the PC locale
 * or timezone never shifts them.
 */

export type GrowthSourceKey = 'ga4' | 'gsc' | 'clarity';

export interface GrowthSummary {
  generated_at: string;
  denver_today: string;
  from: string;
  to: string;
  first_party: Array<{ day: string; sessions: number; engaged_sessions: number }>;
  ext: Array<{ source: GrowthSourceKey; day: string; metrics: Record<string, number>; fetched_at: string }>;
}

export interface GrowthRow {
  key: string; // day 'YYYY-MM-DD' or month 'YYYY-MM'
  fp_sessions: number;
  fp_engaged: number;
  ga4: null | { users: number; sessions: number; engaged: number; views: number; key_events: number };
  gsc: null | { clicks: number; impressions: number; ctr: number | null; position: number | null };
  clarity: null | { sessions: number };
}

export function addDaysIso(day: string, n: number): string {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** Days from `to` back to `from`, newest first. */
export function daysDesc(from: string, to: string): string[] {
  const out: string[] = [];
  for (let d = to; d >= from; d = addDaysIso(d, -1)) out.push(d);
  return out;
}

const n = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : Number(v) || 0);

/** One row per day in [from, to], newest first. Missing sources stay null. */
export function buildDailyRows(s: GrowthSummary, from: string, to: string): GrowthRow[] {
  const fp = new Map(s.first_party.map((r) => [r.day, r]));
  const ext = new Map<string, Record<string, number>>();
  for (const r of s.ext) ext.set(`${r.source}|${r.day}`, r.metrics);
  return daysDesc(from, to).map((day) => {
    const g = ext.get(`ga4|${day}`);
    const c = ext.get(`gsc|${day}`);
    const cl = ext.get(`clarity|${day}`);
    return {
      key: day,
      fp_sessions: n(fp.get(day)?.sessions),
      fp_engaged: n(fp.get(day)?.engaged_sessions),
      ga4: g ? {
        users: n(g.activeUsers), sessions: n(g.sessions), engaged: n(g.engagedSessions),
        views: n(g.screenPageViews), key_events: n(g.keyEvents),
      } : null,
      gsc: c ? {
        clicks: n(c.clicks), impressions: n(c.impressions),
        ctr: n(c.impressions) > 0 ? n(c.clicks) / n(c.impressions) : null,
        position: n(c.impressions) > 0 ? n(c.position) : null,
      } : null,
      clarity: cl ? { sessions: n(cl.sessions) } : null,
    };
  });
}

/**
 * Month totals from daily rows (newest month first). Sums everything; GSC CTR
 * is clicks / impressions and position is impression-weighted. GA4 users are
 * a sum of daily users, not deduplicated across the month.
 */
export function aggregateMonthly(daily: GrowthRow[]): GrowthRow[] {
  const months = new Map<string, GrowthRow & { _posW: number }>();
  for (const r of daily) {
    const key = r.key.slice(0, 7);
    let m = months.get(key);
    if (!m) {
      m = { key, fp_sessions: 0, fp_engaged: 0, ga4: null, gsc: null, clarity: null, _posW: 0 };
      months.set(key, m);
    }
    m.fp_sessions += r.fp_sessions;
    m.fp_engaged += r.fp_engaged;
    if (r.ga4) {
      m.ga4 ??= { users: 0, sessions: 0, engaged: 0, views: 0, key_events: 0 };
      m.ga4.users += r.ga4.users;
      m.ga4.sessions += r.ga4.sessions;
      m.ga4.engaged += r.ga4.engaged;
      m.ga4.views += r.ga4.views;
      m.ga4.key_events += r.ga4.key_events;
    }
    if (r.gsc) {
      m.gsc ??= { clicks: 0, impressions: 0, ctr: null, position: null };
      m.gsc.clicks += r.gsc.clicks;
      m.gsc.impressions += r.gsc.impressions;
      m._posW += (r.gsc.position ?? 0) * r.gsc.impressions;
    }
    if (r.clarity) {
      m.clarity ??= { sessions: 0 };
      m.clarity.sessions += r.clarity.sessions;
    }
  }
  return [...months.values()]
    .sort((a, b) => (a.key < b.key ? 1 : -1))
    .map(({ _posW, ...m }) => {
      if (m.gsc && m.gsc.impressions > 0) {
        m.gsc.ctr = m.gsc.clicks / m.gsc.impressions;
        m.gsc.position = _posW / m.gsc.impressions;
      }
      return m;
    });
}

/** Calendar months [from .. to] as {from, to} day ranges, oldest first (backfill driver). */
export function monthRanges(from: string, to: string): Array<{ from: string; to: string }> {
  const out: Array<{ from: string; to: string }> = [];
  let start = from;
  while (start <= to) {
    const [y, m] = start.split('-').map(Number);
    const monthEnd = new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
    const end = monthEnd < to ? monthEnd : to;
    out.push({ from: start, to: end });
    start = addDaysIso(end, 1);
  }
  return out;
}
