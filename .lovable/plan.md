

# Fix "999 Months" Payback Period Display Bug

## Problem

When a business is unprofitable (monthly expenses exceed revenue), the payback period is mathematically infinite. The engine uses `999` as a sentinel value meaning "never pays back." However, this raw number leaks into the UI and PDF reports, displaying as **"999 months"** -- which is incorrect and confusing.

This affects:
- The in-app Financial Summary display
- The Executive PDF Report
- The MiniDemo calculator on the landing page

## Root Cause

There are **two code paths** that produce the payback value:

1. **Quantis 2.0 Engine** (`quantis-engine.ts`) -- correctly uses `formatPaybackPeriod()` which returns `null` for unprofitable businesses
2. **Fallback Engine** (`index.ts`, lines 1198-1205) -- sets `paybackMonths = 999` and passes it raw into the response at line 2105: `payback_period_months: calc.paybackMonths`

Your Hookah analysis used the fallback engine (version `9.1-resilient-fallback`), so the raw `999` went straight into the saved result.

Additionally, the **display components never check for the sentinel value**:
- `ReportExecutiveSummary.tsx` line 71: renders `{paybackMonths} months` with no guard
- `FinancialSummary.tsx` line 234/294: same issue
- `getPaybackMonths()` in `types/analysis.ts`: returns the raw number

## Fix Plan

### 1. Backend: Fix the fallback engine output (index.ts)

At line 2105 where the response is built, replace:
```
payback_period_months: calc.paybackMonths
```
with:
```
payback_period_months: calc.paybackMonths >= 999 ? 0 : calc.paybackMonths
```

This ensures the sentinel value never reaches the client. A `0` payback with negative profit clearly signals "not applicable."

### 2. Frontend: Guard all payback displays

**ReportExecutiveSummary.tsx** (line 70-72):
Replace `{paybackMonths} months` with a helper that shows "N/A" when the business is unprofitable (payback is 0 or >= 999).

**FinancialSummary.tsx** (lines 234 and 294):
Same guard -- display "N/A" instead of "999 mo." or "0 mo." when unprofitable.

**types/analysis.ts** - `getPaybackMonths()`:
Add a guard so it never returns 999.

**MiniDemo calculations.ts** (line 22):
Already caps at 999 and `formatPayback` returns "N/A" for >= 999. This is correct -- no change needed.

### 3. Create a shared helper

Add a `formatPaybackDisplay(months: number, profit: number)` utility that centralizes the logic:
- If profit <= 0 or months >= 999 or months === 0: return "N/A (unprofitable)"
- If months < 12: return "X months"
- Otherwise: return "X.X years"

### Files to Change

| File | Change |
|------|--------|
| `supabase/functions/analyze-business/index.ts` | Sanitize paybackMonths before outputting (line ~2105) |
| `src/components/pdf/ReportExecutiveSummary.tsx` | Guard payback display against 999/0 |
| `src/components/analysis/FinancialSummary.tsx` | Guard payback display against 999/0 |
| `src/types/analysis.ts` | Guard `getPaybackMonths()` against 999 |

### Verification

The Hookah Place analysis has `payback_period_months: 999` in the saved result (MRR $3,000 vs expenses $12,335 = loss of $9,335/mo). After the fix:
- In-app display will show "N/A (unprofitable)" instead of "999 mo."
- PDF report will show "N/A" instead of "999 months"
- Future analyses will never output 999 from the backend

