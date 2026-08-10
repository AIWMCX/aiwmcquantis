/**
 * Quantis Evidence Service — canonical URL normalization (PR E3 scope,
 * built alongside E1 since dedupe.ts depends on it).
 *
 * Pure function, no network I/O. Two URLs that normalize to the same
 * canonical string are treated as the same document for dedup/independence
 * purposes (dedupe.ts). This is intentionally conservative: it only
 * removes parameters that are near-universally tracking-only (verified
 * against real-world usage, not guessed), and it never rewrites path
 * segments, since path differences usually mean different content.
 */

/**
 * Query parameter names stripped unconditionally because they carry no
 * document-identity information -- they vary per click/campaign/referrer
 * while pointing at the exact same underlying content.
 */
const TRACKING_PARAM_NAMES = new Set([
  // Google Analytics / Google Ads
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
  'utm_id',
  'gclid',
  'gclsrc',
  'dclid',
  '_ga',
  '_gl',
  // Facebook / Meta
  'fbclid',
  'igshid',
  // Microsoft / Bing
  'msclkid',
  // Twitter / X
  'twclid',
  // Mailchimp
  'mc_cid',
  'mc_eid',
  // Yandex
  'yclid',
  // HubSpot
  '_hsenc',
  '_hsmi',
  'hsCtaTracking',
  // Generic referral/affiliate markers
  'ref',
  'ref_src',
  'ref_url',
  'source',
  'spm',
  // Vero
  'vero_id',
  'vero_conv',
]);

const DEFAULT_PORTS: Record<string, string> = {
  'http:': '80',
  'https:': '443',
};

export interface CanonicalizeResult {
  ok: boolean;
  canonicalUrl?: string;
  reason?: string;
}

/**
 * Normalizes a URL for identity comparison. Returns `{ ok: false }` for
 * unparseable input rather than throwing -- callers (dedupe.ts, the
 * eventual retrieval pipeline) must handle malformed URLs from untrusted
 * provider responses without crashing.
 */
export function canonicalizeUrl(rawUrl: string): CanonicalizeResult {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return { ok: false, reason: 'EMPTY_INPUT' };
  }

  let parsed: URL;
  try {
    parsed = new URL(rawUrl.trim());
  } catch {
    return { ok: false, reason: 'UNPARSEABLE' };
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { ok: false, reason: 'UNSUPPORTED_SCHEME' };
  }

  const scheme = parsed.protocol;
  let host = parsed.hostname.toLowerCase();
  if (host.startsWith('www.')) {
    host = host.slice(4);
  }

  const port =
    parsed.port && parsed.port !== DEFAULT_PORTS[scheme] ? `:${parsed.port}` : '';

  let path = parsed.pathname;
  if (path.length > 1 && path.endsWith('/')) {
    path = path.slice(0, -1);
  }
  if (path === '') {
    path = '/';
  }

  const keptParams: [string, string][] = [];
  for (const [key, value] of parsed.searchParams.entries()) {
    if (TRACKING_PARAM_NAMES.has(key.toLowerCase())) continue;
    keptParams.push([key, value]);
  }
  keptParams.sort(([a], [b]) => a.localeCompare(b));

  const query = keptParams.length
    ? '?' + keptParams.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&')
    : '';

  // Fragment (#...) is intentionally dropped: it addresses a location
  // within a document, never a different document.
  const canonicalUrl = `${scheme}//${host}${port}${path}${query}`;

  return { ok: true, canonicalUrl };
}

/** Convenience boolean check used by dedupe.ts and tests. */
export function sameCanonicalUrl(a: string, b: string): boolean {
  const ca = canonicalizeUrl(a);
  const cb = canonicalizeUrl(b);
  return ca.ok && cb.ok && ca.canonicalUrl === cb.canonicalUrl;
}
