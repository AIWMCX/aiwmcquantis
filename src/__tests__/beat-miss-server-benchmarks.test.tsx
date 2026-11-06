/**
 * GTM-audit item #16 (2026-08-27, Q11): confirmed via a real-code
 * investigation agent that BeatMissEngine never reconciled with
 * `result.metadata.benchmarks[]` -- the same real ~97,500-row Benchmark
 * Master data every other surface (PDF export, BenchmarkCitations.tsx, RVCE
 * fallback) uses. It instead always cited a 120-row static array where
 * every row is stamped the same placeholder source/sample size, so the same
 * report could show two different p50s/sources for "the same" metric
 * depending which panel you looked at. Fixed by preferring the real server
 * record for any metric it covers, falling back to the static array (marked
 * "(est.)") only for metrics the server benchmark set doesn't cover.
 */
import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { BeatMissEngine, resolveServerBand } from '../components/analysis/BeatMissEngine';
import type { ServerBenchmarkRecord } from '../components/analysis/BenchmarkCitations';
import type { BusinessAnalysisResult } from '../types/analysis';

describe('resolveServerBand()', () => {
  const baseRecord: ServerBenchmarkRecord = {
    metric: 'cac',
    value: 200,
    p25: 150,
    median: 200,
    p75: 300,
    sample_size: 4200,
    source: 'XBRL 2024',
    match_type: 'direct',
  };

  it('returns the real band for a matched, non-percent metric unchanged', () => {
    const band = resolveServerBand([baseRecord], 'cac');
    expect(band).toEqual({ p25: 150, p50: 200, p75: 300, source: 'XBRL 2024', sampleSize: 4200 });
  });

  it('scales percent metrics from fraction (0.62) to percent-number (62)', () => {
    const gm: ServerBenchmarkRecord = { ...baseRecord, metric: 'gross_margin', p25: 0.5, median: 0.6, p75: 0.72 };
    const band = resolveServerBand([gm], 'gross_margin');
    expect(band).toEqual({ p25: 50, p50: 60, p75: 72, source: 'XBRL 2024', sampleSize: 4200 });
  });

  it('returns null when match_type is "none"', () => {
    expect(resolveServerBand([{ ...baseRecord, match_type: 'none' }], 'cac')).toBeNull();
  });

  it('returns null when the array has no record for that metric', () => {
    expect(resolveServerBand([baseRecord], 'ltv_cac_ratio')).toBeNull();
  });

  it('returns null when p25/median/p75 are null (unmatched row)', () => {
    expect(resolveServerBand([{ ...baseRecord, p25: null, median: null, p75: null }], 'cac')).toBeNull();
  });
});

function makeResult(benchmarks: ServerBenchmarkRecord[]): BusinessAnalysisResult {
  return {
    metadata: {
      industry_detected: 'saas_b2b',
      benchmarks,
    },
    financial_analysis: {
      inputs: { price_per_unit: 199, churn_rate: 0.03 },
      unit_economics: { cac: 500, ltv_cac_ratio: 4 },
      scenarios: { base: { gross_margin: 78 } },
      returns: { payback_period_months: 18 },
    },
  } as unknown as BusinessAnalysisResult;
}

describe('BeatMissEngine — server benchmark reconciliation', () => {
  it('uses the real server record (not the static array) for a covered metric', () => {
    const cacRecord: ServerBenchmarkRecord = {
      metric: 'cac', value: 500, p25: 400, median: 550, p75: 700,
      sample_size: 3000, source: 'Server XBRL record (real match)', match_type: 'direct',
    };
    render(<BeatMissEngine result={makeResult([cacRecord])} />);
    // Assert on the source substring only -- sample-size thousands
    // separators vary by environment locale (comma vs space) and aren't
    // what this test is verifying.
    expect(screen.getByText(/Server XBRL record \(real match\)/)).toBeInTheDocument();
    // The CAC row specifically must not be marked "(est.)" since a real
    // match was found for it (other rows with no server record still
    // legitimately fall back and DO show "(est.)").
    const cacRow = screen.getByText('Customer Acq. Cost').closest('div.grid');
    expect(cacRow).not.toBeNull();
    expect(within(cacRow as HTMLElement).queryByText('Median (est.)')).not.toBeInTheDocument();
  });

  it('falls back to the static array (marked "(est.)") when no server record covers the metric', () => {
    render(<BeatMissEngine result={makeResult([])} />);
    // Break-even timeline has no server-side equivalent metric at all, so it
    // must always fall back, regardless of what other metrics are covered.
    expect(screen.getAllByText(/\(est\.\)/).length).toBeGreaterThan(0);
  });

  it('prefers a real ltv_cac_ratio server record over the same-index-percentile estimate', () => {
    const ratioRecord: ServerBenchmarkRecord = {
      metric: 'ltv_cac_ratio', value: 4, p25: 2, median: 3.5, p75: 6,
      sample_size: 1800, source: 'Real paired-observation dataset', match_type: 'direct',
    };
    render(<BeatMissEngine result={makeResult([ratioRecord])} />);
    expect(screen.getByText(/Real paired-observation dataset/)).toBeInTheDocument();
  });
});
