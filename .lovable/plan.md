
# AIWMC Quantis - FinTech Squad Implementation Plan

## Gap Analysis: Current State vs Technical Assessment

Based on my codebase exploration, here's the implementation status:

### Already Implemented (No Action Needed)
| Feature | Status | Location |
|---------|--------|----------|
| UrgencyBanner | Done | `src/components/landing/UrgencyBanner.tsx` |
| LiveCounter | Done | `src/components/landing/LiveCounter.tsx` |
| TrustLogos | Done | `src/components/landing/TrustLogos.tsx` |
| MiniDemo (Preview Mode) | Done | `src/components/landing/MiniDemo.tsx` |
| analyze-preview Edge Function | Done | `supabase/functions/analyze-preview/` |
| share-report Edge Function | Done | `supabase/functions/share-report/` |
| Scenario Tabs | Done | `src/components/analysis/ScenarioSelector.tsx` |
| PDF Export | Done | `src/hooks/usePdfExport.ts` |
| 4-Step Wizard | Done | `src/components/analysis/WizardForm.tsx` |
| Draft Save/Resume | Done | Using `secureStorage` |
| A/B Testing Framework | Done | `src/lib/abTesting.ts` |
| Pricing Section with Toggle | Done | `src/components/landing/PricingSection.tsx` |

### Gaps to Implement (From Technical Assessment)

---

## Phase 1: Hero Section Enhancement (P0)

### 1.1 Add Financial Input Fields to MiniDemo

**Current State:** MiniDemo only has idea, location, and industry selector
**Target State:** Add Investment, Monthly Revenue, Monthly Costs fields as specified

Files to modify:
- `src/components/landing/MiniDemo.tsx`

Changes:
- Add currency input fields for Investment, Revenue, Costs
- Calculate: Monthly Profit, Annual ROI, Payback Period, Break-even
- Use local computation (no API call for these calculations)
- Show "verdict" badge (promising/moderate/risky) based on calculated ROI

New calculation logic:
```typescript
const profit = revenue - costs;
const annualRoi = investment > 0 ? ((profit * 12) / investment) * 100 : 0;
const paybackMonths = profit > 0 ? investment / profit : Infinity;
const verdict = annualRoi > 100 ? 'promising' : annualRoi > 50 ? 'moderate' : 'risky';
```

### 1.2 Enhanced Results Display

Add to results section:
- Net Margin calculation and display
- ROI gauge/meter visualization
- More prominent "reliability score" indicator

---

## Phase 2: Enhanced Preview vs Full Analysis Gating (P0)

### 2.1 Update Locked Features Grid

**Current State:** 6 locked feature teasers
**Target State:** 8 features matching the spec exactly

Update `LOCKED_FEATURES` array in MiniDemo:
1. 3 Scenario Modeling (Pessimistic/Base/Optimistic)
2. Detailed Risk Analysis with Mitigations
3. 5-7 Actionable Recommendations
4. Unit Economics Dashboard
5. PDF Export & Shareable Link
6. Save History (Unlimited)
7. Industry Benchmarks Comparison
8. Calculation Audit Trail

---

## Phase 3: Testimonials Enhancement (P1)

### 3.1 Update Testimonials Component

**Current State:** Basic testimonials exist
**Target State:** Metric-focused testimonials with specific outcomes

Files to modify:
- `src/components/landing/Testimonials.tsx`

Add these elements:
- Metric badges on each testimonial (e.g., "12x ROI", "$500K raised", "Saved $50K")
- 5-star rating display
- Stats row below testimonials:
  - Total analyses count (from LiveCounter)
  - Average rating: 4.9/5
  - Funding raised by users: $2.3M+
  - Average analysis time: 47s

---

## Phase 4: Performance Optimizations (P2)

### 4.1 Add Core Web Vitals Monitoring

Files to create/modify:
- Existing `src/lib/webVitals.ts` may need enhancement

Ensure tracking:
- LCP target: <2.0s
- INP target: <200ms
- CLS target: <0.1

### 4.2 Bundle Size Audit

Current dependencies look reasonable. Main optimizations:
- Verify lazy loading is working for below-fold components
- Check for unused imports

---

## Phase 5: Rate Limiting Enhancement (P1)

### 5.1 Enhance analyze-preview Rate Limiting

**Current State:** 3 previews per hour per IP
**Target State:** Add CAPTCHA trigger after first preview

Files to modify:
- `supabase/functions/analyze-preview/index.ts`

