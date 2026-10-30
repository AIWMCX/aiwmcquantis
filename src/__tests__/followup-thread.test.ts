import { describe, expect, it } from 'vitest';
import { isPlaceholderSubject, planFollowupThread, type PriorTouch } from '../../supabase/functions/_shared/mail/followup-thread';

const ft = (o: Partial<PriorTouch> = {}): PriorTouch => ({
  kind: 'first_touch', subject: 'One client decision, base and downside', internet_message_id: '<ft@aiwmcquantis.com>', sent_at: '2026-10-20T12:00:00Z', ...o,
});
const fu = (o: Partial<PriorTouch> = {}): PriorTouch => ({
  kind: 'followup', subject: 'A design-partner seat?', internet_message_id: '<fu2@aiwmcquantis.com>', sent_at: '2026-10-24T12:00:00Z', ...o,
});

describe('planFollowupThread', () => {
  it('replies under the first touch subject when its Message-ID is known', () => {
    const r = planFollowupThread('A design-partner seat?', [ft()]);
    expect(r).toEqual({ ok: true, subject: 'Re: One client decision, base and downside', inReplyTo: '<ft@aiwmcquantis.com>', references: ['<ft@aiwmcquantis.com>'] });
  });

  it('chains References through every earlier touch and replies to the latest', () => {
    const r = planFollowupThread(null, [fu(), ft()]);
    expect(r).toMatchObject({ ok: true, inReplyTo: '<fu2@aiwmcquantis.com>', references: ['<ft@aiwmcquantis.com>', '<fu2@aiwmcquantis.com>'] });
  });

  it('never stacks Re: prefixes', () => {
    const r = planFollowupThread(null, [ft({ subject: 'Re: RE: Runway math' })]);
    expect(r).toMatchObject({ ok: true, subject: 'Re: Runway math' });
  });

  it('sends standalone, without Re:, when the first touch was sent outside Quantis', () => {
    const r = planFollowupThread('Re: Board judgment at inflection points', [ft({ internet_message_id: null, subject: 'First-touch outreach (sent externally)' })]);
    expect(r).toEqual({ ok: true, subject: 'Board judgment at inflection points', inReplyTo: null, references: [] });
  });

  it('holds instead of sending a placeholder subject', () => {
    const r = planFollowupThread('Re: First-touch outreach (sent externally)', [ft({ internet_message_id: null, subject: 'First-touch outreach (sent externally)' })]);
    expect(r.ok).toBe(false);
  });

  it('holds when there is no subject at all and no thread', () => {
    expect(planFollowupThread(null, []).ok).toBe(false);
  });

  it('ignores unsent touches', () => {
    const r = planFollowupThread('Own subject', [ft({ sent_at: null })]);
    expect(r).toEqual({ ok: true, subject: 'Own subject', inReplyTo: null, references: [] });
  });
});

describe('isPlaceholderSubject', () => {
  it('flags CRM bookkeeping labels only', () => {
    expect(isPlaceholderSubject('Re: First-touch outreach (sent externally)')).toBe(true);
    expect(isPlaceholderSubject('One client decision, modeled')).toBe(false);
  });
});
