/**
 * Published email finder -- pure helpers (no Deno, Node or network APIs).
 *
 * One file, two callers:
 *   - supabase/functions/li-enrich (scans a firm's own website for the
 *     addresses it publishes, then attaches one to a LinkedIn lead)
 *   - src/lib/li-growth/published-email.ts re-exports it for the admin page
 *
 * This is the compliant half of Traxy's enrichment mechanic:
 *   - an address counts only if the firm itself prints it on its own
 *     website (a mailto: link or visible text) on the site's own domain;
 *   - nothing is constructed, guessed or pattern-filled (no first.last@),
 *     and addresses hidden by Cloudflare email protection stay hidden;
 *   - only public http(s) hosts on ports 80/443 are fetched: no IP literals,
 *     localhost or internal names, never LinkedIn or another social network,
 *     and robots.txt is obeyed.
 */

export type EmailKind = 'personal' | 'role' | 'other';

export type WebsiteCheck = { ok: true; origin: string; host: string } | { ok: false; reason: string };

export type UrlCheck = { ok: true; url: URL } | { ok: false; reason: string };

/** The only pages a scan reads, in order, after robots.txt. */
export const candidatePaths = ['/', '/contact', '/contact-us', '/about', '/team'] as const;

export const PUBLISHED_EMAIL_METHOD = 'published_on_own_site';

// ─── Hosts and URLs ─────────────────────────────────────────────────────────

const IPV4 = /^\d{1,3}(?:\.\d{1,3}){3}$/;
const LABEL = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;
const TLD = /^(?:[a-z]{2,63}|xn--[a-z0-9-]{1,59})$/;

// Special-use and private names (RFC 6761, RFC 6762, RFC 8375, common LAN
// suffixes) that never name a firm's public website.
const NON_PUBLIC_SUFFIXES = [
  'localhost', 'localdomain', 'local', 'internal', 'intranet', 'lan', 'home', 'corp', 'private', 'svc',
  'test', 'example', 'invalid', 'onion', 'arpa', 'example.com', 'example.net', 'example.org',
];

// Not the firm's own website. LinkedIn is never fetched by anything in the
// LinkedIn Growth workflow; the others forbid scraping in their terms.
const PLATFORM_HOSTS = [
  'linkedin.com', 'lnkd.in', 'facebook.com', 'fb.com', 'instagram.com', 'twitter.com', 'x.com',
  'tiktok.com', 'youtube.com', 'threads.net',
];

const endsWithDomain = (host: string, domain: string) => host === domain || host.endsWith(`.${domain}`);

/** Why a hostname may not be fetched, or null when it is a public domain name. */
export function hostProblem(host: string): string | null {
  const h = host.trim().toLowerCase().replace(/\.$/, '');
  if (!h) return 'Enter the firm\'s website';
  if (h.includes(':') || h.startsWith('[') || IPV4.test(h)) return 'IP addresses are not allowed: use the firm\'s domain name';
  const labels = h.split('.');
  if (labels.length < 2 || !labels.every((l) => LABEL.test(l)) || !TLD.test(labels[labels.length - 1])) {
    return 'Not a public domain name';
  }
  if (NON_PUBLIC_SUFFIXES.some((s) => endsWithDomain(h, s))) return 'Not a public domain name';
  if (PLATFORM_HOSTS.some((s) => endsWithDomain(h, s))) return 'Not the firm\'s own website: LinkedIn and social networks are never read';
  return null;
}

/**
 * The firm's website as a bare origin (`https://acme.com`): http/https only,
 * path, query and fragment dropped, no credentials, no non-default port, and
 * the host must pass hostProblem(). A missing scheme means https.
 */
