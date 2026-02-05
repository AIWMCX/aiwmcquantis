
# Master Prompt Library Implementation Plan

## Overview
This plan executes high-priority prompts from the AIWMC Quantis Master Prompt Library across all four categories: Technical (2.1-2.6), UI/UX & Conversion (4.1-5.5), Performance (3.1-3.6), and Security (1.1-1.6). The implementation is structured in phases to maximize impact while maintaining stability.

---

## Current State Assessment

### Strengths Already Implemented
- **Bundle Splitting**: Vite config has excellent chunk separation (react-vendor, ui-vendor, charts, pdf, etc.)
- **Lazy Loading**: Landing page uses `React.lazy()` for below-fold components with progressive hydration
- **Performance Hooks**: Extensive use of `useMemo` and `useCallback` throughout the codebase
- **Security**: 7-layer AI safety architecture, RLS policies, PII encryption, XSS sanitization
- **Edge Function Optimization**: Modular structure with caching layer (benchmark-cache.ts)

### Gaps Identified
1. **No React.memo** on expensive business components
2. **No virtualized lists** for history/documents (currently capped at 50 items)
3. **No service worker** for offline caching
4. **Missing CSP headers** in index.html
5. **No preload hints** for critical JS chunks
6. **Limited micro-interactions** (basic hover states only)
7. **No onboarding wizard** for new users

---

## Phase 1: Performance Optimization (Prompt 3.1-3.6)
*Estimated Impact: +15-25 Lighthouse points*

### 1.1 Critical CSS & Resource Hints (index.html)
**Files:** `index.html`

Add resource hints for critical chunks:
```html
<!-- Preload critical JS modules -->
<link rel="modulepreload" href="/src/main.tsx">

<!-- Critical CSS inlining placeholder (Vite handles this) -->

<!-- CSP Header via meta tag -->
<meta http-equiv="Content-Security-Policy" 
  content="default-src 'self'; 
  script-src 'self' 'unsafe-inline' https://cdn.gpteng.co https://www.googletagmanager.com; 
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
  img-src 'self' data: https:;
  font-src 'self' https://fonts.gstatic.com;
  connect-src 'self' https://*.supabase.co https://www.google-analytics.com wss://*.supabase.co;">
```

### 1.2 Service Worker Implementation
**Files:** `public/sw.js` (update), `src/main.tsx`

Enhance existing service worker with proper caching:
```javascript
const CACHE_NAME = 'quantis-v2';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
];

// Cache-first for static assets, network-first for API
self.addEventListener('fetch', (event) => {
  if (event.request.url.includes('/functions/')) {
    // Network-first for API calls
    event.respondWith(networkFirst(event.request));
  } else {
    // Cache-first for static assets
    event.respondWith(cacheFirst(event.request));
  }
});
```

### 1.3 React Component Memoization
**Files:** Multiple component files

Add `React.memo` to expensive components:
- `src/components/landing/PricingCard.tsx`
- `src/components/landing/VariableCard.tsx`
- `src/components/analysis/CopyableMetric.tsx`
- `src/components/analysis/ConfidenceIndicator.tsx`
- `src/components/analysis/AnalysisHistory.tsx` (individual entries)

Example pattern:
```typescript
export const PricingCard = React.memo(function PricingCard({...props}) {
  // Component implementation
});
```

### 1.4 Vite Build Optimization
**Files:** `vite.config.ts`

Add additional optimizations:
```typescript
build: {
  // Existing config...
  reportCompressedSize: false, // Faster builds
  commonjsOptions: {
    transformMixedEsModules: true,
  },
},
esbuild: {
  drop: ['console', 'debugger'], // Remove console.log in production
},
```

---

## Phase 2: UI/UX & Conversion (Prompt 4.1-4.6)
*Estimated Impact: +10-20% conversion rate*

### 2.1 Onboarding Flow for New Users
**New Files:**
- `src/components/onboarding/WelcomeModal.tsx`
- `src/components/onboarding/QuickStartWizard.tsx`
- `src/hooks/useOnboarding.ts`

Components:
1. **Welcome Modal** - Shows after first signup with value reminder
2. **Quick Start Wizard** - 3-step guided flow
3. **First Analysis Celebration** - Confetti + share prompt
4. **Upgrade Teaser** - Shows after 2nd free analysis

