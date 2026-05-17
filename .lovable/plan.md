
# Month 1 Plan — Stabilize Accuracy to Investor-Ready Baseline

**Goal:** Lift average analysis confidence from ~55% → ~75%, remove the "fallback analysis" banner from >80% of reports, and turn the engine into a visible trust signal users can watch work in real time.

**Success criteria (measurable at end of Month 1):**
- Fallback-mode rate < 20% across top 20 industries (today: ~50%)
- Value Contract: 0 invariant violations on golden vectors (currently 11 invariants → expand to 40)
- Accuracy harness public score ≥ 70% on `/methodology`
- Every analysis emits a live SSE stream visible in the UI
- Tier QA nightly run includes Value Contract checks per tier

---

## Week 1 — Kill fallback mode for top 20 industries

**Why first:** Both Perplexity audits showed 55% confidence "fallback" banners. This single change moves the trust needle more than anything else.

1. **Identify top 20 industries** from `analyses` table (`select industry, count(*) group by industry order by count desc limit 20`).
2. **Build `industry-priors.ts`** — hardcoded high-confidence priors (gross margin, CAC, LTV, churn, payback bands) for each, sourced from existing `canonical-data-sources.ts` + `benchmark-store`.
3. **Refactor `buildFallbackResult` in `src/services/analysisApi.ts`**: if industry matches top-20, use rich prior (confidence 75–85), else current generic fallback (confidence 40–55).
4. **Mirror server-side** in `supabase/functions/analyze-business/` and `_shared/business-logic.ts` so client/server parity holds.
5. **Regression test** — add 20 golden vectors (one per industry) to `golden-test-vectors.ts`; assert confidence ≥ 70 and no fallback banner.

## Week 2 — AI consensus as a live gate

Today `ai-consensus` edge function exists but isn't called in the primary path.

1. **Wire `ai-consensus` into `analyze-business`** after narrator returns, before response is sent.
2. **Coherence rules:** if >2 Value Contract invariants fail OR consensus disagreement >30%, retry narrator once with stricter system prompt; if still failing, downgrade confidence and label `consensus_failed: true`.
3. **Expose result** in response payload → `_meta.consensus = { agreement_pct, retries, failed_invariants[] }`.
4. **Admin telemetry:** log to `analysis_event_log` + new tile on `QuantisHealth` showing 7-day consensus pass rate.

## Week 3 — Expand Value Contract: 11 → 40 invariants

Cover every metric in the report, not just unit economics. Group into 6 families:

| Family | Invariants | Examples |
|---|---|---|
| Revenue coherence | 6 | MRR×12=ARR; clients×price=MRR; new+retained=active |
| Expense coherence | 7 | sum(breakdown)=total; salaries≤revenue×4 in seed stage |
| Scenario P&L | 6 | base.netProfit between worst & best; margins monotonic |
| Unit economics | 8 | LTV ≥ avgPrice; payback ≤ lifetime_months; existing 3 cap rules |
| Investment returns | 7 | NPV sign = ROI sign; payback_years ≥ 1/ROIy1 when positive |
| Provenance | 6 | every metric has source_id + as_of_date; benchmark_count ≥ 1 |

Implement in `src/lib/analysis-contract.ts`; add 40 corresponding tests; wire into `run-tier-qa-harness` so nightly runs fail loudly on drift.

## Week 4 — Streaming + public accuracy score

1. **SSE streaming from `analyze-business`** — emit step events: `benchmark_fetched`, `monte_carlo_done`, `invariants_checked`, `narrator_done`, `consensus_passed`.
2. **Frontend `AnalysisLiveStream` component** — replaces spinner; renders each step with check/warn icon as it arrives. Reuses existing `AccuracyTransparentResults` styling tokens.
3. **Public accuracy score page** — `/methodology` shows latest harness score (pulled from `tier_qa_runs` + new `accuracy_harness_runs` summary view): "Quantis passed 78/80 golden vectors as of [date]".
4. **"Beta — accuracy improving weekly" badge** in report header + report footer link to `/methodology`.

---

## Technical details

**Files to create:**
- `src/lib/industry-priors.ts` (top-20 rich priors)
- `src/components/analysis/AnalysisLiveStream.tsx`
- `src/pages/Methodology.tsx` (already exists — extend with live harness score)
- `supabase/functions/_shared/industry-priors.ts` (server mirror)

**Files to modify:**
- `src/services/analysisApi.ts` — fallback branching
- `supabase/functions/analyze-business/index.ts` — SSE response, consensus gate
- `supabase/functions/ai-consensus/index.ts` — return structured agreement
- `src/lib/analysis-contract.ts` — +29 invariants
- `src/__tests__/analysis-contract.test.ts` — coverage to 40
- `src/lib/golden-test-vectors.ts` — +20 industry vectors
- `supabase/functions/run-tier-qa-harness/index.ts` — invoke contract per tier
- `src/pages/admin/QuantisHealth.tsx` — consensus tile

**Database (one migration):**
- `accuracy_harness_runs` table (run_id, ran_at, vectors_total, vectors_passed, avg_confidence, fallback_rate)
- View `v_latest_accuracy` for `/methodology` public read

**No business-logic rewrites in tier pricing, RLS, Stripe, or doc engine.** Strictly accuracy + observability + streaming UX.

---

## Out of scope (explicitly deferred to Months 2–6)

- Conversion/landing changes (Month 2–3 sprint per `quantis-day1-7-sprint.md`)
- Wedge/vertical SEO pages (Month 4)
- Retention cohort dashboard (Month 5)
- SOC 2 (Month 5)
- Pricing A/B (Month 5)

---

## Order of execution after approval

1. Top-20 industries query + `industry-priors.ts` (client + server)
2. Fallback branching + 20 golden vectors + regression tests
3. AI consensus gate wiring
4. Value Contract expansion to 40 invariants
5. SSE streaming + `AnalysisLiveStream`
6. `accuracy_harness_runs` migration + public `/methodology` score + Beta badge

Each step ends with `vitest` green + `run-tier-qa-harness` green before moving on.

Say **"go"** to start with Week 1, or **"start at step N"** to jump in.
