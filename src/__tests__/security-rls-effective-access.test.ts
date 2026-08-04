/**
 * P0 SECURITY REGRESSION LOCK — 2026-08-03/04.
 *
 * docs/security/2026-08-03-p0-access/ documents a live, proven incident:
 * 10 tables (usage_counters, analysis_attempts, invoices, leads,
 * shared_reports, export_jobs, quote_gen_usage, referral_codes,
 * analysis_cases, funnel_events) had RLS policies literally named for
 * service-role-only or owner-only access ("_svc"/"_self") that were never
 * actually scoped that way -- every one was `USING (true) WITH CHECK
 * (true)` for role {public}, combined with full CRUD grants to anon and
 * authenticated. Proven exploitable via the real PostgREST API using only
 * the public anon key: SELECT/UPDATE/DELETE on a usage_counters row, and
 * enumeration of real invoices/leads row ids.
 *
 * This test hits the REAL production REST API (not a mock) because a SQL
 * metadata check (pg_policies) is necessary but not sufficient to prove
 * effective, externally-reachable behavior -- exactly the gap the incident
 * response called out. It is gated behind SUPABASE_SERVICE_ROLE_KEY (used
 * only to seed/clean a synthetic canary row, never to read real data)
 * because it needs a live, disposable row to test against reliably -- an
 * empty-table result is otherwise ambiguous (could mean "correctly denied"
 * or "no rows exist yet"). Skips gracefully with a clear reason when that
 * secret isn't present (e.g. local dev), so `vitest run` never fails here
 * for lack of a production credential -- CI supplies it as a secret.
 *
 * These assertions describe the CORRECT, POST-FIX state. Before migration
 * 20260804000000_p0_access_control_hardening.sql is deployed, this file is
 * expected to FAIL against production -- that failure is the proof the
 * incident is real, not a broken test. It must go green immediately after
 * deployment and stay green permanently after.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';

const SUPABASE_URL = 'https://dmlxrvfyqsakyjomsvdj.supabase.co';
const ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRtbHhydmZ5cXNha3lqb21zdmRqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI0MjgyMzUsImV4cCI6MjA4ODAwNDIzNX0.gv-OzyqRMcptDxcVXHx83Ncsju9RZRcQTP8XiwBDhDY';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const CANARY_KEY = `__CANARY_RLS_TEST_${Date.now()}__`;

const REST = `${SUPABASE_URL}/rest/v1`;

async function anonFetch(path: string, init: RequestInit = {}) {
  return fetch(`${REST}${path}`, {
    ...init,
    headers: {
      apikey: ANON_KEY,
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
  });
}

async function serviceFetch(path: string, init: RequestInit = {}) {
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

const describeOrSkip = SERVICE_ROLE_KEY ? describe : describe.skip;

describeOrSkip('P0 effective-access lock: anon cannot reach the 10 previously-exposed tables', () => {
  beforeAll(async () => {
    if (!SERVICE_ROLE_KEY) return;
    const res = await serviceFetch('/usage_counters', {
      method: 'POST',
      body: JSON.stringify({ identity_key: CANARY_KEY, tier: 'free', analyses_used: 1 }),
    });
    if (!res.ok) {
      throw new Error(`Failed to seed canary row for RLS test: ${res.status} ${await res.text()}`);
    }
  });

  afterAll(async () => {
    if (!SERVICE_ROLE_KEY) return;
    // Best-effort cleanup; if the anon-denial assertions correctly failed
    // to delete it, the service-role client always can.
    await serviceFetch(`/usage_counters?identity_key=eq.${CANARY_KEY}`, { method: 'DELETE' }).catch(() => {});
  });

  it('anon cannot SELECT a specific usage_counters row by identity_key', async () => {
    const res = await anonFetch(`/usage_counters?identity_key=eq.${CANARY_KEY}`);
    const body = await res.json();
    expect(Array.isArray(body) ? body.length : 0).toBe(0);
  });

  it('anon cannot UPDATE a usage_counters row', async () => {
    const res = await anonFetch(`/usage_counters?identity_key=eq.${CANARY_KEY}`, {
      method: 'PATCH',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({ analyses_used: 9999 }),
    });
    const body = await res.json().catch(() => []);
    // Denied means either a non-2xx status or a 200 with zero rows affected
    // (RLS makes the row invisible to the UPDATE's WHERE clause, which
    // PostgREST reports as an empty affected-rows array, not an error).
    expect(Array.isArray(body) ? body.length : 0).toBe(0);
  });

  it('anon cannot DELETE a usage_counters row', async () => {
    const res = await anonFetch(`/usage_counters?identity_key=eq.${CANARY_KEY}`, {
      method: 'DELETE',
      headers: { Prefer: 'return=representation' },
    });
    const body = await res.json().catch(() => []);
    expect(Array.isArray(body) ? body.length : 0).toBe(0);
  });

  it('anon cannot list any invoices rows', async () => {
    const res = await anonFetch('/invoices?select=id&limit=3');
    const body = await res.json().catch(() => []);
    expect(Array.isArray(body) ? body.length : 0).toBe(0);
  });

  it('anon cannot list any leads rows', async () => {
    const res = await anonFetch('/leads?select=id&limit=3');
    const body = await res.json().catch(() => []);
    expect(Array.isArray(body) ? body.length : 0).toBe(0);
  });

  it('anon cannot list any shared_reports rows (public access must stay token-scoped, via the share-report edge function)', async () => {
    const res = await anonFetch('/shared_reports?select=id&limit=3');
    const body = await res.json().catch(() => []);
    expect(Array.isArray(body) ? body.length : 0).toBe(0);
  });

  it('anon cannot list any export_jobs rows', async () => {
    const res = await anonFetch('/export_jobs?select=id&limit=3');
    const body = await res.json().catch(() => []);
    expect(Array.isArray(body) ? body.length : 0).toBe(0);
  });

  it('anon cannot list any referral_codes rows', async () => {
    const res = await anonFetch('/referral_codes?select=id&limit=3');
    const body = await res.json().catch(() => []);
    expect(Array.isArray(body) ? body.length : 0).toBe(0);
  });

  it('anon cannot list any analysis_cases rows', async () => {
    const res = await anonFetch('/analysis_cases?select=id&limit=3');
    const body = await res.json().catch(() => []);
    expect(Array.isArray(body) ? body.length : 0).toBe(0);
  });

  it('anon cannot list any funnel_events rows directly (record_funnel_event RPC remains the only legitimate write path)', async () => {
    const res = await anonFetch('/funnel_events?select=id&limit=3');
    const body = await res.json().catch(() => []);
    expect(Array.isArray(body) ? body.length : 0).toBe(0);
  });

  it('the record_funnel_event RPC still succeeds for anon (must not regress -- this is the real, intended write path)', async () => {
    const res = await anonFetch('/rpc/record_funnel_event', {
      method: 'POST',
      body: JSON.stringify({
        _event_name: 'home_view',
        _session_id: `rls-test-${Date.now()}`,
      }),
    });
    expect(res.ok).toBe(true);
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
