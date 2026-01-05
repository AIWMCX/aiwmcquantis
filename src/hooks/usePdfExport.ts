import { useCallback, useRef, useState } from 'react';
import type { BusinessAnalysisResult } from '@/types/analysis';

export function usePdfExport() {
  const [isGenerating, setIsGenerating] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  const generatePdf = useCallback(async (result: BusinessAnalysisResult) => {
    setIsGenerating(true);
    let container: HTMLDivElement | null = null;
    
    try {
      // Validate result object has minimum required data
      if (!result || !result.metadata) {
        throw new Error('Invalid analysis result: missing metadata');
      }
      
      // Dynamic import to avoid SSR issues
      const html2pdf = (await import('html2pdf.js')).default;
      
      // Create a temporary container for the PDF content
      container = document.createElement('div');
      container.style.position = 'absolute';
      container.style.left = '-9999px';
      container.style.top = '0';
      document.body.appendChild(container);

      // Generate the HTML content
      const htmlContent = generateReportHtml(result);
      container.innerHTML = htmlContent;

      // Generate filename
      const sanitizedIdea = (result.metadata?.idea || 'Business_Analysis')
        .replace(/[^a-zA-Z0-9]/g, '_')
        .substring(0, 30);
      const date = new Date().toISOString().split('T')[0];
      const filename = `AIWMC_Executive_Report_${sanitizedIdea}_${date}.pdf`;

      // PDF options
      const options = {
        margin: 0,
        filename,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { 
          scale: 2,
          useCORS: true,
          letterRendering: true,
          backgroundColor: '#0f172a',
          logging: false,
        },
        jsPDF: { 
          unit: 'mm', 
          format: 'a4', 
          orientation: 'portrait' as const,
        },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
      };

      await html2pdf().set(options).from(container).save();
    } catch (error) {
      console.error('PDF generation failed:', error);
      throw error;
    } finally {
      // Cleanup
      if (container && document.body.contains(container)) {
        document.body.removeChild(container);
      }
      setIsGenerating(false);
    }
  }, []);

  return { generatePdf, isGenerating, reportRef };
}

