# AIWMC Quantis — Technical Growth & Improvement Spec

> **Core positioning:** "AIWMC Quantis = AI that tells founders the truth about their business model, before the market does."

> **Date:** 2026-02-25 | **Author:** Growth Engineering

---

## 1. Architecture & Information Design

### Objective
Evolve from a single landing page with blog appendages into a lean, SEO-purposeful information architecture where every URL has a discovery job and a conversion job.

### Current State
| URL | Exists | SEO Purpose |
|-----|--------|-------------|
| `/` | ✅ | Brand landing, primary conversion |
| `/blog` + 5 articles | ✅ | Long-tail educational traffic |
| `/examples` + 15 pages | ✅ | Long-tail "[business] + [city] analysis" |
| `/leaderboard` | ✅ | Engagement/retention |
| `/docs` | ✅ | Protected — no SEO value |
| `/how-it-works` | ❌ | Missing — critical explainer page |
| `/use-cases` | ❌ | Missing — persona-driven landing |
| `/pricing` | ❌ standalone | Exists only as section on `/` |

### Proposed Site Map

```
/                          → Primary conversion landing
/how-it-works              → Explainer for "how does AI business validation work" queries
/use-cases                 → 3 persona tabs: Founders | Consultants | Operators
/examples                  → Hub for 15+ pre-built analysis pages (exists)
/examples/:slug            → Individual analysis pages (exists)
/blog                      → Content hub (exists, expand to 10+ articles)
/blog/:slug                → Individual articles (exists)
/pricing                   → Standalone pricing page (extract from landing)
/auth                      → Login/signup (exists)
/app                       → Protected dashboard (exists)
/privacy, /terms           → Legal (exists)
```

### Page Definitions

#### `/how-it-works`
- **Job:** Capture "how does AI business validation work" queries. Reduce friction for skeptical visitors.
- **Primary CTA:** "Try It Free — 60 Seconds"
- **Secondary CTA:** "See a Sample Report" → `/examples/coffee-shop-denver`
- **H1:** "How AIWMC Quantis Validates Your Business Model"
- **H2s:**
  1. "Step 1: Describe Your Business Idea"
  2. "Step 2: AI Runs Financial Stress Tests"
  3. "Step 3: Get Your Risk Report & Action Plan"
  4. "What's Inside Your Report"
  5. "Frequently Asked Questions"

#### `/use-cases`
- **Job:** Segment traffic by persona. Capture "startup validation for [persona]" queries.
- **Primary CTA:** "Start Free Analysis"
- **Secondary CTA:** "See [Persona] Example"
- **H1:** "Who Uses AIWMC Quantis"
- **H2s:**
  1. "For Early-Stage Founders" — validate before building
  2. "For Business Consultants" — scale client analysis
  3. "For Operators & Franchisees" — stress-test expansion plans
  4. "What You Get"

#### `/pricing` (standalone)
- **Job:** Capture "[tool] pricing" queries. Direct comparison.
- **H1:** "Simple Pricing for Serious Founders"
- **H2s:**
  1. "Free vs Plus — What's Included"
  2. "Frequently Asked Questions"
  3. "Start Free, Upgrade When Ready"

---

## 2. SEO & Content Strategy

### Keyword Universe

#### "Pain" Queries (Problem-Aware)
| Keyword Cluster | Volume Signal | Target Page |
|----------------|--------------|-------------|
| "how to validate a startup idea" | High | Blog article |
| "is my business idea good" | Medium | Blog article |
| "startup failure reasons" | High | Blog article (exists) |
| "business model risk assessment" | Medium | `/how-it-works` |
| "why startups fail financially" | High | Blog article |

#### "Solution" Queries (Solution-Aware)
| Keyword Cluster | Volume Signal | Target Page |
|----------------|--------------|-------------|
| "AI startup validation tool" | Medium | `/` landing |
| "business idea analyzer" | Medium | `/` landing |
| "startup risk modeling tool" | Low-Med | `/how-it-works` |
| "AI business plan generator" | High | Blog article (exists) |
| "financial stress test startup" | Low | `/how-it-works` |

#### "Technical" Queries (Expert-Level)
| Keyword Cluster | Volume Signal | Target Page |
|----------------|--------------|-------------|
| "SaaS unit economics calculator" | Medium | Blog article (exists) |
| "scenario analysis for startups" | Low-Med | Blog article |
| "startup financial model template" | High | Blog + lead magnet |
| "CAC LTV ratio calculator" | Medium | Blog article (exists) |
| "business model stress testing" | Low | `/how-it-works` |

