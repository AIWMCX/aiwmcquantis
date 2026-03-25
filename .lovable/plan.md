# Cinematic "Founder vs Reality" Landing Page — Complete Overhaul

## What Changes

The current landing page is a generic centered-hero SaaS page. This overhaul transforms it into a cinematic, founder-led, conversion-tuned experience with 7 distinct sections that tell a story: **your face → what you built → proof → how it works → deep example → why you built it → footer**.

---

## Section Architecture (top to bottom)

### 1. Hero: "Founder vs Reality" — Rewrite `MobileHero.tsx`

**Layout:** Two-column split on desktop, stacked on mobile.

- **Left column:** Founder portrait placeholder (cinematic gradient silhouette with initials — you replace with your real photo later). Overlaid quote: *"Most tools help you present your idea nicely. I wanted the one that tells you if it survives."*
- **Right column:**
  - Eyebrow pill: "Financial Pre-Mortem Engine · Dual-AI Verified"
  - H1 (two lines, cinematic scale ~48-56px): *"I built an AI that tells founders the truth."* / *"Before investors and reality do."*
  - Subtitle: the 1,000+ futures / proceed-pivot-kill copy
  - Primary CTA: "Run my 90-second pre-mortem →"
  - Secondary: "View a real report →"
  - Trust strip: "No card · One free analysis" + "1,000+ benchmarks · SOC 2 ready"
- **Below both columns:** Glassy instrument panel card with 4 animated metrics (Break-Even, Revenue M12, Runway, Risk Score) + label "Example: Specialty coffee shop in Austin, TX — HIGH RISK"

### 2. "What Quantis Actually Does" — New `QuantisOutputs.tsx`

Three premium glass cards, one per output engine:

- **BI Report** — 36-month P&L, unit economics, benchmarks. "See if your model ever pays back and why."
- **Pre-Mortem Analysis** — "We assume your business failed in 18 months, then explain how." Top 5 failure stories.
- **Invoice Capacity Check** — Revenue vs projection, margin health, payment risk.

Each card has an icon, title, description, bullet, and "See sample section →" scroll link.

### 3. Social Proof: "Vetted by Operators" — Rewrite `Testimonials.tsx`

Replace current use-case cards with testimonial-style quotes:

- 3-4 pull-quotes with avatar circles (initials), names, roles
- Example: *"This is the first tool that argues with my assumptions instead of nodding along."*
- Below: small text strip "Used by: early-stage founders, advisors, lenders"

### 4. "How It Works in 90 Seconds" — Update `HowItWorksSection.tsx`

Strip down to just the 3-step section with updated copy:

1. "Tell us what you know" — Industry, city, a few numbers
2. "Quantis simulates 1,000 futures" — Dual-AI, stress-tests, pre-mortem
3. "You get an investor-grade dossier" — Verdict, P&L, risk matrix, launch plan

Remove the Example Gallery, Trust Stats, and Feature Highlights sub-sections (they're redundant with new sections). Keep the final CTA: "Run my first analysis free".

### 5. "Open the Hood" — Deep Example — New `OpenTheHood.tsx`

Split layout:

- **Left:** CSS-rendered stylized report page previews (Financial Summary, Risk Matrix, Launch Timeline cards with blurred placeholder numbers, clear headings)
- **Right:** Three problem→solution mappings:
  - "Can I survive 18 months?" → survivability + runway
  - "What will likely kill me?" → risk matrix + pre-mortem
  - "What should I do next?" → launch timeline + 90-day plan
- Button: "Download example report (PDF)" → links to `/examples`

### 6. "Why I Built Quantis" — New `FounderStory.tsx`

Dark, high-contrast section:

- Smaller founder portrait (same placeholder, left-aligned)
- 3-4 sentence first-person narrative
- "My promise:" checklist with 3 items (no hype numbers, logged assumptions, honest estimation)
- CTA: "Run your pre-mortem with me now →"

### 7. Footer — Minor update to `Footer.tsx`

Add governance line: *"Quantis is decision support, not investment advice. Always combine with human judgment."*
Add links for Security (SOC2) and Docs.

---

## Landing.tsx — Section Order

Remove: `BeforeAfterComparison`, `ROICalculator`, `WhoItsFor`, `RiskGalleryTeaser`, `TrustLogos`, `DemoPreview`, `ResultsTicker`

New order:

1. `UrgencyBanner` (keep)
2. Nav (keep)
3. `MobileHero` (rewritten)
4. `QuantisOutputs` (new)
5. `Testimonials` (rewritten)
6. `HowItWorksSection` (trimmed)
7. `OpenTheHood` (new)
8. `FounderStory` (new)
9. `LeadCaptureInline` (keep)
10. `PricingSection` (keep)
11. `FAQSection` (keep)
12. Bottom CTA (keep)
13. `Footer` (updated)

---

## Files Summary


| File                                           | Action                                                            |
| ---------------------------------------------- | ----------------------------------------------------------------- |
| `src/components/landing/MobileHero.tsx`        | **Rewrite** — split hero with founder portrait + instrument panel |
| `src/components/landing/QuantisOutputs.tsx`    | **New** — three output engine cards                               |
| `src/components/landing/Testimonials.tsx`      | **Rewrite** — operator testimonial quotes                         |
| `src/components/landing/HowItWorksSection.tsx` | **Simplify** — 3 steps only, remove gallery/stats/features        |
| `src/components/landing/OpenTheHood.tsx`       | **New** — deep example band                                       |
| `src/components/landing/FounderStory.tsx`      | **New** — personal narrative + promise                            |
| `src/components/layout/Footer.tsx`             | **Update** — add governance line + links                          |
| `src/pages/Landing.tsx`                        | **Update** — new section order, remove redundant components       |


## Founder Portrait

A cinematic gradient silhouette placeholder will be used with clear code comments marking where to swap in your real high-resolution photo. The placeholder will use your brand colors as a dramatic gradient with initials overlay.

## Implementation Order

1. `MobileHero.tsx` — the face, biggest visual impact
2. `QuantisOutputs.tsx` — what you do
3. `OpenTheHood.tsx` — deep product proof
4. `FounderStory.tsx` — personal narrative
5. `Testimonials.tsx` — social proof
6. `HowItWorksSection.tsx` — simplify
7. `Landing.tsx` + `Footer.tsx` — wire together This overhaul plan is already complete and coherent; you can ship it as your “cinematic founder” landing without adding more structure.aiwmcquantis+3
  To make it truly unbeatable, focus on **three things while you implement**:
  1. **Hero = your face + instrument panel.**
    - Treat `MobileHero.tsx` as the single most important file: your portrait, the “I built an AI that tells founders the truth” headline, and the live example panel must feel like one cinematic scene, not two blocks.aiwmcquantis+2
  2. **Proof stacked immediately after promise.**
    - `QuantisOutputs.tsx` + `OpenTheHood.tsx` together should prove that you deliver a 36‑month BI report, pre‑mortem, and invoice capacity check, with the coffee‑shop PDF as the concrete artifact people can download and touch.Quantis_Executive_Report_Specialty_coffee_shop_with_rem_2026-03-25.pdf​instagram+1
  3. **You as the narrative spine.**
    - Make sure `FounderStory.tsx` and the testimonial quotes echo the same story that appears in your posts: you saw founders fail because nobody told them the financial truth early enough, and Quantis is your answer to that.linkedin+4
  If you wire the sections in the order you wrote, keep the copy sharp, and actually plug in your real photo and example report, this landing page will feel like a serious, personal, “unbreakable” product face — not a generic SaaS template.