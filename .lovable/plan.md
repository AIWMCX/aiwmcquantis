

# Docs Studio: Complete Professional Polish

## Current State (What a Customer Sees Today)

After testing every element end-to-end, here is the exact customer experience and every issue that needs fixing:

### What Works Well
- Template gallery renders cleanly with 10 cards (3 free, 7 Plus)
- Live preview updates in real-time with 300ms debounce (no flicker)
- Invoice form has proper Zod validation, reactive totals, and line item management
- Auto-fill from Analysis works (pulls from most recent business analysis)
- Draft auto-save to localStorage works (800ms debounce, restore/dismiss banner)
- Download: PDF opens print dialog, HTML downloads as Blob
- XSS protection via DOMPurify + escapeFormValues on every preview render
- My Documents tab shows saved docs with search, status filter, duplicate, delete
- Document editor (TipTap) loads HTML snapshots correctly from saved documents

### Issues Found (Ranked by Customer Impact)

| # | Issue | Severity | What Customer Sees |
|---|-------|----------|-------------------|
| 1 | **"Generate Invoice" submit button does nothing useful** | High | Button triggers `handleGenerate` which just shows a toast "Use the Download button..." -- confusing dead-end |
| 2 | **No mobile preview at all** | High | CSS `@media (max-width: 768px) { .doc-preview-container { display: none } }` hides preview, but the actual preview container uses different classes (`Card` component), so mobile users see the preview column but it takes full width below the form with no toggle |
| 3 | **Hide Preview button visible but broken on mobile** | Medium | The button shows/hides the preview column, but on mobile the layout becomes a single column -- toggling it makes the form full-width but there's no way to see preview without scrolling |
| 4 | **Download button only appears inside preview card** | Medium | If user hides preview, the download button disappears entirely -- no way to download |
| 5 | **No invoice number customization** | Medium | Hardcoded as "INV-000001" -- customers need editable invoice numbers |
| 6 | **No date customization** | Medium | Invoice date and due date are auto-calculated but not editable |
| 7 | **ExportPanel shows "DOCX coming soon"** | Low | Clicking DOCX in the editor export shows a toast saying "coming soon" -- unprofessional |
| 8 | **Document title in "My Documents" uses auto-generated names** | Low | Title is "Professional Invoice" + nothing user-specific -- hard to distinguish multiple invoices |
| 9 | **No currency selection** | Low | All documents are USD-only ($) -- no EUR/GBP support |
| 10 | **Template cards missing "popular" badge display** | Low | `popular: true` is set in data but never rendered in the UI |
| 11 | **No document count/stats on My Documents tab** | Low | Tab shows "Plus" badge but no count of saved documents |
| 12 | **Editor has duplicate back buttons** | Low | DocsStudio renders a "Back to My Documents" button, then DocumentEditor renders its own ArrowLeft back button -- two overlapping back navigation elements |

---

## Implementation Plan

### Fix 1: Remove Confusing "Generate" Submit Button
The form submit button at the bottom of every template form says "Generate Invoice" / "Generate Plan" etc, but `handleGenerate` just shows a toast. This is a dead-end that confuses customers.

**Change:** Remove the submit button from all 10 form components, or repurpose it as a "Save and Download PDF" primary action that combines form validation + download in one click. This makes the call-to-action clear.

**Files:** All 10 form components in `src/components/docs/forms/`

### Fix 2: Make Download Always Accessible
Currently the download button is buried inside the preview card. If preview is hidden, there's no download.

**Change:** Add a sticky bottom bar (like `PreviewDownloadBar`) that is always visible regardless of preview visibility. On mobile, this becomes the primary download surface.

**File:** `src/pages/DocsStudio.tsx` (generate step section)

### Fix 3: Mobile Preview as Modal/Sheet
On mobile, customers cannot see a proper preview. The 2-column layout collapses.

**Change:** On screens below `lg` breakpoint, replace the side-by-side layout with:
- Form visible by default
- "Preview" button opens a full-screen sheet/drawer (`vaul` Drawer already installed) showing the rendered document
- Download actions available inside the drawer

**Files:** `src/pages/DocsStudio.tsx`, potentially a new `MobilePreviewDrawer` component

### Fix 4: Add Editable Invoice Number and Date Fields
Professional invoices need custom invoice numbers and dates.

**Change:** Add `invoice_number` (string, default "INV-000001"), `invoice_date` (date, default today), and `due_date` (date, default +30 days) fields to `InvoiceFormSchema` and the form UI. Wire them into the preview HTML template.

**File:** `src/components/docs/forms/InvoiceForm.tsx`

### Fix 5: Fix Duplicate Back Buttons in Editor
When editing a saved document, DocsStudio renders its own back button above the DocumentEditor, which also has its own back button.

**Change:** Remove the outer back button from DocsStudio when in `edit` step. The DocumentEditor already handles its own navigation via `onBack`.

**File:** `src/pages/DocsStudio.tsx` (lines 348-368)

### Fix 6: Add Custom Document Title Input
Currently documents are auto-named (e.g., "Professional Invoice"). Customers need to name their own documents for the "My Documents" list.

**Change:** Add a title input field at the top of the generate step that defaults to the template name + date but is editable. Pass this to `saveAndDownload` instead of the hardcoded template name.

**File:** `src/pages/DocsStudio.tsx`

### Fix 7: Remove DOCX Option from ExportPanel
Showing a "coming soon" toast is unprofessional. Remove the DOCX option until it's actually implemented.

**Change:** Filter out `docx` from the export menu in `ExportPanel`, or hide it behind a feature flag.

**File:** `src/components/docs/ExportPanel.tsx`

### Fix 8: Add Document Count Badge to My Documents Tab
Show users how many documents they have at a glance.

**Change:** Query the document count and display it in the tab trigger as a small number badge.

**File:** `src/pages/DocsStudio.tsx`

---

## Technical Details

### Files Modified (in order of implementation)

| File | Changes |
|------|---------|
| `src/pages/DocsStudio.tsx` | Remove duplicate back button in edit mode; add sticky download bar outside preview card; add editable document title; add document count badge; add mobile preview drawer |
| `src/components/docs/forms/InvoiceForm.tsx` | Add invoice_number, invoice_date, due_date fields; repurpose submit button as "Save and Download PDF" action |
| `src/components/docs/ExportPanel.tsx` | Remove DOCX option from menu |
| `src/styles/docs-studio.css` | Remove the broken `.doc-preview-container { display: none }` mobile rule (it targets the wrong selector anyway) |

### Forms NOT Modified (working correctly)
The other 9 form templates follow the same pattern as InvoiceForm. Only the Invoice needs the number/date fix since it's the most-used template. The submit button change needs to propagate to all 10 forms.

### No Database or Schema Changes Required
All fixes are frontend-only. The existing DB tables, RLS policies, and edge functions remain unchanged.

### No New Dependencies Required
All changes use existing libraries: `vaul` (Drawer), `react-hook-form`, `zod`, `date-fns`.

