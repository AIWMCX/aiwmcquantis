# AIWMC Quantis — Master Company Audit, v3.0 run

**As of**: 2026-08-14. **Coordinator**: single-threaded this pass (no parallel specialist branches spawned). **Governing freshness rule (§6)**: no metric below is carried forward from an earlier snapshot (Aug 3/9/10) as if current — anything not freshly observed this pass is marked `UNVERIFIED`, not inferred.

## Why this pass is partial, stated up front

This session has two access gaps that block roughly half the charter's 18 roles from producing real numbers:
1. **No Stripe API access** — blocks CFO revenue/reconciliation, Billing/Entitlements, most of Growth Analytics' funnel.
2. **No working Supabase MCP connection to `dmlxrvfyqsakyjomsvdj`** (the real Quantis project — connected MCP is scoped to an unrelated account, `tjoeintpstnifkmjlirs`; `get_project` returns permission-denied, not not-found). Blocks DB-level facts for CFO, Billing, Database/Supabase drift, Growth Analytics, and any real usage/retention data.

Sales, UX Research, and Customer Success roles additionally require human activity (actual calls, actual interviews, actual client outcomes) that only the founder can report — no amount of repository access substitutes for that. Those roles are marked `REQUIRES_FOUNDER_INPUT`, not `UNVERIFIED`, to distinguish "blocked by a fixable access gap" from "not obtainable from a codebase at all."

What follows is real, CODE_VERIFIED evidence for the roles this session's tools can actually reach (CTO, Security, Database structure, QA, AI Governance, Release Management), and an honest `UNVERIFIED`/`REQUIRES_FOUNDER_INPUT` marker everywhere else — per §30.F's instruction to never hide inaccessible systems.

---

## §7 Starting-hypothesis refresh

| Hypothesis | Result | Evidence |
|---|---|---|
| `main` = `741bbbe7...` | CONFIRMED | CODE_VERIFIED |
| Predicta branch = `cb833b90...` | CONFIRMED | CODE_VERIFIED |
| PR #26 open draft | CONFIRMED | CODE_VERIFIED, gh pr list |
| PR #28 (Track A) open draft | CONFIRMED | CODE_VERIFIED — CI on it passed (lint/typecheck/tests/audit + qoc-gate), Vercel check fails for an unrelated repo-permission reason |
| PR #27 open draft | CONFIRMED | CODE_VERIFIED — accuracy/confidence-semantics-split, opened 2026-08-04, still draft 10 days later |
| $0 MRR reported Aug 10 | **NOT CARRIED FORWARD** | Per §6, this is HISTORICAL only. Today's actual figure is `UNVERIFIED` — no Stripe/DB access this pass. Do not read the section below as "still $0"; it is "not re-measured." |
| Very low scenario comparison / zero assumption-change events (early-Aug) | **NOT CARRIED FORWARD** | Same — HISTORICAL, not re-measured this pass |
| Attribution loss / free-flow defect invalidated early self-serve experiment | HISTORICAL, unchanged unless refuted | Not re-investigated this pass; no new evidence either way |

Two open PRs not in the charter's hypothesis list, found this pass: **#25** (Dahl inference provider, draft since 2026-07-14, stale 31 days) and **#2** (Vercel Web Analytics, draft since 2026-04-13, stale 123 days). Neither blocks anything below, flagged for Release Management hygiene.

---

## Role-by-role

### CTO / Architecture — CODE_VERIFIED

Evidence-service hot path (dormant, see [[quantis_predicta_evidence_charter]] Phase 0): fully separate from the deterministic engine by construction — shadow-only trigger, no shared write path. No duplicate/abandoned canonical-financial-calculation path found this pass beyond the already-decommissioned `calculate-financials` (stub, 410-gone, documented in `.deploy-ignore`).

