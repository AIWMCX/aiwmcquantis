

# Audit V2 — Remaining Critical Fixes

## Status of Previous Fixes

Already completed:
- Clarity installed (placeholder ID) ✅
- Most "1,000+" replaced with "95,500" ✅
- Legal entity standardized to "AIWMC™ LLC" ✅
- Noscript block expanded with 51 example links ✅
- JSON-LD schemas added ✅
- Navigation consistency improved ✅
- Sitemap regenerated ✅

## What Still Needs Fixing

### Fix 1: Last "1,000+" instance in HowItWorks.tsx
`src/pages/HowItWorks.tsx` line 131 still says "powered by 1,000+ industry benchmarks." Change to "95,500." (The BlogArticle.tsx "$200-$1,000+" is a CAC price range, not a benchmark count — leave it.)

### Fix 2: THE CRITICAL SEO FIX — Rich noscript content per route

This is the #1 finding in the audit and the single highest-ROI fix. The current noscript block has links to all pages, but since every route serves the same `index.html`, Google sees identical content on `/pricing`, `/how-it-works`, `/methodology`, and all 51 example pages.

The noscript block needs **real page content** — not just links. Since there's only one `index.html`, we use a JavaScript-free approach: write the actual text content from each key page directly into the noscript block, organized by route-specific `id` attributes. Google reads this as unique, rich content on every crawl.

Content to add inside the noscript block:

**For /pricing:**
- Free Plan: 3 analyses/month, full financial report, risk flags
- Plus Plan: $17/mo, unlimited analyses, PDF export, Document Studio, location comparison

**For /how-it-works:**
- Step 1: Enter your business idea and location
- Step 2: AI analyzes against 95,500 benchmarks
- Step 3: Get revenue projections, risk flags, break-even timeline

**For /methodology:**
- Data sources: SBA, IBISWorld, Census Bureau, proprietary datasets
- 95,500 benchmarks across 100+ industries and 50+ cities
- Monte Carlo simulation with P10/P50/P90 percentiles
- 7-layer AI validation system

**For each example page (top 10 highest-value):**
- Business type, city, projected monthly profit, key risk flags, break-even month
- 2-3 sentences of real analysis summary

This turns the noscript from a link directory into ~3,000 words of unique, keyword-rich content that Google can index immediately.

### Fix 3: Unique title tags via PageSEO verification

Verify that every inner page component uses `<PageSEO>` with a unique title. The audit found duplicate titles on inner pages. Check:
- `/how-it-works` — should be "How Quantis Works — 3 Steps to Financial Clarity"
- `/methodology` — should be "Quantis Methodology — 95,500 Benchmarks & Monte Carlo"
- Each `/examples/*` page — should be "[Business Type] in [City] — AI Analysis | Quantis"

---

## Implementation Order

| Step | What | Files | Effort |
|------|------|-------|--------|
| 1 | Fix last "1,000+" | `HowItWorks.tsx` | 1 min |
| 2 | Rich noscript content | `index.html` | 45 min |
| 3 | Verify unique titles | Multiple page components | 15 min |

## Technical Details

The noscript block expansion will add approximately 200 lines of static HTML content to `index.html`. This content mirrors what the React components render, written as plain semantic HTML (h2, h3, p, ul/li, table). It includes:
- Pricing tiers table
- How-it-works step-by-step
- Methodology data source documentation  
- Top 10 example pages with real financial summaries
- All blog article summaries with target keywords

No new components, no database changes, no architectural changes. Pure content injection for crawler visibility.

