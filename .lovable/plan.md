

# AIWMC Quantis: Production Stability & Growth Readiness Plan

## Executive Summary

After auditing every page, every hook, every edge function, the database state, and real usage data, here is the honest picture and the precise fixes needed to stabilize this project for growth.

## Real Usage Data (as of Feb 14, 2026)

- **11 registered users** (9 free, 2 Plus)
- **24 total analyses** from 3 unique users
- **5 leads** captured
- **2 saved documents**, 0 tracked downloads
- **Daily analysis volume**: 0-4 per day, with multi-day gaps
- **1 month post-launch**: Product is functional but not growing

## Competitive Landscape

### Direct Competitors

| Tool | What They Do | Pricing | Key Feature We Lack |
|------|-------------|---------|-------------------|
| **BizPlanAI Pro** | Business plan generator + idea validator | Free demo + paid plans | SWOT analysis output, "investor-ready" PDF branding, 150+ industry claim |
| **ValidatorAI** | Startup idea scoring with AI mentor chat | Freemium | Conversational AI advisor ("Val"), idea scoring system (1-10), simulated customer feedback |
| **LivePlan** | Full business planning + financial dashboards | $20-40/mo | Live financial dashboards, milestone tracking, Pitch preparation mode |
| **Upmetrics** | AI business plan writer + pitch deck builder | $7-30/mo | Step-by-step plan builder wizard, financial forecast charts, collaboration |

### What AIWMC Quantis Has That Competitors Don't
- **Deterministic financial engine** (not pure LLM-generated numbers) -- CFO-grounded
- **Location intelligence** with 50+ city cost multipliers
- **7-layer AI safety architecture** with truth labeling
- **Anonymous analysis** (no signup required for first try)
- **Document intelligence** -- upload PDFs/Excel for enhanced analysis
- **Real-time scenario switching** (pessimistic/base/optimistic)

### What Competitors Have That We're Missing (Critical Gaps)

| Gap | Competitor Reference | Impact on Growth |
|-----|---------------------|-----------------|
| **No onboarding email sequence after signup** | All competitors do drip campaigns | Users sign up and forget about the product |
| **No "share analysis" social proof loop** | BizPlanAI has social sharing | No viral coefficient |
| **Landing page hero form goes to /app but doesn't auto-submit** | BizPlanAI does instant analysis from landing | Breaks the "3-minute" promise -- user has to re-enter data |
| **No SWOT analysis in results** | BizPlanAI Pro, ValidatorAI | Missing standard business framework output |
| **No idea scoring (1-10 rating)** | ValidatorAI scores ideas | Users want a clear "go/no-go" signal |
| **No progress/milestone tracking post-analysis** | LivePlan | No reason to come back after first analysis |
| **Email verification blocks immediate use** | Most competitors allow instant access | 50%+ drop-off between signup and first analysis |

---

## Critical Stability Fixes (Must-Do Before Growing)

### Fix 1: Hero Form to Dashboard Prefill is Broken

**Problem**: Landing page `MobileHero` saves to `sessionStorage` as `hero_prefill`, but `WizardForm` reads from `localStorage` as `quantis_prefill`. The data never connects.

**Impact**: Every user who enters their idea on the landing page and clicks "See My Numbers" arrives at /app with an empty form. The "3-minute" promise is broken.

**Fix**: Align the storage keys so the hero form data flows into the analysis wizard, OR read both keys in WizardForm.

### Fix 2: Post-Signup Dead End

**Problem**: After signup, user sees "Check your email to verify" and a "Go to Dashboard" button. But email verification is required, so clicking "Go to Dashboard" leads to a protected route that bounces back to /auth. The user is stuck in a loop until they verify.

**Fix**: Either:
- Show a clear "verify first" screen without the dashboard button
- OR enable auto-confirm for signups (trades security for conversion)
- OR allow dashboard access in read-only mode until verified

### Fix 3: Free Tier Analysis Count Not Decrementing Visually

**Problem**: The dashboard shows "X of 3 analyses remaining" but the `usage_tracking` table is only incremented server-side after the edge function completes. If the edge function fails or times out, the UI count doesn't match reality.

**Fix**: Optimistically update the UI counter when analysis starts, and roll back if it fails.

### Fix 4: Dark Mode Conflict Between Landing and Dashboard

