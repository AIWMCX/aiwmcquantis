import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

// Legal-compliance audit 2026-11-03, item 10 "Unsupported AI claims":
// these phrases made accuracy or provenance claims the product cannot back.
const BANNED: Array<[string, RegExp]> = [
  ['src/components/analysis/steps/IndustryStep.tsx', /\+\d+% accuracy/i],
  ['src/components/analysis/InputQualityIndicator.tsx', /highly accurate/i],
  ['src/components/analysis/MarketSizingCard.tsx', /institutional-grade/i],
  ['src/components/analysis/CompactAnalysisForm.tsx', /DeepSeek Powered|We validate with/i],
  ['src/pages/RiskGallery.tsx', /real startup|real risk flags/i],
  ['src/components/seo/RouteSEO.tsx', /How Real Businesses Fail/i],
];

describe('no unsupported AI / accuracy claims in product copy', () => {
  for (const [file, re] of BANNED) {
    it(`${file} does not match ${re}`, () => {
      expect(readFileSync(file, 'utf8')).not.toMatch(re);
    });
  }

  it('risk gallery labels its scenarios Illustrative', () => {
    expect(readFileSync('src/pages/RiskGallery.tsx', 'utf8')).toMatch(/Illustrative/);
  });
});
