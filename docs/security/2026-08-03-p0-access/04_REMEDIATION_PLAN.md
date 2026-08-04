# Remediation Plan — P0 Effective Access Incident, 2026-08-03

## Approach

One additive migration (`supabase/migrations/20260804000000_p0_access_control_hardening.sql`), built strictly from the per-table matrix in `03_TABLE_ACCESS_MATRIX.csv`, which was itself built from reading the real application code (frontend hooks, edge functions, RPC definitions) rather than assumed from table names. No generic "apply the same policy to all ten tables" shortcut was taken — 3 distinct patterns are used depending on real, confirmed usage:

1. **Service-role-only, zero client access** (`usage_counters`, `analysis_attempts`, `leads`, `quote_gen_usage`, `analysis_cases`) — nothing in the live app calls these directly; RLS/grants reduced to service_role only, with zero functional change to any real workflow.
2. **Owner-scoped, `auth.uid() = user_id`** (`invoices`, `export_jobs`, `shared_reports` management path, `referral_codes` read) — real client code already filters by `user_id` client-side; the fix makes that a real, server-enforced boundary instead of a cosmetic one.
3. **RPC-mediated, base table locked down** (`funnel_events`) — the only legitimate anon/authenticated interaction is through the already-`SECURITY DEFINER` `record_funnel_event` RPC; direct table grants are pure excess and are revoked. A new, real admin-only SELECT policy is added for the `/admin/funnel` dashboard's `funnel_summary_30d` view (a `security_invoker` view, confirmed via its own code comment, so it will correctly inherit this new restriction).

## Incident-scope review (§7 of your instructions)

Pulled the last available window of Supabase API logs (`get_logs`, service `api`). The tool's visible window was dominated by high-frequency legitimate cron traffic (`autoposter_post_platforms` polling every ~60s, lifecycle-email checks) and does not appear to give a clean, queryable 24-hour slice specifically filterable to the 10 affected tables — this is a real tooling limitation, not a claim that nothing happened.

**What was directly observed:** my own canary test requests (GET/PATCH/DELETE against `usage_counters`, GET against `invoices`/`leads`), clearly identifiable by their `WindowsPowerShell/5.1` user-agent and exact timestamps matching this investigation. No other request against any of the 10 affected tables appears in the visible log slice.

**Classification: LOGGING INSUFFICIENT TO DETERMINE.** Not "no evidence found" — the available tooling this session could not perform a targeted historical query broad enough to rule out prior access with confidence. If you need a stronger answer, that requires either a longer log-retention query capability than what this MCP tool surface currently exposes, or a direct request to Supabase support/dashboard log export.

## Migration mechanics

- Fully additive: only drops the 10 specific unsafe policies by exact name (verified to exist first), revokes only the excess grants, and creates new named policies. No table, column, or row is dropped or altered in shape.
- Idempotent: uses `DROP POLICY IF EXISTS` and `CREATE POLICY` (not `CREATE OR REPLACE`, since policies don't support that syntax — the drop-then-create pair is the standard idempotent pattern) and `REVOKE ... IF EXISTS`-equivalent behavior (Postgres `REVOKE` is a no-op if the privilege isn't held, so it's safe to run twice).
- `TRUNCATE` is revoked from `anon`/`authenticated` on every one of the 10 tables, with no exception — no legitimate workflow anywhere in the app needs it, and it is explicitly called out as never-acceptable in your instructions.
- One new admin-scoped SELECT policy is added on `funnel_events` (not previously present in any form) to make the `/admin/funnel` dashboard's existing "admin-only" comment actually true.

## Explicitly NOT in scope for this migration

- No changes to `subscriptions`, `analyses`, `profiles`, or any table outside the 10 named in the incident.
- No changes to the already-hardened `SECURITY DEFINER` RPCs (they don't need it — confirmed via `pg_proc.prosecdef`).
- No Sentry, no GTM work, no scenario/report-integrity work (P1, deliberately deferred per your priority order), no unrelated refactors.

## Risk of applying vs. not applying

- **Risk of applying:** low. Every direct-client access pattern found in the real code (`invoices`, `export_jobs`, `referral_codes` own-row reads, `record_funnel_event` RPC) is preserved by the new owner-scoped/RPC-mediated policies. The one new behavior is that unrelated users can no longer see each other's rows or a stranger's usage counters — this is a pure risk reduction, not a feature change. The main residual risk is if some workflow this investigation didn't find depends on the broad grants; the automated test plan (`05` below is the rollback, tests are in `src/__tests__/security-rls-effective-access.test.ts`) is designed to catch that before deployment via a staging/canary run, not discover it in production.
- **Risk of not applying:** the confirmed, live, unauthenticated read/write/delete access described in `00_EXECUTIVE_SUMMARY.md` and `02_EFFECTIVE_ACCESS_RESULTS.md` continues indefinitely.
