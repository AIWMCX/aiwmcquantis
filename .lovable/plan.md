

# Document Generation UI Components

## Summary

Create 5 React components for the document generation workflow: a generator panel, template cards with generation states, an invoice creator with QMath, a realtime progress tracker, and a document library.

## Components

### 1. `src/components/docs/DocGeneratorPanel.tsx`
Panel below analysis results. Uses existing `useTemplates` hook + `useSubscription` for tier gating.
- Tab bar: All | Finance | Legal | Operations | Tech (reuse `TemplateCategory` type)
- Renders `DocTemplateCard` in responsive grid (3/2/1 cols)
- Tracks `generatingDocId` and `completedDocs` state
- Calls `requestDocGeneration()` from `docs-engine.ts`
- Opens `UpgradePrompt` dialog for locked Plus templates
- Shows `DocGenerationProgress` inline when generating

### 2. `src/components/docs/DocTemplateCard.tsx`
Replaces existing `TemplateCard.tsx` for generation context (separate component, not a replacement).
- Props: template, isGenerating, isComplete, fileUrl, onGenerate, isLocked
- 4 button states: Generate / Generating (spinner) / Download+Regenerate / Upgrade
- Locked cards get `opacity-60` + lock icon overlay
- Reuses `CATEGORY_ICONS` and `CATEGORY_COLORS` patterns from existing `TemplateCard`

### 3. `src/components/docs/InvoiceCreator.tsx`
Multi-step drawer using existing `Sheet` component (from vaul).
- 4 steps: Client Info → Services (editable line items) → Settings → Preview
- All monetary math via `QMath.multiply/add/subtract`
- Live running total recalculated on every input change
- Rate intelligence banner when `userRate < benchmark.p25`
- Calls `generateInvoice()` from `docs-engine.ts` on submit
- Uses `Input`, `Button`, `Badge` from existing UI primitives

### 4. `src/components/docs/DocGenerationProgress.tsx`
Inline progress indicator with CSS-animated bar.
- Estimated duration drives animation: `animation-duration: ${estimatedMs}ms`
- Subscribes to Supabase Realtime channel `doc_jobs:{jobId}` for async jobs
- Calls `onComplete(url)` or `onError(msg)` based on payload status
- Cleans up channel on unmount

### 5. `src/components/docs/DocumentLibrary.tsx`
Full document library view.
- Search + filter tabs (All | Starred | Invoices | Reports)
- Fetches from `documents` table via Supabase, paginated (20/page)
- Each row: title, category badge, date, size, download count, star toggle, download button
- Empty state with illustration text
- Uses `getUserDocumentLibrary()` from `docs-engine.ts`

## Technical details

- All components use Tailwind only, shadcn/ui primitives (Card, Button, Badge, Dialog, Sheet, Tabs, Input)
- `useSubscription().isPlus` determines tier gating
- QMath imported for InvoiceCreator monetary calculations
- Supabase Realtime for async job tracking in DocGenerationProgress
- Existing patterns: `useAuth` for userId, `useToast` for notifications

## Files

| File | Action |
|------|--------|
| `src/components/docs/DocGeneratorPanel.tsx` | New |
| `src/components/docs/DocTemplateCard.tsx` | New |
| `src/components/docs/InvoiceCreator.tsx` | New |
| `src/components/docs/DocGenerationProgress.tsx` | New |
| `src/components/docs/DocumentLibrary.tsx` | New |

