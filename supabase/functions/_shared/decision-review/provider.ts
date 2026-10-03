/**
 * Provider-agnostic helpers shared by every `DecisionReviewer` implementation.
 *
 * JEV contract §5: timeout, retry, 429/5xx handling, and — critically —
 * "JEV unavailable" must never become "Quantis analysis failed." Every
 * helper here returns a typed outcome rather than throwing, so a caller one
 * layer up can always fail open.
 */
import type { DecisionReviewOutcome, DecisionReviewUnavailableReason } from './contracts.ts';

export const DEFAULT_REVIEW_TIMEOUT_MS = 20_000;
export const DEFAULT_MAX_RETRIES = 1;

export function unavailable(reason: DecisionReviewUnavailableReason, detail: string): DecisionReviewOutcome {
  return { status: 'unavailable', reason, detail };
}

/** Runs `fn` with a hard timeout. Never throws — resolves `null` on timeout/error. */
export async function withTimeout<T>(fn: (signal: AbortSignal) => Promise<T>, timeoutMs: number): Promise<T | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fn(controller.signal);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * One retry on a transient failure (429/5xx/network), none on a clear
 * client/schema error — matches contract §5's "timeout / retry policy /
 * 429 handling / 5xx handling" without retrying something that will never
 * succeed (e.g. a malformed packet).
 */
export async function withSingleRetry<T>(
  attempt: () => Promise<{ ok: true; value: T } | { ok: false; transient: boolean; detail: string }>,
): Promise<{ ok: true; value: T } | { ok: false; detail: string }> {
  let last = await attempt();
  if (last.ok) return last;
  if (!last.transient) return { ok: false, detail: last.detail };

  last = await attempt();
  if (last.ok) return last;
  return { ok: false, detail: last.detail };
}
