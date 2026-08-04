# Effective Access Results — P0 Incident 2026-08-03

This document proves the vulnerability via real, reproducible behavior against the live PostgREST API — not policy metadata alone — and inventories the real column/ownership structure and legitimate caller (RPC/Edge Function/frontend) for each of the 10 affected tables, established by reading the actual application code, not assumed.

## A. Effective-access canary test (full transcript)

Environment: `https://dmlxrvfyqsakyjomsvdj.supabase.co/rest/v1`. Credential used for every request below: `apikey: <anon>` header only — the exact public, legacy anon JWT (`role: anon`) that ships in the deployed frontend bundle. No `Authorization: Bearer` header was sent in any request in this section — this is what an anonymous website visitor can do today, unauthenticated.

| # | Method | Path | Result | Evidence |
|---|---|---|---|---|
| 1 | (setup, service-role) | `INSERT INTO usage_counters (...) VALUES ('__CANARY_SECURITY_TEST_2026-08-03__', 'free', 1)` | Row created, `id=c28ee5b1-0af0-48ad-86b3-7cb43aed942f` | Synthetic canary, not real user data |
| 2 | GET | `/usage_counters?identity_key=eq.__CANARY_SECURITY_TEST_2026-08-03__` | **200 — full row returned** | anon can read a specific row directly |
| 3 | PATCH | `/usage_counters?identity_key=eq.__CANARY_SECURITY_TEST_2026-08-03__` body `{"analyses_used":9999}` | **200 — row updated** | anon can modify any row — direct quota-tamper primitive |
| 4 | GET | `/invoices?select=id&limit=3` | **200 — 1 real row id returned** | anon can enumerate the invoices table (id only requested, no content read) |
| 5 | GET | `/leads?select=id&limit=3` | **200 — 2 real row ids returned** | anon can enumerate the leads table (id only requested, no content read) |
| 6 | DELETE | `/usage_counters?identity_key=eq.__CANARY_SECURITY_TEST_2026-08-03__` | **200 — row deleted** | anon can delete any row; this call also cleaned up the canary |

**Post-test state:** zero canary rows remain in `usage_counters`. No real customer row in any table was read, written, or deleted by this investigation. `invoices`/`leads` were probed with `select=id` only — no financial figures, names, or emails were retrieved or logged anywhere in this evidence.

## B. Column, ownership, and real caller inventory (per table)

Established by reading `information_schema.columns`, `pg_proc`, and the actual application source — not assumed from table names.

### `usage_counters`
- **PK:** `id uuid`. **Identity field:** `identity_key text` (not `user_id` — appears to key by an anonymous/session identity, not an authenticated user column).
- **Sensitive columns:** none directly (no PII), but `analyses_used`/`tier` are quota-integrity-relevant.
- **Real callers:** **none found** — zero references in `src/` or `supabase/functions/` outside the auto-generated `src/integrations/supabase/types.ts`. This table is not currently wired into the live quota system; `supabase/functions/_shared/entitlements.ts` enforces quota against `subscriptions`/`analyses` instead.
- **Direct PostgREST access required?** No — not by any current feature.

### `analysis_attempts`
- **Real callers:** **none found anywhere** (frontend, edge functions, or generated types beyond schema reflection). Appears to be an unused observability/idempotency ledger table.
- **Direct PostgREST access required?** No.

### `invoices`
- **PK:** `id`. **Owner field:** `user_id` (confirmed via `src/hooks/useInvoices.ts:44,93` — `.eq('user_id', user.id)` on read, `user_id: user.id` on insert).
- **Sensitive columns:** invoice line items, totals, client billing details (financial document — high sensitivity).
- **Real callers:** `src/hooks/useInvoices.ts` (client-side, authenticated `supabase` browser client — SELECT own rows, INSERT own rows via `docs-engine.ts:475` called from `InvoiceCreator.tsx`); `get_next_invoice_number(p_user_id)` RPC (`SECURITY DEFINER`, already hardened, `search_path=public`).
- **Direct PostgREST access required?** **Yes, but owner-scoped only** — the app's own client code does real, direct `authenticated`-role table access for SELECT/INSERT, gated today only by an app-side `.eq()` filter (which provides zero real security without a matching RLS predicate). No anon access is ever needed.

### `leads`
- **Sensitive columns:** name, email, and other prospect/marketing-consent PII.
- **Real callers:** **zero direct client-side references.** All referencing code is in edge functions run under a service-role context (`check-lifecycle-emails`, `confirm-email-subscription`, `newsletter-unsubscribe`, `send-weekly-insights`, `send-welcome-email`).
- **Direct PostgREST access required?** No — for both anon and authenticated. Any public lead-capture form (if one exists) must go through a service-role edge function, not direct table access; this investigation found no direct client `.from('leads')` call anywhere, so no legitimate frontend workflow depends on table-level grants.

### `shared_reports`
- **Owner field:** `user_id` for the owning analysis; public access is via an opaque `token text` column (64-char hex), not row identity.
- **Real callers:** `supabase/functions/share-report/index.ts` — a dedicated edge function that already implements the correct pattern: **public GET-by-token** uses a **service-role client** internally (`serviceClient.from('shared_reports')...eq('token', token)`), with token-format validation (`^[a-f0-9]{64}$`) and IP-based rate limiting against enumeration; **authenticated create/list/revoke** uses the caller's own bearer token.
- **Direct PostgREST access required?** No, for both anon and authenticated — the edge function is already the sole legitimate access path and does not depend on the broad table grants being fixed here (service-role bypasses RLS by design).

