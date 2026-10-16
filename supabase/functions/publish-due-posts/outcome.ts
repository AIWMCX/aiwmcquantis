// Publish outcome classification. Pure (no Deno/network) so vitest can test it.
//
// LinkedIn's ugcPosts endpoint has no idempotency key. If the request times
// out, the connection drops, or LinkedIn answers 5xx, the post MAY already be
// live — so the row must not be marked "failed" (which invites a re-schedule
// and a duplicate post). It becomes "unknown": a human reconciles it on the
// platform first. Nothing here ever retries.

export interface PublishResult {
  ok: boolean;
  platform_post_id?: string;
  error?: string;
  needs_credentials?: boolean;
  /** True when the platform may have accepted the post despite the error. */
  ambiguous?: boolean;
}

export type PublishStatus = 'published' | 'needs_credentials' | 'failed' | 'unknown';

export function statusFor(res: PublishResult): PublishStatus {
  if (res.ok) return 'published';
  if (res.needs_credentials) return 'needs_credentials';
  if (res.ambiguous) return 'unknown';
  return 'failed';
}

/** An HTTP status that leaves the outcome uncertain (server-side failure after send). */
export function isAmbiguousHttpStatus(status: number): boolean {
  return status >= 500;
}

/** Map a thrown fetch error (timeout, reset, DNS after send) to an ambiguous result. */
export function ambiguousFromThrow(platform: string, e: unknown): PublishResult {
  const msg = e instanceof Error ? `${e.name}: ${e.message}` : String(e);
  return {
    ok: false,
    ambiguous: true,
    error: `${platform}: no definite response (${msg.slice(0, 200)}). The post may be live — check the platform before rescheduling.`,
  };
}

export const PUBLISH_TIMEOUT_MS = 25_000;
