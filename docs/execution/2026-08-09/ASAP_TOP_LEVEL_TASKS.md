# AIWMC Quantis — ASAP Top-Level Task List

Date: 2026-08-09. Distilled from the 7-Day Consolidated Execution Package
directive, reconciled against what has actually happened on
`security/p0-effective-access-control` today (6 branch-local commits,
nothing pushed/merged). Ordered by real dependency, not by document order —
Predicta stays last because the directive's own Section 9 says so, and
because nothing above it is safe to build on top of yet.

---

## DONE today — do not re-do these

| # | Task | Evidence |
|---|---|---|
| ✅ | Phase 0 — freeze current truth (`CURRENT_PRODUCTION_STATE.json`, `EVIDENCE_LEDGER.md`, `OPEN_DEFECTS.md`, `IMPLEMENTATION_SEQUENCE.md`) | Commit `f6fc471a` and earlier |
| ✅ | PUB-1 — fail-closed publication gate for `report_integrity=BLOCK` (Workstream/Phase 4) | Server-side gate in `share-report/index.ts` + client-side gating in `AnalysisResults.tsx`. Commit `f6fc471a` |
| ✅ | MON-1 — SEO Live Monitor diagnosed | Ran `verify-live-production.sh` directly against prod: PASS on every assertion. Monitor's red status is 100% the GitHub billing lock, not a real regression |
| ✅ | PR #27 dead-code trap found and fixed | The React-PDF component family PR #27 patched is unreachable from any user action; deleted (11 files), live `usePdfExport.ts` and `ViralCard.tsx` fixed directly instead. Commit `1656d268` |
| ✅ | Workstream 1 — canonical readiness record, 6 corrected-language items | Commit `31aa2692` |
| ✅ | Workstream 2 — function access matrix + NULL-safe-predicate audit | Confirmed `get_referral_stats`'s exact fail-open bug and 3 functions with zero ownership check, first-hand from source. Commit `cae48dc5` |

---

## BLOCKED — waiting on you, not on more engineering

| # | Blocker | Who unblocks it | What it's blocking |
|---|---|---|---|
| 1 | **GitHub Actions billing lock** (`AIWMCX` account) | You — update payment at `github.com/settings/billing/payment_information` | Isolated CI test run for PR #26 (migration replay, pgTAP, cross-identity matrix, rollback rehearsal) — the evidence needed before merge can even be requested |
| 2 | **Local Docker/WSL2 failure** | You (or accept it stays broken; GitHub Actions was the designated workaround, see blocker 1) | Same as above, alternate path |
| 3 | **Supabase DB MCP permission loss** (new today, mid-session) | Unclear — may self-resolve, may need you to check the MCP connection's scope | Any further live production DB query this session |
| 4 | **Scope decision**: fold the referral/invoice NULL-safe fixes into PR #26's migration, or ship as a separate follow-up? | You | Whether Workstream 2's findings become code today or later |

---

## NEXT, IN ORDER — once blocker 1 clears (or you choose to proceed without it)

1. **Close PR #26** (Phase 1 / Workstream 1 of the master directive). This is
   the actual release blocker — nothing else on this list matters if this
   doesn't close. Sequence once CI is available: migration replay → pgTAP →
   cross-identity matrix → rollback rehearsal → merge → apply → re-run the
   original anonymous HTTP probes → record deployed SHA.
2. **Fold in the NULL-safe fixes** from today's Workstream 2 matrix
   (`get_referral_stats`, `complete_referral_signup`,
   `generate_referral_code`, `get_next_invoice_number`) — pending your answer
   to blocker 4 above.
3. **QOC-1's final proof** (Phase 6). Three candidate failure points are
   identified (auth resolution, SDK header-forwarding, platform `verify_jwt`
   gate) but not isolated. Needs a real login-based reproduction — either you
   run one authenticated analysis and I trace the logs live, or this waits
   for the isolated CI in step 1.
4. **PR #27 merge** (Phase 3), now that its dead-code trap is fixed and the
   live PDF/share-card actually reflect honest labeling. Still needs: fresh
   production analysis → locked-payload/UI/PDF parity check.
5. **BILL-1 — Stripe test-mode E2E** (Phase 5). Nobody has run a supervised
   checkout → webhook → entitlement → cancel lifecycle end-to-end. 24 live
   active/trialing subscriptions exist with this path never verified.
6. **CSP / analytics cleanup** (rest of Phase 2). Two out-of-sync CSP sources
   silently block the documented GA4/GTM analytics stack while an unused
   PostHog reference sits harmlessly allowlisted — diagnosed in an earlier
   round, not yet fixed in code.

---

## LAST, EXPLICITLY GATED — Predicta Evidence Service (Phases 7-10)

Do not start this until items 1-6 above are closed. The directive's own
Section 9 makes this the first instruction, not an afterthought: shipping a
richer evidence-retrieval system into a database with an open unauthorized-
access finding increases the attack surface before the attack surface is
closed. When the gate opens:

- Build `ProviderCapabilityRegistry` + the four data contracts
  (`EvidenceSource`, `EvidenceClaim`, `NumericObservation`,
  `QuantisEvidencePacket`) exactly as specified.
- Shadow-mode only — deterministic financial output must be provably
  identical with the evidence service ON or OFF.
- Do not let a retrieved number reach the canonical payload without full
  provenance + user/policy approval (Phase 8's numeric firewall).
- Build the 100-question evaluation corpus (Phase 9) before any cutover
  conversation — promote from measured evidence quality, not from the
  architecture looking elegant.
- The 10-point cutover checklist in Phase 10 is a hard gate, not a
  checklist to rush: every item on it depends on items 1-6 above already
  being true.

---

## The one thing to actually decide right now

Everything blocked above traces back to one non-engineering action: **update
GitHub billing.** Every other blocker either depends on that or is a smaller
scope call (item 4) that takes one sentence to answer. Once billing clears,
PR #26 can close within the same session, and items 3-6 unblock in sequence
behind it.
