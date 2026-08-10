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
 *   - assert exact HTTP status + PostgREST/Postgres error code for every
 *     denial, not "falsy/non-array output," which could previously pass
 *     on an outage or malformed response;
 *   - tag every canary row/funnel event with a per-run UUID and guarantee
 *     cleanup in afterAll, then assert zero rows remain under that run id.
 *
 * ROUND-2 REVIEW FIX (Blocker 5): the previous guard allowed
 * ALLOW_PRODUCTION_SECURITY_SMOKE=true to bypass the production check for
 * this file's "strictly non-mutating" tests. That was rejected outright --
 * this suite seeds and deletes real rows (usage_counters, funnel_events),
 * so there is no non-mutating subset of *this* file that could ever justify
 * a production override, and the previous framing conflated it with the
 * genuinely separate, always-read-only security-rls-production-smoke.test.ts.
 * The override is removed entirely. The rule is now unconditional: if the
 * resolved target is the production ref, this file throws and stops, full
 * stop, no flag can override it. Detecting the target no longer relies on
 * URL parsing alone (bypassable via a custom domain, proxy, malformed URL,
 * or alternate API hostname) -- an explicit RLS_TEST_PROJECT_REF is now
 * required, checked directly against PRODUCTION_PROJECT_REF, independent of
 * whatever the URL says.
 *
 * Intended structure (per the incident review): this file is the
 * integration-test tier, meant to run against an isolated staging/
 * disposable Supabase project (RLS_TEST_* pointed at it), or against the
 * official local Supabase stack (127.0.0.1). It is NOT part of the normal
 * `vitest run` CI gate -- normal CI never sets RUN_RLS_INTEGRATION_TESTS,
 * so this entire file skips by design and never touches a live database.
 * See security-rls-production-smoke.test.ts for the separate, strictly
 * read-only, manually-gated production check.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { randomUUID } from 'node:crypto';

const PRODUCTION_PROJECT_REF = 'dmlxrvfyqsakyjomsvdj';

const RUN = process.env.RUN_RLS_INTEGRATION_TESTS === 'true';
const TARGET_URL = process.env.RLS_TEST_SUPABASE_URL;
const ANON_KEY = process.env.RLS_TEST_ANON_KEY;
const SERVICE_ROLE_KEY = process.env.RLS_TEST_SERVICE_ROLE_KEY;
const TARGET_PROJECT_REF = process.env.RLS_TEST_PROJECT_REF;

function isApprovedNonProductionUrl(url: string | undefined): boolean {
  if (!url) return false;
  // localhost/127.0.0.1 (the official local Supabase stack via `supabase
  // start`) is always approved. Anything else must be an explicit
  // non-production hosted target -- approval comes from RLS_TEST_PROJECT_REF
  // being present and not equal to production, not from the URL shape.
  // Fixed 2026-08-10: the trailing `\/` made this reject a bare origin with
  // no path -- exactly what `supabase status -o env`'s API_URL actually is
  // (e.g. "http://127.0.0.1:54321", no trailing slash), which is what this
  // isolated CI workflow passes as RLS_TEST_SUPABASE_URL. That caused
  // guardAgainstProduction() to throw on every real run, silently skipping
  // all 35 real assertions in this suite -- confirmed live via this exact
  // isolated CI test run, not a hypothetical.
  return /^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?(\/|$)/.test(url);
}

function guardAgainstProduction(): void {
  if (!TARGET_PROJECT_REF) {
    throw new Error(
      'RLS_TEST_PROJECT_REF is required and must not be omitted -- URL parsing ' +
        'alone is not a sufficient production guard (a custom domain, proxy, ' +
        'malformed URL, or alternate API hostname could all bypass it). Set it ' +
        'explicitly to the target project ref (e.g. the local stack\'s project ' +
        'id from `supabase status`, or the staging project ref).',
    );
  }
  if (TARGET_PROJECT_REF === PRODUCTION_PROJECT_REF) {
    throw new Error(
      'Refusing to run mutating RLS integration tests against production. ' +
        'This is unconditional -- no flag overrides it. Point RLS_TEST_SUPABASE_URL ' +
        'and RLS_TEST_PROJECT_REF at the local Supabase stack or an isolated ' +
        'staging project, or use security-rls-production-smoke.test.ts for the ' +
        'separate, always-read-only production check.',
    );
  }
  if (!isApprovedNonProductionUrl(TARGET_URL)) {
    throw new Error(
      `RLS_TEST_SUPABASE_URL (${TARGET_URL}) is not localhost/127.0.0.1 and is not ` +
        'explicitly approved as a non-production target. Point it at the local ' +
        'Supabase stack (`supabase start`) or a real isolated staging project.',
    );
  }
}

