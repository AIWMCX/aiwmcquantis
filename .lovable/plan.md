
Goal
- Fix the bug where selecting “Annual” still redirects users to the monthly Stripe Payment Link (seen in your screenshot: URL starts with `.../28EfZi...` which is the monthly link).
- Make the “annual_first” A/B test variant truly default to Annual immediately (not after a delayed effect).
- Fix analytics so it reports the correct billing period.

What’s happening (root cause)
- In `src/components/landing/PricingSection.tsx`, `billingPeriod` starts as `'monthly'`.
- The `annual_first` experiment changes it to `'annual'` inside a `useEffect`, which runs after the first render.
- If a user clicks the Plus CTA before React finishes applying the state update (or even just due to timing/fast interactions), `handlePlanClick()` can still read the old `'monthly'` value and redirect to the monthly Payment Link.
- The console logs you shared also show this mismatch: `variant: "annual_first", billing_period: "monthly"`, which is consistent with “Annual is intended but state is still monthly at the moment we track/click.”

Plan (what I will change)

1) Make Annual default immediately for the “annual_first” variant
- In `src/components/landing/PricingSection.tsx`:
  - Move `const pricingVariant = useExperiment('pricing_display');` earlier (before `useState` for billing).
  - Initialize `billingPeriod` with a lazy initializer based on the experiment variant:
    - If variant is `annual_first`, set initial state to `'annual'`
    - Otherwise `'monthly'`
- Keep a small safety `useEffect` that enforces annual when variant is `annual_first` (in case variant ever changes or gets rehydrated), but the important part is that the initial render is already correct.

2) Eliminate “stale state” race conditions when clicking the CTA
- Still in `PricingSection.tsx`:
  - Add a `useRef` (e.g., `billingPeriodRef`) that always mirrors the latest billing period.
  - Update that ref synchronously whenever the user toggles monthly/annual.
  - In `handlePlanClick`, use `billingPeriodRef.current` (or compute planKey from a guaranteed up-to-date value) so the CTA always picks the correct plan even if the UI was clicked quickly.

3) Fix analytics to track the real billing period
- Update the `useEffect` that sends `pricing_section_viewed`:
  - Currently it only depends on `[pricingVariant]` but sends `billingPeriod` too.
  - Change dependencies to include `billingPeriod` so it accurately logs what the user is seeing/using.
  - Also ensure we don’t double-fire unnecessarily (we’ll keep it clean and predictable).

4) Add lightweight debug logging (temporary, optional)
- Add a short `console.log` right before redirect, like:
  - selected billing period
  - chosen planKey
  - destination base Payment Link (monthly vs annual)
- This makes it immediately obvious in the browser console whether the code is choosing `plus_annual` or `plus_monthly`.
- If you prefer, we can remove this logging after confirming the fix.

5) Verification steps (you can do right after)
- On the homepage `/`:
  1. Select Annual
  2. Click “Start 14-Day Free Trial”
  3. Confirm the Stripe URL starts with the annual link (`https://buy.stripe.com/aFa9AU...`)
  4. Confirm Stripe checkout shows the annual price ($168/year) with the trial
- Repeat for Monthly:
  - Confirm the Stripe URL starts with the monthly link (`https://buy.stripe.com/28EfZi...`)

Files involved
- `src/components/landing/PricingSection.tsx` (primary fix)
- (No Stripe link changes needed: your hook `src/hooks/useStripeCheckout.ts` already has correct monthly + annual Payment Link URLs.)

Risks / edge cases addressed
- Users clicking quickly after toggling (race condition) → fixed via ref-based source of truth.
- “annual_first” variant applying too late → fixed by initializing billingPeriod correctly on first render.
- Analytics mismatch (variant says annual_first but billing logged as monthly) → fixed by correct dependencies and initial state.

Definition of done
- Clicking Annual always redirects to the annual Payment Link.
- Clicking Monthly always redirects to the monthly Payment Link.
- Analytics events reflect the real selected billing period.