### `export_jobs`
- **Owner field:** `user_id` (used in `src/hooks/useExportQueue.ts`, `src/lib/exportJobs.ts`, `src/pages/MyDocuments.tsx`).
- **Real callers:** client-side, authenticated, own-row SELECT/INSERT/UPDATE.
- **Direct PostgREST access required?** Yes, owner-scoped only.

### `quote_gen_usage`
- **Real callers:** `src/hooks/useQuoteGenUsage.ts`'s own header comment states the authority model directly: *"Quotas (server-enforced — see `increment_quote_gen_usage` RPC)... The server (`get_quote_gen_status` RPC) is the only authority."* Both RPCs confirmed `SECURITY DEFINER`, `search_path=public`, EXECUTE granted to `anon`+`authenticated`.
- **Direct PostgREST access required?** No — the RPCs are already the correct, hardened access path and are unaffected by revoking direct table grants.

### `referral_codes`
- **Owner field:** `user_id` (used in `src/hooks/useReferral.ts:73-76` — `.eq('user_id', user.id).single()` to fetch the caller's own code id).
- **Other real callers:** `generate_referral_code`, `get_referral_stats`, `track_referral_click`, `complete_referral_signup` — all four confirmed `SECURITY DEFINER`, `search_path=public`, EXECUTE granted to `anon`+`authenticated` (the public-facing `track_referral_click` legitimately needs anon EXECUTE, since a referral link can be clicked pre-signup — but that is function-level EXECUTE, not table-level CRUD).
- **Direct PostgREST access required?** Yes, but **read-only, owner-scoped, authenticated-only** (the one direct client read is a user fetching their own code's id). No anon table access needed.

### `analysis_cases`
- **Owner field:** `user_id` (present in the insert at `supabase/functions/analyze-business/index.ts:3851-3853`, defaults to a zero-UUID sentinel for anonymous analyses).
- **Real callers:** `analyze-business/index.ts` (service-role client, INSERT — internal "case memory" store) and `prediction-engine.ts` (service-role client, SELECT — similarity counting for prediction confidence). **No frontend caller at all.**
- **Direct PostgREST access required?** No, for both anon and authenticated.

### `funnel_events`
- **Real callers:** `src/lib/analytics.ts`'s `recordFunnelEvent()`, exclusively via the `record_funnel_event(...)` RPC — confirmed `SECURITY DEFINER`, `search_path=public`, EXECUTE granted to `anon`+`authenticated` (this is the correct, already-hardened path; anonymous visitors legitimately need to record funnel events pre-signup).
- **Direct PostgREST access required?** No — the RPC is already the sole legitimate write path and includes its own rate-limit (60 events/session/minute) and canonical-name allowlist (a `CHECK` constraint on `event_name`). Direct table grants are pure excess exposure with zero corresponding legitimate use.

## C. Already-hardened RPCs confirmed (unaffected by this fix)

Queried `pg_proc.prosecdef` and `information_schema.routine_privileges` directly against production:

| Function | `SECURITY DEFINER` | `search_path` set | EXECUTE grantees |
|---|---|---|---|
| `record_funnel_event` | true | `public` | PUBLIC, anon, authenticated |
| `get_quote_gen_status` | true | `public` | anon, authenticated |
| `increment_quote_gen_usage` | true | `public` | anon, authenticated |
| `get_next_invoice_number` | true | `public` | PUBLIC, anon, authenticated |
| `generate_referral_code` | true | `public` | PUBLIC, anon, authenticated |
| `get_referral_stats` | true | `public` | PUBLIC, anon, authenticated |
| `track_referral_click` | true | `public` | PUBLIC, anon, authenticated |
| `complete_referral_signup` | true | `public` | PUBLIC, anon, authenticated |

All 8 are already correctly hardened (from the June `security_definer_function_hardening` migration). Revoking the excess direct-table grants in the accompanying migration **does not affect any of these RPCs** — `SECURITY DEFINER` functions execute with the function owner's privileges, independent of the calling role's table-level grants.

## D. What was NOT tested this pass (explicitly unverified)

- Real authenticated user-A-vs-user-B cross-row isolation via actual login sessions (two real JWTs) — the automated test suite (`03_TABLE_ACCESS_MATRIX.csv` + the new Vitest file) uses SQL-session role/claim simulation (`SET LOCAL role authenticated; SET LOCAL request.jwt.claims = ...`) as a safe, no-new-user-creation proxy for this, which is the standard technique for RLS testing without provisioning real Supabase Auth accounts. This is a reasonable stand-in but is not byte-for-byte identical to a real PostgREST request carrying a real Supabase-issued JWT.
- Log-based incident-scope review (§7 of your instructions) — see the separate note in `04_REMEDIATION_PLAN.md`; Supabase's log retention/access via the available MCP tooling was not sufficient to do a full historical anomaly sweep this pass, and is called out honestly rather than asserting "no evidence found."
