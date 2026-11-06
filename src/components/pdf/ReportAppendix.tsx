import React from 'react';
import type { BusinessAnalysisResult } from '@/types/analysis';
import { pdfStyles } from './pdfStyles';
import { ReportHeader, ReportFooter } from './ReportPageElements';
import { MODELED_REFERENCE_LABEL } from '@/lib/benchmark-citations';

interface ReportAppendixProps {
  result: BusinessAnalysisResult;
}

export function ReportAppendix({ result }: ReportAppendixProps) {
  const validation = result.validation;
  const confidenceBreakdown = validation?.confidence_breakdown;

  return (
    <div style={pdfStyles.page}>
      <ReportHeader title="Appendix" idea={result.metadata.idea} pageNumber={8} />

      {/* Data Sources */}
      <div style={pdfStyles.sectionTitle}>Data Sources</div>
      <div style={pdfStyles.listContainer}>
        {result.data_sources.map((source, i) => (
          <div key={i} style={pdfStyles.listItem}>
            <span style={pdfStyles.listBullet}>{i + 1}</span>
            <span style={pdfStyles.listText}>
              {/* Sanitize internal developer references for user-facing display */}
              {String(source)
                .replace(/upload Kerry dataset for enhanced accuracy/gi, 'modeled reference ranges')
                .replace(/\(Kerry dataset\)/gi, '(modeled reference ranges)')
                .replace(/Kerry dataset/gi, MODELED_REFERENCE_LABEL)
              }
            </span>
          </div>
        ))}
      </div>

      {/* Confidence Score Breakdown */}
      {confidenceBreakdown && (
        <>
          <div style={pdfStyles.sectionTitle}>Evidence Score Breakdown</div>
          <table style={pdfStyles.table}>
            <thead>
              <tr>
                <th style={pdfStyles.tableHeader}>Factor</th>
                <th style={{ ...pdfStyles.tableHeader, textAlign: 'center' }}>Weight</th>
                <th style={{ ...pdfStyles.tableHeader, textAlign: 'center' }}>Score</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={pdfStyles.tableCell}>Input Completeness</td>
                <td style={{ ...pdfStyles.tableCell, textAlign: 'center' }}>40%</td>
                <td style={{ ...pdfStyles.tableCell, textAlign: 'center' }}>
                  {confidenceBreakdown.input_completeness}/100
                </td>
              </tr>
              <tr>
                <td style={pdfStyles.tableCell}>Data Quality</td>
                <td style={{ ...pdfStyles.tableCell, textAlign: 'center' }}>30%</td>
                <td style={{ ...pdfStyles.tableCell, textAlign: 'center' }}>
                  {confidenceBreakdown.data_quality}/100
                </td>
              </tr>
              <tr>
                <td style={pdfStyles.tableCell}>Validation Score</td>
                <td style={{ ...pdfStyles.tableCell, textAlign: 'center' }}>20%</td>
                <td style={{ ...pdfStyles.tableCell, textAlign: 'center' }}>
                  {confidenceBreakdown.validation_score}/100
                </td>
              </tr>
              <tr>
                <td style={pdfStyles.tableCell}>Industry Relevance</td>
                <td style={{ ...pdfStyles.tableCell, textAlign: 'center' }}>10%</td>
                <td style={{ ...pdfStyles.tableCell, textAlign: 'center' }}>
                  {confidenceBreakdown.industry_relevance}/100
                </td>
              </tr>
              <tr style={{ backgroundColor: '#1e3a5f' }}>
                <td style={{ ...pdfStyles.tableCell, fontWeight: 'bold' }}>Overall Evidence Score</td>
                <td style={{ ...pdfStyles.tableCell, textAlign: 'center', fontWeight: 'bold' }}>100%</td>
                <td style={{ ...pdfStyles.tableCell, textAlign: 'center', fontWeight: 'bold' }}>
                  {result.confidence_score}%
                </td>
              </tr>
            </tbody>
          </table>
          <div style={pdfStyles.paragraph}>
            The evidence score measures how complete and well-supported this analysis&apos;s inputs are. It is not a
            probability that the business will succeed.
          </div>
        </>
      )}

      {/* Limitations */}
      <div style={pdfStyles.sectionTitle}>Analysis Limitations</div>
      <div style={pdfStyles.listContainer}>
        {result.limitations.map((limitation, i) => {
          // Replace developer-facing messages with user-friendly equivalents
          const userFriendly = String(limitation)
            .replace(/Using default benchmarks \(upload Kerry dataset for enhanced accuracy\)/gi, 'Analysis uses general industry benchmarks. Selecting your specific industry will improve accuracy.')
            .replace(/No industry-specific benchmarks applied/gi, 'General industry benchmarks applied. For higher precision, specify your exact business sector.')
            .replace(/upload Kerry dataset/gi, 'providing additional financial details')
            .replace(/Kerry dataset/gi, 'modeled reference ranges');
          return (
            <div key={i} style={pdfStyles.listItem}>
              <span style={pdfStyles.listBullet}>{i + 1}</span>
              <span style={pdfStyles.listText}>{userFriendly}</span>
            </div>
          );
        })}
      </div>

      {/* Methodology */}
      <div style={pdfStyles.sectionTitle}>Calculation Methodology</div>
      <div style={pdfStyles.paragraph}>
        This analysis uses a proprietary 12-variable financial model covering revenue (Price, Units, Frequency, Upsell), 
        costs (COGS, OPEX, Marketing, CAC), investment (Startup, CapEx), and retention (LTV, Churn). 
        All calculations follow industry-standard financial analysis frameworks with auto-correction 
        for unrealistic values based on industry benchmarks.
      </div>

      {/* Legal Disclaimer */}
      <div style={pdfStyles.sectionTitle}>Legal Disclaimer</div>
      <div style={pdfStyles.disclaimer}>
        This analysis is provided for informational purposes only and does not constitute financial, 
        investment, legal, or tax advice. The projections contained herein are based on assumptions 
        and AI-generated estimates that may not reflect actual market conditions. Past performance 
        is not indicative of future results. Users should consult with qualified professionals 
        before making any business decisions. AIWMC and its affiliates assume no liability for 
        decisions made based on this analysis.
      </div>

      {/* Report Metadata */}
      <div style={pdfStyles.metadataSection}>
        <div style={pdfStyles.metadataItem}>
          <span style={pdfStyles.metadataLabel}>Report ID:</span>
          <span>{result.metadata.generated_at}</span>
        </div>
        <div style={pdfStyles.metadataItem}>
          <span style={pdfStyles.metadataLabel}>Analysis Model:</span>
          <span>{result.metadata.model}</span>
        </div>
        <div style={pdfStyles.metadataItem}>
          <span style={pdfStyles.metadataLabel}>Version:</span>
          <span>{result.metadata.version}</span>
        </div>
        <div style={pdfStyles.metadataItem}>
          <span style={pdfStyles.metadataLabel}>Generated:</span>
          <span>{new Date(result.metadata.generated_at).toLocaleString('en-US')}</span>
        </div>
      </div>

      <ReportFooter pageNumber={8} isLast />
    </div>
  );
}
