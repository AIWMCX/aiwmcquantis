

# CTO Architecture Upgrade: Assumption Graph, Case Memory, Prediction Engine

## Summary

4 deliverables: Assumption Graph engine + UI, enhanced Anti-BS sanity checks, Case Memory database table, and Prediction Engine v0 with confidence badge UI. All wire into the existing response payload and AnalysisResults component.

---

## Deliverable 1: Assumption Graph + Critical Path

**New file:** `supabase/functions/analyze-business/assumption-graph.ts`

Builds a DAG of 8 assumption nodes (CAC, Churn, LTV, ARPU, Growth Rate, Gross Margin, Market Size, Fixed Costs) with hardcoded dependency edges. Uses existing `SensitivityResult.tornado` data to rank the top 3-5 assumptions by fragility. Returns:
- `nodes[]` with id, label, value, source, confidence
- `edges[]` with from/to/weight
- `criticalPath[]` — top assumptions ranked by sensitivity score + breaking threshold
- `fragility_score` (0-100) — weighted average of top-3 sensitivities

Called from `index.ts` after sensitivity analysis completes. Added to response as `assumption_graph`.

**New file:** `src/components/analysis/AssumptionGraph.tsx`

Ranked list UI (not a DAG renderer) showing:
- Each critical path assumption with its name, current value, sensitivity bar, and "breaks if changed by X%" threshold
- Color-coded severity (red/amber/green)
- Fragility score badge at top

Integrated into `AnalysisResults.tsx` alongside existing SensitivityTornado.

---

## Deliverable 2: Enhanced Sanity Checks (Anti-BS Layer)

**Modified:** `supabase/functions/analyze-business/bulletproof-validator.ts`

Add a new exported function `runAntiBS(metrics, benchmarks, industryId)` returning `SanityFlag[]`:

| Rule | Trigger | Severity |
|------|---------|----------|
| Unrealistic LTV:CAC | ratio > 20 | critical |
| Margin ceiling breach | net margin > 40% in capital-intensive | warning |
| Capacity constraint | revenue implies >500 clients for solo operator | warning |
| Churn floor | churn < 1% for non-enterprise SaaS | warning |
| TAM inconsistency | projected revenue > 10% of stated SOM | info |

Each flag: `{ rule_id, severity, explanation, suggested_correction }`. These feed into:
- The assumption graph's fragility score
- The prediction engine's sanity pass rate
- Exposed in the response under `sanity_flags`

---

## Deliverable 3: Case Memory Library

**Database migration** — new table `analysis_cases`:

```sql
CREATE TABLE public.analysis_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id UUID REFERENCES public.analyses(id) ON DELETE SET NULL,
  user_id UUID NOT NULL,
  industry_id TEXT NOT NULL,
  location TEXT NOT NULL,
  input_snapshot JSONB NOT NULL,
  output_snapshot JSONB NOT NULL,
  engine_version TEXT NOT NULL,
  benchmark_version TEXT,
  assumption_graph JSONB,
  sanity_flags JSONB,
  confidence_score NUMERIC,
  user_corrections JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.analysis_cases ENABLE ROW LEVEL SECURITY;
```

RLS policies:
- Deny anonymous: `false`
- Users read own: `auth.uid() = user_id`
- Service role full access: `is_service_role()`

**Edge function change** (`index.ts`): After successful response assembly, insert a case record using the service-role client. Non-blocking (wrapped in try/catch, failure logged but doesn't break the response).

---

## Deliverable 4: Prediction Engine v0 + UI Badge

**New file:** `supabase/functions/analyze-business/prediction-engine.ts`

Deterministic weighted-average confidence model:

```text
modelConfidence(params) → {
  confidence: 0-1,
  assumption_risk: 0-1,
  recommendation_level: 'safe' | 'caution' | 'high_risk',
  factors: [{ factor, score, weight, explanation }]
}
```

5 factors:
- **Input completeness** (0.20): checks if user provided financials, documents, specific industry
- **Benchmark match** (0.25): uses `benchmarkConfidenceData.adjustedScore`
- **Sensitivity fragility** (0.20): inverse of max tornado swing normalized
- **Sanity pass rate** (0.20): `1 - (critical_flags / total_rules)`
- **Similar cases** (0.15): count from `analysis_cases` where same industry_id + similar location (query via service client)

Added to response as `model_confidence`.

**New file:** `src/components/analysis/ModelConfidenceBadge.tsx`

Shows "AIWMC Model Confidence: 73% (Caution)" with:
- Color-coded ring (green/amber/red)
- Expandable accordion showing each factor's score, weight, and explanation
- Recommendation level label

---

## Type Changes

**Modified:** `src/types/analysis.ts`

Add to `BusinessAnalysisResult`:
```typescript
assumption_graph?: {
  nodes: Array<{ id: string; label: string; value: number; source: string; confidence: number }>;
  edges: Array<{ from: string; to: string; weight: number }>;
  criticalPath: Array<{ assumption: string; sensitivity: number; breakingThreshold: number }>;
  fragility_score: number;
};
sanity_flags?: Array<{ rule_id: string; severity: string; explanation: string; suggested_correction: string }>;
model_confidence?: {
  confidence: number;
  assumption_risk: number;
  recommendation_level: 'safe' | 'caution' | 'high_risk';
  factors: Array<{ factor: string; score: number; weight: number; explanation: string }>;
};
case_id?: string;
```

---

## Wiring in index.ts

After existing CTO-level upgrades block (line ~3700), add:
1. Call `runAntiBS()` with computed metrics
2. Call `computeAssumptionGraph()` with metrics + sensitivity result
3. Call `computeModelConfidence()` with all signals
4. Insert into `analysis_cases` (non-blocking)
5. Add `assumption_graph`, `sanity_flags`, `model_confidence`, `case_id` to response payload

---

## Files Summary

| File | Action |
|------|--------|
| `supabase/functions/analyze-business/assumption-graph.ts` | New |
| `supabase/functions/analyze-business/prediction-engine.ts` | New |
| `supabase/functions/analyze-business/bulletproof-validator.ts` | Add `runAntiBS()` |
| `supabase/functions/analyze-business/index.ts` | Wire new modules + case insert |
| `src/components/analysis/AssumptionGraph.tsx` | New UI component |
| `src/components/analysis/ModelConfidenceBadge.tsx` | New UI component |
| `src/components/analysis/AnalysisResults.tsx` | Integrate new components |
| `src/types/analysis.ts` | Add new response types |
| Database migration | New `analysis_cases` table + RLS |

