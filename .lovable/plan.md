

# Strategic Upgrade: SEO Fix, Homepage Rewrite & Results UI Enhancement

## Constraint: No Next.js Migration

Lovable runs on Vite + React — SSR/Next.js migration is not possible in this environment. However, you already have a solid `<noscript>` fallback in `index.html` and per-page `PageSEO` components. The SEO fix must work within the SPA constraint.

---

## Phase 1: SEO Prerendering (Highest Impact)

**Problem:** Googlebot sees empty HTML for all 22+ pages because content is client-rendered.

**Solution:** Deploy a prerendering edge function that serves pre-rendered HTML to crawlers while keeping the SPA experience for real users.

**Files to create/modify:**
- `supabase/functions/prerender/index.ts` — Edge function that detects bot User-Agents (Googlebot, Bingbot, facebookexternalhit, Twitterbot, LinkedInBot), fetches the page via a headless renderer (Prerender.io API or similar), caches the HTML in a `prerender_cache` table, and returns it
- New DB table: `prerender_cache` (url TEXT PK, html TEXT, cached_at TIMESTAMPTZ, ttl_hours INT DEFAULT 24)
- `index.html` — Expand the existing `<noscript>` block with all 50+ example pages, blog posts, and key landing pages (this is the immediate free fix)
- `public/sitemap.xml` — Regenerate with all current URLs (examples, blog, risk-gallery, methodology, etc.)

**Alternative (simpler, no edge function):** Use `vite-plugin-prerender` at build time to generate static HTML for all public routes. This creates `/dist/examples/coffee-shop-denver/index.html` etc. that Googlebot can read directly.

**Recommended approach:** `vite-plugin-prerender` — zero runtime cost, works with Lovable's build system, generates indexable HTML for every route.

---

## Phase 2: Homepage Copy Rewrite (Pain-First, Fear-Driven)

**Problem:** Homepage opens with the solution before the visitor admits the problem. No price anchor against $25K consultants.

**Changes to `src/components/landing/MobileHero.tsx`:**

1. **H1 rewrite** — From "Before you invest your savings — know if the numbers actually work" to:
   ```
   90% of businesses fail in 5 years.
   Most had a plan. None had validation.
   ```

2. **Subtitle rewrite** — Add the $25K anchor:
   ```
   A financial consultant charges $1,500–$25,000 to stress-test your model.
   Quantis does it in 90 seconds. Your first analysis is free.
   ```

3. **CTA button text** — Change from "Run my 90-second pre-mortem" to "Stress-test my idea — free"

4. **Trust strip update** — Add "$25,000 consultant-grade analysis" as a trust element

5. **Update `HeroVariants.tsx`** A/B test variants to include the new pain-first copy as the control

**Changes to `index.html`:**
- Update the `<title>`, `og:title`, `twitter:title` to include fear-driven messaging
- Update `meta[name="description"]` with the $25K anchor

---

## Phase 3: Results Page "Oh-Shit" UI Enhancements

### 3a. Break-Even Visual Chart
**File:** New component `src/components/analysis/BreakEvenChart.tsx`
- Line chart: X = months (1–36), Y = cumulative profit/loss
- Line crosses $0 at break-even month with a pulsing dot + label
- Three scenario lines: optimistic (green), realistic (blue), pessimistic (red)
- Shaded red area below $0, green above
- Caption: "Month {X}: This is when you stop losing money"

### 3b. LTV:CAC Traffic Light
**File:** New component `src/components/analysis/LtvCacIndicator.tsx`
- Large circular gauge with red/yellow/green zones
- Red zone: below 3:1 ("Losing money on every customer")
- Yellow zone: 3:1–5:1 ("Viable but fragile")
- Green zone: above 5:1 ("Scale-ready")
- Show the actual ratio number large in center
- One-line interpretation beneath

### 3c. Contextual Risk Flags
**File:** Modify `src/components/analysis/ResultsAccordionSections.tsx`
- Each risk flag gets severity badge (CRITICAL / WARNING / NOTE)
- Add "What this means" expansion with specific dollar impact
- Example: "Labor costs in {city} are {X}% above national average — reduces your margin from {Y}% to {Z}%"
- Pull location-specific data from existing benchmark calibrator

### 3d. Consultant Cost Comparison Banner
**File:** New component `src/components/analysis/ConsultantComparison.tsx`
- Shown at top of results: "This analysis would cost $1,500–$25,000 from a financial consultant. You got it in {X} seconds."
- Subtle, non-intrusive — gray text with a small clock icon

### 3e. Integration into Results Page
**File:** Modify `src/components/analysis/AnalysisResults.tsx`
- Insert `BreakEvenChart` after the financial summary
- Insert `LtvCacIndicator` in the unit economics section
- Insert `ConsultantComparison` at the very top of results
- Reorder sections: Verdict → Consultant Comparison → Break-Even Chart → Key Metrics → Risk Flags → Full Report

---

## Phase 4: Quick Wins

1. **`index.html` noscript expansion** — Add all 50+ example pages to the noscript block immediately (free SEO value for crawlers that don't execute JS)
2. **`public/sitemap.xml`** — Regenerate with all current routes
3. **`index.html` meta author** — Change from "AIWMC AI Agency LLC" to "AIWMC™ LLC" for brand consistency

---

## Implementation Order

| Step | What | Impact | Effort |
|------|-------|--------|--------|
| 1 | Expand noscript + sitemap | SEO baseline for all pages | 30 min |
| 2 | Homepage copy rewrite | Conversion on existing traffic | 1 hr |
| 3 | Break-even chart component | Results page aha moment | 1.5 hr |
| 4 | LTV:CAC traffic light | Unit economics aha moment | 1 hr |
| 5 | Consultant comparison banner | Price anchoring | 30 min |
| 6 | Contextual risk flags | Specificity creates trust | 1.5 hr |
| 7 | vite-plugin-prerender setup | Full SEO unlock | 2 hr |

