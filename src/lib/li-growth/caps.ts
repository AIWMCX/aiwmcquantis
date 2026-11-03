/**
 * LinkedIn Growth Agent: daily caps, ramp and stop rules (pure).
 *
 * Source: LinkedIn Growth Agent PRD 2026-11-03, section 3.8. LinkedIn does not
 * publish comment or DM limits; these are deliberately conservative.
 *
 * The page uses this module to show remaining capacity and disable buttons
 * with a reason. The li_mark_draft_sent / li_record_outcome RPCs enforce the
 * same caps from li_engagement_settings server-side (the migration CHECKs
 * also cap every setting at the week-3 ceiling), so this file is the
 * explanation and the database is the guarantee.
 */

export type RampWeek = 1 | 2 | 3;

export interface DailyCaps {
  comment: number;
  dm_first: number;
  dm_followup: number;
  connect: number;
  connect_week: number;
}

/** Week 1 / week 2 / week 3+ (PRD 3.8 table). */
export const RAMP: Record<RampWeek, DailyCaps> = {
  1: { comment: 5, dm_first: 3, dm_followup: 5, connect: 5, connect_week: 50 },
  2: { comment: 8, dm_first: 6, dm_followup: 5, connect: 8, connect_week: 50 },
  3: { comment: 10, dm_first: 10, dm_followup: 5, connect: 10, connect_week: 50 },
};

/** Never above these, whatever the settings say (mirrored by DB CHECKs). */
export const CEILING: DailyCaps = RAMP[3];

export function rampCaps(week: number): DailyCaps {
  const w = (week >= 3 ? 3 : week <= 1 ? 1 : 2) as RampWeek;
  return { ...RAMP[w] };
}

export interface LiSettings {
  ramp_week: number;
  max_comments_day: number;
  max_dm_first_day: number;
  max_dm_followup_day: number;
  max_connects_day: number;
  max_connects_week: number;
  max_comments_per_author: number;
  author_cooldown_days: number;
  followup_min_business_days: number;
  fit_threshold_dm: number;
  fit_threshold_comment: number;
  /** Everything paused through this Denver date (inclusive). */
  paused_until: string | null;
  /** After a LinkedIn warning: DMs/connects paused, comments at half. */
  warning_paused_until: string | null;
}

export const DEFAULT_SETTINGS: LiSettings = {
  ramp_week: 1,
  max_comments_day: 5,
  max_dm_first_day: 3,
  max_dm_followup_day: 5,
  max_connects_day: 5,
  max_connects_week: 50,
  max_comments_per_author: 2,
  author_cooldown_days: 7,
  followup_min_business_days: 5,
  fit_threshold_dm: 70,
  fit_threshold_comment: 50,
  paused_until: null,
  warning_paused_until: null,
};

/** The settings columns a ramp-week change writes (founder can still lower them). */
export function settingsForRampWeek(week: number): Pick<LiSettings, 'ramp_week' | 'max_comments_day' | 'max_dm_first_day' | 'max_dm_followup_day' | 'max_connects_day' | 'max_connects_week'> {
  const c = rampCaps(week);
  return {
    ramp_week: week >= 3 ? 3 : week <= 1 ? 1 : 2,
    max_comments_day: c.comment,
    max_dm_first_day: c.dm_first,
    max_dm_followup_day: c.dm_followup,
    max_connects_day: c.connect,
    max_connects_week: c.connect_week,
  };
}

// ─── Dates (America/Denver days, as every metric in this repo) ─────────────

const DENVER = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Denver', year: 'numeric', month: '2-digit', day: '2-digit' });

/** "YYYY-MM-DD" of the Denver calendar day containing `d`. */
export function denverDay(d: Date | string): string {
  return DENVER.format(typeof d === 'string' ? new Date(d) : d);
}

function parseDay(day: string): Date {
  const [y, m, dd] = day.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, dd));
}

