
# PDF Report Quality Audit — Issues Found & Complete Fix Plan

## What Was Analyzed

The uploaded Executive Report PDF was parsed page by page, and the full source code was read across:
- All 9 PDF report component files (`usePdfExport.ts`, `ReportRiskAssessment.tsx`, etc.)
- The Quantis financial engine (`financial-engine.ts`, `quantis-engine.ts`)
- The main `analyze-business` edge function

---

## Issues Found (Categorized by Severity)

---

### CRITICAL — Data & Logic Bugs

**1. "GENERAL BUSINESS" Industry — No Specific Benchmark Applied**

The PDF cover page shows `GENERAL BUSINESS` as the detected industry. The Appendix (page 11) itself admits:
> "No industry-specific benchmarks applied"
> "Using default benchmarks"

The business idea was: *"Analyze my competitive position in the market..."* — this is a meta-question, not an actual business idea. The engine fell back to the `general_business` benchmark because it couldn't classify the input.

**Root cause:** `detectSubIndustry()` in `sub-industry-detection.ts` received a strategic question instead of a business type. The engine should detect this and prompt the user with an error or require a valid business idea before running the analysis.

---

**2. Expense Mismatch — Engine Warns But Report Hides It**

From the edge function logs:
```
⚠️ Expense mismatch detected: breakdown sum=$15,440, calc.totalExpenses=$8,250. Using sum.
```

The PDF (page 3) shows Total Monthly Expenses = **$15,440**, but the calculated net profit uses `-$440`, which implies expenses of ~$15,440. However, the financial engine originally computed `$8,250`. The discrepancy is real and large (87% difference). The engine silently chose the breakdown sum and the user sees no explanation.

**Fix needed:** When an expense mismatch is detected, the `limitations[]` array in the API response and the Appendix section in the PDF must explicitly show this correction with its magnitude.

---

**3. Russian Language Strings in Risk Color Mapping**

In `ReportRiskAssessment.tsx` (lines 14-30):

```typescript
const getProbabilityColor = (prob: string) => {
  switch (prob) {
    case 'высокая': return '#ef4444';   // Russian: "high"
    case 'средняя': return '#f59e0b';  // Russian: "medium"
    case 'низкая':  return '#22c55e';  // Russian: "low"
    default: return '#94a3b8';          // ← ALWAYS FALLS HERE FOR ENGLISH
  }
};
```

The AI returns English values (`HIGH`, `MEDIUM`, `LOW`), but the component matches Russian strings. **All risk colors default to grey `#94a3b8`**, making the entire Risk Matrix colorless and unprofessional in the PDF.

Same issue in the Risk Summary counter (line 116):
```typescript
businessRisks.filter(r => r.probability === 'высокая' || r.impact === 'высокий')
```
This always returns `0` for English responses, so all counters show `0`.

---

**4. Payback Period Inconsistency — Executive Summary Shows "8 months" When Business Is Unprofitable**

The PDF Executive Summary (page 2) shows:
- Monthly Net Profit: **-$440** (negative — a loss)
- Payback Period: **8 months**

A negative-profit business can never pay back in 8 months. The `formatPaybackDisplay()` function likely returns `8` based on the investment divided by a different (earlier) profit figure before the expense mismatch correction was applied.

**Fix:** Payback must always be recalculated from the **same** `netProfit` figure used for display. If `netProfit < 0`, payback must display `"Not achievable"` or `"N/A (unprofitable)"`.

---

**5. Gross Margin Ceiling Enforcement Not Explained to User**

From the edge function logs:
```
⚠️ Margin ceiling enforced: 90% → 45% (max for General Business = 25%)
```

The engine corrected the margin from 90% to 45%, but the benchmark maximum is 25%. The engine applied an intermediate ceiling (45%) rather than the strict benchmark maximum (25%). This is a guardrail logic inconsistency that needs resolving — either use the strict benchmark maximum or document why a softer ceiling was chosen.

---

### HIGH — Report Structure Problems

**6. Page Count Is Wrong**

The PDF footer says **"Page X of 8"** throughout, but the actual document has **11 pages** (confirmed by the parser which found content through `Page 11`). The cover page, executive summary, and financial pages all span more than 8 pages due to content overflow.

**Fix:** Change the hardcoded `"Page X of 8"` in `ReportPageElements.tsx` and `usePdfExport.ts` to `"Page X of 9"` or implement automatic page counting.

---

**7. Page Break Mid-Content (Executive Summary Cut Off)**

The Executive Summary (page 2) ends abruptly mid-sentence:
> "Psychographic"  ← truncated at end of page 2

The text is cut off and continues on page 3 without a header, creating a disjointed reading experience. The `@react-pdf/renderer` page auto-breaks inside a `<View>` block, but no `wrap={false}` or `break` hints are applied to content paragraphs.

---

**8. Business Overview Is Generic Boilerplate**

Page 2, Business Overview section reads:
> *"This General Business business opportunity in Austin, Texas..."*
> *"primary target customers in Austin, Texas who are seeking high-quality general business solutions"*

