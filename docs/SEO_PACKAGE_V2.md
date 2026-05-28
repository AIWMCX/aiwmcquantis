# AIWMC QUANTIS — DEFINITIVE SEO PACKAGE v2.0
**Product:** AIWMC™ Quantis — AI-powered financial pre-mortem and business validation SaaS
**Company:** AIWMC™ LLC
**Domain:** aiwmcquantis.com
**Pricing:** Free ($0/forever, 3 analyses/month) · Plus ($17/mo, unlimited)
**Benchmark database:** 95,500 verified industry benchmarks
**Version:** 2.0 — May 27, 2026 (supersedes v1.0 from March 18, 2026)

---

## CRITICAL PREREQUISITE: PRE-RENDERING

**This entire SEO package is useless without pre-rendering.**

Every page on aiwmcquantis.com currently returns identical homepage HTML to crawlers. Until a pre-rendering solution is deployed (vike, react-snap, or equivalent), Google sees every URL as a duplicate of the homepage and none of the meta tags, structured data, or content optimizations below will have any effect.

**Implementation options ranked for Lovable/Vite:**

1. **vike (vite-plugin-ssr)** — keeps Vite, adds build-time HTML generation for public routes. Recommended.
2. **react-snap** — post-build Puppeteer crawl that saves rendered HTML per route. Simpler.
3. **react-helmet-async + Vercel edge middleware** — dynamic head injection per route. Fallback option.

**Acceptance test (run after every deploy):**

```bash
curl -s https://aiwmcquantis.com/pricing | grep "<title>"
# MUST return: Quantis pricing — free plan & Plus at $17/mo
# MUST NOT return the homepage title

curl -s https://aiwmcquantis.com/examples/bakery-paris | grep "<title>"
# MUST return: Artisan bakery in Paris — AI financial analysis | Quantis
# MUST NOT return the homepage title
```

If this test fails, nothing below matters. Fix pre-rendering first.

---

## ENFORCED CONSTANTS

These values appear throughout this document and across the entire codebase. Any deviation is a bug.

| Constant | Canonical value | Wrong variants (find and destroy) |
|----------|----------------|-----------------------------------|
| Benchmark count | **95,500** | 1,000+, 1000+, 97,500, 95500 (unformatted) |
| Company legal name | **AIWMC™ LLC** | AIWMC AI Agency LLC, AIWMC LLC (without ™) |
| Primary speed claim | **90 seconds** | 60 seconds, under 60 seconds, 3 min, 3 minutes |
| Domain (canonical) | **aiwmcquantis.com** | www.aiwmcquantis.com (redirect www → non-www) |
| Price | **$17/mo** | $49/mo (unless launching new tiers) |

---

## 1. META TAGS — EVERY PAGE

All titles under 60 characters. All descriptions under 155 characters. Every page gets unique values.

### Core pages

**Homepage** `/`
- Title: `AIWMC Quantis — AI business idea validator`
- Description: `Stress-test your business idea in 90 seconds. AI-powered financial pre-mortem with 95,500 real benchmarks. Free to start.`

**How it works** `/how-it-works`
- Title: `How Quantis works — AI financial stress-testing`
- Description: `3 steps: describe your idea, AI stress-tests 12 financial variables against 95,500 benchmarks, get your risk report in 90 seconds.`

**Use cases** `/use-cases`
- Title: `Who uses Quantis — founders, consultants & builders`
- Description: `Quantis helps founders validate ideas, consultants stress-test client models, and indie builders de-risk new ventures before spending a dollar.`

**Examples index** `/examples`
- Title: `Business validation examples — 50+ real AI reports`
- Description: `Browse 50+ complete AI-generated financial reports by city and industry. Revenue projections, risk flags, break-even timeline, and action plans.`

**Pricing** `/pricing`
- Title: `Quantis pricing — free plan & Plus at $17/mo`
- Description: `Start free forever with 3 analyses/month. Upgrade to Plus at $17/mo for unlimited analyses, PDF export, location comparison, and custom branding.`

**Methodology** `/methodology`
- Title: `Quantis methodology — 95,500 benchmarks & Monte Carlo`
- Description: `How Quantis calculates: 95,500 industry benchmarks, 50+ city cost indices, 12 financial variables, 1,000 Monte Carlo simulations per analysis.`

