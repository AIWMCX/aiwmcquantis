import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

// Live 2026-10-25: break-even showed "$37 455/mo" (browser locale). A German
// locale would show "$37.455" — read as thirty-seven dollars. Quantis prices
// and models in USD for US buyers, so every number is formatted en-US.
const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? (f === '__tests__' ? [] : walk(p)) : /\.tsx?$/.test(f) ? [p] : [];
  });

describe('numbers are formatted en-US everywhere', () => {
  it('no locale-less toLocaleString() in src', () => {
    expect(walk('src').filter((p) => readFileSync(p, 'utf8').includes('.toLocaleString()'))).toEqual([]);
  });

  it('no "Most Popular" badge while no plan has customers', () => {
    expect(readFileSync('src/components/landing/PricingSection.tsx', 'utf8')).not.toContain('badge="Most Popular"');
    expect(readFileSync('src/pages/HowItWorks.tsx', 'utf8')).not.toContain('Most Popular');
  });

  it('the dead createcdn.com/la.js pixel (404) is not loaded', () => {
    expect(readFileSync('index.html', 'utf8')).not.toContain('createcdn.com/la.js');
  });
});
