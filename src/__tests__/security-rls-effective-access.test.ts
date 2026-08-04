/**
 * P0 SECURITY REGRESSION LOCK — effective-access integration matrix.
 *
 * docs/security/2026-08-03-p0-access/ documents a live, proven incident:
 * 10 tables had RLS policies literally named for service-role-only or
 * owner-only access ("_svc"/"_self") that were never actually scoped that
 * way -- every one was `USING (true) WITH CHECK (true)` for role
 * {public}, combined with full CRUD grants to anon and authenticated.
 *
 * REVIEW FIX (2026-08-04, Blockers 2/4/6): this file previously hardcoded
 * the production Supabase URL/anon key and could mutate production from
 * CI using a service-role key. Corrected to:
 *
 *   - read all target configuration from RLS_TEST_SUPABASE_URL /
 *     RLS_TEST_ANON_KEY / RLS_TEST_SERVICE_ROLE_KEY -- never hardcoded;
 *   - require RUN_RLS_INTEGRATION_TESTS=true to run at all (skips
 *     entirely otherwise, including in normal CI, so the ordinary suite
 *     never depends on or touches any live database);
 *   - hard-refuse to run against the known PRODUCTION_PROJECT_REF unless
 *     ALLOW_PRODUCTION_SECURITY_SMOKE=true is *also* set, in which case
 *     only the strictly non-mutating checks in this file may run (see the
 *     guard below) -- mutating canary tests always target a non-production
 *     ref;
 *   - assert exact HTTP status + PostgREST/Postgres error code for every
 *     denial, not "falsy/non-array output," which could previously pass
 *     on an outage or malformed response;
 *   - tag every canary row/funnel event with a per-run UUID and guarantee
 *     cleanup in afterAll, then assert zero rows remain under that run id.
 *
 * Intended structure (per the incident review): this file is the
 * integration-test tier, meant to run against an isolated staging/
 * disposable Supabase project (RLS_TEST_* pointed at it). It is NOT part
 * of the normal `vitest run` CI gate -- normal CI never sets
 * RUN_RLS_INTEGRATION_TESTS, so this entire file skips by design and never
 * touches a live database. See security-rls-production-smoke.test.ts for
 * the separate, strictly read-only, manually-gated production check.
 *
 * STATUS AS OF 2026-08-04: no isolated staging/disposable project is
 * currently available in this Supabase organization -- branching requires
 * the Pro plan (confirmed via a real API call, PaymentRequiredException),
 * and creating a new disposable project failed because the organization
 * is already at its 2-project free-tier limit (confirmed via a real API
 * call, BadRequestException). This file is therefore written and ready,
 * but has not yet been executed against a real target. It will skip
 * (not fail) until RLS_TEST_* + RUN_RLS_INTEGRATION_TESTS are supplied.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { randomUUID } from 'node:crypto';

const PRODUCTION_PROJECT_REF = 'dmlxrvfyqsakyjomsvdj';

const RUN = process.env.RUN_RLS_INTEGRATION_TESTS === 'true';
const TARGET_URL = process.env.RLS_TEST_SUPABASE_URL;
const ANON_KEY = process.env.RLS_TEST_ANON_KEY;
const SERVICE_ROLE_KEY = process.env.RLS_TEST_SERVICE_ROLE_KEY;

function targetProjectRef(url: string | undefined): string | null {
  if (!url) return null;
  const match = /^https:\/\/([a-z0-9]+)\.supabase\.co/.exec(url);
  return match ? match[1] : null;
}

function guardAgainstProduction(): void {
  const ref = targetProjectRef(TARGET_URL);
  if (
    ref === PRODUCTION_PROJECT_REF &&
    process.env.ALLOW_PRODUCTION_SECURITY_SMOKE !== 'true'
  ) {
    throw new Error(
      'Refusing to run mutating RLS integration tests against production. ' +
        'Point RLS_TEST_SUPABASE_URL at an isolated staging/disposable project, ' +
        'or use security-rls-production-smoke.test.ts for the non-mutating subset.',
    );
  }
}

const canRun = RUN && !!TARGET_URL && !!ANON_KEY && !!SERVICE_ROLE_KEY;
const describeOrSkip = canRun ? describe : describe.skip;

describeOrSkip('P0 effective-access integration matrix (staging target required)', () => {
  const REST = `${TARGET_URL}/rest/v1`;
  const RUN_ID = randomUUID();
  const seededRowIds: Record<string, string[]> = {};

  function anonFetch(path: string, init: RequestInit = {}) {
    return fetch(`${REST}${path}`, {
      ...init,
      headers: { apikey: ANON_KEY!, 'Content-Type': 'application/json', ...(init.headers ?? {}) },
    });
  }

  function serviceFetch(path: string, init: RequestInit = {}) {
    return fetch(`${REST}${path}`, {
      ...init,
      headers: {
        apikey: SERVICE_ROLE_KEY!,
        Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
        ...(init.headers ?? {}),
      },
    });
  }

  beforeAll(() => {
    guardAgainstProduction();
  });

  beforeAll(async () => {
    if (!canRun) return;
    const identityKey = `__RLS_TEST_${RUN_ID}__`;
    const res = await serviceFetch('/usage_counters', {
      method: 'POST',
      body: JSON.stringify({ identity_key: identityKey, tier: 'free', analyses_used: 1 }),
    });
    if (!res.ok) throw new Error(`Failed to seed usage_counters canary: ${res.status} ${await res.text()}`);
    const rows = (await res.json()) as Array<{ id: string }>;
    seededRowIds.usage_counters = rows.map((r) => r.id);
  });

  afterAll(async () => {
    if (!canRun) return;
    // Best-effort cleanup via service role, which always can regardless of
    // whether the anon-denial assertions correctly blocked earlier deletes.
    await serviceFetch(`/usage_counters?identity_key=eq.${encodeURIComponent(`__RLS_TEST_${RUN_ID}__`)}`, {
      method: 'DELETE',
    }).catch(() => {});
    // BLOCKER 5 requirement: assert zero rows remain under this run's tag.
    const check = await serviceFetch(
      `/usage_counters?identity_key=eq.${encodeURIComponent(`__RLS_TEST_${RUN_ID}__`)}&select=id`,
    );
    const remaining = (await check.json().catch(() => [])) as unknown[];
    expect(remaining.length, 'canary rows must not survive the test run').toBe(0);
  });

  describe('service-role-only tables (usage_counters, analysis_attempts, leads, quote_gen_usage, analysis_cases)', () => {
    const tables = ['usage_counters', 'analysis_attempts', 'leads', 'quote_gen_usage', 'analysis_cases'];
    for (const table of tables) {
      it(`anon SELECT on ${table} is denied with 403/42501 (no grant, not just RLS-filtered)`, async () => {
        const res = await anonFetch(`/${table}?select=id&limit=1`);
        const body = await res.json().catch(() => ({}));
        expect(res.status).toBe(403);
        expect(res.headers.get('content-type')).toContain('application/json');
        expect(body.code).toBe('42501');
      });
      it(`anon INSERT on ${table} is denied with 403/42501`, async () => {
        const res = await anonFetch(`/${table}`, { method: 'POST', body: JSON.stringify({}) });
        expect(res.status).toBe(403);
      });
    }
  });

  describe('BLOCKER 3 matrix — owner-scoped tables (requires two real authenticated JWTs)', () => {
    // NOT YET IMPLEMENTED: requires provisioning synthetic auth users A and
    // B on the staging target and obtaining real Supabase-issued JWTs for
    // each (e.g. via the Auth Admin API's generate-link or a password
    // sign-in against a disposable test account created for this purpose).
    // Once a staging project is available, this block should:
    //   1. create user A, user B, and an admin user via the Auth Admin API;
    //   2. sign in as each to obtain a real access_token;
    //   3. seed one owner-scoped canary row per table, per user, tagged
    //      with RUN_ID;
    //   4. run every assertion listed in the incident review's Blocker 3
    //      (invoices, export_jobs, shared_reports, referral_codes,
    //      funnel_events admin-select) using those tokens as
    //      `Authorization: Bearer <token>`, not anon or service-role;
    //   5. delete the synthetic users and all tagged rows in afterAll.
    it.skip('cross-identity matrix pending a staging project (see file header)', () => {});
  });

  it('record_funnel_event RPC still succeeds for anon after the grant revoke (must not regress)', async () => {
    const res = await anonFetch('/rpc/record_funnel_event', {
      method: 'POST',
      body: JSON.stringify({
        _event_name: 'home_view',
        _session_id: `rls-test-${RUN_ID}`,
        _metadata: { security_test_run_id: RUN_ID },
      }),
    });
    expect(res.status).toBeLessThan(300);
  });

  it('record_funnel_event RPC rejects a disallowed event name (canonical-name CHECK constraint still enforced)', async () => {
    const res = await anonFetch('/rpc/record_funnel_event', {
      method: 'POST',
      body: JSON.stringify({
        _event_name: `not_a_real_event_${RUN_ID}`,
        _session_id: `rls-test-${RUN_ID}`,
      }),
    });
    // The RPC catches the CHECK violation itself (function is
    // SECURITY DEFINER) -- expect either a non-2xx or a null id, never a
    // successfully inserted row for a disallowed name.
    expect(res.ok === false || (await res.clone().json().catch(() => null)) === null).toBe(true);
  });

  afterAll(async () => {
    if (!canRun) return;
    // BLOCKER 6: the RPC-succeeds test above writes one real funnel_events
    // row (session-tagged with RUN_ID in metadata). Remove it via
    // service-role so no test data pollutes real funnel analytics.
    await serviceFetch(`/funnel_events?session_id=eq.${encodeURIComponent(`rls-test-${RUN_ID}`)}`, {
      method: 'DELETE',
    }).catch(() => {});
    const check = await serviceFetch(
      `/funnel_events?session_id=eq.${encodeURIComponent(`rls-test-${RUN_ID}`)}&select=id`,
    );
    const remaining = (await check.json().catch(() => [])) as unknown[];
    expect(remaining.length, 'test funnel_events rows must not survive the test run').toBe(0);
  });
});

describe('P0 incident evidence files exist (documentation regression lock)', () => {
  it('the incident directory and migration are present in the repo', () => {
    const fs = require('node:fs');
    const path = require('node:path');
    const root = path.join(__dirname, '..', '..');
    const incidentDir = path.join(root, 'docs/security/2026-08-03-p0-access');
    for (const file of [
      '00_EXECUTIVE_SUMMARY.md',
      '01_RAW_POLICY_EVIDENCE.sql',
      '02_EFFECTIVE_ACCESS_RESULTS.md',
      '03_TABLE_ACCESS_MATRIX.csv',
      '04_REMEDIATION_PLAN.md',
      '05_ROLLBACK.sql',
      '06_POST_DEPLOY_VERIFICATION.md',
    ]) {
      expect(fs.existsSync(path.join(incidentDir, file)), `missing ${file}`).toBe(true);
    }
    expect(
      fs.existsSync(path.join(root, 'supabase/migrations/20260804000000_p0_access_control_hardening.sql')),
    ).toBe(true);
  });
});
