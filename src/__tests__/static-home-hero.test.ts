import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { EXAMPLE_DECISIONS } from '@/components/landing/sadewa/SdwHero';

// Mobile LCP (2026-11-08): the "/" static body opens with a copy of the live
// hero's first screen, so the headline is painted before the app bundle runs
// and React mounts the same layout over it. These checks keep the two in step.
const generator = readFileSync('scripts/generate-static-bodies.mjs', 'utf8');
const hero = readFileSync('src/components/landing/sadewa/SdwHero.tsx', 'utf8');

describe('static homepage hero', () => {
  it('takes its copy from SdwHero.tsx with patterns that still match it', () => {
    const h1 = hero.match(/id="hero-heading"\s+text="([^"]+)"/);
    expect(h1?.[1]).toBe('Before you invest $50K, understand what it would take to earn it back.');
    expect(generator).toContain('src/components/landing/sadewa/SdwHero.tsx');
    expect(generator).toContain(String.raw`/id="hero-heading"\s+text="([^"]+)"/`);
    const block = hero.match(/export const EXAMPLE_DECISIONS = \[([\s\S]*?)\];/);
    const examples = block ? [...block[1].matchAll(/'([^']+)'/g)].map((m) => m[1]) : [];
    expect(examples).toEqual(EXAMPLE_DECISIONS);
    expect(generator).toContain('"/": HOME_HERO_H1');
  });

  it('copies the first screen with the same element types as the live hero', () => {
    expect(generator).toContain('class="sdw-display" style="font-size: clamp(2.75rem, 6.4vw, 6.25rem);');
    expect(hero).toContain("style={{ fontSize: 'clamp(2.75rem, 6.4vw, 6.25rem)' }}");
    // The static card has no poster (it would compete with the CSS for the first paint).
    expect(generator).not.toContain('poster="/video/quantis-decision-film-poster');
    expect(hero).toContain("const POSTER = '/video/quantis-decision-film-poster.webp';");
    // Nothing typed before the app loads can be lost.
    expect(generator).toMatch(/<input id="q-static-hero-idea" readonly/);
  });

  it('the live hero shows the headline and film card in place, with no entrance motion', () => {
    expect(hero).toMatch(/keepVisible\s+animate=\{false\}/);
    expect(hero).not.toContain('<InView delay={180} className="w-full max-w-[420px] lg:max-w-none lg:pt-3">');
  });

  it('the app mounts after the first paint, never more than 500 ms late', () => {
    const main = readFileSync('src/main.tsx', 'utf8');
    expect(main).toContain("if (container.querySelector('#q-static-content')) afterFirstPaint(mount);");
    expect(main).toMatch(/document\.visibilityState === 'visible' \? 500 : 0/);
  });

  it('home_view still fires from the eagerly loaded Landing page', () => {
    const landing = readFileSync('src/pages/Landing.tsx', 'utf8');
    expect(landing).toContain("recordFunnelEvent('home_view')");
    expect(landing).toMatch(/const ReportFirstHero = lazy\(/);
  });
});
