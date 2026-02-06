

# February 2026 Optimization Sprint Plan
## Executing Priority Prompts 6.1-10.1 from Master Library

---

## Executive Summary

Based on my analysis of the Master Prompt Library and current codebase state, **Phases 1-5 have been successfully completed**. This plan focuses on the **next highest-impact implementations** to achieve the Q1 2026 goals:

| Goal | Current | Target | Key Initiative |
|------|---------|--------|----------------|
| Monthly Signups | 210 | 550 | Referral system + SEO content |
| Conversion Rate | 2.1% | 5.5% | Onboarding wizard + A/B tests |
| Page Load Time | ~3-4s LCP | <2.5s LCP | Edge function warming + caching |
| Email Automation | 3 sequences | 7 sequences | Full lifecycle implementation |

---

## What's Already Implemented (Phase 1-5 Complete)

| Category | Status | Files |
|----------|--------|-------|
| CSP Headers | Done | index.html |
| React.memo | Done | PricingCard, VariableCard, etc. |
| Error Handling System | Done | src/lib/errors.ts |
| Onboarding Hooks | Done | useOnboarding.ts, WelcomeModal.tsx |
| Trust Signals | Done | SecurityBadges.tsx |
| Engagement Tracking | Done | engagementTracking.ts |
| A/B Testing Framework | Done | abTesting.ts |
| Web Vitals Monitoring | Done | webVitals.ts |
| Database Indexes | Done | Migration for audit logs |
| Email Sequences (Basic) | Done | 5 edge functions |

---

## Phase 6: SEO & Content Foundation
*Master Prompt: 6.1-6.3 | Impact: +40% organic traffic potential*

### 6.1 Technical SEO Enhancement

**Current State:** Basic PageSEO and StructuredData components exist, but missing:
- HowTo schema for analysis flow
- Product schema with proper offers
- Article schema for future blog
- Local Business schema for Denver presence

**Files to Create/Modify:**
| File | Action | Purpose |
|------|--------|---------|
| `src/components/seo/HowToSchema.tsx` | Create | Step-by-step schema for analysis |
| `src/components/seo/LocalBusinessSchema.tsx` | Create | Denver-based agency schema |
| `public/sitemap.xml` | Update | Add future content pages |
| `src/pages/Landing.tsx` | Modify | Add HowTo schema to how-it-works |

**Key Schema to Add:**
```typescript
// HowTo Schema for the analysis flow
const howToSchema = {
  "@type": "HowTo",
  "name": "How to Get AI Business Analysis in 2 Minutes",
  "step": [
    { "@type": "HowToStep", "name": "Describe Your Idea", "text": "..." },
    { "@type": "HowToStep", "name": "Select Location", "text": "..." },
    { "@type": "HowToStep", "name": "Get Financial Projections", "text": "..." }
  ]
};
```

### 6.2 SEO Landing Pages Structure

**Purpose:** Prepare for content marketing with proper routing and templates.

**Files to Create:**
| File | Purpose |
|------|---------|
| `src/pages/features/Index.tsx` | Features hub page |
| `src/pages/industries/[industry].tsx` | Industry-specific landing pages |
| `src/components/seo/ArticleSchema.tsx` | Blog post schema (future use) |

---

## Phase 7: Referral System Implementation
*Master Prompt: 5.3 | Impact: 15-25% lower CAC*

### 7.1 Database Schema

**Tables to Create:**
```sql
-- Referral tracking tables
CREATE TABLE referral_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  code VARCHAR(12) UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_user_referral UNIQUE(user_id)
);

CREATE TABLE referral_conversions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_code_id UUID REFERENCES referral_codes(id),
  referred_user_id UUID REFERENCES profiles(id),
  status VARCHAR(20) DEFAULT 'pending', -- pending, qualified, rewarded
  converted_at TIMESTAMPTZ DEFAULT NOW(),
  reward_applied_at TIMESTAMPTZ
);

CREATE TABLE referral_rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  reward_type VARCHAR(50), -- 'discount', 'credit', 'free_month'
  amount DECIMAL(10,2),
  stripe_coupon_id VARCHAR(100),
  applied_at TIMESTAMPTZ
);
```

