

# Design Audit v2 + SEO Package v3 — Implementation Plan

## What's Already Done (No Work Needed)

**From Design Audit v2 — Phases 1 & 2 already shipped:**
- WCAG contrast fixes (hero subtitle, sidebar headers, placeholder text, "UNCERTAIN" red, "Save 17%" green, tab inactive text, "Back to Home" link)
- Emoji → Lucide SVG replacement in industry selector
- CTA standardization ("Start Free Analysis →" / "See Example Report →")
- Step indicator colors (blue numbered circles)
- Global `:focus-visible` outlines
- Sticky "Run Stress-Test" panel
- Card height inconsistencies (grid items-stretch)
- Design token aliases (--bg-primary, --bg-surface, --border-default, --shadow-glow)
- Button standardization (48px, 15px font, 200ms transition)
- Input standardization (48px height, 16px padding)
- Badge 6-variant system
- Sidebar section headers (12px, all-caps, letter-spacing)
- `prefers-reduced-motion` support

**From SEO Package v3 — Already in place:**
- Homepage meta tags in `index.html` (title, description, canonical, OG, Twitter)
- JSON-LD structured data (Organization, SoftwareApplication, WebSite, FAQPage, BreadcrumbList) via `StructuredData.tsx`
- `robots.txt` with proper allow/disallow rules
- `sitemap.xml` with all pages and blog posts
- PageSEO component used on ~15 pages
- `<noscript>` SEO fallback in `index.html`

---

## New Work — Design Audit v2 (Phases 3-6)

### Phase 3: Component Polish

**3.1 Industry Selector Redesign**
- **File:** `CompactAnalysisForm.tsx`
- Replace flat button grid with card-style radio buttons: subtle border, SVG icon centered, selected state with blue border + blue bg tint, hover with raised bg
- Consistent card sizing for short vs long labels

**3.2 Skeleton Loading States**
- **Files:** New `src/components/analysis/AnalysisResultsSkeleton.tsx`, update `AccuracyTransparentResults.tsx`
- Add skeleton screens for: analysis results (3 KPI cards + chart + text blocks), template list, document preview
- Pulse animation: opacity 0.4–0.8, 1.5s, --bg-surface-raised color

**3.3 Hover & Active Interactions**
- **Files:** `index.css`, `button.tsx`, various card components
- Buttons: hover translateY(-1px) + lighten 10%, active translateY(0) + darken 5%
- Cards: hover translateY(-2px) + shadow increase (200ms ease-out)
- Tab switch: underline slides to active tab (200ms)

**3.4 Toast Notification Consistency**
- **File:** `src/components/ui/sonner.tsx` or toast config
- Verify 4 variants match audit spec: Success (green left border), Warning (orange), Error (red), Info (blue)
- Position top-right, 380px max-width, 5s auto-dismiss

### Phase 4: Responsive & Mobile

**4.1 Mobile Analysis Form Layout**
- **File:** `CompactAnalysisForm.tsx`
- < 768px: stack main + right panel vertically, "Run Stress-Test" becomes fixed bottom bar
- < 640px: single column, financial inputs stack to one per row

**4.2 Template Cards Responsive**
- **Files:** `TemplatePicker.tsx`, `AnalysisTemplatesGrid.tsx`
- 3-col → 2-col at 768px → 1-col at 480px

**4.3 Touch Targets**
- **File:** `index.css`
- Ensure all interactive elements have minimum 44x44px touch target

### Phase 5: Page-Specific Refinements

**5.1 Auth Page Split Layout**
- **File:** `Auth.tsx`
- Left side: brand visuals + key stats ("12-variable stress-test", "1,000+ benchmarks", "90 seconds")
- Right side: auth form (existing)
- Password requirements as persistent helper text below field (not placeholder)

**5.2 Unified Example/Risk Gallery Cards**
- **Files:** `ExamplesIndex.tsx`, `RiskGallery.tsx`
- Shared card component with: left border color by category, consistent badge/chip styling, score display with "Viability" label, risk level badge on risk gallery cards
- "Browse Scenarios" button: proper filter dropdown or scroll anchor

