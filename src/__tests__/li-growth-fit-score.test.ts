import { describe, expect, it } from 'vitest';
import { scoreFit, tierFor, normalizeCountry, type FitInput } from '@/lib/li-growth/fit-score';

const NOW = new Date('2026-11-02T18:00:00Z');
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000).toISOString();

function input(over: Partial<FitInput> = {}): FitInput {
  return {
    name: 'Jane Doe',
    headline: 'Fractional CFO for home-services companies',
    company: 'Doe Advisory',
    linkedin_url: 'https://www.linkedin.com/in/jane-doe',
    contact_channel: 'linkedin:https://www.linkedin.com/in/jane-doe',
    country: 'US',
    business_type: 'cfo_practice',
    employees: 12,
    warmth: 'cold',
    connection_degree: 1,
    posts_weekly: false,
    has_verified_email: false,
    do_not_contact: false,
    signals: [],
    ...over,
  };
}

describe('li-growth fit score rubric v1', () => {
  it('scores a perfect-fit advisor at 100 with evidence on every dimension', () => {
    const r = scoreFit(input({
      warmth: 'engaged_my_post',
      signals: [{ signal_type: 'their_post', excerpt: 'Built a 13-week cash forecast for a client opening a second location.', observed_at: daysAgo(2) }],
    }), NOW);
    expect(r.score).toBe(100);
    expect(r.tier).toBe('dm');
    expect(r.persona).toBe('fractional_cfo');
    expect(r.disqualified).toBeNull();
    expect(r.breakdown.role).toMatchObject({ points: 30, state: 'observed' });
    expect(r.breakdown.role.evidence).toContain('Fractional CFO');
    expect(r.breakdown.business.points).toBe(20);
    expect(r.breakdown.trigger.points).toBe(25);
    expect(r.breakdown.trigger.evidence).toMatch(/13-week|forecast|second location/i);
    expect(r.breakdown.warmth.points).toBe(15);
    expect(r.breakdown.reachability.points).toBe(10);
    expect(r.version).toBe('li-fit-v2');
  });

  it('owner of a service business with a hiring event, 2nd degree, active weekly', () => {
    const r = scoreFit(input({
      headline: 'Owner, Rocky Mountain HVAC', company: 'Rocky Mountain HVAC', business_type: 'service', employees: 18,
      connection_degree: 2, posts_weekly: true, signals: [{ signal_type: 'hiring_event', excerpt: null, observed_at: daysAgo(10) }],
    }), NOW);
    // role 25 + business 20 + trigger 20 + warmth 0 + reach 6
    expect(r.score).toBe(71);
    expect(r.persona).toBe('owner_operator');
    expect(r.tier).toBe('dm');
  });

  it('a generic Founder with no business evidence gets no role points', () => {
    const r = scoreFit(input({ headline: 'Founder', business_type: null, employees: null }), NOW);
    expect(r.breakdown.role.points).toBe(0);
    expect(r.breakdown.business.points).toBe(0);
    expect(r.score).toBe(10); // reachability only
    expect(r.tier).toBe('none');
  });

  it('applies the 5 to 100 employee band and the non-service rule', () => {
    expect(scoreFit(input({ employees: null }), NOW).breakdown.business.points).toBe(10);
    expect(scoreFit(input({ employees: 400 }), NOW).breakdown.business.points).toBe(0);
    expect(scoreFit(input({ business_type: 'saas' }), NOW).breakdown.business.points).toBe(0);
    expect(scoreFit(input({ headline: 'CEO', business_type: 'saas' }), NOW).breakdown.role.points).toBe(0);
  });

  it('role ladder: advisory CPA 30, bookkeeper 15 (inferred), other finance 5', () => {
    expect(scoreFit(input({ headline: 'CPA, advisory and forecasting for contractors' }), NOW).breakdown.role).toMatchObject({ points: 30 });
    expect(scoreFit(input({ headline: 'FP&A consultant' }), NOW).persona).toBe('fpa_consultant');
    expect(scoreFit(input({ headline: 'Bookkeeper for trades' }), NOW).breakdown.role).toMatchObject({ points: 15, state: 'inferred' });
    expect(scoreFit(input({ headline: 'Controller' }), NOW).breakdown.role.points).toBe(5);
  });

  it('hard disqualifiers force 0 and say why', () => {
    const cases: Array<[Partial<FitInput>, RegExp]> = [
      [{ headline: 'Finance Recruiter' }, /recruiter/],
      [{ headline: 'Founder | LinkedIn ghostwriter' }, /ghostwriter/],
      [{ headline: 'Fractional CFO and business coach' }, /coach/],
      [{ headline: 'Angel investor' }, /investor/],
      [{ headline: 'Open to work: FP&A analyst' }, /job seeker/],
      [{ country: 'United Kingdom' }, /outside the US or Canada/],
      [{ country: null }, /country unknown/],
      [{ do_not_contact: true }, /do not contact/],
      [{ linkedin_url: 'https://www.linkedin.com/in/bogdan-jeltov' }, /internal/],
      [{ company: '' }, /company unknown/],
    ];
    for (const [over, why] of cases) {
      const r = scoreFit(input({ warmth: 'engaged_my_post', ...over }), NOW);
      expect(r.score, JSON.stringify(over)).toBe(0);
      expect(r.tier).toBe('none');
      expect(r.disqualified).toMatch(why);
    }
  });

  it('only counts triggers from the last 30 days', () => {
    const old = scoreFit(input({ signals: [{ signal_type: 'their_post', excerpt: 'We are hiring two techs.', observed_at: daysAgo(31) }] }), NOW);
    expect(old.breakdown.trigger.points).toBe(0);
    const fresh = scoreFit(input({ signals: [{ signal_type: 'their_post', excerpt: 'We are hiring two techs.', observed_at: daysAgo(29) }] }), NOW);
    expect(fresh.breakdown.trigger.points).toBe(25);
    const roleChange = scoreFit(input({ signals: [{ signal_type: 'role_change', excerpt: null, observed_at: daysAgo(3) }] }), NOW);
    expect(roleChange.breakdown.trigger.points).toBe(10);
    const noTrigger = scoreFit(input({ signals: [{ signal_type: 'their_post', excerpt: 'Happy Friday everyone.', observed_at: daysAgo(1) }] }), NOW);
    expect(noTrigger.breakdown.trigger.points).toBe(0);
  });

  it('an engaged_my_post signal counts as warmth even if warmth was left cold', () => {
    const r = scoreFit(input({ signals: [{ signal_type: 'engaged_my_post', excerpt: 'Nice breakdown.', observed_at: daysAgo(1) }] }), NOW);
    expect(r.breakdown.warmth.points).toBe(15);
  });

  it('thresholds: 70+ DM, 50 to 69 comment only, under 50 untouched', () => {
    expect(tierFor(70)).toBe('dm');
    expect(tierFor(69)).toBe('comment');
    expect(tierFor(50)).toBe('comment');
    expect(tierFor(49)).toBe('none');
    expect(tierFor(60, { dm: 60, comment: 40 })).toBe('dm');
  });

  it('is deterministic and normalizes country names', () => {
    const a = scoreFit(input(), NOW);
    expect(scoreFit(input(), NOW)).toEqual(a);
    expect(normalizeCountry('United States')).toBe('US');
    expect(normalizeCountry(' canada ')).toBe('CA');
    expect(normalizeCountry('Mexico')).toBeNull();
  });
});

