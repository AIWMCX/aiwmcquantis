

# Instant Invoice Engine — AI Rate Intelligence

## Current State

The invoice infrastructure is fully built:
- `invoices` table with RLS, atomic `get_next_invoice_number` RPC
- `useInvoices` hook with CRUD + status management
- `InvoiceForm.tsx` with brand profile auto-fill, line items, tax, live preview
- `InvoiceManager.tsx` with status filters and actions
- `user_brand_profiles` table for company data

## What's Missing (from Part 4 spec)

The **AI Rate Intelligence** layer — the feature that makes Quantis invoicing unique. Currently the invoice form is a standard form. The spec calls for benchmark-aware pricing guidance.

## Implementation Plan

### 1. Add `RateIntelligenceBadge` component (new file)

`src/components/docs/RateIntelligenceBadge.tsx`

A small inline component that:
- Takes `industryType`, `unitPrice`, and an `onApplyMarketRate` callback
- Looks up `avg_ticket_size` from `BENCHMARK_DATABASE` in `benchmark-calibrator.ts`
- Compares the user's `unit_price` against p25/p50/p75 percentiles
- Shows contextual badges:
  - **Below p25** (yellow): "Your rate of $X is below the $Y–$Z market range for [industry]"
  - **p25–p75** (neutral): No badge
  - **Above p75** (green): "Premium Pricing ✓"
- Includes a one-click "Apply Market Rate" button (sets price to p50) when below p25

### 2. Add `discount_amount` field to `InvoiceForm.tsx`

The DB column exists but the form doesn't expose it. Add a simple discount input between tax and total, update calculations accordingly.

### 3. Integrate Rate Intelligence into `InvoiceForm.tsx`

- Import `RateIntelligenceBadge`
- Accept an optional `industryType` prop (passed from auto-fill or analysis context)
- Show the badge next to each line item's unit_price field
- Wire "Apply Market Rate" to `form.setValue('line_items.N.unit_price', p50)`

### 4. Update `InvoiceForm` preview HTML

- Include discount row in the totals section
- Total = subtotal + tax - discount

### 5. Update `useCreateInvoice` call in `onSubmit`

- Pass `discount_amount` to the mutation

## Files to modify

| File | Change |
|------|--------|
| `src/components/docs/RateIntelligenceBadge.tsx` | New component |
| `src/components/docs/forms/InvoiceForm.tsx` | Add discount field, integrate rate intelligence badge, update preview/calculations |

No database changes needed — `discount_amount` column already exists in the `invoices` table.

