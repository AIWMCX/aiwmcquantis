

# AIWMC QUANTIS — Full-Stack SaaS Audit & Redesign Specification

---

## 1. Context: Who Uses This and Why

### Personas

| Persona | Job | Fear | Trigger |
|---------|-----|------|---------|
| **First-time founder** | "Will this idea lose my savings?" | Wasting $50k+ on a doomed concept | Just had the idea, googling "is my startup viable" |
| **Serial founder** | "How does this compare to my last venture?" | Repeating past mistakes | Pre-seed fundraise prep |
| **Advisor / Mentor** | "Can I give this founder a quick sanity check?" | Giving bad advice without data | Founder asks for opinion |
| **Angel / Micro-VC** | "Is this deal-flow worth a call?" | Missing a signal in messy founder decks | Screening inbound pitches |

### Core Promise

**One sentence:** "Know if your business idea will make or lose money — before you spend a dollar."

**One paragraph:** Quantis runs a financial pre-mortem on any business idea in 90 seconds. It stress-tests 12 variables against 1,000+ industry benchmarks, surfaces fatal assumptions, and produces investor-grade reports — replacing weeks of spreadsheet work and $1,500 consultant decks with a deterministic AI engine that shows its math.

### Jobs to Be Done → Flows

| JTBD | Flow |
|------|------|
| "Is this idea worth pursuing?" | Landing → `/app` → fill form → results (verdict strip) |
| "What kills this plan?" | Results → Step 1 (Risk Intelligence) → stress map + flags |
| "What if I change rent / CAC / price?" | Results → Step 2 (Levers Lab) → slider adjustments → impact snapshot |
| "Show my investor why this works" | Results → Export PDF / Share link |
| "Compare this vs. another concept" | History tab → side-by-side (not yet built) |

---

## 2. UX Architecture — Journey Audit

### Phase 1: First Visit (Cold Traffic → Landing)

**Current state:** Strong landing page with lazy-loaded sections, urgency banner, before/after comparison, ROI calculator, testimonials, FAQ, pricing. Good SEO foundation. `StickyMobileCTA` exists.

**Friction points:**
- No interactive "try it now" element above the fold — the CTA goes to `/app` which requires understanding the product first.
- `DemoPreview` exists but is below fold; the "aha" is delayed.
- No social proof counter ("2,847 analyses run this week") visible in hero area.

**Fixes (implement):**
1. Move `MiniDemo` or a 3-field inline form (idea + industry + city) into the hero section so visitors get a taste without navigating away.
2. Add `LiveCounter` to the hero area (component exists, just needs placement).
3. Add a "See a sample report" link that opens `SharedReport` for a pre-built coffee shop example.

### Phase 2: First Run (Onboarding → First Analysis)

**Current state:** `QuickStartWizard`, `OnboardingTour`, `WelcomeModal`, `SampleDataOption` all exist. `CompactAnalysisForm` has a well-designed 3-step wizard with industry cards, benchmarks, and a reliability score.

**Friction points:**
- `/app` is not behind `ProtectedRoute` — anonymous users can run analyses but hit rate limits without understanding why.
- `AnonymousUsageNotice` exists but is passive.
- No "prefill with sample data" one-click on the empty state.

**Fixes (implement):**
1. On `EmptyState` (first visit to `/app`), add a "Try with sample data" button that prefills a coffee shop scenario and auto-submits.
2. After first anonymous analysis completes, show a "Save your results — create a free account" prompt (SignupPrompt exists but verify trigger timing).
3. Add a progress nudge: "You're 60% done — adding CAC and churn will increase accuracy by 25 points."

### Phase 3: Activation (First "Aha" Moment)

**Current state:** `ResultsHeroStrip` with verdict (FAST-TRACK / CAUTION / DO NOT PROCEED), count-up animations, and forecast ranges. `FirstAnalysisCelebration` component exists.

**Friction points:**
- The celebration modal fires once but doesn't guide the user to the next high-value action (share, export, run another).
- No "What should I do next?" prompt after results.

