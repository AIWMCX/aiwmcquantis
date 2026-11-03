/**
 * Commercial-email sender identification. CAN-SPAM (US) and CASL (Canada)
 * both require a cold commercial email to carry the sender's valid postal
 * address alongside the opt-out line. The address is a founder-provided fact
 * (mail_settings.postal_address), never generated: when it is missing, the
 * outreach sender refuses to send rather than ship a non-compliant email.
 *
 * Applied at send time, not draft time, so drafts approved before this
 * existed get the same footer.
 */

export const POSTAL_ADDRESS_MISSING =
  'Outreach paused: no postal address set (mail_settings.postal_address). US and Canadian law require one in every cold email.';

export function postalAddressBlock(postalAddress: string | null | undefined): string | null {
  return postalAddress && postalAddress.trim().length >= 10 ? null : POSTAL_ADDRESS_MISSING;
}

/** The opt-out line composeOutboundEmail appends; routing.isOptOut treats a reply "no" as an opt-out. */
export const OPT_OUT_LINE = `If this isn't relevant, just reply "no" and I won't follow up.`;

const HAS_OPT_OUT = /reply\s+(with\s+)?["“']?(no|stop|unsubscribe|remove)["”']?|unsubscribe/i;

/**
 * Guarantees the opt-out instruction is in the body. Drafts reach the send
 * queue without it when they were hand-edited or drafted outside a sequence
 * step (commercial-workflow skips composeOutboundEmail when `step` is null).
 */
export function withOptOutLine(draft: string): string {
  const body = draft.trimEnd();
  if (HAS_OPT_OUT.test(body)) return body;
  return `${body}\n\n${OPT_OUT_LINE}`;
}

/** Appends "AIWMC Quantis · <address>" as the last line, once. */
export function withPostalAddress(draft: string, postalAddress: string): string {
  const address = postalAddress.trim().replace(/\s*\n\s*/g, ', ');
  const body = draft.trimEnd();
  if (body.includes(address)) return body;
  return `${body}\n\nAIWMC Quantis · ${address}`;
}
