/**
 * Cold-sequence ordering — pure, shared by the sender's pre-send gate
 * (business-mail/pipeline.ts) and the Commercial Ops "due" list
 * (src/lib/commercial-ops.ts).
 *
 * Step n may go out only after step n-1 was actually SENT (the first touch is
 * step 1), and never within MIN_DAYS_BETWEEN_TOUCHES of the last email this
 * prospect received. Without this, a step-3 draft created while step 2 was
 * still unsent could be queued and delivered the same day as step 2, or
 * before it.
 */

export const MIN_DAYS_BETWEEN_TOUCHES = 2;

export interface SentTouch {
  kind: string;
  sequence_step: number | null;
  status: string;
  sent_at: string | null;
}

const stepOf = (t: SentTouch): number | null => (t.kind === 'first_touch' ? 1 : t.sequence_step);

export function followupOrderCheck(
  step: number,
  touches: SentTouch[],
  now: Date = new Date(),
): { ok: true } | { ok: false; reason: string } {
  const sent = touches.filter((t) => t.status === 'sent' && t.sent_at);
  if (!sent.some((t) => stepOf(t) === step - 1)) {
    return { ok: false, reason: `step ${step - 1} not sent yet` };
  }
  const last = Math.max(...sent.map((t) => Date.parse(t.sent_at as string)));
  if (now.getTime() - last < MIN_DAYS_BETWEEN_TOUCHES * 86_400_000) {
    return { ok: false, reason: `last email to this prospect was under ${MIN_DAYS_BETWEEN_TOUCHES} days ago` };
  }
  return { ok: true };
}
