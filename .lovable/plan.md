

# AIWMC Quantis — Completeness Pass Implementation Plan

## 4 Files, 6 Changes

### 1. InvoiceForm.tsx — Duplicate + Draft + Total + Tokens (Items 1, 2, 6)

**Duplicate line item:**
- Add `Copy` to lucide imports
- After the Trash2 button (line 472-480), add a "Duplicate" button that calls `append({ ...form.getValues(`line_items.${index}`) })`

**Save as Draft:**
- Destructure `saveDraft` from `useDocFormDraft` (line 125, already returned but not destructured)
- After the existing submit button (which is currently missing from the form — the form relies on `form.handleSubmit` on the `<form>` tag), add a footer bar with two buttons:
  - "Save as Draft" (secondary, calls `saveDraft()`)
  - "Generate Invoice" (primary, type="submit")

**Prominent running total (lines 527-548):**
- Replace `text-lg text-primary` on the total with `text-metric-md` (24px JetBrains Mono)
- Apply `--q-bg-surface-dark` background and `--q-border-subtle` border to the totals card
- Make the totals card sticky at the bottom of the line items section

**Section tokens & icons (Item 6):**
- Add `Users, List` to lucide imports
- Company section header (line 385): already has `FileText` + `Building2` — change to `Building2` icon + apply `q-form-label` class
- Client section header (line 421): add `Users` icon
- Line Items header (line 454): add `List` icon
- Additional Details header (line 555): add `FileText` icon
- Apply Quantis token styling to all Card components: `style={{ background: 'var(--q-bg-surface)', border: '1px solid var(--q-border-subtle)' }}`

### 2. InvoiceManager.tsx — Analysis Cross-Link Banner (Item 3)

- Import `useQuery` from `@tanstack/react-query` and `supabase` client
- After the KPI cards (line 140), before Status Tabs (line 142):
  - Query the user's latest analysis result to get projected monthly revenue
  - Compute total invoiced this month from the existing `invoices` data
  - Render a banner: "Your analysis projected $X/mo revenue. You've invoiced $Y this month — Z% of projection."
  - Hide entirely if no analysis data or no invoices exist
- Use Quantis token styling with `--q-accent-glow` background

### 3. WelcomeModal.tsx — Step 0 Enhancement (Item 4)

- Replace the current 3 `benefits` array with updated content reflecting all 3 outputs:
  - BI Report: "Revenue forecasts, unit economics, benchmark percentiles"
  - Pre-Mortem: "Failure scenarios, risk flags, mitigation plans"
  - Invoice Capacity: "Credit capacity, margin health, payment risk"
- Add a checklist section below benefits with green check icons:
  - "No card required"
  - "We never fabricate numbers — we show confidence levels"
  - "You can save and edit every assumption later"
- Change "I'll explore on my own" button to "See an example first" that navigates to `/examples/coffee-shop-denver`
- Add `useNavigate` import

### 4. AnalysisProgress.tsx — Conditional Stages (Item 5)

- Add `selectedOutputs` optional prop to `AnalysisProgressProps`:
  ```ts
  selectedOutputs?: { biReport: boolean; preMortem: boolean; invoiceCapacity: boolean };
  ```
- Update `buildStages` to accept `selectedOutputs` parameter
- When `preMortem` is true, append stage: `{ id: 'premortem', label: 'Running pre-mortem failure scenarios...', completedLabel: 'Pre-mortem scenarios generated', startTime: 42, endTime: 50 }`
- When `invoiceCapacity` is true, append stage: `{ id: 'invoice', label: 'Checking invoice capacity and credit risk...', completedLabel: 'Invoice capacity check complete', startTime: 50, endTime: 58 }`
- Adjust time constants accordingly; default behavior unchanged when prop is omitted
- Pass `selectedOutputs` through in `useMemo` dependency for `stages`

---

## Implementation Order
1. **InvoiceForm.tsx** — largest change, covers items 1+2+6
2. **InvoiceManager.tsx** — cross-link banner (item 3)
3. **WelcomeModal.tsx** — onboarding polish (item 4)
4. **AnalysisProgress.tsx** — conditional stages (item 5)