State management via localStorage:
```typescript
interface OnboardingState {
  hasSeenWelcome: boolean;
  hasCompletedQuickStart: boolean;
  analysisCount: number;
  hasSeenUpgradePrompt: boolean;
}
```

### 2.2 Micro-Interactions Enhancement
**Files:** 
- `src/index.css` (add keyframes)
- `src/components/ui/button.tsx` (enhanced hover)

Add smooth transitions:
```css
@keyframes success-pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.02); }
}

.success-celebration {
  animation: success-pulse 0.3s ease-out;
}

/* Button press effect */
.btn-press:active {
  transform: scale(0.98);
  transition: transform 0.1s ease;
}
```

### 2.3 Trust Signal Components
**New Files:**
- `src/components/landing/SecurityBadges.tsx`
- `src/components/landing/FounderPresence.tsx`

Add to pricing page and checkout flow:
- SSL/Encryption badge
- "Your data never sold" statement
- Founder photo + message
- Money-back guarantee highlight

### 2.4 Mobile CTA Optimization
**Files:** `src/pages/Landing.tsx`

Enhance sticky mobile CTA:
```tsx
<div className="fixed bottom-0 left-0 right-0 p-3 bg-background/95 backdrop-blur-xl border-t md:hidden z-50">
  <Link to="/app">
    <Button size="lg" className="w-full gap-2 py-6 text-base shadow-2xl animate-pulse-subtle">
      <Play className="w-5 h-5" />
      See My Numbers Free
    </Button>
  </Link>
  <div className="flex items-center justify-center gap-2 mt-2 text-xs text-muted-foreground">
    <Lock className="w-3 h-3" />
    <span>Bank-level security</span>
    <span>•</span>
    <span>2 min analysis</span>
  </div>
</div>
```

---

## Phase 3: Technical Improvements (Prompt 2.1-2.6)
*Estimated Impact: Better maintainability, faster development*

### 3.1 Error Handling Standardization
**New Files:**
- `src/lib/errors.ts` - Error class hierarchy
- `src/lib/errorCodes.ts` - Centralized error codes
- `src/components/ErrorRecovery.tsx` - Retry UI

Error hierarchy:
```typescript
export class QuantisError extends Error {
  code: string;
  userMessage: string;
  technical?: string;
  recoverable: boolean;
}

export class NetworkError extends QuantisError { }
export class ValidationError extends QuantisError { }
export class AuthError extends QuantisError { }
export class PaymentError extends QuantisError { }
```

### 3.2 API Response Caching Layer
**Files:**
- `src/lib/apiCache.ts`
- Update `src/services/analysisApi.ts`

Implement stale-while-revalidate pattern:
```typescript
const CACHE_TTL = {
  benchmarks: 24 * 60 * 60 * 1000, // 24 hours
  userProfile: 5 * 60 * 1000,      // 5 minutes
  analysisHistory: 60 * 1000,      // 1 minute
};

export function useCachedQuery<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl: number
) {
  // React Query with staleTime config
}
```

### 3.3 TypeScript Strict Mode Enhancement
**Files:** `tsconfig.json`, `tsconfig.app.json`

Enable additional strict options:
```json
{
  "compilerOptions": {
    "noUncheckedIndexedAccess": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "exactOptionalPropertyTypes": true
  }
}
```

---

## Phase 4: Security Hardening (Prompt 1.1-1.6)
*Estimated Impact: SOC 2 readiness*

### 4.1 Content Security Policy
**Files:** `index.html`, Edge Functions

CSP header implementation (already outlined in Phase 1.1).

### 4.2 Request Signing for Sensitive Endpoints
**Files:** 
- `src/lib/requestSigner.ts`
- Update payment-related API calls

Add request signing for billing endpoints:
```typescript
function signRequest(payload: object, timestamp: number): string {
  // HMAC-SHA256 signature
  return crypto.subtle.sign('HMAC', key, data);
}
```

### 4.3 Rate Limit UI Feedback
**Files:**
- `src/components/analysis/RateLimitBanner.tsx` (update)
- `src/hooks/useRateLimit.ts`

Show remaining requests:
```tsx
<div className="bg-muted/50 rounded-lg p-3 flex items-center gap-3">
  <Gauge className="w-5 h-5 text-primary" />
  <span>3 free analyses remaining this month</span>
  <Button variant="link" size="sm">Upgrade for unlimited</Button>
</div>
```

