

# Next Refinements: Pre-Phase 2 Hardening

## Analysis Summary

Your technical review is accurate. Here's what the codebase audit reveals:

**Achieved (client-side):**
- QuantisMath + FormulaRegistry fully operational with 17 formulas, test vectors, audit envelopes
- Mini-demo routed through registry — zero shadow math on landing page
- 34 precision tests passing

**Critical gap discovered:**
The production financial engine (`supabase/functions/analyze-business/financial-engine.ts` — 903 lines) still uses **raw JS arithmetic** (`Math.round`, `*`, `/`, etc.) for all server-side calculations. This is the actual analysis pipeline that produces user-facing reports. The FormulaRegistry currently only covers the client-side mini-demo.

This means the precision boundary you built exists at the marketing layer but not at the production layer where it matters most.

## Plan: 3 Refinements

### Refinement 1: Sanitize-origin distinction in QuantisMath

Add an `InputOrigin` flag so the UI can distinguish "real zero" from "sanitized fallback zero."

- Add `sanitizeWithOrigin()` returning `{ value: Decimal, wasSanitized: boolean, originalInput: string }`
- Export it alongside existing `sanitize()` (non-breaking)
- This feeds directly into confidence badges later (Phase 5)

**File:** `src/lib/quantis-math.ts`

### Refinement 2: FormulaRegistry metadata expansion

Add fields needed for consensus and confidence:
- `criticality: 'critical' | 'standard' | 'informational'`
- `units: string` (USD, %, months, ratio)
- `validRange: { min: number, max: number }` — output bounds for sanity checks

Update all 17 existing formulas with these fields. This is a schema expansion — fully backward-compatible since `execute()` already returns structured results.

**File:** `src/lib/formula-registry.ts`

### Refinement 3: ConsensusEvaluator interface + deterministic implementation

Define the contract boundary for Phase 2's dual-model consensus:

```typescript
interface ConsensusEvaluator {
  evaluate(
    results: FormulaExecutionResult[]
  ): {
    consensusScore: number;       // 0-100
    divergenceType: 'none' | 'minor' | 'major' | 'critical';
    mergedOutput: number;
    auditTrail: string;
  };
}
```

Start with a **deterministic-only** evaluator that compares two `execute()` results using `QuantisMath.equals()` with configurable tolerance. No AI model calls yet — pure numeric agreement checking. This is the "hook" that Phase 2 will plug dual-model outputs into.

**New file:** `src/lib/consensus-evaluator.ts`

## Not in scope (but flagged)

Migrating the edge function `financial-engine.ts` (903 lines of raw JS math) to use QuantisMath is a separate, larger task. The edge function runs in Deno and cannot import from `src/lib/` directly — it would need its own copy of the precision utilities or a shared module pattern. This should be its own dedicated phase.

## Files changed

| File | Action |
|------|--------|
| `src/lib/quantis-math.ts` | Add `sanitizeWithOrigin()` |
| `src/lib/formula-registry.ts` | Expand `FormulaDefinition` with criticality, units, validRange; update 17 formulas |
| `src/lib/consensus-evaluator.ts` | New — ConsensusEvaluator interface + deterministic implementation |

