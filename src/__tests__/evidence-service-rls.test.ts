/**
 * QUANTIS EVIDENCE SERVICE — RLS effective-access integration matrix (PR E5).
 *
 * Mirrors security-rls-effective-access.test.ts's exact, proven pattern
 * (real Supabase-issued JWTs via the local Auth Admin API, real REST
 * calls, not pgTAP grant-checking alone) -- that file's own history this
 * session found and fixed multiple real bugs pgTAP-style checks alone
 * would have missed (is_service_role() silently always-true, etc.), so
 * the same rigor is applied here rather than a lighter-weight test.
 *
 * Requires RUN_RLS_INTEGRATION_TESTS=true + RLS_TEST_SUPABASE_URL/
 * RLS_TEST_ANON_KEY/RLS_TEST_SERVICE_ROLE_KEY/RLS_TEST_PROJECT_REF --
 * skips entirely otherwise, exactly like the P0 file, so normal CI never
 * touches a live database.
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
  return /^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?(\/|$)/.test(url);
}

function guardAgainstProduction(): void {
  if (!TARGET_PROJECT_REF) {
    throw new Error('RLS_TEST_PROJECT_REF is required -- see security-rls-effective-access.test.ts for the full rationale.');
  }
  if (TARGET_PROJECT_REF === PRODUCTION_PROJECT_REF) {
    throw new Error('Refusing to run mutating RLS integration tests against production. Unconditional, no override.');
  }
  if (!isApprovedNonProductionUrl(TARGET_URL)) {
    throw new Error(`RLS_TEST_SUPABASE_URL (${TARGET_URL}) is not an approved non-production target.`);
  }
}

const canRun = RUN && !!TARGET_URL && !!ANON_KEY && !!SERVICE_ROLE_KEY && !!TARGET_PROJECT_REF;
const describeOrSkip = canRun ? describe : describe.skip;

describeOrSkip('Evidence Service RLS integration matrix (staging target required)', () => {
  const REST = `${TARGET_URL}/rest/v1`;
  const AUTH_ADMIN = `${TARGET_URL}/auth/v1/admin`;
  const AUTH = `${TARGET_URL}/auth/v1`;
  const RUN_ID = randomUUID();

  function anonFetch(path: string, init: RequestInit = {}) {
    return fetch(`${REST}${path}`, {
      ...init,
      headers: { apikey: ANON_KEY!, Authorization: `Bearer ${ANON_KEY}`, 'Content-Type': 'application/json', ...(init.headers ?? {}) },
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

  async function adminCreateUser(email: string, password: string): Promise<string> {
    const res = await fetch(`${AUTH_ADMIN}/users`, {
      method: 'POST',
      headers: { apikey: SERVICE_ROLE_KEY!, Authorization: `Bearer ${SERVICE_ROLE_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, email_confirm: true }),
    });
    if (!res.ok) throw new Error(`Failed to create user ${email}: ${res.status} ${await res.text()}`);
    const body = (await res.json()) as { id: string };
    return body.id;
  }

  async function signIn(email: string, password: string): Promise<string> {
    const res = await fetch(`${AUTH}/token?grant_type=password`, {
      method: 'POST',
      headers: { apikey: ANON_KEY!, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) throw new Error(`Failed to sign in as ${email}: ${res.status} ${await res.text()}`);
    const body = (await res.json()) as { access_token: string };
    return body.access_token;
  }

  beforeAll(() => {
    guardAgainstProduction();
  });

  const emailA = `evidence-rls-a-${RUN_ID}@example.invalid`;
  const emailB = `evidence-rls-b-${RUN_ID}@example.invalid`;
  const password = `Test-${RUN_ID}-!Aa1`;

  let userA: { id: string; token: string };
  let userB: { id: string; token: string };
  let analysisIdA: string;
  let analysisIdB: string;
  let packetIdA: string;
  let packetIdB: string;
  const seeded: Record<string, string[]> = { analyses: [], packets: [], sources: [], passages: [], claims: [], observations: [] };

  beforeAll(async () => {
    if (!canRun) return;
    const [idA, idB] = await Promise.all([adminCreateUser(emailA, password), adminCreateUser(emailB, password)]);
    const [tokenA, tokenB] = await Promise.all([signIn(emailA, password), signIn(emailB, password)]);
    userA = { id: idA, token: tokenA };
    userB = { id: idB, token: tokenB };

    const [resA, resB] = await Promise.all([
      serviceFetch('/analyses', {
        method: 'POST',
        body: JSON.stringify({ user_id: userA.id, idea: `EVIDENCE_RLS_TEST_${RUN_ID}`, location: 'test', result: { evidence_rls_test_run_id: RUN_ID } }),
      }),
      serviceFetch('/analyses', {
        method: 'POST',
        body: JSON.stringify({ user_id: userB.id, idea: `EVIDENCE_RLS_TEST_${RUN_ID}`, location: 'test', result: { evidence_rls_test_run_id: RUN_ID } }),
      }),
    ]);
    if (!resA.ok) throw new Error(`Failed to seed analysis A: ${resA.status} ${await resA.text()}`);
    if (!resB.ok) throw new Error(`Failed to seed analysis B: ${resB.status} ${await resB.text()}`);
    const [bodyA, bodyB] = await Promise.all([resA.json(), resB.json()]);
    analysisIdA = bodyA[0].id;
    analysisIdB = bodyB[0].id;
    seeded.analyses = [analysisIdA, analysisIdB];

    const packetPayload = (analysisId: string, userId: string) => ({
      analysis_id: analysisId,
      user_id: userId,
      query_plan_version: '0.1.0',
      provider_set_version: '0.1.0',
      ranking_version: '0.1.0',
      evidence_schema_version: '0.1.0',
      source_lenses: ['OFFICIAL'],
      retrieval_latency_ms: 100,
      content_hash: 'a'.repeat(64),
    });

    const [packetResA, packetResB] = await Promise.all([
      serviceFetch('/evidence_packets', { method: 'POST', body: JSON.stringify(packetPayload(analysisIdA, userA.id)) }),
      serviceFetch('/evidence_packets', { method: 'POST', body: JSON.stringify(packetPayload(analysisIdB, userB.id)) }),
    ]);
    if (!packetResA.ok) throw new Error(`Failed to seed packet A: ${packetResA.status} ${await packetResA.text()}`);
    if (!packetResB.ok) throw new Error(`Failed to seed packet B: ${packetResB.status} ${await packetResB.text()}`);
    const [packetBodyA, packetBodyB] = await Promise.all([packetResA.json(), packetResB.json()]);
    packetIdA = packetBodyA[0].id;
    packetIdB = packetBodyB[0].id;
    seeded.packets = [packetIdA, packetIdB];

    const sourceResA = await serviceFetch('/evidence_sources', {
      method: 'POST',
      body: JSON.stringify({
        analysis_id: analysisIdA,
        user_id: userA.id,
        evidence_packet_id: packetIdA,
        canonical_url: 'https://example.com/a',
        retrieved_at: new Date().toISOString(),
        content_hash: 'b'.repeat(64),
        source_type: 'OTHER',
        primary_status: 'UNKNOWN',
        freshness: 'UNKNOWN',
        storage_policy: 'METADATA_ONLY',
        provider_id: 'tavily',
      }),
    });
    if (!sourceResA.ok) throw new Error(`Failed to seed source A: ${sourceResA.status} ${await sourceResA.text()}`);
    const sourceBodyA = await sourceResA.json();
    seeded.sources = [sourceBodyA[0].id];
  });

  afterAll(async () => {
    if (!canRun) return;
    for (const table of ['evidence_sources', 'evidence_packets', 'analyses']) {
      for (const id of seeded[table === 'analyses' ? 'analyses' : table === 'evidence_packets' ? 'packets' : 'sources'] ?? []) {
        await serviceFetch(`/${table}?id=eq.${id}`, { method: 'DELETE' }).catch(() => {});
      }
    }
    for (const id of [userA?.id, userB?.id].filter(Boolean)) {
      await fetch(`${AUTH_ADMIN}/users/${id}`, {
        method: 'DELETE',
        headers: { apikey: SERVICE_ROLE_KEY!, Authorization: `Bearer ${SERVICE_ROLE_KEY}` },
      }).catch(() => {});
    }
  });

  const EVIDENCE_TABLES = [
    'evidence_requests',
    'evidence_packets',
    'evidence_sources',
    'evidence_passages',
    'evidence_claims',
    'numeric_observations',
    'evidence_evaluations',
  ];

  describe('anonymous access is denied on every evidence table', () => {
    for (const table of EVIDENCE_TABLES) {
      it(`anon SELECT on ${table} is denied`, async () => {
        const res = await anonFetch(`/${table}?select=id&limit=1`);
        expect([401, 403]).toContain(res.status);
      });
      it(`anon INSERT on ${table} is denied`, async () => {
        const res = await anonFetch(`/${table}`, { method: 'POST', body: JSON.stringify({}) });
        expect([401, 403]).toContain(res.status);
      });
      it(`anon UPDATE on ${table} is denied`, async () => {
        const res = await anonFetch(`/${table}?id=eq.${randomUUID()}`, { method: 'PATCH', body: JSON.stringify({}) });
        expect([401, 403, 404]).toContain(res.status);
        expect(res.status).not.toBe(200);
      });
      it(`anon DELETE on ${table} is denied`, async () => {
        const res = await anonFetch(`/${table}?id=eq.${randomUUID()}`, { method: 'DELETE' });
        expect([401, 403, 404]).toContain(res.status);
        expect(res.status).not.toBe(200);
      });
    }
  });

  describe('owner-scoped read access', () => {
    it('user A reads their own evidence_packets row', async () => {
      const res = await userFetch(userA.token, `/evidence_packets?id=eq.${packetIdA}&select=id`);
      const body = await res.json();
      expect(res.status, JSON.stringify(body)).toBe(200);
      expect(body).toHaveLength(1);
    });

    it('user A cannot read user B\'s evidence_packets row (RLS-filtered, not a hard error)', async () => {
      const res = await userFetch(userA.token, `/evidence_packets?id=eq.${packetIdB}&select=id`);
      const body = await res.json();
      expect(res.status, JSON.stringify(body)).toBe(200);
      expect(body).toEqual([]);
    });

    it('user A reads their own evidence_sources row', async () => {
      const res = await userFetch(userA.token, `/evidence_sources?analysis_id=eq.${analysisIdA}&select=id`);
      const body = await res.json();
      expect(res.status, JSON.stringify(body)).toBe(200);
      expect(body.length).toBeGreaterThan(0);
    });

    it('user A cannot see user B\'s evidence_sources via analysis_id filter (cross-analysis, cross-tenant denial)', async () => {
      const res = await userFetch(userA.token, `/evidence_sources?analysis_id=eq.${analysisIdB}&select=id`);
      const body = await res.json();
      expect(res.status, JSON.stringify(body)).toBe(200);
      expect(body).toEqual([]);
    });
  });

  describe('user writes are denied entirely (write path is service-role-only by design)', () => {
    it('user A cannot INSERT into evidence_packets for their own analysis', async () => {
      const res = await userFetch(userA.token, '/evidence_packets', {
        method: 'POST',
        body: JSON.stringify({
          analysis_id: analysisIdA,
          user_id: userA.id,
          query_plan_version: '0.1.0',
          provider_set_version: '0.1.0',
          ranking_version: '0.1.0',
          evidence_schema_version: '0.1.0',
          retrieval_latency_ms: 1,
          content_hash: 'c'.repeat(64),
        }),
      });
      expect(res.status).toBe(403);
    });

    it('user A cannot INSERT into evidence_packets attributed to user B\'s analysis (cross-tenant write)', async () => {
      const res = await userFetch(userA.token, '/evidence_packets', {
        method: 'POST',
        body: JSON.stringify({
          analysis_id: analysisIdB,
          user_id: userB.id,
          query_plan_version: '0.1.0',
          provider_set_version: '0.1.0',
          ranking_version: '0.1.0',
          evidence_schema_version: '0.1.0',
          retrieval_latency_ms: 1,
          content_hash: 'd'.repeat(64),
        }),
      });
      expect(res.status).toBe(403);
    });

    it('user A cannot UPDATE their own evidence_packets row', async () => {
      const res = await userFetch(userA.token, `/evidence_packets?id=eq.${packetIdA}`, {
        method: 'PATCH',
        body: JSON.stringify({ degraded: true }),
      });
      expect(res.status).toBe(403);
    });

    it('user A cannot DELETE their own evidence_packets row', async () => {
      const res = await userFetch(userA.token, `/evidence_packets?id=eq.${packetIdA}`, { method: 'DELETE' });
      expect(res.status).toBe(403);
    });
  });

  describe('service role is explicitly, fully in control', () => {
    it('service role can SELECT across both users\' evidence_packets rows', async () => {
      const res = await serviceFetch(`/evidence_packets?id=in.(${packetIdA},${packetIdB})&select=id`);
      expect(res.status).toBe(200);
      expect((await res.json()).length).toBe(2);
    });

    it('service role can UPDATE an evidence_packets row', async () => {
      const res = await serviceFetch(`/evidence_packets?id=eq.${packetIdA}`, {
        method: 'PATCH',
        body: JSON.stringify({ degraded: true }),
      });
      expect(res.status).toBe(200);
      // Revert for cleanliness of the rest of the suite.
      await serviceFetch(`/evidence_packets?id=eq.${packetIdA}`, { method: 'PATCH', body: JSON.stringify({ degraded: false }) });
    });
  });

  describe('evidence_passages storage-policy trigger guard', () => {
    it('rejects a passage insert for a METADATA_ONLY source (the seeded source A)', async () => {
      const res = await serviceFetch('/evidence_passages', {
        method: 'POST',
        body: JSON.stringify({
          analysis_id: analysisIdA,
          user_id: userA.id,
          evidence_source_id: seeded.sources[0],
          text: 'This should be rejected -- source A is METADATA_ONLY.',
          extracted_at: new Date().toISOString(),
          content_hash: 'e'.repeat(64),
        }),
      });
      expect(res.status).toBeGreaterThanOrEqual(400);
    });

    it('accepts a passage insert for a PASSAGE_ALLOWED source', async () => {
      const allowedSourceRes = await serviceFetch('/evidence_sources', {
        method: 'POST',
        body: JSON.stringify({
          analysis_id: analysisIdA,
          user_id: userA.id,
          evidence_packet_id: packetIdA,
          canonical_url: 'https://example.com/allowed',
          retrieved_at: new Date().toISOString(),
          content_hash: 'f'.repeat(64),
          source_type: 'OTHER',
          primary_status: 'UNKNOWN',
          freshness: 'UNKNOWN',
          storage_policy: 'PASSAGE_ALLOWED',
          provider_id: 'tavily',
        }),
      });
      const allowedSourceBody = await allowedSourceRes.json();
      expect(allowedSourceRes.ok, JSON.stringify(allowedSourceBody)).toBe(true);
      const [allowedSource] = allowedSourceBody;
      seeded.sources.push(allowedSource.id);

      const passageRes = await serviceFetch('/evidence_passages', {
        method: 'POST',
        body: JSON.stringify({
          analysis_id: analysisIdA,
          user_id: userA.id,
          evidence_source_id: allowedSource.id,
          text: 'This should be accepted.',
          extracted_at: new Date().toISOString(),
          content_hash: 'a1'.repeat(32),
        }),
      });
      const passageBody = await passageRes.json();
      expect(passageRes.ok, JSON.stringify(passageBody)).toBe(true);
      const [passage] = passageBody;
      seeded.passages.push(passage.id);
      await serviceFetch(`/evidence_passages?id=eq.${passage.id}`, { method: 'DELETE' }).catch(() => {});
    });
  });
});