### 7.2 Frontend Components

**Files to Create:**
| File | Purpose |
|------|---------|
| `src/components/referral/ReferralDashboard.tsx` | Track referrals, copy link, stats |
| `src/components/referral/ReferralBanner.tsx` | Promotional banner after signup |
| `src/components/referral/SocialShareButtons.tsx` | Twitter, LinkedIn, Email share |
| `src/hooks/useReferral.ts` | Referral code generation, tracking |

### 7.3 Edge Function

**File:** `supabase/functions/referral-reward/index.ts`

**Logic:**
1. Generate unique referral codes per user
2. Track clicks via URL parameter (`?ref=ABC123`)
3. Apply Stripe coupon on first payment
4. Award referrer credit after referee's first payment

---

## Phase 8: Enhanced Onboarding Wizard
*Master Prompt: 4.5 | Impact: +20% activation rate*

### 8.1 Complete the QuickStartWizard

**Note:** `WelcomeModal.tsx` and `useOnboarding.ts` exist, but full wizard missing.

**Files to Create:**
| File | Purpose |
|------|---------|
| `src/components/onboarding/QuickStartWizard.tsx` | 3-step guided flow |
| `src/components/onboarding/ProgressIndicator.tsx` | Visual step tracker |
| `src/components/onboarding/SampleDataOption.tsx` | "Try with example" button |
| `src/components/onboarding/OnboardingTour.tsx` | Highlight tooltips |

**Wizard Steps:**
1. **Welcome** - Personalize with user name, show 3 key benefits
2. **First Analysis Setup** - Pre-filled example or blank form
3. **Results Celebration** - Confetti, share prompt, next steps

### 8.2 Enhanced Celebration Component

**Update:** `src/components/onboarding/FirstAnalysisCelebration.tsx`

Add:
- Confetti animation (using canvas-confetti or CSS)
- Social share buttons
- "Upgrade for more" teaser
- Progress towards "5 analysis badge"

---

## Phase 9: Performance Deep-Dive
*Master Prompt: 3.4-3.6 | Impact: -40% latency*

### 9.1 Edge Function Warming Strategy

**Problem:** 2-4 second cold starts on `analyze-business`.

**Solution:** Implement warming cron job.

**Files to Create:**
| File | Purpose |
|------|---------|
| `supabase/functions/warm-functions/index.ts` | Cron trigger to keep functions hot |

**Cron Configuration:**
```toml
[functions.warm-functions]
verify_jwt = false

# In pg_cron (already have cron infrastructure)
# Run every 5 minutes to keep analyze-business warm
SELECT cron.schedule('warm-edge-functions', '*/5 * * * *', ...);
```

### 9.2 API Response Caching Layer

**Files to Create:**
| File | Purpose |
|------|---------|
| `src/lib/queryCache.ts` | Stale-while-revalidate wrapper |
| `supabase/functions/_shared/cache.ts` | Edge function response caching |

**Pattern:**
```typescript
// Stale-while-revalidate for benchmarks (24hr TTL)
export function useCachedBenchmarks(industryId: string) {
  return useQuery({
    queryKey: ['benchmark', industryId],
    queryFn: () => fetchBenchmark(industryId),
    staleTime: 24 * 60 * 60 * 1000, // 24 hours
    cacheTime: 48 * 60 * 60 * 1000, // 48 hours
  });
}
```

### 9.3 Image Optimization

**Current:** No WebP, no srcset, no lazy loading for hero images.

**Files to Modify:**
| File | Change |
|------|--------|
| `src/components/landing/MobileHero.tsx` | Add WebP with fallback |
| `src/components/ui/OptimizedImage.tsx` | New component with srcset |

---

## Phase 10: Marketing Automation Completion
*Master Prompt: 8.3 | Impact: +15% activation*

### 10.1 Complete Email Sequence Gaps

**Current Sequences (Implemented):**
1. Welcome email
2. Onboarding step 1-2
3. Post-analysis step 1
4. Weekly insights
5. Churn re-engagement

