# AIWMC Quantis — Genesis Protocol Execution Plan (P1–P5)

This plan supersedes the prior audit step-list (Steps 1–4 are shipped and green).
It executes the Genesis Protocol — the *ceiling*, not the floor — across five
sequenced phases. Every phase ends with a binary acceptance test that runs in
CI. We do not advance until the prior phase's gate is green on `main`.

Status legend: `🟡 in-progress · 🟢 green · ⚪ pending`

---

## Phase 1 — Bedrock 🟡

Outcome: every LLM response is **structurally provable**, every engine output
is **regression-pinned to 25 canonical fixtures**, and every paid AI call is
**logged with cost in USD** so we can answer "how much did this analysis cost
us?" by primary key.

Deliverables:

1. **Zod-enforced structured outputs at every LLM boundary.**
   Existing: `supabase/functions/analyze-business/boundary-schemas.ts` already
   gates the HTTP boundary. Extend to every internal LLM call (narrator,
   risk_flags, action_plan, consensus_check) with per-task Zod response
   schemas. Any parse failure is a typed error, never a silent string.
   File: `supabase/functions/_shared/llm-schemas.ts` (new).

2. **R3 Validator** — Schema → Reconcile → Reject.
   A single wrapper that takes any LLM output + its expected Zod schema and
   returns `{ ok: true, data } | { ok: false, reason, attempt }`. It runs:
   - **R1 Schema**: `schema.safeParse(raw)`. On failure, one repair attempt
     (strip code fences, balance braces, retry).
   - **R2 Reconcile**: domain invariants (numbers finite, percentages in
     [0,100], LTV:CAC sane per `anti-bs-sanity-checks`).
   - **R3 Reject**: typed rejection with `{ reason, raw_preview, repair_attempted }`.
   File: `supabase/functions/_shared/r3-validator.ts` (new) +
   `src/__tests__/r3-validator.test.ts`.

3. **25-fixture engine regression suite.**
   25 deterministic business fixtures spanning SaaS, marketplace, services,
   physical retail, restaurant, agency, content, and B2B enterprise. Each
   fixture asserts: gross margin %, net margin %, LTV:CAC, payback months,
   break-even month, 12-mo cumulative cashflow. Tolerances are per-fixture
   and frozen — a deliberate change requires updating the fixture and
   bumping `ENGINE_VERSION`.
   Files: `src/lib/bedrock-fixtures.ts`,
   `src/__tests__/engine-regression-25.test.ts`.

4. **Per-call cost log.**
   Already shipped (`supabase/functions/_shared/ai-logger.ts` → `ai_calls`).
   Add a thin admin read-helper `src/lib/ai-cost-log.ts` + a CI guard that
   fails if any new edge function calling `llm-call` does not pipe through
   `logAiCall(...)`.

Acceptance (all four MUST pass on `main`):

- `bun run test:quality` includes `r3-validator.test.ts` and
  `engine-regression-25.test.ts`, both green.
- `scripts/verify-ai-cost-logging.ts` (new) returns 0 when every edge
  function that imports `llm-call` also imports `logAiCall`.
- `boundary-schemas` + new `llm-schemas` cover 100% of LLM tasks in the
  `AiCallTask` enum (statically asserted in the test).

---

## Phase 2 — Determinism ⚪

Outcome: the same input → the same output, byte-for-byte, across two
consecutive runs. Removes LLM nondeterminism from anything user-facing
that claims to be a *calculation*.

Deliverables:
- Pin `temperature=0`, `top_p=1`, `seed=<request_id_hash>` on every
  validator/consensus LLM call.
- Move all numeric outputs (margins, LTV, break-even, runway, verdicts)
  to the deterministic engine. LLM is narration only — never authority.
- Add `scripts/verify-determinism.ts`: re-runs the 25 fixtures twice with
  the same seed, asserts JSON-stringified outputs are byte-identical.

Acceptance: `verify-determinism.ts` exits 0 on `main`; any LLM-authored
numeric value in `metadata.*` fails a new lint rule.

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
