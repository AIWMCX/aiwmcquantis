

# Phase 13 — API Versioning + Report Schema Standardization

## Overview

Create a unified report schema (`QuantisReport`), a version-routing edge function, a `report_outputs` table for stored report JSON, and a feature flag system via a `user_settings` table.

## Database Changes (2 migrations)

### Migration 1: `user_settings` table
```sql
CREATE TABLE user_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  use_v2_engine BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);
-- RLS: users read/update own row; admins read/update all
```

### Migration 2: `report_outputs` table
```sql
CREATE TABLE report_outputs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id UUID,
  user_id UUID,
  report_json JSONB NOT NULL,
  pdf_url TEXT,
  version TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
-- RLS: users select/insert own rows; admins select all
```

## File 1: `src/types/report-schema.ts` (New)

Canonical `QuantisReport` interface with:
- **Meta**: `reportId`, `version` ("v1"|"v2"), `generatedAt`, `analysisParams`, `metadata: ReportMetadata`
- **ReportMetadata**: `engineVersion`, `benchmarkVersions[]`, `geoCalibration`, `dualModelConsensus?`, `overallConfidence`, `confidenceTier`, `processingMs`, `reconciled`, `reconciliationNotes?`
- **Core sections** (both v1/v2): `executiveSummary`, `financials: FinancialsSection`, `marketAnalysis`, `riskAssessment`
- **v2-only optional sections**: `scenarios?`, `explainability?`, `monteCarlo?`, `unitEconomics?`, `reconciliation?`, `goalSolver?`, `validationJourney?`
- **FinancialsSection**: v1 fields (`revenueProjections`) + v2 optional (`plStatements?`, `cashFlows?`, `unitEconomics?`, `breakEvenMonth?`, `cashRunwayMonths?`, `roi?`, `paybackPeriodMonths?`)

Import types from `financial-engine.ts` and `reconciliation-engine.ts` where needed.

Also export:
- `mapBusinessAnalysisToReport(result: BusinessAnalysisResult, version: "v1"|"v2"): QuantisReport` — adapter from existing result type to new schema
- `isV2Report(report: QuantisReport): boolean` — type guard

## File 2: `src/services/report-store.ts` (New)

- `saveReportOutput(analysisId, userId, report: QuantisReport): Promise<string>` — inserts into `report_outputs`, returns id
- `getReportOutput(reportId: string): Promise<QuantisReport | null>` — fetches stored JSON
- `getReportsForUser(userId: string): Promise<ReportOutputRecord[]>` — list user's reports

## File 3: `supabase/functions/api-analyze/index.ts` (New edge function)

Version-routing proxy:
- Accepts `POST /api-analyze` with optional `?version=v1|v2` query param
- If no version specified: checks `user_settings.use_v2_engine` for authenticated user (default false → v1)
- **v1**: forwards request to `analyze-business` function (existing)
- **v2**: forwards request to `analyze-business` function but with `engine_version: "v2"` flag in the payload, which the existing function can read to enable extended output
- Returns the response, wrapping v2 output in `QuantisReport` schema with additive fields
- CORS headers included, `verify_jwt = false` (validates in code)

The existing `analyze-business` function is NOT modified — the routing layer just passes through. The v2 enrichment (P&L, cash flow, reconciliation) happens client-side using the Phase 11/12 engines after receiving the base analysis.

## Config update

Add to `supabase/config.toml`:
```toml
[functions.api-analyze]
verify_jwt = false
```
(Already present in config.)

## Files Summary

| File | Action |
|------|--------|
| `src/types/report-schema.ts` | New — QuantisReport interfaces + adapter |
| `src/services/report-store.ts` | New — CRUD for report_outputs table |
| `supabase/functions/api-analyze/index.ts` | New — version routing proxy |
| Migration | New — `user_settings` + `report_outputs` tables with RLS |

