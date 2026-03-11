

# Comprehensive Test Suite — 6 Layers of Engine Validation

## Overview

Build a complete test infrastructure covering formulas, reconciliation, benchmarks/golden vectors, Monte Carlo/scenarios, QSL/confidence behavior, and non-functional regression. This expands the existing 4 test files (~1,750 lines) into a comprehensive 10-file suite.

## What Exists Today

| File | Coverage |
|------|----------|
| `quantis-math.test.ts` | QMath arithmetic, sanitization, FormulaRegistry (15+ formulas) |
| `financial-engine.test.ts` | LTV, LTV:CAC, expenses, payback, ROI, edge cases |
| `financial-engine-v2.test.ts` | 7 bug-fix regressions (LTV margin, NPV DCF, margin ceiling, scenarios, break-even) |
| `bulletproof-validator.test.ts` | Expense reconciliation, margin validation, revenue reconciliation, payback |
| `prompt-injection.test.ts` | AI safety guardrails |

## What We're Building

### Layer 1 — `src/__tests__/formula-registry-complete.test.ts` (NEW)
Exhaustive tests for **all 25+ registered formulas** individually, beyond the existing `testAll()` bulk check.

- Import `FormulaRegistry` and test each formula by ID with multiple input vectors
- Cover: `ltv`, `payback_months`, `net_profit`, `gross_margin_pct`, `net_margin_pct`, `break_even_revenue`, `roi_year1`, `cac_payback`, `arr`, `npv`, `compound_growth`, `monthly_discount_rate`, `mini_annual_roi`, `mini_payback`, `mini_net_margin`, and all others
- Each formula gets 3–5 input vectors including edge cases (zero, negative, large values)
- Tolerance: exact for integer outputs, ±0.01 for currency, ±0.1 for percentages
- Assert `isValid`, `confidence`, `auditTrail` presence on every execution

### Layer 2 — `src/__tests__/reconciliation-engine.test.ts` (NEW)
Tests the 10-rule reconciliation engine by importing `reconcileFinancialOutput` directly.

- **R-001 to R-003 (Sum Integrity)**: Construct `PLStatement[]` with deliberate mismatches (revenue ≠ COGS + gross profit, itemized opex ≠ total opex, GP − opex ≠ EBITDA) → assert auto-correction and `autoResolved: true`
- **R-004 to R-005 (Sign Consistency)**: Inject negative revenue, negative COGS, negative runway → assert `severity: 'critical'`
- **R-006 (Margin/Risk Contradiction)**: Net margin < −10% with `riskLevel: 'Low'` → assert critical flag and force to Moderate
- **R-007 to R-008 (Logical Constraints)**: Negative active customers, gross margin > 100%, year-1 net margin > 60% → assert major flags
- **R-009 to R-010 (Benchmark Boundaries)**: LTV outside [100, 50000], CAC payback outside [1, 36], LTV:CAC outside [0.5, 15] → assert minor flags
- **Edge cases**: Zero revenue months, all-zero P&L, extreme opex
- Build minimal mock `PLStatement`, `CashFlowStatement`, `UnitEconomicsResult` objects matching the types from `financial-engine.ts`

### Layer 3 — `src/__tests__/golden-vectors.test.ts` (NEW)
Validates the 10 golden test vectors against the financial engine's expected output ranges.

- Import `GOLDEN_VECTORS` from `golden-test-vectors.ts`
- For each vector: construct engine inputs, run a simplified financial model (reuse the `computeTestFinancials` pattern from existing tests), assert outputs fall within `expectedRanges`
- Metrics checked: `netMarginPct`, `breakEven`, `grossMarginPct`, `ltvCac`, `m12Profit`, `runway`
- Pass criteria: all 10 vectors within their defined tolerance (typically ±15%)
- Test that all 10 vectors are `isActive: true`
- Test that vector codes are unique and follow `GTV-*` pattern

