

# Phase 3 & 4 Master Synthesis — Upgrade Plan

## Current State vs. Target

All three tables (`safety_evaluations`, `golden_test_vectors`, `user_realism_feedback`) and all UI components already exist. The user's master spec describes **enhanced versions** with additional columns, views, seed data, and richer component logic. This plan upgrades the existing implementation to match the authoritative spec.

---

## 1. Database Migration — Schema Enhancements

A single migration to add missing columns, views, and functions:

**`user_realism_feedback`** — add columns: `dimension_scores JSONB`, `business_type TEXT`, `location TEXT`, `engine_version TEXT DEFAULT '2.0.0-precision'`

**`safety_evaluations`** — add columns: `passed_checks JSONB DEFAULT '[]'`, `geo_calibration JSONB`, `engine_version TEXT DEFAULT '2.0.0-precision'`, `evaluator TEXT DEFAULT 'safety_agent'`

**`golden_test_vectors`** — add columns: `vector_code TEXT UNIQUE`, `tolerance_pct DECIMAL(4,2) DEFAULT 15.0`, `consecutive_passes INTEGER DEFAULT 0`

**New view**: `realism_by_industry` — aggregates realism scores by business_type for Research Agent calibration monitoring.

**New function**: `get_latest_audit_timestamp()` — returns MAX(evaluated_at) for the LastAuditedBadge.

**Seed data**: Insert the 3 enhanced golden test vectors (GTV-FIT-DENVER-001, GTV-COFFEE-DEN-001, GTV-SAAS-GENERIC-001) and the initial QSL-2 safety evaluation from the spec.

---

## 2. Enhanced RealismFeedbackWidget

Update `src/components/analysis/RealismFeedbackWidget.tsx`:
- Accept `businessType` and `location` props from the parent wizard
- Add per-dimension scoring (Revenue, Costs, Timeline) as optional sub-ratings
- Submit `dimension_scores`, `business_type`, `location`, and `engine_version` alongside the existing fields

---

## 3. Enhanced Safety Agent Service

Update `src/services/quantis-safety-agent.ts`:
- Log `passed_checks`, `engine_version`, and `evaluator` fields when inserting evaluations
- Add a `getLatestAuditTimestamp()` static method calling the new DB function

---

## 4. Enhanced LastAuditedBadge

Update `src/components/analysis/LastAuditedBadge.tsx`:
- Use the new `get_latest_audit_timestamp()` RPC call instead of raw table query for cleaner access

---

## 5. Enhanced Golden Test Vectors

Update `src/lib/golden-test-vectors.ts`:
- Replace the 3 existing vectors with the spec's enhanced vectors (fitness boutique Denver, coffee shop Denver, SaaS generic) including `vector_code`, `tolerance_pct`, and `consecutive_passes` fields

---

## 6. Enhanced AccuracyTransparentResults

Update `src/components/analysis/AccuracyTransparentResults.tsx`:
- Pass `businessType` and `location` from `result.metadata` down to `RealismFeedbackWidget`

---

## 7. Enhanced Methodology Page

Update `src/pages/Methodology.tsx`:
- Add a "Known Limitations" section addressing the 5 gaps from the spec
- Add a "Golden Test Vectors" section showing the canonical archetypes
- Reference `engine_version: 2.0.0-precision`

---

## 8. Enhanced AccuracyDashboard

Update `src/pages/admin/AccuracyDashboard.tsx`:
- Add a "Realism Calibration" card pulling from the `realism_by_industry` view
- Show industries where avg_score < 2.5 (overestimating) or > 4.0 (underestimating)

