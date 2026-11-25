// Pure helpers for the daily automatic LinkedIn comment drafts (li-growth-draft
// action "auto_daily"). No network, no Supabase: vitest imports this file.
//
// Source of posts: TRAXY's public Customer REST API (content feed of the
// profiles the founder tracks in TRAXY), fetched by _shared/traxy-feed.ts.
// Nothing here calls or scrapes LinkedIn. Drafts stay drafts: the founder
// still reads, edits, posts by hand and clicks "Mark sent".

export interface TraxyPost {
  postUrl: string;
  text: string;
  authorName: string | null;
  authorUrl: string;
  authorHeadline: string | null;
  publishedAt: string | null;
}

function parseUrl(input: unknown): URL | null {
  const raw = typeof input === 'string' ? input.trim() : '';
  if (!raw) return null;
  try {
    const url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
    const host = url.hostname.toLowerCase();
    if (host !== 'linkedin.com' && !host.endsWith('.linkedin.com')) return null;
    return url;
  } catch {
    return null;
  }
}

/** Same rules as src/lib/li-growth/prospects.ts normalizeProfileUrl (kept in step by a test). */
export function normalizeProfileUrl(input: unknown): string | null {
  const url = parseUrl(input);
  if (!url) return null;
  const m = url.pathname.match(/^\/in\/([^/?#\s]+)\/?/i);
  if (!m) return null;
  let slug: string;
  try { slug = decodeURIComponent(m[1]); } catch { slug = m[1]; }
  slug = slug.trim();
  if (!/^ACo[A-Za-z0-9_-]{10,}$/.test(slug)) slug = slug.toLowerCase();
  if (!slug || /[\s/?#]/.test(slug)) return null;
  return `https://www.linkedin.com/in/${encodeURIComponent(slug)}`;
}

/** Same rules as src/lib/li-growth/prospects.ts normalizePostUrl. */
export function normalizePostUrl(input: unknown): string | null {
  const url = parseUrl(input);
  if (!url) return null;
  if (!/^\/(posts|feed\/update|pulse|in|company)\//i.test(url.pathname)) return null;
  return `https://www.linkedin.com${url.pathname}`;
}

function str(v: unknown): string | null {
  return typeof v === 'string' && v.trim() ? v.trim() : null;
}

function pick(obj: Record<string, unknown> | null | undefined, keys: string[]): unknown {
  if (!obj) return undefined;
  for (const k of keys) {
    const v = obj[k];
    if (v !== undefined && v !== null && v !== '') return v;
  }
  return undefined;
}

/**
 * Maps one TRAXY content-feed record to what a comment draft needs.
 * TRAXY documents `postUrl` and `contentText`; the author object is read
 * tolerantly because its field names are not in the public schema.
 * Returns null when anything a comment needs is missing.
 */
export function mapTraxyPost(raw: unknown): TraxyPost | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const postUrl = normalizePostUrl(pick(r, ['postUrl', 'url', 'linkedinUrl']));
  const text = str(pick(r, ['contentText', 'text', 'content']));
  if (!postUrl || !text) return null;
  const author = (pick(r, ['author', 'monitoredProfile', 'profile', 'watchedProfile']) ?? null) as Record<string, unknown> | null;
  const authorUrl = normalizeProfileUrl(
    pick(author ?? {}, ['linkedinUrl', 'profileUrl', 'url', 'linkedInUrl']) ?? pick(r, ['authorUrl', 'authorLinkedinUrl', 'profileUrl']),
  );
  if (!authorUrl) return null;
  const first = str(pick(author ?? {}, ['firstName']));
  const last = str(pick(author ?? {}, ['lastName']));
  const authorName = str(pick(author ?? {}, ['name', 'fullName']))
    ?? (first ? [first, last].filter(Boolean).join(' ') : null)
    ?? str(pick(r, ['authorName']));
  const headline = str(pick(author ?? {}, ['headline', 'title'])) ?? str(pick(r, ['authorHeadline']));
  return {
    postUrl,
    text: text.slice(0, 1200),
    authorName,
    authorUrl,
    authorHeadline: headline ? headline.slice(0, 300) : null,
    publishedAt: str(pick(r, ['publishedAt', 'postedAt', 'createdAt', 'date'])),
  };
}

export interface CommentCandidate {
  signalId: string;
  prospectId: string;
  fit: number;
  observedAt: string;
  /** Newest comment draft for this author that was not skipped, ISO, or null. */
  lastCommentAt: string | null;
  /** True when a draft already exists for this exact signal. */
  hasDraftForSignal: boolean;
  suppressed: boolean;
}

export interface PickOptions {
  max: number;
  fitThreshold: number;
  cooldownDays: number;
  now: Date;
  maxAgeDays: number;
}

/** Chooses today's comment drafts: one per author, highest fit first, then the freshest post. */
export function pickCommentSignals(cands: CommentCandidate[], o: PickOptions): string[] {
  const day = 24 * 3600 * 1000;
  const now = o.now.getTime();
  const fresh = cands.filter((c) =>
    !c.suppressed &&
    !c.hasDraftForSignal &&
    c.fit >= o.fitThreshold &&
    now - new Date(c.observedAt).getTime() <= o.maxAgeDays * day &&
    (!c.lastCommentAt || now - new Date(c.lastCommentAt).getTime() >= o.cooldownDays * day),
  );
  fresh.sort((a, b) => b.fit - a.fit || new Date(b.observedAt).getTime() - new Date(a.observedAt).getTime());
  const seen = new Set<string>();
  const out: string[] = [];
  for (const c of fresh) {
    if (out.length >= o.max) break;
    if (seen.has(c.prospectId)) continue;
    seen.add(c.prospectId);
    out.push(c.signalId);
  }
  return out;
}

/** Fit given to a TRAXY-tracked author: tracked because owners engage under their posts. */
export const TRACKED_AUTHOR_FIT = 60;
