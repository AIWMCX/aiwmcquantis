import { afterEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { shouldShowIntroFilm } from '@/lib/intro-film';

function at(search: string) {
  window.history.replaceState({}, '', `/${search}`);
}

describe('intro film never blocks the offer on load', () => {
  afterEach(() => { at(''); localStorage.clear(); });

  it('first-time visitor: film does not auto-open (headline + CTA are immediate)', () => {
    localStorage.clear();
    at('');
    expect(shouldShowIntroFilm()).toBe(false);
  });
  it('a ?intro=1 share link still opens it', () => {
    at('?intro=1');
    expect(shouldShowIntroFilm()).toBe(true);
  });
  it('the film is still one click away from the hero', () => {
    const hero = readFileSync('src/components/landing/sadewa/SdwHero.tsx', 'utf8');
    expect(hero).toContain("Watch the 25s film");
    expect(readFileSync('src/pages/Landing.tsx', 'utf8')).toContain('onWatchFilm={() => setIntroOpen(true)}');
  });
  it('a video load failure closes the layer instead of a black screen', () => {
    expect(readFileSync('src/components/landing/IntroFilm.tsx', 'utf8')).toContain("onError={() => close('error')}");
  });
  it('headline describes scenario-based support, not a promised return', () => {
    const hero = readFileSync('src/components/landing/sadewa/SdwHero.tsx', 'utf8');
    expect(hero).toContain('understand what it would take to earn it back');
    expect(hero).not.toContain('find out if you’ll get it back');
  });
});
