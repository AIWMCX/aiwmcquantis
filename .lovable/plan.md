
# Quantis Engine — Comprehensive Audit & Fix Plan

## What Was Found: Honest Assessment of Every Bug

After reading every line of `financial-engine.ts`, `index.ts` (3,700 lines), `quantis-engine.ts`, `bulletproof-validator.ts`, `validation-layer.ts`, and `narrator-prompt.ts`, here is the complete, honest list of confirmed bugs with their exact locations in code.

---

### BUG 1 — LTV Formula is Wrong (Most Critical)

**Location:** `index.ts` line 1036, `financial-engine.ts` line 171, `quantis-engine.ts` line 237

**What the code does now:**
```text
LTV = Avg_Check × Orders_per_Month × Lifetime_Months
```

**What is wrong:** This formula calculates raw revenue from a customer, not actual lifetime value. It completely ignores **gross margin** — the portion of each transaction the business actually keeps after cost of goods (COGS). For a SaaS with 80% gross margin, a $100 check generates only $80 in value. For a food business with 38% COGS, a $30 check generates only ~$19 in value.

**What it should be:**
```text
LTV = Avg_Check × Gross_Margin% × Orders_per_Month × Lifetime_Months
```

**Real-world impact from the audited report:** The analyzed "customer acquisition" SaaS business had: Avg_Check = $200, Orders = 1/mo, Lifetime = 24 months. Current formula gives LTV = $4,800. Correct formula at 80% gross margin gives LTV = $3,840. The LTV:CAC ratio the engine reported (5x) should have been 4x. This cascades into every downstream metric.

---

### BUG 2 — NPV Uses Cumulative Cash Flow, Not Discounted Cash Flow

**Location:** `financial-engine.ts` line 369

**What the code does now:**
```text
NPV = Net_Profit × 36 - Investment
```

**What is wrong:** This is simple 3-year cumulative profit, not Net Present Value. A true NPV must discount future cash flows to their present value using a discount rate (cost of capital). $1 received 3 years from now is worth less than $1 today. The current formula overstates value by ignoring time value of money.

**What it should be (DCF model):**
```text
Monthly_Discount_Rate = (1 + Annual_Rate)^(1/12) - 1   (using 10% annual)
NPV = -Investment + Σ(month 1 to 36) [Net_Profit / (1 + Monthly_Rate)^month]
```

---

### BUG 3 — Investment Template Uses Wrong Industry ID Mapping

**Location:** `financial-engine.ts` lines 768–776, `generateInvestmentBreakdown()`

**What the code does now:** The investment allocation dictionary has keys: `saas`, `ecommerce`, `food_service`, `consulting`, `default`.

**What is wrong:** The benchmark system uses `industry_id` values like `saas_startup`, `b2b_saas`, `digital_marketing` — none of which match the allocation keys. So `saas_startup` falls through to `default` and gets 40% Equipment / 15% Inventory allocations — completely wrong for a software business. SaaS businesses should get 35% Working Capital / 30% Equipment / 20% Marketing.

**What it should be:** Normalize the industry ID before looking up allocations, with a broader mapping that catches all SaaS/tech variants.

---

### BUG 4 — Margin Guard in bulletproof-validator.ts is Not Wired to the Report Pipeline

**Location:** `bulletproof-validator.ts` lines 471–492 detects `UNREALISTIC_NET_MARGIN` and adds it to `errors[]`.

**What is wrong:** The main pipeline in `index.ts` calls `calculateStrictFinancials()` directly, **not** `validateBusinessInput()` from `bulletproof-validator.ts`. The guard exists but is bypassed. When a user enters $50,000 revenue and $0 costs, the engine will happily generate a 100% net margin report and show it to the user. The `quantis-engine.ts` does call `validateBusinessInput()` but only from the secondary orchestration path, not from the primary `calculateStrictFinancials()` path that generates the final PDF data.

**What it should be:** Add an explicit margin ceiling check inside `calculateStrictFinancials()` that clamps net margin to `benchmarks.net_margin_max + 20%` and records it as a correction.

---

### BUG 5 — Narrator Hallucination Risk: LTV:CAC Ratio Written in Text Without Guardrail

