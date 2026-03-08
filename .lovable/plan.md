

# docs-engine.ts — Document Generation Service

## Summary

Create `src/services/docs-engine.ts` — the core service layer powering all document generation. Uses QMath for monetary precision, supports sync/async paths, SHA-256 caching, and performance signal tracking.

## What gets built

A single new file: `src/services/docs-engine.ts`

### Interfaces
- `DocGenerationRequest` — analysis ID, template ID, user ID, optional customizations
- `DocGenerationResponse` — job ID, status (complete/queued), file URL, cache info
- `InvoiceLineItem` — description, quantity, unitPrice, total (QMath-computed)
- `InvoiceData` — full invoice with rate intelligence info
- `DocSignalType` — union of 10 signal types for the self-improvement loop
- Supporting types: `ClientInfo`, `RateIntelligenceInfo`, `DocTemplate`, `UserBrandProfile`, `GeneratedDocument`

### Functions

1. **`requestDocGeneration(req)`** — Main entry point
   - Fetches report from `analyses` table, brand profile, and template in parallel
   - Generates SHA-256 cache key from `analysisId + templateId + userId + templateVersion`
   - Cache HIT → returns signed Storage URL immediately
   - Cache MISS + fast-path template → calls `generateDocumentSync()`
   - Cache MISS + async template → calls `enqueueDocumentJob()`

2. **`generateDocumentSync()`** — Fast path (<500ms)
   - Builds template data combining report + brand profile + customizations
   - Invokes `generate-document-content` edge function
   - Uploads result to `document-exports` Storage bucket
   - Inserts record into `documents` table
   - Returns 24h signed URL

3. **`enqueueDocumentJob()`** — Async path
   - Inserts into `doc_generation_jobs` with status `queued`
   - Fire-and-forget triggers `process-doc-job` edge function
   - Returns job ID + estimated time from `template.avg_gen_ms`

4. **`generateInvoice(userId, analysisId, clientInfo, lineItems, options)`** — QMath invoice
   - Calls `get_next_invoice_number` RPC for atomic sequential numbering
   - All arithmetic via QMath: `multiply(qty, price)`, `add` for subtotal, tax, discount
   - Looks up rate intelligence from `BENCHMARK_DATABASE` (p25/p75 comparison)
   - Persists to `invoices` table
   - Optionally renders PDF via edge function

5. **`recordDocSignal()`** — Fire-and-forget signal insert into `doc_performance_signals`

6. **`getUserDocumentLibrary(userId, filters?)`** — Fetches from `documents` table with optional filters, returns sorted by `created_at DESC`

### Technical details

- Cache key: `SHA-256(analysisId:templateId:userId:templateVersion)` using Web Crypto API
- Storage path: `docs/{userId}/{cacheKey}.pdf` in `document-exports` bucket
- Signed URLs expire in 24 hours
- Rate intelligence compares avg line item price against `avg_ticket_size` benchmark percentiles
- All monetary values use `QMath.add/subtract/multiply` — no raw JS arithmetic
- Non-critical operations (signal recording, PDF upload) use catch-and-warn pattern

## Files

| File | Action |
|------|--------|
| `src/services/docs-engine.ts` | New |