**Fixes (implement):**
1. After `FirstAnalysisCelebration` dismisses, show a sticky "Next steps" bar: "Share with your co-founder" | "Export as PDF" | "Run another idea."
2. Add a "How does this compare?" link to `/examples` with similar industries highlighted.

### Phase 4: Ongoing Use (Repeat Simulations)

**Current state:** History tab, scenario library, inline assumption editor, scenario bar with ambient colors.

**Friction points:**
- No side-by-side comparison between two analyses.
- No "clone and modify" — users must re-enter data for variations.
- Scenario switching is per-analysis, not cross-analysis.

**Fixes (implement):**
1. Add "Clone" button on history cards → opens `/app` with prefilled data.
2. Add a lightweight "Compare 2" mode in history: select two → side-by-side KPI table.

### Phase 5: Expansion (Sharing, Upgrading)

**Current state:** Share report via link, PDF export (Plus), Document Studio (Plus), referral system, Stripe billing.

**Friction points:**
- The upgrade prompt (`UpgradePrompt.tsx`) appears reactively (rate limit hit). No proactive value display.
- Shared reports don't include a "Powered by Quantis — run your own" CTA.

**Fixes (implement):**
1. On shared report page, add a footer CTA: "This report was generated by Quantis — run your own free analysis →".
2. Add a "What you're missing" panel on free results: ghosted-out PDF button, locked scenario slots, with clear upgrade copy.

---

## 3. UI Design System — Current State & Gaps

### Design Language (Already Established)

- **Palette:** Space Black base (`#0A0E1A`), semantic status tokens (`--q-status-green/yellow/red/orange`), accent blue (`--q-accent-primary`)
- **Typography:** Sora (headlines), DM Sans (body), JetBrains Mono (metrics). Well-defined `text-metric-*` classes.
- **Spacing:** 48px component heights, `--q-radius-md: 8px`, `--q-radius-lg: 12px`
- **Icons:** Lucide React, 1.5px stroke weight convention

### Component Gaps to Fill

| Component | Status | Gap |
|-----------|--------|-----|
| Buttons | ✅ Standardized (48px, 6 variants) | Missing: `ghost-destructive` variant for delete actions |
| Inputs | ✅ Standardized | Missing: consistent `InputGroup` wrapper for prefix/suffix combos |
| Cards | ✅ `.q-card` class | Missing: `CardInteractive` variant with hover lift baked in |
| Tables | ⚠️ Used in pricing comparison | No standardized `DataTable` component |
| Stepper | ✅ `WizardProgress` | Good |
| Empty States | ✅ `EmptyState` component | Missing: illustration variants per context |
| Skeleton | ✅ `AnalysisResultsSkeleton` | Missing: reusable `SkeletonCard`, `SkeletonTable` |
| Toasts | ✅ 4-variant sonner | Good |
| Modals/Sheets | ✅ Radix-based | Good |
| Badge/Chip | ✅ 6 variants | Good |

### Screen Template Gaps

| Screen | Above-Fold Priority | Gap |
|--------|---------------------|-----|
| Landing | Hero + CTA | Missing inline demo above fold |
| Dashboard (`/app`) | Form or results | Good — form is prominent |
| Results | Verdict strip | Good after Decision Cockpit redesign |
| Auth | Split layout (done) | Good |
| Pricing | Tier cards | Gap between hero and comparison table (noted in audit, fix pending) |
| Docs Studio | Template picker | Needs skeleton while loading |
| Shared Report | Full report view | Missing "run your own" CTA |

---

## 4. Three UX/UI Solution Concepts

### Concept 1 — "Mission Control" (Current Direction)

**Thesis:** Dense, Bloomberg-style cockpit with all data visible and interactive.

- Navigation: sidebar with grouped sections (Analysis, Documents, Intelligence, Account)
- Dashboard: form + results in single view, scenario bar, inline levers
- Reports: rich multi-step wizard with verdict → levers → risks → actions

