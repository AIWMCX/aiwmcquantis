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

### Founder decisions outstanding (§148)

1. **P0-01/02 fix** — stop silent clamping. Proposed: preserve the user's real values; replace the rewrite with a **visible inline flag** on the primary surface ("margin unusually high for this industry — verify inputs"). This is a material formula-policy change altering displayed numbers → requires approval.
2. **P0-23** — delete/undeploy `calculate-financials`.
3. **Stale row repair** — `sub_1TotZjLKMhSmZURCEpzsCh7M`: Stripe (live) says `past_due`, invoice `in_1TtyGJLKMhSmZURCKGuiKkcP` $0 paid / 4 failed attempts; our row still reads `active`/`payment_failed_at: null`, untouched since 2026-07-02. Options: (A) fix the card → natural resync + proves recovery path; (B) SQL sync to `past_due` → truthful, account loses Pro until paid; (C) Resend a `customer.subscription.updated` event → proves the newly-deployed handler self-corrects. **Recommended: C then A.**
4. **RVCE unit-safety branch** `fix/rvce-unit-safety-normalization` — 30 tests + full suite green, not merged/deployed.

### Rollback
- Finding 16-1 code: `git revert fd863042`. Migration is additive (widened CHECK) — safe to leave; reverting it requires no rows hold the new statuses.
- P0-11: `git revert 857e5777 f28ee008`.

### Next activation command
**`ACTIVATE: P0_STABILIZATION`**, scoped to P0-01/02 once decision #1 lands — it is the single most trust-destroying defect for the Aug 15 first-paid client (a fractional CFO seeing their own reported expenses silently inflated). P0-09 (`999`) is the next-largest lift and should follow, not precede, it.
