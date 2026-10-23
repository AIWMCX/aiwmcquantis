// The hero headline must never depend on JS to become visible (it was rendered
// at opacity 0 per word until IntersectionObserver + anime.js had run).
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { WordStagger } from '@/components/sadewa/primitives';

describe('hero text visibility', () => {
  it('keepVisible renders every word without opacity 0', () => {
    const { container } = render(<WordStagger as="h1" text="Before you invest $50K" keepVisible />);
    const words = [...container.querySelectorAll<HTMLElement>('.sdw-word')];
    expect(words).toHaveLength(4);
    for (const w of words) expect(w.style.opacity).toBe('');
  });
  it('the homepage h1 uses keepVisible and the lead text starts legible', () => {
    expect(readFileSync('src/components/landing/sadewa/SdwHero.tsx', 'utf8')).toMatch(/as="h1"[\s\S]{0,200}keepVisible/);
    expect(readFileSync('src/styles/sadewa.css', 'utf8')).not.toContain('.sdw-char { display: inline-block; opacity: 0.12;');
  });
});
