

# AIWMC Quantis — Remaining Polish & Completeness Pass

## What's Already Done (No Work Needed)

After reviewing every file referenced in the prompt, **~85% is already shipped**:
- Typography utilities, breadcrumb bar, industry cards with sublabels/badges/72px height
- Smart advisor hints on financial fields, depth selector with "Recommended"
- Confidence sidebar with 96/112px gauge, glassmorphism, icon-based statuses, explanatory text
- Multi-output selector (BI/Pre-Mortem/Invoice) with dynamic deliverables strip
- Three-zone visual separation, submit microcopy
- Invoice Manager with AppLayout, KPI cards, client initials, overdue badges, "Mark Paid" inline
- Sidebar BILLING section with Invoice Creator + Invoice Manager
- Processing screen with 7-stage progress, timeout warning, retry, educational tips

---

## Remaining Work (6 items)

### 1. Invoice Form: Duplicate Line Item + Save as Draft Button
**File:** `src/components/docs/forms/InvoiceForm.tsx`

- Add a "Duplicate" button (Copy icon) next to each line item's delete button that appends a copy of that row
- Add a "Save as Draft" button (secondary style) next to the existing submit/"Generate" button at the bottom of the form
- The draft infrastructure (`useDocFormDraft`) already exists — just wire a visible button to `saveDraft()`

### 2. Invoice Form: Prominent Running Total
**File:** `src/components/docs/forms/InvoiceForm.tsx`

- Move the totals summary to a sticky bottom bar or increase its visual weight: use `text-metric-md` (24px JetBrains Mono) for the grand total instead of `text-lg text-primary`
- Apply Quantis design tokens to the totals card (use `--q-bg-surface-dark`, `--q-border-subtle`)

### 3. Invoice Manager: Analysis Cross-Link Banner
**File:** `src/pages/InvoiceManager.tsx`

- Add a contextual banner above the invoice list when invoices exist AND the user has analyses
- Query the user's latest analysis to get projected monthly revenue
- Display: "Your analysis projected $X/mo revenue. You've invoiced $Y this month — Z% of projection."
- Hide banner if no analysis data is available

### 4. Onboarding Welcome Modal Enhancement
**File:** `src/components/onboarding/WelcomeModal.tsx`

- Review and update the existing WelcomeModal to match the "Step 0" spec:
  - Add checklist items: "No card required", "We never fabricate numbers — we show confidence levels", "You can save and edit every assumption later"
  - Add "See an example first" secondary action that navigates to `/examples/coffee-shop-denver`
  - Ensure the deliverables mention all 3 outputs (BI + Pre-Mortem + Invoice capacity)

### 5. Processing Screen: Include Pre-Mortem & Invoice Stages
**File:** `src/components/analysis/AnalysisProgress.tsx`

- The `buildStages` function currently has 7 stages focused on benchmarking/AI/stress-map
- Add conditional stages based on selected outputs:
  - If pre-mortem selected: "Running pre-mortem failure scenarios..."
  - If invoice capacity selected: "Checking invoice capacity and credit risk..."
- Accept `selectedOutputs` as a new optional prop; default to current behavior if not provided

### 6. Invoice Form: Section Visual Polish with Quantis Tokens
**File:** `src/components/docs/forms/InvoiceForm.tsx`

- The form currently uses generic shadcn Card components with default styling
- Apply Quantis design tokens: card backgrounds use `--q-bg-surface`, borders use `--q-border-subtle`
- Add section icons matching the intake form style (Building2 for company, Users for client, List for line items, FileText for terms)
- Use `.q-form-label` utility on section headers for consistency

---

## Files Summary

| File | Changes |
|------|---------|
| `src/components/docs/forms/InvoiceForm.tsx` | Duplicate line button, Save as Draft button, prominent total, Quantis token styling |
| `src/pages/InvoiceManager.tsx` | Analysis cross-link banner |
| `src/components/onboarding/WelcomeModal.tsx` | Step 0 enhancements |
| `src/components/analysis/AnalysisProgress.tsx` | Conditional pre-mortem/invoice stages |

## Implementation Order
1. Items 1-2 (Invoice Form polish) — most visible UX gap
2. Item 3 (Cross-link banner) — closes the model↔invoice loop
3. Item 4 (Welcome modal) — onboarding refinement
4. Item 5 (Progress stages) — completeness
5. Item 6 (Invoice form tokens) — visual consistency

