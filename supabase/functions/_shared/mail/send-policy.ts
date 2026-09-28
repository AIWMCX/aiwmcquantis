/**
 * Outreach pacing policy — pure. Decides whether the paced sender may send
 * one more message right now, and if not, why.
 *
 * Rules (all must hold):
 *   - the kill switch is on (outreach_enabled);
 *   - the domain's mail DNS passes (MX → IONOS so replies come back to the
 *     mailboxes, SPF authorizes IONOS, DMARC present) — otherwise we would
 *     cold-email people whose replies can't reach us;
 *   - local time in the configured timezone is a sending weekday, inside
 *     [start_hour, end_hour);
 *   - fewer than the effective daily cap already sent today (local day),
 *     where the cap ramps up during warm-up: base + step × days since start;
 *   - at least min_gap_minutes since the previous send.
 */

export interface MailSettings {
  outreach_enabled: boolean;
  daily_cap: number;
  warmup_start: string | null; // YYYY-MM-DD
  warmup_base: number;
  warmup_step: number;
  min_gap_minutes: number;
  send_timezone: string;
  send_start_hour: number;
  send_end_hour: number;
  send_weekdays: number[]; // 1 = Monday … 7 = Sunday
}

export interface SendContext {
  now: Date;
  sentToday: number;
  lastSentAt: Date | null;
  dnsReady: boolean;
}

export type PolicyDecision =
  | { ok: true; cap: number }
  | { ok: false; reason: 'disabled' | 'dns_not_ready' | 'outside_window' | 'daily_cap_reached' | 'min_gap'; cap: number; detail: string };

/** Local calendar parts of `now` in `timeZone` (weekday 1 = Monday). */
export function localParts(now: Date, timeZone: string): { date: string; hour: number; weekday: number } {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hourCycle: 'h23',
    weekday: 'short',
  });
  const parts = Object.fromEntries(fmt.formatToParts(now).map((p) => [p.type, p.value]));
  const weekdays: Record<string, number> = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 };
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    hour: Number(parts.hour) % 24,
    weekday: weekdays[parts.weekday] ?? 0,
  };
}

/** Start of the current local day in `timeZone`, as a UTC instant. */
export function localDayStartUtc(now: Date, timeZone: string): Date {
  const { date } = localParts(now, timeZone);
  // Find the UTC instant whose local date is `date` at 00:00 by probing the
  // offset at noon UTC of that date (safe across DST changes, which never
  // happen at local midnight in the zones this is configured for).
  const noonUtc = new Date(`${date}T12:00:00Z`);
  const local = localParts(noonUtc, timeZone);
  const offsetHours = local.hour - 12 + (local.date < date ? -24 : local.date > date ? 24 : 0);
  return new Date(Date.parse(`${date}T00:00:00Z`) - offsetHours * 3600_000);
}

export function effectiveDailyCap(s: MailSettings, now: Date): number {
  if (!s.warmup_start) return s.daily_cap;
  const today = localParts(now, s.send_timezone).date;
  const days = Math.max(0, Math.floor((Date.parse(today) - Date.parse(s.warmup_start)) / 86_400_000));
  return Math.max(1, Math.min(s.daily_cap, s.warmup_base + s.warmup_step * days));
}

export function canSendNow(s: MailSettings, ctx: SendContext): PolicyDecision {
  const cap = effectiveDailyCap(s, ctx.now);
  if (!s.outreach_enabled) return { ok: false, reason: 'disabled', cap, detail: 'outreach sending is switched off' };
  if (!ctx.dnsReady) return { ok: false, reason: 'dns_not_ready', cap, detail: 'domain mail DNS not ready (MX must point to IONOS so replies come back)' };
  const { hour, weekday } = localParts(ctx.now, s.send_timezone);
  if (!s.send_weekdays.includes(weekday) || hour < s.send_start_hour || hour >= s.send_end_hour) {
    return { ok: false, reason: 'outside_window', cap, detail: `outside ${s.send_start_hour}:00–${s.send_end_hour}:00 ${s.send_timezone} on sending days` };
  }
  if (ctx.sentToday >= cap) return { ok: false, reason: 'daily_cap_reached', cap, detail: `${ctx.sentToday}/${cap} sent today` };
  if (ctx.lastSentAt && ctx.now.getTime() - ctx.lastSentAt.getTime() < s.min_gap_minutes * 60_000) {
    return { ok: false, reason: 'min_gap', cap, detail: `last send under ${s.min_gap_minutes} min ago` };
  }
  return { ok: true, cap };
}
