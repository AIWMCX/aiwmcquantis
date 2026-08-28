# Phase 2 — 88-table audit: canonical inventory (2.1)

Live-exported 2026-08-27 via `information_schema.role_table_grants` +
`pg_class` + `pg_policies`, scoped to every `public` schema table carrying
any `anon`/`authenticated` grant. **78 tables matched this query**, not 88
— the charter's "88" figure predates this session and may include views,
already-fully-revoked tables (zero client grant, so excluded here by
design), or a different snapshot in time. Treat 78 as the current ground
truth for this query's exact scope; reconcile the discrepancy if the "88"
figure resurfaces from another source.

## Method

```sql
SELECT c.relname, c.relrowsecurity, c.relforcerowsecurity,
  string_agg(DISTINCT grantee||':'||privilege_type, ', ') AS client_grants,
  (SELECT count(*) FROM pg_policies WHERE tablename=c.relname) AS policy_count,
  (SELECT count(*) FROM pg_policies WHERE tablename=c.relname
     AND qual='true' AND permissive='PERMISSIVE' AND roles @> ARRAY['public']) AS wide_open_policy_count
FROM pg_class c ... WHERE relkind IN ('r','p')
GROUP BY ... HAVING client_grants IS NOT NULL;
```

## Headline findings (static pass, 2.5-2.9)

1. **Zero tables have an unreviewed wide-open policy.** Exactly one table
   (`plan_entitlements`) has `qual='true'` on a `{public}` policy — checked
   individually per charter 2.6 ("do not automatically reject"): it's a
   `SELECT`-only policy over plan/pricing tier reference data, paired with
   a correctly-scoped `service_role`-only write policy
   (`auth.role() = 'service_role'`). **Confirmed benign, intentional public
   read.** No other table in the 78 has this pattern — the 10-table
   incident's exact signature (permissive `FOR ALL` to `{public}`) does not
   recur anywhere else in the current schema.

2. **8 tables have `policy_count = 0` while `rls_enabled = true`**:
   `accuracy_runs`, `calibration_metrics`, `dataset_releases`,
   `golden_test_vectors`, `metric_formula_registry`, `pending_plan_grants`,
   `rvce_observations`, `self_learning_runs`. This is Phase 3's exact list,
   confirmed via live query rather than carried forward from memory — RLS
   enabled with zero policies means Postgres denies every operation to
   every non-superuser role by default (fail-closed, not a gap). Phase 3
   still needs to confirm each has a real intended server-only caller (its
   own charter items 3.1-3.7), not just that the deny-by-default is
   structurally correct.

3. **The raw table-level GRANT column is broad on ~60 of the 78 tables**
   (`anon`/`authenticated` hold nominal SELECT/INSERT/UPDATE/DELETE/
   TRUNCATE/REFERENCES/TRIGGER at the GRANT layer) — this is expected and
   not itself a finding: Postgres RLS with zero matching policies denies
   the operation regardless of the underlying GRANT (this is the same
   "GRANT-exposed ≠ RLS-broken" distinction this session already
   established earlier). What matters is whether a matching PERMISSIVE
   policy exists that's broader than intended — checked in finding 1 above
   and comes back clean.

4. **Reduced-grant tables (grant already scoped below full CRUD) — the
   pattern the 10-table fix produced**: `export_jobs`, `funnel_events`,
   `invoices`, `quote_gen_usage`, `referral_codes`, `referral_conversions`,
   `referral_rewards`, `shared_reports`, `usage_counters`,
   `user_engagement`, `user_notifications`, `user_realism_feedback`,
   `activation_events`, `gsc_verification` — these already show the
   post-remediation grant shape (no anon at all, authenticated limited to
   specific verbs). Consistent with what Phase 1 already closed plus
   pre-existing correctly-scoped tables.

## Additional findings — sensitive non-priority-list tables

