# AIWMC QUANTIS — PRODUCTION BUSINESS LOGIC
**Version:** 4.0.0 — Live Site Verified  
**Crawled & Synced:** April 2026  
**Source of truth:** aiwmcquantis.com (live production)  
**Legal entity:** AIWMC™ LLC  
**Trademark:** AIWMC™ (USPTO Serial #99538355, pending)  
**HQ:** Denver, Colorado, USA  
**Twitter:** @aiwmcquantis  
**Domain:** aiwmcquantis.com  

> **This file is the single source of truth for all Quantis business logic, pricing, features, content, and engine rules. It reflects the live production site as crawled in April 2026. Update this file whenever the product changes.**

---

## TABLE OF CONTENTS

1. [Product Identity — Live Verified](#1-product-identity--live-verified)
2. [Live Site Architecture](#2-live-site-architecture)
3. [The 12 Financial Variables — Confirmed Engine Output](#3-the-12-financial-variables--confirmed-engine-output)
4. [7-Layer AI Safety Architecture — Confirmed Live](#4-7-layer-ai-safety-architecture--confirmed-live)
5. [Deterministic Engine + Monte Carlo Protocol](#5-deterministic-engine--monte-carlo-protocol)
6. [36-Month P&L Construction Rules](#6-36-month-pl-construction-rules)
7. [Benchmark Database — Live Verified](#7-benchmark-database--live-verified)
8. [Global City Coverage — All 51+ Cities Verified](#8-global-city-coverage--all-51-cities-verified)
9. [All 51 Live Example Pages — Verified](#9-all-51-live-example-pages--verified)
10. [All 9 Live Blog Posts — Verified](#10-all-9-live-blog-posts--verified)
11. [Industry Vertical Classification](#11-industry-vertical-classification)
12. [Unit Economics Engine](#12-unit-economics-engine)
13. [Risk Scoring System](#13-risk-scoring-system)
14. [Quality Gates & Contradiction Detection](#14-quality-gates--contradiction-detection)
15. [Tier Architecture — Free / Plus / Consultant](#15-tier-architecture--free--plus--consultant)
16. [Output Schema Standards](#16-output-schema-standards)
17. [Validation Score Algorithm](#17-validation-score-algorithm)
18. [User Flow & Activation Logic](#18-user-flow--activation-logic)
19. [Pricing & Revenue Logic](#19-pricing--revenue-logic)
20. [Gross Margin by Business Type](#20-gross-margin-by-business-type)
21. [Anti-Hallucination Rules](#21-anti-hallucination-rules)
22. [Session Memory & Learning Protocol](#22-session-memory--learning-protocol)
23. [Copy & Messaging Standards](#23-copy--messaging-standards)
24. [Legal & Compliance Layer](#24-legal--compliance-layer)
25. [Key Formulas Reference](#25-key-formulas-reference)
26. [Error Codes](#26-error-codes)

---

## 1. PRODUCT IDENTITY — LIVE VERIFIED

### Official Product Names (use exactly as written)
- **Full name:** AIWMC™ Quantis
- **Short name:** Quantis (acceptable in product UI and conversation)
- **Legal entity:** AIWMC™ LLC
- **Do not use:** "AIWMC AI Agency LLC" in public-facing copy (footer shows "AIWMC™ LLC")
- **Do not use:** "AIWMC Quantis" without the ™ in branded contexts

### Live Title Tags (as crawled April 2026)
- Homepage: `AIWMC Quantis — AI Business Idea Validator`
- Inner pages: `Business Idea Validator & Financial Pre-Mortem Tool | AIWMC Quantis`
- Meta description: `Stress-test your business idea in 90 seconds. AI-powered financial pre-mortem with 95,500 real benchmarks. Free to start.`
- Twitter card title: `Quantis — 90% of Businesses Fail. Yours Doesn't Have To | Free AI Validation`
- OG description: `Quantis runs 1,000+ financial simulations on your business model and gives you a proceed/pivot/kill verdict. Free. No signup.`
- Theme color: `#070D1A`

### Product Category (confirmed live terminology)
Quantis is a **"financial pre-mortem"** tool — this exact phrase is in the live meta tags. Use it in all documentation, AI prompts, and marketing.

### The Core Claim (live, verified — do not alter)
> "90% of businesses fail in 5 years. Most had a plan — none had validation. A financial consultant charges $1,500–$25,000 to stress-test your model. Quantis does it in 90 seconds with 95,500 real benchmarks. Free."

### What Makes Quantis Different
| Competitor | Approach | City data | Monte Carlo | Price |
|------------|----------|-----------|-------------|-------|
| **Quantis** | **Deterministic + AI pre-mortem** | **50+ global cities** | **1,000 iter** | **Free / $17 / $49** |
| LivePlan | Business plan template | No | No | $20/mo |
| Bizplan | Business plan template | No | No | $29/mo |
| Enloop | Plan + forecast | No | No | $19.95/mo |
| ChatGPT | LLM opinion | No | No | $20/mo |
| Consultant | Human custom | Varies | Varies | $1,500–$25,000 |

### Quantis Is NOT
- A business plan generator
- An AI chatbot giving opinions
- A guarantee of business success
- A substitute for a licensed financial advisor
- A spreadsheet tool

---

## 2. LIVE SITE ARCHITECTURE

### Confirmed Pages (crawled April 2026)
```
/                   Homepage (noscript fallback fully crawlable)
/how-it-works       3-step process
/use-cases          Founders, Consultants, Operators
/pricing            Free & Plus plans
/examples           51+ example index
/examples/[slug]    51 individual pages
/blog               Blog index
/blog/[slug]        9 individual articles
/methodology        Data sources, engine, 7-layer architecture
/risk-gallery       Common business risk patterns
/leaderboard        Top validated ideas
/app                The analysis tool
/auth               Signup / login
/privacy            Privacy policy
/terms              Terms of service
```

### Navigation (live, 8 items)
```
How It Works | Use Cases | Pricing | Examples | Blog | Methodology | Risk Gallery | Leaderboard
```

### Technical Stack (live confirmed)
- Framework: React SPA via Lovable → GitHub (AIWMCX/aiwmcquantis) → Vercel auto-deploy
- Hosting: Vercel Hobby plan
- Domain: IONOS registrar, A + CNAME pointing to Vercel
- Analytics: Plausible
- Theme: #070D1A dark

### Footer (canonical, live)
```
© 2026 AIWMC™ LLC.  Privacy · Terms
```

---

## 3. THE 12 FINANCIAL VARIABLES — CONFIRMED ENGINE OUTPUT

The live site explicitly states the engine calculates **exactly 12 financial variables**. All 12 must appear in every output:

```
1.  Revenue               Monthly and annual across 3 scenarios
2.  COGS                  Direct delivery costs
3.  Gross Margin          (Revenue - COGS) / Revenue × 100
4.  Operating Expenses    S&M + R&D + G&A
5.  Net Profit            Gross Profit - Operating Expenses (= EBITDA)
6.  Break-even Month      Month cumulative revenue first covers cumulative costs
7.  Startup Investment    Total pre-operations capital required
8.  Payback Period        Months to recover startup investment from operating profit
9.  LTV                   Customer lifetime value
10. CAC                   Customer acquisition cost
11. LTV:CAC Ratio         Primary unit economics health metric
12. Monthly Burn Rate     Net cash outflow (when expenses > revenue)
```

**Rule:** A partial output is a failed output. If any variable cannot be calculated, state the assumption, show the basis, and flag with: "Estimated from [proxy] — verify before committing capital."

---

## 4. 7-LAYER AI SAFETY ARCHITECTURE — CONFIRMED LIVE

This is a core trust and marketing claim on the live site. Every implementation must honor all 7 layers exactly as described publicly.

```
LAYER 1: Input sanitization & business type classification
  Clean and normalize user input. Classify into correct NAICS code.
  Reject or flag ambiguous inputs. Prevent injection attacks.

LAYER 2: Benchmark matching with confidence scoring
  Match classified business type to benchmark database.
  Return confidence score (0.0–1.0) based on comparables count.
  If confidence < 0.50: widen Monte Carlo distributions by 30%.
  If confidence < 0.25: surface "low confidence" warning.

LAYER 3: Location cost adjustment using city-specific multipliers
  Apply city tier multipliers (CAC, rent, labor, income).
  Route to nearest calibrated city if exact city not found.
  Log routing decision for transparency.

LAYER 4: Dual-AI consensus validation
  Two independent model calls must agree on every projection.
  If delta >15% on any key metric: flag and reconcile.
  Reconciled output is delivered — never the raw single-model output.
  Prevents single-model hallucination from reaching users.

LAYER 5: Sanity checks — margin bounds, revenue-to-cost ratios, unit economics
  Run all 12 quality gates (Section 14).
  Reject any output that fails a gate. Recalculate, never override.
  Surface gate failures as explicit disclosures.

LAYER 6: Reconciliation against historical analysis data
  Compare against Quantis's own historical analysis database.
  Flag if current output is statistical outlier (>2σ from comparables).
  Apply correction if systemic drift detected in a vertical.

LAYER 7: Human-readable source attribution for every number
  Every projection shows its benchmark source.
  Format: "Based on [N] comparable [type] benchmarks from [source]"
  No number without a source. No exception.
```

---

## 5. DETERMINISTIC ENGINE + MONTE CARLO PROTOCOL

### The Dual-Engine Model (live terminology)
The live site describes a **"deterministic financial engine"** as the first pass, Monte Carlo as the second.

**Deterministic Engine (Pass 1):**
- Benchmark parameters → exact P50 values for all 12 variables
- No randomness — same inputs always produce same output
- Base case financial model. Runs in ≤15 seconds.

**Monte Carlo Simulation (Pass 2):**
- Deterministic output = center point
- Samples from probability distributions around each variable
- 1,000 iterations → P10/P50/P90 distributions
- P50 of Monte Carlo MUST equal the deterministic output (consistency check)
- Runs in ≤30 seconds

### Variable Distributions
```python
{
  "monthly_revenue_growth":    { "dist": "lognormal",   "sigma": 0.30×mean, "floor": -0.20, "ceiling": 0.50 },
  "monthly_churn_rate":        { "dist": "triangular",  "min": best_in_class, "mode": industry_avg, "max": early_stage_worst },
  "customer_acquisition_cost": { "dist": "normal",      "sigma": 0.25×mean, "floor": 0 },
  "average_order_value":       { "dist": "normal",      "sigma": 0.15×mean },
  "conversion_rate":           { "dist": "beta",        "floor": 0.005, "ceiling": 0.40 },
  "cogs_percentage":           { "dist": "normal",      "sigma": 0.05 },
  "seasonality_coefficient":   { "dist": "normal",      "sigma": 0.10 },
  "market_penetration_rate":   { "dist": "lognormal",   "sigma": 0.40×mean }
}
```

### Variable Correlations
```
CAC ↔ conversion_rate:       r = -0.65
revenue_growth ↔ churn:      r = -0.45
market_penetration ↔ CAC:    r = +0.50
COGS_pct ↔ gross_margin:     r = -1.00
AOV ↔ conversion_rate:       r = -0.30
seasonality ↔ revenue_var:   r = +0.80
```

### Required Monte Carlo Outputs (never omit any)
```
REVENUE — Month 12, 24, 36:
  P10: $X   P50: $X   P90: $X

SURVIVAL PROBABILITY:
  Month 12:  XX% chance cash > $0
  Month 24:  XX% chance cash > $0
  Month 36:  XX% chance cashflow positive

BREAKEVEN:
  P10: Month X   P50: Month X   P90: Month X

TOP 3 RISK DRIVERS (by outcome variance contribution):
  1. [Variable]: ±$X impact on Month 36 revenue
  2. [Variable]: ±$X impact
  3. [Variable]: ±$X impact
```

### Timing (live promise: 90 seconds)
```
Layer 1 input parse:       ≤5 sec
Layer 2 benchmark match:   ≤10 sec
Layer 3 city adjustment:   ≤5 sec
Deterministic engine:      ≤15 sec
Monte Carlo 1,000 iter:    ≤30 sec
Layers 5–7 QA + output:   ≤15 sec
Buffer:                    ≤10 sec
TOTAL:                     ≤90 sec
```
If >90 seconds: return deterministic result immediately, load Monte Carlo asynchronously. Never show blank screen.

---

## 6. 36-MONTH P&L CONSTRUCTION RULES

### Phase Structure
```
Phase 1 — Foundation (M1–6):   Pre-PMF, high burn, EBITDA always negative
Phase 2 — Traction (M7–12):    PMF signals, revenue accelerating, EBITDA narrowing
Phase 3 — Growth (M13–24):     Channel efficiency improving, approaching breakeven
Phase 4 — Scale (M25–36):      Operational leverage, EBITDA positive or near
```

### Monthly Schema
```
Month:              1    2    3    6    12   18   24   30   36
Revenue             $    $    $    $    $    $    $    $    $
(-) COGS            $    $    $    $    $    $    $    $    $
Gross Profit        $    $    $    $    $    $    $    $    $
Gross Margin %      %    %    %    %    %    %    %    %    %
(-) S&M             $    $    $    $    $    $    $    $    $
(-) R&D             $    $    $    $    $    $    $    $    $
(-) G&A             $    $    $    $    $    $    $    $    $
EBITDA             ($)  ($)  ($)  ($)  ($)   $    $    $    $
Cash (start)        $    $    $    $    $    $    $    $    $
Net cash flow      ($)  ($)  ($)  ($)   $    $    $    $    $
Cash (end)          $    $    $    $    $    $    $    $    $
Customers           #    #    #    #    #    #    #    #    #
MRR / Run rate      $    $    $    $    $    $    $    $    $
LTV                 $    $    $    $    $    $    $    $    $
CAC                 $    $    $    $    $    $    $    $    $
LTV:CAC             x    x    x    x    x    x    x    x    x
Burn rate           $    $    $    $    —    —    —    —    —
```

### Hard Rules
1. Month 1 revenue ≤ Month 6 revenue (always ramps)
2. Gross margin within vertical benchmark ±10%
3. EBITDA Month 1 always negative for pre-revenue startups
4. CAC trends down over time as organic channels develop
5. Cash position is cumulative — never resets
6. Startup investment = Month 0 cash outflow, not Month 1 expense
7. If cash runs out before Month 36 at P50: CRITICAL flag required immediately

---

## 7. BENCHMARK DATABASE — LIVE VERIFIED

### Confirmed Specifications
- **Total datapoints:** 95,500 verified
- **Industry coverage:** 100+ types
- **Geographic coverage:** 50+ global cities (confirmed international)
- **Sources (live):** SBA, IBISWorld, U.S. Census Bureau, BLS, OECD, Proprietary

### Confidence Score Rules
```
0.80–1.00: High — 500+ comparables, primary sources
0.60–0.79: Good — 100–499 comparables
0.40–0.59: Medium — 50–99 — disclose in output
0.20–0.39: Low — 10–49 — widen MC by 30%, disclose
0.00–0.19: Very low — <10 — use proxy, explicit disclosure
```

### When No Benchmark Exists
1. Identify closest NAICS proxy
2. Apply city tier adjustments
3. Widen Monte Carlo distributions by 30%
4. Add disclosure in output
5. NEVER fabricate a benchmark

---

## 8. GLOBAL CITY COVERAGE — ALL 51+ CITIES VERIFIED

Coverage is confirmed global — not US-only. Currency must match city.

### US Cities — Tier System
**Tier 1 (8):** NYC, LA, Chicago, Houston, Phoenix, Philadelphia, San Antonio, San Diego  
**Tier 2 (14):** Denver CO (home city), Seattle, Austin, Nashville, Portland, Las Vegas, Louisville, Baltimore, Milwaukee, Albuquerque, Tucson, Fresno, Sacramento, Mesa  
**Tier 3 (30+):** All major metros 100K–500K population, SF, Boston, Dallas, Miami, Atlanta, Charlotte, etc.

### International Cities (confirmed via live examples)
```
EUROPE:        Paris(EUR) London(GBP) Berlin(EUR) Lisbon(EUR) Barcelona(EUR)
               Naples(EUR) Amsterdam(EUR) Prague(EUR) Warsaw(PLN) Zurich(CHF)
               Buenos Aires($) Madrid(EUR)
ASIA-PACIFIC:  Tokyo(JPY) Bali($) Seoul(KRW) Melbourne(AUD) Sydney(AUD)
               Singapore(SGD) Bangkok(THB) Bangalore($) Mumbai(INR)
MIDDLE EAST:   Dubai(AED/$) Riyadh(SAR)
AFRICA:        Lagos($) Cape Town(ZAR)
AMERICAS:      Toronto(CAD) Vancouver(CAD) Mexico City($)
```

### City Adjustment Multipliers (vs Tier 2 US baseline)
```
CAC:    Tier 1 US 1.40×  |  Tier 2 US 1.00×  |  Tier 3 US 0.70×
        London/Zurich 1.60×  |  Dubai/Singapore 1.20×  |  Emerging 0.50–0.80×

Rent:   NYC 3.20×  |  SF 2.80×  |  LA/London 2.40×  |  Chicago/Berlin 1.80×
        Denver/Austin 1.15×  |  Eastern Europe 0.40–0.60×

Labor:  Zurich 1.80×  |  London/Singapore 1.40×  |  US Tier 1 1.30–1.50×
        Denver 1.05×  |  Eastern Europe 0.30–0.50×  |  India 0.15–0.35×
```

### Currency Rules
- Always display results in local currency of the analyzed city
- Show USD equivalent in parentheses for international examples
- Apply PPP adjustments for emerging markets (>30% PPP deviation)
- Use annual average exchange rates, not spot rates

### Denver Special Handling
- Home city — highest data quality (847+ coffee shop comparables alone)
- Altitude premium: food/beverage ticket prices 5–8% above national avg
- Tech ecosystem: lower enterprise CAC vs national avg
- Growing real estate: rent inflation 4–6% annually

---

## 9. ALL 51 LIVE EXAMPLE PAGES — VERIFIED

All live at `aiwmcquantis.com/examples/[slug]`

### US Examples
| Slug | Business | City | Monthly Profit |
|------|----------|------|---------------|
| coffee-shop-denver | Specialty Coffee Shop | Denver CO | $4,200 |
| saas-project-management | SaaS Project Mgmt | — | $3,800 |
| restaurant-miami | Farm-to-Table Restaurant | Miami FL | $8,900 |
| ecommerce-sustainable-fashion | DTC Fashion E-commerce | Online | $6,200 |
| consulting-firm-new-york | Management Consulting | New York NY | $18,500 |
| fitness-studio-los-angeles | Boutique Fitness Studio | Los Angeles CA | $7,800 |
| food-truck-austin | Gourmet Food Truck | Austin TX | $5,400 |
| dropshipping-store-online | Dropshipping Store | Online | $3,900 |
| mobile-app-startup-san-francisco | Mobile App Startup | San Francisco CA | $4,600 |
| real-estate-agency-chicago | RE Brokerage | Chicago IL | $11,200 |
| cleaning-service-atlanta | Cleaning Service | Atlanta GA | $6,800 |
| tutoring-service-boston | Tutoring Service | Boston MA | $9,500 |
| barbershop-houston | Modern Barbershop | Houston TX | $8,200 |
| coworking-space-portland | Coworking Space | Portland OR | $9,400 |
| pet-grooming-seattle | Pet Grooming Salon | Seattle WA | $7,100 |
| auto-repair-dallas | Auto Repair Shop | Dallas TX | $9,100 |
| juice-bar-miami | Juice Bar | Miami FL | $4,800 |
| tattoo-studio-brooklyn | Tattoo Studio | Brooklyn NY | $8,300 |
| moving-company-phoenix | Moving Company | Phoenix AZ | $7,900 |
| music-school-nashville | Music School | Nashville TN | $6,700 |

### International Examples
| Slug | Business | City | Monthly Profit |
|------|----------|------|---------------|
| bakery-paris | Artisan Bakery | Paris, France | €5,800 |
| gym-london | Gym | London, UK | £6,200 |
| dental-clinic-dubai | Dental Clinic | Dubai, UAE | $12,500 |
| laundromat-tokyo | Laundromat | Tokyo, Japan | ¥890K |
| digital-agency-berlin | Digital Agency | Berlin, Germany | €7,400 |
| pharmacy-toronto | Pharmacy | Toronto, Canada | C$8,900 |
| yoga-studio-bali | Yoga Studio | Bali, Indonesia | $4,200 |
| bookstore-lisbon | Bookstore | Lisbon, Portugal | €3,100 |
| nail-salon-sydney | Nail Salon | Sydney, Australia | A$5,800 |
| pizzeria-naples | Pizzeria | Naples, Italy | €4,500 |
| pet-store-vancouver | Pet Store | Vancouver, Canada | C$6,200 |
| car-wash-riyadh | Car Wash | Riyadh, Saudi Arabia | SAR 28K |
| daycare-singapore | Daycare | Singapore | S$8,400 |
| ice-cream-barcelona | Ice Cream Shop | Barcelona, Spain | €3,800 |
| tutoring-seoul | Tutoring Center | Seoul, South Korea | ₩5.2M |
| brewery-melbourne | Craft Brewery | Melbourne, Australia | A$7,600 |
| flower-shop-amsterdam | Flower Shop | Amsterdam, Netherlands | €4,100 |
| saas-fintech-lagos | SaaS FinTech | Lagos, Nigeria | $5,200 |
| event-planning-mumbai | Event Planning | Mumbai, India | ₹4.5L |
| cleaning-service-dubai | Cleaning Service | Dubai, UAE | $6,100 |
| photography-studio-prague | Photography Studio | Prague, Czech Republic | €3,600 |
| language-school-mexico-city | Language School | Mexico City, Mexico | $4,200 |
| accounting-firm-zurich | Accounting Firm | Zurich, Switzerland | CHF 14,200 |
| cloud-kitchen-bangkok | Cloud Kitchen | Bangkok, Thailand | ฿180K |
| airbnb-management-lisbon | Airbnb Management | Lisbon, Portugal | €5,400 |
| coworking-cape-town | Coworking Space | Cape Town, South Africa | R85K |
| vet-clinic-madrid | Vet Clinic | Madrid, Spain | €6,800 |
| wine-bar-buenos-aires | Wine Bar | Buenos Aires, Argentina | $3,900 |
| saas-hr-tech-bangalore | SaaS HR Tech | Bangalore, India | $4,500 |
| print-shop-warsaw | Print Shop | Warsaw, Poland | PLN 18K |
| plumbing-business-toronto | Plumbing Business | Toronto, Canada | C$9,200 |

### Required Elements on Every Example Page
1. Business description + city
2. Monthly revenue + gross margin %
3. Break-even month
4. Startup investment range (low–high)
5. LTV:CAC ratio (where applicable)
6. Top 3 risk flags with descriptions
7. Average transaction value (where applicable)
8. CTA top: "Thinking about a similar business? Validate YOUR specific idea →" /app
9. CTA mid: "Run your own analysis free →" /app
10. CTA bottom: "Get your own custom report — 90 seconds, free" /app
11. Related examples section (3 similar by city or category)

---

## 10. ALL 9 LIVE BLOG POSTS — VERIFIED

All live at `aiwmcquantis.com/blog/[slug]`

| Slug | Title |
|------|-------|
| how-to-stress-test-your-startup | How to Stress-Test Your Startup Before Launch (2026) |
| startup-validation-checklist | Startup Validation Checklist: 7 Questions Before You Build |
| ai-vs-spreadsheets-startup-planning | AI vs Spreadsheets for Startup Financial Planning |
| validate-startup-idea-using-ai | How to Validate a Startup Idea Using AI |
| how-to-calculate-startup-costs | How to Calculate Startup Costs (2026 Guide) |
| unit-economics-explained-for-founders | Unit Economics Explained for Founders |
| coffee-shop-startup-costs-by-city | Coffee Shop Startup Costs in 2026: Denver vs Austin vs NYC |
| food-truck-profit-calculator | Food Truck Profit Calculator: Revenue, Costs & ROI by City |
| how-to-validate-restaurant-idea | How to Validate a Restaurant Idea Before Signing a Lease |

### Required Elements on Every Blog Post
1. Title with primary keyword
2. Author: "AIWMC Research Team"
3. Date: "Updated [Month] 2026"
4. 800–1,500 words
5. Inline CTA (mid-article) → relevant /examples page or /app
6. Bottom CTA → /app
7. Internal link to ≥1 example page
8. Internal link to /methodology
9. JSON-LD BlogPosting schema
10. Unique meta description 150–160 chars with primary keyword

---

## 11. INDUSTRY VERTICAL CLASSIFICATION

### Classification Steps
```
1. Extract business description
2. Match primary NAICS code
3. Assign business model archetype
4. Identify primary revenue driver
5. Assign gross margin category
6. Pull benchmarks for vertical × city
```

### Confirmed Live Verticals (from examples + benchmarks)

**FOOD & BEVERAGE**
```
Specialty coffee (Denver): $28,500 rev/mo, 62% GM, break-even M8, LTV:CAC 4.2x
Restaurant upscale (Miami): $95,000 rev/mo, 68% GM, break-even M6, avg check $52
Food truck (Austin): $22,000 rev/mo, 64% GM, break-even M5, avg check $14
```

**PROFESSIONAL SERVICES**
```
Management consulting (NYC): $48,000 rev/mo, 72% GM, break-even M4, LTV:CAC 6.8x
Accounting firm (Zurich): CHF 14,200/mo profit — highest margin in dataset
```

**TECHNOLOGY / SAAS**
```
SaaS project mgmt: $12,400 MRR at M12, 82% GM, break-even M14, LTV:CAC 3.1x, CAC $340
SaaS FinTech (Lagos): $5,200/mo profit
SaaS HR Tech (Bangalore): $4,500/mo profit
Mobile app (SF): $4,600/mo profit
```

**HEALTH & WELLNESS**
```
Dental clinic (Dubai): $62,000 rev/mo, 58% GM, break-even M9, avg procedure $420
Fitness studio (LA): $38,000 rev/mo, 65% GM, break-even M7, avg membership $159/mo
```

**RETAIL & E-COMMERCE**
```
DTC fashion: $34,000 rev/mo, 55% GM, break-even M11, LTV:CAC 2.8x, CAC $85, return rate 18–25%
```

**HOME SERVICES**
```
Barbershop (Houston): $28,000 rev/mo, 72% GM, break-even M4, avg service $35
Cleaning service (Atlanta): $6,800/mo profit
Real estate brokerage (Chicago): $42,000 rev/mo, 45% GM, break-even M5, avg commission $8,400
```

---

## 12. UNIT ECONOMICS ENGINE

### The 12 Core Formulas
```
Revenue        = customers × ARPU  (or transactions × AOV)
COGS           = Revenue × cogs_pct
Gross Profit   = Revenue - COGS
Gross Margin % = Gross_Profit / Revenue × 100
Operating Exp  = S&M + R&D + G&A
Net Profit     = Gross_Profit - Operating_Expenses
Break-even     = month(cumulative_revenue ≥ cumulative_costs)
Startup Inv    = all pre-revenue capital requirements
Payback        = Startup_Investment / monthly_net_profit
LTV            = (ARPU × GM%) / Monthly_Churn_Rate
CAC            = Total_S&M / New_Customers_Acquired
LTV:CAC        = LTV / CAC
Burn Rate      = OpEx - Revenue (when OpEx > Revenue)
```

### LTV:CAC Health Thresholds
```
<1:1     → CRITICAL: every customer is a net loss
1:1–2:1  → HIGH RISK: cannot fund growth
2:1–3:1  → CAUTION: viable but tight, do not scale S&M yet
3:1–5:1  → HEALTHY: standard for growth stage
5:1–10:1 → STRONG: excellent, accelerate acquisition
>10:1    → FLAG: verify inputs; if confirmed note as exceptional
```

### Confirmed LTV:CAC from Live Examples
```
Coffee shop Denver:      4.2x  ← healthy
SaaS project mgmt:       3.1x  ← healthy
Consulting NYC:          6.8x  ← strong
DTC fashion e-commerce:  2.8x  ← caution, flagged in output
```

### CAC Payback Thresholds
```
<6 months  → Excellent
6–12 mo    → Good (SaaS standard)
12–18 mo   → Acceptable (enterprise)
18–24 mo   → Warning
>24 mo     → Critical — flag, cannot fund growth without external capital
```

---

## 13. RISK SCORING SYSTEM

### 5 Risk Categories
```
1. Financial Viability: LTV:CAC <1:1, GM below floor, runway <6 mo, EBITDA neg >M18
2. Market: TAM <$10M, CAGR <0%, competitor >40% share, saturation >2.0×
3. Operational: Labor >45% rev (non-service), single customer >40% rev, burn >150% avg
4. Execution: No GTM, no domain expertise, regulatory approval required
5. External: Seasonality >40% variance, economic sensitivity, regulatory risk
```

### Severity Levels
```
SEVERITY 1 — CRITICAL (red): Must appear TOP of report before any positive metric
SEVERITY 2 — HIGH (amber):   Prominent, specific mitigation required  
SEVERITY 3 — MEDIUM (yellow): Display with monitoring recommendation
SEVERITY 4 — LOW (blue):     Brief mention only
```

### Live Risk Flags Confirmed from Examples
```
Denver coffee:      High downtown rent ($4,800/mo), seasonal variance ±18%, 2,400+ competitors
SaaS PM tool:       CAC $340/customer, 4.8% monthly churn yr1, intense competition [SEVERITY 2]
Miami restaurant:   Labor 38% revenue [SEVERITY 2], food waste 8–12%, tourist dependency
NYC consulting:     Client concentration 60%+ top 3 clients [SEVERITY 1], 3–6 month sales cycles
LA fitness:         Rent $8,200/mo, 22% annual membership churn, ClassPass competition
Dubai dental:       DHA regulatory licensing [SEVERITY 1], $180K+ equipment [SEVERITY 2], expat dependency
Houston barbershop: Stylist turnover 40%+ [SEVERITY 2], foot traffic dependency, price sensitivity
DTC fashion:        CAC $85 social, return rate 18–25%, inventory complexity
Chicago RE:         Market cycle dependency, 6-month deal close, agent retention
Bookstore Lisbon:   Declining category — lowest profit in dataset at €3,100/mo [flag]
```

---

## 14. QUALITY GATES & CONTRADICTION DETECTION

### The 12 Quality Gates (every output, no exceptions)
```
GATE 01: Gross margin within vertical benchmark ±10%
GATE 02: Month 1 revenue ≤ Month 6 revenue
GATE 03: LTV:CAC between 0.1:1 and 20:1
GATE 04: CAC payback between 1 and 60 months
GATE 05: Starting capital ≥ 6 months of modeled burn
GATE 06: Month 1 EBITDA negative (pre-revenue startups)
GATE 07: Revenue growth within historical vertical bounds
GATE 08: Monte Carlo P10 survival probability calculated and displayed
GATE 09: No benchmark numbers repeated across different business types
GATE 10: City-specific adjustments confirmed applied
GATE 11: All risk flags shown — no burial in appendix
GATE 12: Financial disclaimer present
```

If any gate fails → recalculate. Never override a gate.

### Contradiction Matrix
| Contradiction | Action |
|---------------|--------|
| High LTV + high churn | Recalculate LTV with actual churn |
| Low CAC + enterprise B2B | Apply $500 enterprise CAC floor |
| 80%+ GM + physical product | Verify COGS inputs |
| Rapid growth + $0 S&M | Add assumed organic CAC |
| Positive EBITDA month 1 | Always wrong — recalculate |
| Revenue > TAM | Cap at realistic SOM |
| Year 3 market share > 5% | Flag as aggressive, show conservative |
| LTV:CAC healthy AND <1:1 | Mathematical impossibility — resolve |

---

## 15. TIER ARCHITECTURE — FREE / PLUS / CONSULTANT

### FREE — $0/month (confirmed live)
```
Analyses per month:       3 (resets monthly)
Full financial report:    ✓ (confirmed live feature table)
Risk flags & action plan: ✓ (confirmed live)
PDF export:               ✗
Document Studio:          ✗
Location comparison:      ✗
Custom branding:          ✗
Priority support:         ✗
Monte Carlo P10/P90:      ✗ (P50 only)
Full 36-month P&L:        ✗ (quarterly summary only)
Full risk flag detail:    ✗ (title + severity only)
```

### PLUS — $17/month (confirmed live)
```
Analyses per month:       Unlimited
All Free features:        ✓
PDF export:               ✓ (confirmed live)
Document Studio:          ✓ (confirmed live)
Location comparison:      ✓ up to 5 cities (confirmed live)
Custom branding:          ✓ (confirmed live)
Priority support:         ✓ (confirmed live)
Full Monte Carlo P10/P90: ✓
Complete 36-month P&L:    ✓
Full risk flag detail:    ✓ (source + mitigation)
Saved analysis history:   ✓ (unlimited)
Analysis sharing link:    ✓

Annual: $149/year (saves $55 — show as "Save $55/year")
Guarantee: 30-day money-back, no questions asked
```

### CONSULTANT — $49/month (new tier — add to site)
```
Target: Business consultants, financial advisors, accelerator staff,
        MBA programs, anyone screening multiple client/student ideas

All Plus features: ✓
PLUS these exclusive features:
  White-label PDF reports:   ✓ (client branding, Quantis watermark removed)
  Client management portal:  ✓ (organize analyses by client/project folder)
  Bulk analysis:             ✓ (up to 20 analyses at once via CSV upload)
  Team seats:                2 included (+$15/seat/month additional)
  API access:                ✓ (100 calls/month, documented endpoints)
  Priority analysis queue:   ✓ (processed before Free and Plus)
  Dedicated email support:   ✓ (<24hr response SLA)
  Usage analytics:           ✓ (track analyses per client, per period)
  Export formats:            ✓ (PDF, Excel, JSON)

Annual: $469/year (saves $119 — show as "Save $119/year")
Guarantee: 30-day money-back on first charge

ROI CASE — use in all Consultant tier marketing:
  4 client pre-screenings/month × 2 hours saved × $200/hr = $1,600 saved
  Cost: $49/month
  ROI: 3,165% — "saves its cost in the first client screening"

Landing page: /consultants (build this page)
Positioning: "Run client pre-screening in 90 seconds — 
             know which ideas are viable before you invest billable hours"
```

### Paywall Trigger Points
```
TRIGGER 1 — 4th analysis attempt (Free):
  Hard gate
  "You've used all 3 free analyses this month.
  Upgrade to Plus for unlimited analyses — $17/month, cancel anytime."

TRIGGER 2 — Blur wall on premium sections:
  Soft gate (user sees blurred content + upgrade inline)
  "Upgrade to Plus to see the full picture"

TRIGGER 3 — PDF export (Free):
  Hard gate — "PDF export is a Plus feature"

TRIGGER 4 — Location comparison (Free):
  Hard gate — "Compare across up to 5 cities with Plus"

TRIGGER 5 — White-label PDF (Plus user):
  Hard gate → show Consultant tier
  "Remove Quantis branding for client reports — Consultant plan"

TRIGGER 6 — Bulk analysis (Plus user):
  Hard gate → show Consultant tier
  "Analyze multiple ideas at once — Consultant plan"

TRIGGER 7 — API access request:
  Hard gate → show Consultant tier

COUNTER DISPLAY:
  After analysis 2: "1 free analysis remaining this month"
  After analysis 3: Upgrade modal with full comparison table
  Before limit: No counter (don't remind proactively)
```

---

## 16. OUTPUT SCHEMA STANDARDS

```json
{
  "analysis_id": "uuid",
  "version": "4.0.0",
  "created_at": "ISO8601",
  "tier": "free|plus|consultant",
  "input": {
    "raw_description": "string",
    "business_type": "string",
    "naics_code": "string",
    "city": "string",
    "city_tier": "1|2|3|international",
    "currency": "USD|EUR|GBP|...",
    "business_model": "SaaS|Marketplace|Services|Physical|Ecommerce|Hybrid",
    "pricing_model": "Subscription|Transaction|Usage|Freemium|One-time|Hourly",
    "starting_capital": "number|null",
    "team_size": "integer"
  },
  "benchmark_match": {
    "matched_type": "string",
    "comparables_count": "integer",
    "sources": ["SBA","IBISWorld","Census","BLS","OECD","Proprietary"],
    "confidence_score": "0.0-1.0",
    "city_adjusted": "boolean",
    "proxy_used": "boolean",
    "proxy_disclosure": "string|null"
  },
  "twelve_variables": {
    "revenue_monthly_p50": "number",
    "cogs_monthly": "number",
    "gross_margin_pct": "number",
    "operating_expenses_monthly": "number",
    "net_profit_monthly": "number",
    "breakeven_month_p50": "integer",
    "startup_investment": {"low":"number","median":"number","high":"number"},
    "payback_period_months": "number",
    "ltv": "number",
    "cac": "number",
    "ltv_cac_ratio": "number",
    "monthly_burn_rate": "number|null"
  },
  "monte_carlo": {
    "iterations": 1000,
    "revenue_month_12": {"p10":"number","p50":"number","p90":"number"},
    "revenue_month_24": {"p10":"number","p50":"number","p90":"number"},
    "revenue_month_36": {"p10":"number","p50":"number","p90":"number"},
    "survival_probability": {
      "month_12": "0.0-1.0",
      "month_24": "0.0-1.0",
      "cashflow_positive_by_36": "0.0-1.0"
    },
    "breakeven_month": {"p10":"integer","p50":"integer","p90":"integer"},
    "top_risk_drivers": [{"variable":"string","impact":"string"}]
  },
  "pnl_36_month": [{"month":1,"...":"see Section 6"}],
  "validation_score": {
    "overall": "0-100",
    "verdict": "STRONG PROCEED|PROCEED WITH CAUTION|PIVOT RECOMMENDED|DO NOT PROCEED",
    "dimensions": {
      "market_opportunity": "0-20",
      "unit_economics": "0-20",
      "financial_viability": "0-20",
      "competitive_position": "0-20",
      "execution_risk": "0-20"
    }
  },
  "risk_flags": [{
    "risk_id": "string",
    "category": "Financial|Market|Operational|Execution|External",
    "severity": "1|2|3|4",
    "title": "string",
    "current_value": "string",
    "threshold": "string",
    "business_impact": "string",
    "source": "string",
    "recommended_action": "string",
    "urgency": "string"
  }],
  "market_sizing": {"tam":"number","sam":"number","som":"number","currency":"string"},
  "strengths": ["string"],
  "critical_assumptions": ["string"],
  "launch_checklist": ["string"],
  "disclaimer": "See Section 24",
  "tier_gates": {
    "monte_carlo_p10_p90_visible": "boolean (Plus/Consultant only)",
    "full_pnl_visible": "boolean (Plus/Consultant only)",
    "risk_flag_detail_visible": "boolean (Plus/Consultant only)",
    "pdf_export_available": "boolean (Plus/Consultant only)",
    "white_label_available": "boolean (Consultant only)",
    "bulk_analysis_available": "boolean (Consultant only)",
    "api_access_available": "boolean (Consultant only)"
  }
}
```

---

## 17. VALIDATION SCORE ALGORITHM

### Scoring (max 20 per dimension, 100 total)
```
MARKET OPPORTUNITY (0–20):
  TAM >$1B:+5 | $100M–$1B:+4 | $10M–$100M:+3 | <$10M:+0
  CAGR >5%:+5 | 0–5%:+3 | <0%:+0
  Low competition:+5 | Moderate:+3 | Red ocean:+1 | Clear niche:+5

UNIT ECONOMICS (0–20):
  LTV:CAC >5:1:+8 | 3–5:+6 | 1–3:+3 | <1:+0
  Payback <12mo:+6 | 12–24mo:+4 | >24mo:+1
  GM above avg:+6 | At avg:+4 | Below floor:+0

FINANCIAL VIABILITY (0–20):
  Runway >18mo:+8 | 12–18mo:+6 | 6–12mo:+3 | <6mo:+0
  P50 positive by M24:+6 | M36:+4 | Never:+0
  Capital matches model:+6

COMPETITIVE POSITION (0–20):
  Clear differentiation:+6 | Price only:+2 | None:+0
  Identified moat:+8 | Some defensibility:+4 | Commodity:+0
  Niche dominance possible:+6

EXECUTION RISK (0–20):
  Domain expertise:+6 | None:+2
  Team 2+:+4 | Solo:+2
  Clear GTM:+4 | Vague:+1
  No regulatory risk:+6 | Regulatory required:+1
  Proven model:+6 | Novel:+2
```

### Verdicts
```
80–100: STRONG PROCEED
60–79:  PROCEED WITH CAUTION
40–59:  PIVOT RECOMMENDED
0–39:   DO NOT PROCEED
```

---

## 18. USER FLOW & ACTIVATION LOGIC

### The 5-Step Flow
```
STEP 1 — Input:
  Single text input + city selector
  Placeholder: "e.g., Coffee shop with remote work focus in Denver, Colorado"
  Min 10 chars + valid city

STEP 2 — Processing (≤90 seconds):
  Progress labels matching 7-layer architecture:
  "Classifying business type..." → "Matching 95,500 benchmarks..." →
  "Adjusting for [city]..." → "Running dual-AI consensus..." →
  "Running 1,000 Monte Carlo simulations..." → "Running sanity checks..." →
  "Reconciling historical data..." → "Attributing sources..." → "Report ready"

STEP 3 — Aha Moment (first visible, no scroll):
  Validation Score → Verdict → P50 revenue M12 → Top risk flag
  Must fit 375px mobile viewport

STEP 4 — Exploration:
  Score → Verdict → 12 variables → MC chart → P&L summary →
  Risk flags → Strengths → Launch checklist
  Free tier blur: P10/P90, monthly P&L, risk detail

STEP 5 — Conversion (after ≥60% scroll):
  Unauthenticated: "Save this analysis — it's free"
  At limit: Full upgrade modal with 3-tier comparison
  Exit intent: "Your analysis is unsaved — create a free account"
```

### Post-Capture Email Sequence
```
Day 0: Confirmation + how to use results
Day 2: Founder fear story (near-miss, validation saved them)
Day 4: Monte Carlo explained simply (feature reveal)
Day 6: Case study matching their analyzed business type
Day 8: Direct upgrade — $17/month, 30-day guarantee
```

---

## 19. PRICING & REVENUE LOGIC

### Tier Summary
```
FREE:             $0/month     3 analyses, limited output
PLUS:             $17/month    Unlimited, full output
PLUS ANNUAL:      $149/year    Save $55 (8.76 months free)
CONSULTANT:       $49/month    White-label, bulk, API, teams
CONSULTANT ANN:   $469/year    Save $119
```

### The $17 Price Point Logic
- Below $20 psychological ceiling for professional software
- Anchors against $1,500–$25,000 consultant (feels free by comparison)
- Matches Notion ($16), Grammarly ($15) mental model
- Odd pricing signals confidence

### The $49 Consultant Price Point Logic
- B2B target: less price-sensitive, higher LTV
- 4 screenings/month × 2hrs × $200/hr = $1,600 value → 3,165% ROI at $49
- White-label = consultants distribute Quantis brand silently
- Fills gap between Plus ($17) and Enterprise (custom)
- Annual at $469 creates strong lock-in for consultant workflows

### Revenue Math
```
$10K MRR scenarios:
  A) Plus only:  588 Plus subscribers ($10,016)
  B) Mixed:      300 Plus + 100 Consultant = $5,100 + $4,900 = $10,000
  C) Consultant: 205 Consultant subscribers = $10,045

Current: ~526 monthly visitors, 13 free users, $0 MRR
Path to $1,700 MRR (100 paid users): Month 6 target
Path to $10,000 MRR: Month 12 target
```

---

## 20. GROSS MARGIN BY BUSINESS TYPE

| Business Type | Confirmed (live) | Benchmark Range | Minimum Floor |
|---------------|-----------------|-----------------|--------------|
| SaaS B2B | 82% (PM tool) | 70–88% | 65% |
| Management Consulting | 72% (NYC) | 68–85% | 60% |
| Barbershop | 72% (Houston) | 68–78% | 60% |
| Restaurant (upscale) | 68% (Miami) | 60–72% | 55% |
| Food truck | 64% (Austin) | 55–70% | 50% |
| Fitness studio | 65% (LA) | 50–68% | 45% |
| Specialty coffee | 62% (Denver) | 62–74% | 58% |
| DTC e-commerce | 55% (fashion) | 45–62% | 38% |
| Dental clinic | 58% (Dubai) | 52–68% | 45% |
| Real estate brokerage | 45% (Chicago) | 40–60% | 35% |
| Pharmacy | ~35% (Toronto est.) | 22–38% | 20% |
| Dropshipping | ~25% (online est.) | 15–35% | 12% |

**Rule:** If user's stated margins fall outside their vertical range, flag it and explain — do not silently accept.

---

## 21. ANTI-HALLUCINATION RULES

1. Never invent a comparable company — only real, verified companies
2. Never state market size without source category
3. Never fake Monte Carlo — 1,000 real iterations only, never LLM-generated ranges
4. Never capitulate to user pressure — run quality gates regardless of their confidence
5. Never produce suspiciously round numbers without noting they are approximations
6. Confirmed live examples must match exactly — never contradict them:
   - Denver coffee: $28,500 rev/mo, 62% GM, break-even M8, LTV:CAC 4.2x
   - Miami restaurant: $95,000 rev/mo, 68% GM, break-even M6
   - NYC consulting: $48,000 rev/mo, 72% GM, break-even M4, LTV:CAC 6.8x
   - SaaS PM tool: $12,400 MRR at M12, 82% GM, break-even M14, LTV:CAC 3.1x

### Language Standards
```
HIGH CONFIDENCE (≥0.80):
  "Based on 847 comparable specialty coffee shop benchmarks in Denver..."
MEDIUM CONFIDENCE (0.60–0.79):
  "Based on 124 comparable benchmarks in this vertical..."
LOW CONFIDENCE (0.40–0.59):
  "Based on limited comparables (67). Treat as directional..."
PROXY USED (<0.40):
  "No direct benchmark for [type] in [city]. Using [proxy]. Validate before committing capital."
ASSUMPTION (no data):
  "No benchmark available. Assuming [value] based on [rationale]. High sensitivity — verify."
```

---

## 22. SESSION MEMORY & LEARNING PROTOCOL

### Per-Session Logging
```json
{
  "session_id": "uuid",
  "business_type": "string",
  "vertical": "string",
  "city": "string",
  "gates_triggered": [],
  "contradictions_caught": [],
  "user_corrections": [],
  "confidence_score": "number",
  "actual_outcome_reported": null
}
```

### Accuracy Feedback Loop
```
User corrects projection → log delta + reason
5+ users correct same metric for same vertical:
  → Flag benchmark for review
  → Widen uncertainty 20% for that metric
  → Queue for manual update

Actual outcome vs P10/P50/P90:
  < P10: Too optimistic → increase pessimism bias for vertical
  P10–P90: Good calibration → reinforce
  > P90: Too conservative → adjust upward
```

---

## 23. COPY & MESSAGING STANDARDS

### Confirmed Live Copy (do not change without updating this file)
```
H1:           "AIWMC™ Quantis — AI Business Validation & Risk Stress-Testing"
Hero:         "90% of businesses fail in 5 years. Most had a plan — none had validation.
               A financial consultant charges $1,500–$25,000 to stress-test your model.
               Quantis does it in 90 seconds with 95,500 real benchmarks. Free."
Meta desc:    "Stress-test your business idea in 90 seconds. AI-powered financial
               pre-mortem with 95,500 real benchmarks. Free to start."
OG desc:      "Quantis runs 1,000+ financial simulations on your business model
               and gives you a proceed/pivot/kill verdict. Free. No signup."
Twitter:      "Quantis — 90% of Businesses Fail. Yours Doesn't Have To | Free AI Validation"
```

### Canonical Terminology
```
✓ USE: "financial pre-mortem" (live on site, official category)
✓ USE: "stress-test" (primary verb)
✓ USE: "95,500 real benchmarks" (never "1,000+" — retired)
✓ USE: "90 seconds" (primary speed claim)
✓ USE: "proceed/pivot/kill verdict"
✓ USE: "P10/P50/P90"
✓ USE: "deterministic financial engine" (live terminology)
✓ USE: "7-layer AI safety architecture" (live trust claim)
✓ USE: "12 financial variables" (live output claim)
✓ USE: "AIWMC™ LLC" in footer and legal contexts

✗ AVOID: "AIWMC AI Agency LLC" in public copy
✗ AVOID: "1,000+ benchmarks" (retired)
✗ AVOID: "business plan generator"
✗ AVOID: "AI chatbot"
```

### Value Anchors
```
Primary:    "A financial consultant charges $1,500–$25,000"
Secondary:  "Quantis does it in 90 seconds"
Data:       "Same data sources: SBA, IBISWorld, Census Bureau"
Consultant: "Saves 2+ hours per client screening at $200/hr = $400+/month value"
```

---

## 24. LEGAL & COMPLIANCE LAYER

### Required Disclaimer (every output, every tier, no exception)
> "This analysis is generated using statistical benchmarks and probabilistic modeling for informational purposes only. It does not constitute financial, legal, investment, or business advice. All projections are estimates based on industry data and are not guarantees of future performance. Past benchmark performance does not guarantee future results. Consult a licensed financial advisor, accountant, or attorney before making significant business or investment decisions. AIWMC™ LLC is not liable for business outcomes, losses, or decisions made based on this analysis."

### Intellectual Property
```
Trademark:    AIWMC™ (USPTO Serial #99538355, pending)
Product:      AIWMC™ Quantis
Entity:       AIWMC™ LLC, Denver, Colorado
Twitter:      @aiwmcquantis
Domain:       aiwmcquantis.com

Benchmark data: Licensed or public domain (SBA, IBISWorld, Census, BLS, OECD)
                Do not claim proprietary ownership of these sources
Analysis outputs: Original work product of the AIWMC Quantis engine — proprietary
```

### What Quantis Is Legally
```
✓ Business analytics and modeling tool
✓ Benchmark-based financial estimation service
✓ Educational resource for founders

✗ NOT a registered investment advisor
✗ NOT a licensed financial planner
✗ NOT a CPA or accounting service
✗ NOT a securities broker-dealer
```

### Data Privacy
```
Collected: Email (optional), business descriptions, analysis outputs
PII: Email only — no name, phone, payment data beyond Stripe token
Retention: Anonymized after 90 days
GDPR: Users can request full deletion
CCPA: California residents can opt out of anonymized benchmark use
Age: Service not intended for users under 18
```

---

## 25. KEY FORMULAS REFERENCE

```
# THE 12 VARIABLES
Revenue           = customers × ARPU  (or transactions × AOV)
COGS              = Revenue × cogs_pct
Gross Profit      = Revenue - COGS
Gross Margin %    = Gross_Profit / Revenue × 100
Operating Exp     = S&M + R&D + G&A
Net Profit        = Gross_Profit - Operating_Expenses
Break-even Month  = month(cumulative_revenue ≥ cumulative_costs)
Startup Inv       = all pre-revenue capital requirements
Payback Period    = Startup_Investment / monthly_net_profit
LTV               = (ARPU × GM%) / Monthly_Churn_Rate
CAC               = Total_S&M / New_Customers_Acquired
LTV:CAC           = LTV / CAC
Burn Rate         = OpEx - Revenue (when OpEx > Revenue)

# DERIVED METRICS
ARR               = MRR × 12
Runway            = Cash / Monthly_Net_Burn
NRR               = ((MRR_start + Expansion - Churn) / MRR_start) × 100
Magic Number      = (Net_New_ARR × GM%) / Prior_Quarter_S&M
CAC Payback (mo)  = CAC / (ARPU × GM%)
TAM               = Total_Market_Volume × Avg_Revenue_Per_Unit
SAM               = TAM × City_Penetration × Vertical_Addressability
SOM               = SAM × Realistic_Capture_Rate
```

---

## 26. ERROR CODES

```
ERR_001: Business type not classifiable → request clarification
ERR_002: City not in database → nearest tier, disclose
ERR_003: Benchmark <10 comparables → widen confidence intervals
ERR_004: Quality gate failure → block, recalculate
ERR_005: Monte Carlo convergence failure → retry with adjusted parameters
ERR_006: Starting capital below 6-month burn → flag runway risk
ERR_007: LTV:CAC ≤ 0 → input error, cannot proceed
ERR_008: Revenue projection exceeds TAM → cap at realistic SOM
ERR_009: Analysis timeout >120 seconds → partial result returned
ERR_010: Contradiction detected → disclosed in output
ERR_011: Currency not supported → default USD with disclosure
ERR_012: Dual-AI consensus failed >15% delta → reconcile before output
ERR_013: Layer 6 outlier >2σ → correction applied, disclosed
ERR_014: Consultant API rate limit → request queued
ERR_015: Bulk CSV parse failure → row-level error detail returned
```

---

*AIWMC™ Quantis Business Logic v4.0.0*  
*Live site synced: aiwmcquantis.com — April 2026*  
*© 2026 AIWMC™ LLC, Denver, Colorado*  
*USPTO Trademark Serial #99538355*  
*Single source of truth — update this file whenever the product changes.*  
*Place in repository at: `/docs/QUANTIS_BUSINESS_LOGIC.md`*