// Generate complete HTML for PDF
function generateReportHtml(result: BusinessAnalysisResult): string {
  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatNumber = (value: number): string => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 1,
    }).format(value);
  };

  const financial = result.financial_analysis;
  const monthlyProfit = financial.scenarios?.base?.net_profit ?? financial.monthly_profit ?? 0;
  const paybackMonths = financial.returns?.payback_period_months ?? financial.payback_period_months ?? 0;
  const monthlyRevenue = financial.mrr ?? financial.monthly_revenue?.realistic ?? 0;
  const roi = financial.returns?.roi_year_1 ?? financial.roi_year_1 ?? 0;

  const getVerdict = () => {
    if (result.confidence_score >= 75 && monthlyProfit > 0 && paybackMonths <= 18) {
      return { text: 'VIABLE', color: '#22c55e' };
    } else if (result.confidence_score >= 50 && monthlyProfit > 0) {
      return { text: 'NEEDS REFINEMENT', color: '#f59e0b' };
    } else {
      return { text: 'HIGH RISK', color: '#ef4444' };
    }
  };

  const verdict = getVerdict();
  const generatedDate = new Date(result.metadata.generated_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          background-color: #0f172a;
          color: #f1f5f9;
          font-size: 12px;
          line-height: 1.5;
        }
        
        .page {
          background-color: #0f172a;
          padding: 40px;
          min-height: 297mm;
          page-break-after: always;
          position: relative;
        }
        
        .cover-page {
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          min-height: 297mm;
          padding: 60px 40px;
          text-align: center;
        }
        
        .logo-section {
          margin-bottom: 40px;
        }
        
        .logo-text {
          font-size: 48px;
          font-weight: 800;
          letter-spacing: 8px;
          color: #3b82f6;
          margin-bottom: 8px;
        }
        
        .logo-subtext {
          font-size: 14px;
          letter-spacing: 4px;
          color: #94a3b8;
          text-transform: uppercase;
        }
        
        .cover-title-section {
          flex: 1;
          display: flex;
          flex-direction: column;
          justify-content: center;
        }
        
        .report-type {
          font-size: 12px;
          letter-spacing: 6px;
          color: #64748b;
          margin-bottom: 24px;
          text-transform: uppercase;
        }
        
        .cover-title {
          font-size: 36px;
          font-weight: 700;
          color: #f1f5f9;
          margin-bottom: 16px;
          line-height: 1.2;
        }
        
        .cover-subtitle {
          font-size: 20px;
          color: #94a3b8;
          margin-bottom: 24px;
        }
        
        .industry-badge {
          display: inline-block;
          padding: 8px 24px;
          background-color: #1e293b;
          border: 1px solid #334155;
          border-radius: 4px;
          font-size: 12px;
          letter-spacing: 2px;
          color: #3b82f6;
        }
        
        .cover-metrics {
          display: flex;
          justify-content: center;
          gap: 40px;
          margin-top: 40px;
        }
        
        .cover-metric-box {
          text-align: center;
          padding: 20px 32px;
          background-color: #1e293b;
          border: 1px solid #334155;
          border-radius: 8px;
        }
        
        .cover-metric-label {
          font-size: 12px;
          color: #94a3b8;
          margin-bottom: 8px;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        
        .cover-metric-value {
          font-size: 24px;
          font-weight: 700;
          color: #f1f5f9;
        }
        
        .cover-footer {
          text-align: center;
          padding-top: 40px;
          border-top: 1px solid #334155;
        }
        
        .confidential-notice {
          font-size: 11px;
          letter-spacing: 4px;
          color: #64748b;
          margin-bottom: 12px;
        }
        
        .copyright {
          font-size: 10px;
          color: #64748b;
        }
        
        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-bottom: 16px;
          border-bottom: 1px solid #334155;
          margin-bottom: 24px;
        }
        
        .page-header-left {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        
        .page-header-title {
          font-size: 12px;
          font-weight: 600;
          color: #94a3b8;
        }
        
        .page-header-section {
          font-size: 12px;
          color: #3b82f6;
          font-weight: 500;
        }
        
        .page-header-logo {
          font-size: 14px;
          font-weight: 700;
          letter-spacing: 2px;
          color: #3b82f6;
        }
        
        .page-footer {
          position: absolute;
          bottom: 40px;
          left: 40px;
          right: 40px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-top: 16px;
          border-top: 1px solid #334155;
          font-size: 10px;
          color: #64748b;
        }
        
        .section-title {
          font-size: 16px;
          font-weight: 700;
          color: #f1f5f9;
          margin-top: 24px;
          margin-bottom: 16px;
          padding-bottom: 8px;
          border-bottom: 2px solid #3b82f6;
          display: inline-block;
        }
        
        .verdict-banner {
          text-align: center;
          padding: 24px;
          background-color: #1e293b;
          border: 2px solid ${verdict.color};
          border-radius: 8px;
          margin-bottom: 24px;
        }
        
        .verdict-label {
          font-size: 11px;
          letter-spacing: 3px;
          color: #64748b;
          margin-bottom: 8px;
          text-transform: uppercase;
        }
        
        .verdict-text {
          font-size: 32px;
          font-weight: 800;
          letter-spacing: 4px;
          color: ${verdict.color};
        }
        
        .metrics-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 16px;
          margin-bottom: 24px;
        }
        
        .metric-card {
          background-color: #1e293b;
          padding: 20px;
          border-radius: 8px;
          border: 1px solid #334155;
        }
        
        .metric-card-label {
          font-size: 11px;
          color: #64748b;
          margin-bottom: 8px;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        
        .metric-card-value {
          font-size: 24px;
          font-weight: 700;
          color: #f1f5f9;
        }
        
        .metric-card-value.positive {
          color: #22c55e;
        }
        
        .metric-card-value.negative {
          color: #ef4444;
        }
        
        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 24px;
          font-size: 11px;
        }
        
        th {
          background-color: #334155;
          padding: 12px;
          text-align: left;
          font-weight: 600;
          color: #f1f5f9;
          border-bottom: 2px solid #3b82f6;
        }
        
        td {
          padding: 10px 12px;
          border-bottom: 1px solid #334155;
          color: #94a3b8;
          vertical-align: top;
        }
        
        .total-row {
          background-color: #1e3a5f;
        }
        
        .total-row td {
          font-weight: bold;
          color: #f1f5f9;
        }
        
        .text-right {
          text-align: right;
        }
        
        .text-center {
          text-align: center;
        }
        
        .paragraph {
          font-size: 12px;
          line-height: 1.7;
          color: #94a3b8;
          margin-bottom: 16px;
        }
        
        .list-item {
          display: flex;
          gap: 12px;
          margin-bottom: 12px;
          align-items: flex-start;
        }
        
        .list-bullet {
          width: 24px;
          height: 24px;
          background-color: #3b82f6;
          color: #f1f5f9;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 11px;
          font-weight: 600;
          flex-shrink: 0;
        }
        
        .list-text {
          font-size: 12px;
          color: #94a3b8;
          line-height: 1.6;
          padding-top: 2px;
        }
        
        .highlight-box {
          background-color: #1e293b;
          padding: 16px;
          border-radius: 8px;
          border-left: 4px solid #3b82f6;
          margin-bottom: 16px;
        }
        
        .highlight-label {
          font-size: 11px;
          color: #3b82f6;
          margin-bottom: 8px;
          text-transform: uppercase;
          letter-spacing: 1px;
          font-weight: 600;
        }
        
        .highlight-text {
          font-size: 12px;
          color: #94a3b8;
          line-height: 1.6;
        }
        
        .timeline-item {
          display: flex;
          margin-bottom: 20px;
          position: relative;
          padding-left: 40px;
        }
        
        .timeline-number {
          position: absolute;
          left: 0;
          width: 32px;
          height: 32px;
          background-color: #3b82f6;
          color: #f1f5f9;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
          font-weight: 700;
        }
        
        .timeline-content {
          flex: 1;
          background-color: #1e293b;
          padding: 16px;
          border-radius: 8px;
          border-left: 3px solid #3b82f6;
        }
        
        .timeline-title {
          font-size: 14px;
          font-weight: 600;
          color: #f1f5f9;
          margin-bottom: 8px;
        }
        
        .timeline-desc {
          font-size: 12px;
          color: #94a3b8;
          margin-bottom: 8px;
          line-height: 1.5;
        }
        
        .timeline-meta {
          display: flex;
          gap: 24px;
          font-size: 11px;
          color: #64748b;
        }
        
        .disclaimer {
          background-color: #1e293b;
          padding: 16px;
          border-radius: 8px;
          font-size: 10px;
          color: #64748b;
          line-height: 1.8;
          font-style: italic;
          border: 1px solid #334155;
        }
        
        .market-size-container {
          display: flex;
          justify-content: space-around;
          margin-bottom: 24px;
          gap: 16px;
        }
        
        .market-size-item {
          flex: 1;
          text-align: center;
        }
        
        .market-size-circle {
          padding: 24px;
          border: 3px solid #3b82f6;
          border-radius: 12px;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
        }
        
        .market-size-label {
          font-size: 14px;
          font-weight: 700;
          color: #3b82f6;
          margin-bottom: 4px;
        }
        
        .market-size-value {
          font-size: 11px;
          color: #f1f5f9;
          font-weight: 600;
          text-align: center;
        }
        
        .market-size-desc {
          font-size: 9px;
          color: #64748b;
          margin-top: 4px;
          text-align: center;
        }
      </style>
    </head>
    <body>
      <!-- Page 1: Cover -->
      <div class="page cover-page">
        <div class="logo-section">
          <div class="logo-text">AIWMC</div>
          <div class="logo-subtext">AI Workforce Management Center</div>
        </div>
        
        <div class="cover-title-section">
          <div class="report-type">BUSINESS FEASIBILITY ANALYSIS</div>
          <h1 class="cover-title">${result.metadata.idea}</h1>
          <div class="cover-subtitle">${result.metadata.location}</div>
          ${result.metadata.industry_detected ? `<div class="industry-badge">${result.metadata.industry_detected.toUpperCase()}</div>` : ''}
        </div>
        
        <div class="cover-metrics">
          <div class="cover-metric-box">
            <div class="cover-metric-label">Confidence Score</div>
            <div class="cover-metric-value" style="color: ${result.confidence_score >= 70 ? '#22c55e' : result.confidence_score >= 50 ? '#f59e0b' : '#ef4444'}">${result.confidence_score}%</div>
          </div>
          <div class="cover-metric-box">
            <div class="cover-metric-label">Analysis Date</div>
            <div class="cover-metric-value">${generatedDate}</div>
          </div>
        </div>
        
        <div class="cover-footer">
          <div class="confidential-notice">CONFIDENTIAL - FOR INTERNAL USE ONLY</div>
          <div class="copyright">AIWMC TM - AI Workforce Management Center | All Rights Reserved | ${new Date().getFullYear()}</div>
        </div>
      </div>
      
      <!-- Page 2: Executive Summary -->
      <div class="page">
        <div class="page-header">
          <div class="page-header-left">
            <span class="page-header-title">${result.metadata.idea}</span>
            <span style="color: #334155">|</span>
            <span class="page-header-section">Executive Summary</span>
          </div>
          <div class="page-header-logo">AIWMC</div>
        </div>
        
        <div class="verdict-banner">
          <div class="verdict-label">Investment Verdict</div>
          <div class="verdict-text">${verdict.text}</div>
        </div>
        
        <div class="section-title">Key Financial Indicators</div>
        <div class="metrics-grid">
          <div class="metric-card">
            <div class="metric-card-label">Total Investment Required</div>
            <div class="metric-card-value">${formatCurrency(financial.startup_investment.total)}</div>
          </div>
          <div class="metric-card">
            <div class="metric-card-label">Monthly Revenue (MRR)</div>
            <div class="metric-card-value">${formatCurrency(monthlyRevenue)}</div>
          </div>
          <div class="metric-card">
            <div class="metric-card-label">Monthly Net Profit</div>
            <div class="metric-card-value ${monthlyProfit >= 0 ? 'positive' : 'negative'}">${formatCurrency(monthlyProfit)}</div>
          </div>
          <div class="metric-card">
            <div class="metric-card-label">Payback Period</div>
            <div class="metric-card-value">${paybackMonths} months</div>
          </div>
        </div>
        
        <div class="section-title">Business Overview</div>
        <p class="paragraph">${result.business_plan?.executive_summary || 'No executive summary available'}</p>
        
        <div class="section-title">Target Market</div>
        <div class="highlight-box">
          <p class="highlight-text">${result.business_plan?.target_audience || 'No target audience defined'}</p>
        </div>
        
        <div class="page-footer">
          <div>CONFIDENTIAL | AIWMC TM | ${new Date().toLocaleDateString('en-US')}</div>
          <div></div>
          <div>Page 2 of 8</div>
        </div>
      </div>
      
      <!-- Page 3: Financial Analysis -->
      <div class="page">
        <div class="page-header">
          <div class="page-header-left">
            <span class="page-header-title">${result.metadata.idea}</span>
            <span style="color: #334155">|</span>
            <span class="page-header-section">Financial Analysis</span>
          </div>
          <div class="page-header-logo">AIWMC</div>
        </div>
        
        <div class="section-title">Initial Investment Breakdown</div>
        <table>
          <thead>
            <tr>
              <th>Category</th>
              <th class="text-right">Amount</th>
              <th class="text-right">% of Total</th>
            </tr>
          </thead>
          <tbody>
            ${Object.entries(financial.startup_investment.breakdown).map(([key, value]) => `
              <tr>
                <td>${key.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}</td>
                <td class="text-right">${formatCurrency(value as number)}</td>
                <td class="text-right">${formatNumber(((value as number) / financial.startup_investment.total) * 100)}%</td>
              </tr>
            `).join('')}
            <tr class="total-row">
              <td>Total Investment</td>
              <td class="text-right">${formatCurrency(financial.startup_investment.total)}</td>
              <td class="text-right">100%</td>
            </tr>
          </tbody>
        </table>
        
        <div class="section-title">Monthly Operating Expenses</div>
        <table>
          <thead>
            <tr>
              <th>Expense Category</th>
              <th class="text-right">Monthly Cost</th>
              <th class="text-right">Annual Cost</th>
            </tr>
          </thead>
          <tbody>
            ${Object.entries(financial.monthly_expenses.breakdown).map(([key, value]) => `
              <tr>
                <td>${key.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}</td>
                <td class="text-right">${formatCurrency(value as number)}</td>
                <td class="text-right">${formatCurrency((value as number) * 12)}</td>
              </tr>
            `).join('')}
            <tr class="total-row">
              <td>Total Monthly</td>
              <td class="text-right">${formatCurrency(financial.monthly_expenses.total)}</td>
              <td class="text-right">${formatCurrency(financial.monthly_expenses.total * 12)}</td>
            </tr>
          </tbody>
        </table>
        
        <div class="page-footer">
          <div>CONFIDENTIAL | AIWMC TM | ${new Date().toLocaleDateString('en-US')}</div>
          <div></div>
          <div>Page 3 of 8</div>
        </div>
      </div>
      
      <!-- Page 4: Scenario Analysis -->
      <div class="page">
        <div class="page-header">
          <div class="page-header-left">
            <span class="page-header-title">${result.metadata.idea}</span>
            <span style="color: #334155">|</span>
            <span class="page-header-section">Scenario Analysis</span>
          </div>
          <div class="page-header-logo">AIWMC</div>
        </div>
        
        ${financial.scenarios ? `
          <div class="section-title">Three-Scenario Financial Model</div>
          <table>
            <thead>
              <tr>
                <th>Metric</th>
                <th class="text-right" style="color: #ef4444">Pessimistic</th>
                <th class="text-right" style="color: #3b82f6">Base Case</th>
                <th class="text-right" style="color: #22c55e">Optimistic</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Monthly Revenue</td>
                <td class="text-right">${formatCurrency(financial.scenarios.pessimistic.revenue)}</td>
                <td class="text-right">${formatCurrency(financial.scenarios.base.revenue)}</td>
                <td class="text-right">${formatCurrency(financial.scenarios.optimistic.revenue)}</td>
              </tr>
              <tr>
                <td>Gross Profit</td>
                <td class="text-right">${formatCurrency(financial.scenarios.pessimistic.gross_profit)}</td>
                <td class="text-right">${formatCurrency(financial.scenarios.base.gross_profit)}</td>
                <td class="text-right">${formatCurrency(financial.scenarios.optimistic.gross_profit)}</td>
              </tr>
              <tr>
                <td>Net Profit</td>
                <td class="text-right" style="color: ${financial.scenarios.pessimistic.net_profit >= 0 ? '#22c55e' : '#ef4444'}">${formatCurrency(financial.scenarios.pessimistic.net_profit)}</td>
                <td class="text-right" style="color: ${financial.scenarios.base.net_profit >= 0 ? '#22c55e' : '#ef4444'}">${formatCurrency(financial.scenarios.base.net_profit)}</td>
                <td class="text-right" style="color: ${financial.scenarios.optimistic.net_profit >= 0 ? '#22c55e' : '#ef4444'}">${formatCurrency(financial.scenarios.optimistic.net_profit)}</td>
              </tr>
              <tr>
                <td>Gross Margin</td>
                <td class="text-right">${formatNumber(financial.scenarios.pessimistic.gross_margin)}%</td>
                <td class="text-right">${formatNumber(financial.scenarios.base.gross_margin)}%</td>
                <td class="text-right">${formatNumber(financial.scenarios.optimistic.gross_margin)}%</td>
              </tr>
              <tr>
                <td>Net Margin</td>
                <td class="text-right">${formatNumber(financial.scenarios.pessimistic.net_margin)}%</td>
                <td class="text-right">${formatNumber(financial.scenarios.base.net_margin)}%</td>
                <td class="text-right">${formatNumber(financial.scenarios.optimistic.net_margin)}%</td>
              </tr>
            </tbody>
          </table>
        ` : ''}
        
        ${financial.unit_economics ? `
          <div class="section-title">Unit Economics</div>
          <div class="metrics-grid">
            <div class="metric-card">
              <div class="metric-card-label">Customer Acquisition Cost (CAC)</div>
              <div class="metric-card-value">${formatCurrency(financial.unit_economics.cac)}</div>
            </div>
            <div class="metric-card">
              <div class="metric-card-label">Lifetime Value (LTV)</div>
              <div class="metric-card-value">${formatCurrency(financial.unit_economics.ltv)}</div>
            </div>
            <div class="metric-card">
              <div class="metric-card-label">LTV:CAC Ratio</div>
              <div class="metric-card-value" style="color: ${financial.unit_economics.ltv_cac_ratio >= 3 ? '#22c55e' : financial.unit_economics.ltv_cac_ratio >= 1 ? '#f59e0b' : '#ef4444'}">${formatNumber(financial.unit_economics.ltv_cac_ratio)}x</div>
            </div>
            <div class="metric-card">
              <div class="metric-card-label">CAC Payback</div>
              <div class="metric-card-value">${formatNumber(financial.unit_economics.cac_payback_months)} months</div>
            </div>
          </div>
        ` : ''}
        
        <div class="page-footer">
          <div>CONFIDENTIAL | AIWMC TM | ${new Date().toLocaleDateString('en-US')}</div>
          <div></div>
          <div>Page 4 of 8</div>
        </div>
      </div>
      
      <!-- Page 5: Market Analysis -->
      <div class="page">
        <div class="page-header">
          <div class="page-header-left">
            <span class="page-header-title">${result.metadata.idea}</span>
            <span style="color: #334155">|</span>
            <span class="page-header-section">Market Analysis</span>
          </div>
          <div class="page-header-logo">AIWMC</div>
        </div>
        
        <div class="section-title">Market Size Analysis</div>
        <div class="market-size-container">
          <div class="market-size-item">
            <div class="market-size-circle">
              <div class="market-size-label">TAM</div>
              <div class="market-size-value">${result.market_analysis?.market_size?.tam || 'N/A'}</div>
              <div class="market-size-desc">Total Addressable Market</div>
            </div>
          </div>
          <div class="market-size-item">
            <div class="market-size-circle" style="border-color: #3b82f6">
              <div class="market-size-label">SAM</div>
              <div class="market-size-value">${result.market_analysis?.market_size?.sam || 'N/A'}</div>
              <div class="market-size-desc">Serviceable Addressable</div>
            </div>
          </div>
          <div class="market-size-item">
            <div class="market-size-circle" style="border-color: #22c55e">
              <div class="market-size-label">SOM</div>
              <div class="market-size-value">${result.market_analysis?.market_size?.som || 'N/A'}</div>
              <div class="market-size-desc">Serviceable Obtainable</div>
            </div>
          </div>
        </div>
        
        <div class="section-title">Key Market Trends</div>
        <div style="margin-bottom: 24px">
          ${(result.market_analysis?.trends || []).map((trend, i) => `
            <div class="list-item">
              <span class="list-bullet">${i + 1}</span>
              <span class="list-text">${trend}</span>
            </div>
          `).join('') || '<p class="paragraph">No trends data available</p>'}
        </div>
        
        <div class="section-title">Competitive Landscape</div>
        <p class="paragraph">${result.market_analysis?.competition?.competitive_landscape || 'No competitive analysis available'}</p>
        
        <div class="highlight-box" style="border-color: #22c55e">
          <div class="highlight-label" style="color: #22c55e">Growth Opportunities</div>
          <p class="highlight-text">${result.market_analysis?.growth_opportunities || 'No growth opportunities identified'}</p>
        </div>
        
        <div class="page-footer">
          <div>CONFIDENTIAL | AIWMC TM | ${new Date().toLocaleDateString('en-US')}</div>
          <div></div>
          <div>Page 5 of 8</div>
        </div>
      </div>
      
      <!-- Page 6: Risk Assessment -->
      <div class="page">
        <div class="page-header">
          <div class="page-header-left">
            <span class="page-header-title">${result.metadata.idea}</span>
            <span style="color: #334155">|</span>
            <span class="page-header-section">Risk Assessment</span>
          </div>
          <div class="page-header-logo">AIWMC</div>
        </div>
        
        <div class="section-title">Business Risk Matrix</div>
        <table>
          <thead>
            <tr>
              <th>Risk Factor</th>
              <th class="text-center">Probability</th>
              <th class="text-center">Impact</th>
              <th>Mitigation Strategy</th>
            </tr>
          </thead>
          <tbody>
            ${(result.business_plan.risks || []).map(risk => {
              const riskName = risk?.risk || (risk as any)?.name || 'Unknown Risk';
              const probability = risk?.probability || 'средняя';
              const impact = risk?.impact || 'средний';
              const mitigation = risk?.mitigation || (risk as any)?.description || 'N/A';
              return `
              <tr>
                <td>${riskName}</td>
                <td class="text-center" style="color: ${probability === 'высокая' ? '#ef4444' : probability === 'средняя' ? '#f59e0b' : '#22c55e'}">${String(probability).toUpperCase()}</td>
                <td class="text-center" style="color: ${impact === 'высокий' ? '#ef4444' : impact === 'средний' ? '#f59e0b' : '#22c55e'}">${String(impact).toUpperCase()}</td>
                <td>${mitigation}</td>
              </tr>
            `}).join('') || '<tr><td colspan="4">No risks identified</td></tr>'}
          </tbody>
        </table>
        
        <div class="section-title">Barriers to Entry</div>
        <p class="paragraph">${result.market_analysis?.barriers_to_entry || 'No barriers to entry analysis available'}</p>
        
        <div class="page-footer">
          <div>CONFIDENTIAL | AIWMC TM | ${new Date().toLocaleDateString('en-US')}</div>
          <div></div>
          <div>Page 6 of 8</div>
        </div>
      </div>
      
      <!-- Page 7: Action Plan -->
      <div class="page">
        <div class="page-header">
          <div class="page-header-left">
            <span class="page-header-title">${result.metadata.idea}</span>
            <span style="color: #334155">|</span>
            <span class="page-header-section">Action Plan</span>
          </div>
          <div class="page-header-logo">AIWMC</div>
        </div>
        
        <div class="section-title">Launch Timeline</div>
        ${(result.business_plan.launch_steps || []).map((step, index) => {
          if (typeof step === 'string') {
            return `
          <div class="timeline-item">
            <div class="timeline-number">${index + 1}</div>
            <div class="timeline-content">
              <div class="timeline-title">Step ${index + 1}</div>
              <div class="timeline-desc">${step}</div>
            </div>
          </div>`;
          }
          return `
          <div class="timeline-item">
            <div class="timeline-number">${step?.step || index + 1}</div>
            <div class="timeline-content">
              <div class="timeline-title">${step?.title || 'Step ' + (index + 1)}</div>
              <div class="timeline-desc">${step?.description || ''}</div>
              ${step?.duration || step?.cost ? `
              <div class="timeline-meta">
                ${step?.duration ? `<span>Duration: ${step.duration}</span>` : ''}
                ${step?.cost ? `<span>Cost: ${formatCurrency(step.cost)}</span>` : ''}
              </div>` : ''}
            </div>
          </div>`;
        }).join('') || '<div class="paragraph">No launch steps defined</div>'}
        
        <div class="section-title">First 90 Days Marketing Plan</div>
        <p class="paragraph">${result.marketing_plan?.first_3_months_plan || 'No marketing plan available'}</p>
        
        <div class="page-footer">
          <div>CONFIDENTIAL | AIWMC TM | ${new Date().toLocaleDateString('en-US')}</div>
          <div></div>
          <div>Page 7 of 8</div>
        </div>
      </div>
      
      <!-- Page 8: Appendix -->
      <div class="page">
        <div class="page-header">
          <div class="page-header-left">
            <span class="page-header-title">${result.metadata.idea}</span>
            <span style="color: #334155">|</span>
            <span class="page-header-section">Appendix</span>
          </div>
          <div class="page-header-logo">AIWMC</div>
        </div>
        
        <div class="section-title">Data Sources</div>
        <div style="margin-bottom: 24px">
          ${(result.data_sources || []).map((source, i) => `
            <div class="list-item">
              <span class="list-bullet">${i + 1}</span>
              <span class="list-text">${source}</span>
            </div>
          `).join('') || '<p class="paragraph">No data sources listed</p>'}
        </div>
        
        <div class="section-title">Analysis Limitations</div>
        <div style="margin-bottom: 24px">
          ${(result.limitations || []).map((limitation, i) => `
            <div class="list-item">
              <span class="list-bullet">${i + 1}</span>
              <span class="list-text">${limitation}</span>
            </div>
          `).join('') || '<p class="paragraph">No limitations listed</p>'}
        </div>
        
        <div class="section-title">Legal Disclaimer</div>
        <div class="disclaimer">
          This analysis is provided for informational purposes only and does not constitute financial, 
          investment, legal, or tax advice. The projections contained herein are based on assumptions 
          and AI-generated estimates that may not reflect actual market conditions. Past performance 
          is not indicative of future results. Users should consult with qualified professionals 
          before making any business decisions. AIWMC and its affiliates assume no liability for 
          decisions made based on this analysis.
        </div>
        
        <div class="page-footer">
          <div>CONFIDENTIAL | AIWMC TM | ${new Date().toLocaleDateString('en-US')}</div>
          <div style="font-style: italic">${new Date().getFullYear()} AIWMC - AI Workforce Management Center. All Rights Reserved.</div>
          <div>Page 8 of 8</div>
        </div>
      </div>
    </body>
    </html>
  `;
}
