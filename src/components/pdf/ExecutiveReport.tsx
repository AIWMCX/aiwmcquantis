import React, { forwardRef } from 'react';
import type { BusinessAnalysisResult } from '@/types/analysis';
import { ReportCoverPage } from './ReportCoverPage';
import { ReportExecutiveSummary } from './ReportExecutiveSummary';
import { ReportFinancials } from './ReportFinancials';
import { ReportMarketAnalysis } from './ReportMarketAnalysis';
import { ReportRiskAssessment } from './ReportRiskAssessment';
import { ReportActionPlan } from './ReportActionPlan';
import { ReportBenchmarks } from './ReportBenchmarks';
import { ReportAppendix } from './ReportAppendix';

interface ExecutiveReportProps {
  result: BusinessAnalysisResult;
}

export const ExecutiveReport = forwardRef<HTMLDivElement, ExecutiveReportProps>(
  ({ result }, ref) => {
    return (
      <div 
        ref={ref}
        className="executive-report"
        style={{
          fontFamily: "'DM Sans', 'Inter', sans-serif",
          backgroundColor: '#0f172a',
          color: '#f1f5f9',
          width: '210mm',
          minHeight: '297mm',
        }}
      >
        <ReportCoverPage result={result} />
        <ReportExecutiveSummary result={result} />
        <ReportFinancials result={result} />
        <ReportMarketAnalysis result={result} />
        <ReportRiskAssessment result={result} />
        <ReportActionPlan result={result} />
        <ReportBenchmarks result={result} />
        <ReportAppendix result={result} />
      </div>
    );
  }
);

ExecutiveReport.displayName = 'ExecutiveReport';