**Blog index** `/blog`
- Title: `Startup validation blog — AIWMC Quantis insights`
- Description: `Practical guides on validating startup ideas, financial stress-testing, unit economics, and AI-powered business analysis for founders.`

**Risk gallery** `/risk-gallery`
- Title: `Startup risk gallery — common business model failures`
- Description: `Browse real risk flags caught by Quantis: fatal assumptions, cash flow gaps, pricing errors, and market timing risks for 50+ business types.`

**Leaderboard** `/leaderboard`
- Title: `Top validated business ideas — Quantis leaderboard`
- Description: `See the highest-scoring business ideas validated by Quantis this month. Rankings based on financial viability, risk profile, and market timing.`

### Blog posts (9 routes)

**`/blog/how-to-stress-test-your-startup`**
- Title: `How to stress-test your startup before launch (2026)`
- Description: `The 5-step framework for validating your business model before spending a dollar. Break-even analysis, unit economics, and risk flag identification.`

**`/blog/startup-validation-checklist`**
- Title: `Startup validation checklist: 7 questions before you build`
- Description: `The 7 critical questions every founder must answer before writing code or signing a lease. Based on analysis of 10,000+ business ideas.`

**`/blog/ai-vs-spreadsheets-startup-planning`**
- Title: `AI vs spreadsheets for startup financial planning`
- Description: `Why AI-powered financial modeling catches 3x more risk factors than manual spreadsheets. Comparison of accuracy, speed, and blind spots.`

**`/blog/validate-startup-idea-using-ai`**
- Title: `How to validate a startup idea using AI (step-by-step)`
- Description: `Step-by-step guide to using AI tools for market validation, financial stress-testing, and competitive analysis. Includes real examples.`

**`/blog/how-to-calculate-startup-costs`**
- Title: `How to calculate startup costs (2026 guide)`
- Description: `Complete guide to estimating startup costs by industry and location. Equipment, rent, licensing, marketing, and working capital with real benchmarks.`

**`/blog/unit-economics-explained-for-founders`**
- Title: `Unit economics explained for founders`
- Description: `LTV, CAC, LTV:CAC ratio, payback period, and churn rate demystified. Learn what healthy unit economics look like for your industry.`

**`/blog/coffee-shop-startup-costs-by-city`**
- Title: `Coffee shop startup costs 2026: Denver vs Austin vs NYC`
- Description: `What it actually costs to open a coffee shop in Denver, Austin, and NYC. Location-adjusted startup costs, expenses, and real profit projections.`

**`/blog/food-truck-profit-calculator`**
- Title: `Food truck profit calculator: revenue, costs & ROI by city`
- Description: `How much does a food truck make? Real profit projections for Austin, LA, and Miami. Startup costs, permit fees, and monthly revenue breakdowns.`

**`/blog/how-to-validate-restaurant-idea`**
- Title: `How to validate a restaurant idea before signing a lease`
- Description: `Data-driven framework for validating restaurant concepts. Location analysis, financial stress-testing, and 7 metrics that predict survival.`

### Example pages — title/description pattern

All 51 example pages follow this pattern:

- **Title:** `[Business type] in [City] — AI financial analysis | Quantis`
- **Description:** `AI financial report: [City] [business type] with [profit]/mo projected profit, [margin]% gross margin, break-even month [X]. Startup cost [range].`

Each page MUST pull its specific numbers from its own data — never use generic descriptions.

