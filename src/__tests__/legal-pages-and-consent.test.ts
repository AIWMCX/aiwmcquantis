import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  buildSignupConsentMetadata,
  hasPendingConsent,
  needsConsentSync,
  PENDING_CONSENT_SLOT,
  savePendingConsent,
  takePendingConsent,
  TERMS_VERSION,
} from '@/lib/signupConsent';

const read = (p: string) => readFileSync(p, 'utf8');

function memoryStorage() {
  const m = new Map<string, string>();
  return {
    getItem: (k: string) => (m.has(k) ? m.get(k)! : null),
    setItem: (k: string, v: string) => { m.set(k, v); },
    removeItem: (k: string) => { m.delete(k); },
    raw: m,
  };
}

describe('signup consent record', () => {
  const now = new Date('2026-11-03T12:00:00Z');

  it('refuses to build a record without Terms + 18+ acceptance', () => {
    expect(() => buildSignupConsentMetadata({ termsAccepted: false, marketingOptIn: true, now })).toThrow();
  });

  it('never implies marketing consent', () => {
    const c = buildSignupConsentMetadata({ termsAccepted: true, marketingOptIn: false, now });
    expect(c).toEqual({
      age_confirmed: true,
      terms_accepted_at: '2026-11-03T12:00:00.000Z',
      terms_version: TERMS_VERSION,
      marketing_opt_in: false,
      marketing_opt_in_at: null,
      consent_source: 'signup_form',
    });
  });

  it('timestamps an explicit marketing opt-in', () => {
    const c = buildSignupConsentMetadata({ termsAccepted: true, marketingOptIn: true, now, source: 'google_oauth' });
    expect(c.marketing_opt_in).toBe(true);
    expect(c.marketing_opt_in_at).toBe('2026-11-03T12:00:00.000Z');
    expect(c.consent_source).toBe('google_oauth');
  });

  it('round-trips a pending OAuth consent once, then clears it', () => {
    const s = memoryStorage();
    const c = buildSignupConsentMetadata({ termsAccepted: true, marketingOptIn: false, now, source: 'google_oauth' });
    savePendingConsent(c, s);
    expect(s.raw.has(PENDING_CONSENT_SLOT)).toBe(true);
    expect(takePendingConsent(s)).toEqual(c);
    expect(takePendingConsent(s)).toBeNull();
  });

  it('rejects a malformed pending record and never upgrades marketing to true', () => {
    const s = memoryStorage();
    s.setItem(PENDING_CONSENT_SLOT, '{"age_confirmed":false}');
    expect(takePendingConsent(s)).toBeNull();
    s.setItem(PENDING_CONSENT_SLOT, JSON.stringify({ age_confirmed: true, terms_accepted_at: 'x', marketing_opt_in: 'yes' }));
    expect(takePendingConsent(s)?.marketing_opt_in).toBe(false);
    s.setItem(PENDING_CONSENT_SLOT, 'not json');
    expect(takePendingConsent(s)).toBeNull();
  });

  it('only syncs accounts with no recorded Terms acceptance', () => {
    expect(needsConsentSync(undefined)).toBe(true);
    expect(needsConsentSync({})).toBe(true);
    expect(needsConsentSync({ terms_accepted_at: '2026-11-03T12:00:00.000Z' })).toBe(false);
  });
});

