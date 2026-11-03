import { BENCHMARK_COUNT_DISPLAY } from '@/config/canonical-facts';

/** What a homepage Decision Run is doing, by seconds since submit. Shared by
 *  the hero (SdwHero) and the form that runs it (ReportFirstHero). */
export const NARRATION = [
  { t: 0,  label: 'Reading your idea…' },
  { t: 8,  label: `Matching against a ${BENCHMARK_COUNT_DISPLAY}-cell modeled benchmark grid…` },
  { t: 22, label: 'Stress-testing unit economics (CAC, LTV, churn)…' },
  { t: 38, label: 'Simulating 1,000 months of revenue and costs…' },
  { t: 55, label: 'Checking the numbers for red flags…' },
  { t: 72, label: 'Compiling verdict…' },
] as const;

/** Index of the NARRATION step that is current `seconds` after submit. */
export function narrationStep(seconds: number): number {
  let step = 0;
  NARRATION.forEach((n, idx) => {
    if (seconds >= n.t) step = idx;
  });
  return step;
}