| Slug | Title | Description |
|------|-------|-------------|
| coffee-shop-denver | Coffee shop in Denver — AI financial analysis \| Quantis | AI financial report: Denver coffee shop with $4,200/mo projected profit, 62% gross margin, break-even month 8. Startup cost $85K–$120K. |
| saas-project-management | SaaS project management — AI financial analysis \| Quantis | AI financial report: B2B SaaS with $3,800/mo projected profit, 82% gross margin, break-even month 14. LTV:CAC 3.1x. |
| restaurant-miami | Restaurant in Miami — AI financial analysis \| Quantis | AI financial report: Miami farm-to-table restaurant with $8,900/mo profit, 68% margin, break-even month 6. Startup $180K–$280K. |
| consulting-firm-new-york | Consulting firm in New York — AI analysis \| Quantis | AI financial report: NYC management consulting with $18,500/mo profit, 72% margin, break-even month 4. LTV:CAC 6.8x. |
| fitness-studio-los-angeles | Fitness studio in LA — AI financial analysis \| Quantis | AI financial report: LA boutique fitness with $7,800/mo profit, 65% margin, break-even month 7. Startup $120K–$200K. |
| dental-clinic-dubai | Dental clinic in Dubai — AI financial analysis \| Quantis | AI financial report: Dubai dental clinic with $12,500/mo profit, 58% margin, break-even month 9. Startup $250K–$400K. |
| food-truck-austin | Food truck in Austin — AI financial analysis \| Quantis | AI financial report: Austin food truck with $5,400/mo profit, 64% margin, break-even month 5. Startup $45K–$80K. |
| ecommerce-sustainable-fashion | Sustainable fashion e-commerce — AI analysis \| Quantis | AI financial report: DTC sustainable fashion with $6,200/mo profit, 55% margin, break-even month 11. LTV:CAC 2.8x. |
| real-estate-agency-chicago | Real estate agency in Chicago — AI analysis \| Quantis | AI financial report: Chicago brokerage with $11,200/mo profit, 45% margin, break-even month 5. |
| barbershop-houston | Barbershop in Houston — AI financial analysis \| Quantis | AI financial report: Houston barbershop with $8,200/mo profit, 72% margin, break-even month 4. Startup $40K–$75K. |

**Remaining 41 example pages:** Follow identical pattern. Extract profit, margin, break-even, and startup cost from each page's content. Every page gets unique, data-specific meta tags.

### Pages with noindex

