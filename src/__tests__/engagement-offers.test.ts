import { describe, expect, it } from 'vitest';
import {
  ENGAGEMENT_OFFERS,
  getEngagementOfferByCode,
  getEngagementOfferByPaymentLinkId,
  paymentLinkIdFromSession,
  validateEngagementPayment,
} from '../../supabase/functions/_shared/engagement-offers';

describe('paid engagement offer contracts', () => {
  it('maps the two live payment links to distinct fixed-scope offers', () => {
    expect(getEngagementOfferByPaymentLinkId('plink_1UAHfLLKMhSmZURCpBCtsin5')).toMatchObject({
      code: 'founder_decision_review', expectedAmountMinor: 34_900, caseCapacity: 1,
    });
    expect(getEngagementOfferByPaymentLinkId('plink_1UAHgRLKMhSmZURCFJsZaLiv')).toMatchObject({
      code: 'consultant_founding_pilot', expectedAmountMinor: 49_900, caseCapacity: 2,
    });
  });

  it('fails closed for unknown offer codes and payment links', () => {
    expect(getEngagementOfferByCode('pro')).toBeNull();
    expect(getEngagementOfferByPaymentLinkId('plink_unknown')).toBeNull();
  });

  it('accepts only an exact paid USD amount', () => {
    const offer = ENGAGEMENT_OFFERS.founder_decision_review;
    expect(validateEngagementPayment(offer, { amountTotal: 34_900, currency: 'usd', paymentStatus: 'paid' })).toEqual({ ok: true });
    expect(validateEngagementPayment(offer, { amountTotal: 34_901, currency: 'usd', paymentStatus: 'paid' })).toEqual({ ok: false, reason: 'amount_mismatch' });
    expect(validateEngagementPayment(offer, { amountTotal: 34_900, currency: 'eur', paymentStatus: 'paid' })).toEqual({ ok: false, reason: 'currency_mismatch' });
    expect(validateEngagementPayment(offer, { amountTotal: 34_900, currency: 'usd', paymentStatus: 'unpaid' })).toEqual({ ok: false, reason: 'payment_status_unpaid' });
  });

  it('normalizes Stripe expandable payment-link fields without guessing', () => {
    expect(paymentLinkIdFromSession('plink_live')).toBe('plink_live');
    expect(paymentLinkIdFromSession({ id: 'plink_expanded' })).toBe('plink_expanded');
    expect(paymentLinkIdFromSession(null)).toBeNull();
    expect(paymentLinkIdFromSession({ id: 7 })).toBeNull();
  });
});
