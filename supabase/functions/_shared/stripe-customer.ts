/**
 * subscriptions.stripe_customer_id does not always hold a Stripe object id.
 * Internal grants store placeholders there ('founder_lifetime', 'founder_...';
 * see 20261025010000_internal_founder_alias.sql), and Stripe rejects any of
 * them as `customer` with "No such customer". Only a real customer id
 * (cus_...) may be sent to Stripe; anything else means "no Stripe customer
 * yet", so callers fall back to looking the customer up by email.
 *
 * Pure logic, no Deno APIs: vitest imports it directly.
 */
export function stripeCustomerIdOrNull(id: string | null | undefined): string | null {
  if (typeof id !== 'string') return null;
  const trimmed = id.trim();
  return trimmed.startsWith('cus_') ? trimmed : null;
}
