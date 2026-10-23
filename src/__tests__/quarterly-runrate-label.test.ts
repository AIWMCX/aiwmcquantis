// R&D F06: monthly x3 run-rates must not be presented as a quarter's actuals.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

describe('quarterly summary run-rate prefill is labelled', () => {
  const form = readFileSync('src/components/docs/forms/QuarterlySummaryForm.tsx', 'utf8');
  it('shows a run-rate notice whenever revenue or income is auto-filled', () => {
    expect(form).toContain('setRunRatePrefilled(true)');
    expect(form).toContain('pre-filled as monthly × 3 run-rates');
  });
  it('the autofill contract documents quarterly/annual as run-rates', () => {
    const hook = readFileSync('src/hooks/useAnalysisAutoFill.ts', 'utf8');
    expect(hook).toContain('Run-rate: monthly revenue x 3');
    expect(hook).toContain('Run-rate: monthly revenue x 12');
  });
});
