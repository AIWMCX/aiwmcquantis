import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const src = readFileSync(resolve(process.cwd(), 'supabase/functions/autoposter-generate-content/index.ts'), 'utf8');

describe('autoposter-generate-content provider order (2026-10-15)', () => {
  it('tries DeepSeek before Anthropic, with Anthropic only as a fallback', () => {
    const ds = src.indexOf("name: 'deepseek'");
    const an = src.indexOf("name: 'anthropic'");
    expect(ds).toBeGreaterThan(-1);
    expect(an).toBeGreaterThan(ds);
  });

  it('no longer requires ANTHROPIC_API_KEY at startup', () => {
    expect(src).not.toContain("Deno.env.get('ANTHROPIC_API_KEY')!");
  });

  it('falls through to the next provider on error and logs the model used', () => {
    expect(src).toContain('for (const p of list)');
    expect(src).toContain('response_payload: { length: content.length, model }');
  });
});