// 2026-11-03: a fractional CFO's fresh post on another topic ("whiskey aging
// carrying costs") scored 40, so no comment card was ever offered.
describe('li-growth fit score v2: a fresh post is something to comment on', () => {
  const lisa = (age: number) => input({
    business_type: 'cfo_practice', employees: null, connection_degree: 3,
    signals: [{ signal_type: 'their_post', excerpt: 'Whiskey aging carrying costs: frozen inventory, financing, the angel share.', observed_at: daysAgo(age) }],
  });

  it('a strong-role 3rd-degree prospect with a 1-day-old post gets a comment card, not a DM', () => {
    const r = scoreFit(lisa(1), NOW);
    expect(r.breakdown.trigger.points).toBe(15);
    expect(r.breakdown.trigger.evidence).toMatch(/fresh post/);
    expect(r.score).toBe(55);
    expect(r.tier).toBe('comment');
  });

  it('the same post 4 days later no longer counts', () => {
    expect(scoreFit(lisa(4), NOW).breakdown.trigger.points).toBe(0);
  });

  it('a decision word still earns the full 25', () => {
    const r = scoreFit(input({ signals: [{ signal_type: 'their_post', excerpt: 'Our client is hiring two techs next month.', observed_at: daysAgo(1) }] }), NOW);
    expect(r.breakdown.trigger.points).toBe(25);
  });
});

describe('li-growth fit score v2: real fresh posts from 2026-11-03', () => {
  const post = (excerpt: string) => scoreFit(input({ connection_degree: 2, posts_weekly: true, signals: [{ signal_type: 'their_post', excerpt, observed_at: daysAgo(0) }] }), NOW);
  it.each([
    "Hey business owners! What's your biggest money headache right now?",
    'Choosing a new name for my business was harder than I expected.',
  ])('%s → a comment card', (excerpt) => {
    expect(post(excerpt).breakdown.trigger.points).toBe(15);
    expect(post(excerpt).tier).not.toBe('none');
  });
});

describe('li-growth fit score v2: a fresh post alone never reaches the DM tier', () => {
  it('a 1st-degree fractional CFO with only a fresh business post stays a comment', () => {
    const r = scoreFit(input({ connection_degree: 1, signals: [{ signal_type: 'their_post', excerpt: 'Moved two clients to a new bookkeeping close this month.', observed_at: daysAgo(0) }] }), NOW);
    expect(r.breakdown.trigger.points).toBe(15);
    expect(r.score).toBe(69);
    expect(r.tier).toBe('comment');
  });
});
