import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';

// 2026-10-29: rendered copy still said "97,500 benchmarks" (they are modeled
// cells) and "Two AI engines", and the run tips quoted outside statistics with
// no source ("82% of startups fail...", "2.5x more likely to get funded").
const FILES = [
  'src/components/analysis/AnalysisProgress.tsx',
  'src/pages/CaseBrowser.tsx',
  'src/data/directorySubmissions.ts',
];
const code = (p: string) =>
  readFileSync(p, 'utf8').split('\n').filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n');

describe('benchmark and run-tip wording', () => {
  it('no hard-coded "97,500 benchmarks" in rendered copy', () => {
    for (const f of FILES) expect(code(f), f).not.toMatch(/97,500 benchmarks/);
  });

  it('no "Two AI engines" claim; the dead WizardForm that carried it is gone', () => {
    expect(existsSync('src/components/analysis/WizardForm.tsx')).toBe(false);
    expect(existsSync('src/hooks/useFormDraft.ts')).toBe(false);
  });

  it('the retry panel does not promise inputs survive a reload', () => {
    const panel = code('src/components/analysis/AnalysisErrorPanel.tsx');
    expect(panel).not.toMatch(/saved locally/);
    expect(panel).toMatch(/Reloading the page would/);
  });

  it('run tips quote no unsourced statistics', () => {
    const tips = code('src/components/analysis/AnalysisProgress.tsx');
    expect(tips).not.toMatch(/82% of startups|2\.5x more likely|drops 60%|12-18% net margins|18-24 months|6-18 months|up to 4x/);
  });
});
