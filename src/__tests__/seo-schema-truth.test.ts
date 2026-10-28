import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { TIERS } from '@/config/tiers';
import { ENGAGEMENT_OFFERS } from '@/config/engagement-offers';

// SEO audit 2026-10-27: index.html injected one FAQPage on every page (not the
// page's visible FAQ) and both schema sources made claims the product doesn't
// back. Structured data is quoted by Google and AI engines, so it must be true.
const html = readFileSync('index.html', 'utf8');
const sd = readFileSync('src/components/seo/StructuredData.tsx', 'utf8');
const blocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => JSON.parse(m[1]));

describe('static structured data in index.html', () => {
  it('has no site-wide FAQPage', () => {
    expect(blocks.some((b) => b['@type'] === 'FAQPage')).toBe(false);
  });

  it('lists every plan and one-time offer at its real price', () => {
    const app = blocks.find((b) => b['@type'] === 'SoftwareApplication');
    const price = (name: string) => app.offers.find((o: { name: string }) => o.name === name)?.price;
    expect(price('Free')).toBe('0');
    expect(price('Plus')).toBe(String(TIERS.plus.priceMonthly));
    expect(price('Pro')).toBe(String(TIERS.pro.priceMonthly));
    for (const o of ENGAGEMENT_OFFERS) expect(price(o.name)).toBe(String(o.price));
    expect(app.offers[0].description).toContain(`${TIERS.free.limits.analysesPerMonth} complete Decision Runs`);
  });
});

describe('no unbacked claims in schema sources', () => {
  const banned = /12 other failure modes|97,500 industry benchmarks|seasonality coefficients|Multi-Model|Collaborative Team|Monte Carlo Risk Simulation|Tornado|foundingDate|AI-powered business (idea )?valid/i;
  it('index.html', () => expect(html).not.toMatch(banned));
  it('StructuredData.tsx', () => expect(sd.replace(/\/\/.*$/gm, '')).not.toMatch(banned));
});
