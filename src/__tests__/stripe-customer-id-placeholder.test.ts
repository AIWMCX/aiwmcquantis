import { describe, expect, it } from 'vitest';
import { stripeCustomerIdOrNull } from '../../supabase/functions/_shared/stripe-customer';

// 2026-11-06: the founder's Plus checkout on /pricing spun on "Processing..."
// forever. Internal grants store placeholder ids in
// subscriptions.stripe_customer_id ('founder_lifetime', 'founder_...'), and
// create-checkout-session passed that straight to Stripe as `customer`,
// which Stripe rejects ("No such customer"). Only a real Stripe customer id
// may reach Stripe; anything else means "no customer yet".
describe('stripeCustomerIdOrNull', () => {
  it('keeps a real Stripe customer id', () => {
    expect(stripeCustomerIdOrNull('cus_QmX81abcDEF')).toBe('cus_QmX81abcDEF');
  });

  it('drops the internal grant placeholders', () => {
    expect(stripeCustomerIdOrNull('founder_lifetime')).toBeNull();
    expect(stripeCustomerIdOrNull('founder_pro_2026')).toBeNull();
    expect(stripeCustomerIdOrNull('sub_plus_manual')).toBeNull();
  });

  it('treats empty and missing values as no customer', () => {
    expect(stripeCustomerIdOrNull('')).toBeNull();
    expect(stripeCustomerIdOrNull('   ')).toBeNull();
    expect(stripeCustomerIdOrNull(null)).toBeNull();
    expect(stripeCustomerIdOrNull(undefined)).toBeNull();
  });
});
