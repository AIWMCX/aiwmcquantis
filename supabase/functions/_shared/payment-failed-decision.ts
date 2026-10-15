// Pure decision logic for `invoice.payment_failed`. No Deno or network
// imports so the webhook and vitest share one implementation.
//
// Why this exists (2026-10-15): one subscriptions row per user. A manual
// grant reuses that row, and a stale payment_failed for an old Stripe
// subscription could still downgrade it — the webhook never checked that
// the row still belonged to the failing subscription, nor what Stripe
// currently says about it.

export const PAYMENT_FAILED_GRACE_MS = 3 * 24 * 60 * 60 * 1000;

/** Stripe statuses meaning the customer currently has paid access. */
const HEALTHY = new Set(['active', 'trialing']);
/** Stripe statuses that confirm the subscription is genuinely not being paid. */
const FAILING = new Set(['past_due', 'unpaid', 'canceled', 'incomplete', 'incomplete_expired']);

export type SubscriptionRowForDecision = {
  stripe_subscription_id: string | null;
  payment_failed_at: string | null;
};

export type PaymentFailedAction =
  /** The user's row is linked to another subscription (or a manual grant). Leave it alone. */
  | { kind: 'skip_stale' }
  /** Stripe says this subscription is paid again. Clear the failure marker. */
  | { kind: 'recovered' }
  /** First failure we have seen. Start the grace window, keep access. */
  | { kind: 'start_grace' }
  /** Inside the grace window, or Stripe could not confirm — keep access. */
  | { kind: 'in_grace'; ageMs: number }
  /** Grace expired and Stripe confirms the subscription is failing. */
  | { kind: 'downgrade'; ageMs: number };

export function decidePaymentFailed(input: {
  eventSubscriptionId: string;
  row: SubscriptionRowForDecision;
  /** Live status from stripe.subscriptions.retrieve, or null if the lookup failed. */
  stripeStatus: string | null;
  nowMs: number;
  graceMs?: number;
}): PaymentFailedAction {
  const { eventSubscriptionId, row, stripeStatus, nowMs } = input;
  const graceMs = input.graceMs ?? PAYMENT_FAILED_GRACE_MS;

  if (row.stripe_subscription_id !== eventSubscriptionId) return { kind: 'skip_stale' };
  if (stripeStatus && HEALTHY.has(stripeStatus)) return { kind: 'recovered' };
  if (!row.payment_failed_at) return { kind: 'start_grace' };

  const ageMs = nowMs - new Date(row.payment_failed_at).getTime();
  if (ageMs >= graceMs && stripeStatus && FAILING.has(stripeStatus)) return { kind: 'downgrade', ageMs };
  return { kind: 'in_grace', ageMs };
}

/**
 * The webhook may create a missing subscriptions row for an orphaned Stripe
 * subscription. It must never do so over a row the user already has — that
 * row belongs to a different subscription or a manual grant.
 */
export function canSelfHealMissingRow(existingRowForUser: unknown): boolean {
  return !existingRowForUser;
}
