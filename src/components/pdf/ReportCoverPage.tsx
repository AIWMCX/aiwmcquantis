import React from 'react';
import type { BusinessAnalysisResult } from '@/types/analysis';
import { pdfStyles } from './pdfStyles';

interface ReportCoverPageProps {
  result: BusinessAnalysisResult;
}

export function ReportCoverPage({ result }: ReportCoverPageProps) {
  const generatedDate = new Date(result.metadata.generated_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <div style={{ ...pdfStyles.page, ...pdfStyles.coverPage }}>
      {/* AIWMC Quantis Logo Area */}
      <div style={pdfStyles.logoSection}>
        <div style={pdfStyles.logoText}>AIWMC Quantis™</div>
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
          <div style={pdfStyles.coverMetricLabel}>Confidence Score</div>
          <div style={{
            ...pdfStyles.coverMetricValue,
            color: result.confidence_score >= 70 ? '#22c55e' : 
                   result.confidence_score >= 50 ? '#f59e0b' : '#ef4444'
          }}>
            {result.confidence_score}%
          </div>
        </div>
        <div style={pdfStyles.coverMetricBox}>
          <div style={pdfStyles.coverMetricLabel}>Analysis Date</div>
          <div style={pdfStyles.coverMetricValue}>{generatedDate}</div>
        </div>
      </div>

      {/* Footer */}
      <div style={pdfStyles.coverFooter}>
        <div style={pdfStyles.confidentialNotice}>CONFIDENTIAL - FOR INTERNAL USE ONLY</div>
        <div style={pdfStyles.copyright}>
          AIWMC Quantis™ - AI Business Intelligence Platform | All Rights Reserved | {new Date().getFullYear()}
        </div>
      </div>
    </div>
  );
}
