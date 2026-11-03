/**
 * Instagram Harvest: classify a link into a triage item and group mentions.
 * Ported from marketing-team/tools/ig-harvest/harvest.py (classify + by_name).
 * Pure: no network, no DOM.
 */

export const ITEM_KINDS = ['repo', 'mobile app', 'file/doc', 'social', 'site/tool', 'profile'] as const;
export type ItemKind = (typeof ITEM_KINDS)[number];

export const PRODUCT_ROUTES = ['quantis', 'store', 'build', 'marketing', 'video'] as const;
export type ProductRoute = (typeof PRODUCT_ROUTES)[number];

/** Rough product routing for AIWMC; a link can match more than one. Copied from harvest.py. */
export const ROUTES: Record<ProductRoute, RegExp> = {
  quantis: /financ|cfo|fp&a|forecast|budget|cash|invoice|account|excel|sheet|model|monte|valuation|pricing|decision|analytics|data/,
  store: /website|web design|landing|seo|wordpress|webflow|framer|shopify|local business|google business|review/,
  build: /code|coding|developer|github|repo|ide|agent|llm|claude|gpt|cursor|vibe|app builder|no-code|nocode|api|mcp|open[- ]source/,
  marketing: /linkedin|instagram|reel|tiktok|youtube|content|post|hook|caption|viral|ads|outreach|cold email|lead|funnel|crm|newsletter/,
  video: /video|edit|capcut|premiere|subtitle|caption|voice|elevenlabs|avatar|heygen|runway|kling|motion/,
};

const SKIP_HOSTS = new Set(['instagram.com', 'l.instagram.com', 'cdninstagram.com', 'ig.me']);
const CODE_HOSTS = new Set(['github.com', 'gitlab.com', 'huggingface.co']);
const DOC_HOSTS = new Set(['notion.so', 'notion.site', 'drive.google.com', 'docs.google.com', 'dropbox.com']);
const SOCIAL_HOSTS = new Set(['youtube.com', 'youtu.be', 'tiktok.com', 'x.com', 'twitter.com', 'linkedin.com']);

const HIGH_SURROGATE = /[\uD800-\uDBFF]/;
const LOW_SURROGATE = /[\uDC00-\uDFFF]/;

/**
 * s.slice(start, end) without cutting an emoji in half. A lone surrogate
 * makes Postgres reject the whole jsonb batch, so every truncation uses this.
 */
export function safeSlice(s: string, start: number, end: number): string {
  let a = Math.max(0, start);
  let b = Math.min(s.length, end);
  if (a > 0 && a < s.length && LOW_SURROGATE.test(s[a])) a += 1;
  if (b < s.length && b > a && HIGH_SURROGATE.test(s[b - 1])) b -= 1;
  return s.slice(a, b);
}

export const clip = (s: string, max: number): string => safeSlice(s, 0, max);

/** Instagram's own pages and CDN are never a tool. */
export function isSkippedHost(host: string): boolean {
  return SKIP_HOSTS.has(host) || host.endsWith('.instagram.com') || host.endsWith('.cdninstagram.com') || host.endsWith('.fbcdn.net');
}

export function hostOf(url: string): string {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^(www|m)\./, '');
  } catch {
    return '';
  }
}

export interface Classified {
  host: string;
  kind: ItemKind;
  /** Display name: owner/repo for code hosts, the host for sites. */
  name: string;
  /** Stable dedupe key (stored as ig_harvest_items.item_key). */
  key: string;
  routes: ProductRoute[];
}

export function routesFor(url: string, context: string): ProductRoute[] {
  const hay = `${url} ${context}`.toLowerCase();
  return PRODUCT_ROUTES.filter((r) => ROUTES[r].test(hay));
}