function fmtDay(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function addDays(day: string, n: number): string {
  const d = parseDay(day);
  d.setUTCDate(d.getUTCDate() + n);
  return fmtDay(d);
}

/** Weekdays in (from, to]. Mirrors public.li_business_days_between(). */
export function businessDaysBetween(from: string, to: string): number {
  let count = 0;
  let cur = addDays(from, 1);
  while (cur <= to) {
    const dow = parseDay(cur).getUTCDay();
    if (dow !== 0 && dow !== 6) count++;
    cur = addDays(cur, 1);
  }
  return count;
}

/** The day `n` business days after `from` (when a follow-up becomes due). */
export function addBusinessDays(from: string, n: number): string {
  let cur = from;
  let left = n;
  while (left > 0) {
    cur = addDays(cur, 1);
    const dow = parseDay(cur).getUTCDay();
    if (dow !== 0 && dow !== 6) left--;
  }
  return cur;
}

/** Monday of the Denver week containing `day`. */
export function weekStart(day: string): string {
  const dow = parseDay(day).getUTCDay();
  return addDays(day, -((dow + 6) % 7));
}

// ─── Touches ────────────────────────────────────────────────────────────────

export type TouchType =
  | 'comment'
  | 'dm_first'
  | 'dm_followup'
  | 'connect_no_note'
  | 'connect_accepted'
  | 'reply_received'
  | 'call_booked'
  | 'call_done'
  | 'paid';

export type ReplyClass = 'positive' | 'neutral' | 'negative' | 'objection' | 'not_now';

export interface TouchLite {
  prospect_id: string;
  touch_type: TouchType;
  occurred_at: string;
  reply_class?: ReplyClass | null;
}

export type CapAction = 'comment' | 'dm_first' | 'dm_followup' | 'connect';

const ACTION_TOUCH: Record<CapAction, TouchType> = {
  comment: 'comment',
  dm_first: 'dm_first',
  dm_followup: 'dm_followup',
  connect: 'connect_no_note',
};

export function usedToday(touches: TouchLite[], today: string): Record<CapAction, number> {
  const out: Record<CapAction, number> = { comment: 0, dm_first: 0, dm_followup: 0, connect: 0 };
  for (const t of touches) {
    if (denverDay(t.occurred_at) !== today) continue;
    for (const a of Object.keys(ACTION_TOUCH) as CapAction[]) if (ACTION_TOUCH[a] === t.touch_type) out[a]++;
  }
  return out;
}

// ─── Stop rules (PRD 3.8) ───────────────────────────────────────────────────

export const STOP_RULES = {
  connectWindow: 40,
  minAcceptRate: 0.25,
  dmWindow: 50,
  minPositiveOrNeutralRate: 0.05,
} as const;

export interface StopState {
  stopConnects: boolean;
  stopDms: boolean;
  acceptRate: number | null;
  replyRate: number | null;
  reasons: string[];
}

const ms = (iso: string): number => new Date(iso).getTime();

function byTimeDesc(a: TouchLite, b: TouchLite): number {
  return ms(b.occurred_at) - ms(a.occurred_at);
}

/**
 * Accept rate over the last 40 connection requests below 25% stops connects.
 * Positive+neutral reply rate over the last 50 first DMs below 5% stops DMs.
 * Neither rule fires before its window is full.
 */
export function evaluateStopRules(touches: TouchLite[]): StopState {
  const reasons: string[] = [];
  const sorted = [...touches].sort(byTimeDesc);

  const connects = sorted.filter((t) => t.touch_type === 'connect_no_note').slice(0, STOP_RULES.connectWindow);
  let acceptRate: number | null = null;
  let stopConnects = false;
  if (connects.length >= STOP_RULES.connectWindow) {
    const accepted = connects.filter((c) =>
      touches.some((t) => t.touch_type === 'connect_accepted' && t.prospect_id === c.prospect_id && ms(t.occurred_at) >= ms(c.occurred_at)),
    ).length;
    acceptRate = accepted / connects.length;
    if (acceptRate < STOP_RULES.minAcceptRate) {
      stopConnects = true;
      reasons.push(`Connection accept rate ${(acceptRate * 100).toFixed(0)}% over the last ${connects.length} requests is under 25%: fix targeting before sending more.`);
    }
  }

  const dms = sorted.filter((t) => t.touch_type === 'dm_first').slice(0, STOP_RULES.dmWindow);
  let replyRate: number | null = null;
  let stopDms = false;
  if (dms.length >= STOP_RULES.dmWindow) {
    const good = dms.filter((d) =>
      touches.some(
        (t) => t.touch_type === 'reply_received' && t.prospect_id === d.prospect_id && ms(t.occurred_at) >= ms(d.occurred_at)
          && (t.reply_class === 'positive' || t.reply_class === 'neutral'),
      ),
    ).length;
    replyRate = good / dms.length;
    if (replyRate < STOP_RULES.minPositiveOrNeutralRate) {
      stopDms = true;
      reasons.push(`Positive or neutral reply rate ${(replyRate * 100).toFixed(0)}% over the last ${dms.length} first DMs is under 5%: rewrite the templates before sending more.`);
    }
  }
  return { stopConnects, stopDms, acceptRate, replyRate, reasons };
}

// ─── Effective caps for today ───────────────────────────────────────────────

export interface EffectiveCaps {
  caps: DailyCaps;
  reasons: string[];
}

export function effectiveCaps(settings: LiSettings, today: string, stop: StopState): EffectiveCaps {
  const caps: DailyCaps = {
    comment: Math.min(settings.max_comments_day, CEILING.comment),
    dm_first: Math.min(settings.max_dm_first_day, CEILING.dm_first),
    dm_followup: Math.min(settings.max_dm_followup_day, CEILING.dm_followup),
    connect: Math.min(settings.max_connects_day, CEILING.connect),
    connect_week: Math.min(settings.max_connects_week, CEILING.connect_week),
  };
  const reasons: string[] = [];
  if (settings.paused_until && settings.paused_until >= today) {
    reasons.push(`Outreach paused through ${settings.paused_until}.`);
    return { caps: { comment: 0, dm_first: 0, dm_followup: 0, connect: 0, connect_week: 0 }, reasons };
  }
  if (settings.warning_paused_until && settings.warning_paused_until >= today) {
    reasons.push(`LinkedIn warning: DMs and connection requests paused through ${settings.warning_paused_until}; comments at half volume.`);
    caps.dm_first = 0;
    caps.dm_followup = 0;
    caps.connect = 0;
    caps.comment = Math.floor(caps.comment / 2);
  }
  if (stop.stopConnects) caps.connect = 0;
  if (stop.stopDms) {
    caps.dm_first = 0;
    caps.dm_followup = 0;
  }
  reasons.push(...stop.reasons);
  return { caps, reasons };
}

// ─── Per-send check (what the Mark sent button asks) ───────────────────────

export interface SendContext {
  action: CapAction;
  prospectId: string;
  today: string;
  now: Date;
  settings: LiSettings;
  caps: DailyCaps;
  touches: TouchLite[];
  connectionDegree: number | null;
  nurtureUntil: string | null;
  doNotContact: boolean;
}

export interface SendCheck {
  ok: boolean;
  reason: string | null;
}

const no = (reason: string): SendCheck => ({ ok: false, reason });

/** The first DM to this prospect and whether a follow-up is allowed today. */
export function followupStatus(
  prospectId: string,
  touches: TouchLite[],
  today: string,
  minBusinessDays: number,
): { due: boolean; dueOn: string | null; reason: string | null } {
  const mine = touches.filter((t) => t.prospect_id === prospectId);
  const first = mine.find((t) => t.touch_type === 'dm_first');
  if (!first) return { due: false, dueOn: null, reason: 'No first DM was sent.' };
  if (mine.some((t) => t.touch_type === 'dm_followup')) return { due: false, dueOn: null, reason: 'The one follow-up was already sent. Never a second.' };
  if (mine.some((t) => t.touch_type === 'reply_received' && ms(t.occurred_at) >= ms(first.occurred_at))) {
    return { due: false, dueOn: null, reason: 'They replied: answer the reply instead.' };
  }
  const sentDay = denverDay(first.occurred_at);
  const dueOn = addBusinessDays(sentDay, minBusinessDays);
  if (businessDaysBetween(sentDay, today) < minBusinessDays) {
    return { due: false, dueOn, reason: `Follow-up allowed from ${dueOn} (${minBusinessDays} business days after the first DM).` };
  }
  return { due: true, dueOn, reason: null };
}

export function checkSend(ctx: SendContext): SendCheck {
  const { action, prospectId, today, settings, caps, touches } = ctx;
  if (ctx.doNotContact) return no('Do not contact.');
  const used = usedToday(touches, today)[action];
  const cap = caps[action];
  if (used >= cap) return no(cap === 0 ? 'Paused or stopped today.' : `Daily cap reached (${used}/${cap}).`);

  const mine = touches.filter((t) => t.prospect_id === prospectId);
  if (action === 'comment') {
    const since = ctx.now.getTime() - settings.author_cooldown_days * 86_400_000;
    const recent = mine.filter((t) => t.touch_type === 'comment' && new Date(t.occurred_at).getTime() > since).length;
    if (recent >= settings.max_comments_per_author) {
      return no(`Author cool-down: ${recent} comments on this person in the last ${settings.author_cooldown_days} days.`);
    }
  }
  if (action === 'dm_first' || action === 'dm_followup') {
    if (ctx.connectionDegree !== 1) return no('DMs go to 1st-degree connections only. Comment first, then connect.');
  }
  if (action === 'dm_first') {
    if (mine.some((t) => t.touch_type === 'dm_first')) return no('First DM already sent.');
    if (ctx.nurtureUntil && ctx.nurtureUntil >= today) return no(`In nurture until ${ctx.nurtureUntil}: no DMs.`);
  }
  if (action === 'dm_followup') {
    const f = followupStatus(prospectId, touches, today, settings.followup_min_business_days);
    if (!f.due) return no(f.reason ?? 'Follow-up not due.');
  }
  if (action === 'connect') {
    const weekAgo = ctx.now.getTime() - 7 * 86_400_000;
    const week = touches.filter((t) => t.touch_type === 'connect_no_note' && new Date(t.occurred_at).getTime() > weekAgo).length;
    if (week >= caps.connect_week) return no(`Weekly connection cap reached (${week}/${caps.connect_week}).`);
  }
  return { ok: true, reason: null };
}

export function remaining(caps: DailyCaps, used: Record<CapAction, number>): Record<CapAction, number> {
  return {
    comment: Math.max(0, caps.comment - used.comment),
    dm_first: Math.max(0, caps.dm_first - used.dm_first),
    dm_followup: Math.max(0, caps.dm_followup - used.dm_followup),
    connect: Math.max(0, caps.connect - used.connect),
  };
}