**Location:** `narrator-prompt.ts` lines 99–162

**What was found:** The narrator system prompt correctly injects all engine-computed values, including the LTV:CAC ratio. The audit report showed the narrator generated a hallucinated "66:1 LTV:CAC" in the text body. This happens because the **executive summary** is free-form text where the LLM is asked to "reference metrics by exact value" but the instruction is enforcement through natural language only — not a hard code-level check. After generation, `validateAIOutput()` from `ai-safety-guardrails.ts` is called, but it checks for secrets/PII leakage, not for numeric consistency.

**What it should be:** After the narrator returns, run a numeric consistency check: extract any dollar/percentage figures from the executive_summary text and compare against the 5 key metrics. If a number in the text differs from the engine by more than 20%, replace the offending sentence with a fallback template sentence using the correct engine value.

---

### BUG 6 — Scenario Gross Margin is Identical Across All Three Scenarios

**Location:** `financial-engine.ts` lines 512–561

**What is wrong:** The pessimistic scenario applies `revenue × 0.80` and `costs × 1.10`. But the COGS scaling is `cogs × mult.conservative.revenue` (also 0.80), which means COGS shrinks proportionally with revenue. As a result, **gross margin % stays locked at the same value in all three scenarios**. In reality, pessimistic scenarios typically have compressed margins due to fixed cost leverage — fewer sales at the same overhead means worse gross margin %.

**What it should be:** Apply a gross margin compression factor in pessimistic (–5% gross margin %) and expansion in optimistic (+3% gross margin %). This affects COGS: in pessimistic, COGS ratio increases; in optimistic, it decreases slightly.

---

### BUG 7 — Break-Even Calculation Has a Division-by-Zero Risk and Uses Marketing as Variable Cost

**Location:** `index.ts` line 1230

**What the code does:**
```text
variableCostRatio = (cogs_percent / 100) + (marketing / mrr)
breakEven = fixedCosts / (1 - variableCostRatio)
```

**What is wrong:** If `mrr = 0` (first analysis before any revenue), this produces `marketing / 0 = Infinity`, causing `variableCostRatio > 1`, causing `1 - variableCostRatio < 0`, and the break-even becomes a **negative number**. There is a guard against `contributionMargin > 0` returning 0, but a negative contribution margin is not caught. Additionally, marketing cost is not purely variable — it is somewhat fixed (CAC × replacement clients needed). Treating it as a variable cost % of revenue when the user has 0 revenue breaks the formula.

**Fix:** Add `mrr > 0` guard; if mrr = 0, use a minimum revenue of the benchmark's average_check as floor.

---

## Implementation Plan: What We Will Fix and How

### Phase 1 — Fix `financial-engine.ts` (Core Formula Fixes)

**1A. Fix LTV Formula**
Add `grossMarginFraction` parameter (derived from `benchmarks.cogs_percent`):
```text
grossMarginFraction = 1 - (cogs_percent / 100)
LTV = Avg_Check × grossMarginFraction × Orders_per_Month × Lifetime_Months
```
Update the audit log entry to show the new formula and inputs.
Update the `isValid` check on LTV:CAC to use the new LTV.

**1B. Fix NPV to True DCF**
Replace the single line `npv3Years = netProfit * 36 - startupInvestment` with a proper 36-month DCF loop using a 10% annual discount rate (standard WACC for small business). Show the formula and rate in the audit entry.

**1C. Fix Scenario Gross Margin Compression**
In `generateScenarios()`, adjust COGS in pessimistic scenario to increase by 5% of revenue (margin compression), and decrease by 2% in optimistic (operational efficiency). Net margins will now correctly differ between scenarios.

**1D. Fix Break-Even Division-by-Zero**
Add `mrr > 1` guard; if zero, substitute `benchmarks.average_check_min` as floor to prevent Infinity.

### Phase 2 — Fix `index.ts` `calculateStrictFinancials()` (Apply Same Fixes to Primary Pipeline)