export function classify(url: string, context = ''): Classified {
  let parsed: URL | null = null;
  try {
    parsed = new URL(url);
  } catch {
    parsed = null;
  }
  const host = hostOf(url);
  const segs = (parsed?.pathname ?? '').split('/').filter(Boolean);
  const routes = routesFor(url, context);

  if (CODE_HOSTS.has(host)) {
    // Hugging Face spaces/datasets carry one extra path segment before owner/name.
    const lead = host === 'huggingface.co' && (segs[0] === 'spaces' || segs[0] === 'datasets') ? 1 : 0;
    const parts = segs.slice(lead, lead + 2).map((s, i) => (i === 1 ? s.replace(/\.git$/i, '') : s));
    if (parts.length >= 2) {
      const name = [...segs.slice(0, lead), ...parts].join('/');
      return { host, kind: 'repo', name, key: `${host}/${name}`.toLowerCase(), routes };
    }
    const name = parts[0] ?? host;
    return { host, kind: 'profile', name, key: (parts[0] ? `${host}/${parts[0]}` : host).toLowerCase(), routes };
  }

  if (host.endsWith('apps.apple.com') || host === 'play.google.com') {
    if (host === 'play.google.com') {
      const id = parsed?.searchParams.get('id') ?? '';
      const name = id || segs.join('/') || host;
      return { host, kind: 'mobile app', name, key: `${host}/${name}`, routes };
    }
    const appIdx = segs.indexOf('app');
    const slug = appIdx >= 0 ? segs[appIdx + 1] ?? '' : '';
    const id = segs.find((s) => /^id\d+$/.test(s)) ?? '';
    const name = slug || segs.join('/') || host;
    return { host, kind: 'mobile app', name, key: `${host}/${id || name}`, routes };
  }

  if (DOC_HOSTS.has(host) || host.endsWith('.notion.site')) {
    // One item per document. Google URLs end in /edit, /view, ... after the id: cut there.
    const d = segs.indexOf('d');
    const path = (d >= 0 ? segs.slice(0, d + 2) : segs).join('/');
    const name = path ? clip(`${host}/${path}`, 160) : host;
    return { host, kind: 'file/doc', name, key: name, routes };
  }

  if (SOCIAL_HOSTS.has(host)) return { host, kind: 'social', name: host, key: host, routes };
  return { host, kind: 'site/tool', name: host, key: host, routes };
}

/** One link mention found in a DM or a saved post. */
export interface LinkMention {
  where: 'dm' | 'saved';
  thread: string;
  sender: string;
  /** YYYY-MM-DD (UTC) or '' when unknown. */
  date: string;
  url: string;
  /** Owner of a shared post, when the link came from a share. */
  postOwner: string;
  /** At most 300 characters around the link. */
  context: string;
}

/** One distinct tool/repo/file, shaped like an ig_harvest_items row. */
export interface HarvestItem {
  item_key: string;
  kind: ItemKind;
  host: string;
  name: string;
  example_url: string;
  urls: string[];
  mentions: number;
  routes: ProductRoute[];
  senders: string[];
  first_seen: string | null;
  last_seen: string | null;
  context: string | null;
}

export const MAX_URLS = 50;
export const MAX_SENDERS = 50;
export const MAX_CONTEXT = 300;

/** Group mentions into distinct items, dropping Instagram's own links. */
export function aggregate(mentions: LinkMention[]): HarvestItem[] {
  const byKey = new Map<string, HarvestItem>();
  for (const m of mentions) {
    const c = classify(m.url, m.context);
    if (!c.host || isSkippedHost(c.host)) continue;
    let g = byKey.get(c.key);
    if (!g) {
      g = {
        item_key: c.key, kind: c.kind, host: c.host, name: c.name, example_url: m.url,
        urls: [], mentions: 0, routes: [], senders: [], first_seen: null, last_seen: null, context: null,
      };
      byKey.set(c.key, g);
    }
    g.mentions += 1;
    if (!g.urls.includes(m.url) && g.urls.length < MAX_URLS) g.urls.push(m.url);
    for (const r of c.routes) if (!g.routes.includes(r)) g.routes.push(r);
    const who = (m.postOwner || m.sender).trim();
    if (who && !g.senders.includes(who) && g.senders.length < MAX_SENDERS) g.senders.push(who);
    if (m.date) {
      if (!g.first_seen || m.date < g.first_seen) g.first_seen = m.date;
      if (!g.last_seen || m.date > g.last_seen) g.last_seen = m.date;
    }
    if (!g.context && m.context.trim()) g.context = clip(m.context.replace(/\s+/g, ' ').trim(), MAX_CONTEXT);
  }
  for (const g of byKey.values()) g.routes.sort((a, b) => PRODUCT_ROUTES.indexOf(a) - PRODUCT_ROUTES.indexOf(b));
  return [...byKey.values()].sort((a, b) => b.mentions - a.mentions || a.item_key.localeCompare(b.item_key));
}
