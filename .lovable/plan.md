
# AIWMC Quantis Docs Studio -- Comprehensive Public Launch Roadmap
## Technical Improvement Plan for Performance, Scalability, and Professional Growth

---

## Current State Assessment

After a thorough audit of every file in the Docs Studio system (10 templates, 6 hooks, 3 edge functions, the main page, editor, export pipeline, CSS, and the uploaded launch plan document), here is a complete status picture:

### What Works
- 10 template forms with live HTML preview (Invoice, Quarterly Summary, NDA, Business Plan, Pitch Deck, One-Page Plan, Financial Forecast, Partnership, Founder Agreement, Market Analysis)
- Analysis auto-fill pipeline via `useAnalysisAutoFill` hook (maps 15+ financial fields from analyses to template fields)
- AI suggestion generation via `generate-document-content` edge function
- Tiptap rich-text editor with auto-save
- Draft persistence via `useDocFormDraft` hook (800ms debounced localStorage)
- Document CRUD with soft-delete, status management (draft/review/final)
- Plus subscription gating with server-side verification
- Beta user whitelist (currently locked to beltovbogdan@gmail.com only)

### Critical Issues Found

| Issue | Location | Severity |
|-------|----------|----------|
| AIWMC proprietary data still in PitchDeckForm defaults | `PitchDeckForm.tsx` (lines 80-118) | CRITICAL |
| AIWMC proprietary data still in QuarterlySummaryForm defaults | `QuarterlySummaryForm.tsx` (lines 63-65) | CRITICAL |
| AIWMC proprietary data still in NDAForm defaults | `NDAForm.tsx` (lines 59-63) | CRITICAL |
| Emojis in TEMPLATE_CATEGORIES on DocsStudio.tsx | `DocsStudio.tsx` (lines 153-158) | HIGH |
| Emojis in locked feature highlights on DocsStudio.tsx | `DocsStudio.tsx` (lines 343-369) | HIGH |
| Beta whitelist blocks ALL Plus subscribers | `DocsStudio.tsx` (line 185-186) | CRITICAL (launch blocker) |
| Export only produces markdown, not real PDF/DOCX | `export-document/index.ts` (line 121-122) | CRITICAL |
| `form.watch()` in PitchDeckForm causes full re-renders | `PitchDeckForm.tsx` (line 126) | HIGH |
| PitchDeckForm and PartnershipForm missing draft persistence | Forms missing `useDocFormDraft` | MEDIUM |
| No "Generate Documents" CTA in analysis results | `AnalysisResults.tsx` | HIGH |
| Fake usage counts on template cards (e.g., "1,247 created") | `DocsStudio.tsx` (lines 49-147) | HIGH |

---

## Phase 1: Data Privacy and Professionalism (Day 1)
**Goal: Remove all proprietary AIWMC data and remaining emojis**

### 1.1 Clear AIWMC Defaults from Remaining Templates

**PitchDeckForm.tsx** -- Clear all 20+ fields containing AIWMC-specific data:
- Replace `company_name: 'AIWMC AI Agency'` with empty string
- Replace `presenter_name: 'Bogdan Jeltov'` with empty string
- Clear `problem_headline`, `problem_description`, `solution_headline`, `solution_description` (contain "Neural OS" branding)
- Clear `market_size_tam/sam/som` ($150B/$25B/$500M are AIWMC projections)
- Clear `revenue_model`, `traction_metrics`, `key_customers`, `team_members`, `advisors`
- Clear `current_revenue`, `year1_projection`, `year3_projection`, `funding_amount`
- Clear `use_of_funds`, `milestones` (contain AIWMC-specific growth targets)
- All fields become empty strings or zero, matching the approach already done for BusinessPlanForm

**QuarterlySummaryForm.tsx** -- Clear 3 proprietary fields:
- Replace `company_name` default from `'AIWMC AI Agency LLC'` to `''`
- Replace `prepared_by` default from `'Bogdan Jeltov, CEO'` to `''`
- Clear pre-filled financial data ($2.4M revenue, 342 customers, etc.) -- these are AIWMC-specific metrics

