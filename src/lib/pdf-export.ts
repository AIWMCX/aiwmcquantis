// @ts-expect-error - html2pdf.js has no bundled types
import html2pdf from 'html2pdf.js';
import type { AnalysisResultData, HistoryEntry } from '@/types';

interface ExportContext {
  idea?: string;
  location?: string;
}

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

const paragraphsFrom = (raw: string): string => {
  if (!raw) return '<p class="empty">No content provided for this section.</p>';
  return raw
    .split(/\n{2,}/)
    .map((block) => `<p>${escapeHtml(block.trim()).replace(/\n/g, '<br/>')}</p>`)
    .join('');
};

const formatCurrency = (n: number): string =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n || 0);

const buildHtml = (result: AnalysisResultData, ctx: ExportContext): string => {
  const idea = ctx.idea ? escapeHtml(ctx.idea) : 'Business Idea Analysis';
  const location = ctx.location ? escapeHtml(ctx.location) : '—';
  const generated = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return `
<div class="pdf-root">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Sora:wght@600;700&family=DM+Sans:wght@400;500;600&family=JetBrains+Mono:wght@500;600&display=swap');

    .pdf-root {
      font-family: 'DM Sans', 'Inter', sans-serif;
      color: #0f172a;
      background: #ffffff;
      width: 210mm;
      padding: 0;
      margin: 0;
      line-height: 1.65;
      font-size: 11pt;
    }
    .pdf-page {
      padding: 18mm 16mm;
      page-break-after: always;
    }
    .pdf-page:last-child { page-break-after: auto; }

    .pdf-cover {
      background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
      color: #f8fafc;
      min-height: 261mm;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }
    .brand-mark {
      font-family: 'Sora', sans-serif;
      font-size: 14pt;
      font-weight: 700;
      letter-spacing: -0.01em;
    }
    .brand-sub {
      font-size: 9pt;
      color: #94a3b8;
      text-transform: uppercase;
      letter-spacing: 0.18em;
      margin-top: 4px;
    }
    .cover-title-block { margin-top: 40mm; }
    .cover-eyebrow {
      font-size: 9pt;
      font-weight: 600;
      letter-spacing: 0.22em;
      text-transform: uppercase;
      color: #38bdf8;
      margin-bottom: 14px;
    }
    .cover-title {
      font-family: 'Sora', sans-serif;
      font-size: 32pt;
      font-weight: 700;
      letter-spacing: -0.02em;
      line-height: 1.1;
      margin: 0 0 18px;
    }
    .cover-meta {
      font-size: 11pt;
      color: #cbd5e1;
    }
    .cover-meta span { color: #f1f5f9; font-weight: 500; }

    .cover-metrics {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 12px;
      margin-top: 30mm;
    }
    .cover-metric {
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 10px;
      padding: 16px;
    }
    .cover-metric-label {
      font-size: 8pt;
      text-transform: uppercase;
      letter-spacing: 0.14em;
      color: #94a3b8;
      margin-bottom: 6px;
    }
    .cover-metric-value {
      font-family: 'JetBrains Mono', monospace;
      font-size: 18pt;
      font-weight: 600;
      color: #f8fafc;
    }
    .cover-footer {
      font-size: 8pt;
      color: #64748b;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      border-top: 1px solid rgba(255, 255, 255, 0.08);
      padding-top: 12px;
    }

    .section-eyebrow {
      font-family: 'Sora', sans-serif;
      font-size: 8.5pt;
      font-weight: 600;
      color: #2563eb;
      text-transform: uppercase;
      letter-spacing: 0.2em;
      margin-bottom: 8px;
    }
    .section-title {
      font-family: 'Sora', sans-serif;
      font-size: 22pt;
      font-weight: 700;
      letter-spacing: -0.01em;
      margin: 0 0 6px;
      color: #0f172a;
    }
    .section-rule {
      height: 3px;
      width: 56px;
      background: linear-gradient(90deg, #2563eb, #38bdf8);
      border-radius: 2px;
      margin: 10px 0 22px;
    }
    .section-body p {
      margin: 0 0 12px;
      text-align: justify;
      hyphens: auto;
    }
    .section-body p.empty { color: #94a3b8; font-style: italic; }

    .summary-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 10px;
      margin-bottom: 22px;
    }
    .summary-card {
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 14px 16px;
      background: #f8fafc;
    }
    .summary-label {
      font-size: 8pt;
      text-transform: uppercase;
      letter-spacing: 0.14em;
      color: #64748b;
      margin-bottom: 4px;
    }
    .summary-value {
      font-family: 'JetBrains Mono', monospace;
      font-size: 14pt;
      font-weight: 600;
      color: #0f172a;
    }

    .page-footer {
      margin-top: 18mm;
      padding-top: 10px;
      border-top: 1px solid #e2e8f0;
      font-size: 8pt;
      color: #94a3b8;
      display: flex;
      justify-content: space-between;
      letter-spacing: 0.06em;
      text-transform: uppercase;
    }
  </style>

  <!-- Cover -->
  <section class="pdf-page pdf-cover">
    <header>
      <div class="brand-mark">AIWMC™ Quantis</div>
      <div class="brand-sub">AI Business Intelligence</div>
    </header>

    <div class="cover-title-block">
      <div class="cover-eyebrow">Business Feasibility Report</div>
      <h1 class="cover-title">${idea}</h1>
      <div class="cover-meta">Location: <span>${location}</span> · Generated <span>${generated}</span></div>

      <div class="cover-metrics">
        <div class="cover-metric">
          <div class="cover-metric-label">Monthly Revenue</div>
          <div class="cover-metric-value">${formatCurrency(result.monthly_revenue_estimate)}</div>
        </div>
        <div class="cover-metric">
          <div class="cover-metric-label">Startup Investment</div>
          <div class="cover-metric-value">${formatCurrency(result.startup_investment)}</div>
        </div>
        <div class="cover-metric">
          <div class="cover-metric-label">Payback</div>
          <div class="cover-metric-value">${result.payback_period_months} mo</div>
        </div>
      </div>
    </div>

    <div class="cover-footer">Confidential · For Internal Review</div>
  </section>

  <!-- Business Plan -->
  <section class="pdf-page">
    <div class="section-eyebrow">Section 01</div>
    <h2 class="section-title">Business Plan</h2>
    <div class="section-rule"></div>

    <div class="summary-grid">
      <div class="summary-card">
        <div class="summary-label">Revenue / month</div>
        <div class="summary-value">${formatCurrency(result.monthly_revenue_estimate)}</div>
      </div>
      <div class="summary-card">
        <div class="summary-label">Investment</div>
        <div class="summary-value">${formatCurrency(result.startup_investment)}</div>
      </div>
      <div class="summary-card">
        <div class="summary-label">Payback</div>
        <div class="summary-value">${result.payback_period_months} mo</div>
      </div>
    </div>

    <div class="section-body">${paragraphsFrom(result.business_plan)}</div>
    <div class="page-footer"><span>AIWMC Quantis</span><span>Business Plan</span></div>
  </section>

  <!-- Marketing Plan -->
  <section class="pdf-page">
    <div class="section-eyebrow">Section 02</div>
    <h2 class="section-title">Marketing Plan</h2>
    <div class="section-rule"></div>
    <div class="section-body">${paragraphsFrom(result.marketing_plan)}</div>
    <div class="page-footer"><span>AIWMC Quantis</span><span>Marketing Plan</span></div>
  </section>

  <!-- Market Analysis -->
  <section class="pdf-page">
    <div class="section-eyebrow">Section 03</div>
    <h2 class="section-title">Market Analysis</h2>
    <div class="section-rule"></div>
    <div class="section-body">${paragraphsFrom(result.market_analysis)}</div>
    <div class="page-footer"><span>AIWMC Quantis</span><span>Market Analysis</span></div>
  </section>
</div>
`;
};

export const exportAnalysisToPDF = async (
  result: AnalysisResultData,
  ctx: ExportContext = {}
): Promise<void> => {
  const html = buildHtml(result, ctx);

  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '-10000px';
  container.style.top = '0';
  container.innerHTML = html;
  document.body.appendChild(container);

  const filenameBase = (ctx.idea || 'quantis-analysis')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'quantis-analysis';

  try {
    await html2pdf()
      .set({
        margin: 0,
        filename: `${filenameBase}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff' },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: ['css', 'legacy'] },
      })
      .from(container.firstElementChild as HTMLElement)
      .save();
  } finally {
    document.body.removeChild(container);
  }
};

export const exportHistoryEntryToPDF = (entry: HistoryEntry) =>
  exportAnalysisToPDF(entry.result, { idea: entry.idea, location: entry.location });
