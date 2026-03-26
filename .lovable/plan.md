

# Cinematic Hero Demo Dashboard + Analysis UX Overhaul

## Summary
Replace the static founder-portrait hero with the user-provided interactive `QuantisHeroDemo` component (a live, switchable dashboard showing real analysis outputs per industry). Then apply the same visual richness and interaction patterns to the actual analysis dashboard. Fix pricing presentation. Add explanatory tooltips throughout.

---

## Part 1: Landing Page Hero — Replace Portrait with Live Demo Dashboard

### File: `src/components/landing/QuantisHeroDemo.tsx` (NEW)
- Port the user-provided `QuantisHeroDemo` component into the project as a proper TypeScript React component
- Replace the raw Anthropic API call in "Generate Idea" with a Lovable AI edge function call (using `google/gemini-2.5-flash`)
- Use Recharts (already in project) for the revenue chart
- Keep all 5 industry tabs (SaaS, Coffee Shop, Restaurant, Fitness, Ecommerce) with pre-computed data
- Keep all 3 depth selectors (Quick/Full/Deep) that visually change what sections are shown
- Keep the metric hover tooltips explaining Break-even, Revenue M12, Runway, Risk Score
- Keep the Monte Carlo section (Deep only), risk factors, insights panels
- Style using existing Quantis CSS variables (`--q-bg-surface`, `--q-accent-primary`, etc.) instead of inline hex colors

### File: `src/components/landing/MobileHero.tsx` (MODIFY)
- Replace the LEFT column (founder portrait + self-quote, lines 79-101) with `<QuantisHeroDemo />`
- Keep the RIGHT column copy, CTAs, and trust strip exactly as-is
- On mobile (`<lg`), show the demo below the CTA section (order-2)
- Remove the bottom "Instrument Panel" (lines 185-232) since the demo now contains those metrics interactively

### File: `supabase/functions/generate-idea/index.ts` (NEW)
- Edge function that calls Lovable AI (Gemini 2.5 Flash) to generate a financially-calculable business idea for a given industry
- Returns JSON with: idea, differentiator, startingCapital, pricePerCustomer, customersAtLaunch, monthlyOpCosts, estimatedBreakEven, estimatedRevM12, riskNote
- CORS configured for `.lovableproject.com`, `.lovable.app`, `.lovable.dev`

---

## Part 2: Analysis Dashboard Improvements

### File: `src/components/analysis/WizardForm.tsx` (MODIFY)
**A. Depth Selector Visual Differentiation (lines 593-615)**
- Replace the 3 identical-looking radio labels with visually distinct cards:
  - **Quick** (cyan accent): "Gut check" badge, 3 tags (Break-even, Revenue M12, Risk score), minimal
  - **Full** (blue accent, "Recommended" badge): All metrics + Revenue chart + Risk breakdown + Insights
  - **Deep** (purple accent, "CFO-grade" badge): All in Full + Monte Carlo + 5-yr projection + PDF export
- Each card gets a colored top-border accent, distinct background tint, and tag chips showing what's included

**B. Field Explanation Tooltips**
- Wrap each form field label (Starting Capital, Price Per Customer, Customers at Launch, Monthly Op. Costs, CAC, Churn) with a small `(?)` icon
- On click, show a styled tooltip panel (Quantis blue border, dark bg) with:
  - What this field means in plain English
  - Why it matters for the analysis
  - Example value for context
- Use existing `Tooltip`/`TooltipContent` from shadcn

**C. "Generate Idea" Button**
- Add a button below the industry selector: "No idea? Let Quantis generate one →"
- Calls the new `generate-idea` edge function with the selected industry
- Pre-fills the form fields (idea text, capital, price, customers, costs) with the generated values
- Styled with blue accent, sparkle icon

### File: `src/styles/quantis-design-system.css` or equivalent (MODIFY)
- Add richer accent colors for dashboard panels:
  - Cyan for financial metrics
  - Purple for Monte Carlo / advanced
  - Green for positive signals
  - Orange/Red for risk indicators
  - Blue gradient top-borders on card sections
- Add `.q-depth-quick`, `.q-depth-full`, `.q-depth-deep` utility classes with distinct color schemes

---

## Part 3: Pricing Section Improvements (No Tier Changes)

### File: `src/components/landing/PricingSection.tsx` (MODIFY)
- **Value framing**: Replace "Worth $2,000+ in consultant fees" with "Replaces 3-5 hours of senior CFO analysis" — more believable
- **Daily price**: Add "$0.56/day" below the $17/mo price to anchor perceived value
- **Free tier limitation clarity**: Add a subtle note: "Quick depth only · No PDF exports · Watermarked"
- **Plus tier feature reorder**: Lead with "Custom branding (white-label)" and "Monte Carlo simulations" — these are premium differentiators, currently buried
- **Social proof line**: Add "Join 14 founders already using Quantis" (pull from actual user count) below the Plus CTA
- **Annual savings**: Bump the "Save 17%" text to be more prominent — make it a colored badge, not plain text

---

## Part 4: SEO & Conversion Micro-Fixes

### File: `src/pages/Landing.tsx` (MODIFY)
- Update `<StructuredData>` FAQ answers to include target search terms: "business idea validator," "startup viability calculator," "break-even calculator AI"
- Add `<meta name="description">` targeting: "Free AI business validator — stress-test your startup idea with 1,000+ benchmarks in 90 seconds"

### File: `src/components/landing/MobileHero.tsx` (MODIFY)
- Remove the founder self-quote overlay (conversion anti-pattern)
- The demo dashboard IS the social proof now — it shows real calculations

---

## Files Changed Summary

| File | Action |
|------|--------|
| `src/components/landing/QuantisHeroDemo.tsx` | CREATE — Interactive demo dashboard component |
| `src/components/landing/MobileHero.tsx` | MODIFY — Replace portrait with demo, remove instrument panel |
| `supabase/functions/generate-idea/index.ts` | CREATE — AI idea generation endpoint |
| `src/components/analysis/WizardForm.tsx` | MODIFY — Rich depth selector, field tooltips, generate idea button |
| `src/components/landing/PricingSection.tsx` | MODIFY — Value framing, daily price, feature reorder |
| `src/styles/quantis-design-system.css` | MODIFY — Richer color accents for dashboard |
| `src/pages/Landing.tsx` | MODIFY — SEO meta improvements |

## Implementation Order
1. Create `QuantisHeroDemo.tsx` (the showpiece)
2. Create `generate-idea` edge function
3. Modify `MobileHero.tsx` to use the new demo
4. Improve `WizardForm.tsx` depth selector + tooltips + idea generator
5. Polish `PricingSection.tsx` value framing
6. SEO fixes in `Landing.tsx`

