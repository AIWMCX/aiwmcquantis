
# Annual Billing Implementation Plan

## Overview
Add support for annual billing ($168/year with 14-day trial) alongside the existing monthly option ($17/mo).

## Current State
- `useStripeCheckout.ts` has a single `plus` Payment Link (monthly only)
- `PricingSection.tsx` has a billing toggle but always redirects to monthly
- `Auth.tsx` stores `pending_checkout_plan` as just `'plus'` without billing period
- The `stripe-webhook` already treats all paid subscriptions as `'plus'` plan, so no changes needed there

## Files to Modify

### 1. `src/hooks/useStripeCheckout.ts`
**Changes:**
- Update `Plan` type from `'plus'` to `'plus_monthly' | 'plus_annual'`
- Add annual Payment Link to `PAYMENT_LINKS` object:
  ```typescript
  const PAYMENT_LINKS = {
    plus_monthly: 'https://buy.stripe.com/28EfZi2N1gte3AqeQJe7m00',
    plus_annual: 'https://buy.stripe.com/aFa9AUfzN0ug4Eu9wpe7m02',
  };
  ```
- Update `redirectToPayment`, `redirectToPaymentLink`, and legacy functions to accept new plan types

### 2. `src/components/landing/PricingSection.tsx`
**Changes:**
- Update `handlePlanClick` to pass the correct plan key based on `billingPeriod`:
  ```typescript
  const planKey = billingPeriod === 'annual' ? 'plus_annual' : 'plus_monthly';
  redirectToPayment(planKey, user.id, user.email || undefined);
  localStorage.setItem('pending_checkout_plan', planKey);
  ```
- Track billing period in analytics events

### 3. `src/pages/Auth.tsx`
**Changes:**
- Update type annotation to accept both monthly and annual:
  ```typescript
  const storedPlan = localStorage.getItem('pending_checkout_plan') as 'plus_monthly' | 'plus_annual' | 'plus' | null;
  ```
- Handle legacy `'plus'` value by mapping it to `'plus_monthly'` for backwards compatibility

### 4. `src/components/UpgradePrompt.tsx`
**Changes:**
- Add billing toggle or default to monthly (simpler UX in upgrade prompt)
- Update `handleUpgrade` to pass `'plus_monthly'` by default (users can see annual option on pricing page)

## Technical Notes

### Stripe Webhook (No Changes Needed)
The webhook already maps all paid subscriptions to `'plus'` plan status regardless of price:
```typescript
// All paid subscriptions are now 'plus' (Pro tier removed)
const plan = "plus";
```
This means both monthly and annual subscriptions will correctly activate Plus features.

### Backwards Compatibility
- Legacy `'plus'` values in localStorage will be treated as monthly
- Existing subscribers are unaffected

## Testing Checklist
1. Click "Monthly" toggle, click Plus CTA -> redirects to monthly Stripe checkout
2. Click "Annual" toggle, click Plus CTA -> redirects to annual Stripe checkout
3. Unauthenticated user clicks annual Plus -> localStorage stores `plus_annual` -> after auth, redirects to annual checkout
4. Upgrade prompt in app -> redirects to monthly checkout (default)
5. Complete annual subscription -> webhook processes correctly -> user gets Plus access

## Summary of Changes

| File | Change Description |
|------|-------------------|
| `useStripeCheckout.ts` | Add annual Payment Link, update Plan type |
| `PricingSection.tsx` | Pass billing period to checkout |
| `Auth.tsx` | Handle annual plan from localStorage |
| `UpgradePrompt.tsx` | Default to monthly in upgrade modal |