**NDAForm.tsx** -- Clear 5 proprietary fields:
- Replace `party_a_name` from `'AIWMC AI Agency LLC'` to `''`
- Replace `party_a_address` from `'1234 Innovation Drive, Suite 100'` to `''`
- Replace `party_a_city` from `'Denver, Colorado 80202'` to `''`
- Replace `party_a_rep` from `'Bogdan Jeltov, Chief Executive Officer'` to `''`
- Replace `party_a_email` from `'legal@aiwmc.com'` to `''`

### 1.2 Remove Remaining Emojis

**DocsStudio.tsx** -- Remove emojis from TEMPLATE_CATEGORIES (line 152-158):
- Change `{ id: 'all', name: 'All Templates', icon: '📄' }` to use Lucide `FileText` icon
- Change `{ id: 'financial', name: 'Financial', icon: '💵' }` to use Lucide `DollarSign` icon
- Change `{ id: 'legal', name: 'Legal', icon: '⚖️' }` to use Lucide `Scale` icon
- Change `{ id: 'planning', name: 'Planning', icon: '📊' }` to use Lucide `BarChart3` icon
- Change `{ id: 'fundraising', name: 'Fundraising', icon: '💰' }` to use Lucide `TrendingUp` icon
- Refactor TEMPLATE_CATEGORIES to use `React.ReactNode` for the `icon` field

**DocsStudio.tsx** -- Remove emojis from locked feature highlights (lines 343-369):
- Replace `📄 Professional Templates` with plain text
- Replace `⚡ Instant Generation` with plain text
- Replace `🔗 Analysis Integration` with plain text
- Replace `📥 Export Anywhere` with plain text

### 1.3 Remove Fake Usage Counts

The template cards show fabricated usage numbers (`usageCount: 1247`, `usageCount: 892`, etc.). These are misleading. Replace with either real database counts or remove the display entirely until real data exists.

---

## Phase 2: Launch Blocker Resolution (Day 2)
**Goal: Remove beta gate and fix critical pipeline issues**

### 2.1 Remove Beta Whitelist

In `DocsStudio.tsx`, remove or disable the beta whitelist gate:
- Remove `ALLOWED_BETA_EMAILS` constant and `isAllowedBetaUser` check
- Keep the Plus subscription check (`!isPlus`) as the sole access gate
- Update the locked state UI to only show the Plus upgrade prompt
- This unblocks all Plus subscribers from accessing Docs Studio

### 2.2 Add "Generate Documents" CTA in Analysis Results

In `AnalysisResults.tsx`, add a prominent CTA button after analysis completion:
- Add a card/banner section: "Turn This Analysis Into Documents"
- Button navigates to `/docs?analysis={analysisId}`
- Only show for Plus subscribers (or as teaser for free users with upgrade prompt)
- This is the "killer feature" from the launch plan -- the analysis-to-docs pipeline

### 2.3 Fix Preview Performance (PitchDeckForm)

`PitchDeckForm.tsx` uses `form.watch()` on line 126 which triggers full component re-renders on every keystroke. Apply the same optimization pattern already implemented in other forms:
- Use `form.watch((values) => {...})` subscription pattern with `useRef`
- Debounce preview HTML generation by 300ms (matching InvoiceForm pattern)

### 2.4 Add Draft Persistence to Missing Forms

`PitchDeckForm.tsx` and `PartnershipForm.tsx` do not yet integrate the `useDocFormDraft` hook. Add the hook + `DocDraftBanner` component to both, matching the pattern used in the other 7 forms.

---

## Phase 3: Export Pipeline (Day 3-4)
**Goal: Deliver real PDF export for generated documents**

### 3.1 HTML-to-PDF Export via Edge Function

The current `export-document` edge function only returns markdown content (line 121: `content = JSON.stringify(docJson, null, 2)` for PDF/DOCX). This must be replaced:

- Modify the `export-document` edge function to convert the document's HTML preview into a properly formatted PDF
- Use the existing `@react-pdf/renderer` already installed in the project for client-side generation, or generate server-side HTML and convert
- Approach: Since the document forms already generate clean HTML previews, capture the sanitized HTML and convert it to a downloadable PDF
- Store the generated PDF in the `analysis-documents` storage bucket
- Return a signed download URL with 1-hour expiry
- Update `useDocumentExport` to handle the download flow properly

### 3.2 Markdown Export Fix

