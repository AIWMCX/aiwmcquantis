# AIWMC Quantis — Genesis Protocol Execution Plan (P1–P5)

This plan supersedes the prior audit step-list (Steps 1–4 are shipped and green).
It executes the Genesis Protocol — the *ceiling*, not the floor — across five
sequenced phases. Every phase ends with a binary acceptance test that runs in
CI. We do not advance until the prior phase's gate is green on `main`.

Status legend: `🟡 in-progress · 🟢 green · ⚪ pending`

---

## Phase 1 — Bedrock 🟢

Outcome: every LLM response is **structurally provable**, every engine output
is **regression-pinned to 25 canonical fixtures**, and every paid AI call is
**logged with cost in USD** so we can answer "how much did this analysis cost
us?" by primary key.

Shipped:
- `supabase/functions/_shared/r3-validator.ts` + `src/lib/r3-validator.ts` (mirror)
- `src/__tests__/r3-validator.test.ts` (162 assertions)
- `src/__tests__/engine-regression-25.test.ts` (25 fixtures, ENGINE_VERSION pinned)
- `src/lib/ai-cost-log.ts` (read-helper + `summarizeByEndpoint` + `listEndpoints`)
- `/admin/ai-costs` page (filters: time range × task)
- `scripts/verify-ai-cost-logging.ts` (CI guard)
- `scripts/verify-r3-enforcement.ts` (CI guard, with shrinking `MIGRATION_ALLOWLIST`)
- `src/__tests__/r3-enforcement-integration.test.ts` (mirrors the CI script
  inside `bun run test:quality`)

Acceptance (green on CI):
- `bun run test:quality` includes `r3-validator.test.ts`,
  `engine-regression-25.test.ts`, and `r3-enforcement-integration.test.ts`.
- `scripts/verify-ai-cost-logging.ts` and `scripts/verify-r3-enforcement.ts`
  both exit 0.

---

## Phase 2 — Determinism 🟡

Outcome: the same input → the same output, byte-for-byte, across two
consecutive runs. Removes LLM nondeterminism from anything user-facing
that claims to be a *calculation*.

Shipped:
- `supabase/functions/_shared/llm-determinism.ts` —
  `deterministicLlmParams(requestId)` returns the canonical
  `{ temperature: 0, top_p: 1, seed: fnv1a(requestId) }` triple.
- `scripts/verify-determinism.ts` — re-runs the 25-fixture engine suite
  twice, compares JSON byte-for-byte (volatile fields stripped).
- CI gate `Verify engine determinism` wired into `.github/workflows/ci.yml`.
- `.github/workflows/deploy-smoke-test.yml` — runs after Production Deploy,
  calls every critical edge endpoint and validates the response body
  against the R3 boundary schemas. Fails non-zero on contract mismatch.
- `scripts/smoke-test-endpoints.ts` — invoked by the smoke workflow.

In progress:
- Migrate `analyze-plus`, `analyze-pro-extension`, `ai-narrator`,
  `ai-consensus`, `rvce-validate`, `generate-idea` to import
  `llm-determinism` for their validator / consensus calls (R3 already
  shrinks the allowlist as each is wired).
- Lint rule rejecting LLM-authored numeric values in `metadata.*`.

Acceptance: `verify-determinism.ts` exits 0 on `main`; the lint rule lands
in Phase 2.5 before P3 starts.



---

## Phase 3 — Auditability ⚪

Outcome: every analysis ships with a reproducible audit trail — a single
URL renders the inputs, the engine version, the benchmark dataset version,
every LLM call (model, tokens, cost, latency), and the R3 verdict.

Deliverables:
- `analysis_audit_trail` view that joins `analyses` × `ai_calls` ×
  `benchmark_governance` × `r3_verdicts`.
- `/analysis/:id/audit` page (admin-only, gated by `has_role(admin)`).
- PDF export gains a `Methodology & Audit` appendix linking to the trail.

Acceptance: opening any analysis ID returns an audit page where the sum
of `ai_calls.cost_usd` matches the analysis's recorded cost field
±$0.0001.

---

## Phase 4 — Defensibility ⚪

Outcome: the moat is the data + the math, not the prompt. Every
benchmark citation is traceable to a source, a date, and a licence.

Deliverables:
- Enforce `BenchmarkRecordSchema.source` and `dataset_date` as
  non-nullable in `boundary-schemas` (currently nullable).
- `scripts/verify-benchmark-provenance.ts` blocks merges if any
  benchmark row lacks a non-empty `source` + ISO `dataset_date`.
- Public `/methodology/datasets` page generated from
  `benchmark_governance` at build time.

Acceptance: 100% of returned benchmarks carry source+date; provenance
guard is green in CI.

---

## Phase 5 — Trust Surface ⚪

Outcome: the user can see *why* the verdict is what it is, at the
granularity of a single number, without leaving the result page.

Deliverables:
- "Explain this number" affordance on every metric tile — opens a panel
  showing inputs, formula (from `formula-registry`), benchmark band used,
  and the R3 verdict for the LLM narration tied to that metric.
- Confidence chip per metric (Tier A / B / C) from
  `confidence-scorer.ts`.
- Live A/B counter: % of users who clicked "Explain" in the last 7 days,
  surfaced on the admin Funnel page.

Acceptance: every metric on the result page exposes "Explain"; clicking
it never makes a network request (data already on the page).

---

## Sequencing rule

P1 → P2 → P3 → P4 → P5. No phase starts until the prior phase's CI
acceptance gate is green on `main` for 48 hours. A red gate blocks all
forward work; the only allowed PRs are gate-restoration.
