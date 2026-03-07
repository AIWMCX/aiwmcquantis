

# Phase 1: Market Prior Engine + SCORE Schema I/O

Two high-leverage systems that transform Quantis from a benchmark-matching tool into a probabilistic intelligence platform with industry-standard interoperability.

---

## Part A: Bayesian Market Prior Engine

### What It Does
Every analysis passes through a "financial reality" layer that computes statistical distributions for the user's sector, then scores the user's numbers against those distributions. The result is an **Anomaly Card** surfaced in the UI: "Your EBITDA margin is in the 8th percentile for your peer group; typical range is 12–22%; main driver appears to be staff cost."

### Architecture

```text
User Input → NAICS/Segment Mapping → Distribution Lookup → Anomaly Scoring → Anomaly Card
                                          ↑
                              industry_distributions table
                              (mean, stddev, p10, p25, p50, p75, p90
                               for 15-20 ratios per NAICS code)
```

### Database Changes

**New table: `industry_distributions`**
- `naics_code` (text), `segment` (text), `metric_name` (text — e.g. "gross_margin", "ebitda_margin", "cac", "ltv_cac_ratio")
- `mean`, `stddev`, `p10`, `p25`, `median`, `p75`, `p90` (all numeric)
- `sample_size` (int), `source` (text — "sec_derived" | "sba_derived" | "kerry_computed"), `last_updated` (timestamptz)
- Primary key: `(naics_code, segment, metric_name)`
- RLS: read-only for authenticated, write for service_role only

**Seed data:** Compute distributions from existing `industry_benchmarks` + `embedded-benchmarks.ts` for ~15 metrics across all 50+ industries. The min/max/avg values already stored can bootstrap p10/p25/median/p75/p90 estimates using a normal approximation.

### Edge Function Changes

**New module: `supabase/functions/analyze-business/market-prior.ts`**

Core functions:
- `mapToNAICS(industryId, businessIdea)` — maps detected industry to NAICS segment
- `computeAnomalyScores(userMetrics, distributions)` — for each metric, compute z-score and percentile rank
- `generateAnomalyCard(anomalies)` — produces structured output with:
  - `metric`, `userValue`, `percentile`, `typicalRange` (p25-p75), `zScore`, `severity` ("normal" | "notable" | "outlier"), `driver` (optional text explaining why)

**Integration point in `index.ts`:** After financial engine produces metrics, call `computeAnomalyScores()` and attach `anomaly_card` to the response payload.

### Frontend Changes

**New component: `src/components/analysis/AnomalyCard.tsx`**
- Rendered in the **Reliability** tab of the results dashboard
- Shows each flagged metric as a horizontal percentile bar (p10-p90 range with user's position marked)
- Color-coded: green (p25-p75), yellow (p10-p25 or p75-p90), red (below p10 or above p90)
- Caption per metric: "Your gross margin (68%) is in the 92nd percentile — higher than 92% of similar businesses"

**Type additions in `src/types/analysis.ts`:**
```ts
interface AnomalyScore {
  metric: string;
  userValue: number;
  percentile: number;
  zScore: number;
  typicalRange: { p25: number; p75: number };
  fullRange: { p10: number; p90: number };
  severity: 'normal' | 'notable' | 'outlier';
  explanation: string;
}
```
Add `anomaly_card?: AnomalyScore[]` to `BusinessAnalysisResult`.

---

## Part B: SCORE-Native Import/Export + Compliance Indicator

### What It Does
Users can import a SCORE-format spreadsheet (the standard used by SBA advisors, lenders, accelerators) and Quantis auto-maps it to its internal model, flagging inconsistencies. Any Quantis analysis can be exported as a SCORE-compatible file. A compliance indicator shows: "Your model fills 92% of standard SCORE expectations; missing: debt schedule detail, owner draw assumptions."

### Architecture

```text
SCORE Sheet (CSV/XLSX) → Parser → Field Mapper → Validation → Quantis Internal Model
                                                                        ↓
Quantis Internal Model → SCORE Mapper → SCORE Sheet Export (CSV)
                                                                        ↓
                                              Compliance Scorer → "92% SCORE-ready"
```

### Edge Function

**New function: `supabase/functions/score-import/index.ts`**

Handles CSV/XLSX upload, parses rows, maps columns to Quantis fields:
- SCORE tabs: Revenue Projections, Startup Costs, Operating Expenses, Cash Flow, Balance Sheet, Loan Information
- Maps each SCORE field to the corresponding `BusinessInputVariables` / `FinancialAnalysis` field
- Returns: mapped data + list of unmapped/inconsistent fields + compliance score

**New module: `supabase/functions/analyze-business/score-mapper.ts`**

Two functions:
- `mapFromSCORE(parsedRows)` → `Partial<QuantisEngineInput>` + `inconsistencies[]`
- `mapToSCORE(analysisResult)` → structured SCORE data ready for CSV generation
- `computeSCORECompliance(analysisResult)` → `{ score: number, missing: string[], filled: string[] }`

SCORE compliance checks ~30 standard fields. Each present = +3.3%. Missing fields listed by name.

### Frontend Changes

**Import flow (in WizardForm Step 1):**
- "Import SCORE Sheet" button alongside existing document upload
- Parses the file via the edge function
- Auto-fills wizard fields from mapped data
- Shows a toast with inconsistencies: "3 fields had mismatches and were flagged"

**Export (in ResultsActionBar):**
- "Export as SCORE" button next to existing PDF export
- Generates a CSV with SCORE-standard column headers
- Client-side generation using the analysis result data

**Compliance indicator (in Reliability tab):**
- New `SCOREComplianceBadge` component
- Shows percentage + missing fields list
- "Your model fills 92% of standard SCORE expectations"

**New component: `src/components/analysis/SCOREComplianceBadge.tsx`**

### Type additions:
```ts
interface SCORECompliance {
  score: number;          // 0-100
  filledFields: string[];
  missingFields: string[];
  inconsistencies: Array<{ field: string; issue: string }>;
}
```
Add `score_compliance?: SCORECompliance` to `BusinessAnalysisResult`.

---

## Files Summary

| File | Action | Part |
|------|--------|------|
| `supabase/functions/analyze-business/market-prior.ts` | New — Bayesian prior + anomaly scoring | A |
| `supabase/functions/analyze-business/index.ts` | Wire anomaly card into response | A |
| `src/components/analysis/AnomalyCard.tsx` | New — percentile visualization | A |
| `src/components/analysis/AnalysisResults.tsx` | Add AnomalyCard to Reliability tab | A |
| `src/types/analysis.ts` | Add AnomalyScore + SCORECompliance types | A+B |
| DB migration | `industry_distributions` table + seed data | A |
| `supabase/functions/score-import/index.ts` | New — SCORE file parser | B |
| `supabase/functions/analyze-business/score-mapper.ts` | New — bidirectional SCORE mapping | B |
| `src/components/analysis/SCOREComplianceBadge.tsx` | New — compliance indicator | B |
| `src/components/analysis/WizardForm.tsx` | Add "Import SCORE" button | B |
| `src/components/analysis/ResultsActionBar.tsx` | Add "Export as SCORE" button | B |

## What This Does NOT Change
- No modifications to the financial engine or Quantis math
- No changes to existing benchmark lookup — distributions are an additional layer
- Pattern Critic (Part 2) and Test Harness (Part 4) deferred to next phase

