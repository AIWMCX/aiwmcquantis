

# Document Generation Feature Enhancement Plan
## AIWMC Quantis™ Docs Studio v2.0

---

## Executive Summary

The Docs Studio MVP is functional with 3 templates (Invoice, NDA, Quarterly Summary) but lacks the **premium polish, AI integration, and Quantis data connectivity** that would make it a true conversion driver. This plan transforms it into a **"Neural OS-powered Document Suite"** that:

- Auto-fills from user's Quantis business analyses
- Generates AI-assisted content sections
- Expands from 3 to 10+ templates
- Adds AIWMC branding and visual polish
- Implements version history and collaboration

| Enhancement Area | Current State | Target State | Impact |
|-----------------|---------------|--------------|--------|
| Templates | 3 basic | 10+ with categories | +200% feature value |
| AI Integration | None | Claude-powered suggestions | +35% completion rate |
| Quantis Data | Manual entry | Auto-fill from analyses | -60% form time |
| Export | MVP markdown | PDF, DOCX, PPTX | Professional output |
| Branding | Generic | AIWMC Quantis themed | Brand consistency |

---

## Current Implementation Analysis

### Existing Architecture (Strengths)

The Docs Studio has solid foundations:

| Component | Status | Quality |
|-----------|--------|---------|
| Type System | `src/types/document.ts` | Complete with versioning, exports, templates |
| Template Forms | `InvoiceForm.tsx`, `NDAForm.tsx`, `QuarterlySummaryForm.tsx` | Well-structured with Zod validation |
| Editor | Tiptap-based `DocumentEditor.tsx` | Tables, formatting, autosave |
| Export Pipeline | `export-document` edge function | MVP (markdown only) |
| Database Schema | `documents`, `doc_templates`, `document_versions`, `document_exports` | Comprehensive |
| Security | Plus-only, RLS-protected | Production-ready |

### Identified Gaps

1. **No Quantis Integration**: Forms don't pull from user's business analyses
2. **No AI Assistance**: Missing Claude-powered content generation
3. **Limited Templates**: Only 3 templates, missing key business documents
4. **Basic Export**: Only markdown export working, PDF/DOCX needed
5. **Generic Branding**: No AIWMC visual identity in generated documents
6. **No Version History UI**: Table exists but no frontend for browsing versions
7. **No Collaboration**: No comments or sharing within Docs Studio

---

## Phase 1: Quantis Integration (High Impact, Week 1)

### 1.1 Auto-Fill from Business Analysis

**Problem:** Users manually re-enter data that already exists in their Quantis analyses.

**Solution:** Add "Auto-fill from Analysis" button that pulls data from the most recent analysis.

**Files to Create:**
| Path | Purpose |
|------|---------|
| `src/hooks/useAnalysisAutoFill.ts` | Fetch and map analysis data to template fields |
| `src/components/docs/AutoFillButton.tsx` | UI button with analysis selector |

**Files to Modify:**
| Path | Changes |
|------|---------|
| `src/components/docs/forms/InvoiceForm.tsx` | Add auto-fill integration |
| `src/components/docs/forms/QuarterlySummaryForm.tsx` | Map analysis metrics to fields |
| `src/components/docs/forms/NDAForm.tsx` | Pull company info from profile |

**Data Mapping:**
```text
Quantis Analysis Fields → Document Template Fields
─────────────────────────────────────────────────────
business_name           → company_name
location                → company_city
scenarios.base.revenue  → quarterly_revenue
payback_period_months   → financial_highlights
startup_investment      → budget_figures
cac, ltv, roi          → key_metrics section
```

### 1.2 Analysis Selector Modal

**Purpose:** Let users choose which analysis to auto-fill from (they may have multiple).

**Component Structure:**
```text
┌──────────────────────────────────────────────────┐
│  Select Analysis to Auto-Fill                    │
├──────────────────────────────────────────────────┤
│  ┌────────────────────────────────────────────┐  │
│  │ ⚡ AI SaaS Business (Most Recent)          │  │
│  │    Created: Jan 28, 2026                   │  │
│  │    Revenue: $45,000/mo | ROI: 168%         │  │
│  └────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────┐  │
│  │ 📊 E-commerce Platform                     │  │
│  │    Created: Jan 15, 2026                   │  │
│  │    Revenue: $28,000/mo | ROI: 142%         │  │
│  └────────────────────────────────────────────┘  │
├──────────────────────────────────────────────────┤
│  [Cancel]                    [Auto-Fill Fields]  │
└──────────────────────────────────────────────────┘
```

