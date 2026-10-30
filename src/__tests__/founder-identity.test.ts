import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? files(p) : /\.(tsx?|jsx?)$/.test(p) ? [p] : [];
  });
}

// #16/#86: one source for who the founder is. The old "portrait" was a
// homepage screenshot showing claims we can't back (SOC 2, dual-AI).
describe('founder identity', () => {
  const src = files('src').filter((p) => !p.includes('__tests__') && !p.endsWith(join('config', 'founder.ts')));

  it('no page uses the old screenshot as a portrait', () => {
    expect(src.filter((p) => readFileSync(p, 'utf8').includes('founder-portrait'))).toEqual([]);
  });

  it('LinkedIn links come from config/founder.ts', () => {
    expect(src.filter((p) => /linkedin\.com\/in\/bogdan/.test(readFileSync(p, 'utf8')))).toEqual([]);
  });
});
