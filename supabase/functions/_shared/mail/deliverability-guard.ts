/**
 * Deliverability guard for cold outreach (founder order 2026-11-13: "never
 * get into spam again"). Pure logic, imported by business-mail and vitest.
 *
 * Why each rule exists (8-month record):
 * - 525 cold emails went from hello@aiwmcquantis.com, the brand domain that
 *   also sends Stripe receipts and "Email me this result", with 0 human
 *   replies. Cold mail must never risk that domain again.
 * - 69 of 130 audited sends went to shared inboxes (info@, contact@), which
 *   nobody owns and which train filters that we are bulk mail.
 * - The sender kept going for weeks with zero replies; nothing stopped it.
 */

export const BRAND_DOMAIN = 'aiwmcquantis.com';

/** Shared/role inboxes: never a named owner. */
const ROLE_LOCAL_PARTS = new Set([
  'info', 'contact', 'contactus', 'hello', 'hi', 'sales', 'admin', 'office', 'support', 'team',
  'enquiries', 'enquiry', 'inquiries', 'inquiry', 'mail', 'email', 'help', 'billing', 'accounts',
  'accounting', 'marketing', 'careers', 'jobs', 'hr', 'service', 'services', 'customerservice',
  'noreply', 'no-reply', 'donotreply', 'webmaster', 'postmaster', 'general', 'reception', 'frontdesk',
  'booking', 'bookings', 'orders', 'press', 'media', 'partners', 'legal', 'privacy', 'finance',
]);

export function isRoleAddress(email: string): boolean {
  const local = email.trim().toLowerCase().split('@')[0] ?? '';
  return ROLE_LOCAL_PARTS.has(local.replace(/[._+-]?\d+$/, ''));
}

export function domainOf(email: string): string {
  return (email.trim().toLowerCase().split('@')[1] ?? '').replace(/\.$/, '');
}

export interface ReputationCounts {
  sent7d: number;
  bounces7d: number;
  unsubscribes7d: number;
  sent14d: number;
  humanReplies14d: number;
}

export const THRESHOLDS = {
  minSampleForRates: 20,
  maxBounceRate: 0.03,
  maxUnsubscribeRate: 0.02,
  noReplyStopAfter: 100,
} as const;

export type GuardDecision = { ok: true } | { ok: false; reason: string };

/** Decide whether cold outreach may send at all right now. */
export function deliverabilityGate(fromAddress: string, c: ReputationCounts): GuardDecision {
  if (domainOf(fromAddress) === BRAND_DOMAIN || domainOf(fromAddress).endsWith(`.${BRAND_DOMAIN}`)) {
    return { ok: false, reason: `cold outreach from the brand domain (${BRAND_DOMAIN}) is blocked: it protects receipts and result emails. Use a separate, warmed sending domain.` };
  }
  if (c.sent7d >= THRESHOLDS.minSampleForRates) {
    const bounceRate = c.bounces7d / c.sent7d;
    if (bounceRate >= THRESHOLDS.maxBounceRate) {
      return { ok: false, reason: `bounce rate ${(bounceRate * 100).toFixed(1)}% in 7 days (limit ${THRESHOLDS.maxBounceRate * 100}%): clean the list before sending more` };
    }
    const unsubRate = c.unsubscribes7d / c.sent7d;
    if (unsubRate >= THRESHOLDS.maxUnsubscribeRate) {
      return { ok: false, reason: `opt-out rate ${(unsubRate * 100).toFixed(1)}% in 7 days (limit ${THRESHOLDS.maxUnsubscribeRate * 100}%): the list or the message is wrong` };
    }
  }
  if (c.sent14d >= THRESHOLDS.noReplyStopAfter && c.humanReplies14d === 0) {
    return { ok: false, reason: `${c.sent14d} sends in 14 days and 0 human replies: change the list or the message before sending more` };
  }
  return { ok: true };
}
