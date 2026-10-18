import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

// The overall score is input completeness 40% + data quality 30% + validation 20%
// + industry relevance 10%. It measures evidence, not the chance of success, so it
// must never be presented to customers as "confidence".
const FILES = [
  'src/components/analysis/ConfidenceIndicator.tsx',
  'src/components/analysis/PersistentResultsHeader.tsx',
  'src/components/analysis/AdvancedFinancialInputs.tsx',
  'src/components/analysis/InputQualityIndicator.tsx',
  'src/components/pdf/ReportAppendix.tsx',
  'src/components/pdf/ReportCoverPage.tsx',
  'src/components/pdf/ReportExecutiveSummary.tsx',
  'src/components/viral/ViralCard.tsx',
];

describe('overall score is labelled as evidence, not confidence', () => {
  for (const f of FILES) {
    it(`${f} shows no customer-facing "confidence" label for the overall score`, () => {
      const src = readFileSync(f, 'utf8');
      expect(src).not.toMatch(/(['">])(High|Medium|Low|Very Low|Data|Overall)? ?Confidence( Score| Level:?| Score Breakdown)?(['"<])/);
      expect(src).not.toMatch(/boosts confidence|confidence boost/);
    });
  }
  it('the PDF states what the score is not', () => {
    expect(readFileSync('src/components/pdf/ReportAppendix.tsx', 'utf8')).toContain('It is not a');
  });
});
