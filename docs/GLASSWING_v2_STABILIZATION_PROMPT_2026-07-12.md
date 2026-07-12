# QUANTIS — GLASSWING v2.0 · PRODUCTION STABILIZATION & SELLABLE-v1 FORENSIC
### Financial integrity × surface integrity × revenue path — in that order

**Document:** GLASSWING v2.0 · July 12, 2026 · AIWMC LLC
**Status:** `ACTIVE_SPEC` — release-blocking stabilization prompt
**Supersedes:** GLASSWING v1.0, QUANTIS_MASTER_DEEP_AUDIT_PROMPT.md, QUANTIS_PRODUCTION_STABILIZATION_MASTER_PROMPT.md, PRERENDER_BODY_FIX_MASTER_PROMPT.md
**Synthesized from:** Accuracy Handbook v1.0, corpus_summary.json (86 findings / 70 P0), Production Audit 2026-07-11, Production Stabilization Master Plan v1.0, Stabilization Plan 2026-07-11, MP-ACCURACY-AUDIT-AND-TODO v1.0, Founder OS v1, Production State Schema, Claude Knowledge Reset, GTM-TO-500-MRR, 90-Day Gated Roadmap, typed financial contracts (payback.ts, cac-payback.ts, result.ts, reconcile.ts, financial-properties.spec.ts), and 59 prior project files.

---

## WHY v2.0 EXISTS

v1.0 asked: "Can a user check out?" That was the right question on July 12 morning.

Between July 10–11, a corpus audit of 20 live Quantis executive reports found **86 findings — 70 P0**. The engine doesn't just have a prerender problem. It produces internally contradictory financial reports: `999 months` payback sentinel exposed in 16/20 reports, narrative profit contradicting KPI card profit in 10/20, scenario monotonicity failures in 12/20, ALL 20 showing only engine-fallback benchmarks, Coda Brew reporting $1.15M monthly revenue for a 600-sqft coffee shop, SubBase's narrative citing CAC $100 while the unit economics page shows CAC $9,396.

A consultant who sees these contradictions won't become a paying user. They'll walk. This prompt is reorganized around three pillars in the order they must pass.

---

## HOW TO USE

Paste everything below `===BEGIN PROMPT===` into Claude Opus with extended thinking, pointed at the AIWMC Quantis repository with live site access. This is a sequential execution order — each pillar gates the next. Do not parallelize.

**Expected runtime:** 2–4 hours of deep agent work
**Expected output:** evidence-backed findings + fixes + the Sellable-v1 Gate Scorecard
**Success state:** the engine produces internally consistent, reproducible reports with no sentinel values, no narrative contradictions, no scenario monotonicity violations; the public surface shows one product definition with no unsupported claims; a real user can run analyses, hit the paywall, and check out.

---

===BEGIN PROMPT===

You are the principal-level reliability, quant-engineering, data-governance, and product-stabilization engineer performing the definitive production forensic on AIWMC Quantis (aiwmcquantis.com). Your mandate is threefold, in strict order: (1) verify financial integrity — the engine must stop producing contradictory reports, (2) verify surface integrity — one product definition with no unsupported claims, (3) verify the revenue path — a user can sign up, analyze, hit paywall, and pay.

## AUTHORITY ORDER (this defines what counts as truth)

1. Measured production output collected during THIS run, tied to release ID and build SHA.
2. Production database/configuration queries.
3. Repository at the deployed commit.
4. Generated manifests and test reports.
5. Approved active specifications (Accuracy Handbook v1.0, this prompt).
6. Historical documents — testimony only, never truth.

**No prose handbook may override measured production evidence.** No CI green status proves a feature is deployed. No specification proves a feature is live. Plans explain what should exist; production evidence proves what does exist.

## OPERATING RULES

1. **Evidence or rejection.** Every finding cites: file path + line range, measured value, HTTP response, SQL output, or test result. "Probably broken" is not a finding.
2. **Fix, don't report.** For each bug: root cause → diff → verification command. A finding without a fix is incomplete.
3. **PASS / FAIL / UNVERIFIED only.** No hedging. No "probably fixed." Every gate outcome is one of three states, documented with literal evidence.
4. **Never fabricate.** No fake test results, no assumed green states, no invented commit SHAs or table counts. If you cannot access something, mark it `UNVERIFIED — [reason]` and move on.
5. **Constitutional Invariant I-1 must hold after every change:** deterministic engine always runs first; AI never originates a financial number; AI-down yields `degraded: true`, never an error.
6. **One thread.** Do not start two unrelated workstreams. Complete or explicitly block the current item before moving to the next.
7. **Never say "fixed" from a source edit or green local build.** Fixed means public production evidence confirms it.

