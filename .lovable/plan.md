

# AIWMC Quantis — Premium Intake Dashboard + Invoicing + Font Visibility Overhaul

## Problem Summary
The intake dashboard works but feels like a functional form, not a $30k SaaS instrument panel. Text is too small and muted ("blind minimalism"). The invoice system exists but is disconnected from the analysis flow. Users need to see value immediately to start paying.

---

## Phase 1: Typography & Visibility Overhaul (Global)

**Files:** `src/index.css`, `src/components/analysis/steps/*.tsx`, `src/components/analysis/CompactAnalysisForm.tsx`

Current font sizes are systematically too small: labels at 10-11px, hints at 9-10px, field values at 13px. This makes the entire form feel like fine print.

**Changes:**
- Bump all label sizes: `11px → 13px`, helper text: `10px → 12px`, field values: `16px → 18px`
- Increase section header sizes: step titles from `11px → 14px`
- Page title "Stress-test your business idea" from `22px → 28px` on mobile, `26px → 34px` on desktop
- Live Estimate metric values from `13px → 16px`, labels from `11px → 13px`
- Confidence ring score from `text-xl → text-2xl`
- Industry card labels from `11px → 13px`
- "You'll receive" strip items from `11-12px → 13px`
- All placeholder text from current to 1px larger with higher contrast color
- Update `--q-text-tertiary` in light mode from `#64748B → #475569` for better readability
- Add a new CSS utility `.q-label` (13px, 600 weight, tracking) and `.q-hint` (12px, secondary color) to standardize

## Phase 2: Intake Dashboard Premium Upgrade

### 2.1 Top Breadcrumb Bar
**File:** `CompactAnalysisForm.tsx`

Add a slim contextual bar above the title:
- Left: Logo icon + "AIWMC Quantis" wordmark (small)
- Center: Breadcrumb "New Analysis ▸ Inputs"
- Right: "Model v2.0 · Last updated Mar 2026" label

### 2.2 Industry Cards Enhancement
**File:** `IndustryStep.tsx`

- Increase card min-height from `60px → 72px`
- Add subtle sublabels: "Brick & mortar" under Coffee Shop, "Digital product" under SaaS, etc.
- Add "Popular" badge on Coffee Shop and SaaS (most selected)
- Increase icon size from `w-5 h-5 → w-6 h-6`

### 2.3 Financial Fields with Smart Advisor Hints
**File:** `FinancialField.tsx`

- On focus, show a "typical range" chip below the field: "Most SaaS here: $29–$299"
- Increase benchmark bar height from `3px → 5px` for visibility
- Add monospace font enforcement on all numeric inputs (already using JetBrains Mono, just bump size)

### 2.4 Analysis Depth Selector Premium Feel
**File:** `FinancialsStep.tsx`

- Add "Recommended" badge on "Full" option
- Add sliding highlight animation when switching (CSS transition on background position)
- Show tooltip-style detail on hover: "Full includes: P&L projection, Stress Map, Break-even analysis, Benchmark percentiles"

### 2.5 Confidence Sidebar Enhancement
**File:** `ConfidenceSidebar.tsx`

- Increase gauge size from `72/88px → 96/112px`
- Add glassmorphism effect (backdrop-blur + slight transparency) to the sidebar cards
- Replace checklist circles with icon+text status: checkmark icon for done, warning icon for missing required, info icon for optional
- Add explanatory line: "Accuracy improves as you fill more fields. We never fabricate numbers."
- Add "Details" link on Live Estimate that hints at a future drawer

### 2.6 Submit Button & Bottom Strip
**File:** `ConfidenceSidebar.tsx`, `CompactAnalysisForm.tsx`

- Add microcopy under CTA: "No card required · ~90 seconds"
- Make "You'll receive" strip items into hoverable pill-badges with tooltips explaining each deliverable
- Replace emoji icons in the strip with Lucide icons for consistency

### 2.7 Three-Zone Visual Separation
**File:** `CompactAnalysisForm.tsx`, `index.css`

