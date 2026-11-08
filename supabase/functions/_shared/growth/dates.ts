/**
 * Date helpers for growth-sync (pure; imported by vitest).
 * All days are ISO 'YYYY-MM-DD' strings handled in UTC so no local timezone
 * (the founder's PC runs ru-RU / Denver) can shift them.
 */

export const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

/** GA4 history property data starts here (founder request). */
export const GA4_DEFAULT_FROM = '2026-01-01';
/** Search Console keeps at most 16 months of data. */
export const GSC_MAX_MONTHS = 16;
/** Daily mode re-fetches this many days, ending today (UTC). */
export const DAILY_WINDOW_DAYS = 5;

export function isIsoDay(s: unknown): s is string {
  if (typeof s !== 'string' || !ISO_DAY.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

export function toIsoDay(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function addDays(day: string, n: number): string {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return toIsoDay(d);
}

/** Same day of month n months back (clamped to month end), e.g. 2026-03-31 -> 2026-02-28. */
export function addMonths(day: string, n: number): string {
  const [y, m, dd] = day.split('-').map(Number);
  const target = new Date(Date.UTC(y, m - 1 + n, 1));
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(dd, lastDay));
  return toIsoDay(target);
}

export function maxDay(a: string, b: string): string {
  return a > b ? a : b;
}

export function minDay(a: string, b: string): string {
  return a < b ? a : b;
}

/** Earliest day Search Console still serves, given today (UTC). */
export function gscDefaultFrom(today: string): string {
  return addMonths(today, -GSC_MAX_MONTHS);
}

/** Daily mode window: the last DAILY_WINDOW_DAYS days including today. */
export function dailyWindow(today: string): { from: string; to: string } {
  return { from: addDays(today, -(DAILY_WINDOW_DAYS - 1)), to: today };
}

/**
 * Split [from, to] (inclusive) into calendar-month chunks:
 * 2026-01-15..2026-03-02 -> [01-15..01-31, 02-01..02-28, 03-01..03-02].
 * Returns [] when from > to.
 */
export function monthChunks(from: string, to: string): Array<{ from: string; to: string }> {
  const out: Array<{ from: string; to: string }> = [];
  if (!isIsoDay(from) || !isIsoDay(to) || from > to) return out;
  let start = from;
  while (start <= to) {
    const [y, m] = start.split('-').map(Number);
    const monthEnd = toIsoDay(new Date(Date.UTC(y, m, 0)));
    const end = minDay(monthEnd, to);
    out.push({ from: start, to: end });
    start = addDays(end, 1);
  }
  return out;
}

/** GA4 returns the date dimension as 'YYYYMMDD'. */
export function ga4DateToIso(s: string): string | null {
  if (!/^\d{8}$/.test(s)) return null;
  const iso = `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
  return isIsoDay(iso) ? iso : null;
}
