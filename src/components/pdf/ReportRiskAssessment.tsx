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

  const getProbabilityColor = (prob: string) => {
    switch (prob) {
      case 'высокая': return '#ef4444';
      case 'средняя': return '#f59e0b';
      case 'низкая': return '#22c55e';
      default: return '#94a3b8';
    }
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'высокий': return '#ef4444';
      case 'средний': return '#f59e0b';
      case 'низкий': return '#22c55e';
      default: return '#94a3b8';
    }
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
                    {risk.probability.toUpperCase()}
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
                {risk.probability.toUpperCase()}
              </td>
              <td style={{ 
                ...pdfStyles.tableCell, 
                textAlign: 'center',
                color: getImpactColor(risk.impact)
              }}>
                {risk.impact.toUpperCase()}
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
            {businessRisks.filter(r => r.probability === 'высокая' || r.impact === 'высокий').length}
          </div>
        </div>
        <div style={{ ...pdfStyles.riskSummaryCard, borderColor: '#f59e0b' }}>
          <div style={pdfStyles.riskSummaryLabel}>Medium Risk Factors</div>
          <div style={{ ...pdfStyles.riskSummaryValue, color: '#f59e0b' }}>
            {businessRisks.filter(r => r.probability === 'средняя' || r.impact === 'средний').length}
          </div>
        </div>
        <div style={{ ...pdfStyles.riskSummaryCard, borderColor: '#22c55e' }}>
          <div style={pdfStyles.riskSummaryLabel}>Low Risk Factors</div>
          <div style={{ ...pdfStyles.riskSummaryValue, color: '#22c55e' }}>
            {businessRisks.filter(r => r.probability === 'низкая' && r.impact === 'низкий').length}
          </div>
        </div>
      </div>

      <ReportFooter pageNumber={6} />
    </div>
  );
}
