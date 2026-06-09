import React from 'react';
import type { BusinessAnalysisResult } from '@/types/analysis';
import { getMonthlyProfit, getPaybackMonths, getMonthlyRevenue } from '@/types/analysis';
import { pdfStyles, formatCurrency, formatNumber } from './pdfStyles';
import { ReportHeader, ReportFooter } from './ReportPageElements';
import { formatPaybackDisplay } from '@/lib/formatPayback';

interface ReportExecutiveSummaryProps {
  result: BusinessAnalysisResult;
}

export function ReportExecutiveSummary({ result }: ReportExecutiveSummaryProps) {
  const financial = result.financial_analysis;
  const monthlyProfit = getMonthlyProfit(financial);
  const paybackMonths = getPaybackMonths(financial);
  const monthlyRevenue = getMonthlyRevenue(financial);
  const roi = financial.returns?.roi_year_1 ?? financial.roi_year_1 ?? 0;

  const getVerdict = () => {
    if (
      result.confidence_score >= 75 &&
      monthlyProfit > 0 &&
      paybackMonths > 0 &&
      paybackMonths <= 18
    ) {
      return { text: 'VIABLE', color: '#22c55e' };
    } else if (result.confidence_score >= 50 && monthlyProfit > 0) {
      return { text: 'NEEDS REFINEMENT', color: '#f59e0b' };
    } else {
      return { text: 'HIGH RISK', color: '#ef4444' };
    }
  };

  const verdict = getVerdict();

  return (
    <div style={pdfStyles.page}>
      <ReportHeader title="Executive Summary" idea={result.metadata.idea} pageNumber={2} />

      {/* Verdict Banner */}
      <div
        style={{
          ...pdfStyles.verdictBanner,
          borderColor: verdict.color,
          backgroundColor: `${verdict.color}15`,
        }}
      >
        <div style={pdfStyles.verdictLabel}>Investment Verdict</div>
        <div style={{ ...pdfStyles.verdictText, color: verdict.color }}>{verdict.text}</div>
      </div>

      {/* Key Metrics Grid */}
      <div style={pdfStyles.sectionTitle}>Key Financial Indicators</div>
      <div style={pdfStyles.metricsGrid}>
        <div style={pdfStyles.metricCard}>
          <div style={pdfStyles.metricCardLabel}>Total Investment Required</div>
          <div style={pdfStyles.metricCardValue}>
            {formatCurrency(financial.startup_investment.total)}
          </div>
        </div>
        <div style={pdfStyles.metricCard}>
          <div style={pdfStyles.metricCardLabel}>Monthly Revenue (MRR)</div>
          <div style={pdfStyles.metricCardValue}>{formatCurrency(monthlyRevenue)}</div>
        </div>
        <div style={pdfStyles.metricCard}>
          <div style={pdfStyles.metricCardLabel}>Monthly Net Profit</div>
          <div
            style={{
              ...pdfStyles.metricCardValue,
              color: monthlyProfit >= 0 ? '#22c55e' : '#ef4444',
            }}
          >
            {formatCurrency(monthlyProfit)}
          </div>
        </div>
        <div style={pdfStyles.metricCard}>
          <div style={pdfStyles.metricCardLabel}>Payback Period</div>
          <div style={pdfStyles.metricCardValue}>
            {formatPaybackDisplay(paybackMonths, monthlyProfit)}
          </div>
        </div>
      </div>

      {/* ROI and Additional Metrics */}
      <div style={pdfStyles.metricsRow}>
        <div style={pdfStyles.metricInline}>
          <span style={pdfStyles.metricInlineLabel}>Year 1 ROI:</span>
          <span
            style={{
              ...pdfStyles.metricInlineValue,
              color: roi >= 0 ? '#22c55e' : '#ef4444',
            }}
          >
            {formatNumber(roi)}%
          </span>
        </div>
        <div style={pdfStyles.metricInline}>
          <span style={pdfStyles.metricInlineLabel}>Confidence Level:</span>
          <span style={pdfStyles.metricInlineValue}>{result.confidence_score}%</span>
        </div>
        {financial.unit_economics && (
          <div style={pdfStyles.metricInline}>
            <span style={pdfStyles.metricInlineLabel}>LTV:CAC Ratio:</span>
            <span
              style={{
                ...pdfStyles.metricInlineValue,
                color: financial.unit_economics.ltv_cac_ratio >= 3 ? '#22c55e' : '#f59e0b',
              }}
            >
              {formatNumber(financial.unit_economics.ltv_cac_ratio)}x
            </span>
          </div>
        )}
      </div>

      {/* AI Analyst Pull-Quote */}
      {result.business_plan.executive_summary && (
        <div
          style={{
            borderLeft: `4px solid ${verdict.color}`,
            backgroundColor: `${verdict.color}10`,
            padding: '12px 16px',
            marginBottom: 16,
            borderRadius: '0 6px 6px 0',
          }}
        >
          <div
            style={{
              fontSize: 9,
              fontWeight: 700,
              color: verdict.color,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              marginBottom: 6,
            }}
          >
            AI Analyst Assessment
          </div>
          <div style={{ fontSize: 11, color: '#cbd5e1', fontStyle: 'italic', lineHeight: 1.55 }}>
            "{result.business_plan.executive_summary.split('.').slice(0, 2).join('.')}."
          </div>
          <div style={{ fontSize: 9, color: '#64748b', marginTop: 6 }}>
            — AIWMC Quantis AI ·{' '}
            {new Date(result.metadata.generated_at).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </div>
        </div>
      )}

      {/* Executive Summary Text */}
      <div style={pdfStyles.sectionTitle}>Business Overview</div>
      <div style={pdfStyles.paragraph}>{result.business_plan.executive_summary}</div>

      {/* Quick Assessment */}
      <div style={pdfStyles.sectionTitle}>Quick Assessment</div>
      <div style={pdfStyles.assessmentGrid}>
        <div style={pdfStyles.assessmentItem}>
          <div style={pdfStyles.assessmentLabel}>Target Market</div>
          <div style={pdfStyles.assessmentValue}>{result.business_plan.target_audience}</div>
        </div>
        <div style={pdfStyles.assessmentItem}>
          <div style={pdfStyles.assessmentLabel}>Competitive Edge</div>
          <div style={pdfStyles.assessmentValue}>{result.business_plan.competitive_advantages}</div>
        </div>
      </div>

      <ReportFooter pageNumber={2} />
    </div>
  );
}
