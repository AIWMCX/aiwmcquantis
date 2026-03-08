

# PDF Generator Edge Function

## Key constraint

Puppeteer does **not** work in Supabase Edge Functions (Deno Deploy has no headless Chrome). The spec's approach is not feasible in this environment.

## Realistic alternative

Use the **Lovable AI gateway** to convert HTML to a clean, structured document, then store it as HTML (which browsers can print to PDF). Additionally, provide a client-side `window.print()` flow for actual PDF output. This matches what `process-doc-job` already does — it stores generated content as JSON/HTML in Storage.

For server-side PDF generation at scale, the industry-standard approach within Deno is to use a lightweight HTML-to-PDF library or an external API. Since we want zero external dependencies, the function will:

1. Accept HTML content + metadata
2. Validate inputs (size, UUID format, cache key)
3. Check Storage cache (return early on hit)
4. Store the finalized HTML as a downloadable file
5. Update `doc_generation_jobs` with status/timing
6. Return signed URL

This keeps the same interface the spec describes but without the impossible Puppeteer dependency. The HTML files are print-optimized (the templates in `doc-renderer.ts` already have A4 CSS).

## Implementation

### New file: `supabase/functions/pdf-generator/index.ts`

- Standard CORS + OPTIONS handling
- Input validation: `htmlContent` (string, < 500KB), `userId` (UUID regex), `cacheKey` (64-char hex), `templateId`
- Cache check: `supabase.storage.from('document-exports').download(path)` — if found, return signed URL with `cacheHit: true`
- Cache miss: upload HTML to `document-exports` bucket at `docs/{userId}/{cacheKey}.html`
- Create 24h signed URL via `createSignedUrl`
- Update `doc_generation_jobs` row: status, output_url, processing_ms, output_size_kb
- Error handling: structured error codes (`QE-PDF-001`), best-effort job failure logging
- Uses service role key for Storage operations

### Config update

Add `verify_jwt = false` entry in `supabase/config.toml` for the new function (validated in code instead).

## Files

| File | Action |
|------|--------|
| `supabase/functions/pdf-generator/index.ts` | New |

