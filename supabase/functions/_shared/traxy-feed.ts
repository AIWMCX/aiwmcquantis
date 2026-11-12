// Reads TRAXY's public Customer REST API (https://docs.traxy.ai/api-reference).
// The only host this module talks to is api.traxy.ai, with a workspace API key
// (secret TRAXY_API_KEY, scope content:read). It never contacts LinkedIn.
import { mapTraxyPost, type TraxyPost } from './li-auto-comments.ts';

export const TRAXY_API = 'https://api.traxy.ai/api/v1';

export async function fetchTraxyPosts(apiKey: string, since: Date, maxPages = 3): Promise<{ posts: TraxyPost[]; raw: number; error?: string }> {
  const posts: TraxyPost[] = [];
  let raw = 0;
  let cursor: string | null = null;
  for (let page = 0; page < maxPages; page++) {
    const qs = new URLSearchParams({ limit: '100', dateFrom: since.toISOString() });
    if (cursor) qs.set('cursor', cursor);
    const res = await fetch(`${TRAXY_API}/customer/content-feed?${qs}`, {
      headers: { Authorization: `Bearer ${apiKey}`, Accept: 'application/json' },
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) return { posts, raw, error: `TRAXY content-feed ${res.status}: ${(await res.text()).slice(0, 200)}` };
    const body = (await res.json()) as { data?: unknown[]; page?: { nextCursor?: string | null } };
    for (const item of body.data ?? []) {
      raw++;
      const p = mapTraxyPost(item);
      if (p) posts.push(p);
    }
    cursor = body.page?.nextCursor ?? null;
    if (!cursor) break;
  }
  return { posts, raw };
}
