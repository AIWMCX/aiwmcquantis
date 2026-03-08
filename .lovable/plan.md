

# Phase 7A+7B — Data Reality Bridge & Validation Journey

## What Exists

- **`src/types/analysis.ts`** — Has `BusinessAnalysisResult`, `BusinessInputVariables` (12 vars), `ScenarioMetrics`, `FinancialAnalysis` with scenarios/unit_economics/breakeven/returns. No `ProjectionDataPoint` type exists — projections live inside `ScenarioMetrics`.
- **No** `reality-bridge.ts`, `ActualsImporter.tsx`, `ValidationJourney.tsx`, or `journey-engine.ts` exist.
- **No** `user_validation_progress` table exists in the database.

## Implementation

### File 1: `src/services/reality-bridge.ts` (New)

Defines `ActualsDataPoint` and `ModelCalibrationResult` interfaces as specified. Two exported functions:

- `compareActualsToModel(actuals, projections, currentParams)` — For each month, computes revenue/costs/customers divergence, classifies severity (within_range ≤10%, notable ≤25%, significant ≤50%, critical >50%), derives accuracy score as `100 - avgAbsPctDiff`, suggests param updates (implied conversion rate, growth rate, CAC from actuals), generates 2–4 plain English insights.
- `recalibrateParams(actuals, currentParams)` — Derives new params from actual data trends: implied growth rate from revenue slope, actual CAC from costs/customers, implied churn from customer retention across months. Returns updated `AnalysisParams`-compatible object.

Since `ProjectionDataPoint` doesn't exist, will define a simple interface: `{ month: number; revenue: number; costs: number; customers: number }` that can be extracted from `ScenarioMetrics`.

### File 2: `src/components/analysis/ActualsImporter.tsx` (New)

Modal with two tabs:
1. **CSV Upload** — Drag-and-drop zone, manual CSV parsing (split lines, no PapaParse needed for simple CSV), auto-maps columns by header name matching.
2. **Manual Entry** — Editable table with month rows (up to 24), columns for revenue/costs/customers/leads/conversions/churn.

After import: preview table + "Run Calibration" button. After calibration: renders `ModelCalibrationResult` as:
- Accuracy score badge (color-coded)
- Divergence table with severity colors
- Suggested param updates with individual toggles + "Apply All" button
- Calls `onApplyUpdates` callback with selected updates

### File 3: `src/lib/journey-engine.ts` (New)

Defines `ValidationStage`, `ValidationAction` types and `VALIDATION_STAGES` array (5 stages as specified). Three exported functions:
- `getCurrentStage(completedActions)` — finds first stage with incomplete required actions
- `getStageProgress(stageId, completedActions)` — % of required actions completed
- `getNextAction(completedActions)` — first uncompleted action from current stage

### File 4: `src/components/analysis/ValidationJourney.tsx` (New)

Vertical stepper with 5 stages:
- Completed: green filled circle + checkmark
- Current: pulsing ring animation, expanded checklist of required actions
- Future: gray outlined circle
- Each shows confidence boost label
- Click completed stage → summary; click current → expand checklist
- Fetches/saves progress from/to database via `user_validation_progress` table

### Database Migration

New table:
```sql
CREATE TABLE public.user_validation_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  analysis_id uuid REFERENCES public.analyses(id) ON DELETE SET NULL,
  completed_actions text[] NOT NULL DEFAULT '{}',
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, analysis_id)
);

ALTER TABLE public.user_validation_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own progress"
  ON public.user_validation_progress
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Deny anon access"
  ON public.user_validation_progress
  FOR ALL TO anon
  USING (false)
  WITH CHECK (false);
```

### File 5: `src/components/analysis/AnalysisResults.tsx` (Edit)

- Add "Validate" tab containing `ValidationJourney`
- Add "Import Actuals" button (in Overview or new tab) that opens `ActualsImporter` modal

### Files Summary

| File | Action |
|------|--------|
| `src/services/reality-bridge.ts` | New — actuals comparison + recalibration |
| `src/components/analysis/ActualsImporter.tsx` | New — CSV/manual import modal |
| `src/lib/journey-engine.ts` | New — 5-stage validation engine |
| `src/components/analysis/ValidationJourney.tsx` | New — vertical stepper UI |
| `src/components/analysis/AnalysisResults.tsx` | Edit — add Validate tab + Import Actuals |
| Database migration | New table `user_validation_progress` with RLS |

