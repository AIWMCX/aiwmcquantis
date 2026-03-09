
# P4-S2: Last Audited Badge + Safety Evaluations — Implementation Plan

## Current State Summary
- `LastAuditedBadge.tsx` exists but is single-size with no freshness logic, no progress bar
- `quantis-safety-agent.ts` has `getLatestAuditTimestamp()` but only returns a Date — no safety level, passed checks, or engine version
- Footer has no badge
- PersistentResultsHeader has metadata pill (lines 215-222) but no audit info
- Methodology page has one `LastAuditedBadge` in hero (line 21) with no size prop
- ExplainPanel has no "How we calculate this →" link

---

## Implementation Tasks

### 1. Create `src/services/safety-evaluation-service.ts`
New dedicated service with:
- `AuditInfo` interface: `lastAuditedAt`, `safetyLevel`, `passedChecks`, `totalChecks` (10), `engineVersion`
- `getLatestAuditInfo()` — queries `safety_evaluations` filtering by `evaluator IN ['safety_agent', 'golden_vector_suite']` and `analysis_id IS NULL` (system-level audits)
- `DEFAULT_AUDIT_INFO` fallback: today, QSL-2, 8/10, v2.0.0-precision

### 2. Rewrite `src/components/analysis/LastAuditedBadge.tsx`
Complete rewrite with:
- **Props**: `size?: "sm" | "md" | "lg"`
- **Data hook**: Uses new `getLatestAuditInfo()`, skeleton during load, graceful fallback
- **Freshness logic**: today → "Today" (green), 1d → "Yesterday" (green), 2-6d → "X days ago" (green), 7-29d → yellow, 30+ → orange with ⚠
- **Size sm**: `🛡️ System audited [freshness] · QSL-N Standard` (10px inline)
- **Size md**: Card with 2 lines — audited date + QSL/version
- **Size lg**: Full card with heading, formatted date, QSL label, progress bar (passedChecks/totalChecks with color thresholds ≥8=green, 6-7=yellow, <6=red), footer text

### 3. Update `src/components/layout/Footer.tsx`
- Import `LastAuditedBadge`
- Add `<LastAuditedBadge size="sm" />` in bottom row after GDPR line (line 96)

### 4. Update `src/components/analysis/PersistentResultsHeader.tsx`
- Add audit freshness to metadata pill (line 221): append "· Audited today" or "· Audited X days ago"
- Uses hook state for freshness (can share data with badge or call service directly)

### 5. Update `src/pages/Methodology.tsx`
- Hero (line 21): Pass `size="md"` to `LastAuditedBadge`
- Section 6: Add `<LastAuditedBadge size="lg" />` below the Known Limitations section (around line 162)

### 6. Update `src/components/analysis/ExplainPanel.tsx`
- After footer sources section (line 327), add: `<a href="/methodology" target="_blank">How we calculate this →</a>` styled with Link icon

---

## Files
- **Create**: `src/services/safety-evaluation-service.ts`
- **Rewrite**: `src/components/analysis/LastAuditedBadge.tsx`
- **Update**: `src/components/layout/Footer.tsx`, `src/components/analysis/PersistentResultsHeader.tsx`, `src/pages/Methodology.tsx`, `src/components/analysis/ExplainPanel.tsx`

No database changes needed — `safety_evaluations` table and RLS policies already exist.
