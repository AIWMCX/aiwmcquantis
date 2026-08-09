# Implementation Sequence — 2026-08-09

Per the directive: Predicta/evidence-service work does not start until Phases 1-6
(security, monitoring, confidence semantics, publication safety, billing, QOC decision)
are closed. This file tracks what's actually actionable right now given the two
confirmed infrastructure walls (INFRA-1: GitHub Actions billing lock; INFRA-2: local
Docker/WSL2 failure).

## Immediately actionable without CI or production mutation

1. **QOC-1 isolation (Phase 6 prep).** Manually reproduce a single `qoc-orchestrate`
   HTTP call directly (not via `analyze-business`), using a real user's bearer JWT
   obtained through normal login, to determine which of the three candidate failure
   points (auth.getUser() resolution, SDK header-forwarding, platform verify_jwt gate)
   is the actual cause. This requires no CI and no production mutation — it's a read-only
   diagnostic HTTP call. Needs either a real test-account login flow or founder-supplied
   test credentials.
2. **PUB-1 code inspection (Phase 4 prep).** Read the report display/download boundary
   to confirm/refute whether `report_integrity=BLOCK` can currently reach the customer
   as an apparently-successful report. Read-only, no CI needed.
3. **MON-1 re-check (Phase 2 prep).** Determine whether SEO Live Monitor runs via
   GitHub Actions (in which case INFRA-1 is the explanation and nothing further can be
   done until billing unlocks) or via another mechanism (in which case it needs
   independent diagnosis).
4. **PR #27 diff review (Phase 3 prep).** Re-diff `accuracy/confidence-semantics-split`
   against current `main` head (`97540bc7`) to confirm it still applies cleanly and
   inventory `confidence_score` consumers, without merging.

## Blocked on founder action

- **INFRA-1 (GitHub Actions billing lock).** Founder must update payment info at
  github.com/settings/billing/payment_information. Blocks: Phase 1's isolated CI
  verification (migration replay, pgTAP, cross-identity matrix, rollback rehearsal),
  any GitHub-Actions-based Phase 2 monitor, `db-security-invariant.yml` on future PRs.
- **BILL-1 (Stripe E2E).** Needs either founder-run test-mode checkout or founder
  authorization for the agent to execute one in test mode.

## Blocked on INFRA-1 specifically (cannot proceed until billing unlocks, no alternative)

- Phase 1 full closure of PR #26 (SEC-1, SEC-2) — the directive requires isolated
  test evidence before merge; that evidence can only come from the GitHub-hosted
  workflow given local Docker is separately down (INFRA-2).
- Phase 1 acceptance criteria: "original P0 reproduction no longer works" (post-deploy
  proof) — cannot be attempted before merge/apply, and merge/apply cannot happen
  before isolated verification passes, per the directive's own ordering.

## Explicitly deferred (correct per directive, not neglected)

- Phase 7-10 (Predicta Evidence Service v0, numeric firewall, shadow evaluation,
  cutover decision) — not started. No code exists yet. This is intentional: Phase 0's
  own finding (RED verdict stands, P0 security still open) is exactly the condition
  under which the directive says not to begin this work.

## Immediate next action

Proceed with item 1 above (QOC-1 isolation via direct `qoc-orchestrate` HTTP call)
as the highest-value unblocked diagnostic — it directly serves the Phase 6 decision
and requires no infrastructure that is currently down. Report back with the exact
failure point once isolated, then proceed to PUB-1 and MON-1.