The phrase "General Business business opportunity" is duplicated and the entire section is generic template text that doesn't relate to the specific idea input by the user. This happens because the deterministic fallback engine was triggered (AI timed out), and the fallback uses `industry_name` directly in templates without checking for "General Business" edge cases.

---

### MEDIUM — Data Accuracy Improvements

**9. LTV Calculation Inconsistency Between Engines**

In `financial-engine.ts` (line 174):
```
LTV = Avg_Check × (1 - COGS%) × Orders_per_Month × Client_Lifetime_Months
```

In `quantis-engine.ts` (line 237):
```
LTV = Avg_Check × Orders_per_Month × Client_Lifetime_Months  ← NO gross margin adjustment
```

Two different LTV formulas are in use simultaneously. The financial engine (v1) applies gross margin fraction; the Quantis engine (v2) does not. The PDF output depends on which engine was used last, leading to unpredictable LTV/CAC ratio values.

---

**10. Appendix Limitation Messages Are Internal Developer Text**

The Appendix shows:
> "Using default benchmarks (upload Kerry dataset for enhanced accuracy)"
> "No industry-specific benchmarks applied"

These are developer-facing diagnostic messages, not user-facing limitations. Users shouldn't see "Kerry dataset" references — that's internal terminology.

---

## Complete Fix Plan

### Phase 1 — Critical Bug Fixes (Highest Priority)

**File: `src/components/pdf/ReportRiskAssessment.tsx`**
- Replace Russian string matching with English case-insensitive matching:
  `'high' | 'HIGH' | 'High'` → red; `'medium'` → amber; `'low'` → green
- Fix the Risk Summary counters to use `.toLowerCase()` comparison

**File: `src/hooks/usePdfExport.ts` + `src/components/pdf/ReportPageElements.tsx`**
- Fix payback period: add a guard — if `monthlyProfit < 0`, display `"N/A (currently at a loss)"` instead of a positive number
- Change `"Page X of 8"` to `"Page X of 9"` (the report genuinely has 9 content pages)

**File: `supabase/functions/analyze-business/index.ts`**
- When expense mismatch is detected, add it to the `limitations[]` array that gets sent to the frontend (e.g., `"Expense mismatch of $7,190 detected and corrected. Breakdown sum used."`)
- When the business idea appears to be a question/strategy prompt rather than a business type, return a validation error prompting users to describe a specific business

---

### Phase 2 — Accuracy & Consistency Improvements

**File: `supabase/functions/analyze-business/quantis-engine.ts`**
- Align LTV formula with `financial-engine.ts` — add the `grossMarginFraction` multiplication:
  `LTV = Avg_Check × (1 - COGS%) × Orders × Lifetime`
- This ensures a single source of truth for LTV across both engines

**File: `supabase/functions/analyze-business/narrator-prompt.ts`**
- Add a special-case guard: when `industry_detected === "General Business"` or `industry_detected === "general_business"`, the fallback narrator must avoid using the phrase "General Business business" and must substitute with "this business opportunity" or the user's actual idea text

**File: `src/components/pdf/ReportAppendix.tsx`**
- Replace internal developer limitation strings with user-friendly equivalents
- Hide or rename any reference to "Kerry dataset" — replace with "enhanced industry benchmarks"

---

### Phase 3 — Professional Polish

**File: `src/components/pdf/ReportExecutiveSummary.tsx`**
- Add text truncation or max character limits to the Business Overview paragraph to prevent mid-page overflow
- Add `break` hints or `wrap={false}` guards around key metric blocks

**File: `src/hooks/usePdfExport.ts`**
- Add dynamic page count calculation based on actual content length
- Fix gross margin ceiling log discrepancy — if max benchmark is 25%, enforce 25%, not 45%

---

## Summary Table

```text
| #  | Issue                                    | Severity | File(s)                              |
|----|------------------------------------------|----------|--------------------------------------|
| 1  | Generic "General Business" fallback      | Critical | analyze-business/index.ts            |
| 2  | Expense mismatch hidden from user        | Critical | analyze-business/index.ts            |
| 3  | Russian strings in Risk color mapping    | Critical | ReportRiskAssessment.tsx             |
| 4  | Payback shown positive when unprofitable | Critical | usePdfExport.ts                      |
| 5  | Margin ceiling enforced inconsistently   | High     | analyze-business/index.ts            |
| 6  | Wrong page count (says 8, is actually 9) | High     | ReportPageElements.tsx, usePdfExport |
| 7  | Page break cuts executive summary        | High     | usePdfExport.ts                      |
| 8  | Generic boilerplate in Business Overview | High     | narrator-prompt.ts                   |
| 9  | LTV formula mismatch between engines     | Medium   | quantis-engine.ts                    |
| 10 | Internal developer text in Appendix      | Medium   | ReportAppendix.tsx                   |
```

---

## What This Will Achieve

After these fixes:
- The Risk Matrix will show correct red/amber/green colors for all entries
- The Payback Period will never contradict the profit figure
- Expense corrections will be visible and explained to the user
- Business Overview will use the actual idea text instead of "General Business business"
- The Appendix will show clean, user-friendly limitation messages
- LTV calculations will be consistent across both financial engines
- Page numbers will be accurate
- The report will pass a CFO-level credibility review without contradiction
