import React from 'react';
import type { BusinessAnalysisResult } from '@/types/analysis';
import { pdfStyles, formatCurrency } from './pdfStyles';
import { ReportHeader, ReportFooter } from './ReportPageElements';

interface ReportRiskAssessmentProps {
  result: BusinessAnalysisResult;
}

export function ReportRiskAssessment({ result }: ReportRiskAssessmentProps) {
  const riskAnalysis = result.financial_analysis.risk_analysis;
  const businessRisks = result.business_plan.risks;

  // Case-insensitive English color mapping (HIGH/high/High, MEDIUM, LOW + Russian fallback)
  const getProbabilityColor = (prob: string) => {
    const p = (prob || '').toLowerCase().trim();
    if (p === 'high' || p === 'critical' || p === 'высокая') return '#ef4444';
    if (p === 'medium' || p === 'moderate' || p === 'средняя') return '#f59e0b';
    if (p === 'low' || p === 'низкая') return '#22c55e';
    return '#94a3b8';
  };

  const getImpactColor = (impact: string) => {
    const i = (impact || '').toLowerCase().trim();
    if (i === 'high' || i === 'critical' || i === 'высокий') return '#ef4444';
    if (i === 'medium' || i === 'moderate' || i === 'средний') return '#f59e0b';
    if (i === 'low' || i === 'низкий') return '#22c55e';
    return '#94a3b8';
  };

  const isHighRisk = (r: { probability?: string; impact?: string }) => {
    const prob = (r.probability || '').toLowerCase();
    const imp = (r.impact || '').toLowerCase();
    return ['high', 'critical', 'высокая'].includes(prob) || ['high', 'critical', 'высокий'].includes(imp);
  };

  const isMediumRisk = (r: { probability?: string; impact?: string }) => {
    const prob = (r.probability || '').toLowerCase();
    const imp = (r.impact || '').toLowerCase();
    return ['medium', 'moderate', 'средняя'].includes(prob) || ['medium', 'moderate', 'средний'].includes(imp);
  };

  const isLowRisk = (r: { probability?: string; impact?: string }) => {
    const prob = (r.probability || '').toLowerCase();
    const imp = (r.impact || '').toLowerCase();
    return ['low', 'низкая'].includes(prob) && ['low', 'низкий'].includes(imp);
  };

  return (
    <div style={pdfStyles.page}>
      <ReportHeader title="Risk Assessment" idea={result.metadata.idea} pageNumber={6} />

      {/* Financial Risk Scenarios */}
      {riskAnalysis && (
        <>
          <div style={pdfStyles.sectionTitle}>Financial Risk Scenarios</div>
          <table style={pdfStyles.table}>
            <thead>
              <tr>
                <th style={pdfStyles.tableHeader}>Scenario</th>
                <th style={pdfStyles.tableHeader}>Description</th>
                <th style={{ ...pdfStyles.tableHeader, textAlign: 'center' }}>Probability</th>
                <th style={{ ...pdfStyles.tableHeader, textAlign: 'right' }}>Impact on Profit</th>
              </tr>
            </thead>
            <tbody>
              {Object.values(riskAnalysis).map((risk, i) => (
                <tr key={i}>
                  <td style={pdfStyles.tableCell}>{risk.scenario}</td>
                  <td style={pdfStyles.tableCell}>{risk.description}</td>
                  <td style={{ 
                    ...pdfStyles.tableCell, 
                    textAlign: 'center',
                    color: getProbabilityColor(risk.probability)
                  }}>
                    {(risk.probability || '').toUpperCase()}
                  </td>
                  <td style={{ 
                    ...pdfStyles.tableCell, 
                    textAlign: 'right',
                    color: risk.resulting_profit >= 0 ? '#22c55e' : '#ef4444'
                  }}>
                    {formatCurrency(risk.resulting_profit)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {/* Business Risks Matrix */}
      <div style={pdfStyles.sectionTitle}>Business Risk Matrix</div>
      <table style={pdfStyles.table}>
        <thead>
          <tr>
            <th style={pdfStyles.tableHeader}>Risk Factor</th>
            <th style={{ ...pdfStyles.tableHeader, textAlign: 'center' }}>Probability</th>
            <th style={{ ...pdfStyles.tableHeader, textAlign: 'center' }}>Impact</th>
            <th style={pdfStyles.tableHeader}>Mitigation Strategy</th>
          </tr>
        </thead>
        <tbody>
          {businessRisks.map((risk, i) => (
            <tr key={i}>
              <td style={pdfStyles.tableCell}>{risk.risk}</td>
              <td style={{ 
                ...pdfStyles.tableCell, 
                textAlign: 'center',
                color: getProbabilityColor(risk.probability)
              }}>
                {(risk.probability || '').toUpperCase()}
              </td>
              <td style={{ 
                ...pdfStyles.tableCell, 
                textAlign: 'center',
                color: getImpactColor(risk.impact)
              }}>
                {(risk.impact || '').toUpperCase()}
              </td>
              <td style={pdfStyles.tableCell}>{risk.mitigation}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Risk Summary */}
      <div style={pdfStyles.sectionTitle}>Risk Summary</div>
      <div style={pdfStyles.riskSummaryGrid}>
        <div style={{ ...pdfStyles.riskSummaryCard, borderColor: '#ef4444' }}>
          <div style={pdfStyles.riskSummaryLabel}>High Risk Factors</div>
          <div style={{ ...pdfStyles.riskSummaryValue, color: '#ef4444' }}>
            {businessRisks.filter(isHighRisk).length}
          </div>
        </div>
        <div style={{ ...pdfStyles.riskSummaryCard, borderColor: '#f59e0b' }}>
          <div style={pdfStyles.riskSummaryLabel}>Medium Risk Factors</div>
          <div style={{ ...pdfStyles.riskSummaryValue, color: '#f59e0b' }}>
            {businessRisks.filter(isMediumRisk).length}
          </div>
        </div>
        <div style={{ ...pdfStyles.riskSummaryCard, borderColor: '#22c55e' }}>
          <div style={pdfStyles.riskSummaryLabel}>Low Risk Factors</div>
          <div style={{ ...pdfStyles.riskSummaryValue, color: '#22c55e' }}>
            {businessRisks.filter(isLowRisk).length}
          </div>
        </div>
      </div>

      <ReportFooter pageNumber={6} />
    </div>
  );
}
