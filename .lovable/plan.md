
# AIWMC Quantis: Phase 2 - Benchmark Governance & Freshness Implementation Plan

This plan focuses on implementing the systematic benchmark provenance and freshness detection architecture as defined in Sprint 2 of the Anthropic-style accuracy stack.

## 1. Benchmark Governance Service
**File:** `src/services/benchmark-governance.ts` (New)

We will create a central governance service that acts as the "Research Agent" for the dataset layer. It will:
- **Freshness Detection:** Scan the `industry_benchmarks` table and flag any entries where `last_updated` is older than 6 months (180 days).
- **Validation Rules:** Ensure structured correctness (e.g., `gross_margin_min` ≤ `gross_margin_max`, `cac_min` > 0).
- **Quality Scoring:** Dynamically score data reliability based on staleness, sample size, and source authority.

**Key Interface Export:**
```typescript
export interface FreshnessReport {
  totalBenchmarks: number;
  staleCount: number;
  healthyCount: number;
  staleList: { industry_name: string; last_updated: string; days_old: number }[];
  validationErrors: { industry_name: string; error: string }[];
}
```

## 2. Accuracy Dashboard Enhancements
**File:** `src/pages/admin/AccuracyDashboard.tsx`

We will integrate the governance service into the new admin dashboard to surface data health alongside model health:
- Update the layout from a 3-column to a 4-column grid (or add a new row).
- Add a **Benchmark Health** card showing the percentage of up-to-date benchmarks.
- If staleness or validation errors are detected, surface them as actionable alerts in the "Recent Safety Flags" section, tagging them with a `BENCHMARK-WARN` severity badge.

## 3. Telemetry Integration
We will update the dashboard's `useEffect` hook to fetch both `safety_evaluations` and `BenchmarkGovernance.getFreshnessReport()` in parallel, ensuring a holistic view of the "precision theater" defenses.

This implementation solidifies the data layer of the accuracy stack, ensuring that the model's inputs are systematically verified for freshness and integrity without manual developer intervention.