**5.3 Template Detail Polish**
- **Files:** Template form components
- Form/preview transition: soften white preview to off-white (#FAFAF8)
- Consistent section header icons (all --text-secondary, 20px)
- Required field asterisks: consistent red, after label, 4px spacing

**5.4 Pricing Page Whitespace Fix**
- **File:** `Pricing.tsx`
- Reduce gap between hero and comparison table
- Emphasize Quantis row in comparison table (blue bg tint)

**5.5 Brand Name Standardization**
- **Files:** Multiple components
- Full brand: "AIWMC Quantis" in headers, legal, meta
- Short form: "Quantis" in body copy
- Remove "AIWMC™ Quantis" (trademark only in legal docs)

### Phase 6: Advanced

**6.1 ARIA Roles for Custom Components**
- **Files:** `StressMap.tsx`, `CompactAnalysisForm.tsx`, gauge components
- Add `role="meter"` with `aria-valuenow/min/max` to gauges
- Add `aria-label` to all icon-only buttons
- Arrow-key navigation for industry selector and analysis depth radio groups

**6.2 Keyboard Shortcuts**
- **File:** New `src/hooks/useKeyboardShortcuts.ts`
- Cmd+K: search/command palette
- Navigation shortcuts for sidebar items

---

## New Work — SEO Package v3

### S1. Update Page-Level Meta Tags
Most pages already have PageSEO. Updates needed:

| Page | Current Title | New Title (from v3 package) |
|------|--------------|----------------------------|
| Homepage | Already correct | No change |
| Blog | "Startup Validation Blog — AIWMC Quantis Insights" | Already correct |
| Methodology | Needs check | "Quantis Methodology — Deterministic Financial Engine" |

- **File:** `Landing.tsx` — Add `<PageSEO>` component (currently missing, relies on `index.html` static tags which is fine for homepage)
- **Files:** Update descriptions on Blog, Methodology pages to match v3 package exact wording

### S2. Canonical Tags on All Pages
- **File:** `PageSEO.tsx` — Already handles canonical. Verify all pages pass `canonical` prop correctly.

### S3. Update SoftwareApplication Schema
- **File:** `StructuredData.tsx`
- Add missing fields from v3: `browserRequirements`, `screenshot` URL, `softwareVersion: "2.0"`, expanded `featureList` (12 items — already has 12, verify match), `availability` on offers
- Explicitly exclude `aggregateRating` (fabricated data)

### S4. Update FAQPage Schema
- **File:** Landing page FAQ section or `StructuredData.tsx`
- Add the 10 FAQ items from v3 package (currently has fewer)
- Verify FAQ content matches what's displayed on the page

### S5. Blog Post Article Schema
- **File:** `BlogArticle.tsx`
- Add Article JSON-LD schema per blog post using PageSEO's `jsonLd` prop
- Include: headline, description, datePublished, dateModified, author (Organization), keywords

---

## Files Summary

| Category | Files | Change Type |
|----------|-------|-------------|
| New | `AnalysisResultsSkeleton.tsx`, `useKeyboardShortcuts.ts` | Create |
| CSS | `index.css` | Update (hover/active specs, touch targets) |
| UI | `button.tsx`, `sonner.tsx` | Update (hover states, toast variants) |
| Analysis | `CompactAnalysisForm.tsx`, `AccuracyTransparentResults.tsx`, `StressMap.tsx` | Update |
| Pages | `Auth.tsx`, `Pricing.tsx`, `RiskGallery.tsx`, `Landing.tsx`, `BlogArticle.tsx` | Update |
| Examples | `ExamplesIndex.tsx` | Update |
| SEO | `StructuredData.tsx`, `PageSEO.tsx`, `Methodology.tsx` | Update |
| Templates | `TemplatePicker.tsx`, template form components | Update |

## Implementation Order
1. **Phase 3** (Component polish — skeleton, hover, industry cards)
2. **Phase 4** (Mobile responsive)
3. **SEO S1-S5** (Meta tags, schema updates)
4. **Phase 5** (Auth split, card unification, pricing fix, brand cleanup)
5. **Phase 6** (ARIA, keyboard shortcuts)

