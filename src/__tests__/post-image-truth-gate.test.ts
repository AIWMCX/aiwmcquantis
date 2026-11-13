import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
// @ts-expect-error plain ESM module without types
import { truthGate } from '../../scripts/post-images/gate.mjs';

const specs = JSON.parse(readFileSync('scripts/post-images/specs-2026-10.json', 'utf8'));

const HIRE_TEXT = `A $6,500 HIRE NEEDS $13,000 IN REVENUE.
At a 50% gross margin, they need to bring in $13,000.
$6,500 ÷ 0.50 = $13,000 in new monthly revenue.
At 35% margin the number is about $18,600. At 70% it is about $9,300.`;

const CONSULTANT_TEXT = `Your client says they'll add 30 customers a month.
The business already has 12 customers. Each one takes 52 hours a month. The team has 1,040 hours.
That covers 20 customers in total. The claim needs 2,184 hours, so the team is 1,144 hours short every month.`;

describe('post image truth gate', () => {
  it('passes when every displayed number is in the post text', () => {
    expect(truthGate(specs['2026-10-21-hire-needs-revenue'], HIRE_TEXT)).toEqual({ ok: true, missing: [] });
    expect(truthGate(specs['demo-consultant-founding-pilot'], CONSULTANT_TEXT).ok).toBe(true);
  });
  it('refuses an image that shows a number the post never states', () => {
    const g = truthGate(specs['2026-10-21-hire-needs-revenue'], HIRE_TEXT.replace('about $9,300', 'a lot less'));
    expect(g.ok).toBe(false);
    expect(g.missing.join(' ')).toContain('9300');
  });
  it('treats axis markers (M12, W3) as layout, not claims', () => {
    const spec = { kicker: 'x', headline: [{ text: 'PAYBACK' }], blocks: [{ chart: { type: 'cumulative', labels: { payback: 'PAYBACK · M12' } } }] };
    expect(truthGate(spec, 'payback').ok).toBe(true);
  });
  it('checks every number on the feed layouts (versus, split, trend, question)', () => {
    const feed = JSON.parse(readFileSync('scripts/post-images/specs-feed-samples.json', 'utf8'));
    const text: Record<string, string> = {
      'sample-versus': 'The P&L showed +$58K profit and the bank ended -$20K.',
      'sample-split': '$25,000 of profit. Bonuses $40,000, renewals $22,000, slower payments $15,000: cash ends $52,000 lower.',
      'sample-trend': '$240,000 of profit; each slow month burns $40,000 until March, when $0 is left.',
      'sample-question': 'What did your first hire change about your own week?',
    };
    for (const [key, spec] of Object.entries(feed)) expect(truthGate(spec, text[key])).toEqual({ ok: true, missing: [] });
    // A number only on the big figure, a split column item, the red-month flag or the question is refused.
    expect(truthGate(feed['sample-versus'], text['sample-versus'].replace('-$20K', 'less')).missing.join(' ')).toContain('20000');
    expect(truthGate(feed['sample-split'], text['sample-split'].replace('renewals $22,000', 'renewals')).ok).toBe(false);
    expect(truthGate(feed['sample-trend'], text['sample-trend'].replace('$0 is left', 'nothing is left')).ok).toBe(false);
    expect(truthGate({ layout: 'question', question: 'Would 3 hires fix it?' }, 'Would hires fix it?').ok).toBe(false);
  });
  it('matches 30K against $30,000', () => {
    const spec = { kicker: 'x', headline: [{ text: 'X' }], blocks: [{ chart: { type: 'cumulative', lowLabel: '−$30K', labels: {} } }] };
    expect(truthGate(spec, 'Equipment cost: $30,000').ok).toBe(true);
  });
});