The current markdown export is minimal. Improve the Tiptap JSON-to-Markdown conversion to handle:
- Tables (from Tiptap table extension)
- Lists (ordered and unordered)
- Headings at all levels
- Bold, italic, and other inline formatting

---

## Phase 4: UI/UX Polish (Day 4-5)
**Goal: Production-quality interface across all views**

### 4.1 Free Tier Teaser View

For free users visiting `/docs`, show a preview of all templates with:
- Template cards visible but locked with a subtle overlay
- One or two templates available for free (Invoice + NDA, 1 doc/month limit)
- Clear upgrade CTA: "Unlock all 10 templates + unlimited documents with Plus"
- This converts the locked page from a dead-end into a conversion funnel

### 4.2 Loading and Empty States

- Add a skeleton loader to the template gallery (already exists for doc list)
- Add a progress indicator during document generation (currently only shows a spinner)
- Improve the empty state for "My Documents" tab with a more compelling first-use CTA
- Add success confetti or animation on first document creation (using existing `canvas-confetti` library)

### 4.3 Document List Enhancements

- Add template type badge to each document card (currently only shows status)
- Add search/filter functionality to the documents list
- Add a "Duplicate" action to the three-dot menu (alongside Edit and Delete)

### 4.4 Mobile Responsiveness

The CSS currently hides the preview container on mobile (`@media max-width: 768px`). Instead:
- Show a toggle button to switch between form and preview on mobile
- Ensure the form inputs are properly sized for touch interaction
- Test all 10 template forms on mobile viewport (390x844)

### 4.5 Dark Theme Consistency

- Verify the live preview HTML renders correctly in dark mode (currently uses hardcoded white backgrounds in all template previews)
- Consider adding a "light preview / dark preview" toggle or always rendering previews on a white background with clear boundary

---

## Phase 5: Analysis-to-Docs Pipeline Enhancement (Day 5-6)
**Goal: Make the auto-fill integration seamless and comprehensive**

### 5.1 Deeper Auto-Fill Mapping

The current `handleAutoFill` callback in most forms only maps 3-5 fields. Expand to map all available analysis data:

| Template | Current Mapped Fields | Should Also Map |
|----------|----------------------|-----------------|
| BusinessPlanForm | company_name, revenue, investment | executive_summary, market_analysis text, competition, TAM/SAM/SOM |
| PitchDeckForm | company_name, revenue | TAM/SAM/SOM, CAC/LTV, industry, location, growth projections |
| FinancialForecastForm | company_name, MRR | startup investment, growth rates, expense breakdown |
| MarketAnalysisForm | company_name, TAM/SAM | industry trends, competition data, growth rate |
| OnePagePlanForm | company_name, revenue | vision from analysis idea, key metrics |

### 5.2 Auto-Fill Data Quality Indicators

Add visual indicators showing which fields were auto-filled vs manually entered:
- Subtle blue left-border on auto-filled fields
- "Auto-filled from analysis" label that fades after 3 seconds
- "X fields populated" summary after auto-fill action

---

## Phase 6: Scalability and Performance (Day 6-7)
**Goal: Ensure the system handles growth efficiently**

### 6.1 Code Splitting for Docs Studio

The DocsStudio page imports all 10 form components eagerly. Implement lazy loading:
- Use `React.lazy()` for each form component
- Only load the selected template's form
- Add the `docs` chunk to the Vite manual chunks configuration

### 6.2 Template Caching

The `useTemplates` hook already has a 5-minute stale time. Extend this:
- Increase stale time to 30 minutes for template definitions (templates change rarely)
- Cache individual template data in the same query cache

### 6.3 Document Auto-Save Optimization

The editor auto-save uses a 2-second debounce. Optimize:
- Increase debounce to 3 seconds to reduce database writes
- Implement optimistic updates for title changes
- Add a "Save now" button alongside the auto-save indicator

### 6.4 Export Queue Reliability

The export job queue (`export_jobs` table) exists but the edge function does not properly handle failures. Add:
- Retry logic with exponential backoff (max 3 attempts)
- Status polling from the client side for long-running exports
- Timeout handling (30-second max per export)

---

## Phase 7: Analytics and Tracking (Day 7-8)
**Goal: Measure document creation, export, and conversion funnel**