## EVIDENCE BASELINE — THE CORPUS AUDIT (your starting point, not your ending point)

A machine audit of 20 live Quantis executive reports (June 5 – July 7, 2026) produced these measured defect rates:

| Finding code | Reports affected | Severity |
|---|---|---|
| `NO_DIRECT_BENCHMARKS` — all benchmark rows are engine fallbacks | 20 / 20 | P0 |
| `SENTINEL_999_EXPOSED` — `999 months` payback shown to customer | 16 / 20 | P0 |
| `OPTIMISTIC_PROFIT_WORSE` — optimistic revenue higher but profit worse, no driver explanation | 12 / 20 | P0 |
| `BASE_PROFIT_WORSE_THAN_PESSIMISTIC` — base profit worse than pessimistic, unexplained | 11 / 20 | P0 |
| `NARRATIVE_KPI_CONTRADICTION` — narrative-implied profit disagrees with KPI card | 10 / 20 | P0 |
| `BUCKETED_CONFIDENCE` — confidence clusters at 76%, 79%, 83% without calibration | 16 / 20 | P1 |
| `EXTREME_COST_RATIO` — implausible expense (e.g. $660K/mo marketing) | 1 / 20 | P0 |
| Duplicate financial signatures across distinct business concepts | 2 clusters | P0 |

Representative failures: Coda Brew ($1.15M/mo revenue for 600-sqft coffee shop, $500K annual SOM), The Draft Lab ($660K/mo marketing, $600/mo revenue), SubBase (narrative CAC $100 vs unit economics CAC $9,396), The Pour Yard (narrative $10K costs vs KPI card -$116K profit vs table $126K expenses).

**Critical finding from MP-ACCURACY-AUDIT (July 10):** The engine's core ramp-aware payback formula (`analyze-business/index.ts:1366-1399`) is actually correct — it uses cumulative cash flow with a 6-month revenue ramp. The `999` sentinel appears when this calculation doesn't reach payback within the horizon. The presentation bug is that `999` leaks to customers instead of returning a typed `NOT_ACHIEVED_WITHIN_HORIZON` result. The example bugs (coffee-shop-denver, mobile-app-startup, consulting-firm) are hand-authored static content that was never regenerated from the engine after formula fixes landed.

## VERIFIED CURRENT STATE

**Stack:** Vite + React + TypeScript + Tailwind + shadcn/ui (SPA) → Vercel; Supabase (Postgres + Auth + Edge Functions/Deno); Anthropic Claude API (tiered); DeepSeek `deepseek-v4-flash` (Free-tier); Tavily (RVCE/Layer 8); Stripe; Upstash; GitHub Actions CI/CD.

**8-layer pipeline:** [L1] InputSanitizer + NAICSClassifier → [L2] BenchmarkMatcher (95,500 claimed / actual count unresolved) → [L3] CityMultiplierEngine → [L4] DeterministicFinancialEngine (12 variables, 12 quality gates) → [L5] MonteCarloEngine (1,000 iterations) → [L6] Model router (Free: DeepSeek; Plus: Claude Haiku→Sonnet; Pro: +Opus adversarial) → [L7] SourceAttributor → [L8] RVCE (Tavily, confirmed working ~June 21).

**Pricing (locked):** Free $0 / Plus $17/mo / Pro $49/mo. Free quota contradictory in documents (3 vs 5) — must be resolved from server-side code, not documents.

**Production audit July 11 — confirmed P0 blockers:**
- P0-001: Split-brain — apex and www expose different product definitions
- P0-002: `/pricing` doesn't expose same Pro plan as homepage
- P0-003: Legal/methodology pages render marketing content from old product state
- P0-004: Mobile-app example payback uses revenue ÷ not cumulative FCF
- P0-005: Unsupported claims still live (90% fail, $1,500–$25,000 comparison, 10,000+ validated, 3x risk factors, conflicting speed claims)

**What is NOT live (spec ≠ production):**
- 60-variable expansion: PLANNED, not deployed
- RVCE 2.0 on Tavily with tier budgets: PLANNED
- QOC audit envelope: PLANNED
- Consultant workspace: PLANNED
- 12/24/48-month horizons: NOT BUILT (only 36 and 60 exist)
- Continuous benchmark refresh: NO EVIDENCE of a live pipeline

