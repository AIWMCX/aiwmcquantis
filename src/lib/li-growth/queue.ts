/**
 * LinkedIn Growth Agent: today's queue (pure).
 *
 * Picks who gets a comment card and who gets a DM card today, from what the
 * founder already stored (targets he added, posts he pasted, touches he
 * logged). Source: LinkedIn Growth Agent PRD 2026-11-03, section 3.5.
 *
 *  - Comments: fit >= comment threshold, a pasted post/comment of theirs
 *    with text, observed in the last 72 hours, not yet commented on, author
 *    cool-down respected. No excerpt, no comment: never guess what a post said.
 *  - First DMs: fit >= DM threshold, 1st-degree, never DM'd, not in nurture,
 *    and a reason (any signal) in the last 30 days.
 *  - Follow-ups: the one follow-up, due 5 business days after the first DM
 *    with no reply.
 * Ranking: fit x freshness x warmth. Volume: the remaining caps for today.
 */
import { checkSend, followupStatus, type DailyCaps, type LiSettings, type TouchLite, type CapAction } from './caps';
import type { SignalType } from './fit-score';

export const COMMENT_FRESH_HOURS = 72;
export const DM_REASON_DAYS = 30;

export interface QueueTarget {
  prospect_id: string;
  fit_score: number | null;
  connection_degree: number | null;
  nurture_until: string | null;
  do_not_contact: boolean;
  warmth_points: number;
}

export interface QueueSignal {
  id: string;
  prospect_id: string;
  signal_type: SignalType;
  excerpt: string | null;
  post_url: string | null;
  observed_at: string;
}

export interface QueueDraft {
  id: string;
  prospect_id: string;
  signal_id: string | null;
  action_type: 'comment' | 'dm_first' | 'dm_followup';
  status: 'draft' | 'approved' | 'sent' | 'skipped';
}

export interface QueueItem {
  prospect_id: string;
  action: 'comment' | 'dm_first' | 'dm_followup';
  signal_id: string | null;
  priority: number;
  draft_id: string | null;
}

export interface QueueInput {
  targets: QueueTarget[];
  signals: QueueSignal[];
  touches: TouchLite[];
  drafts: QueueDraft[];
  settings: LiSettings;
  caps: DailyCaps;
  remaining: Record<CapAction, number>;
  today: string;
  now: Date;
}

export interface Queue {
  comments: QueueItem[];
  dms: QueueItem[];
}

function hoursAgo(iso: string, now: Date): number {
  return (now.getTime() - new Date(iso).getTime()) / 3_600_000;
}

/** 1.0 for the first 24h, falling linearly to 0.5 at the edge of the window. */
export function freshness(ageHours: number, windowHours: number): number {
  if (ageHours <= 24) return 1;
  if (ageHours >= windowHours) return 0.5;
  return 1 - 0.5 * ((ageHours - 24) / (windowHours - 24));
}

export function priority(fit: number, fresh: number, warmthPoints: number): number {
  return Math.round(fit * fresh * (1 + warmthPoints / 30) * 10) / 10;
}

const COMMENTABLE: SignalType[] = ['their_post', 'their_comment'];

export function buildQueue(input: QueueInput): Queue {
  const { targets, signals, touches, drafts, settings, caps, today, now } = input;
  const openDraft = (pid: string, action: QueueItem['action']) =>
    drafts.find((d) => d.prospect_id === pid && d.action_type === action && (d.status === 'draft' || d.status === 'approved')) ?? null;
  const commentedSignals = new Set(
    drafts.filter((d) => d.action_type === 'comment' && d.status === 'sent' && d.signal_id).map((d) => d.signal_id as string),
  );
  const skippedSignals = new Set(
    drafts.filter((d) => d.action_type === 'comment' && d.status === 'skipped' && d.signal_id).map((d) => d.signal_id as string),
  );
  const ctx = (t: QueueTarget, action: CapAction) => ({
    action,
    prospectId: t.prospect_id,
    today,
    now,
    settings,
    // Per-person rules only here; the daily total is applied by slicing below.
    caps: { ...caps, [action]: Number.MAX_SAFE_INTEGER },
    touches,
    connectionDegree: t.connection_degree,
    nurtureUntil: t.nurture_until,
    doNotContact: t.do_not_contact,
  });

  const comments: QueueItem[] = [];
  const firsts: QueueItem[] = [];
  const followups: QueueItem[] = [];

  for (const t of targets) {
    const fit = t.fit_score ?? 0;
    if (t.do_not_contact) continue;
    const mine = signals.filter((s) => s.prospect_id === t.prospect_id);

    if (fit >= settings.fit_threshold_comment && checkSend(ctx(t, 'comment')).ok) {
      const fresh = mine
        .filter((s) => COMMENTABLE.includes(s.signal_type) && (s.excerpt ?? '').trim() && s.post_url)
        .filter((s) => !commentedSignals.has(s.id) && !skippedSignals.has(s.id))
        .filter((s) => hoursAgo(s.observed_at, now) <= COMMENT_FRESH_HOURS)
        .sort((a, b) => new Date(b.observed_at).getTime() - new Date(a.observed_at).getTime())[0];
      if (fresh) {
        comments.push({
          prospect_id: t.prospect_id,
          action: 'comment',
          signal_id: fresh.id,
          priority: priority(fit, freshness(hoursAgo(fresh.observed_at, now), COMMENT_FRESH_HOURS), t.warmth_points),
          draft_id: openDraft(t.prospect_id, 'comment')?.id ?? null,
        });
      }
    }

    if (fit >= settings.fit_threshold_dm && t.connection_degree === 1) {
      const f = followupStatus(t.prospect_id, touches, today, settings.followup_min_business_days);
      if (f.due && checkSend(ctx(t, 'dm_followup')).ok) {
        followups.push({
          prospect_id: t.prospect_id,
          action: 'dm_followup',
          signal_id: null,
          priority: priority(fit, 1, t.warmth_points),
          draft_id: openDraft(t.prospect_id, 'dm_followup')?.id ?? null,
        });
      } else if (checkSend(ctx(t, 'dm_first')).ok) {
        const reason = mine
          .filter((s) => hoursAgo(s.observed_at, now) <= DM_REASON_DAYS * 24)
          .sort((a, b) => new Date(b.observed_at).getTime() - new Date(a.observed_at).getTime())[0];
        if (reason) {
          firsts.push({
            prospect_id: t.prospect_id,
            action: 'dm_first',
            signal_id: reason.id,
            priority: priority(fit, freshness(hoursAgo(reason.observed_at, now), DM_REASON_DAYS * 24), t.warmth_points),
            draft_id: openDraft(t.prospect_id, 'dm_first')?.id ?? null,
          });
        }
      }
    }
  }

  // Cards that already have a draft keep their place, then by priority.
  const rank = (a: QueueItem, b: QueueItem) => Number(!!b.draft_id) - Number(!!a.draft_id) || b.priority - a.priority;
  return {
    comments: comments.sort(rank).slice(0, input.remaining.comment),
    dms: [
      ...followups.sort(rank).slice(0, input.remaining.dm_followup),
      ...firsts.sort(rank).slice(0, input.remaining.dm_first),
    ],
  };
}
