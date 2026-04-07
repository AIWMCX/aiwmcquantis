

# Audit Tier 1 Implementation — Critical Fixes

Based on the 244-paragraph audit document, here are the 5 critical fixes to execute immediately. All zero-cost, maximum impact.

---

## Fix 1: Replace every "1,000+" with "95,500" sitewide

**18 files, ~141 occurrences.** The audit found contradictory benchmark counts ("95,500" on homepage vs "1,000+" on inner pages). This destroys credibility.

Files to update:
- `src/components/analysis/CompactAnalysisForm.tsx` — form subtitle
- `src/components/landing/QuantisHeroDemo.tsx` — risk description
- `src/pages/Methodology.tsx` — meta description
- `src/components/analysis/AnalysisProgress.tsx` — loading tip
- `src/pages/Auth.tsx` — stat card
- `src/components/seo/StructuredData.tsx` — JSON-LD description (2 instances)
- `src/components/auth/SignupForm.tsx` — trust line
- `src/components/seo/ArticleSchema.tsx` — FAQ answer
- `src/components/landing/BeforeAfterComparison.tsx` — comparison item
- `src/components/landing/PricingSection.tsx` — feature subtext
- `src/pages/BlogArticle.tsx` — article content (2 instances)
- Remaining files from the 18 matched

Every instance of "1,000+" benchmarks/scenarios → "95,500"

---

## Fix 2: Standardize legal entity name to "AIWMC™ LLC" everywhere

The audit found "AIWMC AI Agency LLC" on inner pages and "AIWMC™ LLC" on the homepage footer. Per the user's previous branding updates, "AIWMC™ LLC" is the correct name.

Files to update:
- `src/components/seo/StructuredData.tsx` — Organization name
- `src/components/seo/ArticleSchema.tsx` — Organization name
- `src/pages/BlogArticle.tsx` — publisher name
- `src/components/seo/LocalBusinessSchema.tsx` — comment reference
- Footer already correct ("AIWMC™ LLC")

---

## Fix 3: Fix duplicate/inconsistent navigation across pages

The audit found homepage has 8 nav items while inner pages (/pricing, /how-it-works, /blog) show only 5. Add the missing items (Methodology, Risk Gallery, Leaderboard) to inner page navs for consistency.

Files to update:
- `src/pages/Pricing.tsx` — nav section (currently 5 items)
- `src/pages/HowItWorks.tsx` — check nav
- `src/pages/Blog.tsx` — check nav
- Any other page with its own inline nav

---

## Fix 4: Install Microsoft Clarity for session recording

Add the Clarity tracking script to `index.html`. This is a free tool that records user sessions so you can see where people drop off in the /app → /auth flow.

- Add Clarity script tag to `index.html` `<head>`
- Update CSP to allow `clarity.ms` domain
- Zero-cost, provides actionable conversion data within days

**Note:** Will need the Clarity project ID from the user, OR we can generate the standard snippet and the user inputs their ID.

---

## Fix 5: Fix example count inconsistency ("50+" vs "15+")

The audit found two different example counts. Standardize to the actual current count across all pages.

- Search for "15+" example references and update to match actual count
- Verify against actual example data file

---

## Technical details

| Fix | Files | Estimated changes |
|-----|-------|-------------------|
| "1,000+" → "95,500" | 18 files | ~30 string replacements |
| Entity name | 4 files | 4 replacements |
| Navigation consistency | 3-5 pages | Add missing nav items |
| Clarity install | 1 file (index.html) | Script + CSP update |
| Example count | 2-3 files | String replacements |

All changes are text/copy fixes — no architectural changes, no new components, no database changes.