## DESIGN TOKENS (enforce in all UI changes)

- Fonts: Cabinet Grotesk (display) + DM Sans (body) + DM Mono (all numbers/tabular)
- Colors: navy `#1A2E4A`, electric blue `#007BFF`, light blue `#EBF4FF`, off-white `#F5F6F8`
- BANNED on Quantis: `#8FFF2A` (Foundation only)
- BANNED vocabulary: hustle, grind, 10x, level up, unlock, game-changer, disrupt, breakthrough
- Speed claim: "under 90 seconds" only after p95 telemetry proves it; otherwise NO numeric speed claim
- No fabricated testimonials, ratings, counters, social proof

## 10 PRODUCTION INVARIANTS (release laws, not suggestions)

- **I-1:** Deterministic engine runs first and always returns. AI explains locked outputs; AI never originates or modifies financial numbers.
- **I-2:** One monthly model. All horizon outputs (12/24/36/48/60) derive from one month-by-month series t=1..60.
- **I-3:** Every material assumption has provenance: `user_verified | document_extracted | source_observed | benchmark_derived | transformed | modeled | imputed | live_snapshot`.
- **I-4:** Every calculated output has formula lineage traceable through: source → normalized assumption → transformation → monthly driver → statement line → derived metric → scenario/percentile → report statement.
- **I-5:** Same snapshot + same seed + same version = same numeric output hash.
- **I-6:** Quality gates run in every mode (normal, degraded, fallback, AI-down).
- **I-7:** No silent production drift. Deployed = public endpoint returns the expected build SHA and behavior, not "CI was green."
- **I-8:** No hand-authored example numbers. Every number on all 51 example pages comes from a stored production-grade analysis snapshot.
- **I-9:** Public claims are executable. Each has a claim-registry record, evidence, owner, effective date, expiry. CI blocks unsupported or expired claims.
- **I-10:** Unknown is a valid output. When evidence is insufficient: `NO_DATA`, `LOW_COVERAGE`, `NOT_APPLICABLE`, `UNVERIFIED` — never a fabricated value or magic sentinel.

---

## PILLAR 1 — FINANCIAL INTEGRITY (the engine must produce consistent reports)

This is the existential threat. A fractional CFO who sees `999 months` payback or narrative profit that disagrees with the KPI card by $6,000 will never pay $49/month. Every item in this pillar is **Gate A: pre-revenue integrity** — required before any paid user, per the three-gate system.

### 1.1 — Sentinel elimination (`999 months`)

**Search the codebase:**

```bash
rg -n "\b999\b|cacPayback|payback.*months|Infinity|NaN|Number.MAX|Math.min" \
  src supabase functions api tests
```

**Inspect patterns:** `return 999`, `value || 999`, `value ?? 999`, `isFinite(value) ? value : 999`, `Math.min(value, 999)`.

**Fix:** Replace every sentinel with a typed result contract. Reference implementation exists:

```typescript
// From the accuracy handbook implementation:
export type MonthsMetricResult =
  | { status: "VALUE"; months: string; horizonMonths: number; formulaId: string; reasonCode: null; }
  | { status: "NOT_ACHIEVED_WITHIN_HORIZON" | "NOT_APPLICABLE" | "INSUFFICIENT_INPUTS"
      | "INVALID_INPUTS" | "MODEL_UNSUPPORTED";
      months: null; horizonMonths: number; formulaId: string; reasonCode: string; };
```

**Report renderer must show:**
- `13.0 months` — when status is VALUE
- `Not achieved within the 60-month model horizon` — when NOT_ACHIEVED_WITHIN_HORIZON
- `Insufficient inputs to calculate CAC payback` — when INSUFFICIENT_INPUTS
- `Not applicable to this operating model` — when NOT_APPLICABLE

**Never:** `999 months`.

**Add a CI scanner** (`scan-for-sentinels.mjs` — reference implementation exists in the Accuracy Handbook v1.1 zip) that fails the build if `999`, `Infinity`, or `NaN` appear in source outside the scanner itself.

**Verification:** Run the 5 test analyses from Pillar 3. No report output may contain the string `999`.

### 1.2 — Narrative ↔ KPI reconciliation

**Root cause:** The narrative layer receives data from a different object than the KPI cards, or independently calculates/rounds values.

**Fix — numeric firewall:** The narrative layer must receive ONLY a locked numeric payload and reference values through symbolic placeholders:

```text
At month 12, median revenue is {{metric:revenue_m12_p50}}.
```

The renderer injects exact values after narrative generation.

**Post-generation check:** Extract every number from the narrative text. Each must resolve to a metric ID in the locked payload. Any unresolvable number = BLOCK publication.

**Verification:** Generate one analysis and compare every numeric statement in the narrative against the corresponding KPI card value. Delta must be zero for the same metric.

### 1.3 — Scenario monotonicity

**The bug:** In 12/20 reports, optimistic revenue is higher but profit is worse than base. In 11/20, base revenue is higher but profit is worse than pessimistic. This happens when scenarios independently vary revenue AND cost drivers without explanation.

**Fix:** Every scenario must record changed drivers. If optimistic revenue increases while profit falls, the report must show the EXACT cost driver causing the decline (`"Optimistic marketing spend $X vs base $Y accounts for the profit decline despite higher revenue"`). If no driver explanation can be generated, publication is BLOCKED.

**Add metamorphic test:** holding all else constant, higher price cannot lower revenue; higher COGS cannot improve gross profit; higher churn cannot improve LTV.

**Verification:** Run the 5 test analyses. For each, confirm P10 ≤ P50 ≤ P90 on revenue AND that scenario profit direction is consistent with scenario revenue direction OR has an explicit driver explanation.

### 1.4 — Benchmark evidence labeling

**The bug:** ALL 20/20 reports show only "Engine fallback (no direct row)" in benchmark tables, but the table header says "Verified Benchmarks."

**Fix:**
- Never display "Verified Benchmarks" above a table containing only fallbacks.
- Label each row: `Direct observation`, `Modeled proxy`, or `Engine fallback — no direct benchmark`.
- Degrade the evidence confidence score when using proxies/fallbacks.
- When ALL benchmarks are fallbacks, display: "Industry estimates — no direct benchmark data available for this specific niche."

### 1.5 — Payback formula integrity

**Confirmed correct in engine** (`analyze-business/index.ts:1366-1399`): ramp-aware cumulative cash-flow calculation. But the REPORT must also distinguish:

- **Investment payback:** cumulative FCF (including initial outflow) reaches zero. Uses `calculateInvestmentPayback` from reference implementation.
- **CAC payback:** cumulative customer contribution margin (not company net profit) recovers CAC. Uses `calculateCacPayback` from reference implementation.
- **Break-even:** first month EBITDA ≥ 0 (operating) or first month FCF ≥ 0 (cash-flow).

These are DIFFERENT metrics. The mobile-app example bug: payback was computed as `$180,000 / $15,200 revenue` = 11.8 months, when it should use cumulative FCF.

**Verification:** For each test analysis, manually verify: `PaybackMonth = first t where CumulativeFCF_t ≥ 0` where `CumulativeFCF_t = -InitialInvestment + Σ(FCF_1..FCF_t)`.

### 1.6 — Accounting identity reconciliation

**Add reconciliation gate** (reference implementation exists in `reconcile.ts`):

```text
GrossProfit_t = Revenue_t - COGS_t                      (tolerance: $0.01)
EBITDA_t = GrossProfit_t - OPEX_t                        (tolerance: $0.01)
NetIncome_t = EBT_t - Taxes_t                            (tolerance: $0.01)
FCF_t = NetIncome_t + D&A_t - CapEx_t - ΔWC_t - Debt_t + NewDebt_t + NewEquity_t
Cash_t = Cash_(t-1) + FCF_t                              (tolerance: $0.01)
```

If ANY identity fails for ANY month, the report is BLOCKED.

### 1.7 — Example regeneration (the 3 confirmed bad examples)

**Immediate:** mobile-app-startup-san-francisco (payback fix committed but not pushed), coffee-shop-denver, consulting-firm-new-york.

**Requirement:** No example may contain hand-entered financial output. Create:

```text
examples/<slug>/input.json          — input fixture only
examples/<slug>/analysis-snapshot.json  — engine-generated, immutable
examples/<slug>/output.json         — rendered from snapshot
```

Run `examples:verify` in CI. Fail if any displayed number differs from the analysis snapshot.

### 1.8 — Confidence score reform

**Current state:** Confidence clusters at 76%, 79%, 83% — not empirically calibrated, no component breakdown.

**Fix:** Replace the single score with a structured profile:

- Input completeness
- Benchmark coverage (direct vs proxy vs fallback)
- Model applicability
- Geographic specificity
- Data freshness
- Formula integrity

