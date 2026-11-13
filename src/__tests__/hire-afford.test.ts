import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  HIRE_AFFORD_EXAMPLE,
  HIRE_AFFORD_FAQ,
  hireMonthlyCost,
  runHireAfford,
  toHiringOwn,
  validateHireAfford,
} from '@/lib/demo/hire-afford';
import { validateHiringOwn } from '@/lib/demo/hiring-own-numbers';

// "Can I afford to hire an employee?" is the #1 Google completion for the
// hiring seed (research/search-demand-2026-11-13.md) [F1, F3].
describe('hire-afford calculator', () => {
  it('the example shows the core point: the hire pays back, yet cash goes below zero first', () => {
    const r = runHireAfford(HIRE_AFFORD_EXAMPLE);
    expect(r.verdict).toBe('not_yet');
    expect(r.paybackMonth).not.toBeNull();
    expect(r.floorBreachMonth).not.toBeNull();
    expect(r.floorBreachMonth!).toBeLessThan(r.paybackMonth!);
    expect(r.floorBreachWithoutHireMonth).toBeNull();
  });

  it('getting paid 30 days sooner changes the example answer', () => {
    const r = runHireAfford({ ...HIRE_AFFORD_EXAMPLE, daysToGetPaid: 30 });
    expect(r.floorBreachMonth).toBeNull();
    expect(r.verdict).not.toBe('not_yet');
  });

  it('the real monthly cost includes the employer share', () => {
    expect(hireMonthlyCost(HIRE_AFFORD_EXAMPLE)).toBeCloseTo((62_000 * 1.25) / 12, 6);
  });

  it('maps onto inputs the full hiring model accepts (the "open the full model" link)', () => {
    expect(validateHiringOwn(toHiringOwn(HIRE_AFFORD_EXAMPLE))).toEqual({});
  });

  it('rejects costs below the direct costs implied by the margin', () => {
    expect(validateHireAfford({ ...HIRE_AFFORD_EXAMPLE, monthlyCosts: 10_000 }).monthlyCosts).toMatch(/direct costs/);
    expect(validateHireAfford(HIRE_AFFORD_EXAMPLE)).toEqual({});
  });

  it('copy follows the truth rules: no em dashes, no prices hard-coded on the page', () => {
    const page = readFileSync('src/pages/CanIAffordToHire.tsx', 'utf8');
    const text = page + JSON.stringify(HIRE_AFFORD_FAQ);
    expect(text).not.toContain('—');
    expect(page).not.toMatch(/\$349|\$499|\$17|\$49\b/);
  });

  it('is registered for search: router, sitemap, SEO routes, RouteSEO and a static body', () => {
    expect(readFileSync('src/App.tsx', 'utf8')).toContain('<Route path="/can-i-afford-to-hire"');
    expect(readFileSync('scripts/generate-sitemap.ts', 'utf8')).toContain("path: '/can-i-afford-to-hire'");
    expect(readFileSync('scripts/seo.routes.mjs', 'utf8')).toContain('path: "/can-i-afford-to-hire"');
    expect(readFileSync('src/components/seo/RouteSEO.tsx', 'utf8')).toContain("'/can-i-afford-to-hire': {");
    expect(readFileSync('scripts/generate-static-bodies.mjs', 'utf8')).toContain('"/can-i-afford-to-hire": `');
    // build:vercel does not run prebuild, so the committed list is what gets prerendered (#450 deploy was blocked without it).
    expect(readFileSync('public/prerender-urls.txt', 'utf8').split(/\r?\n/)).toContain('/can-i-afford-to-hire');
  });
});
