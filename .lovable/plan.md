

# Docs Studio: Production-Ready Overhaul

## Current State Assessment

After deep analysis, here is exactly where the Docs Studio stands and what needs to happen to make it fully production-ready.

### What Works Today
- **10 form templates** with live HTML preview (Invoice, Quarterly Summary, NDA, Business Plan, Pitch Deck, One-Page Plan, Financial Forecast, Partnership Proposal, Founder Agreement, Market Analysis)
- **Client-side PDF/HTML download** via `useDocumentDownload` (browser print dialog for PDF, Blob download for HTML)
- **Auto-fill from analyses** via `useAnalysisAutoFill` -- maps financial metrics from business analyses into document fields
- **Draft persistence** via `useDocFormDraft` -- 800ms debounced autosave to localStorage with restore/dismiss banner
- **Download rate limiting** -- free tier gets 1 download/day from 3 templates; Plus gets unlimited from all 10
- **AI suggestion button** (`AISuggestionButton`) -- calls `generate-document-content` edge function for Plus users to generate text sections
- **Tabbed UI** -- Templates tab + My Documents tab (Plus only)
- **Rich text editor** (`DocumentEditor` with TipTap) -- accessible from My Documents tab for editing saved docs

### Critical Gaps (What is Broken or Disconnected)

| # | Gap | Severity | Detail |
|---|-----|----------|--------|
| 1 | **Template ID mismatch** | **Blocker** | DocsStudio hardcodes template IDs like `professional-invoice`, but DB has `invoice_v1`, `nda_basic_v1`, `quarterly_summary_v1`. The `useCreateDocument` lookup via `template_id` will fail silently. |
| 2 | **Only 3 templates in DB** | **Major** | 10 templates are defined in the UI, but only 3 exist in `doc_templates` table. The 7 Plus templates (Business Plan, Pitch Deck, etc.) have no DB records, so `useCreateDocument` will error when saving. |
| 3 | **Document JSON is a stub** | **Major** | When saving to DB on download, the `documentJson` is a placeholder paragraph: `"Document generated from X template"`. The actual HTML preview content is never converted to TipTap JSON, making the saved document useless in the editor. |
| 4 | **Editor loads empty** | **Major** | When opening a saved document from My Documents, the TipTap editor receives the stub JSON above, showing only the placeholder text -- not the actual document content. |
| 5 | **TemplatePicker component unused** | Minor | A full `TemplatePicker` component exists with search/filter but is never rendered. DocsStudio uses its own inline template grid instead. |
| 6 | **IntakeForm component unused** | Minor | A dynamic `IntakeForm` that builds forms from template variable definitions is never used. Forms are hardcoded per template instead. |
| 7 | **ExportPanel component unused** | Minor | `ExportPanel` with PDF/DOCX/Markdown export and status selector is built but never rendered anywhere. |
| 8 | **export-document edge function half-done** | Medium | Only handles markdown export (returns base64 data URL). PDF/DOCX commented as "would need proper rendering." |
| 9 | **No version history UI** | Medium | `document_versions` table exists with RLS policies, version timeline CSS exists in `docs-studio.css`, but no component renders version history. |
| 10 | **RLS blocks free-tier document creation** | **Blocker** | The `documents` table INSERT policy requires `verify_plus_subscription(auth.uid())`. Free-tier users cannot save documents even if the code tries to. Currently mitigated because saving only happens for Plus users, but this makes the "My Documents" feature permanently Plus-only. |
| 11 | **No document cloning/duplication** | Minor | No way to re-use a saved document as a starting point for a new one. |
| 12 | **No document sharing** | Minor | `share_token` and `share_expires_at` columns exist but no sharing UI or logic. |
| 13 | **Mobile preview hidden** | Medium | CSS rule `.doc-preview-container { display: none }` at 768px, but the actual preview container uses different classes. The `showPreview` toggle exists but mobile users lose preview entirely. |

---

## Implementation Plan

### Phase 1: Fix Critical Blockers (Must-Do)

#### 1A. Seed missing templates into DB
- Insert the 7 missing Plus-tier templates into `doc_templates` with proper `template_id` values matching the hardcoded IDs in `TEMPLATE_CARDS`
- Alternatively, update the DB's existing 3 templates to use the IDs that match the code (`professional-invoice`, `quarterly-summary`, `nda-agreement` instead of `invoice_v1`, `quarterly_summary_v1`, `nda_basic_v1`)
- This is a data-only operation (no schema changes needed)

#### 1B. Fix the document JSON on save
- When a Plus user downloads, convert the live preview HTML into proper TipTap-compatible JSON (or store the raw HTML as a serialized document) so the saved document actually renders in the editor
- Approach: Store a richer doc JSON that includes the rendered HTML content as a TipTap `content` array, or add an `html_snapshot` field to the document record