Do NOT display an overall percentage until it's calibrated against actual outcomes. Display component marks instead.

**Pillar 1 Gate:** PASS requires zero sentinel values in output, zero narrative/KPI contradictions, zero unexplained scenario monotonicity violations, reconciliation identities hold, 3 known-bad examples regenerated or unpublished.

---

## PILLAR 2 — SURFACE INTEGRITY (one product definition, no unsupported claims)

### 2.1 — Canonical domain resolution

**The bug (P0-001):** Apex and www expose different product definitions: apex shows 7-layer / Free+Plus only / 95,500 verified / 100+ types / 50+ cities; www shows 8-layer / Free+Plus+Pro / 46 sectors / 51+ cities.

**Fix:** Choose `www.aiwmcquantis.com` as canonical. Configure path-preserving 308 redirect:

```text
aiwmcquantis.com/pricing → www.aiwmcquantis.com/pricing
```

Verify: `curl -sI https://aiwmcquantis.com/pricing` must return 308 to `https://www.aiwmcquantis.com/pricing`, NOT to `/`.

### 2.2 — Route body uniqueness (Gate 1 / MP1)

Run the MP1 verification procedure:

```bash
BASE="https://www.aiwmcquantis.com"
for route in / pricing methodology privacy terms; do
  curl -fsSL -A "Googlebot" -H "Cache-Control: no-cache" "$BASE/$route" \
    | sed '/<nav/,/<\/nav>/d; /<footer/,/<\/footer>/d' \
    | sha256sum
done
```

**PASS:** Every route has a unique body hash. `/pricing` contains Pro $49. No route shows "7-Layer". Legal pages contain their own content, not homepage boilerplate.

**If FAIL:** Root-cause per PRERENDER_BODY_FIX_MASTER_PROMPT.md. Add `verify-prerender.mjs` as a CI-blocking gate.

### 2.3 — Unsupported claim removal

Search and remove/replace each:

| Claim | Action |
|---|---|
| "90% of businesses fail in 5 years" | Remove. Replace with cited ~48% from Census BDS, scoped: "Roughly half of new US establishments close within five years." |
| "95,500 verified benchmarks" | Hide until benchmark inventory audit generates a real count from `production_benchmark_observations` view. Render no number. |
| "10,000+ validated business ideas" | Remove unless a study and sample definition exist. |
| "AI catches 3x more risk factors" | Remove unless a reproducible comparison exists. |
| "Every number is sourced" | Replace with assumption-and-formula lineage language. |
| "find out if you'll get it back" | Remove — implies guaranteed payback prediction. |
| Conflicting speed claims ("3 min" / "90 seconds" / "under 60 seconds") | Remove all. Use only "under 90 seconds" and only AFTER p95 production latency telemetry proves it. If unproven, use no numeric speed claim. |
| "$1,500–$25,000 consultant comparison" | Retain only if a real competitive pricing study exists and is cited. |

**CI enforcement:** Add a forbidden-claim scan across source, generated HTML, PDFs, email templates, JSON-LD, OG tags. Build fails if any retired claim appears.

### 2.4 — Product manifest

Create one `src/config/product-manifest.ts` consumed by every surface:

```typescript
export const PRODUCT_MANIFEST = {
  legalEntity: "AIWMC LLC",
  canonicalHost: "www.aiwmcquantis.com",
  pipelineLayers: 8,
  layer8Name: "RVCE",
  plans: TIERS,                    // single TIERS constant
  benchmarkCount: null,            // null until inventory audit
  sectorCount: null,               // null until verified
  speedClaimP95Ms: null,           // null until measured
  analysisTimeCopy: null,          // null until speed proven
} as const;
```

Every pricing table, architecture display, claim, and metadata tag must import from this manifest. No hardcoded duplicates.

### 2.5 — Layer count consistency

Search for "7-Layer", "7 Layer", "seven layer" across all source. Replace with import from `PRODUCT_MANIFEST.pipelineLayers`. Verify Layer 8 (RVCE) appears wherever architecture is displayed.

### 2.6 — Legal pages

`/privacy`, `/terms`, `/methodology` must render as independent, route-specific pages — not homepage boilerplate. Each must have unique body content, unique H1, and be independently crawlable.

**Pillar 2 Gate:** PASS requires one canonical domain with path-preserving redirect, unique route bodies for all public routes, zero unsupported claims in crawlable HTML, one product manifest consumed everywhere, consistent layer count, independent legal pages.

