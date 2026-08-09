# Evidence Ledger — 2026-08-09 Phase 0 Freeze

Every claim below is labeled per the directive's truth hierarchy: `PROD_VERIFIED`,
`CONFIG_VERIFIED`, `CODE_VERIFIED`, `TEST_VERIFIED`, `ACTIVE_SPEC`, `UNVERIFIED`,
`CONFLICTING_EVIDENCE`, `HISTORICAL`, `DEPRECATED`. No claim below is inherited
from an earlier prompt without a fresh check in this session, except where marked
`HISTORICAL` (explicitly not re-verified, previous finding stated for continuity only).

## Security / access control

| Claim | Status | Evidence |
|---|---|---|
| 10 tables had proven unauthenticated effective read/write/delete access | `HISTORICAL` | Reproduced with real anon-key HTTP calls in a prior session (docs/security/2026-08-03-p0-access/02_EFFECTIVE_ACCESS_RESULTS.md). Not re-run this session. |
| PR #26 contains remediation migration + tests + CI gate | `CODE_VERIFIED` | `git diff --stat main...security/p0-effective-access-control` this session: 16 files, +2156 lines, including the migration, RLS test suites, gate/advisory SQL, pgTAP. |
| PR #26 is merged/applied to production | `PROD_VERIFIED` (negative) | `list_migrations` against project `dmlxrvfyqsakyjomsvdj` this session: latest applied migration is `20260802162404`, dated before the P0 migration file `20260804000000...`. Migration is absent from applied list. |
| `charge_free_analysis` SECURITY DEFINER bypass exists and is closed in the migration | `CODE_VERIFIED` | Migration file content reviewed in prior session; REVOKE statements present for both overloads. Not re-verified live (table access is closed only once the migration is applied). |
| `get_referral_stats` / `complete_referral_signup` have real exploitable defects | `UNVERIFIED` | Root causes (NULL-comparison auth bypass; signature-mismatch open grant) are `CODE_VERIFIED` from source reading. HTTP-level exploitation with synthetic data has NOT been executed — blocked by the CI/local-Docker infrastructure wall documented below. Must use conditional language until reproduced. |
| GitHub Actions CI is blocked account-wide by a billing lock, not a workflow defect | `PROD_VERIFIED` | User-supplied screenshot this session, direct from github.com/AIWMCX/aiwmcquantis/actions: "GitHub Actions workflows can't be executed on this repository. Your account's billing is currently locked." Confirmed across `push`, `pull_request`, and manual `workflow_dispatch` triggers, including on a long-established main-branch workflow — ruling out a file-specific cause. |
| Local Docker/Supabase stack is blocked on the dev workstation | `HISTORICAL` | WSL2 backend failed to start across two attempts (~40 min), prior session. Not re-attempted this session (would not resolve without OS-level intervention independent of this work). |

## QOC / audit envelope

| Claim | Status | Evidence |
|---|---|---|
| `qoc_audit_envelopes` has 0 rows | `PROD_VERIFIED` | Direct `execute_sql` against production this session: `count=0, last_envelope=null`. |
| The Aug 2 fire-and-forget→awaited fix (P0-14, commit `b069e5f2`) is on `main` | `CODE_VERIFIED` | `git log main` this session shows the commit at position 4 from HEAD, dated before `main`'s current head commit (2026-08-03). |
| The P0-14 fix alone explains the 0-row finding | `CONFLICTING_EVIDENCE` (refuted) | The fix has been live 3+ days (assuming main is deployed — see below) and the row count is still 0. If isolate-teardown were the sole cause, at least the 2 authenticated analyses in the last 5 days (per live DB snapshot) should have produced rows post-fix. They did not. |
| `orchestrator.ts`'s `safePut()` covers every `orchestrate()` exit path | `CODE_VERIFIED` | Full file read this session: preflight-fail, dedupe-hit, dedupe-burst, engine-error, and success paths all call `safePut(deps, env)` before returning. No skip path exists. |
| The break is upstream of `orchestrate()`, in the HTTP/auth boundary | `CODE_VERIFIED` (structural, not yet proven as *the* cause) | Deduced from the above: if `orchestrate()` ran even once, a row would exist. It doesn't. `qoc-orchestrate/index.ts` requires `sb.auth.getUser()` to resolve a real user or returns 401 before calling `orchestrate()`. Whether this 401 path is actually firing on every real invocation has NOT been directly observed (no successful get_logs capture of a live shadow-call attempt in this session — see Open Defects QOC-1). |
| `analyze-business/index.ts` shadow-call passes the real user's Authorization header to `qoc-orchestrate` | `CODE_VERIFIED` (as written) | Source read this session, line ~4239-4244: `headers: { Authorization: authHeader }` where `authHeader = req.headers.get('Authorization')` from the same top-level request. Whether the Supabase JS client actually honors this override at runtime is `UNVERIFIED` — this exact codebase has one documented precedent (Pro-worker auth bug, lines 2047-2067) of the SDK not sending headers where the code assumed it would. |
| `deployed` qoc-orchestrate function matches source | `CODE_VERIFIED` | `get_edge_function` this session returned live bundle content matching the repo source read (version 2171, `verify_jwt: true`). Note: `verify_jwt: true` at the platform level means Supabase's edge runtime itself may reject requests before the function's own `sb.auth.getUser()` logic ever runs, if the Authorization header isn't a well-formed JWT it recognizes — this is a THIRD candidate failure point not yet ruled out. |

## Monitoring / observability

| Claim | Status | Evidence |
|---|---|---|
| SEO Live Monitor has been failing since Aug 6 | `HISTORICAL` | Prior-session audit finding. Not re-checked this session. |
| CSP blocks the documented analytics stack (GA4/GTM) while allowlisting an unused one (PostHog) | `HISTORICAL` | Prior-session direct comparison of `index.html` meta CSP vs `vercel.json` header CSP. Not re-checked this session. |

## Confidence semantics / PR #27

| Claim | Status | Evidence |
|---|---|---|
| PR #27 replaces a single misleading confidence percentage with decomposed quality dimensions | `CODE_VERIFIED` (title + prior review) | Not re-diffed against current `main` this session. |
| Locked payload / UI / PDF parity for the new semantics | `UNVERIFIED` | No fresh production analysis generated or compared this session. |

## Billing / entitlements

| Claim | Status | Evidence |
|---|---|---|
| Stripe test-mode E2E lifecycle has been verified | `UNVERIFIED` | Tracked as open task #23 prior to this session; not run this session. |
| 24 active/trialing subscriptions exist | `PROD_VERIFIED` | Direct `execute_sql` this session: `active_subs=24`. |

## Traffic / activation

| Claim | Status | Evidence |
|---|---|---|
| Near-zero product usage in the observation window | `PROD_VERIFIED` | Direct `execute_sql` this session: 2 analyses in the last 5 days, last analysis at 2026-08-06T02:26:30Z (3 days stale as of this capture). 44 total registered users. |

## What changed since the last audit (2026-08-08 RED verdict)

Nothing in production changed — no merge, no deploy, no migration applied. The only
new evidence this session is: (1) live re-confirmation of the qoc_audit_envelopes
zero-count and the orchestrator code trace narrowing the failure point, (2) definitive
proof the GitHub Actions blocker is a billing lock, not a technical/permissions issue,
and (3) a fresh live DB snapshot showing continued near-zero activation. The RED
verdict from 2026-08-08 stands; nothing here upgrades it.
