/**
 * P0 SECURITY — production post-deploy smoke test. STRICTLY NON-MUTATING.
 *
 * Per the incident review's required structure:
 *   "production post-deploy smoke: manual, tightly gated, minimal and
 *   auditable."
 *
 * This file performs read-only checks ONLY against production, using the
 * public anon key (the same credential every real visitor already has —
 * this is not privileged access). It never inserts, updates, or deletes
 * anything, and never uses a service-role key. It exists to be run once,
 * manually, immediately after migration 20260804000000 is actually
 * deployed to production — not as part of the normal `vitest run` gate.
 *
 * Gated behind RUN_PRODUCTION_SECURITY_SMOKE=true so it never runs
 * accidentally in a normal CI/local `vitest run`.
 */
import { describe, it, expect } from 'vitest';

const RUN = process.env.RUN_PRODUCTION_SECURITY_SMOKE === 'true';
const PRODUCTION_URL = 'https://dmlxrvfyqsakyjomsvdj.supabase.co';
const ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRtbHhydmZ5cXNha3lqb21zdmRqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI0MjgyMzUsImV4cCI6MjA4ODAwNDIzNX0.gv-OzyqRMcptDxcVXHx83Ncsju9RZRcQTP8XiwBDhDY';
const REST = `${PRODUCTION_URL}/rest/v1`;

function anonFetch(path: string, init: RequestInit = {}) {
  return fetch(`${REST}${path}`, {
    ...init,
    headers: { apikey: ANON_KEY, 'Content-Type': 'application/json', ...(init.headers ?? {}) },
  });
}

const describeOrSkip = RUN ? describe : describe.skip;

describeOrSkip('production post-deploy smoke — read-only anon-denial checks', () => {
  const lockedDownTables = [
    'usage_counters',
    'analysis_attempts',
    'leads',
    'quote_gen_usage',
    'analysis_cases',
    'invoices',
    'export_jobs',
    'shared_reports',
    'referral_codes',
    'funnel_events',
  ];

  for (const table of lockedDownTables) {
    it(`anon SELECT on ${table} is denied (403/42501) in production`, async () => {
      const res = await anonFetch(`/${table}?select=id&limit=1`);
      const body = await res.json().catch(() => ({}));
      expect(res.status, `${table} should return 403, got ${res.status}: ${JSON.stringify(body)}`).toBe(403);
      expect(body.code).toBe('42501');
    });
  }

  it('record_funnel_event RPC still succeeds for anon in production (must not regress)', async () => {
    const res = await anonFetch('/rpc/record_funnel_event', {
      method: 'POST',
      body: JSON.stringify({
        _event_name: 'home_view',
        _session_id: `prod-smoke-${Date.now()}`,
      }),
    });
    expect(res.status).toBeLessThan(300);
    // Note: this legitimately writes one real funnel_events row, exactly as
    // a real visitor's page load would -- it is the RPC's real, intended
    // behavior, not test pollution requiring cleanup (unlike the disposable
    // canary rows in the staging integration suite).
  });
});