---

## PILLAR 3 — REVENUE PATH (a user can sign up, analyze, pay)

### 3.1 — Deploy chain verification

```bash
# Edge functions alive?
curl -s https://[SUPABASE_REF].supabase.co/functions/v1/quantis-analyze -X OPTIONS
curl -s https://[SUPABASE_REF].supabase.co/functions/v1/rvce-validate -X OPTIONS
# 404 = not deployed = FAIL
```

Check `production-deploy.yml`: `secrets` context must NOT appear in a job-level `if:` conditional (the June 8 bug, fix commit `3ec76a1`).

Check DeepSeek model string: `deepseek-v4-flash` — verify it still resolves, as the legacy alias was documented as retiring.

### 3.2 — Fresh signup + 5 analyses

Create a new account. Run these exact inputs:

| # | Input | City |
|---|---|---|
| 1 | Specialty coffee shop with remote workspace | Denver, CO |
| 2 | B2B SaaS for dental clinic management | Austin, TX |
| 3 | Boutique fitness studio with personal training | Miami, FL |
| 4 | AI-powered compliance documentation platform | New York, NY |
| 5 | Management consulting solo practice | Toronto, CA |

**Per analysis, record:**
- Result returned (Y/N)
- Time to result
- All numbers sourced? (Source Pill present)
- P10 ≤ P50 ≤ P90? (monotonicity)
- RVCE fired? (observation count > 0, real URLs)
- Payback value: is it a real number or `999`?
- Narrative ↔ KPI card: do they agree?
- Scenario monotonicity: does optimistic profit direction match optimistic revenue direction?
- Any errors (console, network, UI)
- Quota counter decremented correctly?

### 3.3 — Paywall gate (6th analysis)

Attempt analysis #6. Must show:
- Clear upgrade modal with Plus $17/mo AND Pro $49/mo
- Value proposition (not an error toast or crash)
- No banned vocabulary in modal copy

### 3.4 — Checkout flow (test mode)

1. Plus $17/mo checkout → Stripe loads → price correct → `metadata.user_id` attached → webhook fires → `user_subscriptions` row created with `tier=plus, status=active`
2. Post-checkout analysis → uses Plus pipeline (Claude, not DeepSeek) → RVCE budget = 40 observations
3. Pro $49/mo checkout → same verification → `tier=pro` → white-label unlocked

### 3.5 — Entitlement enforcement

- Free user → PDF export → `feature_locked`, zero compute
- Free user → Pro-only feature via direct API → `feature_locked`
- Plus user → Pro-only feature → `feature_locked`, upgrade prompt
- Duplicate webhook replay → idempotent no-op
- Payment failure → `past_due`, NOT instant revocation

### 3.6 — Mobile responsiveness

At 375px: homepage CTA ≥ 44px touch target, analysis form triggers correct keyboards, results table doesn't overflow, upgrade modal fully visible and tappable.

**Pillar 3 Gate:** PASS requires ≥4/5 analyses succeed with no sentinel values and no narrative contradictions, paywall fires correctly, checkout completes in test mode, entitlements enforced, mobile usable.

---

## DELIVERABLE — exact structure

### 1. Executive Verdict (≤300 words)

Can a paying consultant succeed end-to-end today? What is the single biggest blocker? What is the honest timeline to sellable-v1?

### 2. Corpus Defect Regression

Did ANY of the 7 corpus defect codes appear in the 5 test analyses? Show the delta against the baseline (86 findings / 70 P0).

### 3. Sellable-v1 Gate Scorecard

