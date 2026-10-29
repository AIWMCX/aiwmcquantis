import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

// Buy-blockers #110: during the 30-60s run the visitor saw one changing label.
// Every step is now listed with done / in progress / to do, and the trust line
// under the button says "modeled benchmark cells" from canonical facts.
describe('run progress on the homepage form', () => {
  const src = readFileSync('src/components/landing/ReportFirstHero.tsx', 'utf8');

  it('lists every narration step with its state', () => {
    expect(src).toMatch(/data-testid="run-progress-steps"/);
    expect(src).toMatch(/NARRATION\.map\(\(n, idx\)/);
    expect(src).toMatch(/idx < progressStep/);
  });

  it('no hard-coded benchmark count', () => {
    expect(src).not.toMatch(/97,500 benchmarks/);
    expect(src).toMatch(/\{BENCHMARK_COUNT_DISPLAY\} modeled benchmark cells/);
  });
});
