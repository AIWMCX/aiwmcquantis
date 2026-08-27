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

1. `api_keys` — not yet individually re-audited this session (RLS
   enabled, forced, 7 policies; not inspected in detail).
2. `invoices` — audited in Phase 1 (owner-scoped, correct).
3. `subscriptions` — RLS enabled, forced, 7 policies; not yet individually
   re-audited.
4. `analyses` — RLS enabled, forced, 12 policies; not yet individually
   re-audited.
5. `profiles` — RLS enabled, forced, 9 policies; not yet individually
   re-audited.
6. leads/outreach — `leads` itself was Phase 1's scope (service-only,
   correct); no separate "outreach" table found in this inventory.
7. reports/exports — `export_jobs`, `shared_reports`,
   `document_exports`, `document_downloads` all present, grants already
   look reduced/correct at a glance; not individually re-audited in
   depth.
8. usage/entitlements — `usage_counters`, `usage_tracking`,
   `plan_entitlements`, `idea_generation_usage`, `quote_gen_usage` present;
   `plan_entitlements` checked (finding 1), others not yet in depth.

**This is a first installment, not Phase 2's completion.** The charter
itself estimates 1-3 days for this phase; this pass produced the
inventory and closed out the two items that actually needed judgment
calls (the one wide-open policy, and confirming the policy-less-8 list).
The remaining per-table deep review (`api_keys` through the rest of the
priority list) and the dynamic-test/CI-gate/exceptions-register
deliverables remain open.
