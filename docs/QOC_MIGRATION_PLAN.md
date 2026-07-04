# QOC Migration Plan — Shadow → Canary → Full

**Goal:** make the `/methodology` page's description of QOC (Quantis
Orchestration Core) literally true for real production traffic, without ever
putting the live revenue path at risk to get there.

## Why this document exists

On 2026-07-02 the Methodology page shipped a section describing QOC
(`supabase/functions/qoc-orchestrate`) as the orchestrator coordinating every
analysis through 5 stages (preflight → dedupe → engine → narrate → RVCE
verify). Live verification immediately after shipping found that claim false:

- `qoc_audit_envelopes` (QOC's own audit table) had 0 rows, ever.
- Nothing in `src/` (frontend) or in `analyze-business` / `analyze-plus` /
  `analyze-pro-extension` / `analyze-pro-worker` calls `qoc-orchestrate`.
- The function real analyses run through is `analyze-business` — a separate,
  older, self-contained implementation with its own guardrails
  (`ai-safety-guardrails.ts`), its own engine (`financial-engine.ts`), and its
  own output firewall (`validateAIOutput`).
- RVCE does run for real users, but as an independent client-invoked call
  (`src/engine/rvce/rvceService.ts`), not as a QOC-coordinated stage.

The Methodology copy was corrected the same session to describe what's
actually live, with an honest "in development" line for QOC. This document is
the plan to make that line stop being true — by actually proving QOC belongs
in the live path, in stages, with a rollback available at every one of them.

**Non-negotiable constraint:** at no stage does a real user's response depend
on `qoc-orchestrate` succeeding, until Stage 4 is explicitly signed off after
Stage 3's bake period. `analyze-business` remains the source of truth for
what the user sees through every earlier stage.

## Stages

| Stage | What ships | User-facing risk | Status |
|------:|-----------|-------------------|--------|
| 1 | **Shadow mode.** `analyze-business` fires a non-blocking, error-swallowed parallel call to `qoc-orchestrate` after building the real response. Real audit rows accumulate in `qoc_audit_envelopes` from real traffic. Zero effect on what any user receives. | None — the call cannot throw into the response path, is never awaited before `return`, and a failure is invisible to the caller. | ✅ Shipped 2026-07-02 |
| 2 | **Parity analysis.** Compare `qoc-orchestrate`'s engine output against `analyze-business`'s output for the same shadowed requests. Any discrepancy in a financial figure is a P0 bug in QOC — it must reproduce `analyze-business`'s numbers exactly, since both wrap the same class of deterministic math. | None — read-only analysis of Stage 1's logged data. | TODO — needs ≥200 shadow rows across a mix of sectors/locations before conclusions are meaningful (see Bake Period below) |
| 3 | **Canary rollout, response-visible.** Behind a server-side feature flag (per-user allowlist or % rollout, resolved from a config table — not a client-supplied header), a small slice of *authenticated Free-tier* requests get their actual response built from `qoc-orchestrate`'s output instead of `analyze-business`'s. Everyone else is unaffected. Instant rollback = flip the flag. | Real, but bounded to the canary slice and instantly reversible. | TODO |
| 4 | **Full Free-tier rollout.** Canary expands to 100% of Free tier once Stage 3's error rate, latency, and cost-per-request are equal-or-better than `analyze-business` for ≥2 consecutive weeks. | Real, full tier. | TODO |
| 5 | **Plus/Pro rollout.** Same canary→full pattern, applied to `analyze-plus` / `analyze-pro-extension` / `analyze-pro-worker` call sites. Higher bar: these are paying customers. | Real, full tier. | TODO |
| 6 | **RVCE becomes a true QOC stage.** Today RVCE is invoked independently by the client. Once QOC is the live path for 100% of traffic, move the RVCE call server-side into `qoc-orchestrate`'s `verify` stage so it's part of the one audit trace instead of a second client-initiated request. | Changes RVCE's failure mode from "client retries independently" to "part of the orchestrated request" — needs its own explicit sign-off, not bundled into Stage 5. | TODO |
| 7 | **Update `/methodology`.** Only after Stage 6, rewrite the architecture section to describe QOC as the live coordinator again — this time because it's true, with the same live-verification discipline used to catch the original inaccuracy. | None — copy change. | TODO |

## Bake period definition (blocks Stage 2 → 3)

Do not promote from Stage 1 to Stage 3 on vibes. Concretely:

- ≥200 shadow-mode rows in `qoc_audit_envelopes` spanning at least 5 distinct
  detected sectors.
- Zero financial-figure discrepancies between `qoc-orchestrate`'s engine
  output and the corresponding `analyze-business` response for the same
  request (exact match required — these should be the same deterministic
  math, just reached through different code paths as of Stage 1).
- `qoc-orchestrate`'s p95 latency for the engine+narrate+verify path is
  documented (it doesn't need to beat `analyze-business` yet — Stage 3 is a
  canary specifically to observe this under load — but it must be known
  before flipping any real traffic to it).

## Rollback mechanics

- **Stage 1:** nothing to roll back — shadow calls have no user-facing
  effect. Worst case, disable by reverting the `analyze-business` commit
  that added the shadow block.
- **Stage 3+:** the canary flag must be a server-resolved value (DB config
  or env var checked in the edge function), never a client-supplied header
  or query param — a client-controlled flag would let anyone opt into or
  out of QOC, which defeats the point of a controlled canary and is also a
  forged-entitlement-shaped risk. Rollback = flip the flag back to 0%; no
  deploy required if the flag is DB-backed.

## Current state (2026-07-02)

Stage 1 shipped. See `supabase/functions/analyze-business/index.ts`, the
block comment `QOC Shadow Mode (docs/QOC_MIGRATION_PLAN.md, Stage 1)`.
`qoc_audit_envelopes` will begin accumulating real rows as authenticated
users run analyses — anonymous/unauthenticated requests are not shadowed in
this stage (no bearer token to authenticate `qoc-orchestrate`'s own
`sb.auth.getUser()` call), which is an intentional, documented Stage 1
coverage gap, not a bug.