### 4.4 Audit Log Enhancement
**Database Migration:**
Add `api_request_logs` index and cleanup cron:
```sql
CREATE INDEX idx_api_logs_user_recent 
ON api_request_logs (user_id, created_at DESC)
WHERE created_at > NOW() - INTERVAL '7 days';
```

---

## Phase 5: Analytics & Tracking (Prompt 7.1-7.3)
*Estimated Impact: Data-driven optimization*

### 5.1 Enhanced Event Tracking
**Files:** `src/lib/analytics.ts`

Add granular events:
```typescript
// Scroll depth tracking
trackScrollDepth(25 | 50 | 75 | 100);

// Time on page
trackTimeOnPage(5 | 10 | 30 | 60);

// CTA visibility
trackCtaVisible('hero_cta' | 'pricing_cta' | 'mobile_sticky');

// Analysis funnel
trackAnalysisFunnel('started' | 'input_complete' | 'processing' | 'completed' | 'exported');
```

### 5.2 A/B Testing Infrastructure Enhancement
**Files:** `src/lib/abTesting.ts`

Add new experiments:
```typescript
const ACTIVE_EXPERIMENTS = {
  pricing_display_v1: ['control', 'annual_first', 'comparison_table'],
  hero_headline_v1: ['control', 'speed_focus', 'savings_focus'],
  onboarding_flow_v1: ['control', 'wizard', 'video'],
};
```

---

## Implementation Priority Order

| Week | Focus | Key Deliverables |
|------|-------|------------------|
| 1 | Performance | CSP, Service Worker, React.memo, Vite optimizations |
| 2 | Conversion | Onboarding wizard, Trust signals, Mobile CTA |
| 3 | Technical | Error handling, API caching, TypeScript strict |
| 4 | Analytics | Event tracking, A/B testing, Funnel dashboard |

---

## Success Metrics

| Metric | Current (Est.) | Target |
|--------|----------------|--------|
| Lighthouse Performance | 65-75 | 90+ |
| LCP | 3-4s | < 2.5s |
| CLS | 0.15 | < 0.1 |
| Signup Conversion | ~2% | 5%+ |
| Free-to-Paid Conversion | ~1% | 3%+ |
| Bounce Rate | 54% | < 40% |

---

## Files to Create/Modify

### New Files (12)
1. `src/components/onboarding/WelcomeModal.tsx`
2. `src/components/onboarding/QuickStartWizard.tsx`
3. `src/components/onboarding/FirstAnalysisCelebration.tsx`
4. `src/hooks/useOnboarding.ts`
5. `src/lib/errors.ts`
6. `src/lib/errorCodes.ts`
7. `src/components/ErrorRecovery.tsx`
8. `src/lib/apiCache.ts`
9. `src/lib/requestSigner.ts`
10. `src/components/landing/SecurityBadges.tsx`
11. `src/components/landing/FounderPresence.tsx`
12. `src/hooks/useRateLimit.ts`

### Modified Files (15+)
1. `index.html` - CSP, preload hints
2. `vite.config.ts` - Build optimizations
3. `src/index.css` - Micro-interactions
4. `src/main.tsx` - Service worker registration
5. `public/sw.js` - Caching strategy
6. `src/pages/Landing.tsx` - Enhanced mobile CTA
7. `src/pages/AppDashboard.tsx` - Onboarding trigger
8. `src/lib/analytics.ts` - Enhanced tracking
9. `src/lib/abTesting.ts` - New experiments
10. Multiple component files for React.memo
11. `tsconfig.json` - Strict mode
12. `src/services/analysisApi.ts` - Caching layer
13. `src/components/analysis/RateLimitBanner.tsx` - Rate limit UI
14. `src/components/landing/PricingSection.tsx` - Trust signals
15. Database migration for audit log indexes

---

## Technical Considerations

### Performance Budget
- Main bundle: < 150KB gzipped
- Initial CSS: < 30KB
- LCP element load: < 2.5s
- Total JS: < 500KB (split into chunks)

### Browser Support
- Modern browsers (ES2020+)
- No IE11 support required
- Progressive enhancement for older Safari

### Rollout Strategy
1. Deploy behind feature flags
2. A/B test each major change
3. Monitor Core Web Vitals in production
4. Gradual rollout (10% -> 50% -> 100%)