### Layer 4 — `src/__tests__/monte-carlo.test.ts` (NEW)
Tests Monte Carlo simulation correctness and scenario engine directional consistency.

**Monte Carlo:**
- Seeded PRNG determinism: same seed → identical results across runs
- Uniform distribution: p50 ≈ midpoint within ±5% over 2000 iterations
- Normal distribution: mean ≈ baseValue, ~68% of samples within 1 stdDev
- Triangular distribution: mode ≈ peak value
- `probabilityPositive`: 100% when all inputs positive, ~50% when centered at 0
- Edge: single iteration, zero-range params, negative outputs

**Scenario Engine:**
- `applyScenario` with `recession` preset: assert revenue decreases, CAC increases
- `applyScenario` with `best_case`: assert revenue increases, costs decrease
- `applyScenario` with `worst_case`: assert revenue decreases, costs increase
- All 8 built-in scenarios maintain directional consistency (not exact values, just directions)
- Scenario shocks are multiplicative (verify multiplier math)

### Layer 5 — `src/__tests__/qsl-confidence.test.ts` (NEW)
Tests QSL tier assignment and confidence scorer behavior.

**QSL:**
- Score 0–69 → `QSL.EXPLORATORY`
- Score 70–84 → `QSL.PLANNING`
- Score 85–94 → `QSL.INVESTOR`
- Score 95–100 → `QSL.LOAN`
- Boundary tests: 69→EXPLORATORY, 70→PLANNING, 84→PLANNING, 85→INVESTOR, 94→INVESTOR, 95→LOAN
- `shouldPulse`: true only for INVESTOR and LOAN
- Clamping: score -10 → EXPLORATORY, score 150 → LOAN

**Confidence Scorer:**
- High consensus (95) + high completeness (95) + high benchmark (90) + fresh data → tier `verified`, score ≥ 95
- Low consensus (40) + low completeness (30) + low benchmark (20) → tier `blocked`, score < 50
- Stale data (72h) → freshness penalty applied, warnings include "days old"
- Small sample (5) → warning about sample size
- Consensus < 70 → warning about AI disagreement
- Dual-engine disagreement beyond threshold: score drops below INVESTOR grade

**Synthetic QSL scenarios:**
- High activation + low leverage (high completeness, low benchmark alignment) → score in PLANNING range (QSL-2), not INVESTOR
- High activation + high leverage → INVESTOR or LOAN
- Missing benchmarks (alignment = 0) → cannot reach QSL-4
- Reconciliation failure (simulate via low consensus) → downgrades result

### Layer 6 — `src/__tests__/regression-suite.test.ts` (NEW)
Integration-level regression that ties all layers together.

- Import and run `FormulaRegistry.testAll()` → assert 0 failures
- Import `QMath.runSelfTest()` → assert all pass
- Verify `GOLDEN_VECTORS` count ≥ 10 and all active
- Verify `BUILT_IN_SCENARIOS` count ≥ 8
- Verify `FormulaRegistry.size` ≥ 25
- Run confidence scorer on 5 synthetic profiles and assert tier assignments match expected
- Summary: acts as the nightly "full suite" gate — if this file passes, the engine is consistent

## File Summary

| File | Layer | Tests |
|------|-------|-------|
| `src/__tests__/formula-registry-complete.test.ts` | 1 | ~60 tests across 25+ formulas |
| `src/__tests__/reconciliation-engine.test.ts` | 2 | ~25 tests for 10 rules + edges |
| `src/__tests__/golden-vectors.test.ts` | 3 | ~15 tests for 10 vectors + meta |
| `src/__tests__/monte-carlo.test.ts` | 4 | ~20 tests for MC + scenarios |
| `src/__tests__/qsl-confidence.test.ts` | 5 | ~25 tests for QSL + scorer |
| `src/__tests__/regression-suite.test.ts` | 6 | ~10 integration gate tests |

No existing files are modified. All new test files.

