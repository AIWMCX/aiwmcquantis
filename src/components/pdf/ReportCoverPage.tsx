import React from 'react';
import type { BusinessAnalysisResult, QualityStatus } from '@/types/analysis';
import { pdfStyles } from './pdfStyles';

interface ReportCoverPageProps {
  result: BusinessAnalysisResult;
}

// ROUND-2 REVIEW FIX (item 1): UNVERIFIED/NOT_AVAILABLE must read as
// explicitly non-evaluated, not as a quiet member of the same pass/fail
// family -- a reader skimming five same-shaped chips will otherwise treat
// them as equivalent outcomes. Distinct wording plus a dashed border
// (rather than the solid border on an actual verdict) marks that this
// dimension simply wasn't checked.
const STATUS_LABEL: Record<QualityStatus, string> = {
  PASS: 'Pass',
  WARN: 'Warn',
  FAIL: 'Fail',
  CORRECTED: 'Corrected',
  UNVERIFIED: 'Not evaluated for this report',
  NOT_AVAILABLE: 'Not available',
};

const STATUS_COLOR: Record<QualityStatus, string> = {
  PASS: '#22c55e',
  WARN: '#f59e0b',
  FAIL: '#ef4444',
  CORRECTED: '#3b82f6',
  UNVERIFIED: '#94a3b8',
  NOT_AVAILABLE: '#94a3b8',
};

const STATUS_IS_EVALUATED: Record<QualityStatus, boolean> = {
  PASS: true,
  WARN: true,
  FAIL: true,
  CORRECTED: true,
  UNVERIFIED: false,
  NOT_AVAILABLE: false,
};

function DimensionChip({ label, status }: { label: string; status: QualityStatus }) {
  const evaluated = STATUS_IS_EVALUATED[status];
  return (
    <div
      style={{
        ...pdfStyles.qualityDimensionChip,
        borderStyle: evaluated ? 'solid' : 'dashed',
      }}
    >
      <div style={pdfStyles.qualityDimensionLabel}>{label}</div>
      <div
        style={{
          ...pdfStyles.qualityDimensionValue,
          color: STATUS_COLOR[status],
          fontStyle: evaluated ? 'normal' : 'italic',
        }}
      >
        {STATUS_LABEL[status]}
      </div>
    </div>
  );
}

export function ReportCoverPage({ result }: ReportCoverPageProps) {
  const generatedDate = new Date(result.metadata.generated_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  // Accuracy session 2026-08-04 (Confidence semantics, Priority 1): the
  // cover previously showed result.confidence_score -- a 40/30/20/10
  // blend of input completeness, data quality, validation-rule score, and
  // industry relevance -- under the literal label "Confidence Score,"
  // which a reader reasonably (and incorrectly) interprets as forecast
  // accuracy. It never measured that.
  //
  // quality_dimensions (added this session) decomposes that blend into
  // separately-labeled, honestly-derived signals. Older stored reports
  // generated before this change won't have it -- fall back to
  // displaying the legacy blended number under an unambiguous label that
  // does not claim forecast accuracy either.
  const qd = result.validation?.quality_dimensions;
  const legacyScore = result.confidence_score;

  return (
    <div style={{ ...pdfStyles.page, ...pdfStyles.coverPage }}>
      {/* AIWMC Quantis Logo Area */}
      <div style={pdfStyles.logoSection}>
        <div style={pdfStyles.logoText}>AIWMC Quantis</div>
        <div style={pdfStyles.logoSubtext}>AI Business Intelligence Platform</div>
      </div>

      {/* Report Title */}
      <div style={pdfStyles.coverTitleSection}>
        <div style={pdfStyles.reportType}>BUSINESS FEASIBILITY ANALYSIS</div>
        <h1 style={pdfStyles.coverTitle}>{result.metadata.idea}</h1>
        <div style={pdfStyles.coverSubtitle}>{result.metadata.location}</div>
        {result.metadata.industry_detected && (
          <div style={pdfStyles.industryBadge}>
            {result.metadata.industry_detected.toUpperCase()}
          </div>
        )}
      </div>

      {/* Key Metrics Preview */}
      <div style={pdfStyles.coverMetrics}>
        <div style={pdfStyles.coverMetricBox}>
          <div style={pdfStyles.coverMetricLabel}>
            {qd ? 'Input Completeness' : 'Analysis Quality Index (legacy)'}
          </div>
          <div style={{
            ...pdfStyles.coverMetricValue,
            color: (qd ? qd.input_completeness : legacyScore) >= 70 ? '#22c55e' :
                   (qd ? qd.input_completeness : legacyScore) >= 50 ? '#f59e0b' : '#ef4444'
          }}>
            {qd ? qd.input_completeness : legacyScore}%
          </div>
        </div>
        {qd && (
          <div style={pdfStyles.coverMetricBox}>
            <div style={pdfStyles.coverMetricLabel}>Source Coverage</div>
            <div style={{
              ...pdfStyles.coverMetricValue,
              color: qd.source_coverage >= 70 ? '#22c55e' :
                     qd.source_coverage >= 40 ? '#f59e0b' : '#ef4444'
            }}>
              {qd.source_coverage}%
            </div>
          </div>
        )}
        <div style={pdfStyles.coverMetricBox}>
          <div style={pdfStyles.coverMetricLabel}>Analysis Date</div>
          <div style={pdfStyles.coverMetricValue}>{generatedDate}</div>
        </div>
      </div>

      {/* Quality dimensions -- replaces the single "Confidence Score" with
          separately-labeled reconciliation checks. Only rendered when the
          engine populated them (older stored reports won't have this). */}
      {qd && (
        <div style={pdfStyles.qualityDimensionsRow}>
          <DimensionChip label="Benchmark Match" status={qd.benchmark_match_quality} />
          <DimensionChip label="Scenario Check" status={qd.scenario_reconciliation} />
          <DimensionChip label="Narrative Check" status={qd.narrative_reconciliation} />
          <DimensionChip label="Formula Check" status={qd.formula_reconciliation} />
          <DimensionChip label="Outcome Calibration" status={qd.outcome_calibration} />
        </div>
      )}

      {/* Footer */}
      <div style={pdfStyles.coverFooter}>
        <div style={pdfStyles.confidentialNotice}>CONFIDENTIAL - FOR INTERNAL USE ONLY</div>
        <div style={pdfStyles.copyright}>
          AIWMC Quantis - AI Business Intelligence Platform | All Rights Reserved | {new Date().getFullYear()}
        </div>
      </div>
    </div>
  );
}
