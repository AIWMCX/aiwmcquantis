import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';

// Production read-out 2026-11-02: founder, QA and fixture accounts were still in
// the clean funnel. The email rule now also covers the TEST cohort patterns
// (classify_user_cohort, 20260823174934) and the founder's other accounts.
const DIR = 'supabase/migrations';
const PREV_FILE = '20261029010000_funnel_clean_skip_trigger_rows.sql';
const NEXT_FILE = '20261102120000_funnel_clean_internal_test_accounts.sql';
const PREV = readFileSync(`${DIR}/${PREV_FILE}`, 'utf8');
const NEXT = readFileSync(`${DIR}/${NEXT_FILE}`, 'utf8');
const viewOf = (sql: string) => {
  const a = sql.indexOf('CREATE OR REPLACE VIEW public.funnel_events_clean');
  const b = sql.indexOf('GRANT SELECT ON public.funnel_events_clean TO service_role;');
  return sql.slice(a, b).replace(/\r/g, '');
};

const NEW_RULES = [
  "OR COALESCE(u.email, '')::text ~* '(jeltov|beltov|aiwmc|jjbalaganvasya|glasswing|qatest|audit-test)'",
  "OR COALESCE(u.email, '')::text ~* '(quantis-e2e\\.test|quantis-test\\.com|mailnull)'",
  "OR COALESCE(u.email, '')::text ILIKE 'bel%@gmail.com'",
  "OR lower(COALESCE(u.email, '')::text) = 'digitalhubshops@gmail.com'",
];

// The same four rules, evaluated the way Postgres does (~* and ILIKE ignore case).
const isInternalEmail = (email: string) =>
  /(jeltov|beltov|aiwmc|jjbalaganvasya|glasswing|qatest|audit-test)/i.test(email) ||
  /(quantis-e2e\.test|quantis-test\.com|mailnull)/i.test(email) ||
  /^bel.*@gmail\.com$/i.test(email) ||
  email.toLowerCase() === 'digitalhubshops@gmail.com';

describe('funnel_events_clean: founder, QA and fixture accounts are internal', () => {
  it('is the previous view with only the email rule replaced', () => {
    const prev = viewOf(PREV).split('\n');
    const next = viewOf(NEXT).split('\n');
    expect(next.filter((l) => !prev.includes(l)).map((l) => l.trim())).toEqual(NEW_RULES);
    expect(prev.filter((l) => !next.includes(l)).map((l) => l.trim())).toEqual([
      "OR COALESCE(u.email, '')::text ~* '(jeltov|beltov|aiwmc|jjbalaganvasya)'",
    ]);
  });

  it('keeps session-level marking and the trigger-row filter', () => {
    const view = viewOf(NEXT);
    expect(view).toContain('bool_or(row_internal) OVER (PARTITION BY COALESCE(session_id, id::text)) AS is_internal');
    expect(view).toContain("WHERE COALESCE(fe.metadata ->> 'emitted_by', '') <> 'trg_analyses_emit_complete_event'");
    expect(view).toContain('is_first_in_session');
  });

  it('keeps the same exposure: invoker security, no anon/authenticated grant', () => {
    expect(NEXT).toContain('WITH (security_invoker = true)');
    expect(NEXT).toContain('REVOKE ALL ON public.funnel_events_clean FROM anon, authenticated;');
    expect(NEXT).toContain('GRANT SELECT ON public.funnel_events_clean TO service_role;');
    expect(NEXT).not.toMatch(/GRANT [^;]* TO (anon|authenticated)/);
  });

  it('flags the accounts from the read-out and leaves ordinary customers alone', () => {
    for (const e of [
      'beltovbogdan@gmail.com', 'jeltovbogdan@gmail.com', 'jjbalaganvasya@gmail.com',
      'glasswing.qa.2026-07-12@aiwmcquantis.com', 'digitalhubshops@gmail.com', 'DigitalHubShops@Gmail.com',
      'runner-1@quantis-e2e.test', 'a@quantis-test.com', 'x@mailnull.com', 'qatest+1@example.com',
    ]) expect(isInternalEmail(e), e).toBe(true);
    for (const e of ['maria.lopez@gmail.com', 'owner@denvercoffee.com', 'bel@outlook.com']) {
      expect(isInternalEmail(e), e).toBe(false);
    }
  });

  it('is the newest definition of the view', () => {
    const later = readdirSync(DIR)
      .filter((f) => f > NEXT_FILE && f.endsWith('.sql'))
      .filter((f) => readFileSync(`${DIR}/${f}`, 'utf8').includes('VIEW public.funnel_events_clean'));
    expect(later).toEqual([]);
  });
});