**Branch inventory (drift risk)**: 5 unmerged branches with real diffs sitting behind `main` — `feature/evidence-service` (15 ahead), `security/p0-effective-access-control` (PR #26), `accuracy/confidence-semantics-split` (PR #27), `security/p0-track-a-referral-access-fix` (PR #28), `agent/dahl-inference` (PR #25). Every day these stay open, `main` and each branch diverge further and the E5.5-class problem (migrations reconstructed from generated types because tracked history didn't match production) gets more likely to recur. This is a real, compounding cost — not a hypothetical one, per this session's own history.

### Security / AppSec — CODE_VERIFIED, one item independently re-verified

PR #26 (10-table remediation) and PR #28 (Track A) both exist as draft, unmerged. Track A's core finding — `get_referral_stats(uuid)` anonymous fail-open via `auth.uid() != p_user_id` evaluating `NULL` for anon callers — was independently confirmed this session by reading the function source directly, not by trusting the PR's own writeup (see PR #28 body). **This is a live, currently-unpatched vulnerability on `main`** (Track A fixes it but hasn't merged). That is the single highest-confidence P0 finding in this entire audit pass.

### Database / Supabase — CODE_VERIFIED (repo-only), DB_VERIFIED blocked

Cannot compare migrations-vs-ledger-vs-live-schema-vs-live-policies (§16) without production DB access — blocked. What's CODE_VERIFIED: `main` has zero pgTAP/RLS-level tests (`supabase/tests/` doesn't exist on `main` at all — it only exists on the unmerged PR #26/#28 branches). That means today, `main`'s security posture has **zero automated regression coverage** for the exact class of bug Track A just found. This is a QA/Database joint finding worth weighting heavily.

### QA / Test Architecture — CODE_VERIFIED

`src/__tests__/`: 59 test files on `main`, 5 explicitly financial-named. `supabase/tests/database/`: 0 on `main` (RLS/cross-identity layer of the pyramid is entirely unmerged). No E2E, contract, mutation, or synthetic-production layer confirmed present this pass — not fully inventoried (would need a deeper pass than this session's budget allows); flagging as `UNVERIFIED` rather than assuming absence.

### AI Governance — CODE_VERIFIED (partial)

Shared middleware exists: `_shared/ai-logger.ts`, `_shared/analysis-event-logger.ts`, `_shared/logger.ts`. CI enforces a cost-logging guard (referenced by `.deploy-ignore`'s `content-studio-generate` entry, which is deliberately excluded from deploy for not yet using `ai-logger.ts`). Full LLM-call inventory (caller/model/provider/prompt-version/numeric-permissions per call site) not built this pass — real work, not done.

### Billing / Entitlements — CODE_VERIFIED structure only, STRIPE_VERIFIED and DB_VERIFIED blocked

Edge functions exist on `main`: `create-checkout-session`, `stripe-webhook`, `process-subscription-downgrades`, `confirm-email-subscription`, `replay-webhook-events`, `alert-webhook`. Whether the pipeline (checkout → Stripe → webhook → subscription persistence → tier mapping → server-side entitlement) is currently healthy end-to-end is **UNVERIFIED** this pass — needs Stripe API + Supabase access, neither available. A prior-session memory records a webhook signing-secret mismatch causing 401s as a found-and-diagnosed root cause; whether that's still true today is not re-checked (per §6, not carried forward as current).

### CFO / Financial Controls — BLOCKED

Cannot audit MRR/ARR/cash/refunds/reconciliation/contribution margin without Stripe + Supabase access. `UNVERIFIED` across the board. This is the single largest gap in this audit pass relative to the charter's own priorities (§3: "can Quantis... cause someone to pay").

### Growth Analytics — BLOCKED

Canonical funnel (qualified visit → signup → analysis → verdict → scenario compare → assumption change → export → second use → checkout → payment → repeat payment) requires production event data. `UNVERIFIED`.

### CEO/GM, Sales/RevOps, UX Research, Customer Success — REQUIRES_FOUNDER_INPUT

These roles' primary inputs are business activity (calls, replies, client outcomes, interviews) that no repository access can substitute for. Not attempted this pass beyond what's already captured in prior-session memory (ICP = independent business consultants / fractional CFOs / CFO advisory, per standing project memory).

### CMO / Claims — NOT AUDITED THIS PASS

Requires walking every externally visible surface (marketing site, in-app copy, PDF/report language) against the §4 product contract and the §21 do-not-sell list (layer counts, RVCE/QOC/Predicta by name, iteration counts, benchmark counts, provider names — all before the buyer understands the decision problem). Real, bounded work; not started this pass given the scope already covered.

### Project / Release Management — CODE_VERIFIED

Consolidated P0/P1 register below reflects what's actually open right now, cross-referenced against this session's own task history (105 tracked items, the large majority already completed in prior sessions per the task list — not re-litigated here).

---

## Ranked P0 / P1 findings (this pass)

| # | Severity | Finding | Evidence | Status |
|---|---|---|---|---|
| P0-A | P0 | `get_referral_stats(uuid)` anonymous fail-open — live on `main`, fix ready unmerged | CODE_VERIFIED (independently re-read this session) | Fix on PR #28, CI green, awaiting merge + prod apply |
| P0-B | P0 | 10-table effective-access exposure (usage_counters, invoices, referral_codes, etc.) — remediation written, unmerged, blocked on Docker/CI infra, not on correctness | CODE_VERIFIED | PR #26, draft since Aug 4 (10 days) |
| P1-A | P1 | `main` has zero RLS/pgTAP regression coverage — the exact bug class both P0s above represent has no automated gate today | CODE_VERIFIED | Neither PR merged yet |
| P1-B | P1 | Revenue/billing state fully UNVERIFIED for 4+ days (last known snapshot Aug 10, per charter's own hypothesis list) — CFO cannot currently answer §3's core question | BLOCKED, needs access | Open |
| P1-C | P1 | 5 branches diverging from `main` simultaneously (evidence-service, #25, #26, #27, #28) — compounding drift risk, one instance of which (E5.5) already cost real rework this session | CODE_VERIFIED | Open |

---

## §30 Required final output

### Executive verdict

AIWMC Quantis's engineering-side integrity work this pass is genuinely strong — a real, independently-reproducible anonymous data-exposure bug was found, fixed, and pushed through green CI within one session, and a second 10-table remediation sits ready pending only infrastructure recovery. But the charter's central question — can Quantis cause a real professional to pay and keep paying — cannot be answered today, because this session has no path to Stripe or the production database. That is not a "things are bad" finding; it is an honest "unmeasured" finding, and per §31, unmeasured revenue is not the same as validated revenue. The single highest-leverage action is resolving the Supabase access gap, which independently unblocks security merge-readiness, Predicta's exit-gate assessment, and every commercial metric this audit needs.

### Commercial gate

```
UNVERIFIED — cannot responsibly select FREEZE through SCALE without current
revenue/engagement data. Defaulting to the most conservative stated posture,
CONTROLLED_PILOT, is a placeholder pending real numbers, not a measured
recommendation.
```

### Commercial scoreboard

Not populated — no clean external dataset accessible this pass (Growth Analytics blocked).

### Product activation funnel

Not populated — same blocker.

### Accuracy scorecard

Not re-run this pass — see [[quantis_predicta_evidence_charter]] and existing `quantis_accuracy_audit_charter` memory for the last full pass (P0-01..P0-22 register, dated 2026-07-22, now 23 days stale per §6 and due for refresh, not reused as current here).

### Predicta scorecard

`PREDICTA_STATE = NOT_READY` (Phase 0 only, see `docs/predicta/2026-08-14/CUTOVER_GATE.md`, same session).

### Revenue diagnosis

Acquisition/activation/retention/monetization/billing: all `UNVERIFIED` this pass.

### Seven-day actions (max 10)

1. Resolve Supabase MCP access to `dmlxrvfyqsakyjomsvdj` — unblocks 6+ downstream items below and two other open threads (Track A, Predicta).
2. Merge PR #28 (Track A) once founder review + production apply is approved.
3. Unblock PR #26 — recover Docker/WSL2 locally or run its pgTAP suite on any machine/CI runner with working Docker, then add the missing `SUPABASE_DB_URL` CI secret.
4. Once DB access exists: run a fresh Stripe-to-Supabase reconciliation for real current MRR/cash/subscriptions — do not reuse the Aug 10 figure.
5. Once DB access exists: pull the real canonical funnel (qualified visit → payment → repeat payment) for the current cohort.
6. Add `supabase/tests/database/` RLS/pgTAP coverage to `main` as soon as PR #26/#28 merge — closes P1-A.
7. Triage the 5 simultaneously-diverging branches — merge, close, or explicitly schedule each; don't let a 6th start before at least one closes.
8. Founder: report current sales/UX/CS activity directly (calls, replies, real client cases) — not obtainable from the repo.
9. CMO/Claims pass on all externally visible copy against the §4 contract and §21 do-not-sell list — not started this pass.
10. Define `MAX_EVIDENCE_P95_MS` / `MAX_EVIDENCE_COST_USD_PER_RUN` / `MAX_PROVIDER_TIMEOUT_RATE` budget variables so Predicta Domain Q can ever have a real gate (currently `COMMERCIAL_BUDGET_UNDEFINED`, per Predicta charter §23).

### Stop-building list

- No new Predicta test-domain execution until the Supabase access gap closes — Domains K/N/O/P/Q are all blocked on it, and starting them now would just produce more `UNVERIFIED` rows, not new evidence.
- No new feature branches on top of the 5 already-open ones until at least one merges — matches the charter's own §26 conflict rule (commercial demand decides non-safety feature priority) and this session's own evidence that branch divergence has already cost real rework once (E5.5).

### Single next action

Resolve Supabase MCP access to project `dmlxrvfyqsakyjomsvdj`. It is the one item every other blocked row in this audit, Track A's production verification, and Predicta's Phase 0 exit-gate all depend on simultaneously.

### Machine-readable record

```json
{
  "as_of": "2026-08-14",
  "production_sha": "741bbbe7a198f88e8ce4b4d1afae29be69032327",
  "commercial_gate": "UNVERIFIED",
  "revenue": {
    "cash_collected": null,
    "mrr": null,
    "verified_paying_external_users": null
  },
  "engagement": {},
  "gtm": {},
  "accuracy": {},
  "predicta": {
    "state": "NOT_READY",
    "cutover_verdict": "KEEP_OFF"
  },
  "security": {
    "p0_open": 2,
    "p0_fixed_pending_merge": 1,
    "p0_pending_infra_unblock": 1,
    "rls_regression_coverage_on_main": false
  },
  "billing": {},
  "p0": [
    "get_referral_stats(uuid) anonymous fail-open -- fix on PR #28, unmerged",
    "10-table effective-access exposure -- remediation on PR #26, unmerged, blocked on Docker/CI infra"
  ],
  "p1": [
    "zero RLS/pgTAP regression coverage on main",
    "revenue/billing state unverified since at least 2026-08-10",
    "5 branches diverging from main simultaneously"
  ],
  "unknowns": [
    "current MRR/ARR/cash collected",
    "verified external paying users",
    "current activation/retention funnel",
    "Stripe webhook health as of today",
    "whether any evidence-service migration has reached production",
    "sales/UX/CS activity this week"
  ],
  "next_action": "Resolve Supabase MCP access to project dmlxrvfyqsakyjomsvdj"
}
```
