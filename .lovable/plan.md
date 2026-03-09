

# CTO-Level Accuracy & Precision Upgrade Plan

## Current State Assessment

After deep analysis of ~8,000 lines of production code across 12 modules, here is the honest picture:

### What's Strong
- **Deterministic financial engine** (`financial-engine.ts`, 903 lines) with full audit trails, 36-month DCF at 10% WACC, margin-adjusted LTV, scenario modeling with COGS compression/expansion
- **Bulletproof validator** (795 lines): schema validation, expense reconciliation, revenue cross-checks, margin ceiling guards, health scoring
- **50+ city location intelligence** with granular salary/rent/utility/marketing multipliers
- **Sub-industry detection** with B2B/B2C/SMB modifiers for churn, CAC, LTV
- **AI safety guardrails**: 7-layer defense, truth labeling, cost controls, kill switch
- **Client-side precision layer**: QuantisMath (decimal.js), FormulaRegistry (17 formulas), ConsensusEvaluator interface

### Critical Gaps Identified

**Gap 1: Two calculation engines, no shared precision**
The production edge function (`calculateStrictFinancials` in `index.ts`, ~400 lines) and `computeFinancials` in `financial-engine.ts` (500 lines) both use raw `Math.round()` and `*` / `/` operators. The client-side QuantisMath precision layer does NOT reach the server. This is the single biggest accuracy risk.

**Gap 2: No cross-validation between the two server paths**
`calculateStrictFinancials` (in index.ts) and `computeFinancials` (in financial-engine.ts) compute the same metrics independently with slightly different logic. Nobody checks if they agree.

**Gap 3: AI narrator outputs are validated but not constrained to computed numbers**
The post-check (`validateAIOutput`) detects when AI invents numbers, but the system prompt doesn't inject the computed metrics as immutable anchors strongly enough. The AI can still hallucinate financial figures in narration text.

**Gap 4: Benchmark data is static — no confidence degradation for stale data**
The 50+ embedded benchmarks have `confidence_score` fields but no staleness decay. A 2-year-old benchmark for "Food Delivery" should score lower than a freshly updated one.

**Gap 5: No sensitivity analysis**
The system produces 3 scenarios (pessimistic/base/optimistic) with fixed multipliers (0.8x/1.0x/1.25x). There's no Monte Carlo or variable-sweep sensitivity showing which input has the most impact on profit.

---

## Plan: 5 High-Impact Upgrades

### Upgrade 1: Port QuantisMath to Edge Function (Server-Side Precision)

**Problem**: 903+ lines of `Math.round(a * b)` in the production pipeline.

**Solution**: Create a Deno-compatible copy of the precision library at `supabase/functions/analyze-business/quantis-math-server.ts`. This is necessary because edge functions run in Deno and cannot import from `src/lib/`.

- Port `QuantisMath` class (sanitize, add, subtract, multiply, divide, percentage, npv, ltv, paybackMonths, breakEvenRevenue)
- Use `npm:decimal.js` specifier per the project's edge function deployment standard
- Refactor `calculateStrictFinancials` to use `QuantisMath` for all arithmetic — eliminate every `Math.round(a * b)` pattern
- Refactor `computeFinancials` in `financial-engine.ts` the same way
- Keep `Math.round()` only as a final display-rounding step via `QuantisMath.round()`

**Files**: New `quantis-math-server.ts`, modified `financial-engine.ts`, modified `index.ts` (calculateStrictFinancials section)

### Upgrade 2: Cross-Validation Between Dual Engine Paths

**Problem**: `calculateStrictFinancials` and the Quantis engine (`processQuantisAnalysis`) both compute MRR, LTV, CAC, netProfit independently. If they disagree, nobody knows.

**Solution**: After both engines run, compare their outputs:

```text
compareEngineOutputs(strictResult, quantisResult) → {
  agreementScore: 0-100,
  divergences: [{ metric, pathA, pathB, delta% }],
  finalOutput: "strict" | "quantis" | "merged"
}
```

- If agreement > 95%: use strict result (higher audit trail fidelity)
- If agreement 80-95%: use strict result + flag divergences in audit
- If agreement < 80%: log critical warning, investigate root cause, use quantis result (has more validation layers)

Wire this into the response payload so the UI can eventually show a "dual-engine verified" badge.

**Files**: New `engine-cross-validator.ts`, modified `index.ts` (post-calculation section)

### Upgrade 3: AI Narrator Number Anchoring

**Problem**: The AI narrator can still generate text containing numbers that don't match the computed metrics.

**Solution**: Enhance the system prompt and post-validation:

