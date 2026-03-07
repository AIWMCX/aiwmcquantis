

# Landing Page Marketing Refresh — Reflecting New Engine Capabilities

The landing page currently sells a "stress-testing" and "benchmark-matching" tool. We've now built a **Bayesian Market Prior Engine** (anomaly cards, percentile scoring, z-scores) and **SCORE-native I/O** (import/export, compliance indicator). The marketing copy, sections, and proof points need to reflect this evolution — naturally, without sounding like a feature changelog.

---

## Philosophy

The tone shifts from "we have benchmarks" to **"we grade your numbers against the market's actual distribution."** This is how a senior FP&A partner talks — not features, but *consequences*. The SCORE interoperability positions Quantis as the tool advisors and lenders already trust, not a replacement for their workflow.

---

## Changes

### 1. Hero Copy Update (`MobileHero.tsx`)

**Current:** "AI Business Validation and Risk Stress-Testing for Startups"

**New:**
```
AI Business Validation and Financial Intelligence for Startups
```

Sub-copy update:
```
Type your business idea. Get profit projections, risk flags, market
percentile scoring, and an advisor-ready action plan — free, in under 3 minutes.
```

Bullet updates:
- "Find out if your model survives revenue and cost shocks." → stays
- "See which assumptions are fragile before you talk to investors." → stays
- NEW: "Know exactly where your numbers sit vs. your peer group — by percentile, not guesswork."

### 2. Hero Variants (`HeroVariants.tsx`)

Update the A/B test variants to include the new positioning:
- **control:** "AI Business Validation & Financial Intelligence in Under 3 Minutes" / "Get structured projections, percentile-ranked metrics, and advisor-ready SCORE exports — free."
- **numbers_first:** "Financial Intelligence, Market Percentiles & Risk Signals — in 3 Minutes"
- **action_focused:** "Validate Before You Build — AI Financial Intelligence"

### 3. HowItWorks — Step 2 Rewrite (`HowItWorksSection.tsx`)

**Current Step 2:** "Quantis Runs Stress Scenarios — Revenue drops, cost spikes, growth stalls — modeled against 1,000+ benchmarks."

**New Step 2:** "Quantis Scores Against Market Reality — Your numbers are ranked against sector distributions: margins, unit economics, cost structure. Outliers are flagged with percentile context."

**Current Step 3:** "You Get a Survival Report"

**New Step 3:** "You Get an Advisor-Ready Report — Projections, anomaly cards, SCORE-compatible exports, and an action plan — in under 60 seconds."

Also update the section subtitle:
- "Powered by a 12-variable financial system" → "Powered by a 12-variable financial system with Bayesian market priors across 50+ sectors"

### 4. BeforeAfterComparison — New "With" Items (`BeforeAfterComparison.tsx`)

Replace the current WITH_ITEMS to reflect actual differentiation:
```
'Percentile-ranked metrics against real sector data'
'SCORE-format exports accepted by lenders and advisors'
'Anomaly detection flags what's off — and explains why'
'Interactive dashboards you can update anytime'
```

### 5. DemoPreview — Add Anomaly Card Preview (`DemoPreview.tsx`)

Add a 4th metric to each industry demo: a mini "Market Position" indicator showing a percentile rank. For example:
- Coffee Shop: `Market Position: 72nd percentile` (subValue: "Above average for your peer group")
- SaaS App: `Market Position: 58th percentile` (subValue: "In-line with sector median")
- E-commerce: `Market Position: 85th percentile` (subValue: "Strong unit economics vs. peers")

This previews the Anomaly Card concept before the user even signs up.

### 6. ResultsTicker — Add Market Prior Metrics (`ResultsTicker.tsx`)

Add 2 new ticker items that showcase the new engine:
```
{ label: 'Peer Percentile', value: '72nd', color: 'text-primary', business: 'Bakery', location: 'Chicago' }
{ label: 'SCORE Ready', value: '94%', color: 'text-success', business: 'SaaS', location: 'Seattle' }
```

### 7. WhoItsFor — Add Advisor Proof Point (`WhoItsFor.tsx`)

Update the "Investors & Advisors" persona bullets:
- Current: "Compare a founder's projections against industry benchmarks."
- New: "See where a founder's numbers rank in their sector's actual distribution — not just ranges, but percentiles."
- Add: "Export any analysis as a SCORE-format file that lenders and accelerators accept directly."

### 8. FAQSection — 2 New Questions (`FAQSection.tsx`)

Add after "How accurate are the financial projections?":

**"What is percentile scoring?"**
"Every metric in your analysis — margins, unit economics, cost structure — is ranked against the statistical distribution of businesses in your sector. Instead of 'your margin is between 10-30%,' Quantis tells you 'your margin is in the 72nd percentile — higher than 72% of comparable businesses.' This turns benchmarks into actionable intelligence."

**"What is SCORE compatibility?"**
"SCORE is the standard financial template used by SBA advisors, lenders, and accelerators across the US. Quantis can import SCORE-format spreadsheets and export any analysis as a SCORE-compatible file — so your report works directly with the people who fund and advise small businesses."

### 9. PricingSection — Feature List Update (`PricingSection.tsx`)

Update PLUS_FEATURES:
- "Advanced financial modeling" subtext → "12-variable projections with percentile scoring and anomaly detection"
- Add new feature: `{ text: 'SCORE-format exports', highlight: false, subtext: 'Advisor and lender-ready financial reports' }`
- Add new feature: `{ text: 'Market percentile scoring', highlight: true, subtext: 'Know where your numbers rank in your sector' }`

### 10. Bottom CTA Copy Update (`Landing.tsx`)

**Current:** "Your Idea Deserves Real Numbers"
**New:** "Your Idea Deserves Market-Grade Intelligence"

Sub-copy: "Revenue projections, percentile-ranked metrics, anomaly flags, and a SCORE-ready action plan — free, no credit card, results in under 3 minutes."

---

## Files Summary

| File | Change |
|------|--------|
| `src/components/landing/MobileHero.tsx` | H1, sub-copy, bullets |
| `src/components/landing/HeroVariants.tsx` | A/B variant copy |
| `src/components/landing/HowItWorksSection.tsx` | Steps 2-3 rewrite, subtitle |
| `src/components/landing/BeforeAfterComparison.tsx` | "With" items |
| `src/components/landing/DemoPreview.tsx` | 4th metric per demo |
| `src/components/landing/ResultsTicker.tsx` | 2 new ticker items |
| `src/components/landing/WhoItsFor.tsx` | Advisor persona bullets |
| `src/components/landing/FAQSection.tsx` | 2 new Q&As |
| `src/components/landing/PricingSection.tsx` | Feature list updates |
| `src/pages/Landing.tsx` | Bottom CTA copy |

No structural or architectural changes. Pure copy and data updates that reflect what the engine now actually does.

