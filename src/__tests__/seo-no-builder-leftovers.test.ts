import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

// SEO audit 2026-10-27 (Phase 2, item 10): leftovers from the old site
// builder. The gpteng.co script ran on every page and nothing in the app
// calls api.lovable.dev from the browser. Search Console is verified by DNS,
// so the empty verification meta only told crawlers nothing. Bing honours
// Crawl-delay and slows its crawl; Google ignores it.
describe('no builder leftovers on the public site', () => {
  const html = readFileSync('index.html', 'utf8');
  const csp = readFileSync('vercel.json', 'utf8');
  const robots = readFileSync('public/robots.txt', 'utf8');

  it('loads no gpteng.co script', () => {
    expect(html).not.toMatch(/<script[^>]+gpteng\.co/);
    expect(csp).not.toContain('cdn.gpteng.co');
  });

  it('allows no api.lovable.dev connections', () => {
    expect(csp).not.toContain('api.lovable.dev');
  });

  it('has no empty verification meta', () => {
    expect(html).not.toMatch(/<meta name="google-site-verification" content="" ?\/?>/);
  });

  it('robots.txt sets no Crawl-delay', () => {
    expect(robots).not.toMatch(/^Crawl-delay/im);
  });
});
