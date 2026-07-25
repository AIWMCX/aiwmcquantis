# AIWMC Quantis — Accuracy Program State Ledger
Maintained per MP7-ACCURACY v3.1 §0 rule 5 and §22. **Read this first at the start of every accuracy session.**

---

## Session: 2026-07-25 — ACTIVATE: P0_STABILIZATION (continued)

**Environment:** PRODUCTION (deploys executed, founder-authorized). Deployed commit `fd863042`, verified live via `analyze-business?health=1` → `commit_sha: fd8630424167564736de8fd453f59e26ad2e6b5c`.

### Shipped to production this session

| Item | Evidence |
|---|---|
| **Finding 16-1** (Stripe billing audit) — webhook handlers no longer default unknown Stripe statuses to `"active"` | Commit `fd863042`. `stripe-webhook` v1976 → **v1988**. CI ✅ qoc-gate ✅ Production Deploy ✅ Deploy Smoke Test ✅ |
| **Migration** `20260725041725_expand_subscription_status_allowed_values` — `subscriptions.valid_status` CHECK widened 4 → 8 Stripe statuses | Verified live via `pg_constraint`. Applied to prod BEFORE code shipped (ordering deliberate: reversed, every new-status write would throw a constraint violation). Filename matches stamped version — no `schema_migrations` drift. |
| **P0-11** — "95,500 Monte Carlo scenarios" removed from Deno edge functions | Commits `857e5777` + `f28ee008`, previously unpushed on local main, now on `origin/main` |

### P0 register — reconciled against LIVE CODE this session (supersedes §6 status column)

**Critical correction to MP7 §5 baseline observation #9:** it attributes the undiscounted-NPV and silent-clamping defects to `calculate-financials`. That function is **dead code** — zero references in `src/`, only pinged by `warm-functions` (keep-alive) and `admin-health-sweep` (health check). The **live** calculator is `supabase/functions/analyze-business/financial-calculator.ts` (`calculateStrictFinancials`, called from `analyze-business/index.ts:1735`). Verify against the live file, not the microservice.

| P0 | Verified status | Evidence |
|---|---|---|
| **P0-01** | **CONFIRMED OPEN — live** | `financial-calculator.ts:194-206` silently rewrites B2B/enterprise CAC below $2,000 to `Math.max(benchmarks.cac_typical, 2000)`. Also `:586` floors MRR for break-even. |
| **P0-02** | **CONFIRMED OPEN — live** | `financial-calculator.ts:419-439` — if margin > `benchmark_max + 5%`, **`totalExpenses` is rewritten** to `mrr × (1 − ceiling)`, a fabricated number the user never supplied. Disclosure exists (`corrections[]`, `was_auto_corrected`, −15 reliability per correction) but surfaces only in `ValidationSection.tsx`, a secondary panel — the primary report/PDF show the rewritten figures as plain fact. |
| **P0-04** | **RESOLVED in live path** | `financial-calculator.ts:566-583` implements true DCF: `−I₀ + Σ(m=1..36) profit/(1+r)^m`, 10% annual WACC → monthly rate. Matches MP7 §10's NPV law. ⚠️ Uses flat monthly profit, not a dated/ramped series — a simplification, not the named defect. Dead twin `calculate-financials/index.ts:586` still has `netProfit * 36 - startupInvestment` (undiscounted) but is unreachable. |
| **P0-09** | **CONFIRMED OPEN — live** | `financial-calculator.ts:494,518` still set `paybackMonths = 999`. Typed `MonthsMetricResult` (`paybackResult`) exists and cross-checks, but is **explicitly detection-only** — in-code comment: *"20+ call sites downstream depend on its existing integer/999 contract."* Making it load-bearing is the real work. |
| **P0-11** | **RESOLVED** | Commit `857e5777`, pushed + deployed this session. |
| **P0-14** | **CONFIRMED OPEN** | `qoc_audit_envelopes` = 0 rows (live query). QoC deployed but not load-bearing. |

### NEW FINDING — P0-23: unauthenticated duplicate financial engine deployed in production

