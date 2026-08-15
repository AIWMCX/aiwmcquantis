# Cutover Gate — Predicta Phase 0 Snapshot

Tracks charter §26 (shadow-mode exit gate) and §27 (RVCE load-bearing cutover gate) conditions. **This is a Phase 0 snapshot, not a gate evaluation** — most conditions require test-domain execution that hasn't happened yet.

## Executive verdict (charter §30.A)

```
PREDICTA_STATE = NOT_READY
```

Reason: only Phase 0 (baseline freeze) is complete. No test domain has been executed. `NOT_READY` is the only honest state — the branch is CODE_VERIFIED dormant-by-construction, which is a necessary but nowhere near sufficient condition for `SHADOW_READY`.

## §26 — Shadow-mode exit gate

| Condition | Status |
|---|---|
| Migration lineage is known | **PARTIAL** — 16/18 evidence-adjacent migrations reconciled in a prior session (per memory); 5 items still need direct DB queries, unresolved this pass |
| RLS passes | **NOT ASSESSED** — Domain N blocked on production access |
| No current P0 security finding affects its data path | **NOT ASSESSED** |
| Deterministic parity is 100% | **NOT ASSESSED** — Domain B not executed |
| Sensitive-data gate passes | **NOT ASSESSED** — Domain M not executed |
| Provider failures degrade safely | **NOT ASSESSED** — Domain D not executed |
| Evidence packets persist reproducibly | **NOT ASSESSED** — needs production access |
| Idempotency passes | **PARTIAL, CODE_VERIFIED only** — `evidence_run_key` unique-constraint migration exists and is well-reasoned (SHA256 of analysisRunId+planVersion+schemaVersion, DB-enforced unique index); real concurrent-worker race testing (Domain O) not executed |
| Telemetry is truthful | **NOT ASSESSED** — needs per-metric IMPLEMENTED/PARTIAL/PLACEHOLDER/NOT_IMPLEMENTED classification (§22), not done this pass |
| Feature flag and kill switch work | **PARTIAL, CODE_VERIFIED** — flag exists and defaults to a safe no-op (`EVIDENCE_SERVICE_SHADOW_ENABLED !== 'true'` → skip); not tested against a real toggle in a real environment |
| No customer result changes because shadow is enabled | **NOT ASSESSED** — this is exactly what Domain B (deterministic parity) exists to prove, not executed |

**§26 verdict: not met.** Most rows are NOT_ASSESSED, not FAILED — the distinction matters (charter §30.F: "never hide inaccessible systems"), but NOT_ASSESSED cannot satisfy a gate either.

## §27 — RVCE load-bearing cutover gate

Not evaluated. Cutover requires shadow-mode exit first (§26), which is not met. Per charter: **"Otherwise: KEEP_SHADOW_MODE."** Since shadow mode itself hasn't been entered yet (flag unset everywhere, per CURRENT_EVIDENCE_SERVICE_STATE.json), the honest state is a level below `KEEP_SHADOW_MODE` — call it `PRE_SHADOW`.

## Cutover verdict (charter §30.G)

```
KEEP_OFF
```

Nothing in this Phase 0 pass provides grounds to enable shadow mode yet — that requires Domain B (deterministic parity) at minimum, plus resolving the production-access blocker so the exit-gate conditions can actually be assessed rather than left as NOT_ASSESSED.

## Single next action (charter §30.H)

Resolve the Supabase project-access gap (`dmlxrvfyqsakyjomsvdj` — see `KNOWN_GAPS.md`). It is the dependency-controlling blocker for the majority of unmet §26 conditions and for 5 of the 6 remaining E5.5 migration-lineage confirmations. Everything else in this gate can move in parallel (Domain B/A/C/F/I/L/M can start without it), but this is the one item every other blocked row depends on.