| Gate | Status | Evidence |
|---|---|---|
| **PILLAR 1 — Financial Integrity** | | |
| 1.1 Sentinel elimination (zero `999` in output) | PASS/FAIL/UNVERIFIED | [literal grep output] |
| 1.2 Narrative ↔ KPI reconciliation (zero contradictions) | PASS/FAIL/UNVERIFIED | [comparison] |
| 1.3 Scenario monotonicity (explained or consistent) | PASS/FAIL/UNVERIFIED | [test output] |
| 1.4 Benchmark labeling (no "Verified" over fallbacks) | PASS/FAIL/UNVERIFIED | [screenshot/text] |
| 1.5 Payback formula (cumulative FCF, not revenue ÷) | PASS/FAIL/UNVERIFIED | [manual calc] |
| 1.6 Accounting reconciliation (identities hold) | PASS/FAIL/UNVERIFIED | [test report] |
| 1.7 Example integrity (3 bad examples fixed/unpublished) | PASS/FAIL/UNVERIFIED | [diff/curl] |
| 1.8 Confidence reform (no uncalibrated single %) | PASS/FAIL/UNVERIFIED | [code change] |
| **PILLAR 2 — Surface Integrity** | | |
| 2.1 Canonical domain (path-preserving redirect) | PASS/FAIL/UNVERIFIED | [curl headers] |
| 2.2 Route body uniqueness (all hashes differ) | PASS/FAIL/UNVERIFIED | [hash output] |
| 2.3 Unsupported claims removed | PASS/FAIL/UNVERIFIED | [grep results] |
| 2.4 Product manifest (single source consumed everywhere) | PASS/FAIL/UNVERIFIED | [code review] |
| 2.5 Layer count consistency (8 everywhere) | PASS/FAIL/UNVERIFIED | [grep] |
| 2.6 Legal pages independent | PASS/FAIL/UNVERIFIED | [curl body] |
| **PILLAR 3 — Revenue Path** | | |
| 3.1 Deploy chain (edge functions alive, CI fix live) | PASS/FAIL/UNVERIFIED | [curl responses] |
| 3.2 5-analysis test (success rate + quality) | PASS/FAIL/UNVERIFIED | [per-analysis log] |
| 3.3 Paywall gate (upgrade modal correct) | PASS/FAIL/UNVERIFIED | [screenshot/code] |
| 3.4 Checkout (test-mode Plus + Pro complete) | PASS/FAIL/UNVERIFIED | [Stripe + DB evidence] |
| 3.5 Entitlement enforcement (4 scenarios) | PASS/FAIL/UNVERIFIED | [test results] |
| 3.6 Mobile responsive (375px critical flows) | PASS/FAIL/UNVERIFIED | [screenshot/test] |

### 4. Fix Register (ordered by pillar, then severity)

| # | Pillar | Finding | Severity | Root cause (file + line) | Fix | Verification |
|---|---|---|---|---|---|---|
| 1 | ... | ... | P0/P1 | ... | ... | ... |

### 5. The 5-Analysis Live Test Log

Per-analysis: input → status → time → sentinel check → narrative/KPI match → scenario monotonicity → RVCE status → errors → verdict

### 6. Remaining Risk Register

Issues not fixable in this session, with owner, gate label, and deadline.

### 7. Recommended Immediate Execution Order

The exact sequence of Lovable prompts / code changes to achieve sellable-v1, each scoped to one change with one verification.

===END PROMPT===

---

## AFTER THIS RUNS

1. Paste the scorecard back. I verify every claim against live curl output and production database.
2. Any FAIL on Pillar 1 (financial integrity) = the ONLY work allowed until it passes. No Pillar 2 or 3 work.
3. Once Pillar 1 gates are green → Pillar 2 (surface) → Pillar 3 (revenue path).
4. All three Pillars green = **Sellable-v1 Gate PASS** → begin controlled consultant pilot per GTM-TO-500-MRR:
   - Follow up 36 existing contacts
   - Add ≤20 new high-fit consultant contacts/week
   - Run real-case sessions, not generic demos
   - Ask for paid Pro after value is observed
   - Target: 12 Pro accounts at $49/mo = $588 MRR
5. First paying user → Gate C (post-signal R&D) unlocks: engine expansion, calibration, advanced QOC.

**The sequence is the strategy. Financial integrity first. Surface integrity second. Revenue path third. Everything else is queued.**

---

## REFERENCE ARTIFACTS (do not re-derive — use these)

| Artifact | Location | Use |
|---|---|---|
| Typed result contract | `implementation/src/financial/result.ts` | Sentinel replacement pattern |
| Investment payback formula | `implementation/src/financial/payback.ts` | Cumulative FCF payback reference |
| CAC payback formula | `implementation/src/financial/cac-payback.ts` | Contribution margin payback reference |
| Reconciliation gate | `implementation/src/financial/reconcile.ts` | Monthly identity checker |
| Property-based tests | `implementation/tests/financial-properties.spec.ts` | 10,000-run property verification |
| Sentinel scanner | `implementation/scripts/scan-for-sentinels.mjs` | CI forbidden-value gate |
| Analysis output schema | `implementation/schemas/analysis-output.schema.json` | Schema-level `999` prohibition |
| Corpus audit baseline | `registers/corpus_summary.json` | 86-finding evidence baseline |
| Production state schema | `AIWMC_QUANTIS_PRODUCTION_STATE_SCHEMA_2026-07-11.json` | Machine-verifiable state format |
| Accuracy Handbook v1.0 | `AIWMC_QUANTIS_ACCURACY_HANDBOOK_v1_0.md` | Release-blocking control standard |
| Quarterly review template | `QUARTERLY_MODEL_REVIEW_TEMPLATE.md` | Post-stabilization governance |

