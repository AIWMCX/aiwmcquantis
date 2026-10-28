import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

// SEO audit 2026-10-27: /r/<anything> served the homepage head with
// "index, follow", so any report link (or a made-up one) was a soft-404 copy of
// the homepage. The noindex in PageSEO only applies after JavaScript runs.
describe('/r/* report pages', () => {
  it('are noindexed by a server header', () => {
    const cfg = JSON.parse(readFileSync('vercel.json', 'utf8'));
    const rule = cfg.headers.find((h: { source: string }) => h.source === '/r/(.*)');
    expect(rule?.headers).toContainEqual({ key: 'X-Robots-Tag', value: 'noindex' });
  });

  it('stay out of the sitemap', () => {
    expect(readFileSync('public/sitemap.xml', 'utf8')).not.toMatch(/\/r\//);
  });
});
