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

/**
 * Cold cadence since 2026-11-03: two touches in total, the first touch and
 * one follow-up (docs/execution/2026-10-30-cold-outreach-zero-replies-diagnosis.md
 * section 5). Founder rule: never contact a stranger a 3rd, 4th or 5th time.
 * Applies to every prospect, including sequences already in flight: nothing
 * already sent changes, but step 3+ is never drafted, proposed or sent again.
 */
export const MAX_SEQUENCE_STEP = 2;

/**
 * The follow-up goes out 4-5 business days after the first touch. Six
 * calendar days is at least 4 business days from any weekday.
 */
export const FOLLOWUP_DAY = 6;

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
  if (step > MAX_SEQUENCE_STEP) {
    return { ok: false, reason: `the cold sequence is ${MAX_SEQUENCE_STEP} touches; step ${step} is never sent` };
  }
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
