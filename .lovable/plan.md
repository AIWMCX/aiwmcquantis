

# AIWMC Quantis Docs Studio -- Complete Feature Audit, Testing, and Launch Readiness Plan

---

## Part 1: How Docs Studio Works (Detailed Explanation)

### Architecture Overview

Docs Studio is a premium document generation system built into AIWMC Quantis that transforms business analysis data into professional, downloadable documents. Here is how every piece connects:

```text
+------------------+     +-------------------+     +------------------+
|   Analysis       |     |   Template Forms   |     |   Live Preview   |
|   Auto-Fill      |---->|   (10 templates)   |---->|   (HTML render)  |
|   (useAnalysis   |     |   Zod validation   |     |   sanitized via  |
|    AutoFill)     |     |   react-hook-form  |     |   DOMPurify      |
+------------------+     +-------------------+     +------------------+
                                  |                         |
                                  v                         v
                          +-------------------+     +------------------+
                          |   Document Save   |     |   Download       |
                          |   (Supabase DB)   |     |   PDF / HTML     |
                          |   RLS-protected   |     |   (client-side)  |
                          +-------------------+     +------------------+
                                  |
                                  v
                          +-------------------+
                          |   Tiptap Editor   |
                          |   (rich editing)  |
                          |   auto-save 2s    |
                          +-------------------+
```

### User Flow (Step by Step)

1. User navigates to `/docs` (protected route, requires authentication)
2. System checks Plus subscription status via `useSubscription` hook
3. If not Plus, shows a locked feature card with upgrade CTA ($17/mo)
4. If Plus, shows the main Docs Studio with two tabs: "My Documents" and "Quick Create"
5. User clicks "New Document" or selects a template from Quick Create
6. Template picker shows all 10 templates with category icons, AI badges, and Auto-fill indicators
7. User selects a template (e.g., "Professional Invoice")
8. Split-screen view opens: form on left, live HTML preview on right
9. User fills form fields (Zod-validated in real-time)
10. Every keystroke triggers a debounced (300ms) preview HTML update
11. User can click "Auto-fill from Analysis" to pull data from a previous Quantis analysis
12. User can click "Generate with AI" (on supported templates) to get AI-written sections
13. Draft is auto-saved to localStorage every 800ms via `useDocFormDraft`
14. User clicks "Save Document" to persist to database
15. Document enters Tiptap rich-text editor with auto-save (2s debounce)
16. User can change status (Draft -> Review -> Final)
17. User can export via the ExportPanel or use the PreviewDownloadBar for PDF/HTML

### The 10 Templates

| Template | Category | AI Support | Auto-Fill | Draft Save | XSS Protected |
|----------|----------|------------|-----------|------------|---------------|
| Professional Invoice | Financial | No | Yes | Yes | Yes |
| Quarterly Summary | Financial | Yes | Yes | Yes | Yes |
| NDA Agreement | Legal | No | Yes | Yes | Yes |
| Business Plan | Planning | Yes | Yes | Yes | Yes |
| Pitch Deck | Fundraising | Yes | Yes | Yes | Yes |
| One-Page Plan | Planning | No | Yes | Yes | Yes |
| Financial Forecast | Financial | No | Yes | Yes | Yes |
| Partnership Proposal | Legal | Yes | Yes | Yes | **NO** |
| Founder Agreement | Legal | No | Yes | **NO** | **NO** |
| Market Analysis | Planning | Yes | Yes | Yes | Yes |

### Quantis Analysis Integration

The `useAnalysisAutoFill` hook fetches the user's last 20 analyses and maps 20+ fields:
- Company info: name, city, industry
- Financial metrics: monthly/quarterly/annual revenue, startup investment, profit
- Unit economics: CAC, LTV, ROI, payback months, gross margin
- Market data: TAM, SAM, SOM
- Projections: Year 1/2/3 revenue

Each form implements a `handleAutoFill` callback that maps relevant fields. The `AutoFillButton` component provides both "quick fill" (most recent analysis) and a dialog to pick from any past analysis.

---

## Part 2: Comprehensive Audit Findings

### CRITICAL Security Issues

**Issue 1: PartnershipForm and FounderAgreementForm have NO XSS protection**

These two forms render user input directly into HTML without `escapeFormValues()` or `sanitizePreviewHTML()`. An attacker could enter `<script>alert('xss')</script>` into any text field and it would render unsanitized in the preview. While DOMPurify strips `<script>` tags when the preview is rendered via `dangerouslySetInnerHTML` in DocsStudio.tsx (because the parent calls `sanitizePreviewHTML(previewHTML)`), the forms themselves call `onPreviewUpdate(html)` without sanitizing first. The downloaded PDF/HTML files would contain the raw unsanitized HTML.

All 7 other forms correctly use `escapeFormValues()` + `sanitizePreviewHTML()`.

**Fix required:**
- `PartnershipForm.tsx`: Add `import { escapeFormValues, sanitizePreviewHTML } from '@/lib/htmlSanitizer'` and wrap all user values through `escapeFormValues()` before HTML interpolation, then call `onPreviewUpdate(sanitizePreviewHTML(html))`
- `FounderAgreementForm.tsx`: Same fix needed

**Issue 2: FounderAgreementForm has no draft persistence**

If a user refreshes the page while filling out a complex founder agreement (with multiple founders, equity splits, vesting schedules), all data is lost. This form is missing the `useDocFormDraft` hook and `DocDraftBanner` component.

**Issue 3: FounderAgreementForm uses `watch()` causing full re-renders**

Line 108: `const watchedValues = watch()` triggers a full component re-render on every keystroke. With the complexity of this form (dynamic founder array, equity calculations), this creates noticeable lag. Should use the subscription pattern with `useRef` like PitchDeckForm and InvoiceForm.