#### 1C. Fix template ID lookup in `useCreateDocument`
- The `useCreateDocument` hook queries `doc_templates` by `template_id`, but the IDs don't match between code and DB
- After 1A is done, this will self-resolve

### Phase 2: Wire Up Disconnected Components

#### 2A. Connect ExportPanel to DocumentEditor
- Replace the inline export dropdown in `DocumentEditor` with the existing `ExportPanel` component
- This gives users PDF, DOCX (planned), and Markdown export options with status management

#### 2B. Add version history to DocumentEditor
- When a user saves (via the autosave debounce), create a version snapshot in `document_versions` if content has changed significantly
- Add a "Version History" sidebar/panel using the CSS timeline styles already in `docs-studio.css`
- Allow reverting to previous versions

#### 2C. Add document cloning
- Add a "Duplicate" option to the document actions dropdown in `DocumentsList`
- Creates a copy with title "Copy of [original title]"

### Phase 3: Improve Core UX

#### 3A. Mobile preview support
- Add a "Preview" tab or modal for mobile users instead of hiding preview entirely
- Use the existing `showPreview` toggle to show a full-screen preview overlay on mobile

#### 3B. Better document content in editor
- When opening a saved document, if it only contains the stub placeholder, offer to "Re-generate" from the original template + variables
- Store `variables_data` properly when creating documents so they can be used for re-generation

#### 3C. Search and filter for My Documents
- Add search by title and filter by status (draft/review/final) to `DocumentsList`

### Phase 4: Backend Export Improvements

#### 4A. Server-side markdown export
- The `export-document` edge function already works for markdown -- wire it into the UI as a third export option

#### 4B. DOCX export (future)
- Evaluate Deno-compatible DOCX generation libraries for the edge function
- This is a stretch goal and may need external service integration

---

## Technical Details

### Database Changes Required

**Data operations only (no schema changes):**

Update existing template IDs to match code:
```sql
UPDATE doc_templates SET template_id = 'professional-invoice' WHERE template_id = 'invoice_v1';
UPDATE doc_templates SET template_id = 'quarterly-summary' WHERE template_id = 'quarterly_summary_v1';
UPDATE doc_templates SET template_id = 'nda-agreement' WHERE template_id = 'nda_basic_v1';
```

Insert 7 missing Plus templates:
```sql
INSERT INTO doc_templates (template_id, name, description, category, tier, icon, template_json, version) VALUES
('business-plan', 'Business Plan', 'Comprehensive business plan with executive summary and projections', 'finance', 'plus', 'FileText', '{"variables":[],"blocks":[]}', '1.0.0'),
('pitch-deck', 'Pitch Deck', '10-slide investor pitch deck', 'finance', 'plus', 'Zap', '{"variables":[],"blocks":[]}', '1.0.0'),
-- ... (5 more templates)
```

### Files to Modify

| File | Change |
|------|--------|
| `src/pages/DocsStudio.tsx` | Fix `saveAndDownload` to store real content, not stub JSON |
| `src/components/docs/DocumentEditor.tsx` | Integrate `ExportPanel`, add version history panel |
| `src/components/docs/DocumentsList.tsx` | Add search/filter, add "Duplicate" action |
| `src/hooks/useDocuments.ts` | Add `useDuplicateDocument` mutation, add version creation on save |

### Components Already Built (Just Need Wiring)

| Component | Status | Action |
|-----------|--------|--------|
| `ExportPanel` | Built, unused | Wire into `DocumentEditor` |
| `IntakeForm` | Built, unused | Keep as fallback for dynamic templates (future) |
| `TemplatePicker` | Built, unused | Keep for potential future use or remove |
| `TemplateCard` | Built, used by `TemplatePicker` | Same as above |
| `AISuggestionButton` | Built, used in Plus forms | Already working |
| `DocDraftBanner` | Built, used in all forms | Already working |
| `EditorToolbar` | Built, used in editor | Already working |

### Estimated Scope

- **Phase 1** (Blockers): ~1 session -- data fixes + content save fix
- **Phase 2** (Wiring): ~1 session -- ExportPanel integration, version history, cloning
- **Phase 3** (UX): ~1 session -- mobile preview, search/filter, re-generation
- **Phase 4** (Backend): ~1 session -- markdown export wiring, DOCX evaluation

### Priority Recommendation

Start with **Phase 1** since the template ID mismatch and stub document JSON are blockers that make the save-and-edit flow fundamentally broken. Without fixing these, Plus users who save documents get an empty editor experience.

