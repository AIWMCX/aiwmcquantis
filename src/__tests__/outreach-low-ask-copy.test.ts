import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  audienceFor,
  countWords,
  DEMO_URL,
  demoLink,
  FIRST_TOUCH_MAX_WORDS,
  FIRST_TOUCH_MIN_WORDS,
  firstTouchSubject,
  lintFirstTouch,
  lintFollowup,
  lintOpener,
  neutralOpener,
  OPENER_MAX_WORDS,
  renderFirstTouchBody,
  renderFollowupBody,
  utmCampaignSlug,
} from '../../supabase/functions/_shared/commercial/outreach-copy';
import { planFollowupThread } from '../../supabase/functions/_shared/mail/followup-thread';

// Spec: docs/execution/2026-10-30-cold-outreach-zero-replies-diagnosis.md section 5 + F8.
const link = demoLink('Fractional CFOs Nov 2026');
const advisorBody = (opener = neutralOpener('Fractional CFO', 'Northline Advisory')) =>
  renderFirstTouchBody({ audience: 'advisor', opener, link });

// The live drafter's output on 2026-11-03 (the evidence for this change).
const LIVE_2026_11_03 =
  "I'll skip the pitch. Your clients make decisions on assumptions nobody writes down. Quantis makes those assumptions explicit and runs deterministic cash, break-even, payback, and downside math before any narration. Reply with one client decision you're weighing — a hire, a price change, a lease, a contract — and I'll send back the base and downside case within 24 hours, free, no call.";

describe('demo link', () => {
  it('is the hiring demo with source, medium and campaign UTM tags', () => {
    expect(link).toBe(`${DEMO_URL}?utm_source=email&utm_medium=outreach&utm_campaign=fractional-cfos-nov-2026`);
    expect(DEMO_URL).toBe('https://www.aiwmcquantis.com/demo/hiring-decision');
  });
  it('falls back to first_touch when there is no campaign name', () => {
    expect(utmCampaignSlug(null)).toBe('first_touch');
    expect(utmCampaignSlug('  ***  ')).toBe('first_touch');
    expect(demoLink(undefined)).toMatch(/utm_campaign=first_touch$/);
  });
});

describe('first-touch template (low_ask_v1)', () => {
  it('passes its own lint for both audiences and every opener fallback', () => {
    const openers = [
      neutralOpener('Fractional CFO', 'Northline Advisory'),
      neutralOpener(null, 'Northline Advisory'),
      neutralOpener(null, null),
      'You wrote that most of your clients this year are dental groups weighing a second location or another hygienist.',
    ];
    for (const audience of ['advisor', 'owner'] as const) {
      for (const opener of openers) {
        const body = renderFirstTouchBody({ audience, opener, link });
        expect(lintFirstTouch(body, link), body).toEqual([]);
      }
    }
  });

  it('contains the demo link exactly once and no other link', () => {
    const body = advisorBody();
    expect(body.split(link).length - 1).toBe(1);
    expect(lintFirstTouch(`${body}\nAlso see ${link}`, link)).toContain('demo link must appear exactly once (found 2)');
    expect(lintFirstTouch(body.replace(link, 'https://calendly.com/x'), link).join(' ')).toMatch(/exactly once \(found 0\)/);
    expect(lintFirstTouch(`${body} https://example.com`, link)).toContain('a link other than the demo link');
    expect(lintFirstTouch(body, DEMO_URL)).toContain('demo link is missing its UTM tags');
  });

  it('asks one question about their workflow and closes softly, with no client data requested', () => {
    const body = advisorBody();
    expect(body).toContain('how long does the downside case take you today?');
    expect(body).toContain('No sign-up and no client data needed');
    expect(body.endsWith('Worth a look, or not your workflow?')).toBe(true);
  });

  it(`stays within ${FIRST_TOUCH_MIN_WORDS}-${FIRST_TOUCH_MAX_WORDS} words`, () => {
    const short = advisorBody('Quick one.');
    expect(countWords(short)).toBeGreaterThanOrEqual(FIRST_TOUCH_MIN_WORDS);
    const longest = advisorBody(Array.from({ length: OPENER_MAX_WORDS }, () => 'word').join(' ') + '.');
    expect(countWords(longest)).toBeLessThanOrEqual(FIRST_TOUCH_MAX_WORDS);
    const padded = `${advisorBody()}\n\n${Array.from({ length: 40 }, () => 'word').join(' ')}`;
    expect(lintFirstTouch(padded, link).join(' ')).toMatch(/length: \d+ words \(must be 50-90\)/);
    expect(lintFirstTouch(`Hi. ${link} Worth a look?`, link).join(' ')).toMatch(/length/);
  });

  it('rejects em and en dashes', () => {
    expect(lintFirstTouch(advisorBody('Quick one — really.'), link)).toContain('em or en dash');
    expect(lintFirstTouch(advisorBody('Quick one – really.'), link)).toContain('em or en dash');
    expect(lintOpener('Saw your post -- nice.')).toContain('em or en dash');
  });

  it('rejects the banned jargon, the heavy ask, generic openers and in-body legal text', () => {
    const cases: Array<[string, RegExp]> = [
      ['Quantis runs deterministic math.', /deterministic/],
      ['The AI writes the narration.', /narration/],
      ['Run a pre-mortem on it.', /pre-mortem/],
      ['Start from a clean baseline.', /baseline/],
      ['It makes your assumptions explicit.', /explicit assumptions/],
      ['Five free Decision Runs a month.', /Decision Run/],
      ['Reply with one client decision you are weighing.', /heavy ask/],
      ['Pick one anonymized client case.', /anonymized/],
      ['I will send it back within 24 hours.', /24 hours/],
      ["I'll skip the pitch.", /skip the pitch/],
      ['I hope this email finds you well.', /hope this finds you/],
      ['Worth a 20-minute call?', /meeting ask/],
      ['This is not financial advice.', /legal disclaimer/],
      ['Disclaimer: illustrative only.', /legal disclaimer/],
    ];
    for (const [sentence, label] of cases) {
      const v = lintFirstTouch(advisorBody(sentence), link).join(' | ');
      expect(v, sentence).toMatch(label);
    }
  });

  it('flags every problem in the live 2026-11-03 draft', () => {
    const v = lintFirstTouch(LIVE_2026_11_03, link).join(' | ');
    for (const needle of ['skip the pitch', 'explicit assumptions', 'deterministic', 'narration', 'heavy ask', '24 hours', 'em or en dash', 'demo link must appear exactly once']) {
      expect(v).toContain(needle);
    }
  });
});