**Missing Sequences to Add:**
| Sequence | Trigger | Purpose |
|----------|---------|---------|
| Upgrade sequence (4 emails) | After 2nd analysis | Convert free to Plus |
| Win-back sequence (3 emails) | 30+ days inactive | Recover churned users |
| Achievement emails | Milestones | Gamification engagement |
| Referral invitation | 7 days after signup | Activate referral system |

### 10.2 Edge Function Updates

**Modify:** `supabase/functions/send-lifecycle-email/index.ts`

Add new templates:
- `upgrade_step_1`: Value teaser after 2nd analysis
- `upgrade_step_2`: Urgency after hitting limit
- `upgrade_step_3`: Final offer with discount
- `referral_invitation`: Share and earn template
- `achievement_5_analyses`: Milestone celebration

---

## Implementation Priority & Timeline

| Week | Phase | Focus | Key Deliverables |
|------|-------|-------|------------------|
| 1 | 8 | Onboarding | QuickStartWizard, ProgressIndicator, confetti |
| 2 | 7 | Referral | Database schema, ReferralDashboard, Stripe coupons |
| 2 | 10 | Email | Upgrade sequence, referral invitation emails |
| 3 | 9 | Performance | Edge warming, query caching, image optimization |
| 4 | 6 | SEO | Schema enhancements, sitemap updates |

---

## Success Metrics

| Metric | Baseline | Week 4 Target | Measurement |
|--------|----------|---------------|-------------|
| Activation Rate (1st analysis) | ~45% | 65% | GA4 funnel |
| Referral Signups | 0 | 10% of total | referral_conversions table |
| avg(analyze-business) | 4s | 2s | Sentry transaction tracing |
| Email Open Rate | ~35% | 45% | Resend analytics |
| Free→Plus Conversion | 2.1% | 3.5% | Stripe + subscription_audit_log |

---

## Technical Notes

### Database Changes Required
1. **New Tables:** `referral_codes`, `referral_conversions`, `referral_rewards`
2. **RLS Policies:** Users can only see their own referral data
3. **Indexes:** `idx_referral_code_lookup` on `referral_codes(code)`

### Stripe Integration
1. Create coupon `REFERRAL_DISCOUNT` in Stripe dashboard
2. Apply via `create-checkout-session` edge function

### A/B Tests to Run
1. Onboarding wizard vs. empty state (control)
2. Referral banner placement (after signup vs. in dashboard)
3. Upgrade email timing (after 2nd vs. 3rd analysis)

---

## Files Summary

### New Files (16)
| Path | Type |
|------|------|
| `src/components/seo/HowToSchema.tsx` | Schema |
| `src/components/seo/LocalBusinessSchema.tsx` | Schema |
| `src/components/referral/ReferralDashboard.tsx` | UI |
| `src/components/referral/ReferralBanner.tsx` | UI |
| `src/components/referral/SocialShareButtons.tsx` | UI |
| `src/hooks/useReferral.ts` | Hook |
| `src/components/onboarding/QuickStartWizard.tsx` | UI |
| `src/components/onboarding/ProgressIndicator.tsx` | UI |
| `src/components/onboarding/SampleDataOption.tsx` | UI |
| `src/components/onboarding/OnboardingTour.tsx` | UI |
| `src/lib/queryCache.ts` | Utility |
| `src/components/ui/OptimizedImage.tsx` | UI |
| `supabase/functions/referral-reward/index.ts` | Edge |
| `supabase/functions/warm-functions/index.ts` | Edge |
| `supabase/functions/_shared/cache.ts` | Shared |
| `supabase/migrations/[timestamp]_referral_system.sql` | DB |

### Modified Files (8)
| Path | Changes |
|------|---------|
| `src/pages/Landing.tsx` | Add HowTo schema |
| `public/sitemap.xml` | Add future content URLs |
| `supabase/functions/send-lifecycle-email/index.ts` | Add 5 new templates |
| `supabase/functions/create-checkout-session/index.ts` | Handle referral coupons |
| `src/components/onboarding/FirstAnalysisCelebration.tsx` | Add confetti, share |
| `supabase/config.toml` | Add new function configs |
| `src/App.tsx` | Add referral route |
| `src/pages/AppDashboard.tsx` | Integrate referral banner |

