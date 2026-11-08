import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  GA_MEASUREMENT_ID,
  GA_MEASUREMENT_IDS,
  GA_SECONDARY_MEASUREMENT_ID,
} from '@/lib/third-party-trackers';

// Primary: "AIWMC Quantis™" (520326058), owner aiwmcsrm@gmail.com, history since Jan 2026.
// Secondary: "www.aiwmcquantis.com" (559317308), owner jeltovbogdan@gmail.com.
// #435 replaced the primary and cut the history property off for a day. This guards it.
describe('GA4 measurement IDs', () => {
  const html = readFileSync('index.html', 'utf8');
  const analytics = readFileSync('src/lib/analytics.ts', 'utf8');

  it('keeps the history property primary', () => {
    expect(GA_MEASUREMENT_ID).toBe('G-NZE7RGVNEN');
    expect(GA_SECONDARY_MEASUREMENT_ID).toBe('G-08096HWB3B');
    expect([...GA_MEASUREMENT_IDS]).toEqual(['G-NZE7RGVNEN', 'G-08096HWB3B']);
  });

  it('index.html configures exactly the same IDs, in order', () => {
    const ids = [...html.matchAll(/gtag\('config',\s*'(G-[A-Z0-9]+)'/g)].map((m) => m[1]);
    expect(ids).toEqual([...GA_MEASUREMENT_IDS]);
  });

  it('analytics.ts imports the IDs instead of keeping its own literal', () => {
    expect(analytics).not.toMatch(/['"]G-[A-Z0-9]{6,}['"]/);
    expect(analytics).toContain('GA_MEASUREMENT_IDS');
  });

  it('keeps the Clarity placeholder out of index.html', () => {
    expect(html).not.toContain('CLARITY_ID');
  });
});
