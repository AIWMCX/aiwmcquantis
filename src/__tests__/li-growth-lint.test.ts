import { describe, expect, it } from 'vitest';
import { lintDraft, extractNumbers, countSentences } from '@/lib/li-growth/lint';
import * as server from '../../supabase/functions/_shared/li-growth-lint.ts';

// PRD 3.6 example (fractional CFO post), with the two numbers it uses in the
// fact bank. Hyphenated words like "13-week" are fine; dashes used as
// punctuation are not.
const POST = 'Moved two clients from monthly to weekly cash reviews. Fewer surprises.';
const GOOD_COMMENT =
  'Weekly matters most in the two months a year that have three biweekly payrolls. Payroll cash out in those months is 50% higher than in a normal month, and that is usually where the low point hides. Do your clients keep a 13-week view or just the next four?';
const FACTS = ['50%', '13'];

const codes = (r: ReturnType<typeof lintDraft>) => r.issues.map((i) => i.code);

describe('li-growth lint', () => {
  it('the browser and the edge function run the same lint', () => {
    expect(lintDraft).toBe(server.lintDraft);
  });

  it('passes a specific, sourced, pitch-free comment', () => {
    const r = lintDraft({ text: GOOD_COMMENT, action: 'comment', sourceText: POST, factNumbers: FACTS });
    expect(r.issues).toEqual([]);
    expect(r.ok).toBe(true);
    expect(r.sentences).toBe(3);
    expect(r.questions).toBe(1);
    expect(Object.values(r.checks).every(Boolean)).toBe(true);
  });

  it('blocks em dashes, en dashes and spaced hyphens', () => {
    for (const t of [GOOD_COMMENT.replace(', and', ' — and'), GOOD_COMMENT.replace(', and', ' – and'), GOOD_COMMENT.replace(', and', ' - and')]) {
      const r = lintDraft({ text: t, action: 'comment', sourceText: POST, factNumbers: FACTS });
      expect(codes(r)).toContain('dash');
      expect(r.checks.dash).toBe(false);
    }
  });

  it('blocks AI tells, banned openers, exclamation marks and a leading emoji', () => {
    expect(codes(lintDraft({ text: `Great post. ${GOOD_COMMENT}`, action: 'comment', sourceText: POST, factNumbers: FACTS }))).toContain('opener');
    expect(codes(lintDraft({ text: `100% this. ${GOOD_COMMENT}`, action: 'comment', sourceText: POST, factNumbers: FACTS }))).toContain('opener');
    expect(codes(lintDraft({ text: GOOD_COMMENT.replace('usually', 'actually'), action: 'comment', sourceText: POST, factNumbers: FACTS }))).toContain('banned_phrase');
    expect(codes(lintDraft({ text: GOOD_COMMENT.replace('Weekly matters', 'This is a game-changer. Weekly matters'), action: 'comment', sourceText: POST, factNumbers: FACTS }))).toContain('banned_phrase');
    expect(codes(lintDraft({ text: "It's not the salary, it's the ramp. Weekly cash reviews catch it early for clients.", action: 'dm_first' }))).toContain('banned_phrase');
    expect(codes(lintDraft({ text: GOOD_COMMENT.replace('four?', 'four!'), action: 'comment', sourceText: POST, factNumbers: FACTS }))).toContain('exclamation');
    expect(codes(lintDraft({ text: `\u{1F680} ${GOOD_COMMENT}`, action: 'comment', sourceText: POST, factNumbers: FACTS }))).toContain('emoji_start');
  });

  it('flags a pitch in a comment but allows "I am building" in a DM', () => {
    const pitch = `${GOOD_COMMENT.replace('?', '.')} We built Quantis for exactly this.`;
    const r = lintDraft({ text: pitch, action: 'comment', sourceText: POST, factNumbers: FACTS });
    expect(codes(r)).toContain('pitch');
    expect(r.checks.pitch).toBe(false);
    const dm = "Hi Jane, your post on weekly cash reviews stuck with me. I'm building a decision-modeling tool for service businesses. Would a one-page worked example be useful?";
    expect(codes(lintDraft({ text: dm, action: 'dm_first', sourceText: POST }))).not.toContain('pitch');
  });

  it('blocks links, tags, prices, traction claims and unfilled placeholders', () => {
    const base = 'Hi Jane, thanks for the post on weekly cash reviews. Would a one-page example help?';
    expect(codes(lintDraft({ text: `${base} See aiwmcquantis.com for more.`, action: 'dm_first' }))).toContain('link');
    expect(codes(lintDraft({ text: `${base} Our clients love it.`, action: 'dm_first' }))).toContain('traction_claim');
    expect(codes(lintDraft({ text: 'Hi {first}, thanks for the post. Would a one-page example help?', action: 'dm_first' }))).toContain('placeholder');
    expect(codes(lintDraft({ text: `${GOOD_COMMENT} cc @Jane`, action: 'comment', sourceText: POST, factNumbers: FACTS }))).toContain('tag');
    const price = lintDraft({ text: `${base} It is $49/mo.`, action: 'dm_first', factNumbers: ['49'] });
    expect(codes(price)).toContain('price');
  });

  it('truth gate: every number must be in their post or the fact bank', () => {
    const r = lintDraft({ text: GOOD_COMMENT, action: 'comment', sourceText: POST, factNumbers: ['13'] });
    expect(codes(r)).toEqual(['unsourced_number']);
    expect(r.unsourced_numbers).toEqual(['50%']);
    expect(r.checks.numbers_sourced).toBe(false);

    // $70k in their post covers $70,000 in the draft (same value), not $90k.
    const post = 'Hiring our second project manager at $70k. Big step for us.';
    const ok = lintDraft({ text: 'Hi Sam, congrats on the project manager hire. At $70,000 the ramp months matter most. Want the one-page check?', action: 'dm_first', sourceText: post });
    expect(ok.checks.numbers_sourced).toBe(true);
    const bad = lintDraft({ text: 'Hi Sam, congrats on the project manager hire. At $90k fully loaded the ramp months matter most. Want the one-page check?', action: 'dm_first', sourceText: post });
    expect(bad.unsourced_numbers).toEqual(['$90k']);
  });

  it('a comment needs the pasted post and must refer to it', () => {
    expect(codes(lintDraft({ text: GOOD_COMMENT, action: 'comment', factNumbers: FACTS }))).toContain('no_source');
    const offTopic = 'Pricing pages convert better with a single plan. Most visitors only compare two options before deciding. Which plan do you lead with on yours?';
    expect(codes(lintDraft({ text: offTopic, action: 'comment', sourceText: POST }))).toContain('no_overlap');
  });

  it('flags quoting their post at length', () => {
    const post = 'We moved every client from monthly to weekly cash reviews and the surprises stopped within a quarter.';
    const text = 'You said we moved every client from monthly to weekly cash reviews and it worked. Which client size benefits most from that change in your practice?';
    expect(codes(lintDraft({ text, action: 'comment', sourceText: post }))).toContain('quotes_source');
  });

  it('enforces length, sentence and question limits per action', () => {
    expect(codes(lintDraft({ text: 'Weekly cash reviews help clients. Agreed.', action: 'comment', sourceText: POST }))).toContain('too_short');
    const long = Array.from({ length: 4 }, () => 'Weekly cash reviews help clients spot the low point in months with three payrolls before it arrives and that matters a lot more than people expect.').join(' ');
    expect(codes(lintDraft({ text: long, action: 'comment', sourceText: POST, factNumbers: [] }))).toContain('too_long');
    expect(codes(lintDraft({ text: `${'Hi Jane, thanks for the post on cash reviews and what you saw with clients. '.repeat(9)}Want it?`, action: 'dm_first' }))).toContain('too_long');
    expect(codes(lintDraft({ text: 'Weekly cash reviews help clients a lot when payroll lands three times in a month and the owner has not planned for it at all in advance?? Is that what you saw?', action: 'comment', sourceText: POST }))).toContain('questions');
    expect(codes(lintDraft({ text: 'Hi Jane, thanks for the post.', action: 'dm_first' }))).toContain('sentences');
  });

  it('extracts numbers the way a reader would', () => {
    expect(extractNumbers('$70k hire, 25% load, 1,200 hours, Q4 and M12 skipped').map((n) => n.value)).toEqual([70000, 25, 1200]);
    expect(extractNumbers('a 13-week view, $1.5M, 2nd PM').map((n) => n.value)).toEqual([13, 1_500_000, 2]);
    expect(countSentences('E.g. weekly works. Does it? Yes.')).toBe(3);
  });
});