**Pros:** Power users love density; feels professional and serious.
**Cons:** Intimidating for first-time founders; high cognitive load on first visit.
**Best for:** Advisors, serial founders, analysts who run 5+ simulations/week.

### Concept 2 — "Guided Narrative"

**Thesis:** Each screen tells one story with one question and one action.

- Navigation: minimal top bar with 3 items (Analyze, Reports, Account)
- Dashboard: single large form with conversational prompts ("Tell us about your business idea…")
- Reports: scroll-driven narrative — verdict → "here's why" → "here's what to fix" → "share this"

**Pros:** Lowest cognitive load; highest activation rate for new users.
**Cons:** Power users feel constrained; less data density.
**Best for:** First-time founders who need hand-holding.

### Concept 3 — "Hybrid: Guided First, Dense After"

**Thesis:** Progressive disclosure — simple on first run, unlocks density as user gains confidence.

- First analysis: guided, conversational, one field at a time
- After 2+ analyses: switch to Mission Control layout with full sidebar
- User can toggle between "Simple" and "Expert" modes in settings

**Pros:** Best of both worlds; respects learning curve.
**Cons:** More code paths to maintain; potential confusion during transition.
**Best for:** Products targeting both novice and expert users (Quantis's exact situation).

**Recommendation:** Implement Concept 3 incrementally. The current codebase already has `QuickStartWizard` for guided mode and `CompactAnalysisForm` for expert mode. Wire them together with a user preference flag.

---

## 5. Frontend Architecture Audit

### Current Stack (Good)

- React 18 + Vite + TypeScript + Tailwind CSS
- Tanstack Query for async state (well-configured: 5min stale, 30min GC, 2 retries)
- Radix UI primitives via shadcn/ui
- `next-themes` for dark/light toggle
- Lazy loading for all non-landing routes (good for FCP)
- `ErrorBoundary` at root level
- Web Vitals tracking (`initWebVitals`)

### Architecture Strengths

- Clean feature-based component organization (`components/analysis/`, `components/landing/`, etc.)
- Hooks layer (`hooks/`) separates business logic from UI
- Services layer (`services/`) for API calls and domain logic
- Edge functions for heavy computation (analyze-business, calculate-financials, ai-consensus)

### Gaps & Fixes

| Area | Issue | Fix |
|------|-------|-----|
| **Bundle** | Landing page imports `useAuth` and `useSubscription` eagerly | Tree-shake: move auth check into a wrapper, don't import hooks at module level |
| **Forms** | `CompactAnalysisForm` is 640 lines | Extract `IndustryStep`, `FinancialsStep`, `AdvancedStep` as sub-components |
| **State** | `AccuracyTransparentResults` is 531 lines with inline useMemo chains | Extract `useScenarioMetrics` hook |
| **Error handling** | `ErrorBoundary` exists but no per-section boundaries | Add `ErrorBoundary` around `AccuracyTransparentResults` and `CompactAnalysisForm` |
| **Prefetching** | No route prefetching on hover | Add `<Link onMouseEnter={() => import('./Page')}>` for top nav links |
| **Testing** | `__tests__/` and `test/` directories exist | Verify coverage on critical paths: form submission, results rendering, subscription checks |

### Performance Budget

| Metric | Target | Current (estimated) |
|--------|--------|---------------------|
| LCP | < 2.5s | ~2.0s (landing not lazy) ✅ |
| FID | < 100ms | Likely good (no heavy JS on interaction) |
| CLS | < 0.1 | Risk: lazy sections may cause layout shift |
| JS Bundle (initial) | < 200KB gzipped | Need to measure; 47 lazy routes is good |
| TTI | < 3.5s | Risk: QueryClient + auth check on mount |

---

## 6. Backend Architecture Audit

### Domain Model (Current)

```text
User (auth.users)
  ├── Profile (public.profiles)
  ├── UserRole (public.user_roles)
  ├── Subscription (Stripe via webhook)
  ├── Analysis[] (public.analyses)
  │     ├── Scenario runs
  │     └── Shared reports (public.shared_reports)
  ├── Documents[] (public.documents)
  │     └── DocQueue jobs
  ├── Invoices[]
  ├── BrandProfile
  └── ReferralCode
  
Benchmark sets (public.benchmarks)
Knowledge base entries
Lead captures
```

### Service Architecture (Edge Functions)

Well-modularized into ~36 edge functions covering:
- **Core engine:** `analyze-business`, `calculate-financials`, `ai-consensus`, `ai-narrator`
- **Documents:** `generate-document`, `generate-document-content`, `pdf-generator`, `doc-queue-worker`, `export-document`
- **Billing:** `create-checkout-session`, `create-portal-session`, `stripe-webhook`
- **Growth:** `send-welcome-email`, `send-lifecycle-email`, `send-lead-magnet`, `check-churn-signals`, `send-weekly-insights`, `referral-reward`
- **Admin:** `manage-benchmarks`, `seed-benchmarks`, `manage-knowledge-base`, `health-check`, `warm-functions`

### Gaps & Fixes

| Area | Issue | Fix |
|------|-------|-----|
| **Analysis cloning** | No endpoint to duplicate an analysis with modifications | Add `clone-analysis` edge function or client-side prefill from history data |
| **Comparison** | No side-by-side comparison endpoint | Can be client-side: fetch two analyses and render diff |
| **Rate limiting** | Client-side `useRateLimit` hook | Good — also enforce server-side in `analyze-business` |
| **Observability** | `quantis-logger.ts` exists, `health-check` function exists | Add structured logging with request IDs across edge functions |
| **Warm-up** | `warm-functions` exists | Good — cold starts are mitigated |

### AI Pipeline

- Dual-AI consensus (`ai-consensus`) — strong differentiator
- `analyze-business` → `calculate-financials` → `ai-narrator` pipeline
- `safety-evaluation-service.ts` and `quantis-safety-agent.ts` for guardrails
- `benchmark-governance.ts` for data quality

**No changes needed** — this is well-architected.

---

## 7. Conversion, CTAs & Traffic

### CTA Map (Current)

| Location | Primary CTA | Secondary |
|----------|-------------|-----------|
| Landing hero | "Start Free Analysis →" | "See Example Report →" |
| Landing pricing | "Start Free" / "Upgrade to Plus" | — |
| In-app empty state | "Start New Analysis" | — |
| Results | "Export PDF" (Plus) | "Share Report" |
| Shared report | None ❌ | — |
| Blog posts | "Start Free Analysis →" | — |

### Gaps & Fixes

| Gap | Fix |
|-----|-----|
| Shared report has no acquisition CTA | Add "Run your own analysis — free" footer |
| No upgrade value preview on free results | Show locked features with ghosted UI + "Unlock with Plus" |
| Blog → product path is weak | Add inline "Try this scenario in Quantis" CTAs within relevant blog posts |
| No referral visibility in-app | Surface referral link on results page: "Share Quantis, get 1 month free" |
| Pricing page → trial path | Add "Start free, upgrade anytime" messaging; remove friction of choosing tier first |

### In-Product Growth Loops

1. **Share loop:** Analysis → Share link → Recipient sees report → CTA to run own → New user
2. **Advisor loop:** Founder shares → Advisor reviews → Advisor runs own analyses for other founders
3. **Content loop:** Blog post about a risk scenario → "Try this in Quantis" → Analysis → Share

**Missing loop:** No "embed this chart" or "widget for your pitch deck" — a future differentiator.

---

## 8. Actionable Implementation Plan

### Priority 1: Conversion & Activation (Highest ROI)

| # | Task | Files | Effort |
|---|------|-------|--------|
| 1 | Add inline mini-form in landing hero (3 fields → instant preview) | `MobileHero.tsx`, `Landing.tsx` | Medium |
| 2 | Add "Run your own" CTA on shared report page | `SharedReport.tsx` | Small |
| 3 | Add "Try with sample data" on empty dashboard state | `AppDashboard.tsx`, `EmptyState` | Small |
| 4 | Add "Clone" button on history analysis cards | `AnalysisHistory.tsx`, `AppDashboard.tsx` | Small |
| 5 | Add locked-feature preview on free results (ghosted PDF, locked scenarios) | `AccuracyTransparentResults.tsx` | Medium |

### Priority 2: UX Polish (User Retention)

| # | Task | Files | Effort |
|---|------|-------|--------|
| 6 | Extract `CompactAnalysisForm` into 3 sub-step components (< 200 lines each) | `CompactAnalysisForm.tsx` → 3 new files | Medium |
| 7 | Add "Next steps" sticky bar after first analysis celebration | `FirstAnalysisCelebration.tsx`, new `NextStepsBar.tsx` | Small |
| 8 | Add per-section `ErrorBoundary` wrappers | `AccuracyTransparentResults.tsx`, `CompactAnalysisForm.tsx` | Small |
| 9 | Add route prefetching on nav link hover | `AppSidebar.tsx`, `Landing.tsx` nav | Small |

### Priority 3: Backend & Performance

| # | Task | Files | Effort |
|---|------|-------|--------|
| 10 | Add structured request-ID logging across edge functions | All edge functions (header injection) | Medium |
| 11 | Measure and optimize initial JS bundle (target < 200KB gzipped) | Vite config, dynamic imports audit | Medium |
| 12 | Add CLS guards for lazy-loaded landing sections (min-height placeholders) | `Landing.tsx` section skeletons | Small |

---

## 9. Standards Checklists

### UI/UX Checklist (Every New Feature)

- [ ] Clear section heading that answers "What does this tell me?"
- [ ] Empty state with illustration and action CTA
- [ ] Loading state (skeleton or spinner, never blank)
- [ ] Error state with retry button and plain-language message
- [ ] Mobile responsive (stacks at `md:`, touch targets ≥ 44px)
- [ ] WCAG contrast ≥ 4.5:1 for text, ≥ 3:1 for large text
- [ ] `:focus-visible` ring on all interactive elements
- [ ] `aria-label` on icon-only buttons
- [ ] Analytics event on primary CTA (`trackCtaClick`)
- [ ] Consistent with existing design tokens (`--q-*` variables)

### Engineering Checklist (Before Ship)

- [ ] Component < 300 lines (extract if larger)
- [ ] No inline styles — use Tailwind + CSS variables
- [ ] Error boundary wraps any async-dependent section
- [ ] Loading/error states handled for all `useQuery` calls
- [ ] No `console.log` in production code (use `quantis-logger`)
- [ ] Edge function: verify_jwt set correctly in `config.toml`
- [ ] RLS policies reviewed for any new tables
- [ ] Bundle impact checked (`vite-bundle-analyzer`)

### Product Review Scorecard

| Dimension | Score (1-10) | Notes |
|-----------|-------------|-------|
| Clarity of value | **8** | Landing page is strong; in-app could be clearer about "what to do next" |
| Time-to-value | **7** | 90s analysis is great; but first visit to first result requires 4+ steps |
| UX flow quality | **7** | Wizard is good; post-results journey is weak (no next-steps guidance) |
| Visual coherence | **8** | Design tokens are well-established; some pages still use ad-hoc styles |
| Performance | **8** | Lazy loading, warm functions, optimized QueryClient — solid foundation |
| Reliability | **7** | Error boundary exists but only at root; edge functions have health checks |
| Conversion & CTAs | **6** | Good landing CTAs; weak in-app upgrade prompts and zero acquisition from shared reports |

**Overall: 7.3 / 10** — Strong product with excellent engine; primary gap is post-activation conversion and guided next-steps UX.

---

## Implementation Recommendation

Start with **Priority 1 items 1–5** (conversion & activation). These are the highest-ROI changes — they directly affect visitor→signup→repeat use rates. Each is a small-to-medium task that doesn't require architectural changes.

Then move to **Priority 2** for code health and user retention polish, followed by **Priority 3** for backend observability and performance hardening.

