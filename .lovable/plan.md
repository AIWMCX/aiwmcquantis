

# Font Design Overhaul — All Templates + Executive Report

## Problem

The Quantis design system defines a precise typography stack — **Sora** (headlines), **DM Sans** (body), **JetBrains Mono** (financial data) — but none of the 10 document templates or the Executive Report PDF use it. Instead, each template picks a random system font:

| Template | Current Font | Should Be |
|----------|-------------|-----------|
| Invoice | Segoe UI, Arial | DM Sans + JetBrains Mono |
| Business Plan | Segoe UI, Arial | Sora + DM Sans |
| Pitch Deck | Segoe UI, Arial | Sora + DM Sans |
| Financial Forecast | Segoe UI, Arial | DM Sans + JetBrains Mono |
| Quarterly Summary | Segoe UI, Arial | DM Sans + JetBrains Mono |
| One-Page Plan | Segoe UI, Arial | Sora + DM Sans |
| NDA | Times New Roman, Georgia | DM Sans (legal body) |
| Founder Agreement | Georgia, serif | DM Sans |
| Partnership | Georgia, serif | DM Sans |
| Market Analysis | Inter, sans-serif | DM Sans + Sora |
| Executive Report (PDF) | system-ui (via pdfStyles.ts) | Sora + DM Sans + JetBrains Mono |

This makes templates feel disconnected from the product. The fix is systematic.

---

## Approach: Unified Template Typography Constants

### 1. Create Shared Template Font Constants
**New file:** `src/components/docs/forms/templateFonts.ts`

Define reusable inline-style font declarations that mirror the design system but work in HTML string templates (which can't use CSS classes):

```ts
export const tFont = {
  display: "'Sora', 'Inter', sans-serif",
  body: "'DM Sans', 'Inter', sans-serif",
  mono: "'JetBrains Mono', 'Fira Code', monospace",
};

export const tStyle = {
  h1: "font-family: 'Sora', sans-serif; font-weight: 700; letter-spacing: -0.02em;",
  h2: "font-family: 'Sora', sans-serif; font-weight: 600; letter-spacing: -0.01em;",
  body: "font-family: 'DM Sans', sans-serif; font-weight: 400;",
  label: "font-family: 'DM Sans', sans-serif; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em;",
  metric: "font-family: 'JetBrains Mono', monospace; font-weight: 600; font-feature-settings: 'tnum' 1;",
  legal: "font-family: 'DM Sans', Georgia, serif; font-weight: 400;",
};
```

### 2. Update All 10 Form Templates
**Files:** All 10 files in `src/components/docs/forms/`

For each template's HTML generation (`const rawHTML = ...`):

- **Root wrapper:** Replace random font-family with `tFont.body` (DM Sans)
- **Headings** (h1, h2): Apply `tStyle.h1` / `tStyle.h2` (Sora)
- **Financial figures** (revenue, costs, percentages, currency amounts): Apply `tStyle.metric` (JetBrains Mono)
- **Labels** (section markers, "CONFIDENTIAL", report type): Apply `tStyle.label`
- **Body text:** Inherits DM Sans from root

Template-specific handling:
- **NDA, Founder Agreement, Partnership** (legal docs): Root uses `tFont.body` but article body text gets slightly increased line-height (1.8) for legal readability. Section headers still use Sora.
- **Invoice**: All monetary values (`$`, totals, unit prices) use JetBrains Mono. Invoice number uses JetBrains Mono.
- **Financial Forecast, Quarterly Summary**: All numeric data (revenue, costs, metrics, percentages) uses JetBrains Mono.
- **Pitch Deck**: Slide titles use Sora at display weight. Ask amounts and metrics use JetBrains Mono.
- **Market Analysis**: TAM/SAM/SOM figures use JetBrains Mono. Growth percentages use JetBrains Mono.

### 3. Update Executive Report PDF Styles
**File:** `src/components/pdf/pdfStyles.ts`

Update the `pdfStyles` object to use the design system fonts:
- `coverTitle`, `sectionTitle`, `verdictText`: Add `fontFamily: "'Sora', sans-serif"`
- `paragraph`, `assessmentValue`, `listText`, `timelineDesc`, `disclaimer`: Add `fontFamily: "'DM Sans', sans-serif"`
- `metricCardValue`, `coverMetricValue`, `riskSummaryValue`, `barValue`, `marketSizeValue`: Add `fontFamily: "'JetBrains Mono', monospace"` + `fontFeatureSettings: '"tnum" 1'`
- `tableHeader`, `tableCell`: Add `fontFamily: "'DM Sans', sans-serif"`
- `table` (numeric cells): Where data is financial, apply JetBrains Mono
- `pageHeaderLogo`, `logoText`: Keep Sora for brand elements
- Labels (`reportType`, `coverMetricLabel`, `metricCardLabel`, `confidentialNotice`): DM Sans with tracking

### 4. Update ExecutiveReport.tsx Root Font
**File:** `src/components/pdf/ExecutiveReport.tsx`

Change `fontFamily` from `"'Inter', 'Segoe UI', system-ui, sans-serif"` to `"'DM Sans', 'Inter', sans-serif"` so the entire report inherits the correct body font.

---

## Files Summary

| File | Change |
|------|--------|
| `src/components/docs/forms/templateFonts.ts` | **New** — shared font constants |
| `src/components/docs/forms/InvoiceForm.tsx` | Update HTML template fonts |
| `src/components/docs/forms/BusinessPlanForm.tsx` | Update HTML template fonts |
| `src/components/docs/forms/PitchDeckForm.tsx` | Update HTML template fonts |
| `src/components/docs/forms/FinancialForecastForm.tsx` | Update HTML template fonts |
| `src/components/docs/forms/QuarterlySummaryForm.tsx` | Update HTML template fonts |
| `src/components/docs/forms/OnePagePlanForm.tsx` | Update HTML template fonts |
| `src/components/docs/forms/NDAForm.tsx` | Update HTML template fonts |
| `src/components/docs/forms/FounderAgreementForm.tsx` | Update HTML template fonts |
| `src/components/docs/forms/PartnershipForm.tsx` | Update HTML template fonts |
| `src/components/docs/forms/MarketAnalysisForm.tsx` | Update HTML template fonts |
| `src/components/pdf/pdfStyles.ts` | Add font-family to all style entries |
| `src/components/pdf/ExecutiveReport.tsx` | Update root font-family |

## Implementation Order
1. Create `templateFonts.ts` (shared constants)
2. Update `pdfStyles.ts` + `ExecutiveReport.tsx` (PDF report)
3. Update all 10 form templates (alphabetical)