describe('Terms of Service', () => {
  const terms = read('src/pages/Terms.tsx');

  it('has an 18+ eligibility clause and names the operator', () => {
    expect(terms).toMatch(/3\.1 Eligibility/);
    expect(terms).toMatch(/at least 18 years old/);
    expect(terms).toMatch(/AIWMC LLC, a Colorado limited liability company/);
  });

  it('links the DMCA procedure and the AI policy', () => {
    expect(terms).toContain('to="/dmca"');
    expect(terms).toContain('to="/ai-policy"');
  });

  it('shows a fixed last-updated date, never the current date', () => {
    expect(terms).toContain("TERMS_LAST_UPDATED = 'November 3, 2026'");
    expect(terms).not.toMatch(/Last updated: \{new Date\(\)/);
  });

  it('states the same minimum password length the signup form enforces', () => {
    expect(read('src/components/auth/SignupForm.tsx')).toContain(".min(8, 'Password must be at least 8 characters')");
    expect(terms).toContain('at least 8 characters');
    expect(terms).not.toContain('minimum 12 characters');
  });
});

describe('AI policy and DMCA pages', () => {
  const ai = read('src/pages/AiPolicy.tsx');
  const dmca = read('src/pages/Dmca.tsx');

  it('AI policy lists the same providers as Privacy §5 and uses the canonical scenario count', () => {
    const privacy = read('src/pages/Privacy.tsx');
    for (const provider of ['DeepSeek', 'Anthropic', 'Dahl gateway']) {
      expect(ai).toContain(provider);
      expect(privacy).toContain(provider);
    }
    expect(ai).toContain('{MONTE_CARLO_ITERATIONS_DISPLAY}');
    expect(ai).not.toMatch(/\b1,000\b/);
    expect(ai).not.toMatch(/\$\d/); // never hard-code prices
  });

  it('AI policy makes no training claim about DeepSeek', () => {
    expect(ai).not.toMatch(/DeepSeek[^.]{0,120}(does not|doesn't|never) (use|train)/i);
  });

  it('DMCA page carries the statutory elements and never claims a registered agent', () => {
    for (const s of ['512(c)(3)', '512(g)(3)', '512(f)', 'Repeat infringers', 'legal@aiwmcquantis.com']) {
      expect(dmca).toContain(s);
    }
    const rendered = dmca.replace(/\/\*[\s\S]*?\*\//g, '');
    expect(rendered).not.toMatch(/registration (is )?pending|agent is registered|our registered agent/i);
  });
});

describe('legal routes are registered and linked', () => {
  for (const route of ['/ai-policy', '/dmca']) {
    it(`${route} is routed, prerendered, in the sitemap and in the footer`, () => {
      expect(read('src/App.tsx')).toContain(`path="${route}"`);
      expect(read('scripts/seo.routes.mjs')).toContain(`"${route}"`);
      expect(read('scripts/generate-sitemap.ts')).toContain(`'${route}'`);
      expect(readFileSync('src/components/seo/RouteSEO.tsx', 'latin1')).toContain(`'${route}'`);
      expect(readFileSync('scripts/generate-static-bodies.mjs', 'latin1')).toContain(`"${route}": \``);
      expect(read('src/components/layout/Footer.tsx')).toContain(`to: '${route}'`);
    });
  }
});

// 2026-11-03: the invite magic link and Google from the login page created
// accounts with no Terms / 18+ record.
describe('every way into an account records Terms + 18+', () => {
  it('keeps the invite magic-link source through the pending round-trip', () => {
    const store = memoryStorage();
    savePendingConsent(buildSignupConsentMetadata({ termsAccepted: true, marketingOptIn: false, source: 'invite_magic_link' }), store);
    expect(hasPendingConsent(store)).toBe(true);
    expect(takePendingConsent(store)?.consent_source).toBe('invite_magic_link');
    expect(hasPendingConsent(store)).toBe(false);
  });

  it('the invite magic link requires the Terms box and sends the record with the link', () => {
    const invite = read('src/pages/Invite.tsx');
    expect(invite).toMatch(/if \(!termsAccepted\)/);
    expect(invite).toMatch(/source: 'invite_magic_link'/);
    expect(invite).toMatch(/signInWithMagicLink\(email, `\/invite\/\$\{token\}`, consent\)/);
    expect(invite).toMatch(/I am 18 or older/);
    expect(read('src/hooks/useAuth.ts')).toMatch(/data: \{ \.\.\.consent \}/);
  });

  it('a signed-in account with no record is asked once, app-wide, and cannot dismiss it', () => {
    const gate = read('src/components/consent/AccountConsentGate.tsx');
    expect(gate).toMatch(/needsConsentSync\(user\?\.user_metadata\)/);
    expect(gate).toMatch(/source: 'account_gate'/);
    expect(gate).toMatch(/onEscapeKeyDown=\{\(e\) => e\.preventDefault\(\)\}/);
    expect(gate).toMatch(/I am 18 or older/);
    expect(read('src/App.tsx')).toMatch(/<AccountConsentGate \/>/);
  });
});
