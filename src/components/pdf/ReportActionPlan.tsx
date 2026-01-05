import React from 'react';
import type { BusinessAnalysisResult } from '@/types/analysis';
import { pdfStyles, formatCurrency } from './pdfStyles';
import { ReportHeader, ReportFooter } from './ReportPageElements';

interface ReportActionPlanProps {
  result: BusinessAnalysisResult;
}

export function ReportActionPlan({ result }: ReportActionPlanProps) {
  const launchSteps = result.business_plan.launch_steps;
  const insights = result.actionable_insights?.insights || [];
  const marketing = result.marketing_plan;

  const getPriorityStyle = (priority: string) => {
    switch (priority) {
      case 'critical': return { color: '#ef4444', bg: '#ef444420' };
      case 'high': return { color: '#f59e0b', bg: '#f59e0b20' };
      case 'medium': return { color: '#3b82f6', bg: '#3b82f620' };
      case 'low': return { color: '#22c55e', bg: '#22c55e20' };
      default: return { color: '#94a3b8', bg: '#94a3b820' };
    }
  };

  return (
    <div style={pdfStyles.page}>
      <ReportHeader title="Action Plan" idea={result.metadata.idea} pageNumber={7} />

      {/* Launch Timeline */}
      <div style={pdfStyles.sectionTitle}>Launch Timeline</div>
      <div style={pdfStyles.timelineContainer}>
        {launchSteps.map((step, i) => (
          <div key={i} style={pdfStyles.timelineItem}>
            <div style={pdfStyles.timelineNumber}>{step.step}</div>
            <div style={pdfStyles.timelineContent}>
              <div style={pdfStyles.timelineTitle}>{step.title}</div>
              <div style={pdfStyles.timelineDesc}>{step.description}</div>
              <div style={pdfStyles.timelineMeta}>
                <span>Duration: {step.duration}</span>
                <span>Cost: {formatCurrency(step.cost)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Priority Actions */}
      {insights.length > 0 && (
        <>
          <div style={pdfStyles.sectionTitle}>Priority Actions</div>
          <table style={pdfStyles.table}>
            <thead>
              <tr>
                <th style={{ ...pdfStyles.tableHeader, width: '100px' }}>Priority</th>
                <th style={pdfStyles.tableHeader}>Action</th>
                <th style={pdfStyles.tableHeader}>Expected Impact</th>
              </tr>
            </thead>
            <tbody>
              {insights.slice(0, 5).map((insight, i) => {
                const style = getPriorityStyle(insight.priority);
                return (
                  <tr key={i}>
                    <td style={{ 
                      ...pdfStyles.tableCell,
                      color: style.color,
                      fontWeight: 'bold',
                      textTransform: 'uppercase'
                    }}>
                      {insight.priority}
                    </td>
                    <td style={pdfStyles.tableCell}>{insight.headline}</td>
                    <td style={pdfStyles.tableCell}>
                      {insight.action_plan?.expected_outcome || '-'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </>
      )}

      {/* First 90 Days */}
      <div style={pdfStyles.sectionTitle}>First 90 Days Marketing Plan</div>
      <div style={pdfStyles.paragraph}>
        {marketing.first_3_months_plan}
      </div>

      {/* Marketing Channels */}
      <div style={pdfStyles.sectionTitle}>Recommended Marketing Channels</div>
      <table style={pdfStyles.table}>
        <thead>
          <tr>
            <th style={pdfStyles.tableHeader}>Channel</th>
            <th style={pdfStyles.tableHeader}>Strategy</th>
            <th style={{ ...pdfStyles.tableHeader, textAlign: 'right' }}>Monthly Budget</th>
            <th style={{ ...pdfStyles.tableHeader, textAlign: 'center' }}>Expected ROI</th>
          </tr>
        </thead>
        <tbody>
          {marketing.channels.map((channel, i) => (
            <tr key={i}>
              <td style={{ ...pdfStyles.tableCell, fontWeight: 'bold' }}>{channel.channel}</td>
              <td style={pdfStyles.tableCell}>{channel.description}</td>
              <td style={{ ...pdfStyles.tableCell, textAlign: 'right' }}>
                {formatCurrency(channel.budget_monthly)}
              </td>
              <td style={{ ...pdfStyles.tableCell, textAlign: 'center', color: '#22c55e' }}>
                {channel.expected_roi}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <ReportFooter pageNumber={7} />
    </div>
  );
}
