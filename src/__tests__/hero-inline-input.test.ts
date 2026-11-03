// Funnel fix 2026-10-23: 1 of 191 external home visitors (30 days) submitted
// an idea when the only input sat four sections below the hero. The hero now
// has the input; the run still happens in ReportFirstHero.
import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { HERO_IDEA_EVENT, submitHeroIdea } from '@/lib/hero-idea';

describe('hero inline decision input', () => {
  it('submitHeroIdea dispatches the idea text on the shared event', () => {
    const seen = vi.fn();
    window.addEventListener(HERO_IDEA_EVENT, (e) => seen((e as CustomEvent<string>).detail));
    submitHeroIdea('Hire a second technician at $5,500/month');
    expect(seen).toHaveBeenCalledWith('Hire a second technician at $5,500/month');
  });
  it('the hero renders the input and ReportFirstHero runs what it sends', () => {
    const hero = readFileSync('src/components/landing/sadewa/SdwHero.tsx', 'utf8');
    expect(hero).toContain('id="sdw-hero-idea"');
    expect(hero).toContain('submitHeroIdea(text)');
    const form = readFileSync('src/components/landing/ReportFirstHero.tsx', 'utf8');
    expect(form).toContain('window.addEventListener(HERO_IDEA_EVENT');
    expect(form).toContain("handleSubmit(undefined, 'quick')");
  });
});