### New Article Outlines (Priority Order)

#### Article 1: "How to Stress-Test Your Startup Before Launch"
- **Title tag:** `How to Stress-Test Your Startup (2026) | AIWMC Quantis`
- **Meta:** `Run financial stress tests on your startup idea before spending money. Free AI-powered scenario analysis for founders.`
- **H1:** "How to Stress-Test Your Startup Before You Launch"
- **H2s:**
  1. "Why Most Founders Skip Stress Testing (And Pay For It)" — stats on failure rates, survivorship bias
  2. "The 3 Scenarios Every Business Model Needs" — conservative/realistic/optimistic framework
  3. "How to Run a Financial Stress Test in 60 Seconds" — walkthrough using Quantis
  4. "Real Example: Coffee Shop Under Pressure" — link to `/examples/coffee-shop-denver`
  5. "What to Do When Your Model Breaks" — action steps, pivot signals
- **Internal links:** `/examples/*`, `/how-it-works`, `/app`

#### Article 2: "Startup Validation Checklist: 7 Questions Before You Build"
- **Title tag:** `Startup Validation Checklist (7 Steps) | AIWMC Quantis`
- **Meta:** `Validate your startup idea with this 7-step checklist. Financial logic, market signals, and risk flags before you invest.`
- **H1:** "Startup Validation Checklist: 7 Questions to Answer Before You Build"
- **H2s:**
  1. "Is There a Real Problem?" — problem validation
  2. "Can You Make Money?" — unit economics check
  3. "What Kills This Business?" — risk identification
  4. "How Long Until Profitability?" — payback period analysis
  5. "What Does the Data Say?" — using AI to validate assumptions
  6. "When to Proceed vs When to Pivot"
  7. "Run Your Validation Now" — CTA
- **Internal links:** `/app`, `/blog/unit-economics-explained-for-founders`

#### Article 3: "AI vs Spreadsheets for Startup Financial Planning"
- **Title tag:** `AI vs Spreadsheets for Startup Planning | AIWMC Quantis`
- **Meta:** `Should you use AI or spreadsheets for startup financial planning? Honest comparison of speed, accuracy, and cost.`
- **H1:** "AI vs Spreadsheets: Which Is Better for Startup Financial Planning?"
- **H2s:**
  1. "The Spreadsheet Problem" — complexity, errors, time
  2. "What AI Actually Does Differently" — benchmarks, scenarios, speed
  3. "When Spreadsheets Still Win" — honest: custom models, investor decks
  4. "Side-by-Side Comparison" — table format
  5. "Try It: Same Idea, Both Ways" — interactive CTA

### Content Tone Guidelines
- **Do:** Use data, be specific, acknowledge limitations, speak to operators not dreamers
- **Don't:** Hype AI, promise certainty, use startup clichés ("disrupt", "game-changer")
- **Voice example:** "Your projections are estimates, not prophecy. But estimates built on 95,500 industry benchmarks beat gut feelings."

---

## 3. On-Page UX & Conversion Improvements

### Hero Section Restructure

**Current H1:** "Get CFO-Level Business Insights in 60 Seconds"
**Problem:** Generic. Doesn't communicate risk/validation. Sounds like a dashboard, not a stress-testing engine.

**Proposed H1 Variants (A/B test):**

| Variant | H1 | Angle |
|---------|-----|-------|
| A (Risk) | "Stress-Test Your Business Model Before the Market Does" | Fear of failure |
| B (Truth) | "AI Business Validation: Know Your Numbers Before You Build" | Clarity/truth |
| C (Speed) | "Financial Risk Analysis in 60 Seconds — Free" | Speed + free |

**Proposed Subheading:**
> "Enter your business idea and location. Get revenue projections, risk flags, and an action plan — powered by 95,500 industry benchmarks."

### 3 Bullet Benefits (Below Hero)

```
✓ Revenue & profit projections — 3 scenarios (conservative, realistic, optimistic)
✓ Risk flags identified — fragile assumptions exposed before you invest
✓ Action plan included — what to cut, where to double down, whether to proceed
```

### "How It Works" Section (3 Steps)