### CRITICAL Functional Issues

**Issue 4: Export edge function returns raw JSON for PDF/DOCX**

The `export-document` edge function (line 121) returns `JSON.stringify(docJson, null, 2)` for PDF and DOCX formats. This is completely non-functional -- the user gets a downloaded file containing raw JSON, not a readable document. The client-side `PreviewDownloadBar` using `useDocumentDownload` hook (print-to-PDF and HTML download) works correctly, but the editor's `ExportPanel` calls the broken edge function.

**Issue 5: CORS headers in export-document are incomplete**

The edge function's `corsHeaders` is missing the extended Supabase client headers (`x-supabase-client-platform`, etc.) that are required for the latest Supabase JS client.

### Performance Issues

**Issue 6: DocsStudio eagerly imports all 10 form components**

Line 10 of `DocsStudio.tsx` imports ALL form components at the top level. Only one form is rendered at a time. This adds unnecessary bundle weight to the initial page load.

**Issue 7: Preview rendering in multiple forms uses `form.watch()` without debounce**

Forms that still use `const formValues = form.watch()` (BusinessPlanForm, OnePagePlanForm, NDAForm, QuarterlySummaryForm, FinancialForecastForm, MarketAnalysisForm) trigger a full re-render on every keystroke. While InvoiceForm and PitchDeckForm have been optimized with debounced patterns, 6 forms still have the issue.

### Scalability Issues

**Issue 8: No rate limiting on document creation**

The `useCreateDocument` mutation has no client-side or server-side rate limiting. A malicious user could create thousands of documents rapidly.

**Issue 9: Template query fetches ALL templates on every page load**

`useTemplates` fetches all templates from the database on mount. With 10 hardcoded template cards in `TEMPLATE_CARDS` plus database templates, this creates redundant queries.

---

## Part 3: Implementation Plan

### Phase A: Security Fixes (Must-do before launch)

**A1. Add XSS protection to PartnershipForm.tsx**
- Import `escapeFormValues` and `sanitizePreviewHTML` from `@/lib/htmlSanitizer`
- In the preview generation callback, wrap all form values through `escapeFormValues()` before HTML interpolation
- Call `onPreviewUpdate(sanitizePreviewHTML(html))` instead of `onPreviewUpdate(html)`

**A2. Add XSS protection to FounderAgreementForm.tsx**
- Same pattern as A1
- In `generatePreview()`, escape `watchedValues` through `escapeFormValues()` before template interpolation
- Call `onPreviewUpdate(sanitizePreviewHTML(html))` instead of `onPreviewUpdate(html)`

**A3. Add draft persistence to FounderAgreementForm.tsx**
- Import `useDocFormDraft` and `DocDraftBanner`
- Add the hook with `templateId: 'founder-agreement'`
- Add `DocDraftBanner` component at top of form
- Call `clearDraft()` in `onSubmit`

**A4. Fix CORS headers in export-document edge function**
- Update `corsHeaders` to include the full Supabase client headers list

### Phase B: Performance Fixes

**B1. Fix FounderAgreementForm watch() performance**
- Replace `const watchedValues = watch()` with subscription pattern using `useRef`
- Add 300ms debounced preview generation (matching PitchDeckForm pattern)
- This eliminates full re-renders on every keystroke in a complex form

**B2. Lazy-load form components in DocsStudio.tsx**
- Replace the eager import of all 10 forms with `React.lazy()` imports
- Only load the selected template's form component
- Add a loading skeleton while form chunk loads

### Phase C: End-to-End Test

**C1. Build a complete test of document creation flow**
- Navigate to `/docs` as a Plus subscriber
- Select the Invoice template
- Fill in all required fields
- Verify live preview renders correctly
- Verify draft auto-save works (check localStorage)
- Download PDF via print dialog
- Download HTML file
- Save document to database
- Verify document appears in "My Documents" list
- Edit the saved document in Tiptap editor
- Verify auto-save works in editor
- Delete the document and verify soft-delete

### Phase D: Export Pipeline Fix

**D1. Fix the export-document edge function**
- For PDF format: Instead of returning raw JSON, extract the document's HTML preview content. The client-side `PreviewDownloadBar` already handles PDF via print dialog correctly, so the editor's ExportPanel should also use the client-side approach
- Update `useDocumentExport` to use `useDocumentDownload` (print-to-PDF) for PDF exports instead of calling the broken edge function
- Keep the edge function for markdown export (which already works)

### Technical Changes Summary

| File | Changes |
|------|---------|
| `src/components/docs/forms/PartnershipForm.tsx` | Add XSS sanitization |
| `src/components/docs/forms/FounderAgreementForm.tsx` | Add XSS sanitization, draft persistence, fix watch() |
| `src/pages/DocsStudio.tsx` | Lazy-load form components |
| `supabase/functions/export-document/index.ts` | Fix CORS headers |
| `src/hooks/useDocumentExport.ts` | Use client-side PDF instead of broken edge function |

### Launch Readiness Checklist

After these changes, the `/docs` route will be ready for public launch with:

- All 10 templates XSS-protected via dual-layer sanitization (escapeFormValues + sanitizePreviewHTML)
- All 10 templates with draft persistence (localStorage auto-save)
- Plus subscription gating enforced at 3 levels (route protection, UI gate, RLS policies)
- Document ownership enforced via RLS (users can only see/edit/delete their own documents)
- Anonymous access denied via explicit `anon` DENY policies on all 4 tables
- Client-side PDF and HTML download working for all templates
- Optimized form rendering with debounced preview updates
- Lazy-loaded form components for faster page load
- AI suggestion generation via `generate-document-content` edge function (Plus-only)
- Analysis auto-fill pipeline mapping 20+ financial metrics across templates

