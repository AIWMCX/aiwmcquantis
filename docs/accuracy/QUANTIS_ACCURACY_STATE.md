# AIWMC Quantis — Accuracy Program State Ledger
Maintained per Master Prompt v3 §7. Read this first at the start of every accuracy session.

## Session: 2026-07-21 (this session) — ACTIVATE: DISCOVERY

### Work completed
- Read Master Prompt v3 in full; confirmed it supersedes/extends the same-day v2.0 accuracy package already committed at `752c8c13`.
- **Key finding: do not re-run Session 1 (Reality Map) from scratch.** `docs/accuracy/AIWMC_QUANTIS_ACCURACY_PACKAGE_v2.0_2026-07-21.md` already is a rigorous, evidence-labeled (VERIFIED/DOCUMENTED/INFERRED/MISSING) production reality map with real DB row counts, deployed function versions, and a P0-P4 sequenced plan. Treat it as the current baseline; verify specific claims before acting on them, don't duplicate the whole exercise.
- Verified 3 commits landed **after** the v2.0 package was written, same day:
  - `2e43dfd5` — canonical business-archetype registry (`src/config/business-archetypes.ts` + Deno-ported twin). Classifies 6 revenue archetypes with an honest `engineFit` rating against the live MRR-shaped engine; explicitly documents that `capacity_constrained_service` has **no capacity-ceiling mechanism anywhere in the live engine** (verified by direct grep, not assumed). This is a **partial** step toward v2.0 package's P0-8 ("generic revenue model applicability") — the classifier/registry half is now real; the "per-archetype formulas" half is still open.
  - `71e7c594` + `6cbbced6` — reconciled migration filenames against what Supabase's Management API actually stamped as their applied version (root cause: `apply_migration` assigns its own call-time version, ignoring the filename's intended version, so `supabase db push` saw "remote versions with no local file" and failed every time).
- **Confirmed via `gh run list`: CI green, Production Deploy succeeded, Deploy Smoke Test succeeded**, all within hours of this session. Cross-referenced: `3cb71c55` "fix(ci): commit missing qoc-tracer.ts" — the exact file named as CI's root cause in the prior `quantis_deploy_freeze_incident` memory (dated 2026-07-01) — is now committed.
- **This resolves the standing deploy-freeze incident.** Backend/migrations are no longer frozen at `af2ec01b`; the freeze is over as of this session. The `quantis_deploy_freeze_incident` and `quantis_accuracy_audit_charter` memories are stale on this point and have been corrected (see below).
- Verified via grep: the "95,500 vs 97,500 vs actual Monte Carlo iteration count" claim conflict is **real and still open** (`VERIFIED—P0` in the v2.0 package itself, dated today) — this directly contradicts the `quantis_accuracy_audit_charter` memory's claim that "no 95,500 mismatch remains." That memory was wrong or based on stale evidence; corrected.

### Evidence created
- This state ledger file (new).
- Corrected two persistent memory files (see "Memory corrections" below).

### Files changed
- None yet (read-only discovery session so far, per ACTIVATE: DISCOVERY mode).

### Unresolved defects (per v2.0 package, still open as of this session — re-verify before acting)
All P0-1 through P0-8 in `AIWMC_QUANTIS_ACCURACY_PACKAGE_v2.0_2026-07-21.md` §7 remain open except where noted above. Highest-leverage open items, in the package's own priority order:
1. P0-1: legacy `999` payback sentinel still load-bearing in the returned contract (typed result exists but is non-fatal cross-check only).
2. P0-2: Monte Carlo claim/implementation mismatch (10,000 browser cap vs "95,500" in tier spec/prompts/copy) — still unresolved after today's commits.
3. P0-3: RVCE not proven in saved analyses (0/90 analyses have `rvce_status`).
4. P0-4: QOC not load-bearing (0 rows in `qoc_audit_envelopes`).
5. P0-5: accuracy harness broken (`golden_test_vectors`/`accuracy_runs` tables absent) — `docs/accuracy/quantis_accuracy_migration_proposal.sql` already drafted, not yet applied.
6. P0-6: benchmark sample sizes (230/180/95) and dates are hardcoded in the renderer, not derived from the actual selected row set.
7. P0-7: zero outcome rows — no calibration possible yet.
8. P0-8: generic revenue model — registry/classifier now real (this session's finding), per-archetype formulas still absent.

### Decisions requiring founder approval
- None triggered this session (pure read-only discovery; no destructive/deploy/claim-change actions taken).

### Rollback instructions
- N/A — no code changes made this session.

### Next activation command
**`ACTIVATE: P0_STABILIZATION`**, scoped first to P0-2 (the benchmark/Monte-Carlo claim conflict) — it's the cheapest to close (a copy/config change, not a new engine) and it's the exact item both the charter memory and this fresh evidence disagree about, so closing it converts an open question into a verified fact. P0-1 (999 sentinel) is the next-highest-leverage item after that, since the typed replacement already exists and "wiring" is smaller than the P0-3/4/5 items which need new persistence/tables.

## Memory corrections made this session
- `quantis_deploy_freeze_incident`: superseded — freeze resolved, `qoc-tracer.ts` committed (`3cb71c55`), CI/deploy/smoke all green as of 2026-07-21.
- `quantis_accuracy_audit_charter`: "No 95,500 mismatch remains" claim corrected — the conflict is real and still open per today's own v2.0 accuracy package.