```
Step 1: Describe your idea
   → "Coffee shop with remote work focus in Denver"

Step 2: AI stress-tests your model
   → Revenue projections, cost analysis, risk flags from 95,500 benchmarks

Step 3: Get your report
   → Financial summary, risk assessment, and a clear action plan — in 60 seconds
```

### FAQ Improvements

Current FAQ is payment-focused. Add validation/trust questions:

| Question | Answer Summary |
|----------|---------------|
| "How is this different from ChatGPT?" | Quantis uses structured financial models with real industry benchmarks, not generative text. Every number is calculated, not hallucinated. |
| "What data do you use?" | 95,500 industry benchmarks, 50+ city cost indices, real CAC/LTV/churn data. No synthetic data. |
| "Can I trust the projections?" | Projections are estimates, not guarantees. We provide 3 scenarios and confidence scores so you can calibrate. |
| "Is my idea kept private?" | Yes. We encrypt all data (AES-256-GCM). We never share or sell your ideas. |
| "Do I need a business plan first?" | No. Just your idea and location. The AI builds the financial model from benchmarks. |
| "What if my industry isn't supported?" | We cover 50+ industries. If yours is niche, the AI maps it to the closest benchmark and flags the confidence level. |

### Sample Report Section

**Placement:** Between Hero form and How It Works
**Content:** Interactive preview showing a real analysis output (use coffee shop example data)
**Structure:**
- Revenue breakdown chart
- Risk flags (3 items)
- Action plan (3 bullets)
- "This is what you get. For free." CTA

### Social Proof (Early-Stage Appropriate)

Avoid fake testimonials. Use:
- "Built by founders, for founders" badge
- "95,500 industry benchmarks indexed" counter (if true)
- "Powered by real industry benchmarks from 50+ sectors"
- Security badges (AES-256, GDPR, SOC-2 compliant design)

---

## 4. Technical & Performance Enhancements

### Core Web Vitals Checklist

- [x] Lazy-loaded below-fold sections (already implemented via `useLazySection`)
- [x] Deferred GA4 loading via `requestIdleCallback`
- [x] Preconnect to critical origins (fonts, Supabase)
- [ ] **Add `width` and `height` to all `<img>` tags** — prevents CLS
- [ ] **Compress hero background SVG pattern** — currently inline, large
- [ ] **Add `loading="lazy"` to all below-fold images**
- [ ] **Reduce Radix UI bundle** — import only used components

### URL & Canonical Structure

```
/                           → canonical: https://aiwmcquantis.com
/how-it-works               → canonical: https://aiwmcquantis.com/how-it-works
/use-cases                  → canonical: https://aiwmcquantis.com/use-cases
/pricing                    → canonical: https://aiwmcquantis.com/pricing
/examples                   → canonical: https://aiwmcquantis.com/examples
/examples/:slug             → canonical: https://aiwmcquantis.com/examples/:slug
/blog                       → canonical: https://aiwmcquantis.com/blog
/blog/:slug                 → canonical: https://aiwmcquantis.com/blog/:slug
```

All handled by `PageSEO` component — ensure every new page includes it.

### Schema.org — WebApplication JSON-LD

Current `SoftwareApplication` schema exists but should be updated to align with risk/validation positioning:

```json
{
  "@context": "https://schema.org",
  "@type": "WebApplication",
  "name": "AIWMC Quantis",
  "url": "https://aiwmcquantis.com",
  "applicationCategory": "BusinessApplication",
  "applicationSubCategory": "Financial Analysis",
  "operatingSystem": "Web",
  "description": "AI-powered business validation and financial stress-testing platform. Enter your business idea, get revenue projections, risk flags, and an action plan in 60 seconds.",
  "creator": {
    "@type": "Organization",
    "name": "AIWMC AI Agency LLC",
    "url": "https://aiwmcquantis.com"
  },
  "offers": [
    {
      "@type": "Offer",
      "name": "Free",
      "price": "0",
      "priceCurrency": "USD",
      "description": "3 analyses per month with financial projections and risk assessment"
    },
    {
      "@type": "Offer",
      "name": "Plus",
      "price": "17",
      "priceCurrency": "USD",
      "priceValidUntil": "2026-12-31",
      "description": "Unlimited analyses, document intelligence, PDF export, custom branding"
    }
  ],
  "featureList": [
    "Financial Stress Testing",
    "Revenue Projections (3 Scenarios)",
    "Risk Flag Identification",
    "Action Plan Generation",
    "Industry Benchmark Comparison",
    "Location-Adjusted Cost Analysis"
  ]
}
```