Changes:
- After 1st preview: Continue allowing
- After 2nd preview: Show CAPTCHA warning in response
- After 3rd preview: Block until signup

Add response field:
```typescript
{
  success: true,
  data: { ... },
  rate_limit: {
    remaining: 2,
    reset_at: "2026-02-01T19:00:00Z",
    show_captcha_warning: true
  }
}
```

---

## Phase 6: Wizard Enhancements (P1)

### 6.1 Add More Financial Fields to Wizard Step 2

**Current State:** Basic financial inputs via `AdvancedFinancialInputs`
**Target State:** Add fields from spec

Review and add to Step 2:
- Current Cash / Reserves
- Monthly Burn Rate (auto-calculated or manual)

### 6.2 Add Growth & Market Step (Optional Enhancement)

Consider adding to Step 3:
- Target Market Size
- Customer Acquisition Cost
- Customer Lifetime Value
- Monthly Growth Rate
- Churn Rate (for SaaS)

This aligns with the 4-step wizard spec but may be too much friction - consider A/B testing.

---

## Phase 7: Results Page Polish (P1)

### 7.1 Enhance Scenario Tabs

**Current State:** Tabs exist and work
**Target State:** Add visual indicators

Add to `ScenarioSelector.tsx`:
- Color coding (conservative=yellow, baseline=blue, aggressive=green)
- Quick summary metrics per tab without switching

### 7.2 Add "Next Best Actions" Checklist

**Current State:** ActionableInsights component exists
**Target State:** Ensure it matches the spec's checklist format

Review `ActionableInsights.tsx` to ensure:
- Checkbox UX for each action
- Impact/ROI estimate per action
- Priority ordering

---

## Phase 8: Share Link Enhancement (P2)

### 8.1 Add Password Protection Option

**Current State:** Token-based sharing exists
**Target State:** Optional password protection

Database change needed:
```sql
ALTER TABLE shared_reports ADD COLUMN password_hash TEXT;
```

Edge function changes:
- POST: Accept optional `password` field, hash it before storing
- GET: Check password if set, return 401 if wrong

UI changes:
- Add password toggle in share modal
- Add password input on shared report page

---

## Implementation Priority Order

| Priority | Phase | Description | Effort | Impact |
|----------|-------|-------------|--------|--------|
| P0 | 1.1 | Financial inputs in MiniDemo | 4 hours | High |
| P0 | 2.1 | Update locked features list | 1 hour | Medium |
| P1 | 3.1 | Testimonials with metrics | 2 hours | Medium |
| P1 | 5.1 | Rate limit CAPTCHA warning | 2 hours | Medium |
| P1 | 6.1 | More wizard financial fields | 2 hours | Low |
| P1 | 7.1 | Scenario tabs enhancement | 2 hours | Low |
| P1 | 7.2 | Actions checklist review | 1 hour | Low |
| P2 | 4.1 | Web vitals monitoring | 1 hour | Low |
| P2 | 8.1 | Password-protected shares | 4 hours | Low |

---

## Files to Modify Summary

### High Priority (P0)
1. `src/components/landing/MiniDemo.tsx` - Add financial inputs and calculations

### Medium Priority (P1)
2. `src/components/landing/Testimonials.tsx` - Add metrics and stats row
3. `supabase/functions/analyze-preview/index.ts` - Rate limit warning
4. `src/components/analysis/AdvancedFinancialInputs.tsx` - Additional fields
5. `src/components/analysis/ScenarioSelector.tsx` - Visual enhancements

### Low Priority (P2)
6. `src/lib/webVitals.ts` - Ensure monitoring
7. `supabase/functions/share-report/index.ts` - Password protection (requires migration)

---

## Success Metrics (Post-Implementation)

Track these KPIs:
- **MiniDemo Completion Rate:** Target 25% of visitors (up from unknown baseline)
- **Preview → Signup Conversion:** Target 15% (current estimated 4.2%)
- **Scroll Depth to Pricing:** Target 60% of visitors
- **LCP:** <2.0s (verify with Lighthouse)
- **Overall Landing→Auth:** Target 10% (from current 4.2%)

---

## Recommended First Step

Start with **Phase 1.1 (Financial Inputs in MiniDemo)** as it:
- Provides the "calculator" experience from the spec
- Shows instant value without any backend call
- Is the primary conversion lever identified in the assessment
- Can be implemented in ~4 hours

The MiniDemo currently shows profit/payback from the edge function; enhancing it with local ROI calculations based on user-provided Investment/Revenue/Costs will make it more interactive and valuable.
