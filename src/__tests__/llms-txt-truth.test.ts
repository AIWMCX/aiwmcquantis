import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { TIERS } from '@/config/tiers';
import { ENGAGEMENT_OFFERS } from '@/config/engagement-offers';

// AI answer engines quote llms.txt nearly verbatim. SEO audit 2026-10-27 found it
// saying "Free tier gives one full analysis" (real: 5/month) and omitting the
// paid offers. Keep every price and limit in step with config.
const txt = readFileSync('public/llms.txt', 'utf8');

describe('public/llms.txt', () => {
  it('states the real free limit', () => {
    expect(txt).toContain(`${TIERS.free.limits.analysesPerMonth} complete Decision Runs per month`);
    expect(txt).not.toMatch(/one full analysis/i);
  });

  it('states the real plan prices', () => {
    expect(txt).toContain(`Plus ($${TIERS.plus.priceMonthly}/month or $${TIERS.plus.priceAnnual}/year)`);
    expect(txt).toContain(`Pro ($${TIERS.pro.priceMonthly}/month or $${TIERS.pro.priceAnnual}/year)`);
  });

  it('lists every one-time offer at its real price', () => {
    for (const o of ENGAGEMENT_OFFERS) expect(txt).toContain(`${o.name}](/decision-review) ($${o.price}, one-time)`);
  });

  it('makes no prediction or old-positioning claims', () => {
    expect(txt).not.toMatch(/Monte Carlo risk simulation|predict(s|ion)? (your|the) outcome|50\+ (worked|cities)|Top recent analyses by score/i);
  });
});