### Open Graph / Twitter Meta Tags

Already implemented in `index.html` and `PageSEO`. Ensure every new page overrides:

```html
<meta property="og:title" content="[Page-specific title]" />
<meta property="og:description" content="[Page-specific description, ≤155 chars]" />
<meta property="og:url" content="https://aiwmcquantis.com/[path]" />
<meta property="og:image" content="https://aiwmcquantis.com/og-image.png" />
<meta property="og:type" content="website" />
<meta name="twitter:card" content="summary_large_image" />
```

### 404 / Redirect Handling

- Current: `NotFound` component renders for `*` route ✅
- **Add:** `PageSEO` with `noindex={true}` to 404 page
- **Add:** Redirect `/home` → `/` if users type it
- **Add:** Redirect `/start` → `/app` as a short URL for social CTAs

### Sitemap & Robots.txt

- `sitemap.xml` exists with 15 example pages + blog articles ✅
- `robots.txt` correctly blocks `/app`, `/admin`, `/api` ✅
- **Add:** New pages (`/how-it-works`, `/use-cases`, `/pricing`) to sitemap when created
- **Add:** `<lastmod>` dates to sitemap entries for freshness signals

---

## 5. Analytics, Events & Experimentation

### Funnel Definition

```
Stage 1: PAGE_VIEW (landing)
   └─ Stage 2: HERO_FORM_INTERACTION (typed in idea field)
       └─ Stage 3: HERO_FORM_SUBMIT (clicked "See My Numbers")
           └─ Stage 4: ANALYSIS_STARTED (model input completed on /app)
               └─ Stage 5: ANALYSIS_COMPLETED (results returned)
                   └─ Stage 6: SIGNUP (account created)
                       └─ Stage 7: CONVERSION (paid plan or consultation request)
```

### Event Schema

| Funnel Stage | Event Name | Properties |
|-------------|-----------|------------|
| Page View | `page_view` | `page_path`, `referrer`, `utm_source`, `utm_medium` |
| Hero Interaction | `hero_form_focus` | `field` ("idea" or "location") |
| Hero Submit | `hero_quick_submit` | `idea_length`, `location` ← already implemented ✅ |
| Analysis Start | `analysis_started` | `idea_category`, `location` ← exists ✅ |
| Analysis Complete | `analysis_completed` | `monthly_profit_range`, `payback_months`, `confidence_score` ← exists ✅ |
| Signup | `sign_up` | `method`, `source_page` ← exists ✅ |
| Checkout Start | `begin_checkout` | `plan`, `value` ← exists ✅ |
| Purchase | `purchase` | `plan`, `transaction_id`, `value` ← exists ✅ |

### Missing Events to Add

```typescript
// Track when user focuses on hero form fields (engagement signal)
trackEvent('hero_form_focus', { field: 'idea' | 'location' });

// Track scroll depth on landing page
trackEvent('scroll_depth', { percent: 25 | 50 | 75 | 100 });

// Track example page views (which niches get traffic)
trackEvent('example_viewed', { slug: string, source: 'direct' | 'blog' | 'examples_index' });

// Track blog article engagement
trackEvent('blog_article_read', { slug: string, read_percent: number });

// Track sample report interaction
trackEvent('sample_report_interacted', { section: string });
```

### A/B Tests to Run

#### Test 1: Hero H1 — Risk vs Speed
- **Variant A:** "Stress-Test Your Business Model Before the Market Does"
- **Variant B:** "Financial Risk Analysis in 60 Seconds — Free"
- **Metric:** `hero_quick_submit` rate
- **Sample size:** ~500 visitors per variant
- **Duration:** 2-3 weeks at current traffic
- **Ship when:** >95% confidence, >10% relative lift

#### Test 2: CTA Wording
- **Variant A:** "See My Numbers — Free" (current)
- **Variant B:** "Stress-Test My Idea — Free"
- **Variant C:** "Run Free Validation"
- **Metric:** Click-through rate from hero to `/app`
- **Implementation:** Use existing `abTesting.ts` module

