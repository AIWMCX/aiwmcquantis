/**
 * Manual grants vs stale Stripe events (2026-10-15).
 *
 * Incident: a founder account's permanent Pro grant (2026-09-03) was
 * downgraded to Free by an old Stripe subscription's invoice.payment_failed
 * (2026-09-08). subscriptions is one row per user; the grant reused the row
 * but kept the old stripe_subscription_id, and the downgrade RPC cancelled
 * by user_id alone.
 */
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import {
  PAYMENT_FAILED_GRACE_MS,
  canSelfHealMissingRow,
  decidePaymentFailed,
} from '../../supabase/functions/_shared/payment-failed-decision';

const NOW = Date.parse('2026-10-15T12:00:00Z');
const DAY = 24 * 60 * 60 * 1000;
const SUB = 'sub_old_123';
const failedAgo = (ms: number) => new Date(NOW - ms).toISOString();

describe('decidePaymentFailed', () => {
  it('stale event: row now belongs to a manual grant (no Stripe link) → skip, even with grace long expired', () => {
    const a = decidePaymentFailed({
      eventSubscriptionId: SUB,
      row: { stripe_subscription_id: null, payment_failed_at: failedAgo(30 * DAY) },
      stripeStatus: 'past_due',
      nowMs: NOW,
    });
    expect(a.kind).toBe('skip_stale');
  });

  it('stale event: row moved to a newer Stripe subscription → skip', () => {
    const a = decidePaymentFailed({
      eventSubscriptionId: SUB,
      row: { stripe_subscription_id: 'sub_new_456', payment_failed_at: null },
      stripeStatus: 'unpaid',
      nowMs: NOW,
    });
    expect(a.kind).toBe('skip_stale');
  });

  it('recovered payment: Stripe says active → clear marker, never downgrade', () => {
    for (const status of ['active', 'trialing']) {
      const a = decidePaymentFailed({
        eventSubscriptionId: SUB,
        row: { stripe_subscription_id: SUB, payment_failed_at: failedAgo(10 * DAY) },
        stripeStatus: status,
        nowMs: NOW,
      });
      expect(a.kind).toBe('recovered');
    }
  });

  it('first failure starts the grace window', () => {
    const a = decidePaymentFailed({
      eventSubscriptionId: SUB,
      row: { stripe_subscription_id: SUB, payment_failed_at: null },
      stripeStatus: 'past_due',
      nowMs: NOW,
    });
    expect(a.kind).toBe('start_grace');
  });

  it('repeated retry events inside the window keep access and do not restart the timer', () => {
    const a = decidePaymentFailed({
      eventSubscriptionId: SUB,
      row: { stripe_subscription_id: SUB, payment_failed_at: failedAgo(PAYMENT_FAILED_GRACE_MS - 60_000) },
      stripeStatus: 'past_due',
      nowMs: NOW,
    });
    expect(a.kind).toBe('in_grace');
  });

  it('legitimately overdue: grace expired and Stripe confirms failing → downgrade', () => {
    for (const status of ['past_due', 'unpaid', 'canceled', 'incomplete_expired']) {
      const a = decidePaymentFailed({
        eventSubscriptionId: SUB,
        row: { stripe_subscription_id: SUB, payment_failed_at: failedAgo(PAYMENT_FAILED_GRACE_MS) },
        stripeStatus: status,
        nowMs: NOW,
      });
      expect(a.kind).toBe('downgrade');
    }
  });

  it('Stripe lookup failed: grace expired but unconfirmed → keep access', () => {
    const a = decidePaymentFailed({
      eventSubscriptionId: SUB,
      row: { stripe_subscription_id: SUB, payment_failed_at: failedAgo(5 * DAY) },
      stripeStatus: null,
      nowMs: NOW,
    });
    expect(a.kind).toBe('in_grace');
  });
});

describe('canSelfHealMissingRow', () => {
  it('never creates a row over one the user already has (a grant or another subscription)', () => {
    expect(canSelfHealMissingRow({ user_id: 'u1' })).toBe(false);
    expect(canSelfHealMissingRow(null)).toBe(true);
  });
});

describe('wiring', () => {
  const root = path.resolve(__dirname, '../..');
  const read = (p: string) => fs.readFileSync(path.join(root, p), 'utf8');
  const webhook = read('supabase/functions/stripe-webhook/index.ts');
  const migration = read('supabase/migrations/20261015120000_protect_manual_grants_from_stale_stripe.sql');

  it('webhook payment_failed uses the shared decision and the self-heal guard', () => {
    expect(webhook).toContain('decidePaymentFailed({');
    expect(webhook).toContain('canSelfHealMissingRow(existing)');
  });

  it('every webhook downgrade passes the subscription it is about', () => {
    const calls = webhook.split('supabase.rpc("mark_subscription_canceled"').slice(1);
    expect(calls.length).toBeGreaterThan(0);
    for (const c of calls) expect(c.slice(0, 300)).toContain('p_stripe_subscription_id');
  });

  it('reconciliation job scopes its downgrade too', () => {
    const recon = read('supabase/functions/reconcile-stripe-subscriptions/index.ts');
    expect(recon).toContain('p_stripe_subscription_id: row.stripe_subscription_id');
  });

  it('RPC refuses a stale subscription and grant claim detaches the old Stripe link', () => {
    expect(migration).toContain("'stale_subscription'");
    expect(migration).toMatch(/stripe_subscription_id = NULL,\s*payment_failed_at = NULL/);
  });
});
