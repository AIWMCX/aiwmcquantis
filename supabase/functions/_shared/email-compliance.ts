/**
 * Commercial-email compliance rules shared by every Resend sender
 * (send-lifecycle-email, send-welcome-email, send-weekly-insights) and the
 * unsubscribe endpoints. Pure logic, no Deno imports, so vitest can test it.
 *
 * CAN-SPAM (US) and CASL (Canada) both require, in every commercial email:
 *   - a working unsubscribe that is honored (CAN-SPAM: within 10 business days),
 *   - the sender's valid postal address.
 * Gmail and Yahoo additionally require RFC 8058 one-click unsubscribe headers
 * on bulk/marketing mail.
 *
 * Transactional mail (an engagement confirmation, a cancellation notice) is
 * exempt from the opt-out and is never held for a missing postal address.
 * Every template NOT listed as transactional is treated as marketing, so a new
 * template is opt-out-gated by default (fail-safe).
 */
import { postalAddressBlock } from './mail/compliance-footer.ts';

export const TRANSACTIONAL_TEMPLATES: ReadonlySet<string> = new Set([
  'cancellation_confirmed',
  'founder_decision_review_intake',
  'consultant_founding_pilot_intake',
  'payment_failed_downgraded',
]);

export function isMarketingTemplate(templateKey: string): boolean {
  return !TRANSACTIONAL_TEMPLATES.has(templateKey);
}

/** RFC 2369 + RFC 8058 headers. The URL must accept a POST and unsubscribe without further interaction. */
export function listUnsubscribeHeaders(url: string): Record<string, string> {
  return {
    'List-Unsubscribe': `<${url}>`,
    'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
  };
}

export interface MarketingConsentInput {
  /** Address is on email_suppressions or the lead row is unsubscribed. */
  suppressed: boolean;
  /** profiles.email_marketing_opt_in (null/undefined when there is no profile row). */
  profileOptIn?: boolean | null;
  /** auth user_metadata.marketing_opt_in, recorded at signup from an unchecked box. undefined = account predates the box. */
  metadataOptIn?: boolean | null;
}

export type MarketingDecision = { allowed: true } | { allowed: false; reason: string };

/**
 * Whether a marketing email may go to this recipient.
 * - Any opt-out wins: suppression list, profile flag false, or an explicit "no" at signup.
 * - An explicit "yes" at signup allows it.
 * - No recorded choice (accounts created before the signup checkbox) falls back to the
 *   profile flag, which is an opt-out model; the founder decides whether to keep that.
 */
export function marketingSendDecision(input: MarketingConsentInput): MarketingDecision {
  if (input.suppressed) return { allowed: false, reason: 'recipient unsubscribed or suppressed' };
  if (input.profileOptIn === false) return { allowed: false, reason: 'recipient opted out of marketing email' };
  if (input.metadataOptIn === false) return { allowed: false, reason: 'recipient did not opt in to marketing email at signup' };
  return { allowed: true };
}

export const MARKETING_POSTAL_ADDRESS_MISSING =
  'Marketing email held: no postal address set (mail_settings.postal_address). US and Canadian law require one in every commercial email.';

/** null when the marketing email may be sent, otherwise the reason it is held. Transactional mail is never held. */
export function postalAddressHold(templateKey: string, postalAddress: string | null | undefined): string | null {
  if (!isMarketingTemplate(templateKey)) return null;
  return postalAddressBlock(postalAddress) ? MARKETING_POSTAL_ADDRESS_MISSING : null;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** Sender identification line for HTML footers: "AIWMC LLC · <address>". */
export function postalAddressHtml(postalAddress: string): string {
  const address = postalAddress.trim().replace(/\s*\n\s*/g, ', ');
  return `AIWMC LLC &middot; ${escapeHtml(address)}`;
}

/** SHA-256 hex of the lower-cased address: the key the unsubscribe links carry. */
export async function emailHash(email: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(email.trim().toLowerCase()));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}
