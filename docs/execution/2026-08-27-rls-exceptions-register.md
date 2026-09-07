# RLS exceptions register (charter 2.14)

Every table/policy in the schema where `anon` and/or `authenticated`
can read or write rows **without** per-row owner/team/admin scoping —
i.e. every legitimate exception to "a client role should only ever see
its own data." Each entry states the business justification and how it
was verified. This is the allowlist `scripts/check-rls-access-drift.ts`
(added alongside this register) checks new findings against — a policy
matching this list is expected and passes; anything NOT on this list is
a new, unreviewed exception and fails CI.

Compiled from the Phase 2 audit (`docs/execution/2026-08-27-
phase2-88table-inventory.md`) and this session's earlier security work.

| # | Table | Policy | Access | Business justification | Verified |
|---|---|---|---|---|---|
| 1 | `benchmark_master_core` | `Public read access` | `anon`+`authenticated` SELECT, `qual=true` | Public benchmark-library reference data — the product's core value proposition is showing this data to prospects/free users pre-signup. No per-user scoping possible or desired. | Phase 2 static review, 2026-08-27 |
| 2 | `benchmark_master_geo` | `Public read access` | same | same | same |
| 3 | `benchmark_master_invoice` | `Public read access` | same | same | same |
| 4 | `benchmark_master_risk` | `Public read access` | same | same | same |
| 5 | `benchmark_master_unit_econ` | `Public read access` | same | same | same |
| 6 | `data_provenance` | `data_provenance public read` | `anon`+`authenticated` SELECT, `qual=true` | Metadata about where benchmark data came from — public by the same logic as the benchmark tables themselves; no row is user-specific. | Phase 2 static review, 2026-08-27 |
| 7 | `public_metrics` | `public_metrics_read_all` | `anon`+`authenticated` SELECT, `qual=true` | Public marketing counters (e.g. "N analyses run") shown on the homepage before signup. | Phase 2 static review, 2026-08-27 |
| 8 | `plan_entitlements` | `plan_entitlements public read` | `anon`+`authenticated` SELECT, `qual=true` | Plan/pricing-tier feature matrix — must be readable pre-signup to render the pricing page. Paired with a `service_role`-only write policy (`auth.role() = 'service_role'`), individually confirmed correct. | Phase 2 static review, 2026-08-27 (individually checked, see inventory doc finding 1) |
| 9 | `self_learned_priors` | `self_learned_priors_read_authenticated` | `authenticated` SELECT, `qual=true` | Aggregate ML calibration data (industry/business_model/metric priors) — confirmed via schema inspection to have **no `user_id` column and no PII**; same category as the benchmark tables, gated to `authenticated` only (not `anon`) since it's a paid-feature input, not marketing content. | Phase 2 static review, 2026-08-27 (individually checked) |
| 10 | `doc_templates` | `doc_templates_public_read` | `public` SELECT, `qual=(is_active = true)` | Document-generation template catalog — scoped to `is_active` (not the whole table, including any draft/retired templates), a real condition rather than a blanket `true`. | Phase 2 batch review, 2026-08-27 |
| 11 | `service_job_assemblies` | `Anyone can read active assemblies` | `public` SELECT, `qual=(active = true)` | Public marketplace-style catalog listing — scoped to `active`, not the whole table. | Phase 2 batch review, 2026-08-27 |
| 12 | `service_job_trades` | `Anyone can read active trades` | `public` SELECT, `qual=(active = true)` | Same marketplace pattern as above. | Phase 2 batch review, 2026-08-27 |
| 13 | `status_incidents` | `Anyone can read status incidents` | `anon`+`authenticated` SELECT, `qual=true` | Public status-page incident history (charter 6.4/6.5) — publicly readable is the entire point of a status page. Confirmed via its own migration (`20260830051051_phase6_public_trust_foundation.sql`) that writes are locked to `service_role`/`admin` only, no public incident-reporting form exists, and the table stores only status-page fields (title/component/severity/status/summary/updates) — no PII or internal data. `check-rls-access-drift.ts`'s scheduled run had been failing since the table's creation on 2026-08-30 purely because this allowlist entry was never added at the time. | Live schema + migration review, 2026-09-06 |

## Known minor finding, tracked here rather than fixed (not an exception — a candidate for tightening)

`autoposter_credentials`'s `admin_all` policy grants full CRUD to any
`admin` OR `content_admin` user, not scoped per-admin — every
content_admin can see every connected social account's metadata
(platform, page/account ID, active status) system-wide. Confirmed low
severity: the table stores vault *reference* UUIDs, not raw OAuth
tokens. This is **not** added to the allowlist above (it's an
admin-role design choice, not a client-facing public-read exception) —
tracked here as a candidate for a future narrow PR to scope
`content_admin` more tightly, pending a founder decision on whether
that's worth doing.

## Maintenance

Add a new row here (with justification and how it was verified) *before*
adding a policy that would otherwise trip `check-rls-access-drift.ts`.
The CI gate treats an unlisted wide-open or admin-blanket policy as a
regression, not a feature — that's deliberate: the 10-table incident
happened because a similar pattern existed with nobody consciously
deciding it should.
