// The pricing page quoted two contradictory, unsourced consultant prices and
// claimed "Same depth." Both blocks now agree and are labelled illustrative.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

describe('pricing comparison anchors', () => {
  const pricing = readFileSync('src/pages/Pricing.tsx', 'utf8');
  const anchor = readFileSync('src/components/landing/ValueAnchor.tsx', 'utf8');
  it('no contradictory consultant figures or parity claim', () => {
    expect(pricing).not.toContain('$1,500');
    expect(pricing).not.toContain('3-day engagement');
    expect(pricing).not.toMatch(/Same depth\./);
    expect(pricing).toContain('$2,000+');
    expect(anchor).toContain("cost: '$2,000 – $5,000'");
  });
  it('both comparison blocks say the figures are illustrative', () => {
    expect((pricing.match(/\(illustrative\)/g) || []).length).toBe(2);
    expect(anchor).toContain('Consultant and DIY figures are illustrative ranges, not quotes.');
  });
});
