

# Merge Invoice Creator + Manager into One Unified Page

## Problem

Two separate sidebar entries ("Invoice Creator" and "Invoice Manager") exist under BILLING. "Invoice Manager" links to `/app/invoice-manager` which doesn't have a route — resulting in a 404. The actual InvoiceManager page is at `/app/invoices`. The invoice creation form lives inside DocsStudio as `InvoiceForm`. The user wants one unified, professional page that handles both creating and managing invoices.

## Design

A single page at `/app/invoices` with a **split-view layout** inspired by modern billing tools (Julius AI, Stripe Dashboard pattern):

```text
┌─────────────────────────────────────────────────────┐
│  Invoices                              [+ New Invoice] │
├─────────────────────────────────────────────────────┤
│  KPI Strip: Outstanding | Paid This Month | Overdue | Avg Days │
├─────────────────────────────────────────────────────┤
│  [All] [Draft] [Sent] [Paid] [Overdue]              │
├─────────────────────────────────────────────────────┤
│  Invoice list rows...                               │
│  (clicking "+ New Invoice" opens a slide-over panel  │
│   with the full InvoiceForm built inline)            │
└─────────────────────────────────────────────────────┘
```

When "+ New Invoice" is clicked, a **Sheet (slide-over panel)** opens from the right with the full invoice creation form (client info, line items, tax, preview) — no page navigation needed. On submit, the invoice list refreshes automatically.

## Changes

### 1. `src/pages/InvoiceManager.tsx` — Rebuild as unified page
- Keep existing KPI cards, status tabs, invoice list, and AnalysisBanner
- Add state `showCreator` boolean
- Import and embed `InvoiceCreatorPanel` (a new Sheet-based component extracted from `InvoiceForm` logic)
- When the Sheet's form submits successfully, close the panel and the query cache invalidates automatically (already wired via `useCreateInvoice`)
- Add inline invoice detail expansion (click a row to see line items, notes, dates)
- Add search/filter bar for client name

### 2. `src/components/invoices/InvoiceCreatorPanel.tsx` — New file
- A `Sheet`-based component that contains the full invoice creation form
- Adapts the existing `InvoiceForm` logic (company info from brand profile, line items with add/remove/duplicate, tax, discount, payment terms, notes, live preview)
- Uses `useCreateInvoice` hook for DB persistence
- 4-step wizard: Client Info → Line Items → Settings → Preview & Submit
- Includes rate intelligence badge, auto-fill from brand profile
- On successful creation: closes sheet, shows toast, list auto-refreshes

### 3. `src/components/layout/AppSidebar.tsx` — Merge sidebar entries
- Replace the two BILLING items with a single entry: `{ title: 'Invoices', url: '/app/invoices', icon: Receipt }`

### 4. `src/App.tsx` — Remove dead route
- Remove `/app/invoice-manager` route (it was never defined anyway, just clean the sidebar reference)
- Keep `/app/invoices` route pointing to InvoiceManager

### 5. `src/pages/DocsStudio.tsx` — Remove Invoices tab redirect
- The "Invoices" tab in DocsStudio currently navigates to `/app/invoices` — keep this as-is (it still works)

## Files

| File | Action |
|------|--------|
| `src/pages/InvoiceManager.tsx` | Rewrite: add Sheet creator panel, row expansion, search |
| `src/components/invoices/InvoiceCreatorPanel.tsx` | Create: Sheet-based invoice creation form |
| `src/components/layout/AppSidebar.tsx` | Edit: merge 2 BILLING items into 1 |

## Key UX Details
- Invoice rows expand on click to show line items, notes, and full details
- Search bar filters by client name or invoice number
- Creator panel has live running total bar at bottom
- Brand profile auto-populates company fields
- Rate intelligence warnings from benchmarks
- Draft auto-save in the creator panel