### 7.1 Event Tracking

Add analytics events for:
- `docs_studio_opened` -- Track who opens Docs Studio
- `template_selected` -- Which templates are most popular
- `auto_fill_used` -- How many users leverage the analysis pipeline
- `ai_suggestion_used` -- AI feature adoption rate
- `document_created` -- Successful generation count
- `document_exported` -- Export format preferences (PDF vs DOCX vs MD)
- `free_to_plus_conversion` -- Track upgrades triggered from Docs Studio

### 7.2 Real Usage Counts

Replace the fabricated `usageCount` values on template cards with real database queries:
- Query `documents` table grouped by `template_id` for actual creation counts
- Or query the `doc_templates.usage_count` column (already incremented by `increment_template_usage` RPC)

---

## Phase 8: Post-Launch Growth Features (Week 3-4)
**Goal: Build value and differentiation**

### 8.1 Document Versioning UI

The `document_versions` table exists in the schema but has no UI. Build:
- Version history sidebar in the editor
- "Restore version" functionality
- Visual diff between versions (text comparison)

### 8.2 Document Sharing

The document schema supports sharing (`is_shared`, `share_token`, `share_expires_at`). Build:
- "Share" button in the editor toolbar
- Generate a public view-only link (similar to the existing `SharedReport` page)
- Expiry options (24h, 7d, 30d, never)

### 8.3 Custom Branding

The `BrandingSettings` component exists in `src/components/pro/`. Connect it to document generation:
- Apply user's custom logo to document headers
- Apply custom color scheme to document templates
- "Powered by AIWMC Quantis" footer (with option to remove for Plus users)

### 8.4 DOCX Export

Add Word document export capability:
- Use a library like `docx` or server-side conversion
- Maintain formatting, tables, and styling from the template
- This addresses the Week 3 item from the launch plan

---

## Technical Debt Items

| Item | File | Impact |
|------|------|--------|
| `PartnershipForm` uses `watch()` without subscription pattern | PartnershipForm.tsx | Re-render performance |
| `FounderAgreementForm` uses `watch()` without subscription pattern | FounderAgreementForm.tsx | Re-render performance |
| `QuarterlySummaryForm` has large prefilled content in defaults | QuarterlySummaryForm.tsx | Data privacy |
| Export function has no error recovery | export-document/index.ts | Reliability |
| No rate limiting on document creation | useCreateDocument | Abuse prevention |
| Template gallery uses inline icon strings instead of components | DocsStudio.tsx | Consistency |

---

## Implementation Priority Matrix

```text
            IMPACT
      HIGH  |  P1.1  P2.1  P3.1  |  P5.1  P8.1
            |  P1.2  P2.2  P3.2  |  P6.1  P8.2
            |  P1.3  P2.3       |  P7.1
      ------+-------------------+-----------
      LOW   |  P4.3  P4.5       |  P8.3  P8.4
            |  P6.2  P6.3       |  P7.2
            |                   |
            +---EFFORT LOW------+--EFFORT HIGH-
```

**Immediate (Before Launch):** Phases 1, 2, 3
**Launch Week:** Phases 4, 5
**Post-Launch:** Phases 6, 7, 8

---

## Files to Modify (Complete List)

| File | Changes |
|------|---------|
| `src/components/docs/forms/PitchDeckForm.tsx` | Clear AIWMC defaults, add draft persistence, fix watch() performance |
| `src/components/docs/forms/QuarterlySummaryForm.tsx` | Clear AIWMC defaults |
| `src/components/docs/forms/NDAForm.tsx` | Clear AIWMC defaults |
| `src/components/docs/forms/PartnershipForm.tsx` | Add draft persistence, fix watch() performance |
| `src/pages/DocsStudio.tsx` | Remove emojis from categories, remove beta whitelist, remove fake usage counts, add lazy loading |
| `src/components/analysis/AnalysisResults.tsx` | Add "Generate Documents" CTA |
| `supabase/functions/export-document/index.ts` | Implement real PDF export |
| `src/hooks/useDocumentExport.ts` | Handle new export flow |
| `src/components/docs/DocumentsList.tsx` | Add search, duplicate, template badge |
| `src/styles/docs-studio.css` | Mobile preview toggle, dark mode fixes |
