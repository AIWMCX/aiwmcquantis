import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const read = (p: string) => readFileSync(p, 'utf8');

describe('the hiring demo is reachable, not orphaned', () => {
  it('homepage renders the hiring band', () => {
    expect(read('src/pages/Landing.tsx')).toContain('<HiringDemoBand />');
    const band = read('src/components/landing/sadewa/HiringDemoBand.tsx');
    expect(band).toContain("'/demo/hiring-decision'");
    expect(band).toContain('Explore the hiring example');
  });
  it('footer links it on every page', () => {
    expect(read('src/components/layout/Footer.tsx')).toContain("to: '/demo/hiring-decision'");
  });
  it('Decision Review offers it as a button', () => {
    expect(read('src/pages/DecisionReview.tsx')).toMatch(/to="\/demo\/hiring-decision"[\s\S]{0,200}Explore the hiring example/);
  });
  it('route, SEO and sitemap are registered', () => {
    expect(read('src/App.tsx')).toContain('path="/demo/hiring-decision"');
    expect(read('scripts/seo.routes.mjs')).toContain('"/demo/hiring-decision"');
    expect(read('scripts/generate-sitemap.ts')).toContain("'/demo/hiring-decision'");
    expect(read('src/components/seo/RouteSEO.tsx')).toContain("'/demo/hiring-decision'");
  });
});
