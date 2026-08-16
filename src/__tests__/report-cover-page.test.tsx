/**
 * Accuracy session 2026-08-04 (Confidence semantics, Priority 1).
 *
 * Acceptance criterion under test: no report displays a generic
 * "Confidence Score" label that implies forecast accuracy. This test
 * would have failed against the pre-session ReportCoverPage, which
 * rendered `<div>Confidence Score</div>` unconditionally.
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ReportCoverPage } from '@/components/pdf/ReportCoverPage';
import type { BusinessAnalysisResult, QualityDimensions } from '@/types/analysis';

function makeResult(overrides: Partial<BusinessAnalysisResult> = {}): BusinessAnalysisResult {
  return {
    financial_analysis: {} as BusinessAnalysisResult['financial_analysis'],
    business_plan: {} as BusinessAnalysisResult['business_plan'],
    marketing_plan: {} as BusinessAnalysisResult['marketing_plan'],
    market_analysis: {} as BusinessAnalysisResult['market_analysis'],
    confidence_score: 95,
    data_sources: [],
    limitations: [],
    metadata: {
      idea: 'Test business idea',
      location: 'Austin, TX',
      generated_at: new Date().toISOString(),
      model: 'test',
      version: '1.0',
    },
    ...overrides,
  } as BusinessAnalysisResult;
}

const QD_PASS: QualityDimensions = {
  input_completeness: 82,
  source_coverage: 60,
  benchmark_match_quality: 'PASS',
  scenario_reconciliation: 'PASS',
  narrative_reconciliation: 'PASS',
  formula_reconciliation: 'UNVERIFIED',
  outcome_calibration: 'NOT_AVAILABLE',
  evidence: {
    source_coverage: 'x',
    benchmark_match_quality: 'x',
    scenario_reconciliation: 'x',
    narrative_reconciliation: 'x',
    formula_reconciliation: 'x',
    outcome_calibration: 'x',
  },
};

describe('ReportCoverPage', () => {
  it('never renders the bare "Confidence Score" label', () => {
    render(<ReportCoverPage result={makeResult({ validation: { quality_dimensions: QD_PASS } as never })} />);
    expect(screen.queryByText('Confidence Score')).not.toBeInTheDocument();
  });

  it('shows Input Completeness (not a bare percentage claiming accuracy) when quality_dimensions is present', () => {
    render(<ReportCoverPage result={makeResult({ validation: { quality_dimensions: QD_PASS } as never })} />);
    expect(screen.getByText('Input Completeness')).toBeInTheDocument();
    expect(screen.getByText('82%')).toBeInTheDocument();
  });

  it('shows Source Coverage as its own metric, separate from Input Completeness', () => {
    render(<ReportCoverPage result={makeResult({ validation: { quality_dimensions: QD_PASS } as never })} />);
    expect(screen.getByText('Source Coverage')).toBeInTheDocument();
    expect(screen.getByText('60%')).toBeInTheDocument();
  });

  it('shows the separate reconciliation dimensions, including Outcome Calibration as Not available', () => {
    render(<ReportCoverPage result={makeResult({ validation: { quality_dimensions: QD_PASS } as never })} />);
    expect(screen.getByText('Benchmark Match')).toBeInTheDocument();
    expect(screen.getByText('Scenario Check')).toBeInTheDocument();
    expect(screen.getByText('Narrative Check')).toBeInTheDocument();
    expect(screen.getByText('Formula Check')).toBeInTheDocument();
    expect(screen.getByText('Outcome Calibration')).toBeInTheDocument();
    expect(screen.getByText('Not available')).toBeInTheDocument();
  });

  it('UNVERIFIED reads as explicitly non-evaluated, not a quiet pass/fail sibling (round-2 review item 1)', () => {
    render(<ReportCoverPage result={makeResult({ validation: { quality_dimensions: QD_PASS } as never })} />);
    // formula_reconciliation is UNVERIFIED in this fixture -- must not
    // render the bare word "Unverified", which reads as just another
    // status among equals.
    expect(screen.queryByText('Unverified')).not.toBeInTheDocument();
    expect(screen.getByText('Not evaluated for this report')).toBeInTheDocument();
  });

  it('renders CORRECTED distinctly when the narrative firewall replaced the summary', () => {
    const qdCorrected: QualityDimensions = { ...QD_PASS, narrative_reconciliation: 'CORRECTED' };
    render(<ReportCoverPage result={makeResult({ validation: { quality_dimensions: qdCorrected } as never })} />);
    expect(screen.getByText('Corrected')).toBeInTheDocument();
  });

  it('falls back safely for older stored reports with no quality_dimensions, without claiming forecast accuracy', () => {
    // Backward-compatibility requirement (accuracy master prompt, Section 23
    // item 8): old stored reports must still render.
    render(<ReportCoverPage result={makeResult({ validation: undefined })} />);
    expect(screen.queryByText('Confidence Score')).not.toBeInTheDocument();
    expect(screen.getByText('Analysis Quality Index (legacy)')).toBeInTheDocument();
    expect(screen.getByText('95%')).toBeInTheDocument();
  });
});
