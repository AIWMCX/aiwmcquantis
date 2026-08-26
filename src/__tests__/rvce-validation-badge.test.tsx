/**
 * GTM-audit item #12 (2026-08-26, Q16): confirmed via a real-code
 * investigation agent that supabase/functions/rvce-validate/index.ts's
 * internalBenchmarkFallback() (used whenever web search returns fewer than
 * 2 usable observations) hardcoded observation_count: 3 and returned a
 * normal OK/WARN/OUTLIER status, so ValidationStatusBadge rendered a plain
 * green "Validated" badge identically to a real externally-checked metric
 * -- with zero real web observations behind it. Fixed on both sides:
 * the server now reports observation_count: 0 / web_search_fired: false
 * honestly, and the badge renders "Estimated" (not "Validated") whenever
 * web_search_fired is false, so a user can tell the two cases apart from
 * the visible label alone, not just a tooltip footnote.
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ValidationStatusBadge } from '../components/rvce/ValidationStatusBadge';
import type { MetricValidation } from '../engine/rvce/types';

function baseValidation(overrides: Partial<MetricValidation>): MetricValidation {
  return {
    original_value: 100,
    external_median: 95,
    p25: 80,
    p75: 110,
    status: 'OK',
    discrepancy_score: 0.1,
    notes: 'Value aligns with external benchmarks.',
    observation_count: 5,
    web_search_fired: true,
    sources_used: 3,
    ...overrides,
  };
}

describe('ValidationStatusBadge', () => {
  it('shows "Validated" for a real web-search-backed OK status', () => {
    render(<ValidationStatusBadge metric="cac" validation={baseValidation({})} />);
    expect(screen.getByText('Validated')).toBeInTheDocument();
  });

  it('shows "Estimated", not "Validated", for the internal-fallback OK status (zero real observations)', () => {
    render(
      <ValidationStatusBadge
        metric="cac"
        validation={baseValidation({ web_search_fired: false, observation_count: 0, sources_used: 0 })}
      />
    );
    expect(screen.getByText('Estimated')).toBeInTheDocument();
    expect(screen.queryByText('Validated')).not.toBeInTheDocument();
  });

  it('leaves WARN/OUTLIER/NO_DATA labels untouched (only OK is relabeled)', () => {
    render(
      <ValidationStatusBadge
        metric="cac"
        validation={baseValidation({ status: 'OUTLIER', web_search_fired: false, observation_count: 0 })}
      />
    );
    expect(screen.getByText('Outlier')).toBeInTheDocument();
  });

  it('CodeRabbit catch: treats observation_count 0 as internal-only even when web_search_fired is omitted', () => {
    // A payload can have observation_count: 0 without explicitly setting
    // web_search_fired: false (the field is optional) -- `undefined !== false`
    // would have missed this case and still shown "Validated".
    const { web_search_fired, ...withoutFlag } = baseValidation({ observation_count: 0 });
    render(<ValidationStatusBadge metric="cac" validation={withoutFlag as MetricValidation} />);
    expect(screen.getByText('Estimated')).toBeInTheDocument();
    expect(screen.queryByText('Validated')).not.toBeInTheDocument();
  });

  it('labels the tooltip median "Internal benchmark median" (not "External median") for internal-only estimates', async () => {
    const user = userEvent.setup();
    render(
      <ValidationStatusBadge
        metric="cac"
        validation={baseValidation({ web_search_fired: false, observation_count: 0 })}
      />
    );
    await user.hover(screen.getByText('Estimated'));
    const tooltips = await screen.findAllByRole('tooltip', {}, { timeout: 3000 });
    expect(tooltips.some(t => t.textContent?.includes('Internal benchmark median:'))).toBe(true);
    expect(tooltips.every(t => !t.textContent?.includes('External median:'))).toBe(true);
  });

  it('keeps "External median" for a real web-search-backed OK status', async () => {
    const user = userEvent.setup();
    render(<ValidationStatusBadge metric="cac" validation={baseValidation({})} />);
    await user.hover(screen.getByText('Validated'));
    const tooltips = await screen.findAllByRole('tooltip', {}, { timeout: 3000 });
    expect(tooltips.some(t => t.textContent?.includes('External median:'))).toBe(true);
  });
});