| Route | Title | Robots directive |
|-------|-------|-----------------|
| /privacy | Privacy policy — AIWMC Quantis | noindex, follow |
| /terms | Terms of service — AIWMC Quantis | noindex, follow |
| /app/* | (none needed) | noindex, nofollow |
| /auth/* | (none needed) | noindex, nofollow |
| /dashboard/* | (none needed) | noindex, nofollow |
| /checkout/* | (none needed) | noindex, nofollow |

---

## 2. STRUCTURED DATA (JSON-LD)

### 2.1 Organization schema — sitewide

```json
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": "https://aiwmcquantis.com/#organization",
  "name": "AIWMC™ LLC",
  "alternateName": "AIWMC Quantis",
  "url": "https://aiwmcquantis.com",
  "logo": {
    "@type": "ImageObject",
    "url": "https://aiwmcquantis.com/logo.png",
    "width": 512,
    "height": 512
  },
  "description": "AIWMC™ LLC builds AI-powered business validation tools that help founders stress-test startup ideas with 95,500 real benchmarks, financial projections, risk flags, and action plans.",
  "foundingDate": "2026-01-18",
  "sameAs": [
    "https://twitter.com/aiwmcquantis",
    "https://www.instagram.com/aiwmcquantis",
    "https://www.linkedin.com/company/aiwmc",
    "https://www.producthunt.com/products/aiwmc-quantis"
  ],
  "contactPoint": {
    "@type": "ContactPoint",
    "contactType": "customer support",
    "email": "support@aiwmcquantis.com",
    "availableLanguage": "English"
  },
  "address": {
    "@type": "PostalAddress",
    "addressLocality": "Aurora",
    "addressRegion": "CO",
    "addressCountry": "US"
  }
}
```

### 2.2 SoftwareApplication schema — homepage + pricing

**CRITICAL: Do NOT include aggregateRating unless you have real, verified user reviews. Fabricated ratings (e.g. "4.9 from 847 founders") will get you penalized by Google and destroy trust with any user who investigates. Omit the field entirely until you have at least 10 genuine reviews.**

```json
{
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "@id": "https://aiwmcquantis.com/#software",
  "name": "AIWMC Quantis",
  "url": "https://aiwmcquantis.com",
  "applicationCategory": "BusinessApplication",
  "operatingSystem": "Web",
  "description": "AI-powered business validation SaaS that stress-tests startup models against 95,500 industry benchmarks with Monte Carlo simulation in 90 seconds.",
  "featureList": [
    "Financial pre-mortem analysis",
    "12-variable financial projections",
    "3-scenario Monte Carlo modeling (P10/P50/P90)",
    "Risk flag identification with severity ratings",
    "Unit economics calculation (CAC, LTV, LTV:CAC, payback period)",
    "Break-even timeline analysis",
    "95,500 verified industry benchmarks",
    "50+ city cost index adjustment",
    "RVCE reality validation engine",
    "PDF report export (Plus)",
    "Document Studio (Plus)",
    "Location comparison (Plus)"
  ],
  "softwareVersion": "3.0",
  "datePublished": "2026-01-18",
  "dateModified": "2026-05-27",
  "author": { "@type": "Organization", "@id": "https://aiwmcquantis.com/#organization" },
  "publisher": { "@type": "Organization", "@id": "https://aiwmcquantis.com/#organization" },
  "offers": [
    {
      "@type": "Offer",
      "name": "Free Plan",
      "price": "0",
      "priceCurrency": "USD",
      "description": "3 analyses per month, full financial report, risk flags and action plan. No credit card required.",
      "availability": "https://schema.org/InStock",
      "url": "https://aiwmcquantis.com/pricing"
    },
    {
      "@type": "Offer",
      "name": "Plus Plan",
      "price": "17",
      "priceCurrency": "USD",
      "billingIncrement": "P1M",
      "description": "Unlimited analyses, PDF export, Document Studio, location comparison, custom branding, priority support.",
      "availability": "https://schema.org/InStock",
      "url": "https://aiwmcquantis.com/pricing"
    }
  ]
}
```

### 2.3 WebSite schema with SearchAction — homepage only

```json
{
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": "https://aiwmcquantis.com/#website",
  "name": "AIWMC Quantis",
  "url": "https://aiwmcquantis.com",
  "description": "AI-powered business validation and financial stress-testing for founders",
  "publisher": { "@type": "Organization", "@id": "https://aiwmcquantis.com/#organization" },
  "potentialAction": {
    "@type": "SearchAction",
    "target": { "@type": "EntryPoint", "urlTemplate": "https://aiwmcquantis.com/examples?q={search_term_string}" },
    "query-input": "required name=search_term_string"
  },
  "inLanguage": "en-US"
}
```

### 2.4 FAQPage schema — homepage

```json
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "What is AIWMC Quantis?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "AIWMC Quantis is an AI-powered business validation tool that runs a financial pre-mortem on your startup idea. In 90 seconds, it stress-tests your business model against 95,500 industry benchmarks and generates revenue projections, risk flags, unit economics, and a clear action plan."
      }
    },
    {
      "@type": "Question",
      "name": "How long does a business validation take?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "A complete Quantis analysis takes approximately 90 seconds. You describe your business idea and target location in plain language, and the engine returns a full financial report with 3-scenario projections, risk flags, unit economics, and an action plan."
      }
    },
    {
      "@type": "Question",
      "name": "Is Quantis free to use?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Yes. Quantis offers a permanent free plan with 3 analyses per month, full financial reports, and risk flags — no credit card required. The Plus plan at $17/month adds unlimited analyses, PDF export, Document Studio, location comparison, and custom branding."
      }
    },
    {
      "@type": "Question",
      "name": "What financial metrics does Quantis calculate?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Quantis calculates 12 financial variables: revenue projections, COGS, gross margin, operating expenses, net profit, break-even month, startup investment, payback period, LTV, CAC, LTV:CAC ratio, and monthly burn rate — all across three scenarios (P10 conservative, P50 realistic, P90 optimistic)."
      }
    },
    {
      "@type": "Question",
      "name": "What industries and locations does Quantis support?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Quantis covers 100+ industry types and adjusts projections for 50+ global cities using location-specific cost indices. The 95,500-row benchmark database is sourced from SBA, IBISWorld, Census Bureau, BLS, OECD, and proprietary datasets."
      }
    },
    {
      "@type": "Question",
      "name": "How accurate are Quantis projections?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Quantis uses a deterministic financial engine with 1,000 Monte Carlo simulations per analysis — not AI hallucination. Every metric is computed from real benchmarks with confidence scoring. Projections are stress-test estimates designed to identify risks before you invest."
      }
    },
    {
      "@type": "Question",
      "name": "What is a financial pre-mortem?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "A financial pre-mortem imagines your business has already failed and works backward to identify the most likely causes. Quantis automates this by quantifying your key financial risks and flagging fatal assumptions — before you spend money building."
      }
    },
    {
      "@type": "Question",
      "name": "Does Quantis replace a business plan or consultant?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Quantis delivers the most critical financial intelligence — risk flags, projections, unit economics — in 90 seconds at a fraction of the cost. A consultant charges $1,500–$25,000 for equivalent analysis. Use Quantis first to validate whether your model is worth developing further."
      }
    }
  ]
}
```

### 2.5 BreadcrumbList schema — all inner pages

Template (replace values per page):

```json
{
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://aiwmcquantis.com" },
    { "@type": "ListItem", "position": 2, "name": "[PAGE NAME]", "item": "https://aiwmcquantis.com/[path]" }
  ]
}
```

For blog posts, add a third level: Home > Blog > [Post Title]
For example pages, add a third level: Home > Examples > [Business Type in City]

### 2.6 Article schema — every blog post

Template:

```json
{
  "@context": "https://schema.org",
  "@type": "Article",
  "@id": "https://aiwmcquantis.com/blog/[slug]#article",
  "headline": "[Blog post title]",
  "description": "[Meta description]",
  "datePublished": "[YYYY-MM-DD]",
  "dateModified": "[YYYY-MM-DD]",
  "author": { "@type": "Organization", "name": "AIWMC™ LLC", "url": "https://aiwmcquantis.com" },
  "publisher": {
    "@type": "Organization",
    "name": "AIWMC Quantis",
    "logo": { "@type": "ImageObject", "url": "https://aiwmcquantis.com/logo.png", "width": 512, "height": 512 }
  },
  "mainEntityOfPage": { "@type": "WebPage", "@id": "https://aiwmcquantis.com/blog/[slug]" },
  "inLanguage": "en-US"
}
```

---

## 3. OPEN GRAPH + TWITTER CARDS

Every page gets unique OG and Twitter tags. Use the same title and description values from Section 1.

Per-page template:

```
og:type = website (pages) or article (blog posts)
og:site_name = AIWMC Quantis
og:url = https://aiwmcquantis.com/[path]
og:title = [page-specific title from Section 1]
og:description = [page-specific description from Section 1]
og:image = https://aiwmcquantis.com/og-[slug].png (1200x630px)
og:locale = en_US

twitter:card = summary_large_image
twitter:site = @aiwmcquantis
twitter:creator = @aiwmcquantis
twitter:title = [same as og:title]
twitter:description = [same as og:description]
twitter:image = [same as og:image]
```

For blog posts, add: `article:published_time`, `article:modified_time`, `article:section` (Business Validation), `article:tag` (relevant keywords).

OG image specs: 1200x630px, PNG or JPG, under 300KB. Name: `og-[page-slug].png`.

---

## 4. TECHNICAL SEO

### 4.1 Canonical tags

Every page gets a self-referencing canonical:
```
<link rel="canonical" href="https://aiwmcquantis.com/[exact-path]">
```

Enforce: redirect http → https, redirect www → non-www, redirect trailing slashes to non-trailing.

### 4.2 Robots.txt

Serve at `https://aiwmcquantis.com/robots.txt`:

```
User-agent: *
Allow: /

Disallow: /app/
Disallow: /dashboard/
Disallow: /api/
Disallow: /auth/
Disallow: /login
Disallow: /signup
Disallow: /account/
Disallow: /checkout/

Allow: /blog/
Allow: /how-it-works
Allow: /use-cases
Allow: /examples
Allow: /examples/
Allow: /risk-gallery
Allow: /pricing
Allow: /methodology
Allow: /leaderboard

Sitemap: https://aiwmcquantis.com/sitemap.xml
```

### 4.3 XML sitemap

Auto-generate at build time. Must include ALL public routes with correct lastmod dates.

**Core pages (priority 0.8–1.0):**
/, /how-it-works, /use-cases, /examples, /pricing, /methodology, /blog, /risk-gallery, /leaderboard

**Example pages (priority 0.7, all 51):**
/examples/coffee-shop-denver, /examples/saas-project-management, /examples/restaurant-miami, /examples/consulting-firm-new-york, /examples/fitness-studio-los-angeles, /examples/dental-clinic-dubai, /examples/food-truck-austin, /examples/ecommerce-sustainable-fashion, /examples/real-estate-agency-chicago, /examples/barbershop-houston, /examples/dropshipping-store-online, /examples/mobile-app-startup-san-francisco, /examples/cleaning-service-atlanta, /examples/tutoring-service-boston, /examples/coworking-space-portland, /examples/pet-grooming-seattle, /examples/bakery-paris, /examples/gym-london, /examples/laundromat-tokyo, /examples/digital-agency-berlin, /examples/pharmacy-toronto, /examples/auto-repair-dallas, /examples/yoga-studio-bali, /examples/bookstore-lisbon, /examples/nail-salon-sydney, /examples/pizzeria-naples, /examples/pet-store-vancouver, /examples/car-wash-riyadh, /examples/daycare-singapore, /examples/ice-cream-barcelona, /examples/tutoring-seoul, /examples/brewery-melbourne, /examples/flower-shop-amsterdam, /examples/saas-fintech-lagos, /examples/juice-bar-miami, /examples/tattoo-studio-brooklyn, /examples/moving-company-phoenix, /examples/event-planning-mumbai, /examples/cleaning-service-dubai, /examples/photography-studio-prague, /examples/language-school-mexico-city, /examples/accounting-firm-zurich, /examples/cloud-kitchen-bangkok, /examples/airbnb-management-lisbon, /examples/music-school-nashville, /examples/coworking-cape-town, /examples/vet-clinic-madrid, /examples/wine-bar-buenos-aires, /examples/saas-hr-tech-bangalore, /examples/print-shop-warsaw, /examples/plumbing-business-toronto

**Blog posts (priority 0.6, all 9):**
All 9 blog URLs from Section 1.

**Do NOT include in sitemap:** /app/*, /auth/*, /dashboard/*, /checkout/*, /privacy, /terms

### 4.4 Core Web Vitals targets

| Metric | Target | Risk area |
|--------|--------|-----------|
| LCP | < 2.5s | Hero section font loading, SPA hydration delay |
| INP | < 200ms | Analysis form submission, results rendering |
| CLS | < 0.1 | Pricing toggle, dynamic content insertion |
| TTFB | < 800ms | Pre-rendered pages should achieve < 200ms |

### 4.5 Image alt text rules

- Never empty unless purely decorative
- Describe what the image shows, not what it is
- Under 125 characters
- Never keyword-stuff

---

## 5. TARGET KEYWORDS

### Tier 1 — target immediately (low competition, high intent)

| Keyword | Est. volume | Target page |
|---------|-------------|-------------|
| AI business validation | 1,300 | Homepage |
| startup validation tool | 880 | Homepage / How it works |
| business idea stress test | 260 | Homepage |
| financial stress test startup | 390 | How it works |
| startup feasibility analysis | 720 | How it works / Use cases |
| pre-mortem analysis business | 480 | Methodology / Blog |
| startup risk assessment tool | 590 | Risk gallery |
| AI financial projections startup | 480 | How it works |
| coffee shop startup costs Denver | 170 | /examples/coffee-shop-denver + blog |
| food truck profit calculator | 390 | /examples/food-truck-austin + blog |
| restaurant startup costs by city | 260 | /examples/restaurant-miami + blog |

### Tier 2 — next 90 days

| Keyword | Est. volume | Target page |
|---------|-------------|-------------|
| validate startup idea | 4,400 | Homepage / Blog |
| business model validation | 2,900 | Homepage / Methodology |
| how to validate a business idea | 6,600 | Blog post |
| startup unit economics calculator | 590 | Methodology / Blog |
| LTV CAC ratio calculator | 480 | Methodology / Blog |
| break even analysis startup | 3,200 | How it works / Blog |
| free startup analysis tool | 720 | Pricing / Homepage |
| startup cash flow analysis | 1,900 | How it works / Blog |

### Tier 3 — authority building (6+ months)

| Keyword | Est. volume | Target page |
|---------|-------------|-------------|
| AI business plan generator | 9,900 | Homepage (secondary positioning) |
| financial projections for startups | 5,400 | Blog / How it works |
| business validation software | 720 | Homepage / Pricing |
| business idea feasibility study | 1,300 | Blog / Use cases |

### Local SEO keywords (example pages)

Every example page targets: `[business type] startup costs [city]`, `[business type] profit [city]`, `how much does a [business type] make in [city]`. These are zero-competition long-tail keywords with real purchase intent. The 51 example pages should collectively capture thousands of these searches monthly once pre-rendering is live.

### Topic clusters

**Cluster 1 — Business validation (core):** Homepage, Use cases, Pricing anchor
**Cluster 2 — Financial analysis:** How it works, Methodology anchor
**Cluster 3 — Risk & pre-mortem:** Risk gallery, Methodology anchor
**Cluster 4 — AI tools:** Homepage, Blog anchor
**Cluster 5 — Founder education:** Blog posts anchor

---

## 6. BLOG CONTENT PRIORITY

| Priority | Post title | Target keyword | Monthly traffic potential |
|----------|-----------|----------------|--------------------------|
| 1 | How to validate a business idea in 2026 | how to validate a business idea | 660–990 |
| 2 | Financial projections for startups: complete guide | financial projections for startups | 540–810 |
| 3 | Break-even analysis for startups: step-by-step | break even analysis startup | 320–480 |
| 4 | Coffee shop startup costs 2026: Denver vs Austin vs NYC | coffee shop startup costs | 200–400 |
| 5 | Food truck profit calculator: revenue, costs & ROI | food truck profit calculator | 150–300 |
| 6 | How to validate a restaurant idea before signing a lease | validate restaurant idea | 100–200 |
| 7 | Unit economics explained for founders | unit economics startup | 100–200 |
| 8 | What is a business pre-mortem? | pre-mortem analysis | 48–72 |
| 9 | AI vs spreadsheets for startup planning | AI vs spreadsheets business | 26–39 |

---

## 7. POST-DEPLOY VERIFICATION

Run every item after deploying the pre-rendering fix:

```
[ ] curl homepage — unique title, 95,500 in description
[ ] curl /pricing — pricing-specific title, NOT homepage
[ ] curl /examples/bakery-paris — bakery-specific title, NOT homepage  
[ ] curl /blog/coffee-shop-startup-costs-by-city — blog-specific title
[ ] curl /pricing — og:title shows pricing, not homepage
[ ] curl /robots.txt — returns valid robots.txt
[ ] curl /sitemap.xml — returns XML with all 70+ routes
[ ] grep "1,000" on any page — returns NOTHING (old count eliminated)
[ ] grep "97,500" on any page — returns NOTHING (vault error eliminated)
[ ] Share any URL on LinkedIn — preview shows page-specific content
[ ] /app routes are NOT in sitemap and have noindex
[ ] Google Search Console: request indexing for all 70+ public URLs
[ ] PageSpeed Insights on /pricing: LCP < 2.5s
[ ] SoftwareApplication schema does NOT contain aggregateRating (no fake reviews)
```

---

## CHANGELOG FROM v1.0

| Change | v1.0 (March 2026) | v2.0 (May 2026) |
|--------|-------------------|-----------------|
| Benchmark count | "1,000+" in 7 places | **95,500 everywhere** |
| aggregateRating | Fabricated "4.9/5 from 847" | **REMOVED — no fake ratings** |
| Pre-rendering | Not mentioned | **Section 0 — mandatory prerequisite** |
| Blog posts in sitemap | 3 posts | **All 9 posts** |
| Example pages in sitemap | 0 | **All 51 pages** |
| Company name | Mixed AIWMC AI Agency LLC / AIWMC™ LLC | **AIWMC™ LLC consistently** |
| foundingDate | "2024" (wrong) | **2026-01-18** |
| dateModified | 2026-03-01 | **2026-05-27** |
| Leaderboard page | Missing | **Added** |
| Local SEO strategy | Missing | **Added for 51 example pages** |
| Blog post routes | Mismatched slugs | **All 9 verified against live site** |
| Speed claim | Mixed "90 seconds" / "60 seconds" | **90 seconds everywhere** |
| RVCE feature | Not listed | **Added to featureList** |
| Instagram social link | Missing | **Added** |

---

*This document is the single source of truth for all SEO implementation on aiwmcquantis.com. Any future SEO work references this file. Any contradiction between this file and the live site is a bug in the live site.*

*AIWMC™ LLC · aiwmcquantis.com · v2.0 · May 27, 2026*
