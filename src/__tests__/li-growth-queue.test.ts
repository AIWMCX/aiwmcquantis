import { describe, expect, it } from 'vitest';
import { buildQueue, freshness, type QueueInput, type QueueTarget, type QueueSignal } from '@/lib/li-growth/queue';
import { DEFAULT_SETTINGS, rampCaps, type TouchLite } from '@/lib/li-growth/caps';

const NOW = new Date('2026-11-04T18:00:00Z');
const hoursAgo = (h: number) => new Date(NOW.getTime() - h * 3_600_000).toISOString();

const target = (id: string, over: Partial<QueueTarget> = {}): QueueTarget => ({
  prospect_id: id, fit_score: 75, connection_degree: 1, nurture_until: null, do_not_contact: false, warmth_points: 0, ...over,
});
const post = (id: string, prospect_id: string, h: number, over: Partial<QueueSignal> = {}): QueueSignal => ({
  id, prospect_id, signal_type: 'their_post', excerpt: 'We are hiring a second project manager.', post_url: `https://www.linkedin.com/posts/${id}`, observed_at: hoursAgo(h), ...over,
});

function run(over: Partial<QueueInput>) {
  const caps = rampCaps(1);
  return buildQueue({
    targets: [], signals: [], touches: [], drafts: [], settings: DEFAULT_SETTINGS, caps,
    remaining: { comment: caps.comment, dm_first: caps.dm_first, dm_followup: caps.dm_followup, connect: caps.connect },
    today: '2026-11-04', now: NOW, ...over,
  });
}

describe('li-growth queue', () => {
  it('comment cards need a pasted post from the last 72 hours and fit >= 50', () => {
    const q = run({
      targets: [target('a'), target('b'), target('c', { fit_score: 49 }), target('d')],
      signals: [post('s-a', 'a', 5), post('s-b', 'b', 80), post('s-c', 'c', 5), post('s-d', 'd', 5, { excerpt: null })],
    });
    expect(q.comments.map((i) => i.prospect_id)).toEqual(['a']);
    expect(q.comments[0].signal_id).toBe('s-a');
  });

  it('first DMs only for 1st-degree prospects at fit >= 70 with a reason in 30 days', () => {
    const q = run({
      targets: [target('a'), target('b', { connection_degree: 2 }), target('c', { fit_score: 65 }), target('e')],
      signals: [post('s-a', 'a', 200), post('s-b', 'b', 5), post('s-c', 'c', 5), post('s-e', 'e', 24 * 40)],
    });
    expect(q.dms.map((i) => `${i.prospect_id}:${i.action}`)).toEqual(['a:dm_first']);
  });

  it('follow-ups come first, and nobody gets a second first DM', () => {
    const touches: TouchLite[] = [
      { prospect_id: 'f', touch_type: 'dm_first', occurred_at: '2026-10-26T16:00:00Z' },
      { prospect_id: 'g', touch_type: 'dm_first', occurred_at: '2026-11-03T16:00:00Z' },
    ];
    const q = run({
      targets: [target('a'), target('f'), target('g')],
      signals: [post('s-a', 'a', 5), post('s-f', 'f', 5), post('s-g', 'g', 5)],
      touches,
    });
    expect(q.dms.map((i) => `${i.prospect_id}:${i.action}`)).toEqual(['f:dm_followup', 'a:dm_first']);
  });

  it('skips do-not-contact people and posts already commented on or skipped', () => {
    const q = run({
      targets: [target('a', { do_not_contact: true }), target('b'), target('c')],
      signals: [post('s-a', 'a', 5), post('s-b', 'b', 5), post('s-c', 'c', 5)],
      drafts: [
        { id: 'd1', prospect_id: 'b', signal_id: 's-b', action_type: 'comment', status: 'sent' },
        { id: 'd2', prospect_id: 'c', signal_id: 's-c', action_type: 'comment', status: 'skipped' },
      ],
    });
    expect(q.comments).toEqual([]);
  });

  it('volume follows the remaining caps; cards with a draft keep their place, then fit x freshness x warmth', () => {
    const targets = ['a', 'b', 'c'].map((id, i) => target(id, { fit_score: 60 + i * 10, warmth_points: id === 'a' ? 15 : 0 }));
    const signals = targets.map((t) => post(`s-${t.prospect_id}`, t.prospect_id, 5));
    const caps = rampCaps(1);
    const q = run({
      targets, signals, remaining: { comment: 2, dm_first: 0, dm_followup: 0, connect: 0 },
      drafts: [{ id: 'd-a', prospect_id: 'a', signal_id: 's-a', action_type: 'comment', status: 'draft' }], caps,
    });
    expect(q.comments.map((i) => i.prospect_id)).toEqual(['a', 'c']);
    expect(q.comments[0].draft_id).toBe('d-a');
    expect(q.dms).toEqual([]);
  });

  it('freshness falls from 1 to 0.5 across the window', () => {
    expect(freshness(10, 72)).toBe(1);
    expect(freshness(72, 72)).toBe(0.5);
    expect(freshness(48, 72)).toBeCloseTo(0.75);
  });
});