Checked `autoposter_credentials`, `stripe_webhook_events`,
`security_logs`, `api_request_logs` (secrets/audit-adjacent, not on the
charter's named priority list but sensitive by nature):

- `stripe_webhook_events`, `security_logs`, `api_request_logs` — **all
  clean**. Explicit `anon`-deny, `service_role`-only or owner-scoped
  access, `security_logs` additionally denies `authenticated` entirely
  (write-only audit trail, no client read path at all — correct for an
  audit log).
- `autoposter_credentials` — **minor finding, not critical.** An
  `admin_all` policy grants full CRUD to any user holding `admin` OR
  `content_admin` role, with no scoping to "credentials this admin
  manages" — any content_admin can see every connected social account
  across the whole system, not just ones they set up. Checked the
  table's actual columns before rating severity: it stores
  `access_token_secret_id`/`refresh_token_secret_id` as **vault
  reference UUIDs**, not raw token values — the real OAuth secret
  requires separate, presumably service-role-only, vault decryption.
  So the exposure is account metadata (platform, page/account ID,
  active status, last-tested time) and a reference id, not the
  credential itself. Recorded as a candidate for the exceptions
  register or a narrower policy (e.g. scope non-admin `content_admin`
  to read-only, or to accounts they created) — **not fixed in this
  pass**, per the charter's "no scope creep per batch" discipline;
  flag for a dedicated small PR if the founder wants it tightened.

## Not yet done (honest gap, not claimed complete)

- Per-table intended-access classification (2.2) as a structured
  register column — this doc identifies the two real findings but does
  not yet produce the full 78-row classification table charter 2.1-2.4
  calls for.
- Views/materialized views/RPC functions/storage policies/triggers
  audit (2.10) beyond the one `analysis_health` view already checked in
  Phase 1.
- Dynamic pgTAP allow/deny suite by category (2.11-2.12) — Phase 1's
  suite covers exactly the 10 incident tables, not the other ~68.
- CI gate for new-migration access classification (2.13).
- Exceptions register (2.14) — `plan_entitlements` (this doc) and the
  benchmark_master_* / industry_benchmarks / public_metrics tables
  (established earlier this session as legitimate public reference data)
  are the known entries; not yet compiled as a standalone register.

## Priority order per charter 2.4 — status

1. `api_keys` — **Checked, clean.** Explicit `anon`-deny (`false`) on
   every command; owner-scoped SELECT/UPDATE/DELETE via `auth.uid() =
   user_id`; INSERT gated on `verify_plus_subscription()` /
   `verify_pro_subscription()` (two policies, one per paid tier, both
   still owner-scoped); `service_role` bypass via `is_service_role()`.
   UPDATE has `with_check=null` but Postgres inherits the `USING` clause
   as the check when `WITH CHECK` is omitted — re-verified this is real
   Postgres behavior (not an oversight), so ownership reassignment
   (`user_id` to someone else) is still correctly blocked: the new row
   would fail `auth.uid() = user_id` on the post-update value.
2. `invoices` — audited in Phase 1 (owner-scoped, correct).
3. `subscriptions` — **Checked, clean.** `anon` denied on every command;
   `authenticated` SELECT-only, owner-scoped; all mutation gated behind
   `is_service_role()` (billing writes are server/webhook-only by
   design, which is correct — a client should never directly write its
   own subscription state). Two near-duplicate anon-SELECT-deny policies
   found (redundant, not a bug).
4. `analyses` — **Checked, clean.** `anon` denied on every command;
   owner-scoped via `auth.uid() = user_id` for SELECT/INSERT/DELETE;
   UPDATE has an explicit `WITH CHECK` re-stating the same condition
   (belt-and-suspenders, not relying on inheritance here); team-sharing
   SELECT via `is_team_member()`, verified against `team_members`'
   actual schema (finding below) rather than assumed correct; INSERT/
   UPDATE/DELETE additionally gated on `NOT is_in_readonly_window()` (a
   business-logic freeze window, layered on top of the security check,
   not a bypass of it).
5. `profiles` — **Checked, clean.** Identical shape to `api_keys`: explicit
   `anon`-deny per command, `auth.uid() = id` owner-scoping on all four
   operations.
6. leads/outreach — `leads` itself was Phase 1's scope (service-only,
   correct); no separate "outreach" table found in this inventory.
7. reports/exports — `export_jobs`, `shared_reports` covered in Phase 1.
   `document_exports`/`document_downloads` **checked, clean but a
   softer pattern**: owner-scoped policies target role `{public}` (not
   `{authenticated}`) with no explicit `anon`-deny policy — safety
   relies on `auth.uid()` returning `NULL` for unauthenticated requests
   (so `user_id = auth.uid()` never matches), rather than an explicit
   `false` denial like `api_keys`/`profiles`/`subscriptions`/`analyses`
   use. Functionally equivalent as long as `auth.uid()` can't be forged
   by `anon` (it can't — it reads the JWT's own `sub` claim, which the
   anon key has none of), but worth flagging as a less-defensive style
   inconsistency, not a vulnerability. `document_exports` additionally
   has an owner-scoped UPDATE with an explicit `WITH CHECK` (no
   ownership-transfer gap).
8. usage/entitlements — `plan_entitlements` checked (finding 1).
   `usage_tracking` and `idea_generation_usage` **checked, clean**:
   explicit `anon`-deny on `usage_tracking` (two near-duplicate deny
   policies, redundant not buggy), owner-scoped SELECT/INSERT/UPDATE via
   `auth.uid() = user_id`, `service_role` bypass via `is_service_role()`
   on `usage_tracking` and a plain `true`-to-`service_role`-only policy
   on `idea_generation_usage` (role-restricted, not `{public}`, so
   safe despite the bare `true` qual). `usage_counters`/`quote_gen_usage`
   already covered in Phase 1.

### Finding: `is_team_member()` correctly reflects live membership

`analyses`' team-sharing policy calls `public.is_team_member(auth.uid(),
team_id)`, defined as `SELECT EXISTS (SELECT 1 FROM team_members WHERE
user_id=_user_id AND team_id=_team_id)`. Checked `team_members`' actual
columns (`id, team_id, user_id, role, invited_by, joined_at`) — there is
**no status/revoked flag**, meaning membership is a pure row-presence
model: removing someone from a team deletes their row, which
immediately flips this `EXISTS` check to false. Charter 2.8's "revoked
membership behavior" concern is satisfied by the data model itself, not
by an application-level check that could be forgotten — confirmed via
live schema inspection, not assumed.

**This is a first installment, not Phase 2's completion.** The charter
itself estimates 1-3 days for this phase; this pass produced the
inventory and closed out the two items that actually needed judgment
calls (the one wide-open policy, and confirming the policy-less-8 list).
The remaining per-table deep review (`api_keys` through the rest of the
priority list) and the dynamic-test/CI-gate/exceptions-register
deliverables remain open.