#### Test 3: Social Proof Placement
- **Variant A:** Trust badges below hero (current)
- **Variant B:** Mini case study ("Coffee shop in Denver → $4,200/mo profit") directly under H1
- **Metric:** Scroll depth + `hero_quick_submit` rate

### Interpretation Rules
- Wait for statistical significance (p < 0.05)
- Minimum 200 conversions per variant before deciding
- If no clear winner after 4 weeks, ship the variant with higher engagement even if conversion is flat
- Document every test result in a shared sheet

---

## 6. Social → Site Growth System

### Content Archetypes

#### Archetype 1: "Pain Rant" — Anti-Theater Posts
**Structure:** Hook (provocative claim) → Insight (why it's true) → Example → CTA

**Example post:**
> "Your revenue projection is fantasy.
>
> I've seen 200+ startup models this month. 80% assume linear growth with no churn, no seasonality, and unlimited demand.
>
> That's not a plan. That's a wish.
>
> Real validation means stress-testing: What happens when revenue drops 30%? When CAC doubles? When your biggest channel dies?
>
> We built a tool that does this in 60 seconds. Free.
> → aiwmcquantis.com"

**Posting cadence:** 2x/week (LinkedIn, X)

#### Archetype 2: "Mini Case Study" — Stressed Models
**Structure:** Setup (business idea) → Analysis snapshot → Surprise finding → CTA

**Example post:**
> "We stress-tested a food truck in Austin, TX.
>
> The numbers looked great: $5,400/mo profit, 8-month payback.
>
> Then we ran the risk scenario: 20% revenue drop + 15% cost spike.
>
> Result: Still profitable at $2,100/mo. This model is resilient.
>
> Most businesses break under pressure. This one didn't.
>
> Want to see if yours survives? → aiwmcquantis.com/examples/food-truck-austin"

**Posting cadence:** 1x/week

#### Archetype 3: "Build in Public" — Product Updates
**Structure:** What we shipped → Why it matters → What's next → CTA

**Example post:**
> "This week we added 10 new business analysis examples to our free library.
>
> Fitness studio in LA. Barbershop in Houston. Coworking space in Portland.
>
> Each one includes: revenue projections, risk flags, and an action plan.
>
> Why? Because founders shouldn't have to guess.
>
> Browse all 15 → aiwmcquantis.com/examples"

**Posting cadence:** 1x/week

#### Archetype 4: "Educational Thread" — Risk Modeling 101
**Structure:** Numbered list → Each point = one concept → CTA at end

**Example thread:**
> "5 numbers every founder should know before launch:
>
> 1. CAC (Customer Acquisition Cost) — what it costs to get one customer
> 2. LTV (Lifetime Value) — what one customer is worth over time
> 3. Payback Period — how long until you break even
> 4. Gross Margin — what you keep after direct costs
> 5. Churn Rate — how fast you lose customers
>
> Don't know yours? We calculate all 5 in 60 seconds.
> → aiwmcquantis.com"

**Posting cadence:** 1x/week

### Profile & Pinned Post Strategy

- **LinkedIn headline:** "Building AIWMC Quantis — AI that stress-tests startup business models before the market does"
- **Pinned post:** Archetype 2 (mini case study) with highest engagement
- **Profile link:** `aiwmcquantis.com` (not `/app` — let the landing page convert)
- **X bio link:** `aiwmcquantis.com/examples` (drives traffic to indexable pages)

### Content Repurposing Pipeline

```
Blog Article → 3 Social Posts + 1 Thread
Example Page → 1 Mini Case Study Post
Product Update → 1 Build in Public Post
```

### Monthly Content Cycle

| Week | Social Focus | Link To | Expected Action |
|------|-------------|---------|-----------------|
| Week 1 | Pain Rant + Educational Thread | `/blog/[latest]` | Read article, click CTA |
| Week 2 | Mini Case Study | `/examples/[featured]` | View example, run own analysis |
| Week 3 | Build in Public + Pain Rant | `/` or `/how-it-works` | Sign up, run analysis |
| Week 4 | Educational Thread + Case Study | `/blog/[evergreen]` | Read, share, run analysis |

**Total:** 8-10 posts/month across LinkedIn + X
**Time investment:** ~3 hours/week (draft with AI, edit for voice, schedule)

---

## 7. Implementation Roadmap (Prioritized)

### Phase 1 — Foundation (1-2 weeks)
**Focus:** High-impact, low-effort changes that immediately improve clarity, conversion, and SEO hygiene.

| # | Task | Type | AI-Assistable |
|---|------|------|---------------|
| 1 | Update Hero H1 to risk/validation angle | Copy | ✅ Draft variants |
| 2 | Add "How is this different from ChatGPT?" to FAQ | Copy | ✅ Draft answer |
| 3 | Add 2 trust-building FAQ items (data privacy, accuracy) | Copy | ✅ |
| 4 | Add `hero_form_focus` event tracking | Dev | ✅ |
| 5 | Add `scroll_depth` tracking to landing page | Dev | ✅ |
| 6 | Add `noindex` to 404 page | Dev | ✅ |
| 7 | Add `width`/`height` to all `<img>` tags | Dev | ✅ |
| 8 | Update `SoftwareApplication` → `WebApplication` schema | Dev | ✅ |
| 9 | Write 2 social posts (Archetype 1 + 2) and publish | Marketing | ✅ Draft |
| 10 | Update LinkedIn/X profile links and bios | Marketing | ❌ Manual |

### Phase 2 — Growth Engine (4-6 weeks)
**Focus:** New pages, content, schema, analytics, first social → site system.

| # | Task | Type | AI-Assistable |
|---|------|------|---------------|
| 1 | Create `/how-it-works` page | Dev + Copy | ✅ |
| 2 | Create `/use-cases` page (3 personas) | Dev + Copy | ✅ |
| 3 | Extract `/pricing` as standalone page | Dev | ✅ |
| 4 | Write Article: "How to Stress-Test Your Startup" | Copy | ✅ Draft |
| 5 | Write Article: "Startup Validation Checklist" | Copy | ✅ Draft |
| 6 | Write Article: "AI vs Spreadsheets" | Copy | ✅ Draft |
| 7 | Add all new pages to `sitemap.xml` | Dev | ✅ |
| 8 | Add internal cross-links from blog ↔ examples ↔ new pages | Dev | ✅ |
| 9 | Set up A/B test: Hero H1 variant | Dev | ✅ |
| 10 | Establish weekly social posting cadence | Marketing | ✅ Draft |
| 11 | Add sample report preview section to landing page | Dev + Design | ✅ |
| 12 | Submit sitemap to Google Search Console | Marketing | ❌ Manual |

### Phase 3 — Optimization & Experiments (Ongoing)
**Focus:** A/B tests, content expansion, refining based on analytics.

| # | Task | Type | AI-Assistable |
|---|------|------|---------------|
| 1 | Run A/B test: Hero H1 (2-3 weeks) | Dev | ✅ |
| 2 | Run A/B test: CTA wording variants | Dev | ✅ |
| 3 | Analyze funnel drop-offs in GA4 | Analytics | ❌ Manual |
| 4 | Write 2 more blog articles per month | Copy | ✅ Draft |
| 5 | Add 5 more example analysis pages per month | Dev + Copy | ✅ |
| 6 | Create industry-specific landing pages (`/industries/:slug`) | Dev | ✅ |
| 7 | Test social proof placement variants | Dev | ✅ |
| 8 | Monitor Core Web Vitals monthly | Dev | ❌ Manual |
| 9 | Refine social content based on engagement data | Marketing | ✅ Draft |
| 10 | Explore YouTube Shorts / TikTok for video case studies | Marketing | ❌ Manual |

---

## Appendix: Quick-Reference Checklist

### Before Publishing Any New Page
- [ ] `PageSEO` component with title (≤60 chars), description (≤155 chars), canonical
- [ ] Single `<h1>` matching page intent
- [ ] Semantic HTML (`<main>`, `<section>`, `<article>`)
- [ ] JSON-LD schema (BreadcrumbList minimum)
- [ ] Internal links to/from at least 2 other pages
- [ ] OG + Twitter meta tags via PageSEO
- [ ] Added to `sitemap.xml`
- [ ] Mobile-responsive (test at 375px)
- [ ] CTA above fold
- [ ] `alt` text on all images

### Event Naming Convention
```
{domain}_{action}_{detail}
Examples:
  hero_form_focus
  analysis_started
  blog_article_read
  example_viewed
  pricing_cta_clicked
```

---

*This document is a living spec. Update as tests conclude and traffic patterns emerge.*