- Left panel (Step 1): keep current surface color
- Center panel (Step 2): slightly brighter surface (+2% lightness)
- Right sidebar: slightly darker surface (−2% lightness) to create "instrument panel" feel
- Add new CSS variables: `--q-bg-surface-bright`, `--q-bg-surface-dark`

## Phase 3: Multi-Output Intake ("What Do You Want?")

### 3.1 Output Selector Checkboxes
**File:** `CompactAnalysisForm.tsx`

Add a row between the form and the "You'll receive" strip:
- Three checkbox pills: "BI Report" (default on), "Pre-Mortem Analysis", "Invoice Capacity Check"
- When "Invoice Capacity Check" is selected, show a small inline note: "We'll assess if this business model supports your invoice volume and margins"
- Pass selected outputs through to the submit handler

### 3.2 Update "You'll receive" Strip Dynamically
**File:** `CompactAnalysisForm.tsx`

The deliverables strip updates based on selected outputs:
- BI Report: P&L, Stress Map, Break-even, Benchmarks
- Pre-Mortem: Failure scenarios, Risk flags, Mitigation plan
- Invoice Check: Credit capacity, Margin health, Payment risk

## Phase 4: Invoice Manager Redesign

### 4.1 Wrap in AppLayout
**File:** `InvoiceManager.tsx`

Currently renders without the sidebar/app shell. Wrap in `AppLayout` so it feels part of the product, not a standalone page.

### 4.2 Summary Dashboard Cards
**File:** `InvoiceManager.tsx`

Add KPI cards above the invoice list:
- Total Outstanding (sum of sent + overdue)
- Paid This Month
- Overdue Count (red if > 0)
- Average Days to Payment

### 4.3 Enhanced Invoice Cards
**File:** `InvoiceManager.tsx`

- Add payment terms display
- Add days overdue indicator (red badge with "12 days overdue")
- Add quick-action buttons inline (not just dropdown): "Mark Paid" as primary action
- Add client avatar placeholder (initials circle)

### 4.4 Connect Invoices to Analysis
**File:** `InvoiceManager.tsx`

- If invoice has `analysis_ref_id`, show a link: "View analysis →"
- Add a banner: "Your analysis predicted $28k/mo revenue. You've invoiced $12.4k this month — 44% of projection."
- This creates the closed loop between model and reality

## Phase 5: Invoice Form Polish
**File:** `InvoiceForm.tsx`

- Add section grouping with visual dividers: "Your Company", "Client", "Line Items", "Terms"
- Improve line item UX: drag-to-reorder, duplicate row button
- Add running total that updates live (already exists but make more prominent)
- Add "Save as Draft" alongside "Generate" button

## Phase 6: Sidebar Integration
**File:** `AppSidebar.tsx`

- Move "Invoice Creator" into a new "BILLING" section group
- Add "Invoice Manager" as a separate nav item below it
- Add badge showing overdue invoice count on the nav item

---

## Files Summary

| Category | Files | Type |
|----------|-------|------|
| Global CSS | `index.css` | Update (font sizes, new surface variables, utilities) |
| Form Steps | `IndustryStep.tsx`, `FinancialsStep.tsx`, `FinancialField.tsx`, `ConfidenceSidebar.tsx` | Update (sizes, hints, badges, glassmorphism) |
| Orchestrator | `CompactAnalysisForm.tsx` | Update (breadcrumb, output selector, strip icons, zone colors) |
| Invoice | `InvoiceManager.tsx` | Update (AppLayout, KPI cards, enhanced cards, analysis link) |
| Invoice Form | `InvoiceForm.tsx` | Update (section grouping, draft save) |
| Sidebar | `AppSidebar.tsx` | Update (billing section, badge) |

## Implementation Order
1. **Phase 1** — Typography/visibility (fixes the "blind minimalism" complaint immediately)
2. **Phase 2** — Intake premium feel (biggest visual upgrade)
3. **Phase 4** — Invoice Manager redesign (connects invoicing to the product)
4. **Phase 3** — Multi-output selector (new capability)
5. **Phase 5** — Invoice form polish
6. **Phase 6** — Sidebar integration

