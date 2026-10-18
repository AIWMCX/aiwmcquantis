/**
 * Convert a Mountain Time (America/Denver) wall-clock date + time to a UTC
 * ISO string, using the correct offset for that specific date (MDT -06:00 in
 * summer, MST -07:00 in winter). Replaces a hard-coded "-07:00" that put every
 * post scheduled during daylight-saving time an hour late.
 */
const TZ = 'America/Denver';

function denverParts(ms: number) {
  const f = new Intl.DateTimeFormat('en-US', {
    timeZone: TZ, hourCycle: 'h23',
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
  const p = Object.fromEntries(f.formatToParts(new Date(ms)).map((x) => [x.type, x.value]));
  return Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
}

/** @param date "YYYY-MM-DD"  @param time "HH:MM" or "HH:MM:SS" (Denver wall clock) */
export function denverWallTimeToUtcIso(date: string, time: string): string {
  const [y, m, d] = date.split('-').map(Number);
  const [hh, mm, ss = 0] = time.split(':').map(Number);
  const wall = Date.UTC(y, m - 1, d, hh, mm, ss);
  // First guess: treat wall time as UTC, measure Denver's offset at that
  // instant, correct once, then re-check (handles the DST boundary).
  let utc = wall - (denverParts(wall) - wall);
  utc = wall - (denverParts(utc) - utc);
  return new Date(utc).toISOString();
}
