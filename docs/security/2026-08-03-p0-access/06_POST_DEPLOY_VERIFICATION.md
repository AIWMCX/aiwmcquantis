# Post-Deploy Verification Checklist — P0 Access Control Hardening

Run every item below immediately after deployment, in this order. Record actual output next to each line (not yet executed — this migration has not been deployed).

## 1. Policy/grant re-check (mirrors `01_RAW_POLICY_EVIDENCE.sql`)

- [ ] Re-run query A (policies) — confirm all 10 tables now show the new policy names, and none show `roles={public}` with `qual=true` unconditionally (the two admin/RPC-scoped exceptions — `funnel_events_admin_select`, `funnel_events_service_only` — are expected and correct).
- [ ] Re-run query B (grants) — confirm `anon` has zero privileges on all 10 tables; `authenticated` has only the specific privileges listed in `03_TABLE_ACCESS_MATRIX.csv` per table (never `TRUNCATE`).

## 2. Effective-access re-test (mirrors `02_EFFECTIVE_ACCESS_RESULTS.md` §A)

- [ ] Repeat the anon-key canary test against `usage_counters` — expect **403/empty result**, not 200, for SELECT/UPDATE/DELETE.
- [ ] Repeat the anon-key `select=id` probe against `invoices` and `leads` — expect **zero rows / 403**, not the real row ids.

## 3. Application workflow smoke tests

- [ ] Authenticated user can view their own invoices list (`useInvoices.ts`).
- [ ] Authenticated user can create a new invoice via Docs Studio / `InvoiceCreator.tsx`.
- [ ] Authenticated user can create/view/download their own export jobs (`MyDocuments.tsx`).
- [ ] Authenticated user can view their own referral code stats (`useReferral.ts`).
- [ ] `track_referral_click` RPC still succeeds for an anonymous (pre-signup) visitor.
- [ ] A free-tier analysis still completes successfully end-to-end (confirms `analysis_cases` service-role insert and `funnel_events` RPC insert are both unaffected).
- [ ] `/share/{token}` public report view still loads correctly for a valid, existing share token (confirms `share-report` edge function's service-role path is unaffected).
- [ ] An **admin** user can still load `/admin/funnel` and see data.
- [ ] A **non-admin authenticated** user attempting to query `funnel_summary_30d` directly gets zero rows (new, intentionally stricter behavior versus before this fix).
- [ ] QuoteGen (Beta) status/increment still works for a Free-tier user approaching their quota.

## 4. Cross-user isolation re-test

- [ ] User A cannot read User B's `invoices` row (list should be empty when queried as A, containing only A's real IDs).
- [ ] User A cannot read User B's `shared_reports` row directly (table access), while the public token route continues to work for both.
- [ ] User A cannot read or modify User B's `export_jobs` row.

## 5. Record and close out

- [ ] Update `docs/accuracy/QUANTIS_ACCURACY_STATE.md` with the incident, root cause, fix commit/migration version, and this verification's results.
- [ ] Record the deployed migration version in `supabase_migrations.schema_migrations` (should happen automatically via the normal deploy pipeline — confirm it did).
- [ ] Note the exact deployed commit SHA and migration version here for the record: ______________________
- [ ] If any smoke test fails: **do not leave it in a half-fixed state** — either fix forward with a follow-up migration, or execute `05_ROLLBACK.sql` and re-open this incident.
