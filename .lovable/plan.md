

# Stability and Conversion Fix Plan

## What the Data Shows

Your analytics confirm: the product works (18-20 min avg session), but the entrance is broken (68-74% bounce, 15.8% landing-to-app conversion). Only ~22 of 70 visitors are external. The priority is NOT more features — it's fixing what pushes people away and increasing distribution.

## Critical Bug Fix

The `LiveCounter.tsx` component (lines 56-64) shows **"New — be one of the first to validate"** for any count under 100. Since you have fewer than 100 analyses in the database, every single visitor sees this badge. Meanwhile, `MobileHero.tsx` now ALSO shows "Trusted by founders in 50+ cities" directly below it. Visitors see both messages in the same viewport — this contradiction destroys credibility instantly.

**Fix:** Change the `LiveCounter` low-count fallback from "New — be one of the first to validate" to "Now analyzing ideas in 50+ cities" — consistent with the trust badge below it. This is a 1-line text change.

## Simplify the App Dashboard for First-Time Visitors

The `/app` page currently shows:
- Anonymous usage notice
- Form (left column)
- Empty "Run your first analysis" state (right column)
- 6 analysis template cards (below)

This is overwhelming for someone who just clicked "See My Numbers" from the landing page. A first-time anonymous visitor should see ONLY the form, front and center, with nothing competing for attention.

**Fix:** Hide the `AnalysisTemplatesGrid` for anonymous users who haven't run an analysis yet. Show the form prominently. Remove the empty state card that says "NO ANALYSES YET" — it communicates failure, not opportunity.

## Landing Page Micro-Fixes

1. **UrgencyBanner**: The language toggle (EN/RU) is confusing for an English-only product. Remove the toggle and keep it English-only to avoid "Is this site Russian?" confusion for US/EU visitors.
2. **Bottom CTA section**: Keep "See My Numbers — Free" as the final CTA — it's correct for closing.

## Value Proposition Clarity

The headline "Get CFO-Level Business Insights in 60 Seconds" is strong but abstract. Add a concrete one-line subtitle that explains what this actually IS in plain English:

> "Type your business idea. Get profit projections, risk flags, and an action plan."

This tells a non-technical person exactly what happens, in under 10 words.

## Technical Changes Summary

### File: `src/components/landing/LiveCounter.tsx`
- Line 61: Change fallback text from "New — be one of the first to validate" to "Now analyzing ideas in 50+ cities"
- Change icon from `Zap` to `TrendingUp` for consistency
- Change color scheme from `primary` to `success` to match the trust badge

### File: `src/pages/AppDashboard.tsx`
- Wrap `AnalysisTemplatesGrid` in a condition: only show when user has at least 1 completed analysis OR is authenticated
- Change the empty state text from "NO ANALYSES YET / Run your first analysis" to "Your results will appear here" — neutral, not accusatory
- When `hasPrefill` is true (user came from hero), auto-focus the form and hide the empty state entirely

### File: `src/components/landing/UrgencyBanner.tsx`
- Remove the language toggle button (Globe icon, lines 43-50)
- Simplify to English-only content
- Reclaim horizontal space for the main message

### File: `src/components/landing/MobileHero.tsx`
- Add a plain-English one-liner below the headline: "Type your business idea. Get profit projections, risk flags, and an action plan."
- This goes between the headline (line 69) and the sub-headline (line 73)

## What This Fixes

| Problem | Fix | Expected Impact |
|---|---|---|
| Trust contradiction (2 conflicting badges) | Align LiveCounter text | Reduces immediate bounce |
| Overwhelming app page | Hide templates for new users | Increases form completion |
| Abstract value prop | Add plain-English subtitle | Increases hero engagement |
| Confusing language toggle | Remove RU toggle | Removes friction for 95%+ of visitors |

## What You Should Do (Not Code)

After these fixes are published:

1. **Post 1x/day for 14 days** on r/Entrepreneur, r/SideProject, r/startups — share analysis screenshots with the link in comments, not the title
2. **Create 3 Twitter threads** showing real Quantis output for different business types
3. **Do NOT build any new features** until you have 50+ organic visitors/day
4. **Track the funnel weekly**: Landing visitors, /app visitors, analyses completed, signups

The product is solid. The 18-minute average session proves it. The bottleneck is getting people through the door and past the first 5 seconds.
