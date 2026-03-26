

# Fix Generic Fallbacks — Real Engine Data Everywhere

## Findings from End-to-End Test

### What's Working (Real Data) ✓
- **Metric cards**: Show computed chips like "Profitable at Mo.12", "6.0x — healthy", "Mo.24+ — slow", "$336k ARR"
- **StressMap collapsed**: Shows real values ("Unit economics at 6.0x LTV:CAC are strong", "Gross margin 62% is 3 pts below industry median 65%")
- **StressMap expanded**: Shows real LTV:CAC 6.0x, Healthy target ≥3.0x, Gap +3.0x above target, Health Score 85/100
- **Red Flag messages**: Show real computed data ("Revenue mismatch: Provided $28,000 but calculated $5,200 from 800 customers × $6.5")
- **Executive Summary**: Expandable with real AI-generated text

### What's Broken (Generic Fallbacks) ✗
1. **Mitigation Plan fallback** (lines 504-508 of AccuracyTransparentResults.tsx): When the insight-to-risk matching fails (which it does — `risk.field` is "REVENUE_MISMATCH" but `insight.metric_name` is "payback_period"), the fallback shows:
   - "Investigate REVENUE_MISMATCH drivers"
   - "Compare against industry benchmarks"
   - "Set measurable improvement targets"
   
   This is the **only remaining generic text** in the dashboard.

2. **SimpleMetricCard chip fallback** (lines 45-49): When no `chip` prop is passed, it falls back to "Good vs peers" / "Below median" / "Critical". Currently the caller passes specific chips, but the fallback should not exist.

## Plan

### 1. Fix Risk-to-Insight Matching Logic

**File: `src/components/analysis/AccuracyTransparentResults.tsx` (lines 469-508)**

The matching on line 471-474 uses exact field matching which fails. Fix by:
- Add keyword-based fuzzy matching: map common `risk.field` values (REVENUE_MISMATCH, PROFITABILITY, BREAK_EVEN, etc.) to related `insight.metric_name` values
- If still no match, try substring matching on `risk.message` against `insight.headline`
- When absolutely no insight matches, generate a **context-specific** fallback from the risk's own data (`risk.message`, `risk.expected`, `risk.field`) instead of the generic 3-step template

Replace the generic fallback (lines 504-508) with:
```
<li>Analyze {risk.message.split('.')[0].toLowerCase()}</li>
<li>{risk.expected || 'Review the underlying assumptions'}</li>
<li>Adjust inputs and re-run analysis for updated projections</li>
```

### 2. Remove Generic Chip Labels from SimpleMetricCard

**File: `src/components/analysis/SimpleMetricCard.tsx` (lines 45-49)**

Remove the fallback chip labels entirely — if no `chip` prop is provided, show no chip. The caller already passes specific computed chips. Delete:
```
variant === 'success' ? 'Good vs peers' :
variant === 'warning' ? 'Below median' :
variant === 'danger' ? 'Critical' :
```
Replace with: `const chipLabel = chip;` — only show a chip when explicitly provided.

### 3. Mobile Header Fix

The sticky results header on mobile (390px) truncates "MO.12 PROFIT" and "CONFIDENCE" labels. The header is horizontally cramped. This is a readability issue but not a generic-content issue — noting for awareness.

---

## Files Changed

| File | Changes |
|------|---------|
| `src/components/analysis/AccuracyTransparentResults.tsx` | Fix risk-to-insight matching logic; replace generic 3-step fallback with context-specific text derived from actual risk data |
| `src/components/analysis/SimpleMetricCard.tsx` | Remove generic "Good vs peers" / "Below median" / "Critical" fallback chip labels |

## Implementation Order
1. Fix matching logic + contextual fallback in AccuracyTransparentResults
2. Remove generic chip fallbacks from SimpleMetricCard

