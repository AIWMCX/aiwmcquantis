

# Phase 1 — Precision Math Foundation: Gap Analysis & Implementation Plan

## Current State Assessment

The codebase **already implements most of what Phase 1 requests**:

- **`src/lib/quantis-math.ts`** — Full `QuantisMath` class with decimal.js: `add`, `subtract`, `multiply`, `divide`, `percentage`, `compound`, `weightedAverage`, `clamp`, `normalize`, `round`, `standardDeviation`, `npv`, `roi`, `ltv`, `paybackMonths`, `breakEvenRevenue`, `confidenceInterval`, `sanitizeWithOrigin`. All zero-guarded, NaN-safe.

- **`supabase/functions/analyze-business/quantis-math-server.ts`** — Server-side `QMath` mirror (205 lines) using `npm:decimal.js` for Deno. Same method set.

- **`supabase/functions/analyze-business/financial-engine.ts`** — Already refactored to use `QMath` for all arithmetic (865 lines). Full audit trail with `CalculationAudit[]`. No raw `Math.round(a * b)` patterns on financial values.

- **`src/lib/formula-registry.ts`** — 656-line centralized formula registry with test cases, confidence weights, and versioning.

- **`src/lib/errors.ts`** — Centralized error system with typed codes, recovery paths, and `QuantisError` base class.

## What's Missing (Gaps to Fill)

### 1. `src/lib/quantis-errors.ts` — Quantis-specific error codes file
The plan calls for `QE-001` through `QE-008` codes. These don't exist as a standalone file. The current `errors.ts` has application-level error codes but not the math-layer `QE-*` codes referenced in the spec.

### 2. Statistical methods on the client-side `QuantisMath` class
`QuantisMath` is missing: `mean`, `median`, `zScore`, `percentile` (the server `QMath` has some of these but the client class doesn't).

### 3. `QMath.runSelfTest()` verification function
Neither the client nor server math class has a self-test function.

### 4. `ENGINE_VERSION` export
`financial-engine.ts` does not export a version constant.

### 5. `calculateWithTrace()` wrapper
The engine has inline audit trails but no standalone `calculateWithTrace()` export that returns `{ result, steps, confidence }`.

### 6. Remaining raw arithmetic in `financial-engine.ts`
Lines 234, 278, 296-301, 396, 401, 454-455 still use raw `+`, `-`, `*` operators on financial values (e.g., `fixedCosts = adjustedSalaries + adjustedRent + ...`, `grossProfit = mrr - cogs`, `arr: mrr * 12`). These should route through QMath.

---

## Implementation

### File 1: `src/lib/quantis-errors.ts` (New)
Export `QUANTIS_ERRORS` object with codes QE-001 through QE-008, each with `code`, `name`, `message`, `severity`, `recoverable` fields.

### File 2: `src/lib/quantis-math.ts` (Edit)
Add missing static methods to `QuantisMath`:
- `mean(dataset)` — average of array
- `median(dataset)` — sorted middle value
- `zScore(value, mean, stdDev)` — `(value - mean) / stdDev`, zero-safe
- `percentile(dataset, p)` — linear interpolation percentile (p = 0-100)
- `runSelfTest()` — 10 known-answer checks, returns `{ passed, failed, errors }`

### File 3: `supabase/functions/analyze-business/quantis-math-server.ts` (Edit)
Mirror the same `mean`, `median`, `zScore`, `percentile`, `runSelfTest` additions for server parity.

### File 4: `supabase/functions/analyze-business/financial-engine.ts` (Edit)
- Replace ~8 remaining raw arithmetic lines with `QMath` calls
- Add `export const ENGINE_VERSION = "2.0.0-precision"`
- Add `export function computeFinancialsWithTrace(input)` wrapper that returns `{ result: ComputedMetrics, steps: CalculationStep[], confidence: number }`

### No structural changes
All existing function signatures, imports, and external APIs remain unchanged. This is a precision tightening pass, not a refactor.

