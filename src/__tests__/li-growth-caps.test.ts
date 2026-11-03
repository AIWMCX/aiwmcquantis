import { describe, expect, it } from 'vitest';
import {
  DEFAULT_SETTINGS, RAMP, CEILING, rampCaps, settingsForRampWeek, effectiveCaps, evaluateStopRules, checkSend, usedToday,
  businessDaysBetween, addBusinessDays, denverDay, weekStart, followupStatus, type TouchLite, type SendContext,
} from '@/lib/li-growth/caps';

const NOW = new Date('2026-11-04T18:00:00Z'); // Wednesday, Denver
const TODAY = denverDay(NOW);
const NO_STOP = { stopConnects: false, stopDms: false, acceptRate: null, replyRate: null, reasons: [] };

function ctx(over: Partial<SendContext> = {}): SendContext {
  return {
    action: 'comment',
    prospectId: 'p1',
    today: TODAY,
    now: NOW,
    settings: DEFAULT_SETTINGS,
    caps: rampCaps(1),
    touches: [],
    connectionDegree: 1,
    nurtureUntil: null,
    doNotContact: false,
    ...over,
  };
}

const at = (iso: string, touch_type: TouchLite['touch_type'], prospect_id = 'p1', reply_class: TouchLite['reply_class'] = null): TouchLite =>
  ({ prospect_id, touch_type, occurred_at: iso, reply_class });

describe('li-growth caps: ramp', () => {
  it('week 1 / 2 / 3+ match the PRD table and clamp', () => {
    expect(rampCaps(1)).toEqual({ comment: 5, dm_first: 3, dm_followup: 5, connect: 5, connect_week: 50 });
    expect(rampCaps(2)).toMatchObject({ comment: 8, dm_first: 6, connect: 8 });
    expect(rampCaps(3)).toMatchObject({ comment: 10, dm_first: 10, connect: 10 });
    expect(rampCaps(9)).toEqual(RAMP[3]);
    expect(rampCaps(0)).toEqual(RAMP[1]);
    expect(settingsForRampWeek(2)).toMatchObject({ ramp_week: 2, max_comments_day: 8, max_dm_first_day: 6, max_connects_day: 8 });
  });

  it('never exceeds the ceiling even if settings say more', () => {
    const e = effectiveCaps({ ...DEFAULT_SETTINGS, max_comments_day: 50, max_dm_first_day: 99 }, TODAY, NO_STOP);
    expect(e.caps.comment).toBe(CEILING.comment);
    expect(e.caps.dm_first).toBe(CEILING.dm_first);
  });
});

describe('li-growth caps: pause and stop rules', () => {
  it('pause sets every cap to 0', () => {
    const e = effectiveCaps({ ...DEFAULT_SETTINGS, paused_until: TODAY }, TODAY, NO_STOP);
    expect(Object.values(e.caps).every((v) => v === 0)).toBe(true);
    expect(e.reasons[0]).toMatch(/paused/);
    expect(effectiveCaps({ ...DEFAULT_SETTINGS, paused_until: '2026-11-03' }, TODAY, NO_STOP).caps.comment).toBe(5);
  });

  it('a LinkedIn warning stops DMs and connects for the window and halves comments', () => {
    const e = effectiveCaps({ ...DEFAULT_SETTINGS, max_comments_day: 10, warning_paused_until: '2026-11-10' }, TODAY, NO_STOP);
    expect(e.caps).toMatchObject({ comment: 5, dm_first: 0, dm_followup: 0, connect: 0 });
  });

  it('accept rate under 25% over the last 40 connection requests stops connects', () => {
    const requests = Array.from({ length: 40 }, (_, i) => at(`2026-10-${String(1 + (i % 28)).padStart(2, '0')}T15:00:00Z`, 'connect_no_note', `p${i}`));
    const accepted = (n: number) => Array.from({ length: n }, (_, i) => at('2026-10-30T15:00:00Z', 'connect_accepted', `p${i}`));
    expect(evaluateStopRules([...requests, ...accepted(9)]).stopConnects).toBe(true);
    expect(evaluateStopRules([...requests, ...accepted(10)]).stopConnects).toBe(false);
    expect(evaluateStopRules(requests.slice(0, 39)).stopConnects).toBe(false); // window not full
    const e = effectiveCaps(DEFAULT_SETTINGS, TODAY, evaluateStopRules([...requests, ...accepted(9)]));
    expect(e.caps.connect).toBe(0);
  });

  it('positive or neutral replies under 5% over 50 first DMs stops DMs', () => {
    const dms = Array.from({ length: 50 }, (_, i) => at('2026-10-01T15:00:00Z', 'dm_first', `p${i}`));
    const replies = (n: number, cls: TouchLite['reply_class']) => Array.from({ length: n }, (_, i) => at('2026-10-05T15:00:00Z', 'reply_received', `p${i}`, cls));
    expect(evaluateStopRules([...dms, ...replies(2, 'positive')]).stopDms).toBe(true);
    expect(evaluateStopRules([...dms, ...replies(3, 'neutral')]).stopDms).toBe(false);
    expect(evaluateStopRules([...dms, ...replies(10, 'negative')]).stopDms).toBe(true);
    const e = effectiveCaps(DEFAULT_SETTINGS, TODAY, evaluateStopRules(dms));
    expect(e.caps).toMatchObject({ dm_first: 0, dm_followup: 0 });
  });
});

