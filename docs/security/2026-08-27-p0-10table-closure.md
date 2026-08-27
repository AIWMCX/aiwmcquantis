# P0 10-table effective-access incident — closure record

Written 2026-08-27, closing the PR #26 investigation thread per the
explicit standard: proving effective access (grants + policies + a real
role-switched query), not just reading `pg_policies` definitions.

## 1. Provenance

| Item | Value |
|---|---|
| Original finding | PR #26 opened 2026-08-04T02:20:55Z (`security/p0-effective-access-control`), citing a canary test dated 2026-08-03 |
| Fixing migration | `supabase/migrations/20260816010000_p0_10table_exposure_fix.sql` |
| Fixing commit | `321c026a2588e75f42484a851f749859e6b1b2c7` |
| Merged via | PR #32, "security(P0): close 10-table effective-access exposure (extracted from PR #26, ALREADY APPLIED to production)" |
| Deployed timestamp | 2026-08-16T23:02:01Z |
| Regression gate | PR #101, `scripts/check-p0-10table-regression.ts` + `.github/workflows/p0-10table-regression-check.yml` + `supabase/tests/database/p0_10table_exposure_regression.test.sql` |
| PR #26 disposition | Closed as superseded (already closed prior to this session; reconciliation comment posted 2026-08-27 linking #32 and #101) |

**Drift, not migration history.** Every dangerous `*_svc`/`*_self`
`USING(true) FOR ALL TO {public}` policy on all 10 tables was grepped
against the full `supabase/migrations/` history: zero hits before the fix
migration itself. These policies were never created by a committed
migration — they existed only as production drift. Two consequences:

- A fresh-environment replay of migration history (`supabase db reset`)
  would **never reproduce** the vulnerability — it only ever existed in
  the live production database, not in repo history.
- Git history cannot date when the exposure began. The earliest
  **confirmed** vulnerable point is PR #26's own 2026-08-03 canary test
  against live production; anything earlier is unknown and unknowable
  from source control alone.

## 2. Ten-table matrix