export function normalizeWebsite(input: string | null | undefined): WebsiteCheck {
  const raw = (input ?? '').trim();
  if (!raw) return { ok: false, reason: 'Enter the firm\'s website' };
  if (/\s/.test(raw)) return { ok: false, reason: 'A website has no spaces' };
  const scheme = raw.match(/^([a-z][a-z0-9+.-]*):\/\//i)?.[1]?.toLowerCase();
  if (scheme && scheme !== 'http' && scheme !== 'https') return { ok: false, reason: 'Only http:// or https:// websites' };
  if (!scheme && /^(javascript|data|file|mailto|vbscript|blob|about|ftp|ws|wss):/i.test(raw)) {
    return { ok: false, reason: 'Only http:// or https:// websites' };
  }
  let url: URL;
  try {
    url = new URL(scheme ? raw : `https://${raw.replace(/^\/+/, '')}`);
  } catch {
    return { ok: false, reason: 'Not a valid website address' };
  }
  if (url.username || url.password) return { ok: false, reason: 'A website address has no user name or password' };
  if (url.port) return { ok: false, reason: 'Only the standard web ports (80 and 443)' };
  const host = url.hostname.toLowerCase().replace(/\.$/, '');
  const problem = hostProblem(host);
  if (problem) return { ok: false, reason: problem };
  return { ok: true, origin: `${url.protocol}//${host}`, host };
}

/** The site's own domain: the host without a leading "www.". */
export function siteDomain(host: string): string {
  const h = host.trim().toLowerCase().replace(/\.$/, '');
  return h.startsWith('www.') && h.split('.').length > 2 ? h.slice(4) : h;
}

/**
 * True when `domain` (an email domain or a redirect host) belongs to the site
 * at `siteHost`: the same domain or a subdomain of it. A parent domain does
 * not count (acme.example-host.com does not own example-host.com mail).
 */
export function sameSite(domain: string, siteHost: string): boolean {
  const d = domain.trim().toLowerCase().replace(/\.$/, '');
  return !!d && endsWithDomain(d, siteDomain(siteHost));
}

/**
 * A URL the scanner may request for this site: http/https, no credentials,
 * ports 80/443 only, a public host on the same site. Used for every page and
 * for every redirect hop (redirects are followed by hand, never off-site).
 */
export function checkSameSiteUrl(href: string, siteHost: string, base?: string): UrlCheck {
  let url: URL;
  try {
    url = base ? new URL(href, base) : new URL(href);
  } catch {
    return { ok: false, reason: 'Not a valid URL' };
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return { ok: false, reason: 'Only http:// or https:// pages' };
  if (url.username || url.password) return { ok: false, reason: 'URL has credentials' };
  if (url.port) return { ok: false, reason: 'Only the standard web ports (80 and 443)' };
  const problem = hostProblem(url.hostname);
  if (problem) return { ok: false, reason: problem };
  if (!sameSite(url.hostname, siteHost)) return { ok: false, reason: `Leaves the firm's site (${url.hostname})` };
  url.hash = '';
  return { ok: true, url };
}

function expandIpv6(ip: string): number[] | null {
  const halves = ip.split('::');
  if (halves.length > 2) return null;
  const part = (s: string) => (s ? s.split(':') : []);
  const head = part(halves[0]);
  const tail = halves.length === 2 ? part(halves[1]) : [];
  const fill = halves.length === 2 ? 8 - head.length - tail.length : 0;
  const groups = [...head, ...Array(Math.max(0, fill)).fill('0'), ...tail];
  if (groups.length !== 8 || !groups.every((g) => /^[0-9a-f]{1,4}$/i.test(g))) return null;
  return groups.map((g) => parseInt(g, 16));
}

function isPublicIpv4(ip: string): boolean {
  const o = ip.split('.').map(Number);
  if (o.length !== 4 || o.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return false;
  const [a, b, c] = o;
  if (a === 0 || a === 10 || a === 127 || a >= 224) return false; // this network, private, loopback, multicast, reserved
  if (a === 100 && b >= 64 && b <= 127) return false; // carrier-grade NAT
  if (a === 169 && b === 254) return false; // link-local, cloud metadata
  if (a === 172 && b >= 16 && b <= 31) return false;
  if (a === 192 && b === 168) return false;
  if (a === 192 && b === 0 && (c === 0 || c === 2)) return false; // IETF protocol assignments, TEST-NET-1
  if (a === 198 && (b === 18 || b === 19)) return false; // benchmarking
  if (a === 198 && b === 51 && c === 100) return false; // TEST-NET-2
  if (a === 203 && b === 0 && c === 113) return false; // TEST-NET-3
  return true;
}

/**
 * True only for a globally routable unicast address. Used after DNS so a
 * public-looking name that points at a private or metadata address is refused.
 */
export function isPublicIp(ip: string): boolean {
  const v = ip.trim().toLowerCase().replace(/^\[|\]$/g, '');
  if (IPV4.test(v)) return isPublicIpv4(v);
  const mapped = v.match(/^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/);
  if (mapped) return isPublicIpv4(mapped[1]);
  if (v.includes('.')) return false; // other embedded-IPv4 forms
  const g = expandIpv6(v);
  if (!g) return false;
  if (g[0] < 0x2000 || g[0] > 0x3fff) return false; // only 2000::/3 is global unicast
  if (g[0] === 0x2001 && (g[1] === 0x0db8 || g[1] === 0x0000)) return false; // documentation, Teredo
  if (g[0] === 0x2002) return false; // 6to4 can wrap a private IPv4
  return true;
}

// ─── robots.txt (RFC 9309) ──────────────────────────────────────────────────

interface RobotsGroup {
  agents: string[];
  rules: Array<{ allow: boolean; pattern: string }>;
}

function parseRobots(text: string): RobotsGroup[] {
  const groups: RobotsGroup[] = [];
  let current: RobotsGroup | null = null;
  let lastWasAgent = false;
  for (const rawLine of text.replace(/^﻿/, '').split(/\r\n|\r|\n/)) {
    const line = rawLine.replace(/#.*$/, '').trim();
    const sep = line.indexOf(':');
    if (sep < 0) continue;
    const key = line.slice(0, sep).trim().toLowerCase();
    const value = line.slice(sep + 1).trim();
    if (key === 'user-agent') {
      if (!current || !lastWasAgent) {
        current = { agents: [], rules: [] };
        groups.push(current);
      }
      current.agents.push(value.toLowerCase());
      lastWasAgent = true;
    } else if (key === 'allow' || key === 'disallow') {
      if (current && value) current.rules.push({ allow: key === 'allow', pattern: value });
      lastWasAgent = false;
    } else {
      lastWasAgent = false;
    }
  }
  return groups;
}

function robotsPatternMatches(pattern: string, path: string): boolean {
  const anchored = pattern.endsWith('$');
  const body = anchored ? pattern.slice(0, -1) : pattern;
  const source = body.split('*').map((s) => s.replace(/[.+?^${}()|[\]\\]/g, '\\$&')).join('.*');
  return new RegExp(`^${source}${anchored ? '$' : ''}`).test(path);
}

/**
 * Whether robots.txt lets us read `path` (path plus query). Uses the group
 * that names `agent` if there is one, otherwise the `User-agent: *` group(s);
 * the longest matching rule wins and Allow wins a tie (RFC 9309 2.2.2). No
 * applicable group means everything is allowed.
 */
export function robotsAllows(robotsTxt: string, path: string, agent = 'aiwmc'): boolean {
  const groups = parseRobots(robotsTxt ?? '');
  const ours = groups.filter((g) => g.agents.includes(agent.toLowerCase()));
  const rules = (ours.length ? ours : groups.filter((g) => g.agents.includes('*'))).flatMap((g) => g.rules);
  let best: { allow: boolean; length: number } | null = null;
  for (const r of rules) {
    if (!robotsPatternMatches(r.pattern, path)) continue;
    const length = r.pattern.length;
    if (!best || length > best.length || (length === best.length && r.allow && !best.allow)) best = { allow: r.allow, length };
  }
  return best ? best.allow : true;
}

// ─── Extraction ─────────────────────────────────────────────────────────────

// Marks where an inline tag or comment sat inside a word, so an address split
// by markup (jane<wbr>doe@…) is dropped instead of cut short to doe@….
const GLUE = '\u0000';
const LOCAL_CH = 'a-z0-9._%+\\-'; // hyphen escaped: '@' is appended to this class below
const EMAIL_IN_TEXT = new RegExp(
  `(?<![${LOCAL_CH}@])(?<![${LOCAL_CH}@]${GLUE}+)` +
    `([${LOCAL_CH}]{1,64})@((?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\\.)+[a-z]{2,24})` +
    `(?![a-z0-9-])(?!\\.[a-z0-9])(?!${GLUE}+[a-z0-9.@-])`,
  'g',
);
const INLINE_TAGS = 'a|abbr|b|bdi|bdo|cite|code|data|em|font|i|kbd|mark|q|s|samp|small|span|strong|sub|sup|time|u|var|wbr';
const ENTITY_BEFORE = /&(#\d{1,7}|#x[0-9a-f]{1,6}|[a-z]{2,10});$/;
const ENTITY_AFTER = /^&(#\d{1,7}|#x[0-9a-f]{1,6}|[a-z]{2,10});/;
const NAMED_ENTITY_CHARS: Record<string, string> = { period: '.', plus: '+', lowbar: '_', hyphen: '-', dash: '-', commat: '@', percnt: '%' };
// name@2x.png and friends: image, font, script and media files, not mail.
const ASSET_TLDS = new Set([
  'png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'avif', 'ico', 'bmp', 'tif', 'tiff', 'css', 'js', 'mjs', 'json', 'xml',
  'map', 'woff', 'woff2', 'ttf', 'otf', 'eot', 'mp4', 'webm', 'mov', 'mp3', 'wav', 'pdf', 'zip',
]);

function entityChar(entity: string): string {
  const body = entity.slice(1, -1);
  if (body.startsWith('#x')) return String.fromCodePoint(parseInt(body.slice(2), 16) || 0);
  if (body.startsWith('#')) return String.fromCodePoint(Number(body.slice(1)) || 0);
  return NAMED_ENTITY_CHARS[body] ?? '';
}

/** Literal addresses in already lower-cased text; never decodes or repairs one. */
function matchEmails(text: string): string[] {
  const out: string[] = [];
  for (const m of text.matchAll(EMAIL_IN_TEXT)) {
    const [whole, local, domain] = m;
    const start = m.index ?? 0;
    // An adjacent entity that stands for an address character means the
    // address is obfuscated or split: skip it rather than return a fragment.
    const before = text.slice(Math.max(0, start - 12), start).match(ENTITY_BEFORE)?.[0];
    if (before && /[a-z0-9._%+@-]/i.test(entityChar(before))) continue;
    const after = text.slice(start + whole.length, start + whole.length + 12).match(ENTITY_AFTER)?.[0];
    if (after && /[a-z0-9.@-]/i.test(entityChar(after))) continue;
    if (local.startsWith('.') || local.endsWith('.') || local.includes('..')) continue;
    if (whole.length > 254) continue;
    if (ASSET_TLDS.has(domain.slice(domain.lastIndexOf('.') + 1))) continue;
    out.push(whole);
  }
  return out;
}

/** True when the page hides addresses behind Cloudflare email protection. */
export function hasProtectedEmails(html: string): boolean {
  return /\/cdn-cgi\/l\/email-protection|data-cfemail|__cf_email__/i.test(html ?? '');
}

/**
 * Every address the page publishes, from mailto: links and visible text:
 * lower-cased, de-duplicated, in page order (mailto first). Each result is a
 * literal substring of the (lower-cased) HTML: entities are not decoded and
 * Cloudflare-protected addresses (/cdn-cgi/l/email-protection, data-cfemail)
 * are skipped, never decoded. Script, style and attribute text is ignored.
 */
export function extractEmails(html: string): string[] {
  const page = (html ?? '').toLowerCase()
    .replace(/<a\b[^>]*\/cdn-cgi\/l\/email-protection[^>]*>[\s\S]*?<\/a\s*>/g, ' ')
    .replace(/<(\w+)\b[^>]*(?:data-cfemail|__cf_email__)[^>]*>[\s\S]*?<\/\1\s*>/g, ' ')
    .replace(/<(script|style|template)\b[^>]*>[\s\S]*?<\/\1\s*>/g, ' ');
  const found: string[] = [];
  for (const m of page.matchAll(/\bhref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g)) {
    const value = (m[1] ?? m[2] ?? m[3] ?? '').trim();
    if (value.startsWith('mailto:')) found.push(...matchEmails(value.slice(7)));
  }
  const text = page
    .replace(/<!--[\s\S]*?-->/g, GLUE)
    .replace(new RegExp(`</?(?:${INLINE_TAGS})\\b[^>]*>`, 'g'), GLUE)
    .replace(/<[^>]*>/g, ' ');
  found.push(...matchEmails(text));
  return Array.from(new Set(found));
}

export function emailDomain(email: string): string {
  return email.slice(email.lastIndexOf('@') + 1).toLowerCase();
}

/**
 * The page's addresses on the site's own domain only: a gmail.com, agency or
 * platform address printed on the page is not the firm's published address.
 */
export function publishedSiteEmails(html: string, siteHost: string): string[] {
  return extractEmails(html).filter((e) => sameSite(emailDomain(e), siteHost));
}

/** Shape check for an address we were handed back (same pattern as extraction). */
export function isEmailShape(email: string): boolean {
  const e = email.trim().toLowerCase();
  const found = matchEmails(e);
  return e.length <= 254 && found.length === 1 && found[0] === e;
}

// ─── Classification ─────────────────────────────────────────────────────────

const ROLE_LOCALS = new Set([
  'info', 'hello', 'hi', 'contact', 'contacts', 'office', 'admin', 'administrator', 'support', 'help', 'sales', 'team',
  'enquiries', 'enquiry', 'inquiries', 'inquiry', 'mail', 'email', 'accounts', 'accounting', 'billing', 'invoices',
  'finance', 'careers', 'jobs', 'hr', 'recruiting', 'marketing', 'media', 'press', 'pr', 'service', 'services',
  'frontdesk', 'reception', 'bookkeeping', 'tax', 'taxes', 'general', 'studio', 'connect', 'clients', 'client',
  'newbusiness', 'partners', 'webmaster', 'postmaster', 'privacy', 'legal', 'compliance', 'noreply', 'no-reply',
  'donotreply', 'orders', 'staff', 'appointments', 'booking', 'bookings', 'scheduling', 'events', 'feedback',
  'questions', 'ask',
]);
const NAME_NOISE = /^(jr|sr|ii|iii|iv|cpa|cfa|cma|mba|phd|dr|mr|mrs|ms|esq|pe)$/;

function nameParts(personName: string | null | undefined): { first: string; last: string } {
  const clean = (personName ?? '').split(',')[0].normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const tokens = clean.split(/[^a-z'-]+/).map((t) => t.replace(/['-]/g, '')).filter((t) => t && !NAME_NOISE.test(t));
  return { first: tokens[0] ?? '', last: tokens.length > 1 ? tokens[tokens.length - 1] : '' };
}

/**
 * personal: the local part is this person's name (jane, jane.doe, jdoe, …);
 * role: a shared inbox (info@, hello@, office@, sales-team@, …);
 * other: anything else (possibly a colleague).
 */
export function classifyEmail(local: string, personName: string | null | undefined): EmailKind {
  const l = local.trim().toLowerCase().split('+')[0];
  const tokens = l.split(/[._-]+/).filter(Boolean);
  const head = tokens[0] ?? '';
  if (ROLE_LOCALS.has(l) || (head.length >= 4 && ROLE_LOCALS.has(head))) return 'role';
  const { first, last } = nameParts(personName);
  if (!first) return 'other';
  const compact = l.replace(/[._-]/g, '');
  const forms = new Set([first, last].filter(Boolean));
  if (last) {
    for (const s of ['', '.', '_', '-']) {
      forms.add(`${first}${s}${last}`).add(`${last}${s}${first}`).add(`${first[0]}${s}${last}`).add(`${first}${s}${last[0]}`);
    }
  }
  if (forms.has(l)) return 'personal';
  if ((first.length >= 2 && tokens.includes(first)) || (last.length >= 2 && tokens.includes(last))) return 'personal';
  if ((first.length >= 3 && compact.startsWith(first)) || (last.length >= 3 && compact.includes(last))) return 'personal';
  return 'other';
}

// ─── Storage ────────────────────────────────────────────────────────────────

// Same pattern as extractAddresses() in _shared/mail/routing.ts, which the
// outreach sender uses to read the recipient from contact_channel.
const CHANNEL_EMAIL = /[A-Za-z0-9._%+'-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/;

/** The address the sender would use from a contact_channel value, if any. */
export function channelEmail(channel: string | null | undefined): string | null {
  const m = (channel ?? '').match(CHANNEL_EMAIL);
  return m ? m[0].toLowerCase().replace(/\.+$/, '') : null;
}

/**
 * contact_channel with the address added in front ("email:<address>
 * linkedin:<url>"), keeping whatever was there (the LinkedIn URL). Refuses to
 * replace a different address that is already stored.
 */
export function withEmailChannel(
  channel: string | null | undefined,
  email: string,
): { ok: true; channel: string } | { ok: false; existing: string } {
  const existing = channelEmail(channel);
  if (existing && existing !== email) return { ok: false, existing };
  if (existing) return { ok: true, channel: (channel ?? '').trim() };
  const rest = (channel ?? '').trim();
  return { ok: true, channel: rest ? `email:${email} ${rest}` : `email:${email}` };
}

export interface PublishedEmailEvidence {
  email: string;
  email_source_url: string;
  email_kind: EmailKind;
  found_at: string;
  method: typeof PUBLISHED_EMAIL_METHOD;
}

/** supporting_evidence with this entry appended (replacing an older one for the same address). */
export function appendEmailEvidence(existing: unknown, entry: PublishedEmailEvidence): unknown[] {
  const list = Array.isArray(existing) ? existing : [];
  const isSame = (e: unknown) => {
    const x = e as Partial<PublishedEmailEvidence> | null;
    return !!x && typeof x === 'object' && x.method === PUBLISHED_EMAIL_METHOD && x.email === entry.email;
  };
  return [...list.filter((e) => !isSame(e)), entry];
}

/** The evidence entry for an attached address, for the page to link its source. */
export function latestEmailEvidence(existing: unknown, email: string | null): PublishedEmailEvidence | null {
  if (!email || !Array.isArray(existing)) return null;
  for (let i = existing.length - 1; i >= 0; i--) {
    const x = existing[i] as Partial<PublishedEmailEvidence> | null;
    if (x && typeof x === 'object' && x.method === PUBLISHED_EMAIL_METHOD && x.email === email && typeof x.email_source_url === 'string') {
      return x as PublishedEmailEvidence;
    }
  }
  return null;
}