---

## Phase 2: AI-Powered Content Generation (Week 1-2)

### 2.1 Claude Integration for Document Sections

**Problem:** Users struggle with writing executive summaries, market analysis, and other narrative sections.

**Solution:** Add AI content generation buttons for text-heavy sections.

**New Edge Function:**
| Path | Purpose |
|------|---------|
| `supabase/functions/generate-document-content/index.ts` | Claude API for section generation |

**AI-Enabled Sections:**
- Executive Summary (Business Plan)
- Market Analysis
- Risk Assessment
- Value Proposition
- Customer Testimonial Draft

**Prompt Engineering:**
```text
Section: Executive Summary
Context: {business_name}, {industry}, {target_market}
Metrics: Revenue ${revenue}/mo, ROI {roi}%, Payback {months} months
Tone: Professional, confident, data-driven
Length: 200-300 words

Generate a compelling executive summary that:
1. Opens with the business opportunity
2. Highlights key financial metrics
3. Closes with growth potential
```

### 2.2 AI Suggestions UI Component

**Files to Create:**
| Path | Purpose |
|------|---------|
| `src/components/docs/AISuggestionPanel.tsx` | Sidebar with generated suggestions |
| `src/components/docs/AISuggestionButton.tsx` | Inline "Generate with AI" button |

**UI Pattern:**
```text
┌─────────────────────────────────────────────────────────────┐
│ Executive Summary                           [✨ Generate AI] │
├─────────────────────────────────────────────────────────────┤
│ [Your current text here...]                                 │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│ 💡 AI Suggestions (3 alternatives)                          │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ "AIWMC AI Agency represents a significant opportunity   │ │
│ │  in the rapidly growing AI consulting market..."        │ │
│ │                                    [Use This] [Refine]  │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

---

## Phase 3: Template Library Expansion (Week 2)

### 3.1 New Template Forms

**Priority Templates to Add:**
| Template | Category | Quantis Integration | Effort |
|----------|----------|---------------------|--------|
| Business Plan | Planning | High (scenarios, metrics) | 1 day |
| Pitch Deck | Fundraising | High (TAM/SAM/SOM, financials) | 1 day |
| One-Page Plan | Planning | Medium | 0.5 day |
| Financial Forecast | Finance | Very High (auto-calculated) | 1 day |
| Partnership Proposal | Legal | Medium | 0.5 day |
| Founder Agreement | Legal | Low | 0.5 day |
| Market Analysis | Research | High (industry benchmarks) | 1 day |

**Files to Create:**
| Path | Purpose |
|------|---------|
| `src/components/docs/forms/BusinessPlanForm.tsx` | 5-section business plan |
| `src/components/docs/forms/PitchDeckForm.tsx` | 10-slide investor deck |
| `src/components/docs/forms/OnePagePlanForm.tsx` | Single-page summary |
| `src/components/docs/forms/FinancialForecastForm.tsx` | 3-scenario projections |
| `src/components/docs/forms/PartnershipForm.tsx` | Partnership proposal |
| `src/components/docs/forms/FounderAgreementForm.tsx` | Co-founder equity/IP |
| `src/components/docs/forms/MarketAnalysisForm.tsx` | Market research report |

### 3.2 Template Gallery Redesign

**Current:** Simple 3-card grid
**Target:** Category-based gallery with preview, popularity stats, and AI badges

**Files to Modify:**
| Path | Changes |
|------|---------|
| `src/pages/DocsStudio.tsx` | Replace `TEMPLATE_CARDS` with category tabs |
| `src/components/docs/TemplatePicker.tsx` | Add filtering, preview modal |
| `src/components/docs/TemplateCard.tsx` | Add usage count, AI badge, Quantis badge |

**Template Categories:**
```typescript
const TEMPLATE_CATEGORIES = [
  { id: 'business_planning', name: 'Business Planning', icon: '📊' },
  { id: 'fundraising', name: 'Fundraising', icon: '💰' },
  { id: 'legal', name: 'Legal & Compliance', icon: '⚖️' },
  { id: 'financial', name: 'Financial', icon: '💵' },
  { id: 'marketing', name: 'Marketing', icon: '📣' },
  { id: 'product', name: 'Product', icon: '🚀' },
];
```

---

## Phase 4: AIWMC Branding & Visual Polish (Week 2)

### 4.1 Document Header/Footer Branding

**Problem:** Generated documents look generic.

**Solution:** Add AIWMC Quantis branding to all document outputs.

**Branding Elements:**
- Header: AIWMC Quantis logo (for Plus with branding enabled)
- Footer: "Generated with AIWMC Quantis™ | aiwmcquantis.com"
- Color Scheme: Primary blue (#3B82F6), dark (#0F172A)
- Typography: Inter for UI, Georgia for legal documents

**Files to Modify:**
| Path | Changes |
|------|---------|
| `src/components/docs/forms/InvoiceForm.tsx` | Add branded header/footer to preview |
| `src/components/docs/forms/NDAForm.tsx` | Legal document styling |
| `src/components/docs/forms/QuarterlySummaryForm.tsx` | Report styling |

### 4.2 CSS Theme Updates

**Files to Create:**
| Path | Purpose |
|------|---------|
| `src/styles/docs-studio.css` | Docs Studio specific styles |

**Key Styles:**
```css
.doc-preview-container {
  border-left: 4px solid var(--quantis-primary);
  box-shadow: 0 8px 24px rgba(59, 130, 246, 0.15);
}