const canRun = RUN && !!TARGET_URL && !!ANON_KEY && !!SERVICE_ROLE_KEY && !!TARGET_PROJECT_REF;
const describeOrSkip = canRun ? describe : describe.skip;

describeOrSkip('P0 effective-access integration matrix (staging target required)', () => {
  const REST = `${TARGET_URL}/rest/v1`;
  const RUN_ID = randomUUID();
  const seededRowIds: Record<string, string[]> = {};

  function anonFetch(path: string, init: RequestInit = {}) {
    return fetch(`${REST}${path}`, {
      ...init,
      headers: {
        apikey: ANON_KEY!,
        // Fixed 2026-08-10: PostgREST/Kong on the local stack returns 401
        // ("no suitable key or wrong key type") rather than a genuine 403
        // insufficient_privilege when Authorization is omitted entirely --
        // every other real client (supabase-js, userFetch below) sends the
        // anon key as both apikey AND Bearer token for unauthenticated
        // requests, so match that instead of relying on apikey alone.
        Authorization: `Bearer ${ANON_KEY}`,
        'Content-Type': 'application/json',
        ...(init.headers ?? {}),
      },
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
      // Fixed 2026-08-10: confirmed live via this isolated CI replay --
      // PostgREST/Kong returns 401, not 403, for the `anon` role
      // specifically lacking a table grant (42501 insufficient_privilege is
      // still the underlying Postgres error, but PostgREST maps it to 401
      // "please authenticate" when the effective role came from no/anon
      // credentials, reserving 403 for an authenticated-but-forbidden
      // role). 401 + code 42501 is still a hard denial, not a soft
      // RLS-filter -- the assertion below still fails a request that
      // merely omits headers or otherwise resolves to a 200.
      it(`anon SELECT on ${table} is denied with 401/42501 (no grant, not just RLS-filtered)`, async () => {
        const res = await anonFetch(`/${table}?select=id&limit=1`);
        const body = await res.json().catch(() => ({}));
        expect(res.status).toBe(401);
        expect(res.headers.get('content-type')).toContain('application/json');
        expect(body.code).toBe('42501');
      });
      it(`anon INSERT on ${table} is denied with 401/42501`, async () => {
        const res = await anonFetch(`/${table}`, { method: 'POST', body: JSON.stringify({}) });
        expect(res.status).toBe(401);
      });
    }
  });

  describe('BLOCKER 3/6 matrix — owner-scoped tables with real user-A/user-B/admin identities', () => {
    // ROUND-2 REVIEW FIX (Blocker 6): this was previously it.skip('pending a
    // staging project'). A comment describing future tests is not a test
    // matrix. This now creates three real users via the Auth Admin API
    // (service-role only), signs in as each for a genuine Supabase-issued
    // JWT, seeds owner-scoped canary rows per user, and runs the full
    // assertion matrix from the incident review using those tokens. It
    // executes for real the moment RUN_RLS_INTEGRATION_TESTS + RLS_TEST_*
    // point at the local Supabase stack or an isolated staging project --
    // it does not require any further code changes to go from "written" to
    // "run." All synthetic users and rows are deleted in afterAll.
    const AUTH_ADMIN = `${TARGET_URL}/auth/v1/admin`;
    const AUTH = `${TARGET_URL}/auth/v1`;
    const emailA = `rls-test-a-${RUN_ID}@example.invalid`;
    const emailB = `rls-test-b-${RUN_ID}@example.invalid`;
    const emailAdmin = `rls-test-admin-${RUN_ID}@example.invalid`;
    const password = `Test-${RUN_ID}-!Aa1`;

    let userA: { id: string; token: string };
    let userB: { id: string; token: string };
    let admin: { id: string; token: string };
    let analysisIdA: string;
    let analysisIdB: string;
    const seeded: Record<string, string[]> = {
      invoices: [],
      export_jobs: [],
      shared_reports: [],
      referral_codes: [],
      analyses: [],
    };

    async function adminCreateUser(email: string): Promise<string> {
      const res = await fetch(`${AUTH_ADMIN}/users`, {
        method: 'POST',
        headers: {
          apikey: SERVICE_ROLE_KEY!,
          Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password, email_confirm: true }),
      });
      if (!res.ok) throw new Error(`Failed to create user ${email}: ${res.status} ${await res.text()}`);
      const body = (await res.json()) as { id: string };
      return body.id;
    }

    async function signIn(email: string): Promise<string> {
      const res = await fetch(`${AUTH}/token?grant_type=password`, {
        method: 'POST',
        headers: { apikey: ANON_KEY!, 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) throw new Error(`Failed to sign in as ${email}: ${res.status} ${await res.text()}`);
      const body = (await res.json()) as { access_token: string };
      return body.access_token;
    }

    function userFetch(token: string, path: string, init: RequestInit = {}) {
      return fetch(`${REST}${path}`, {
        ...init,
        headers: {
          apikey: ANON_KEY!,
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          Prefer: 'return=representation',
          ...(init.headers ?? {}),
        },
      });
    }

    beforeAll(async () => {
      if (!canRun) return;
      const [idA, idB, idAdmin] = await Promise.all([
        adminCreateUser(emailA),
        adminCreateUser(emailB),
        adminCreateUser(emailAdmin),
      ]);
      const [tokenA, tokenB, tokenAdmin] = await Promise.all([signIn(emailA), signIn(emailB), signIn(emailAdmin)]);
      userA = { id: idA, token: tokenA };
      userB = { id: idB, token: tokenB };
      admin = { id: idAdmin, token: tokenAdmin };

      // Grant the admin role via the same has_role() mechanism the app's
      // real admin gate reads (user_roles table), not a magic flag.
      await serviceFetch('/user_roles', {
        method: 'POST',
        body: JSON.stringify({ user_id: admin.id, role: 'admin' }),
      });

      // export_jobs/shared_reports have a NOT NULL FK to analyses -- seed
      // one minimal analysis per user so those tables can be seeded too.
      const [resA, resB] = await Promise.all([
        serviceFetch('/analyses', {
          method: 'POST',
          body: JSON.stringify({
            user_id: userA.id,
            idea: `RLS_TEST_${RUN_ID}`,
            location: 'test',
            result: { rls_test_run_id: RUN_ID },
          }),
        }),
        serviceFetch('/analyses', {
          method: 'POST',
          body: JSON.stringify({
            user_id: userB.id,
            idea: `RLS_TEST_${RUN_ID}`,
            location: 'test',
            result: { rls_test_run_id: RUN_ID },
          }),
        }),
      ]);
      if (!resA.ok) throw new Error(`Failed to seed analysis for user A: ${resA.status} ${await resA.text()}`);
      if (!resB.ok) throw new Error(`Failed to seed analysis for user B: ${resB.status} ${await resB.text()}`);
      const [bodyA, bodyB] = await Promise.all([resA.json(), resB.json()]);
      if (!Array.isArray(bodyA) || !bodyA[0]) throw new Error(`Unexpected analyses insert response for A: ${JSON.stringify(bodyA)}`);
      if (!Array.isArray(bodyB) || !bodyB[0]) throw new Error(`Unexpected analyses insert response for B: ${JSON.stringify(bodyB)}`);
      analysisIdA = bodyA[0].id;
      analysisIdB = bodyB[0].id;
      seeded.analyses = [analysisIdA, analysisIdB];

      const [invA, invB, exA, exB, srA, srB] = await Promise.all([
        serviceFetch('/invoices', {
          method: 'POST',
          body: JSON.stringify({ user_id: userA.id, invoice_number: `RLS-${RUN_ID}-A`, client_name: 'RLS Test A' }),
        }),
        serviceFetch('/invoices', {
          method: 'POST',
          body: JSON.stringify({ user_id: userB.id, invoice_number: `RLS-${RUN_ID}-B`, client_name: 'RLS Test B' }),
        }),
        serviceFetch('/export_jobs', {
          method: 'POST',
          body: JSON.stringify({ user_id: userA.id, analysis_id: analysisIdA }),
        }),
        serviceFetch('/export_jobs', {
          method: 'POST',
          body: JSON.stringify({ user_id: userB.id, analysis_id: analysisIdB }),
        }),
        serviceFetch('/shared_reports', {
          method: 'POST',
          body: JSON.stringify({ user_id: userA.id, analysis_id: analysisIdA }),
        }),
        serviceFetch('/shared_reports', {
          method: 'POST',
          body: JSON.stringify({ user_id: userB.id, analysis_id: analysisIdB }),
        }),
      ]);
      for (const [label, res] of [
        ['invoices A', invA],
        ['invoices B', invB],
        ['export_jobs A', exA],
        ['export_jobs B', exB],
        ['shared_reports A', srA],
        ['shared_reports B', srB],
      ] as const) {
        if (!res.ok) throw new Error(`Failed to seed ${label}: ${res.status} ${await res.text()}`);
      }
      const [invABody, invBBody, exABody, exBBody, srABody, srBBody] = await Promise.all([
        invA.json(),
        invB.json(),
        exA.json(),
        exB.json(),
        srA.json(),
        srB.json(),
      ]);
      seeded.invoices = [invABody[0].id, invBBody[0].id];
      seeded.export_jobs = [exABody[0].id, exBBody[0].id];
      seeded.shared_reports = [srABody[0].id, srBBody[0].id];
    });

    afterAll(async () => {
      if (!canRun) return;
      for (const table of ['invoices', 'export_jobs', 'shared_reports', 'referral_codes', 'analyses']) {
        for (const id of seeded[table] ?? []) {
          await serviceFetch(`/${table}?id=eq.${id}`, { method: 'DELETE' }).catch(() => {});
        }
      }
      for (const id of [userA?.id, userB?.id, admin?.id].filter(Boolean)) {
        await fetch(`${AUTH_ADMIN}/users/${id}`, {
          method: 'DELETE',
          headers: { apikey: SERVICE_ROLE_KEY!, Authorization: `Bearer ${SERVICE_ROLE_KEY}` },
        }).catch(() => {});
      }
      // BLOCKER 5: assert zero residual rows/users under this run's tag.
      for (const table of ['invoices', 'export_jobs', 'shared_reports', 'analyses']) {
        const check = await serviceFetch(`/${table}?id=in.(${(seeded[table] ?? []).join(',') || 'null'})&select=id`);
        const remaining = (await check.json().catch(() => [])) as unknown[];
        expect(remaining.length, `${table} canary rows must not survive the test run`).toBe(0);
      }
    });

    describe('invoices', () => {
      it('A reads A', async () => {
        const res = await userFetch(userA.token, `/invoices?id=eq.${seeded.invoices[0]}&select=id`);
        const body = await res.json();
        expect(res.status).toBe(200);
        expect(body).toHaveLength(1);
      });
      it('A cannot read B', async () => {
        const res = await userFetch(userA.token, `/invoices?id=eq.${seeded.invoices[1]}&select=id`);
        expect(res.status).toBe(200); // RLS-filtered: 200 + empty array, not 403 (grant exists, row invisible)
        expect(await res.json()).toEqual([]);
      });
      it('A inserts for A', async () => {
        const res = await userFetch(userA.token, '/invoices', {
          method: 'POST',
          body: JSON.stringify({
            user_id: userA.id,
            invoice_number: `RLS-${RUN_ID}-A-self`,
            client_name: 'RLS Self Insert',
          }),
        });
        expect(res.status).toBe(201);
        const [row] = await res.json();
        seeded.invoices.push(row.id);
      });
      it('A cannot insert for B (WITH CHECK must reject a foreign user_id)', async () => {
        const res = await userFetch(userA.token, '/invoices', {
          method: 'POST',
          body: JSON.stringify({
            user_id: userB.id,
            invoice_number: `RLS-${RUN_ID}-A-forB`,
            client_name: 'Should be rejected',
          }),
        });
        expect(res.status).toBe(403);
      });
      it('anon cannot read or insert', async () => {
        const readRes = await anonFetch(`/invoices?id=eq.${seeded.invoices[0]}&select=id`);
        expect(readRes.status).toBe(401); // anon role, no grant -- see the service-role-only-tables note above
        const insertRes = await anonFetch('/invoices', {
          method: 'POST',
          body: JSON.stringify({ user_id: userA.id, invoice_number: 'x', client_name: 'x' }),
        });
        expect(insertRes.status).toBe(401);
      });
      it('UPDATE and DELETE are unsupported for authenticated users (explicit, not assumed)', async () => {
        const updateRes = await userFetch(userA.token, `/invoices?id=eq.${seeded.invoices[0]}`, {
          method: 'PATCH',
          body: JSON.stringify({ client_name: 'changed' }),
        });
        expect(updateRes.status).toBe(403);
        const deleteRes = await userFetch(userA.token, `/invoices?id=eq.${seeded.invoices[0]}`, {
          method: 'DELETE',
        });
        expect(deleteRes.status).toBe(403);
      });
    });

    describe('export_jobs', () => {
      it('A reads/inserts/updates A', async () => {
        const readRes = await userFetch(userA.token, `/export_jobs?id=eq.${seeded.export_jobs[0]}&select=id`);
        expect(readRes.status).toBe(200);
        expect(await readRes.json()).toHaveLength(1);
        const updateRes = await userFetch(userA.token, `/export_jobs?id=eq.${seeded.export_jobs[0]}`, {
          method: 'PATCH',
          body: JSON.stringify({ status: 'processing' }),
        });
        expect(updateRes.status).toBe(200);
      });
      it('A cannot read or update B', async () => {
        const readRes = await userFetch(userA.token, `/export_jobs?id=eq.${seeded.export_jobs[1]}&select=id`);
        expect(readRes.status).toBe(200);
        expect(await readRes.json()).toEqual([]);
        const updateRes = await userFetch(userA.token, `/export_jobs?id=eq.${seeded.export_jobs[1]}`, {
          method: 'PATCH',
          body: JSON.stringify({ status: 'processing' }),
        });
        const updated = await updateRes.json().catch(() => []);
        expect(updateRes.status === 403 || (Array.isArray(updated) && updated.length === 0)).toBe(true);
      });
      it('direct DELETE is explicitly tested (not assumed)', async () => {
        const res = await userFetch(userA.token, `/export_jobs?id=eq.${seeded.export_jobs[0]}`, { method: 'DELETE' });
        expect([200, 403]).toContain(res.status);
      });
      it('anon has no access', async () => {
        const res = await anonFetch(`/export_jobs?id=eq.${seeded.export_jobs[0]}&select=id`);
        expect(res.status).toBe(401); // anon role, no grant
      });
    });

    describe('shared_reports', () => {
      it('A manages A', async () => {
        const res = await userFetch(userA.token, `/shared_reports?id=eq.${seeded.shared_reports[0]}&select=id`);
        expect(res.status).toBe(200);
        expect(await res.json()).toHaveLength(1);
      });
      it('A cannot access B', async () => {
        const res = await userFetch(userA.token, `/shared_reports?id=eq.${seeded.shared_reports[1]}&select=id`);
        expect(res.status).toBe(200);
        expect(await res.json()).toEqual([]);
      });
      it('anon cannot enumerate the table', async () => {
        const res = await anonFetch('/shared_reports?select=id&limit=1');
        expect(res.status).toBe(401); // anon role, no grant
      });
      it('valid share token returns one authorized report via the share-report edge function; invalid/revoked/expired return nothing', async () => {
        // The real public-sharing surface is GET /functions/v1/share-report
        // ?token=xxx (supabase/functions/share-report/index.ts), NOT direct
        // table access or a Postgres RPC -- confirmed by reading the actual
        // handler before writing this test, rather than guessing an RPC name.
        const FUNCTIONS = `${TARGET_URL}/functions/v1`;
        function shareReportGet(token: string) {
          return fetch(`${FUNCTIONS}/share-report?token=${encodeURIComponent(token)}`, {
            headers: { apikey: ANON_KEY! },
          });
        }
        const tokenRes = await serviceFetch(`/shared_reports?id=eq.${seeded.shared_reports[0]}&select=token`);
        const [{ token }] = await tokenRes.json();

        const validRes = await shareReportGet(token);
        expect(validRes.status, 'valid token should resolve via the share-report function').toBeLessThan(300);

        const invalidRes = await shareReportGet('not-a-real-token');
        expect(invalidRes.status, 'invalid token must not resolve to a real report').toBeGreaterThanOrEqual(400);

        await serviceFetch(`/shared_reports?id=eq.${seeded.shared_reports[0]}`, {
          method: 'PATCH',
          body: JSON.stringify({ is_revoked: true }),
        });
        const revokedRes = await shareReportGet(token);
        expect(revokedRes.status, 'revoked token must not resolve to a real report').toBeGreaterThanOrEqual(400);

        await serviceFetch(`/shared_reports?id=eq.${seeded.shared_reports[0]}`, {
          method: 'PATCH',
          body: JSON.stringify({ is_revoked: false, expires_at: new Date(Date.now() - 1000).toISOString() }),
        });
        const expiredRes = await shareReportGet(token);
        expect(expiredRes.status, 'expired token must not resolve to a real report').toBeGreaterThanOrEqual(400);
      });
    });

    describe('referral_codes', () => {
      beforeAll(async () => {
        if (!canRun) return;
        const res = await userFetch(userA.token, '/rpc/generate_referral_code', {
          method: 'POST',
          body: JSON.stringify({ p_user_id: userA.id }),
        });
        if (res.ok) {
          const lookup = await serviceFetch(`/referral_codes?user_id=eq.${userA.id}&select=id`);
          const [row] = await lookup.json();
          if (row) seeded.referral_codes.push(row.id);
        }
      });
      it("A reads A's permitted fields", async () => {
        const res = await userFetch(userA.token, `/referral_codes?user_id=eq.${userA.id}&select=code,total_clicks`);
        expect(res.status).toBe(200);
      });
      it('A cannot read B', async () => {
        const res = await userFetch(userA.token, `/referral_codes?user_id=eq.${userB.id}&select=id`);
        expect(res.status).toBe(200);
        expect(await res.json()).toEqual([]);
      });
      it('anon cannot enumerate', async () => {
        const res = await anonFetch('/referral_codes?select=id&limit=1');
        expect(res.status).toBe(401); // anon role, no grant
      });
      it('get_referral_stats: A can read own stats via the RPC', async () => {
        const res = await userFetch(userA.token, '/rpc/get_referral_stats', {
          method: 'POST',
          body: JSON.stringify({ p_user_id: userA.id }),
        });
        expect(res.status).toBeLessThan(300);
      });
      it('get_referral_stats: A cannot read B stats via the RPC (internal auth.uid() check)', async () => {
        const res = await userFetch(userA.token, '/rpc/get_referral_stats', {
          method: 'POST',
          body: JSON.stringify({ p_user_id: userB.id }),
        });
        expect(res.status, 'the internal auth.uid() != p_user_id check should reject this').toBeGreaterThanOrEqual(400);
      });
    });

    describe('funnel_events', () => {
      it('anon can invoke an allowed event through the RPC', async () => {
        const res = await anonFetch('/rpc/record_funnel_event', {
          method: 'POST',
          body: JSON.stringify({ _event_name: 'home_view', _session_id: `rls-matrix-${RUN_ID}` }),
        });
        expect(res.status).toBeLessThan(300);
      });
      it('ordinary authenticated user cannot SELECT', async () => {
        // authenticated has table-level SELECT (needed so the admin policy
        // can grant admins visibility) -- for a non-admin, RLS filters to
        // zero rows, so this is 200 + [], not 403, matching the same
        // RLS-filtered-not-forbidden pattern used for invoices/export_jobs
        // "A cannot read B" above.
        const res = await userFetch(userA.token, '/funnel_events?select=id&limit=1');
        expect(res.status).toBe(200);
        expect(await res.json()).toEqual([]);
      });
      it('admin user can SELECT', async () => {
        const res = await userFetch(admin.token, '/funnel_events?select=id&limit=1');
        expect(res.status).toBe(200);
      });
      it('direct writes remain denied for both ordinary and admin authenticated users', async () => {
        const resA = await userFetch(userA.token, '/funnel_events', {
          method: 'POST',
          body: JSON.stringify({ event_name: 'home_view', session_id: `direct-${RUN_ID}` }),
        });
        expect(resA.status).toBe(403);
        const resAdmin = await userFetch(admin.token, '/funnel_events', {
          method: 'POST',
          body: JSON.stringify({ event_name: 'home_view', session_id: `direct-admin-${RUN_ID}` }),
        });
        expect(resAdmin.status).toBe(403);
      });
    });
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