`calculate-financials` is **ACTIVE, deployed, and `verify_jwt: false`** (no auth required) while containing two known-defective implementations the live engine has already fixed:
- undiscounted NPV (`netProfit * 36 - startupInvestment`, line 586)
- the same margin-ceiling clamp that rewrites `totalExpenses` (lines 462-478)

Nothing in `src/` calls it. It is MP7's "≥11 competing truths" made concrete: a second, worse financial engine sitting publicly reachable on the internet, serving math the primary path has already corrected. Per MP7 §11 ("deprecate duplicate calculation paths **only after differential tests prove the migration**") — here no migration is needed because there is no consumer to migrate.

**Recommended:** remove from the deploy set / delete. **Blocked on founder approval** (§148: production change).
**Severity: High** (duplicate-truth surface + unauthenticated). **Not yet exploited** — no evidence of external calls.

### UPDATE (same session, continued) — all 4 founder-approved items shipped

Founder approved all four outstanding items. Executed in dependency order, each verified before moving to the next:

| # | Item | Commit | Live verification |
|---|---|---|---|
| 1 | **P0-01/02 fix** — stop silently rewriting avg-check/CAC/LTV/net-margin | `b35de416` | Full suite 1222/1222 green. Golden-case expected values regenerated by running the actual post-fix engine (not hand-derived, to avoid errors in cascading ramp/DCF math). `ValidationSection.tsx` copy corrected ("Auto-Corrections" → "Flagged for Review"; dropped the strikethrough/arrow treatment that implied values were replaced). |
| 2 | **P0-23** — decommission `calculate-financials` | `a5c89f1b` + `f4bd050f` | Redeployed as inert 410-Gone stub, `verify_jwt: true` (closed the unauthenticated gap immediately). No delete-edge-function API exists via the MCP deploy tool — full object deletion needs one manual Supabase Dashboard step. Registered in `.deploy-ignore` after CI's `verify-deploy-coverage` guard correctly caught the initial omission. |
| 3 | **Stale `sub_1TotZjLKMhSmZURCEpzsCh7M` row** | — | No Stripe API exists for webhook redelivery (confirmed via `stripe_api_search`); paying the invoice via API would be an actual financial transaction, which is out of scope regardless of approval. Stripe's own `next_payment_attempt` is already scheduled — the fix will self-verify when it fires. Recommended founder alternative: click "Resend" in the Stripe Dashboard for immediate proof. |
| 4 | **RVCE unit-safety branch merge** | `4a90a8a2` | Merged `fix/rvce-unit-safety-normalization` into main (4 commits behind), full suite 1222/1222 green, deployed with the P0-01/02 fix. |

**CI caught a real gap on first push** (`b35de416`): `verify-deploy-coverage` failed because `calculate-financials` was removed from the deploy list without being registered in `.deploy-ignore` — exactly the drift class that guard exists to prevent. Fixed in `f4bd050f`, verified locally (lint/typecheck/sentinel-scan/business-logic-hash/payback-integrity/format-check/full suite, all green) before re-pushing. Deploy fidelity confirmed via live health endpoint: `commit_sha: f4bd050f...` matches exactly.

**All changes now live in production**, verified by commit SHA, not assumed.

### Founder decisions outstanding (§148)

All four resolved this session (see UPDATE above). Remaining open items are the earlier-listed P0-04 dead-twin cleanup (low priority, unreachable code), P0-09 (999 sentinel, large lift — 20+ call sites depend on the contract), P0-14 (QoC not load-bearing), and the stale subscription row (self-resolves on Stripe's next retry, or founder can force it via Dashboard "Resend").

### Rollback
- Finding 16-1 code: `git revert fd863042`. Migration is additive (widened CHECK) — safe to leave; reverting it requires no rows hold the new statuses.
- P0-11: `git revert 857e5777 f28ee008`.

### Next activation command
**`ACTIVATE: P0_STABILIZATION`**, scoped to P0-01/02 once decision #1 lands — it is the single most trust-destroying defect for the Aug 15 first-paid client (a fractional CFO seeing their own reported expenses silently inflated). P0-09 (`999`) is the next-largest lift and should follow, not precede, it.
