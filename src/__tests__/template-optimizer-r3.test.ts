import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const src = readFileSync('supabase/functions/template-optimizer/index.ts', 'utf8');

describe('template-optimizer validates model output before storing it (R3)', () => {
  it('parses the tool-call arguments through r3Validate with a schema', () => {
    expect(src).toContain("from '../_shared/r3-validator.ts'");
    expect(src).toContain('r3Validate(toolCall.function.arguments, SuggestionsSchema)');
  });

  it('no longer JSON.parses raw model output', () => {
    expect(src).not.toContain('JSON.parse(toolCall.function.arguments)');
  });

  it('bounds the contract: 1-3 suggestions, confidence 0-100', () => {
    expect(src).toMatch(/confidence: z\.number\(\)\.min\(0\)\.max\(100\)/);
    expect(src).toMatch(/\.min\(1\)\.max\(3\)/);
  });

  it('rejects invalid output before the insert', () => {
    expect(src.indexOf('if (!validated.ok)')).toBeLessThan(src.indexOf('template_improvement_suggestions'));
  });
});
