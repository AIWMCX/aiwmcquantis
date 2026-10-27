import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  MARKETING_DOCTRINE,
  DOCTRINE_VERSION,
  SIXTEEN_PRINCIPLES,
  HOOK_TYPES,
  FUNNEL_STAGES,
  DOCTRINE_NOTES_INSTRUCTION,
} from '../../supabase/functions/_shared/marketing-doctrine.ts';

// 2026-10-27: founder made the doctrine (16 principles + 8 legend modules +
// human-writing stop-list + company diagnosis) the base of every generated post.
describe('marketing doctrine', () => {
  it('names all 16 principles', () => {
    expect(SIXTEEN_PRINCIPLES).toHaveLength(16);
    for (const p of SIXTEEN_PRINCIPLES) expect(MARKETING_DOCTRINE).toContain(p);
  });

  it('covers the eight modules', () => {
    for (const h of ['OFFER', 'CONTENT', 'FUNNEL', 'COPY', 'SALES AND PSYCHOLOGY', 'EXECUTION', 'WHO WE WRITE FOR', 'HUMAN WRITING']) {
      expect(MARKETING_DOCTRINE).toContain(h);
    }
  });

  it('states the company truth and forbids invented traction', () => {
    expect(MARKETING_DOCTRINE).toMatch(/Never imply traction, users, clients, reviews or revenue/);
    expect(MARKETING_DOCTRINE).toMatch(/Never state a price/);
    expect(MARKETING_DOCTRINE).toMatch(/Deadlines and limits only when real/);
  });

  it('carries no number that could read as a product claim', () => {
    // Only the audience decision size and the 14-word hook limit are allowed.
    const body = MARKETING_DOCTRINE.replace(DOCTRINE_VERSION, '');
    const nums = body.match(/\d[\d,.]*/g) ?? [];
    for (const n of nums) expect(['5', '50', '14', '16', '1', '2', '3', '4', '6', '7', '8', '9', '10']).toContain(n.replace(/[.,]$/, ''));
  });

  it('tags hook type and funnel stage', () => {
    for (const h of HOOK_TYPES) expect(DOCTRINE_NOTES_INSTRUCTION).toContain(h);
    for (const s of FUNNEL_STAGES) expect(DOCTRINE_NOTES_INSTRUCTION).toContain(s);
  });

  it('both generators load it', () => {
    const auto = readFileSync('supabase/functions/autoposter-generate-content/index.ts', 'utf8');
    expect(auto).toContain("from '../_shared/marketing-doctrine.ts'");
    expect(auto).toContain('generateText(`${MARKETING_DOCTRINE}\\n\\n${PLATFORM_PROMPTS[platform]}`, userPrompt)');
    const studio = readFileSync('supabase/functions/content-studio-generate/index.ts', 'utf8');
    expect(studio).toContain("from '../_shared/marketing-doctrine.ts'");
    expect(studio).toMatch(/return \[\s+MARKETING_DOCTRINE,/);
    expect(studio).toContain('DOCTRINE_NOTES_INSTRUCTION,');
  });
});