describe('li-growth caps: per-send checks', () => {
  it('blocks at the daily cap (Denver day)', () => {
    const five = Array.from({ length: 5 }, (_, i) => at('2026-11-04T16:00:00Z', 'comment', `x${i}`));
    expect(checkSend(ctx({ touches: five })).reason).toMatch(/Daily cap reached \(5\/5\)/);
    expect(checkSend(ctx({ touches: five.slice(0, 4) })).ok).toBe(true);
    // 05:00 UTC on Nov 4 is still Nov 3 in Denver: not today's cap.
    expect(usedToday([at('2026-11-04T05:00:00Z', 'comment')], TODAY).comment).toBe(0);
  });

  it('author cool-down: at most 2 comments per person per 7 days', () => {
    const two = [at('2026-11-01T16:00:00Z', 'comment'), at('2026-11-02T16:00:00Z', 'comment')];
    expect(checkSend(ctx({ touches: two })).reason).toMatch(/cool-down/);
    expect(checkSend(ctx({ touches: [at('2026-10-20T16:00:00Z', 'comment'), at('2026-11-02T16:00:00Z', 'comment')] })).ok).toBe(true);
  });

  it('DMs only to 1st-degree, never twice, not in nurture, not to do-not-contact', () => {
    expect(checkSend(ctx({ action: 'dm_first', connectionDegree: 2 })).reason).toMatch(/1st-degree/);
    expect(checkSend(ctx({ action: 'dm_first', touches: [at('2026-10-01T16:00:00Z', 'dm_first')] })).reason).toMatch(/already sent/);
    expect(checkSend(ctx({ action: 'dm_first', nurtureUntil: '2027-01-01' })).reason).toMatch(/nurture/);
    expect(checkSend(ctx({ action: 'dm_first', doNotContact: true })).reason).toMatch(/Do not contact/);
    expect(checkSend(ctx({ action: 'dm_first' })).ok).toBe(true);
  });

  it('one follow-up only, 5 business days after the first DM, and never after a reply', () => {
    const first = at('2026-10-29T16:00:00Z', 'dm_first'); // Thu
    expect(checkSend(ctx({ action: 'dm_followup', touches: [first] })).reason).toMatch(/from 2026-11-05/);
    const later = ctx({ action: 'dm_followup', touches: [first], today: '2026-11-05', now: new Date('2026-11-05T18:00:00Z') });
    expect(checkSend(later).ok).toBe(true);
    expect(checkSend({ ...later, touches: [first, at('2026-11-05T16:00:00Z', 'dm_followup', 'other')] }).ok).toBe(true);
    expect(checkSend({ ...later, touches: [first, at('2026-11-03T16:00:00Z', 'dm_followup')] }).reason).toMatch(/Never a second/);
    expect(checkSend({ ...later, touches: [first, at('2026-10-30T16:00:00Z', 'reply_received', 'p1', 'neutral')] }).reason).toMatch(/replied/);
    expect(checkSend(ctx({ action: 'dm_followup' })).reason).toMatch(/No first DM/);
  });

  it('weekly connection cap', () => {
    const fifty = Array.from({ length: 50 }, (_, i) => at('2026-11-01T16:00:00Z', 'connect_no_note', `c${i}`));
    expect(checkSend(ctx({ action: 'connect', touches: fifty })).reason).toMatch(/Weekly connection cap/);
  });
});

describe('li-growth caps: dates', () => {
  it('business days skip weekends and match the SQL helper semantics (from, to]', () => {
    expect(businessDaysBetween('2026-10-30', '2026-11-02')).toBe(1); // Fri -> Mon
    expect(businessDaysBetween('2026-10-26', '2026-11-02')).toBe(5); // Mon -> Mon
    expect(businessDaysBetween('2026-11-02', '2026-11-02')).toBe(0);
    expect(addBusinessDays('2026-10-30', 5)).toBe('2026-11-06'); // Fri + 5 = next Fri
  });

  it('Denver day and week start', () => {
    expect(denverDay('2026-11-02T05:00:00Z')).toBe('2026-11-01');
    expect(weekStart('2026-11-04')).toBe('2026-11-02');
    expect(weekStart('2026-11-08')).toBe('2026-11-02'); // Sunday belongs to the week that started Monday
  });

  it('followupStatus reports the due date', () => {
    const s = followupStatus('p1', [at('2026-10-29T16:00:00Z', 'dm_first')], '2026-11-02', 5);
    expect(s).toMatchObject({ due: false, dueOn: '2026-11-05' });
  });
});
