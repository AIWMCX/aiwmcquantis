import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  ltvCacPhrase,
  ltvCacReading,
  ltvCacStatusLabel,
  LTV_CAC_IMPLAUSIBLE,
} from '../../supabase/functions/analyze-business/ltv-cac-language.ts';

// Live 2026-10-26 (register #151): "LTV:CAC 79.3x indicates healthy unit economics".
describe('LTV:CAC wording', () => {
  it('never calls an implausible ratio healthy', () => {
    expect(ltvCacReading(79.3)).toBe('implausible');
    expect(ltvCacPhrase(79.3)).not.toContain('healthy');
    expect(ltvCacPhrase(79.3)).toContain('acquisition cost is understated');
    expect(ltvCacStatusLabel(79.3)).toContain('IMPLAUSIBLY HIGH');
  });

  it('keeps the normal bands', () => {
    expect(ltvCacPhrase(4.2)).toBe('indicates healthy unit economics');
    expect(ltvCacPhrase(LTV_CAC_IMPLAUSIBLE)).toBe('indicates healthy unit economics');
    expect(ltvCacReading(1.8)).toBe('weak');
    expect(ltvCacReading(0)).toBe('not_computable');
    expect(ltvCacReading(Number.POSITIVE_INFINITY)).toBe('not_computable');
  });

  it('every summary template uses the helper, not a bare >= 3 check', () => {
    for (const f of ['ai-safety-guardrails.ts', 'narrator-prompt.ts']) {
      const src = readFileSync(`supabase/functions/analyze-business/${f}`, 'utf8');
      expect(src).not.toMatch(/ltvCacRatio >= 3 \? 'indicates healthy unit economics'/);
      expect(src).toContain("from './ltv-cac-language.ts'");
    }
  });
});
