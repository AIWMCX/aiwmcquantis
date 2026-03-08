

## Design QA Audit — Findings and Fixes

### Audit Summary

Checked every item on the QA checklist against the codebase. The design system foundation is solid — tokens, typography classes, animations, and card system are all well-defined. Below are the specific violations that need fixing.

---

### PASS (No action needed)

- **Typography system**: Sora/DM Sans/JetBrains Mono classes defined correctly in `index.css`
- **CSS tokens**: Analysis components consistently use `var(--q-*)` tokens
- **Dark mode**: Full dark token set defined, surfaces use dark backgrounds
- **Animations**: `q-metric-reveal`, `q-ring-draw`, `q-bar-fill`, `q-skeleton` all defined
- **Stress Map ring**: SVG stroke-dashoffset animation working correctly
- **Loading states**: `q-skeleton` shimmer class exists and is used
- **Touch targets**: `touch-target` utility (48px min) defined
- **Font loading**: `display=swap` in Google Fonts URL (line 85, index.html)
- **Animations use transform/opacity**: Confirmed in keyframe definitions
- **Confidence badge system**: Multiple badge components exist and function
- **Focus indicators**: WCAG-compliant `:focus-visible` ring defined

---

### FAIL — Issues to Fix

#### 1. Hardcoded hex `#6EE7B7` in StressMap ring gauge
**File**: `src/components/analysis/StressMap.tsx` line 260
**Fix**: Replace `#6EE7B7` with a new CSS variable or use `var(--q-status-green)` with opacity. Add `--q-status-green-light: #6EE7B7` to both light and dark token sets, then reference it.

#### 2. Hardcoded hex colors in document form templates (1,000+ instances)
**Files**: 6 doc form files (`BusinessPlanForm`, `InvoiceForm`, `MarketAnalysisForm`, `PitchDeckForm`, `OnePagePlanForm`, `FinancialForecastForm`, `QuarterlySummaryForm`)
**Issue**: These generate HTML strings with inline styles using hardcoded hex values (`#3B82F6`, `#1a1a1a`, `#64748B`, etc.) and system fonts (`'Segoe UI', Arial, sans-serif`).
**Fix**: These are document export templates rendered as HTML for download/print — NOT the app UI. Since inline styles in HTML strings cannot use CSS custom properties, the pragmatic fix is to create a shared constant object (`DOC_THEME`) with color/font values that maps to the design system colors, and import it in each form. This is lower priority since users never see these styles in-app.

#### 3. Emojis used as functional UI elements
**Files**:
- `ScenarioBar.tsx`: 📉🏠📣🐌✨😱⚔ in scenario pills
- `DocGeneratorPanel.tsx`: 📄 in "Generate Documents" header
- `DocTemplateCard.tsx`: 🔒 in "Plus Plan" badge
- `DocumentLibrary.tsx`: ⭐📄 in filter tabs
- `ShareSuccessModal.tsx`: 📊🏆⚡⚠️ in share caption

**Fix**: Replace emojis with Lucide icons or custom `q-icon-*` SVG components. ScenarioBar pills should use small icon components instead of emoji prefixes. The share caption emojis are acceptable (social media copy, not UI).

#### 4. MetricCard doesn't use `q-metric-*` class for values
**File**: `src/components/analysis/MetricCard.tsx` line 48
**Issue**: Uses `text-base sm:text-lg font-bold tabular-nums` instead of `text-metric-sm` or `text-metric-xs` class which includes JetBrains Mono.
**Fix**: Replace with `text-metric-sm` class (includes JetBrains Mono, tabular-nums, proper sizing).

#### 5. Missing blocked (<50%) confidence blur overlay
**Issue**: `QConfidenceBadge` and `ConfidenceBadge` show labels for low confidence but no component implements a blur overlay on metric values when confidence is below 50%. The checklist requires "Blocked (<50%) metrics show blurred overlay, not raw numbers."
**Fix**: Add a blur overlay wrapper to `ExplainableMetricCard` when `confidenceTier === 'blocked'` — apply `filter: blur(4px)` to the value and show a "Low confidence" tooltip.

#### 6. ConfidenceBadge uses Tailwind color classes instead of CSS tokens
**File**: `src/components/analysis/ConfidenceBadge.tsx` lines 22-50
**Issue**: Uses `text-emerald-700`, `bg-blue-500/10`, etc. instead of `var(--q-status-*)` tokens.
**Fix**: Replace with `var(--q-status-green)`, `var(--q-status-ai)`, `var(--q-status-yellow)`, `var(--q-status-orange)`, `var(--q-status-red)` and their `-bg`/`-border` variants.

#### 7. Document library missing row virtualization
**Issue**: Checklist requires "Document library virtualizes rows > 50 items." Current `DocumentLibrary.tsx` renders all rows.
**Fix**: Add a simple windowed rendering check — if documents.length > 50, slice to visible range based on scroll position. Alternatively, note this as a future optimization since most users won't have 50+ docs initially.

---

### Implementation Plan

| Priority | File | Change |
|----------|------|--------|
| P0 | `StressMap.tsx` | Replace `#6EE7B7` with token variable |
| P0 | `MetricCard.tsx` | Use `text-metric-sm` class for values |
| P0 | `ConfidenceBadge.tsx` | Replace Tailwind colors with `var(--q-*)` tokens |
| P0 | `ScenarioBar.tsx` | Replace emojis with Lucide icons |
| P0 | `DocGeneratorPanel.tsx` | Replace 📄 emoji with `FileText` icon |
| P0 | `DocTemplateCard.tsx` | Replace 🔒 emoji with `Lock` icon (already imported) |
| P0 | `DocumentLibrary.tsx` | Replace ⭐📄 emojis with icons |
| P1 | `MetricCard.tsx` | Add blur overlay for blocked confidence tier |
| P1 | `index.css` | Add `--q-status-green-light` token |
| P2 | Doc form files (6) | Create shared `DOC_THEME` constant, replace hardcoded hex |
| P2 | `DocumentLibrary.tsx` | Add basic row virtualization for 50+ items |

**Total files to modify**: 7 (P0+P1), 13 including P2 doc forms

