import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { GA_MEASUREMENT_ID } from '@/lib/third-party-trackers';

// GA4 property "www.aiwmcquantis.com" (559317308), web stream 16156394813.
// G-NZE7RGVNEN sent every hit to a property the founder's account cannot open.
describe('GA4 measurement ID', () => {
  const html = readFileSync('index.html', 'utf8');
  const analytics = readFileSync('src/lib/analytics.ts', 'utf8');

  it('is the founder-owned Quantis web stream', () => {
    expect(GA_MEASUREMENT_ID).toBe('G-08096HWB3B');
  });

  it('index.html gtag config uses the same ID as the TS constant', () => {
    const ids = [...html.matchAll(/gtag\('config',\s*'(G-[A-Z0-9]+)'/g)].map((m) => m[1]);
    expect(ids).toEqual([GA_MEASUREMENT_ID]);
  });

  it('analytics.ts imports the ID instead of keeping its own literal', () => {
    expect(analytics).not.toMatch(/['"]G-[A-Z0-9]{6,}['"]/);
    expect(analytics).toContain("import { GA_MEASUREMENT_ID } from './third-party-trackers'");
  });

  it('the old ID and the Clarity placeholder are gone from index.html', () => {
    expect(html).not.toContain('G-NZE7RGVNEN');
    expect(html).not.toContain('CLARITY_ID');
  });
});
