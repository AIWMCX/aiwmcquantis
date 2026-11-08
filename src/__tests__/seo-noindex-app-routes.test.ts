import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

// 2026-11-08: app-only routes (/email-preferences, /engagement-intake, /quote,
// /trial, /docs, /admin/*, ...) are rewritten to the SPA shell, so crawlers got
// the homepage <head> and static body with "index, follow": duplicate-homepage
// pages in Google's index. Every such route now sends X-Robots-Tag: noindex,
// and nothing in the sitemap may be noindexed.

type Rule = { source: string; destination?: string; headers?: { key: string; value: string }[] };
const cfg = JSON.parse(readFileSync('vercel.json', 'utf8')) as { rewrites: Rule[]; headers: Rule[] };
const sitemap = new Set(
  [...readFileSync('public/sitemap.xml', 'utf8').matchAll(/<loc>https:\/\/www\.aiwmcquantis\.com([^<]*)<\/loc>/g)].map((m) => m[1]),
);
const noindexSources = new Set(
  cfg.headers
    .filter((h) => h.headers?.some((x) => x.key === 'X-Robots-Tag' && /noindex/.test(x.value)))
    .map((h) => h.source),
);

/** Vercel path-to-regexp subset used in vercel.json: literal paths and a trailing "(.*)". */
function matches(source: string, path: string): boolean {
  const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp('^' + source.split('(.*)').map(escape).join('.*') + '$');
  return re.test(path);
}

describe('app-only SPA routes are noindexed', () => {
  it('every rewrite to the SPA shell that is not a sitemap page sends X-Robots-Tag: noindex', () => {
    const missing = cfg.rewrites
      .filter((r) => r.destination === '/index.html' && !sitemap.has(r.source))
      .map((r) => r.source)
      .filter((s) => !noindexSources.has(s));
    expect(missing).toEqual([]);
  });

  it('covers the utility pages found serving the homepage with index,follow', () => {
    for (const s of ['/email-preferences', '/email-confirmed', '/engagement-intake', '/quote', '/trial', '/docs', '/directory-tracker', '/scenario']) {
      expect(noindexSources.has(s), s).toBe(true);
    }
  });

  it('never noindexes a page that is in the sitemap', () => {
    const clash = [...sitemap].filter((path) => [...noindexSources].some((src) => matches(src, path)));
    expect(clash).toEqual([]);
  });
});
