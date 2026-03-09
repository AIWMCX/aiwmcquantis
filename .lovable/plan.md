
# AIWMC Quantis: Phase 3 & 4 Implementation Plan

This plan completes the Anthropic-Style Accuracy Architecture by transforming the user experience to prioritize trust, transparency, and interactive validation, alongside publishing our safety methodology.

## Phase 3: UX of Trust & Transparency

**1. Wizard-Style Results (Eliminating the Vertical Well)**
*   **File**: `src/components/analysis/AccuracyTransparentResults.tsx` (New/Replacement for `AnalysisResults.tsx` layout)
*   **Design**: A multi-step horizontal wizard.
    *   **Persistent Header**: Key numbers (Profit, Payback) and the new Traffic Light Confidence Badge remain visible at all times.
    *   **Steps**: 1. Executive Summary & Stress Map → 2. Financials & Assumptions → 3. Risks & Action Plan.
*   **Traffic Light Confidence**: Visual indicator (Green = QSL-3, Yellow = QSL-2, Red = QSL-1) to instantly communicate model reliability.

**2. Inline Assumption Editing**
*   **File**: `src/components/analysis/InlineAssumptionEditor.tsx` (New)
*   **Functionality**: A panel next to the financial charts allowing users to tweak core drivers (e.g., CAC, Monthly Rent, Average Ticket Size).
*   **Live Recalculation**: Edits will trigger a localized recalculation of the Revenue Chart and Cash Runway metrics using the existing `decimal.js` math utilities, reinforcing that Quantis is a stress-testing engine, not a static oracle.

**3. Realism Feedback Loop**
*   **File**: `src/components/analysis/RealismFeedbackWidget.tsx` (New)
*   **Functionality**: A widget at the end of the wizard asking "How realistic do these projections feel?" (1-5 scale) plus optional text feedback.
*   **Database**: Create a `user_realism_feedback` table to log these responses, acting as ground-truth data for future benchmark calibration.

## Phase 4: External Credibility

**1. Public Methodology Page**
*   **File**: `src/pages/Methodology.tsx` (New)
*   **Content**: A transparent, Anthropic-style explanation of:
    *   **Quantis Safety Levels (QSL 1-4)**.
    *   **Data Provenance**: Where benchmark data comes from and how often it is refreshed.
    *   **Validation Engine**: Explanation of the Dual-AI consensus and the Golden Test Vectors.
*   **Routing**: Add `/methodology` to `App.tsx` and link it in the footer.

**2. "Last Audited" Badge**
*   **File**: `src/components/analysis/LastAuditedBadge.tsx` (New)
*   **Functionality**: Fetches the most recent `evaluated_at` timestamp from the `safety_evaluations` table.
*   **Placement**: Displayed in the `ResultsTopBar` and on the Methodology page (e.g., *"System Last Audited: Today | QSL-3 Standard"*).

**3. Database Migrations**
*   Create `user_realism_feedback` table.
*   Ensure RLS policies allow authenticated users to insert feedback and read the latest audit timestamp.

This plan bridges the gap between our robust backend safety mechanisms and the user's perception, institutionalizing accuracy as a core product feature.
