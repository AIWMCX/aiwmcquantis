# `confidence_score` consumer inventory

Accuracy session 2026-08-04 (Confidence semantics, Priority 1, round-2
review item 5). `result.confidence_score` (the 40/30/20/10 blended,
15–95-capped `reliability_score`) is now backward-compat legacy data —
`validation.quality_dimensions` is the canonical replacement. This table
tracks which UI surfaces still read the old field directly, so the PDF
becoming truthful doesn't mask other surfaces remaining misleading.

**Do not treat this table as exhaustive.** It was built from a `grep -c
confidence_score` pass over the candidate files this session had already
identified while investigating the PDF cover; the "current behavior"
column is filled in only for files actually read this session. Files
marked `NOT AUDITED` need a real read before their row can be trusted —
do not infer behavior from the file name alone.

| Consumer | Occurrences | Current label/behavior | Migration status |
|---|---|---|---|
| `src/components/pdf/ReportCoverPage.tsx` | — | Was: bare "Confidence Score" box. **Now**: "Input Completeness" + "Source Coverage" + 5 reconciliation-status chips, from `validation.quality_dimensions`, with legacy fallback for old stored reports. | **DONE** (this PR, `a3a2ab4b` + round-2 amendment) |
| `src/components/analysis/PersistentResultsHeader.tsx` (via `TrafficLightBadge`/QSL) | 1 | `confidenceScore = result.confidence_score \|\| 70` feeds `getQSLFromConfidence()`, a calibrated safety-tier color system (QSL). | **DEFERRED, explicitly** — swapping the input to `quality_dimensions.input_completeness` without re-validating QSL's threshold calibration against a different score distribution would be a new, unreviewed regression risk. Needs its own workstream: re-derive or re-threshold QSL against the decomposed dimensions. |
| `src/components/analysis/AccuracyTransparentResults.tsx` | 3 | NOT AUDITED this session. | OPEN |
| `src/components/analysis/ScenarioLibrary.tsx` | 3 | NOT AUDITED this session. | OPEN |
| `src/components/pdf/ReportExecutiveSummary.tsx` | 3 | NOT AUDITED this session. | OPEN |
| `src/pages/admin/QuantisHealth.tsx` | 7 | NOT AUDITED this session. Admin-only surface — lower user-facing risk than customer-facing reports, but still worth checking for the same mislabeling. | OPEN |
| `src/pages/SharedReport.tsx` | 2 | NOT AUDITED this session. Public-facing (shared-link) surface — same risk class as the PDF cover, should be prioritized in the next audit pass. | OPEN |
| `src/components/analysis/ScenarioComparison.tsx` | 1 | NOT AUDITED this session. | OPEN |
| `src/components/analysis/StressMap.tsx` | 1 | NOT AUDITED this session. | OPEN |
| `src/components/viral/ViralCard.tsx` | 1 | NOT AUDITED this session. Externally-shared card — same public-facing risk class as `SharedReport.tsx`. | OPEN |
| `src/components/pdf/ReportAppendix.tsx` | 1 | NOT AUDITED this session. | OPEN |

## Recommended next audit pass

Prioritize by public exposure, not file size:
1. `SharedReport.tsx` and `ViralCard.tsx` — externally shared, same
   "reader has no other context" risk as the PDF cover.
2. `AccuracyTransparentResults.tsx` — the main in-app results view;
   highest-traffic customer-facing surface.
3. `ReportExecutiveSummary.tsx`, `ScenarioLibrary.tsx`,
   `ScenarioComparison.tsx`, `StressMap.tsx`, `ReportAppendix.tsx` — other
   PDF sections and dashboard widgets.
4. `QuantisHealth.tsx` — admin-only, lowest priority.

Each row should move from OPEN to DONE only after being read and either
migrated to `quality_dimensions` or explicitly deferred with a documented
reason (as `PersistentResultsHeader.tsx` is above) — never silently
left blank.
