

# AIWMC Quantis: Comprehensive Stabilization and Professional Polish

## Overview

This plan addresses all remaining issues from the audit and implements Week 1 growth priorities to make the SaaS production-ready. Every change is grounded in actual code analysis and real user data.

---

## Batch 1: Remove Remaining Emoji and Unprofessional Elements

**Problem:** One emoji still exists in production code (`SignupForm.tsx` line 285: `⚡ 1-click signup`). The `FeatureComparisonTable` in `PricingSection.tsx` uses raw `✓` and `—` characters instead of proper icons.

**Files to change:**
- `src/components/auth/SignupForm.tsx` -- Replace `⚡` with a Lucide `Zap` icon component
- `src/components/landing/PricingSection.tsx` -- Replace `✓` with `CheckCircle2` icon and `—` with proper dash or `XCircle`

---

## Batch 2: Fix DocsStudio 30-Second Reload / Form Data Loss

**Problem:** The Service Worker reload was fixed in `main.tsx`, but there is a secondary issue: the `useDocFormDraft` hook auto-saves with 800ms debounce, but if the page re-renders due to subscription state changes or `useAuth` re-fetching, the form can reset. The `fetchDownloadCount` in `useDocDownloadLimit.ts` triggers on every `subLoading` change, which can cascade re-renders.

**Root cause confirmed:** When `subscriptionLoading` transitions from `true` to `false`, it triggers `fetchDownloadCount()` which updates `info` state, causing DocsStudio to re-render. If the form components are unmounted/remounted during this, draft data is lost.

**Fix:**
- `src/hooks/useDocDownloadLimit.ts` -- Memoize the returned object to prevent unnecessary re-renders. Use `useMemo` for the `info` state object.
- `src/pages/DocsStudio.tsx` -- Ensure the `generate` step does not depend on `limitLoading` (already loaded by the time user reaches the form). Move the loading gate to only block the home view, not the form view.

**Files to change:**
- `src/hooks/useDocDownloadLimit.ts` -- Add stability improvements
- `src/pages/DocsStudio.tsx` -- Prevent re-mount of form during subscription state transitions

---

## Batch 3: Landing Page Conversion Optimization (Week 1 Priority)

Based on the audit findings (95.8% drop-off, 77.8% mobile traffic), these changes reduce friction and increase perceived value:

### 3.1 Move "See a Sample Report" higher

**Current state:** DemoPreview is section 5 (below fold, behind lazy load). Most mobile users never scroll to it.

**Change:** Add a compact "See a Sample Report" link button directly in the Hero section, below the form. This anchors to `#demo-preview` instead of navigating away, keeping users on the page.

**File:** `src/components/landing/MobileHero.tsx`

### 3.2 Streamline Landing Page Section Order

**Current order:** UrgencyBanner -> Hero -> ResultsTicker -> TrustLogos -> DemoPreview -> HowItWorks -> Testimonials -> LeadCapture -> Pricing -> FAQ -> BottomCTA

**New order:** UrgencyBanner -> Hero -> TrustLogos (moved up, tiny section) -> DemoPreview (moved up, critical for conversion) -> ResultsTicker (moved down) -> HowItWorks -> Testimonials -> LeadCapture -> Pricing -> FAQ -> BottomCTA

**Rationale:** Trust signals should appear immediately after the hero (security badges build confidence). DemoPreview shows the actual product output -- this is the "instant value" that reduces bounce. ResultsTicker is lower priority and can live further down.

**File:** `src/pages/Landing.tsx`

### 3.3 Post-Signup Redirect to App (not Thank You page)

**Current flow:** Signup -> navigate('/thank-you') -- dead end, user must check email and come back.

**Better flow:** Signup -> navigate('/app') with a toast explaining "Check your email to verify your account". This keeps the user engaged and lets them explore the interface immediately (even if limited before email verification).

**File:** `src/components/auth/SignupForm.tsx` -- Change post-signup navigation from `/thank-you` to `/app`

---

## Batch 4: Dark Theme Professional Polish

**Current state:** `ThemeProvider` is installed, `dark:invert` on logo works. But several components have hardcoded light-only styles:

### 4.1 Fix Preview Panel in DocsStudio

**Problem:** Line 532: `className="bg-white"` -- the live preview panel is always white regardless of theme. Same issue on line 580 (mobile drawer).

**Fix:** Keep `bg-white` for the document preview (documents should render on white paper regardless of theme) but add a proper container border that adapts to the theme.

**File:** `src/pages/DocsStudio.tsx` -- No change needed (white paper preview is correct behavior)

### 4.2 Logo Visibility Check

**Current state:** Logo uses `dark:invert` which works correctly. The Header (`h-10 sm:h-12`) and Landing nav (`h-8 sm:h-10`) have slightly different sizes -- standardize to `h-8 sm:h-10` for consistency.

**File:** `src/components/layout/Header.tsx` -- Adjust logo height to match Landing page

---

## Batch 5: Lifecycle Email Automation Verification

**Current state:** The `check-lifecycle-emails` edge function was created and deployed. The cron job was set up. Need to verify it is working by checking logs.

**Action:** Check edge function logs to confirm the cron is firing. If issues found, fix the function.

---

## Technical Details

### Files Modified (Summary)

| File | Changes |
|------|---------|
| `src/components/auth/SignupForm.tsx` | Remove emoji, change post-signup redirect to `/app` |
| `src/components/landing/PricingSection.tsx` | Replace `✓` and `—` with Lucide icons |
| `src/hooks/useDocDownloadLimit.ts` | Memoize state to prevent cascade re-renders |
| `src/pages/DocsStudio.tsx` | Decouple form view from loading state |
| `src/components/landing/MobileHero.tsx` | Add "See Sample Report" anchor link |
| `src/pages/Landing.tsx` | Reorder sections for conversion optimization |
| `src/components/layout/Header.tsx` | Standardize logo size |

### No Changes Needed (Already Working)
- Dark theme toggle (unified via ThemeProvider)
- Service Worker reload fix (already done in main.tsx)
- Download tracking RLS (fixed in migration)
- Location data seeding (65 cities populated)
- Template usage tracking (increment_template_usage added)
- Popular badges on template cards (already rendered)
- Email lifecycle cron (deployed, needs verification)