describe('opener (F8: personalize from evidence or not at all)', () => {
  it('neutral opener uses role and firm only, and degrades on odd CRM values', () => {
    expect(neutralOpener('Fractional CFO', 'Northline Advisory')).toBe('A question for you as Fractional CFO at Northline Advisory.');
    expect(neutralOpener('Founder | Fractional CFO | Speaker', 'Northline')).toBe('A question for you at Northline.');
    expect(neutralOpener('CFO', 'www.northline.co')).toBe('Quick one.');
    expect(neutralOpener('Partner', 'Smith — Jones')).toBe('A question for you as Partner at Smith - Jones.');
    expect(neutralOpener(null, null)).toBe('Quick one.');
  });
  it('a model opener is one short plain sentence with no link and no question', () => {
    expect(lintOpener('You wrote about rebuilding client models every quarter.')).toEqual([]);
    expect(lintOpener('Saw your post at https://linkedin.com/x.')).toContain('link in opener');
    expect(lintOpener('Are you rebuilding models every quarter?')).toContain('opener must not ask a question');
    expect(lintOpener(Array.from({ length: 30 }, () => 'word').join(' ')).join(' ')).toMatch(/opener too long/);
  });
});

describe('audience and subject', () => {
  it('advisors get the client question; owners get the hire question', () => {
    expect(audienceFor('fractional CFOs', null)).toBe('advisor');
    expect(audienceFor(null, 'FP&A Consultant')).toBe('advisor');
    expect(audienceFor('dental practices', 'Owner')).toBe('owner');
    expect(firstTouchSubject('advisor')).toBe('downside case for a client hire');
    expect(renderFirstTouchBody({ audience: 'owner', opener: 'Quick one.', link })).toContain('When you weigh a new hire');
  });
});

describe('follow-up (step 2, the last touch)', () => {
  it('offers the sample memo, asks for a one-word reply, has no link and passes lint', () => {
    const body = renderFollowupBody();
    expect(lintFollowup(body)).toEqual([]);
    expect(body).toMatch(/sample memo/);
    expect(body).toMatch(/not a real client/);
    expect(body).toMatch(/one-word reply/);
    expect(body).not.toMatch(/https?:\/\//);
    expect(lintFollowup(`${body} ${link}`)).toContain('link in follow-up');
  });

  it('stays threaded under the new first-touch subject (#399)', () => {
    const r = planFollowupThread(null, [
      { kind: 'first_touch', subject: firstTouchSubject('advisor'), internet_message_id: '<ft@aiwmcquantis.com>', sent_at: '2026-11-03T15:00:00Z' },
    ]);
    expect(r).toEqual({ ok: true, subject: 'Re: downside case for a client hire', inReplyTo: '<ft@aiwmcquantis.com>', references: ['<ft@aiwmcquantis.com>'] });
  });
});

describe('wiring (source checks: the edge function cannot be imported under Node)', () => {
  const fn = readFileSync('supabase/functions/commercial-workflow/index.ts', 'utf8');
  const followUp = readFileSync('supabase/functions/_shared/commercial/stages/follow-up.ts', 'utf8');
  it('the cold sequence defines step 2 only, so draft_followup rejects step 3+', () => {
    const steps = followUp.match(/export const SEQUENCE_STEPS[^=]*= \{([\s\S]*?)\n\};/)?.[1] ?? '';
    expect(steps.match(/^\s*(\d+):/gm)?.map((s) => s.trim())).toEqual(['2:']);
    expect(fn).toMatch(/sequence_step must be one of \$\{Object\.keys\(SEQUENCE_STEPS\)/);
  });
  it('first touches and step 2 use the fixed copy, lint, and the existing footer', () => {
    expect(fn).toMatch(/const link = demoLink\(campaign\.name\)/);
    expect(fn).toMatch(/lintFirstTouch\(copy\.body, link\)/);
    expect(fn).toMatch(/renderFollowupBody\(\)/);
    expect(fn).toMatch(/composeOutboundEmail\(copy\.body, row\.contact_name, campaign\.sender_identity\)/);
    expect(fn).toMatch(/composeOutboundEmail\(stepBody, row\.contact_name, sender\)/);
    // Suppression still runs before any draft.
    expect(fn).toMatch(/const gate = await suppressionGate\(svc, row\)/);
  });
});
