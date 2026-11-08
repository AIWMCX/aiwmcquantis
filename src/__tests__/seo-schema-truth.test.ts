import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { TIERS } from '@/config/tiers';
import { ENGAGEMENT_OFFERS } from '@/config/engagement-offers';
import { siteGraph } from '@/lib/seo/site-schema';

// SEO audit 2026-10-27: index.html injected one FAQPage on every page (not the
// page's visible FAQ) and both schema sources made claims the product doesn't
// back. Structured data is quoted by Google and AI engines, so it must be true.
const html = readFileSync('index.html', 'utf8');
const sd = readFileSync('src/components/seo/StructuredData.tsx', 'utf8');
const schemaSrc = readFileSync('src/lib/seo/site-schema.ts', 'utf8');
const raw = [...html.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].map((m) => JSON.parse(m[1]));
// Flatten @graph so each entity is checked on its own.
const blocks = raw.flatMap((b) => (b['@graph'] ? b['@graph'] : [b]));

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

  it('lists the yearly plans with billing periods', () => {
    const app = blocks.find((b) => b['@type'] === 'SoftwareApplication');
    const offer = (name: string) => app.offers.find((o: { name: string }) => o.name === name);
    expect(offer('Plus (yearly)').price).toBe(String(TIERS.plus.priceAnnual));
    expect(offer('Pro (yearly)').price).toBe(String(TIERS.pro.priceAnnual));
    expect(offer('Plus').priceSpecification.billingDuration).toBe('P1M');
    expect(offer('Plus (yearly)').priceSpecification.billingDuration).toBe('P1Y');
    expect(offer('Pro').priceSpecification.billingDuration).toBe('P1M');
    expect(offer('Pro (yearly)').priceSpecification.billingDuration).toBe('P1Y');
  });

  // GEO audit 2026-11-08: two SoftwareApplication entities (static + injected
  // after hydration), and the static Organization had no sameAs.
  it('is exactly siteGraph(): one Organization with sameAs, one SoftwareApplication', () => {
    expect(raw).toHaveLength(1);
    expect(raw[0]).toEqual(siteGraph());
    expect(blocks.filter((b) => b['@type'] === 'SoftwareApplication')).toHaveLength(1);
    const org = blocks.filter((b) => b['@type'] === 'Organization');
    expect(org).toHaveLength(1);
    expect(org[0].sameAs).toContain('https://x.com/aiwmcx1');
  });

  it('StructuredData.tsx does not inject a second site-wide entity', () => {
    const code = sd.replace(/\/\/.*$/gm, '');
    expect(code).not.toMatch(/'@type':\s*'(SoftwareApplication|Organization|WebSite)'/);
  });

  it('uses the real X handle', () => {
    expect(html).toContain('<meta name="twitter:site" content="@aiwmcx1" />');
    expect(html).not.toContain('@aiwmcquantis"');
  });
});

describe('no unbacked claims in schema sources', () => {
  const banned = /12 other failure modes|97,500 industry benchmarks|seasonality coefficients|Multi-Model|Collaborative Team|Monte Carlo Risk Simulation|Tornado|foundingDate|AI-powered business (idea )?valid/i;
  it('index.html', () => expect(html).not.toMatch(banned));
  it('StructuredData.tsx', () => expect(sd.replace(/\/\/.*$/gm, '')).not.toMatch(banned));
  it('site-schema.ts', () => expect(schemaSrc.replace(/\/\/.*$/gm, '')).not.toMatch(banned));
});
