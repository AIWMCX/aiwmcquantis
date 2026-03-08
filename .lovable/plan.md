

# Phase 2 — Dual-AI Consensus Engine

## What Exists

- **`src/lib/consensus-evaluator.ts`** — Deterministic numeric agreement checker for formula outputs (not AI model outputs). Already has `ConsensusResult`, `DivergenceType`, merge strategies. This is the *formula-level* consensus, not the *AI model* consensus.
- **`supabase/functions/ai-narrator/index.ts`** — Single-model (GPT-5 mini) narrator with fallback. No dual-model calling.
- **`src/components/analysis/ModelConfidenceBadge.tsx`** — Existing confidence badge UI with factor breakdown, progress bars, and tier styling (safe/caution/high_risk).
- **No `src/services/ai-consensus.ts` or `src/services/confidence-scorer.ts` exist yet.**

The AI consensus layer described in memory (`technical/ai-consensus-strategy`) is a design intent, not implemented code.

## Implementation

### File 1: `src/services/ai-consensus.ts` (New)

Client-side orchestration service. This does NOT call AI models directly — it invokes a new edge function that handles dual-model calls server-side.

Exports:
- `AIModelResult`, `ConsensusResult` interfaces as specified
- `runConsensusAnalysis(prompt, schema, options?)` — calls `supabase.functions.invoke('ai-consensus')`, which handles parallel model calls and returns the merged result
- `ConsensusCache` — Map with 5-min TTL, keyed by prompt hash
- `getConsensusHealth()` — reads from in-memory ring buffer of last 100 calls, returns `{ avgScore24h, blockRate, avgLatency }`

### File 2: `supabase/functions/ai-consensus/index.ts` (New edge function)

The actual dual-model orchestration lives server-side (secrets stay on backend):

1. Receives `{ prompt, schema, options }` from client
2. Calls GPT-5 mini and Gemini 3 Flash in parallel via `Promise.allSettled` against Lovable AI Gateway
3. Uses tool calling (not raw JSON) for structured output from both models
4. Compares numeric fields: agreement = `1 - abs(a-b) / max(a,b,1)`
5. Applies consensus thresholds:
   - ≥90 → `full_agreement` (use GPT result)
   - 70-89 → `weighted_merge` (GPT 60%, Gemini 40%)
   - 50-69 → `primary_wins` (flag divergences)
   - <50 → `blocked` (return error QE-007)
6. Returns full `ConsensusResult` with both model outputs, timing, token counts
7. Handles 429/402 rate limits, timeouts (25s per model), single-model fallback if one fails

### File 3: `src/services/confidence-scorer.ts` (New)

Pure deterministic scoring — no AI calls:

- `calculateOutputConfidence({ consensusScore, dataCompleteness, benchmarkAlignment, dataFreshnessHours, sampleSize })` → `{ score, tier, breakdown, warnings }`
- Weights: consensus 35%, completeness 30%, benchmark 20%, freshness penalty (-5%/24h, max -20%), sample bonus (+5% if n≥30, +2% if n≥10)
- Tiers: verified (95-100), confident (80-94), estimated (65-79), uncertain (50-64), blocked (0-49)
- `CONFIDENCE_BADGE_CONFIG` — tier→label/color/icon/description map

### File 4: `src/components/analysis/ConfidenceBadge.tsx` (New)

Lightweight badge component that consumes `CONFIDENCE_BADGE_CONFIG`:
- Shield icon with tier color
- Score percentage
- Tier label
- Expandable breakdown showing each factor's contribution

This complements the existing `ModelConfidenceBadge` (which shows prediction engine confidence). The new badge shows *output-level* confidence based on the multi-factor scoring.

### Wiring

- `src/services/analysisApi.ts` — After analysis completes, optionally call `calculateOutputConfidence()` with the result metadata and attach to the response
- `src/components/analysis/AnalysisResults.tsx` — Render `ConfidenceBadge` in the Reliability tab alongside existing `ModelConfidenceBadge`

### Files Summary

| File | Action |
|------|--------|
| `src/services/ai-consensus.ts` | New — client orchestration + cache + health |
| `supabase/functions/ai-consensus/index.ts` | New — dual-model server-side consensus |
| `src/services/confidence-scorer.ts` | New — deterministic confidence scoring |
| `src/components/analysis/ConfidenceBadge.tsx` | New — output confidence badge UI |
| `src/components/analysis/AnalysisResults.tsx` | Wire new badge into Reliability tab |

No changes to existing AI narrator, financial engine, or consensus evaluator. The dual-AI consensus is a new parallel path that can be opted into per-analysis.

