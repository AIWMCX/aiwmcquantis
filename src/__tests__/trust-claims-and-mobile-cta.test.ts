// 2026-10-23: unbacked security claims removed; sticky mobile CTA no longer
// duplicates the hero decision input.
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';

const read = (p: string) => readFileSync(p, 'utf8');

describe('trust claims', () => {
  it('no bank-grade / SOC 2 prep / EU-only claims in the landing components', () => {
    for (const f of ['src/components/landing/StickyMobileCTA.tsx', 'src/components/landing/PricingFAQ.tsx', 'src/components/landing/TrustStrip.tsx']) {
      expect(read(f)).not.toMatch(/bank-(grade|level)|SOC 2 Ready|Security posture in prep|never leaves EU/i);
    }
    expect(existsSync('src/components/landing/SecurityBadges.tsx')).toBe(false);
  });
});

describe('sticky mobile CTA', () => {
  it('treats the hero decision input as "form on screen"', () => {
    const src = read('src/components/landing/StickyMobileCTA.tsx');
    expect(src).toContain("document.getElementById('sdw-hero-idea')?.closest('form')");
    expect(src).toContain('heroVisible || heroInputVisible');
  });
});
