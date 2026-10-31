/**
 * Follow-up threading: pure, used by the sender (business-mail/pipeline.ts).
 *
 * A follow-up may carry "Re:" only when it really is a reply: when we hold the
 * Message-ID of the first touch, so In-Reply-To/References point at it and the
 * recipient's client shows the earlier email above. When the first touch was
 * sent outside Quantis (no Message-ID on record), a "Re:" with nothing above
 * it reads as a trick and is a spam signal. Before this rule, 58 of 147 "Re:"
 * follow-ups went out that way, some with the CRM placeholder subject
 * "Re: First-touch outreach (sent externally)".
 */

export interface PriorTouch {
  kind: string;
  subject: string | null;
  internet_message_id: string | null;
  sent_at: string | null;
}

export type FollowupThread =
  | { ok: true; subject: string; inReplyTo: string | null; references: string[] }
  | { ok: false; reason: string };

/** CRM bookkeeping labels that must never reach a recipient as a subject. */
const PLACEHOLDER_SUBJECT = /sent externally|^first[- ]touch outreach/i;

const stripRe = (s: string | null | undefined) => (s ?? '').replace(/^(re:\s*)+/i, '').trim();

export function isPlaceholderSubject(subject: string | null | undefined): boolean {
  return PLACEHOLDER_SUBJECT.test(stripRe(subject));
}

export function planFollowupThread(ownSubject: string | null, prior: PriorTouch[]): FollowupThread {
  const sent = prior
    .filter((t) => t.sent_at)
    .sort((a, b) => Date.parse(a.sent_at as string) - Date.parse(b.sent_at as string));
  const first = sent.find((t) => t.kind === 'first_touch');

  if (first?.internet_message_id) {
    const base = stripRe(first.subject) || stripRe(ownSubject);
    if (!base || isPlaceholderSubject(base)) {
      return { ok: false, reason: 'follow-up has no real subject to reply under' };
    }
    const references = sent.map((t) => t.internet_message_id).filter((id): id is string => !!id).slice(-10);
    return { ok: true, subject: `Re: ${base}`, inReplyTo: references[references.length - 1] ?? null, references };
  }

  // No Message-ID for the first touch: send as a standalone email, never as a fake reply.
  const own = stripRe(ownSubject);
  if (!own || isPlaceholderSubject(own)) {
    return { ok: false, reason: 'first touch was sent outside Quantis and this follow-up has no subject of its own; write one before sending' };
  }
  return { ok: true, subject: own, inReplyTo: null, references: [] };
}
