// GEO audit 2026-11-08: the `/demo/(.*)` -> /index.html rewrite made every
// unknown /demo/<slug> return 200 with the homepage (a soft 404). The six real
// demo routes are now rewritten one by one to their own prerendered file, so
// an unknown slug falls through to the 404 page.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
// Plain .mjs route registry shared with the build scripts.
import { PUBLIC_ROUTES } from '../../scripts/seo.routes.mjs';

type Rewrite = { source: string; destination: string };
const rewrites: Rewrite[] = JSON.parse(readFileSync('vercel.json', 'utf8')).rewrites;

// Vercel source patterns here are literal paths or a trailing `(.*)` group.
const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const matches = (source: string, path: string) =>
  new RegExp(`^${source.split('(.*)').map(escape).join('(.*)')}$`).test(path);

const sitemapDemos: string[] = (PUBLIC_ROUTES as { path: string }[])
  .map((r) => r.path)
  .filter((p) => p.startsWith('/demo/'));
const routerDemos = [...readFileSync('src/App.tsx', 'utf8').matchAll(/<Route path="(\/demo\/[^"]+)"/g)].map((m) => m[1]);

describe('vercel.json /demo routes', () => {
  it('the router and the sitemap list the same six demo routes', () => {
    expect(sitemapDemos).toHaveLength(6);
    expect([...routerDemos].sort()).toEqual([...sitemapDemos].sort());
  });

  it('has no catch-all /demo rewrite', () => {
    expect(rewrites.some((r) => r.source.startsWith('/demo/') && r.source.includes('('))).toBe(false);
  });

  it.each(sitemapDemos)('%s is rewritten to its own prerendered file', (path) => {
    const hit = rewrites.filter((r) => matches(r.source, path));
    expect(hit).toEqual([{ source: path, destination: `${path}/index.html` }]);
  });

  it.each(['/demo/notreal', '/demo/hiring-decision-x', '/demo/', '/demo/a/b'])('%s matches no rewrite (404)', (path) => {
    expect(rewrites.filter((r) => matches(r.source, path))).toEqual([]);
  });

  it('the matcher understands the (.*) rewrites it sits next to', () => {
    expect(rewrites.some((r) => matches(r.source, '/admin/users'))).toBe(true);
    expect(rewrites.some((r) => matches(r.source, '/r/abc123'))).toBe(true);
  });
});