1. Inject a `COMPUTED_ANCHORS` block into the system prompt:
```text
IMMUTABLE FINANCIAL ANCHORS (you MUST use these exact numbers):
- MRR: $X | Net Profit: $Y | LTV: $Z | CAC: $W | ROI Y1: R%
DO NOT invent, estimate, or modify these numbers.
```

2. Strengthen `validateAIOutput` to do regex extraction of all dollar amounts and percentages from AI text, then cross-check each against the computed metrics within ±1% tolerance.

3. If any AI-generated number diverges > 5% from the computed anchor, auto-replace it in the output text with the correct value and tag it `[corrected]`.

**Files**: Modified `narrator-prompt.ts`, modified `ai-safety-guardrails.ts`, modified `index.ts` (AI call section)

### Upgrade 4: Sensitivity Analysis Module

**Problem**: Users get 3 fixed scenarios but don't know which variable (price, CAC, churn, costs) has the biggest impact on their profit.

**Solution**: Create `sensitivity-analyzer.ts` that sweeps each input ±20% and measures the resulting change in net profit:

```text
sensitivityAnalysis(baseMetrics, benchmarks) → {
  tornado: [
    { variable: "Price", -20%_profit: $X, +20%_profit: $Y, sensitivity: 0.85 },
    { variable: "CAC", ... },
    { variable: "Churn Rate", ... },
    { variable: "Fixed Costs", ... },
  ],
  mostSensitiveVariable: "Price",
  leastSensitiveVariable: "Fixed Costs"
}
```

This gives users the "which lever should I pull?" answer that separates a real financial tool from a calculator.

**Files**: New `sensitivity-analyzer.ts`, modified `index.ts` (add to response), minor UI update to display tornado chart

### Upgrade 5: Benchmark Confidence Decay + Source Scoring

**Problem**: All benchmarks are treated equally regardless of how old, how many data points, or what source they come from.

**Solution**: Add a `computeBenchmarkConfidence()` function:

```text
confidence = base_score
  × staleness_factor (1.0 if <6mo, 0.9 if <1yr, 0.7 if <2yr)
  × sample_size_factor (log(sample_size) / log(100), capped at 1.0)
  × source_weight (kerry_dataset: 0.85, government_data: 0.95, industry_report: 0.90)
```

This confidence feeds into:
- The reliability score shown to users
- The AI prompt (lower confidence → more hedging language)
- The consensus evaluator thresholds (lower confidence → wider tolerance)

**Files**: Modified `embedded-benchmarks.ts` (add `last_updated` field), new `benchmark-confidence.ts`, modified `index.ts`

---

## Implementation Priority

| Order | Upgrade | Impact | Effort | Risk |
|-------|---------|--------|--------|------|
| 1 | Server-side QuantisMath | Eliminates all FP drift in production | High | Low — pure refactor |
| 2 | AI number anchoring | Prevents hallucinated financials | High | Low |
| 3 | Cross-validation | Catches engine disagreements | Medium | Low |
| 4 | Sensitivity analysis | Adds real analytical depth | High | Medium — new feature |
| 5 | Benchmark confidence decay | Improves data quality scoring | Medium | Low |

## What This Does NOT Include (Flagged for Later)

- **Monte Carlo simulation**: Requires significant compute; better as a Phase 3 feature
- **Real-time market data feeds**: Would need API integrations (BLS, Statista); separate project
- **Full dual-model AI consensus**: Requires running both GPT + Gemini per request; cost implications need evaluation first
- **UI confidence badges**: Phase 5 work that depends on this data layer being solid first

## Files Changed Summary

| File | Action |
|------|--------|
| `supabase/functions/analyze-business/quantis-math-server.ts` | New — Deno-compatible precision math |
| `supabase/functions/analyze-business/financial-engine.ts` | Refactor to use QuantisMath |
| `supabase/functions/analyze-business/index.ts` | Refactor calculateStrictFinancials + wire cross-validation + sensitivity |
| `supabase/functions/analyze-business/engine-cross-validator.ts` | New — dual-path agreement checker |
| `supabase/functions/analyze-business/sensitivity-analyzer.ts` | New — tornado sensitivity analysis |
| `supabase/functions/analyze-business/benchmark-confidence.ts` | New — staleness/source scoring |
| `supabase/functions/analyze-business/narrator-prompt.ts` | Enhanced number anchoring |
| `supabase/functions/analyze-business/ai-safety-guardrails.ts` | Stronger post-validation |
| `supabase/functions/analyze-business/embedded-benchmarks.ts` | Add last_updated metadata |

