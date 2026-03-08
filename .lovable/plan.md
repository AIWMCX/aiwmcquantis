

# Docs Generation Engine — Full Implementation

## Current State

Already built: 10 template forms, live preview, client-side PDF/HTML download, rate limiting (1/day free, unlimited Plus), auto-fill from analysis, TipTap editor, `branding_settings` table, `documents` table, `document_exports` table, `export_jobs` table, `document_downloads` table, `doc_templates` table.

## What's New

### Database Migration (1 migration, 4 new tables)

**`user_brand_profiles`** — Extended brand profile for invoicing (address, tax ID, invoice counter)
- Columns: `user_id` (UNIQUE), `company_name`, `logo_url`, `primary_color`, `secondary_color`, `accent_color`, `font_preference`, `address_line1/2`, `city`, `state`, `zip`, `phone`, `email`, `website`, `tax_id`, `invoice_prefix` DEFAULT 'INV', `invoice_counter` DEFAULT 1000
- RLS: users CRUD own row, anon denied

**`invoices`** — Persistent invoice records with sequential numbering
- Columns: `user_id`, `document_id` (FK documents), `invoice_number`, `client_name`, `client_email`, `client_company`, `client_address`, `line_items` JSONB, `subtotal`, `tax_rate`, `tax_amount`, `discount_amount`, `total_amount`, `currency`, `issue_date`, `due_date`, `payment_terms`, `notes`, `status` (draft/sent/paid/overdue/cancelled), `paid_at`, `analysis_ref_id`
- RLS: users CRUD own invoices, anon denied
- DB function: `get_next_invoice_number(p_user_id)` — atomic counter increment

**`doc_generation_jobs`** — Async queue for complex documents
- Columns: `job_id` TEXT UNIQUE, `user_id`, `analysis_id`, `template_id`, `status` (queued/processing/complete/failed), `priority`, `input_data` JSONB, `output_url`, `output_size_kb`, `error_message`, `retry_count`, `processing_ms`, `cache_hit`, `completed_at`
- Indexes on `(status, priority, created_at)` and `(user_id, created_at DESC)`
- RLS: users read own jobs, service_role inserts/updates
- Enable realtime for status updates

**`doc_performance_signals`** — Self-improvement tracking
- Columns: `document_id` (FK documents), `user_id`, `signal_type` TEXT (downloaded/shared/rated/regenerated/section_edited/resulted_in_meeting), `signal_value` INTEGER, `context` JSONB
- RLS: users insert own signals, admins select all

### File 1: `src/hooks/useInvoices.ts` (New)

Hook for invoice CRUD:
- `useInvoices()` — list user's invoices
- `useCreateInvoice()` — creates invoice with atomic `get_next_invoice_number` call
- `useUpdateInvoiceStatus(id, status)` — mark paid/sent/overdue
- Integrates with `user_brand_profiles` for company info auto-fill

### File 2: `src/hooks/useBrandProfile.ts` (New)

Hook for the extended brand profile (separate from existing `useBranding` which handles report branding):
- `useBrandProfile()` — fetch/upsert user_brand_profiles
- Used by InvoiceForm for auto-populating company fields
- Used by document generation for branded headers/footers

### File 3: `src/hooks/useDocSignals.ts` (New)

Hook to record performance signals:
- `recordSignal(documentId, signalType, value?, context?)` — fire-and-forget insert
- Called from download handlers, share actions, document editor saves

### File 4: `src/hooks/useDocQueue.ts` (New)

Hook for async document generation:
- `queueDocument(analysisId, templateId, inputData)` — inserts job, subscribes to realtime channel
- Returns `{ status, progress, downloadUrl, error }`
- Uses Supabase Realtime to listen for job completion

### File 5: `supabase/functions/process-doc-job/index.ts` (New edge function)

Worker that processes queued doc generation jobs:
- Picks up `queued` jobs, sets to `processing`
- Calls `generate-document-content` for AI sections
- Generates final document, stores in Supabase Storage
- Updates job status to `complete` with `output_url`
- Records `processing_ms` for latency tracking

### File 6: Update `src/components/docs/forms/InvoiceForm.tsx`

- Auto-populate company fields from `useBrandProfile()`
- On download, also create an `invoices` row with `get_next_invoice_number`
- Show sequential invoice number in preview (INV-1001, INV-1002, etc.)

### File 7: Update `src/pages/DocsStudio.tsx`

- Add "Invoices" sub-tab under My Documents showing invoice list with status badges
- Record `downloaded` signal on every download via `useDocSignals`
- For complex templates (business-plan, pitch-deck), offer async generation path via `useDocQueue` with progress indicator
- Add "Brand Profile" settings link for Plus users

### File 8: `src/pages/InvoiceManager.tsx` (New page)

Dedicated invoice management view:
- List all invoices with status filters (draft/sent/paid/overdue)
- Mark as sent/paid
- Regenerate PDF from stored data
- Route: `/app/invoices`

## Files Summary

| File | Action |
|------|--------|
| Migration | 4 new tables + 1 DB function |
| `src/hooks/useInvoices.ts` | New |
| `src/hooks/useBrandProfile.ts` | New |
| `src/hooks/useDocSignals.ts` | New |
| `src/hooks/useDocQueue.ts` | New |
| `supabase/functions/process-doc-job/index.ts` | New edge function |
| `src/components/docs/forms/InvoiceForm.tsx` | Extended |
| `src/pages/DocsStudio.tsx` | Extended |
| `src/pages/InvoiceManager.tsx` | New page |
| `src/App.tsx` | Add `/app/invoices` route |