.doc-section-card {
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  border-left: 4px solid #3B82F6;
}

.ai-badge {
  background: linear-gradient(135deg, #3B82F6 0%, #10B981 100%);
  color: white;
  padding: 4px 12px;
  border-radius: 12px;
}
```

### 4.3 Template Preview Modal

**Purpose:** Let users preview full document before starting.

**Files to Create:**
| Path | Purpose |
|------|---------|
| `src/components/docs/TemplatePreviewModal.tsx` | Full-page sample preview |

---

## Phase 5: Export System Enhancement (Week 3)

### 5.1 Professional PDF Generation

**Current:** MVP markdown export only.
**Target:** Bank-ready PDF with proper formatting.

**Implementation Options:**
1. **Puppeteer/Chromium** (Server-side HTML-to-PDF)
2. **React-PDF** (Client-side rendering)
3. **External API** (DocRaptor, PDFShift)

**Recommended:** Use React-PDF (already installed) with custom components.

**Files to Create:**
| Path | Purpose |
|------|---------|
| `src/components/docs/pdf/PDFInvoice.tsx` | React-PDF invoice template |
| `src/components/docs/pdf/PDFBusinessPlan.tsx` | React-PDF business plan |
| `src/components/docs/pdf/PDFCommon.tsx` | Shared PDF components (header, footer) |

**Files to Modify:**
| Path | Changes |
|------|---------|
| `supabase/functions/export-document/index.ts` | Render React-PDF on server |
| `src/hooks/useDocumentExport.ts` | Handle multiple formats |

### 5.2 DOCX Export

**Implementation:** Use docx library (NPM) in edge function.

**Files to Modify:**
| Path | Changes |
|------|---------|
| `supabase/functions/export-document/index.ts` | Add DOCX generation |

---

## Phase 6: Version History & Collaboration (Week 3)

### 6.1 Version History UI

**Database:** `document_versions` table exists but no UI.

**Files to Create:**
| Path | Purpose |
|------|---------|
| `src/components/docs/VersionHistoryPanel.tsx` | Timeline of changes |
| `src/components/docs/VersionCompareModal.tsx` | Side-by-side diff |

**Features:**
- View all previous versions
- Restore any version
- Compare two versions
- See who made changes

### 6.2 Comments System (Plus Feature)

**Files to Create:**
| Path | Purpose |
|------|---------|
| `src/components/docs/CommentsPanel.tsx` | Threaded comments sidebar |
| `src/hooks/useDocumentComments.ts` | CRUD for comments |

**Database Migration:**
```sql
CREATE TABLE document_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  section_id VARCHAR(100),
  comment_text TEXT NOT NULL,
  is_ai_generated BOOLEAN DEFAULT FALSE,
  resolved BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Implementation Timeline

| Week | Phase | Deliverables | Files Created |
|------|-------|--------------|---------------|
| 1 | Quantis Integration | Auto-fill from analyses, analysis selector | 3 |
| 1-2 | AI Content | Claude integration, suggestion UI | 4 |
| 2 | Templates | 7 new template forms | 7 |
| 2 | Branding | AIWMC styling, preview modal | 3 |
| 3 | Export | PDF/DOCX generation | 4 |
| 3 | Versioning | History UI, comments | 4 |

---

## Files Summary

### New Files (25)
| Path | Purpose |
|------|---------|
| `src/hooks/useAnalysisAutoFill.ts` | Fetch analysis data for templates |
| `src/hooks/useDocumentComments.ts` | Comments CRUD |
| `src/components/docs/AutoFillButton.tsx` | Analysis selector button |
| `src/components/docs/AnalysisSelectorModal.tsx` | Choose which analysis |
| `src/components/docs/AISuggestionPanel.tsx` | AI suggestions sidebar |
| `src/components/docs/AISuggestionButton.tsx` | Inline AI button |
| `src/components/docs/TemplatePreviewModal.tsx` | Full preview before use |
| `src/components/docs/VersionHistoryPanel.tsx` | Version timeline |
| `src/components/docs/VersionCompareModal.tsx` | Diff viewer |
| `src/components/docs/CommentsPanel.tsx` | Document comments |
| `src/components/docs/forms/BusinessPlanForm.tsx` | Business plan template |
| `src/components/docs/forms/PitchDeckForm.tsx` | Investor deck |
| `src/components/docs/forms/OnePagePlanForm.tsx` | One-pager |
| `src/components/docs/forms/FinancialForecastForm.tsx` | 3-scenario forecast |
| `src/components/docs/forms/PartnershipForm.tsx` | Partnership proposal |
| `src/components/docs/forms/FounderAgreementForm.tsx` | Co-founder agreement |
| `src/components/docs/forms/MarketAnalysisForm.tsx` | Market research |
| `src/components/docs/pdf/PDFInvoice.tsx` | React-PDF invoice |
| `src/components/docs/pdf/PDFBusinessPlan.tsx` | React-PDF business plan |
| `src/components/docs/pdf/PDFCommon.tsx` | Shared PDF components |
| `src/styles/docs-studio.css` | Docs Studio styles |
| `supabase/functions/generate-document-content/index.ts` | AI content edge function |
| `supabase/migrations/[timestamp]_document_comments.sql` | Comments table |
| `supabase/migrations/[timestamp]_doc_templates_expanded.sql` | New templates |

### Modified Files (8)
| Path | Changes |
|------|---------|
| `src/pages/DocsStudio.tsx` | Category tabs, auto-fill, new templates |
| `src/components/docs/forms/InvoiceForm.tsx` | Auto-fill, branding |
| `src/components/docs/forms/QuarterlySummaryForm.tsx` | Auto-fill, branding |
| `src/components/docs/forms/NDAForm.tsx` | Auto-fill, branding |
| `src/components/docs/TemplatePicker.tsx` | Categories, filtering |
| `src/components/docs/TemplateCard.tsx` | AI badges, stats |
| `supabase/functions/export-document/index.ts` | PDF/DOCX generation |
| `supabase/config.toml` | New edge function |

---

## Success Metrics

| Metric | Current | Target | Measurement |
|--------|---------|--------|-------------|
| Documents created/user/month | ~0.5 | 3+ | Database query |
| Template completion rate | ~60% | 85% | Analytics event |
| Time to complete document | ~20 min | 8 min | Start → generate time |
| AI suggestion acceptance | N/A | 40% | Track "Use This" clicks |
| Auto-fill usage rate | N/A | 70% | Track auto-fill button |
| Export success rate | ~80% | 98% | Export job status |
| Docs feature → Upgrade | ~5% | 15% | Attribution tracking |

---

## Technical Considerations

### Performance
- Lazy load template forms (only load active template)
- Cache analysis data for auto-fill (stale-while-revalidate)
- Debounce AI requests (prevent spam)

### Security
- All AI requests through edge function (no client-side API keys)
- Plus subscription verified server-side before AI/export
- RLS on all document tables (already implemented)

### Accessibility
- Keyboard navigation for template gallery
- ARIA labels on AI suggestion buttons
- Focus management in modals

### Mobile
- Responsive template forms
- Touch-friendly preview toggle
- Export works on mobile (download)

---

## Quick Wins (Implement First)

These can be done immediately for visible impact:

1. **Add "Powered by AIWMC Quantis™" footer** to all document previews
2. **Add usage count badges** to template cards
3. **Pre-fill company info** from user profile (already have full_name)
4. **Add category tabs** to template picker
5. **Style improvements** - border-left accent, AIWMC blue highlights

