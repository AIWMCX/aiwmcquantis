# Day 1–7 Conversion Sprint — AIWMC Quantis

Goal: turn the 1–3 daily visitors into paid signups by removing the 6 highest-friction conversion blockers identified in the audit, plus 8 supporting fixes. All scoped to **frontend + copy + light Supabase config** — no engine, no math, no schema migrations.

Deliverable: `/mnt/documents/quantis-day1-7-sprint.md` — a checklist you can hand to me one item at a time, each with: file paths, exact change, acceptance criteria, estimated lift.

---

## The 14 fixes (grouped by day)

### Day 1 — Hero + Trust (highest leverage, lowest risk)

1. **Hero H1 → loss-anchored variant**
   - File: `src/pages/Landing.tsx` (hero section)
   - Change: replace generic H1 with *"Before you spend $50,000 building it — find out if the math works. In 2 minutes."*
   - Impact: +20–35% hero→scroll, +10–15% hero→CTA click
2. **Move analysis input into the hero (no scroll, no signup)**
   - File: `src/pages/Landing.tsx` + reuse `src/components/analysis/*` intake field
   - Change: single textarea + "Run free verdict" button above the fold; route to `/analyze` with prefilled state
   - Impact: collapses funnel by 1 step → +25–40% activation rate
3. **Remove fabricated "4.9/5" rating row**
   - File: `src/pages/Landing.tsx` (TrustBar/social-proof block)
   - Change: replace stars with data-source badge row (SBA · BLS · OECD · 95,500 benchmarks)
   - Impact: removes credibility risk; +5–10% trust-perception (qualitative, prevents bounce)

### Day 2 — Proof artifacts

4. **Real verdict screenshot strip in hero**
   - File: `src/pages/Landing.tsx` + `src/assets/`
   - Change: 3 anonymized verdict cards ("Fragile", "Viable", "Not a business") rendered as static React cards (not images — sharper, no CLS)
   - Impact: +15–25% scroll depth, +8–12% CTA
5. **"What you'll get" preview section above pricing**
   - File: `src/pages/Landing.tsx`
   - Change: 4-tile grid: Verdict · LTV:CAC · Stress map · 6-month forecast — each with a real screenshot crop
   - Impact: +10–20% pricing-section reach

### Day 3 — Pricing surgery

6. **Default pricing toggle to Annual + show $190/yr anchor**
   - File: `src/components/landing/PricingSection.tsx`
   - Change: default `billingPeriod = 'annual'`, show "$190/yr · save $38" with monthly as secondary toggle (already fixed click bug — verify)
   - Impact: +30–50% ARPU on conversions
7. **Add $49/mo Consultant tier (white-label PDF)**
   - File: `src/config/tiers.ts` + `src/components/landing/PricingSection.tsx`
   - Change: 3rd pricing column, no new backend — gates only existing `BrandProfile` + PDF export
   - Impact: opens B2B segment; +1–3 high-LTV buyers/mo at current traffic
8. **Pricing page bullet copy → outcome-led**
   - File: `src/pages/Pricing.tsx`
   - Change: rewrite each tier's bullets from features to outcomes ("Know if your idea is fundable in 2 min" not "AI analysis")
   - Impact: +8–15% pricing→checkout

### Day 4 — Activation loop

9. **6-stage progress loader during analysis**
   - File: `src/components/analysis/FormProgressBar.tsx` (extend) or new `AnalysisRunLoader.tsx`
   - Change: show "Pulling SBA benchmarks → Calibrating CAC → Running Monte Carlo → ..." instead of spinner
   - Impact: +20–30% completion rate (perceived value)
10. **Upgrade trigger after 3rd analysis (free tier)**
    - File: `src/hooks/useAnalysis.ts` or `src/lib/contextualTriggers.ts`
    - Change: on 3rd successful run, show modal: "You've used 3 free verdicts. Unlock unlimited + PDF for $19/mo"
    - Impact: +2–5% free→paid conversion

### Day 5 — SEO/Indexing for the 1–3 daily visitors to grow

11. **Verify prerender covers /pricing, /examples/*, /blog/***
    - File: `public/prerender-urls.txt` + verify in deployed HTML via curl
    - Change: ensure each public route has static HTML with H1 + meta + body copy (not just JS shell)
    - Impact: unlocks Google indexing → 5–20× organic traffic over 30–60 days
12. **Add `RouteSEO` / `PageMeta` to every public page missing it**
    - Files: audit all `src/pages/*.tsx` against the existing `PageMeta` component
    - Change: add `<PageMeta title=... description=... path=... />` to any public page lacking it
    - Impact: better SERP CTR, canonical correctness

### Day 6 — Conversion polish

13. **CTA copy audit — replace all "Get started" / "Try it"**
    - Files: grep for `Get started`, `Try it`, `Sign up free` across `src/pages/Landing.tsx`, `src/components/landing/*`
    - Change: outcome verbs — "Run my free verdict", "Stress-test my idea", "See if my math works"
    - Impact: +10–18% CTA CTR
14. **Exit-intent: offer free PDF teardown of their idea**
    - File: `src/hooks/useExitIntent.ts` (already exists) + new modal
    - Change: on exit, capture email → send a sample teardown PDF (uses existing `send-lead-magnet` function)
    - Impact: +30–60 leads/mo at current traffic; 3–8% convert to paid over 30 days

### Day 7 — Measure + iterate

- Wire/verify Posthog or Clarity events on: hero CTA, pricing toggle, checkout start, 3rd-analysis trigger, exit-intent capture
- Files: `src/lib/analytics.ts`, `src/lib/clarity.ts`
- Acceptance: dashboard shows funnel `Land → Run → Verdict → Pricing → Checkout`

---

## Estimated cumulative impact (90 days)

| Lever | Conservative | Optimistic |
|---|---|---|
| Visit→Verdict | 8% → 22% | 8% → 35% |
| Verdict→Pricing | 20% → 35% | 20% → 50% |
| Pricing→Paid | 1.5% → 3.5% | 1.5% → 6% |
| ARPU (annual default + Consultant tier) | $19 → $34 | $19 → $52 |

At current 1–3 visitors/day, this alone won't be enough — fixes 11–12 (SEO indexing) are what unlocks the traffic these conversion fixes can monetize.

---

## What this plan does NOT touch

- Math engine, formulas, decimal.js (per project memory — frozen)
- DB migrations, RLS, Supabase schema
- New edge functions (only reuses existing `send-lead-magnet`)
- Quantis math layers, accuracy harness, golden vectors

## Deliverable

A single MD checklist at `/mnt/documents/quantis-day1-7-sprint.md` matching the structure above, with per-item:
- Exact file path(s)
- Before/after copy or diff sketch
- Acceptance criteria (one bullet)
- Conservative + optimistic impact

Then I wait for you to say "ship #N" and I implement that one item.
