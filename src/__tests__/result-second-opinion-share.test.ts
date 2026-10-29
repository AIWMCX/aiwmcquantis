import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

// Buy-blockers #120: the result had share buttons but no reason to use them.
// After the report, a card asks for a second opinion from an accountant,
// partner or advisor, with the same ShareRail (no save button).
describe('second-opinion share on the result', () => {
  const src = readFileSync('src/pages/PublicAnalysisResult.tsx', 'utf8');

  it('renders after the full report with a share rail and no save', () => {
    const report = src.indexOf('<AccuracyTransparentResults');
    const card = src.indexOf('data-testid="second-opinion-share"');
    expect(card).toBeGreaterThan(report);
    expect(src.slice(card, card + 900)).toMatch(/<ShareRail[\s\S]*showSave=\{false\}/);
  });

  it('makes no claim beyond what the report shows', () => {
    expect(src).toMatch(/Get a second opinion on these numbers/);
    expect(src).not.toMatch(/trusted by|used by|thousands/i);
  });
});
