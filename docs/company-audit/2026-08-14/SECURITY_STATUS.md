# Security Status — Track A closure attempt (charter v4.0 §6)

## Step 1 — PR #28 read fresh

```
head SHA:        b205ee06c67f1a1a32e30cf39502d21e7f904263  — CODE_VERIFIED, unchanged
base:             main
changed files:    6 (migration, rollback SQL, verify SQL, HTTP verify script, pgTAP test, summary doc)
CI status:        lint/format/typecheck/verify/tests/audit = PASS (2m57s); qoc-gate = PASS — CODE_VERIFIED this session, prior turn
review status:    no review submitted yet
mergeability:      MERGEABLE — CODE_VERIFIED, this pass
scope:            get_referral_stats(uuid), complete_referral_signup(uuid,uuid), generate_referral_code(uuid),
                   get_next_invoice_number(uuid), decrement_quote_gen_usage() -- 5 functions, authenticated-only grants,
                   no service_role grant added (none genuinely required, verified by grep against src/ call sites)
```

## Steps 2-4 — live production function inspection, reproduction attempt, classification

**BLOCKED.** Cannot inspect `public.get_referral_stats(uuid)`'s live function body, grants, or effective privileges, and cannot attempt a controlled non-destructive reproduction, without a working connection to the real Quantis Supabase project (`dmlxrvfyqsakyjomsvdj`). See `PRODUCTION_STATE.md` for the fresh `SUPABASE_CONNECTION_MISMATCH` finding this pass.

Classification per §6 step 4's four options:

```
LIVE_VULNERABLE   — not ruled in
ALREADY_FIXED     — not ruled in
NOT_REPRODUCIBLE  — not ruled in
UNVERIFIED        — CORRECT CLASSIFICATION THIS PASS
```

What is CODE_VERIFIED (not a substitute for the above, but the strongest evidence available without DB access): the vulnerable pattern was independently confirmed by reading the actual function source at `supabase/migrations/20260206003246_8a34fb59-06cd-490e-93c8-35ea86dd87d8.sql:274` earlier this session — `auth.uid() != p_user_id` evaluates to `NULL` for an anonymous caller, and PL/pgSQL's `IF` treats `NULL` as false, so the `RAISE EXCEPTION` never fires. This is a fact about the *source that would be live absent a fix*, not a live reproduction. Per charter §27 ("Only the last state closes a live-production incident"), this does not close the incident.

## Step 5 — migration coverage check

CODE_VERIFIED (repo-only, no DB dependency): `20260814120000_p0_track_a_referral_function_access.sql` uses correct signatures for all 5 targets, cross-checked against each function's actual `CREATE FUNCTION` definition in the migrations that created them (not assumed). Confirmed this exact point in a prior turn this session — not re-derived here to avoid duplicate work per charter §0's "do not repeat already-completed repository analysis unless freshness verification requires it."

## Step 6 — regression test inventory

| Required (§6 step 6) | Present in PR #28? | Executed? |
|---|---|---|
| SQL privilege verification | Yes — `VERIFY.sql` Part 1/2 | Not run (needs DB) |
| pgTAP | Yes — 13 assertions in `p0_track_a_referral_access.test.sql` | Not run (needs Docker/Supabase local stack, same gap PR #26 has) |
| Anonymous denial | Yes — pgTAP assertion + `VERIFY.sql` Part 3 exploit simulation | Not run |
| Authenticated self-access | Yes — pgTAP "authenticated retains execute" assertions ×5 | Not run |
| Cross-user denial | Yes — pgTAP Part 4, non-regression check | Not run |
| Service/admin behavior | Yes — pgTAP Part 5, `lives_ok` service_role bypass check | Not run |
| HTTP/PostgREST verification | Yes — `track-a-http-verify.sh`, gated behind `TRACK_A_CONFIRM=yes` | Not run |
| Rollback review | Yes — `ROLLBACK.sql`, manually reviewed for correctness this session (prior turn) | N/A (review only, not executed) |

All required test artifacts exist and were reviewed for correctness. None have been executed against a real database this session — that requires either the Supabase access fix or a working local Docker stack, neither available.

## Step 7 — founder decision gate

```
TRACK_A_BLOCKED
```

Not because the fix is deficient — code review, CI, and independent source verification all support it. Blocked specifically on charter §6 steps 2-4 and the test-execution portion of step 6, all of which require either the Quantis Supabase connection or a working local Docker/Supabase stack. Per §33 (production-mutation gate), merging or deploying without those steps completed would not meet this charter's own bar for `PRODUCTION_CHANGE_READY`, regardless of code quality. This is a process-completeness verdict, not a code-quality verdict.

**Not merged. Not deployed. Awaiting the same unblock action recorded in `PRODUCTION_STATE.md`.**