The primary report pipeline lives in `calculateStrictFinancials()` inside `index.ts`, which is a parallel implementation to `financial-engine.ts`. The same LTV, NPV, and break-even bugs exist here independently and need the same corrections applied:
- Same LTV gross-margin fix at line ~1036
- Same break-even guard at line ~1230
- Add net margin ceiling: if `netMarginPercent > benchmarks.net_margin_max + 20`, clamp and record a correction entry

### Phase 3 — Fix `financial-engine.ts` `generateInvestmentBreakdown()` (Industry Mapping)

Add an alias/normalization map at the top of the function:
```text
const ID_ALIASES = {
  'saas_startup': 'saas',
  'b2b_saas': 'saas',
  'digital_marketing': 'consulting',
  'ecommerce_retail': 'ecommerce',
  'dropshipping': 'ecommerce',
  'food_service': 'food_service',
  ...
}
const normalizedId = ID_ALIASES[industryId] || industryId;
const ratios = allocations[normalizedId] || allocations.default;
```

### Phase 4 — Add Narrator Numeric Consistency Guard in `narrator-prompt.ts` / `index.ts`

After calling the narrator (in `index.ts`), add a `sanitizeNarratorNumbers()` function:
- Extract all dollar/percentage values from `executive_summary` text using regex
- Compare each to the 5 key engine metrics (net profit, LTV:CAC, ROI, payback, net margin)
- If a value deviates by more than 25%, replace the containing sentence with a template sentence: `"The deterministic engine calculated a ${metric.ltvCacRatio}x LTV:CAC ratio based on $${metric.ltv} LTV and $${metric.cac} CAC."`

### Phase 5 — Add Margin Ceiling Guard in `calculateStrictFinancials()`

After computing `netMarginPercent`, add:
```typescript
const maxAllowedMargin = benchmarks.net_margin_max + 20;
if (netMarginPercent > maxAllowedMargin) {
  corrections.push({
    field: 'net_margin',
    original: netMarginPercent,
    corrected: maxAllowedMargin,
    reason: `Net margin ${netMarginPercent}% exceeds maximum realistic threshold of ${maxAllowedMargin}% for ${benchmarks.name}`
  });
  // Recalculate minimum expenses to make margin realistic
  const targetExpenses = Math.round(mrr * (1 - maxAllowedMargin / 100));
  // Distribute difference proportionally across fixed costs
  ...
}
```

---

## Files That Will Be Changed

| File | Changes |
|------|---------|
| `supabase/functions/analyze-business/financial-engine.ts` | Fix LTV (+ gross margin), fix NPV (DCF), fix scenario margin compression, fix break-even guard |
| `supabase/functions/analyze-business/index.ts` | Fix LTV in `calculateStrictFinancials()` (line ~1036), fix NPV, fix break-even, add margin ceiling guard |
| `supabase/functions/analyze-business/financial-engine.ts` | Fix `generateInvestmentBreakdown()` industry ID alias mapping |
| `supabase/functions/analyze-business/narrator-prompt.ts` | Export `KEY_METRICS_PATTERN` regex for post-generation validation |
| `supabase/functions/analyze-business/index.ts` | Add `sanitizeNarratorNumbers()` called after narrator response, before building final result |

---

## What Will NOT Change

- The 7-layer AI Safety Architecture — already working correctly
- The rate limiting, anonymous tracking, and abuse prevention
- The location intelligence multipliers — these are correct
- The sub-industry detection logic — this is correct
- The `validation-layer.ts` hard-fail checks — these work correctly
- The narrator system prompt structure — the injection of metrics into the prompt is already correct; we only add post-generation validation

---

## Expected Outcome After Fix

| Metric | Before Fix | After Fix |
|--------|-----------|-----------|
| LTV for SaaS ($200/mo, 24mo) | $4,800 (raw revenue) | $3,840 (margin-adjusted) |
| NPV (3yr) | Cumulative profit, no discount | True DCF at 10% WACC |
| Investment breakdown (SaaS) | 40% equipment, 15% inventory | 35% working capital, 20% marketing |
| Scenario gross margins | Identical across all 3 | Compressed pessimistic, expanded optimistic |
| Narrator LTV:CAC in text | Can hallucinate different values | Validated against engine output |
| Net margin 55% report | Generated without warning | Flagged, clamped, correction shown |