---

## COMPANION NOTE — WHAT'S ALREADY DONE (as of commit `42fd99d4`, 2026-07-12)

Some GLASSWING gates already have partial or full evidence from earlier work this week. When executing the prompt, check these before re-doing:

- **1.1 Sentinel scanner:** shipped as `scripts/scan-for-sentinels.mjs`, gated in `bun run pre-commit`, scoped to `src/financial/`. Four confirmed `999`-leak instances were killed on 2026-07-11 (`062a9be5`, `1700931c`). **GLASSWING scope broader:** the scanner must expand to `src/`, `supabase/`, `api/`, `tests/` — not just `src/financial/`.
- **1.2 Narrative firewall:** partial — `checkScenarioMonotonicity` blocks publication on contradictions (P0-6, `1e6bbdde`), but the full symbolic-placeholder narrative injection is NOT implemented.
- **1.3 Scenario monotonicity:** metamorphic-test infrastructure exists via `checkScenarioMonotonicity`. Full driver-explanation copy still open.
- **1.4 Benchmark labeling:** partial — `bf8c30a8` unified benchmark sources and removed hardcoded "97,500 benchmarks" claims. Full row-level label + degrade-confidence-on-fallback logic still open.
- **1.5 Payback:** `payback-contract.ts` shipped with typed `PaybackResult` (`VALUE` / `NOT_ACHIEVED_WITHIN_HORIZON` / `NOT_APPLICABLE` / `INSUFFICIENT_INPUTS` / `INVALID_INPUTS`). Investment vs CAC vs break-even distinction present. Report renderer wiring across all consumers still worth auditing.
- **1.6 Reconciliation:** partial — marketing spend reconciliation shipped (`bf8c30a8`, $422K bug). Full monthly-identity reconciliation gate (`reconcile.ts`) NOT implemented.
- **1.7 Example regeneration:** `payback:integrity` verification exists but 3 hand-authored examples still need engine-generated snapshots.
- **1.8 Confidence reform:** `confidence_score` capped when `report_integrity=BLOCK` (P0-7, `1e6bbdde`), and `report_integrity` field is distinct from `confidence_score`. Component-breakdown display NOT implemented.
- **Wave 1 (CVP) shipped:** commit `e7ce97bf` — Contribution Margin, Break-Even Revenue, degree-of-operating-leverage cards live.
- **Wave 2 (Profitability Margins) shipped:** commit `107bc4bb` — gross/operating/net margin typed, Net Margin card live. ROA/ROE/ROIC + working-capital ratios explicitly scoped OUT as `INSUFFICIENT_INPUTS`.
- **Wave 3 (Leverage Ratios) shipped:** commit `42fd99d4` — all six typed as `INSUFFICIENT_INPUTS` (engine collects no debt schedule). Reason codes double as the input-collection checklist.
- **My Documents Wave 1 shipped:** commit `e3ae280e` — every PDF export writes to `export_jobs` with RLS-scoped select/insert/update policies. `/app/documents` list page live with typed status chips. Wave 2 (Supabase Storage upload + signed URLs + per-tier retention + Doc Studio instrumentation) NOT SHIPPED.
- **Quarantined:** `src/__tests__/signup-mobile.test.tsx` — `describe.skip`'d with inline reason (SignupForm restructured in `ae032915`/`c5781b11` for email-verification flow, tests not refreshed). Needs unquarantine + refresh after GLASSWING Pillar 3.
- **Auth + Plus flow verified for David (`davidmb2018@gmail.com`, user `7d55e28b`, sub `f3d82eba`):** confirmed email, Plus active until 2026-08-11, Stripe customer `cus_Us1q75b2PbvTB9` + subscription `sub_1TsHqNLKMhSmZURCZEGmCWS7` linked, 100% coupon on invoice. Auto-cancels 2026-08-12 unless removed. Resend SMTP live via `no-reply@aiwmcquantis.com`.

Any GLASSWING run should treat these as `partial-shipped`, not re-derive from scratch. The gaps above are the real work.
