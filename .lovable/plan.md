

# Phase 14 — Quality Monitoring + Structured Logging

## Overview

Create a structured logging service, daily quality KPI aggregation, and extend the admin health dashboard with report quality monitoring.

## Database Changes (1 migration)

### New tables

**`analysis_logs`** — structured event log for every analysis step
- `id` UUID PK, `analysis_id` UUID NOT NULL, `user_id` UUID, `event_type` TEXT NOT NULL, `payload` JSONB NOT NULL, `severity` TEXT DEFAULT 'info', `created_at` TIMESTAMPTZ DEFAULT now()
- Indexes on `(analysis_id)` and `(event_type, created_at)`
- RLS: authenticated users insert own rows; admins select all; anon denied

**`quality_metrics_daily`** — aggregated KPIs per day
- `id` UUID PK, `metric_date` DATE NOT NULL UNIQUE, `reconciliation_rate` NUMERIC, `avg_confidence_score` NUMERIC, `inconsistency_rate` NUMERIC, `avg_consensus_score` NUMERIC, `benchmark_coverage_rate` NUMERIC, `error_rate_by_code` JSONB, `p50_latency_ms` NUMERIC, `p95_latency_ms` NUMERIC, `p99_latency_ms` NUMERIC, `total_analyses` INTEGER, `created_at` TIMESTAMPTZ DEFAULT now()
- RLS: admin select only; service_role insert

## File 1: `src/services/quantis-logger.ts` (New)

Singleton `QuantisLogger` with methods:
- `logAnalysisStart`, `logBenchmarkUsed`, `logGeoCalibration`, `logReconciliationEvent`, `logValidationWarning`, `logAIConsensus`, `logAnalysisComplete`, `logError`
- Each method calls a private `_persist(analysisId, eventType, payload, severity)` that batches inserts to `analysis_logs` table via supabase client
- Includes `getUserId()` helper from current auth session
- Performance guard: `logAnalysisComplete` checks if `durationMs > baselineMs * 1.2` and auto-logs a `QE-PERF-001` warning

## File 2: `supabase/functions/aggregate-quality-metrics/index.ts` (New edge function)

Nightly cron-triggered function that:
- Queries `analysis_logs` and `reconciliation_log` for the previous day
- Computes: reconciliation_rate, avg_confidence, inconsistency_rate (negative income + low risk), avg_consensus, benchmark_coverage, error counts by code, p50/p95/p99 latency from `analysis_complete` events
- Inserts row into `quality_metrics_daily`
- Authenticated via `x-cron-secret` header (existing pattern)

## File 3: `src/pages/admin/QuantisHealth.tsx` (Extended)

Add a "Report Quality" tab alongside existing content using Tabs component:
- **Reconciliation Rate Trend**: 7-day line chart from `quality_metrics_daily`
- **Inconsistency Incidents**: table querying `reconciliation_log` where `reconciled = false`, showing analysis_id and summary
- **Top QE Error Codes**: bar/list from `quality_metrics_daily.error_rate_by_code`
- **Audit Report**: button that opens a dialog showing full `analysis_logs` timeline for a given analysis_id
- **CSV Export**: downloads quality_metrics_daily as CSV

## Files Summary

| File | Action |
|------|--------|
| `src/services/quantis-logger.ts` | New — structured logging singleton |
| `supabase/functions/aggregate-quality-metrics/index.ts` | New — nightly KPI aggregation |
| `src/pages/admin/QuantisHealth.tsx` | Extended — Report Quality tab |
| Migration | New — `analysis_logs` + `quality_metrics_daily` tables |