**Problem**: Landing page uses `next-themes` (`useTheme`), but AppDashboard uses its own `useState` + `localStorage` for dark mode with manual `document.documentElement.classList` manipulation. These two systems fight each other.

**Fix**: Unify on `next-themes` everywhere and remove the manual dark mode state from AppDashboard.

### Fix 5: "handleGenerate" Toast Still Fires

**Problem**: In DocsStudio, the `handleGenerate` callback (line 288) still shows a toast "Use the Download button on the preview..." even though the Generate buttons were removed from forms. However, some forms still call `onGenerate` on form submit (since forms without a submit button can still be submitted via Enter key).

**Fix**: Make `handleGenerate` a no-op (remove the toast), or prevent form submission entirely since there's no submit button.

---

## Growth-Critical Features (What Will Make Users Come Back)

### Feature 1: Idea Score Badge (Like ValidatorAI)

Add a prominent 1-10 score at the top of analysis results with a color-coded badge:
- 8-10: "Strong Opportunity" (green)
- 5-7: "Needs Work" (amber)
- 1-4: "High Risk" (red)

This gives users the instant "go/no-go" signal they crave. The score can be derived from the existing `confidence_score` + financial viability metrics.

### Feature 2: Shareable Analysis Link with Preview Card

The `shared_reports` table and `share-report` edge function already exist, but there's no Open Graph preview card when the link is shared on social media. Add:
- OG image generation showing the idea score + key metrics
- Social share buttons (Twitter, LinkedIn, WhatsApp) on the results page
- "Share your analysis" CTA after results load

### Feature 3: Email Lifecycle Sequence

The `email_sequences` table is seeded but `send-lifecycle-email` edge function exists without being triggered. Wire up:
- Day 0: Welcome email (already working)
- Day 1: "Your analysis results are waiting" (if signed up but never analyzed)
- Day 3: "3 tips to improve your business idea" (content email)
- Day 7: "See how your idea compares to industry benchmarks" (Plus upsell)

### Feature 4: SWOT Analysis Section in Results

Add a SWOT (Strengths, Weaknesses, Opportunities, Threats) section to the analysis results. This is expected by every business planning tool user. The data is already available from the AI narrator output -- it just needs a dedicated visual section.

---

## Technical Debt to Resolve

| Issue | File | Fix |
|-------|------|-----|
| Duplicate dark mode systems | `AppDashboard.tsx` + `Landing.tsx` | Remove manual dark mode from AppDashboard, use `next-themes` only |
| `hero_prefill` vs `quantis_prefill` key mismatch | `MobileHero.tsx` + `WizardForm.tsx` | Align storage keys |
| `handleGenerate` toast | `DocsStudio.tsx:288` | Remove toast, make it a silent no-op |
| `document_downloads` has 0 records | `useDocDownloadLimit.ts` | Verify the recording function is actually being called on download |
| `usage_count: 0` on most templates | `doc_templates` table | Verify `increment_template_usage` RPC is being called |

---

## Implementation Priority (Single Session)

### Batch 1: Fix Broken Flows (Stability)
1. Fix hero-to-dashboard prefill (storage key mismatch)
2. Fix post-signup dead-end flow
3. Unify dark mode systems
4. Remove handleGenerate toast
5. Fix download tracking

### Batch 2: Growth Levers
6. Add Idea Score Badge to analysis results
7. Add social share buttons to results
8. Wire up email lifecycle triggers

### Batch 3: Competitive Parity
9. Add SWOT section to results
10. Improve the "share analysis" OG preview

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/analysis/WizardForm.tsx` | Read `hero_prefill` from sessionStorage in addition to `quantis_prefill` |
| `src/components/landing/MobileHero.tsx` | Align prefill key OR keep as-is if WizardForm reads both |
| `src/pages/AppDashboard.tsx` | Remove manual dark mode state, use `next-themes` |
| `src/pages/DocsStudio.tsx` | Remove handleGenerate toast |
| `src/components/auth/SignupForm.tsx` | Fix post-signup flow to not show "Go to Dashboard" until verified |
| `src/components/analysis/AnalysisResults.tsx` | Add Idea Score Badge + SWOT section + social share buttons |

### No Database Changes Required
All fixes are frontend-only or use existing tables/functions.

