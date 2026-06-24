# CLAUDE.md — QOC Integration Brief (for Claude Code)

You are integrating the **Quantis Orchestration Core (QOC)** into the live repo
`aiwmcquantis-main`. This is a governance layer that wraps the existing
deterministic engine. Read this entire file before editing anything.

## Non-negotiable constraints
1. **Do NOT modify or reimplement the deterministic engine or Monte Carlo.**
   QOC only *calls* it. The deterministic engine runs first and is the only code
   allowed to produce financial numbers. If you find yourself computing a dollar
   figure inside any `qoc/*` file, stop — that is a bug.
2. **Do NOT add Foundation branding, acid green `#8FFF2A`, or `aiwmc.space`**
   anywhere. QOC is server-side only and has no UI surface.
3. **The CI gate (`.github/workflows/qoc-gate.yml`) must stay green.** Never
   weaken `scripts/qoc-structure-check.sh` to make a build pass. If you wire a
   seam, update the corresponding check in the *same* PR — that ceremony is
   intentional.
4. **One finishable thread.** Wire the seams, run the gate, open one PR. Do not
   also touch SEO, prerender, autoposter, or CRM in this PR.

## What QOC is
A Supabase Edge Function `qoc-orchestrate` that runs:
```
preflight (validate + classify + hard-block)
  → dedupe (idempotency + burst throttle)
    → [EXISTING DETERMINISTIC ENGINE]   ← you wire this
      → narrate (tier-routed: deepseek/haiku/sonnet/opus)   ← you wire this
        → verify (RVCE / Tavily)   ← you wire this
          → compose one audit envelope (per-stage timed, costed, traced)
```
Short-circuits (engine never runs, $0 spent, audit row still written):
missing idea, prompt-injection, out-of-scope enterprise, idempotent duplicate,
burst throttle.

## The three seams to wire (all in `adapters.ts`)
Each currently throws `NotWired`. Replace each throw with a call to the REAL
existing capability in `aiwmcquantis-main`:

### Seam 1 — `runEngineAdapter`
Call the existing deterministic analyze module/function. Pass through the
request plus `pf.sector` and `pf.confidence_band` so benchmark routing can use
them. Return whatever the engine already returns (treated as opaque by QOC).
Locate it by searching the repo for the current analyze entrypoint (e.g.
`functions/analyze`, Monte Carlo runner, or the 8-layer pipeline orchestrator).

### Seam 2 — `narrateAdapter`
Call the existing model clients. QOC already decided the tier:
- `deepseek` → `deepseek-v4-flash`
- `haiku` → Claude Haiku
- `sonnet` → Claude Sonnet
- `opus` → Claude Opus (Plus adversarial validation)
Operate ONLY on the `report` object (the deterministic numbers). Return
`{ text, cost_usd, variants? }`. Compute `cost_usd` from real token usage.

### Seam 3 — `verifyAdapter`
Call the existing **RVCE (Layer 8)** + Tavily cross-check. This is a *rename* of
existing capability into a QOC stage, not new logic. Return per-claim verdicts
`{ claims: [{text, verdict, sources}], overall, cost_usd }`. Map RVCE's existing
verdicts onto `PASS | PARTIAL | FAIL`.

After wiring each seam, change its structure-check line in
`scripts/qoc-structure-check.sh` from asserting `class NotWired` to asserting the
real call (e.g. `analyzeDeterministic`, the model client name, `rvce`).

## Install steps
1. Copy `supabase/functions/qoc-orchestrate/` into the repo's `supabase/functions/`.
2. Apply `supabase/migrations/20260623_qoc_audit.sql`.
3. Copy `tests/qoc.test.ts`, `scripts/qoc-structure-check.sh`,
   `.github/workflows/qoc-gate.yml`, `deno.json`.
4. Wire the three seams (above).
5. Run locally: `deno test --allow-none tests/qoc.test.ts` and
   `bash scripts/qoc-structure-check.sh`. Both must pass.
6. Point the frontend's analyze call at `qoc-orchestrate` instead of the raw
   analyze function. The response shape adds `traces`, `overall_verdict`,
   `total_cost_usd`; the existing report lives at `response.report.engine`.
7. Deploy: `supabase functions deploy qoc-orchestrate`. Set env
   `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (function secrets).

## Acceptance (must all hold before merge)
- `deno test` → 11/11 pass.
- Structural gate → pass.
- A real analysis through `qoc-orchestrate` returns `overall_verdict: PASS` with
  five stage traces and the existing report intact under `report.engine`.
- Sending the same analysis twice returns `short_circuit.at = dedupe` the second
  time with `total_cost_usd: 0`.
- An idea containing `ignore previous instructions` returns `HARD_BLOCK`, 422,
  and the engine never runs (check logs: no engine trace).

## Why this matters (context, do not skip)
Quantis sells **auditability**. QOC makes that literal: every request now carries
a durable, per-stage, costed, verdict-stamped trace. It also prevents system loss
(no spend on malformed/duplicate/abusive requests) and stabilizes margin ahead of
the 2026 seed round. Keep it boring, correct, and fail-closed.
