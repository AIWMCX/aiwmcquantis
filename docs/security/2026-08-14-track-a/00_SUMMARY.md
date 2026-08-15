# Track A — referral/invoice/quota function access fix

Branch: `security/p0-track-a-referral-access-fix` (off `main`, independent of `feature/evidence-service` and PR #26's `security/p0-effective-access-control`).

## Why this is split out of PR #26

PR #26 is a 60-commit, well-reasoned remediation for 10 tables, but it's blocked on infrastructure that has nothing to do with correctness: Docker/WSL2 failing locally (cross-identity matrix, pgTAP suite, rollback rehearsal never executed) and a missing `SUPABASE_DB_URL` CI secret. Its own round-3 writeup deferred three findings rather than fix them, pending a scope decision. One of those three — `get_referral_stats(uuid)` — is a real, currently-live, unauthenticated data-exposure bug. It shouldn't wait on Docker.

Everything in Track A is a pure `REVOKE`/`GRANT` plus one one-line `IS DISTINCT FROM` fix, verifiable by reading source and running read-only SQL — it does not need a local Supabase stack to review or reason about correctness, only to execute the pgTAP suite (which, like PR #26's, is written but unexecuted pending Docker).

## What was independently verified before writing any fix (not just trusted from PR #26's writeup)

1. **`get_referral_stats(uuid)` fail-open — CONFIRMED** by reading [20260206003246_8a34fb59...sql:274](../../../supabase/migrations/20260206003246_8a34fb59-06cd-490e-93c8-35ea86dd87d8.sql):
   `IF auth.uid() != p_user_id AND NOT is_service_role() THEN RAISE EXCEPTION`. For anon, `auth.uid()` is `NULL`; `NULL != x` is `NULL`; plpgsql's `IF` treats `NULL` as false. The exception never fires for an anonymous caller.
2. **`complete_referral_signup` signature-mismatch root cause — CONFIRMED** by diffing [20260613022816...sql:91](../../../supabase/migrations/20260613022816_b3317e1d-197e-47b2-a68f-231a1f996851.sql) (`REVOKE ... complete_referral_signup(text,uuid)`) against the function's real definition at [20260206003246...sql:229-232](../../../supabase/migrations/20260206003246_8a34fb59-06cd-490e-93c8-35ea86dd87d8.sql) (`(uuid, uuid)`). The mismatched-signature `REVOKE` hit `undefined_function`, silently swallowed by that loop's own `EXCEPTION WHEN undefined_function THEN RAISE NOTICE` handler.
3. **`decrement_quote_gen_usage` — same class of bug found**, not previously called out by PR #26: the same hardening migration targets `decrement_quote_gen_usage(uuid)` at line 110, but the real function ([20260611120000...sql:346](../../../supabase/migrations/20260611120000_restore_service_job_quotegen.sql)) takes zero arguments. Unlike `complete_referral_signup`, this one's origin migration already correctly revoked `PUBLIC` and granted only `authenticated` at creation time (lines 363-364), so it is likely already closed in production — Track A re-asserts it anyway rather than assuming, since this session has no live production read access to confirm.
4. **`generate_referral_code(uuid)` / `get_next_invoice_number(uuid)`** — signatures in the hardening loop match the real functions exactly, so if that migration actually applied in production these should already be closed. Re-asserted defensively for the same reason as #3: this project's own history (`docs/accuracy/QUANTIS_ACCURACY_STATE.md`) has previously found tracked migration history and live production state diverge.
5. **Least-privilege re-verified by grep, not assumed**: all five names are called exclusively from `src/hooks/useReferral.ts`, `src/hooks/useInvoices.ts`, `src/services/serviceJob.ts`, `src/services/docs-engine.ts` — client-side, under the caller's own authenticated session, every call site guarded by `if (!user?.id) return`. Zero matches anywhere in `supabase/functions/`. No function genuinely needs a `service_role` EXECUTE grant; none is added.

## What's in this branch

| File | Purpose |
|---|---|
| `supabase/migrations/20260814120000_p0_track_a_referral_function_access.sql` | The fix: NULL-safe rewrite of `get_referral_stats`, correct-signature `REVOKE`/`GRANT` for all 5 functions, `authenticated`-only (no `service_role`), pre-change `NOTICE` logging, post-change `EXCEPTION`-raising assertions |
| `docs/security/2026-08-14-track-a/ROLLBACK.sql` | Manual emergency rollback — restores the pre-fix (vulnerable) state; heavily commented against casual use |
| `docs/security/2026-08-14-track-a/VERIFY.sql` | Read-only SQL verification: effective-privilege matrix, raw ACL dump, in-transaction exploit simulation (`SET LOCAL ROLE anon`), cross-user non-regression check |
| `scripts/security/track-a-http-verify.sh` | Real PostgREST HTTP-level check using only the public anon key — the same evidence standard the original P0 incident was proven with. Gated behind `TRACK_A_CONFIRM=yes`, no bypass flag |
| `supabase/tests/database/p0_track_a_referral_access.test.sql` | Self-contained pgTAP suite (13 assertions): anon-denied × 5, authenticated-retained × 5, real anon exploit attempt (`throws_ok`), authenticated cross-user non-regression, service_role bypass still works |

## Acceptance criteria for merging separately from PR #26

1. `20260814120000_p0_track_a_referral_function_access.sql` applies cleanly to a fresh migration replay (`supabase db reset`) with no errors — this exercises the migration's own `POSTCONDITION` block, which will `RAISE EXCEPTION` and abort the migration itself if any function is still anon-callable or if `authenticated` access was accidentally broken.
2. `docs/security/2026-08-14-track-a/VERIFY.sql` Part 1 run against the target database, post-migration: `anon_can_execute = false` and `authenticated_can_execute = true` for all 5 rows.
3. `scripts/security/track-a-http-verify.sh` run against the real project with a real target user id, post-migration: exits 0 (non-200 HTTP status, "Access denied").
4. `npx supabase test db` passes all 13 assertions in `p0_track_a_referral_access.test.sql` (requires a working local Docker/Supabase stack — currently blocked on this machine the same way PR #26's own suite is; can run on any machine/CI runner with working Docker).
5. Typecheck + existing Vitest suite green (no `src/` changes in this branch, so this should be a no-op, but confirm nothing in `src/hooks/useReferral.ts` / `useInvoices.ts` / `serviceJob.ts` assumed a grant this migration removes).
6. Founder review of the migration file itself (it is short — 5 statements' worth of actual change plus assertions and comments).
7. Explicit founder go-ahead before applying to production, per the standing rule this session operates under — this file is NOT applied or deployed as part of preparing this branch.

## What Track A does NOT cover

- PR #26's original 10-table remediation — untouched, still gated on its own Docker/CI blockers.
- Any function/table not named in PR #26's three deferred findings.
- The `is_service_role()` pooler-GUC bug — already fixed independently, see [20260112065039...sql:16-34](../../../supabase/migrations/20260112065039_0173b1a0-266f-4514-bb5a-8ea1aefe4e75.sql), not part of this branch's diff.