| Table | Ops affected | Previous grants (anon) | Previous policy | Current grants (anon) | Current policy | Fixing migration | Deployed | Regression test |
|---|---|---|---|---|---|---|---|---|
| `analysis_attempts` | SELECT/INSERT/UPDATE/DELETE | Full CRUD | `analysis_attempts_self`, `USING(true)` to `{public}` | None | `service_role`-only | `20260816010000` | 2026-08-16T23:02:01Z | `check-p0-10table-regression.ts`, pgTAP Part 1/2/5 |
| `leads` | SELECT/INSERT/UPDATE/DELETE | Full CRUD | `leads_svc`, `USING(true)` to `{public}` | None | `service_role`-only | same | same | same |
| `analysis_cases` | SELECT/INSERT/UPDATE/DELETE | Full CRUD | `analysis_cases_svc`, `USING(true)` to `{public}` | None | `service_role`-only | same | same | same |
| `usage_counters` | SELECT/INSERT/UPDATE/DELETE | Full CRUD | `usage_counters_self`, `USING(true)` to `{public}` (+ a correct owner SELECT policy, rendered moot by the OR'd permissive one) | None (authenticated: SELECT only) | Owner SELECT (`identity_key`) + `service_role`-only write | same | same | same |
| `quote_gen_usage` | SELECT/INSERT/UPDATE/DELETE | Full CRUD | `quote_gen_usage_svc`, same pattern | None (authenticated: SELECT only) | Owner SELECT (`user_id`) + `service_role`-only write | same | same | same |
| `export_jobs` | SELECT/INSERT/UPDATE/DELETE | Full CRUD | `export_jobs_svc`, same pattern | None (authenticated: SELECT/INSERT/UPDATE) | Owner select/insert/update (`user_id`) + `service_role`-only | same | same | same |
| `invoices` | SELECT/INSERT/UPDATE/DELETE | Full CRUD | `invoices_svc`, same pattern | None (authenticated: SELECT/INSERT/UPDATE) | Owner select/insert/update (`user_id`) + `service_role`-only | same | same | pgTAP Part 3/4 (real anon exploit attempt + cross-user isolation) |
| `shared_reports` | SELECT/INSERT/UPDATE/DELETE | Full CRUD | `shared_reports_svc`, same pattern | None (authenticated: full CRUD) | Owner ALL (`user_id`) + `service_role`-only | same | same | same |
| `referral_codes` | SELECT/INSERT/UPDATE/DELETE | Full CRUD | `referral_codes_svc`, same pattern | None (authenticated: SELECT) | Owner SELECT (`user_id`) + `service_role`-only (mutation via SECURITY DEFINER RPCs) | same | same | same |
| `funnel_events` | SELECT/INSERT/UPDATE/DELETE | Full CRUD | `funnel_events_svc`, same pattern | None (authenticated: SELECT, admin-only) | Admin-only SELECT (`has_role`) + `service_role`-only | same | same | same |

## 3. Live black-box test results (this session, 2026-08-27)

Run via `SET LOCAL ROLE anon` inside a Postgres transaction against
**production** — the real RLS/grant engine, not a static read of
`pg_policies`. This is equivalent to going through PostgREST with the
public anon key (grant-layer denials happen before RLS is even
evaluated), without leaving the sandboxed tool environment (a direct
`curl` against the REST API was attempted first and blocked by the
session's own network-egress classifier).

| Table | anon SELECT | anon DELETE (0-row predicate, transaction rolled back) |
|---|---|---|
| analysis_attempts | DENIED — `42501 permission denied` | DENIED — `42501` |
| leads | DENIED — `42501` | DENIED — `42501` |
| analysis_cases | DENIED — `42501` | DENIED — `42501` |
| usage_counters | DENIED — `42501` | DENIED — `42501` |
| quote_gen_usage | DENIED — `42501` | DENIED — `42501` |
| export_jobs | DENIED — `42501` | DENIED — `42501` |
| invoices | DENIED — `42501` | DENIED — `42501` |
| shared_reports | DENIED — `42501` | DENIED — `42501` |
| referral_codes | DENIED — `42501` | DENIED — `42501` |
| funnel_events | DENIED — `42501` | DENIED — `42501` |

Additionally verified live:
- `has_table_privilege()` cross-tab for `anon`/`authenticated`/`service_role`
  on all 10 tables matches the fix migration's intent exactly (no drift
  since 2026-08-16).
- `pg_policies` for all 10 tables: zero `USING(true)` policies granted to
  `{public}`/`anon`/`authenticated`; every remaining policy is
  `service_role`-only or scoped to `auth.uid()`/`identity_key`.
- `check-p0-10table-regression.ts`'s exact gate SQL run live via
  `execute_sql`: **zero findings** before merging PR #101.

**Not run this session** (scope/time): the full six-identity matrix
(different-authenticated-user cross-table, unauthorized team member,
bulk/filter operations, related views/RPCs) for all 10 tables and all
four operations. PR #26's own (unmerged) branch claimed to have built
this via the Auth Admin API; it was not independently re-verified. The
pgTAP suite in PR #101 covers owner-vs-different-user isolation for
`invoices` as a representative case (Part 4), and anon denial for all 10
tables via both static privilege lookup and a real thrown-error query
(Part 1/3). Extending the pgTAP suite to the remaining 9 tables'
owner/non-owner cases is flagged as follow-on work, not fabricated as done.

## 4. Incident impact assessment

- **What was exposed**: `SELECT`/`INSERT`/`UPDATE`/`DELETE` via the public
  anon key on `analysis_attempts`, `leads`, `analysis_cases`,
  `usage_counters`, `quote_gen_usage`, `export_jobs`, `invoices`,
  `shared_reports`, `referral_codes`, `funnel_events` — i.e. lead contact
  data, invoices/billing records, usage/quota counters, export job
  records, shared-report rows, and referral codes were all readable and
  writable by anyone with only the public anon key, no authentication
  required.
- **Duration**: earliest *confirmed* vulnerable point is 2026-08-03 (PR
  #26's canary test); fixed 2026-08-16T23:02:01Z. Confirmed exposure
  window is **at least 13 days**; true origin is unknown (drift-only, no
  migration history — see §1).
- **Logs / exploitation evidence**: `query_logs` (Supabase's unified log
  API) returned a backend error on every attempt this session, for both
  a recent 24h window and the original incident window — could not be
  used to check for anomalous anon read/write activity during the
  exposure period. Independent of that tool failure, today is
  2026-08-27, 11 days past the fix and ~24 days past the earliest
  confirmed exposure — well past typical log retention on this project
  tier, so even a working query would likely show nothing from the
  actual incident window.
- **Conclusion — explicitly not "no exploitation occurred."** No evidence
  of exploitation was found, but no evidence was actually available to
  search, because the logging tool did not function and the retention
  window has very likely already passed regardless. This is a visibility
  gap, not a clean bill of health. Confidence in "no exploitation
  happened" is **low**, not high.
- **Rotation / reconciliation**: no credentials, tokens, or session
  secrets are stored in any of the 10 tables' schemas (checked column
  lists) — nothing to rotate on that basis. `invoices`/`shared_reports`
  contain customer-identifying and billing-adjacent data; no data-
  integrity anomaly (unexpected rows, tampered totals) was found in a
  cursory review, but no systematic reconciliation sweep of these 10
  tables' row counts/checksums against known-good baselines was run this
  session.
- **Legal/privacy/customer-notification**: not assessed here — this is a
  judgment call requiring the business owner's input given the
  visibility gap above (we cannot rule out exploitation, only say none
  was found in the — largely unavailable — evidence). Flagged as an open
  decision, not resolved by this session.

## 5. What's still open

1. Full six-identity black-box matrix across all 10 tables/all operations
   (only a representative subset was live-tested this session).
2. `increment_quote_gen_usage()` / `decrement_quote_gen_usage()` —
   `SECURITY DEFINER` functions with a live anon/authenticated EXECUTE
   grant, found via `get_advisors` this session. Separate from this
   incident's proven boundary; scoped to the 88-table/function audit
   (§6 of the original ask), not fixed here.
3. Legal/privacy/customer-notification decision (§4).
4. `query_logs` tool failure — worth a retry with Supabase support if
   forensic log access is ever needed again.
5. Extending `p0_10table_exposure_regression.test.sql`'s owner/non-owner
   pgTAP coverage from `invoices` (done) to the other 9 owner-scoped
   tables.
