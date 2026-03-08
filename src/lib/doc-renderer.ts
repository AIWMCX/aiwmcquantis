/**
 * Document Template Renderer
 *
 * Transforms report data + brand profile into production-ready HTML strings.
 * Uses a Handlebars-like interpolation engine with QMath-powered formatting.
 * Output is consumed by an Edge Function that converts HTML → PDF.
 *
 * @module DocRenderer
 * @version 1.0.0
 */

import { QuantisMath as QMath } from '@/lib/quantis-math';
import { escapeHTML } from '@/lib/htmlSanitizer';
import type { QuantisReport } from '@/types/report-schema';

// ─── Types ──────────────────────────────────────────────────

export interface TemplateData {
  report: QuantisReport;
  brand: {
    companyName?: string;
    logoUrl?: string;
    primaryColor?: string;
    accentColor?: string;
    address?: string;
    email?: string;
    phone?: string;
    taxId?: string;
    footerText?: string;
  };
  invoice?: InvoiceTemplateData;
  customizations?: Record<string, unknown>;
}

export interface InvoiceTemplateData {
  invoiceNumber: string;
  clientName: string;
  clientEmail?: string;
  clientCompany?: string;
  clientAddress?: string;
  lineItems: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  discountAmount: number;
  total: number;
  issueDate: string;
  dueDate: string;
  paymentTerms: string;
  notes?: string;
  rateIntelligence?: {
    userRate: number;
    marketRangeMin: number;
    marketRangeMax: number;
    recommendation: string;
  };
}

// ─── Formatting Helpers ─────────────────────────────────────

/**
 * Format a number as currency using QMath precision.
 * "$12,450.00"
 */
export function formatCurrency(value: number | null | undefined, currency: string = '$'): string {
  if (value === null || value === undefined) return `${currency}0.00`;
  const rounded = QMath.toNumber(QMath.from(value), 2);
  const [whole, fraction] = rounded.toFixed(2).split('.');
  const withCommas = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${currency}${withCommas}.${fraction}`;
}

/**
 * Format a number as a percentage using QMath precision.
 * "23.4%"
 */
export function formatPercent(value: number | null | undefined, decimals: number = 1): string {
  if (value === null || value === undefined) return '0%';
  const rounded = QMath.toNumber(QMath.from(value), decimals);
  return `${rounded}%`;
}

/**
 * Format an ISO date string as a human-readable date.
 * "March 8, 2026"
 */
export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return escapeHTML(dateStr);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(date);
  } catch {
    return escapeHTML(dateStr);
  }
}

// ─── Interpolation Engine ───────────────────────────────────

/**
 * Resolve a dot-notation path on a data object.
 * e.g. "report.financials.monthlyProfit" → data.report.financials.monthlyProfit
 */
function resolvePath(data: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce<unknown>((obj, key) => {
    if (obj && typeof obj === 'object' && key in (obj as Record<string, unknown>)) {
      return (obj as Record<string, unknown>)[key];
    }
    return undefined;
  }, data);
}

/**
 * Interpolate a Handlebars-like HTML template with data.
 *
 * Supported syntax:
 *   {{variable.path}}           — escaped value insertion
 *   {{format.currency(path)}}   — currency-formatted value
 *   {{format.percent(path)}}    — percentage-formatted value
 *   {{format.date(path)}}       — date-formatted value
 *   {{#if path}}...{{/if}}      — conditional block (truthy check)
 *   {{#each path}}...{{/each}}  — iteration (use {{this.field}} inside)
 */
export function interpolateTemplate(html: string, data: TemplateData): string {
  const dataObj = data as unknown as Record<string, unknown>;
  let result = html;

  // 1. Process {{#each path}}...{{/each}} blocks
  result = result.replace(
    /\{\{#each\s+([\w.]+)\}\}([\s\S]*?)\{\{\/each\}\}/g,
    (_match, path: string, inner: string) => {
      const arr = resolvePath(dataObj, path);
      if (!Array.isArray(arr)) return '';
      return arr
        .map((item) => {
          // Replace {{this.field}} references within the each block
          let row = inner;
          // Handle format helpers inside each
          row = row.replace(
            /\{\{format\.(currency|percent|date)\(this\.([\w.]+)\)\}\}/g,
            (_m, fmt: string, field: string) => {
              const val = resolvePath(item as Record<string, unknown>, field);
              if (fmt === 'currency') return formatCurrency(val as number);
              if (fmt === 'percent') return formatPercent(val as number);
              if (fmt === 'date') return formatDate(val as string);
              return '';
            },
          );
          // Handle plain {{this.field}} references
          row = row.replace(/\{\{this\.([\w.]+)\}\}/g, (_m, field: string) => {
            const val = resolvePath(item as Record<string, unknown>, field);
            return escapeHTML(String(val ?? ''));
          });
          return row;
        })
        .join('');
    },
  );

  // 2. Process {{#if path}}...{{/if}} blocks
  result = result.replace(
    /\{\{#if\s+([\w.]+)\}\}([\s\S]*?)\{\{\/if\}\}/g,
    (_match, path: string, inner: string) => {
      const val = resolvePath(dataObj, path);
      // Truthy check: non-null, non-undefined, non-empty string, non-zero, non-false
      if (val && val !== '' && val !== 0 && val !== false) return inner;
      return '';
    },
  );

  // 3. Process {{format.currency(path)}} / {{format.percent(path)}} / {{format.date(path)}}
  result = result.replace(
    /\{\{format\.(currency|percent|date)\(([\w.]+)\)\}\}/g,
    (_match, fmt: string, path: string) => {
      const val = resolvePath(dataObj, path);
      if (fmt === 'currency') return formatCurrency(val as number);
      if (fmt === 'percent') return formatPercent(val as number);
      if (fmt === 'date') return formatDate(val as string);
      return '';
    },
  );

  // 4. Process plain {{variable.path}} replacements
  result = result.replace(/\{\{([\w.]+)\}\}/g, (_match, path: string) => {
    const val = resolvePath(dataObj, path);
    if (val === undefined || val === null) return '';
    return escapeHTML(String(val));
  });

  return result;
}

// ─── Main Render Function ───────────────────────────────────

/**
 * Render a document template to HTML.
 *
 * @param data - Combined report + brand + invoice data
 * @param templateId - Key into TEMPLATE_REGISTRY
 * @returns Complete HTML string ready for PDF conversion
 * @throws Error if templateId is not found
 */
export function renderDocumentHTML(data: TemplateData, templateId: string): string {
  const templateHtml = TEMPLATE_REGISTRY[templateId];
  if (!templateHtml) {
    throw new Error(`Template not found: ${templateId}`);
  }
  return interpolateTemplate(templateHtml, data);
}

// ─── Template Registry ──────────────────────────────────────

const SHARED_RESET_CSS = `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; color: #1a1a2e; line-height: 1.5; }
  table { border-collapse: collapse; width: 100%; }
  @page { size: A4; margin: 20mm; }
  @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
`;

const QUANTIS_FOOTER = `
  <div style="margin-top: 40px; padding-top: 16px; border-top: 1px solid #e2e8f0; text-align: center; font-size: 11px; color: #94a3b8;">
    Generated by AIWMC Quantis &middot; aiwmcquantis.com
  </div>
`;

export const TEMPLATE_REGISTRY: Record<string, string> = {

  // ━━━ INVOICE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  invoice_standard_v1: `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Invoice {{invoice.invoiceNumber}}</title>
<style>
  ${SHARED_RESET_CSS}
  .invoice-page { max-width: 794px; margin: 0 auto; padding: 40px; }
  .invoice-header { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 24px; border-bottom: 3px solid {{brand.primaryColor}}; margin-bottom: 32px; }
  .invoice-header .brand { display: flex; align-items: center; gap: 12px; }
  .invoice-header .brand img { max-height: 48px; max-width: 180px; object-fit: contain; }
  .invoice-header .brand-name { font-size: 22px; font-weight: 700; color: {{brand.primaryColor}}; }
  .invoice-title { font-size: 32px; font-weight: 800; letter-spacing: -0.5px; color: #1a1a2e; text-align: right; }
  .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 32px; }
  .meta-block h4 { font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #64748b; margin-bottom: 6px; }
  .meta-block p { font-size: 14px; color: #334155; margin: 2px 0; }
  .meta-block .value-lg { font-size: 16px; font-weight: 600; color: #1a1a2e; }
  .details-row { display: flex; justify-content: space-between; margin-bottom: 32px; }
  .details-box { flex: 1; }
  .details-box h4 { font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #64748b; margin-bottom: 8px; }
  .details-box p { font-size: 14px; color: #334155; margin: 2px 0; }
  .line-items { margin-bottom: 24px; }
  .line-items thead th { background: #f8fafc; padding: 10px 12px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b; text-align: left; border-bottom: 2px solid #e2e8f0; }
  .line-items thead th:last-child, .line-items thead th:nth-child(2), .line-items thead th:nth-child(3) { text-align: right; }
  .line-items tbody td { padding: 10px 12px; font-size: 14px; color: #334155; border-bottom: 1px solid #f1f5f9; }
  .line-items tbody td:last-child, .line-items tbody td:nth-child(2), .line-items tbody td:nth-child(3) { text-align: right; font-variant-numeric: tabular-nums; }
  .totals { margin-left: auto; width: 280px; }
  .totals .row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 14px; color: #475569; }
  .totals .row.total { border-top: 2px solid #1a1a2e; padding-top: 10px; margin-top: 6px; font-size: 18px; font-weight: 700; color: #1a1a2e; }
  .rate-insight { margin-top: 24px; padding: 16px; background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; font-size: 13px; color: #0c4a6e; }
  .rate-insight strong { display: block; margin-bottom: 4px; font-size: 14px; }
  .notes-section { margin-top: 24px; padding: 16px; background: #f8fafc; border-radius: 8px; font-size: 13px; color: #475569; }
  .notes-section strong { display: block; margin-bottom: 4px; }
</style>
</head>
<body>
<div class="invoice-page">
  <div class="invoice-header">
    <div class="brand">
      {{#if brand.logoUrl}}<img src="{{brand.logoUrl}}" alt="Logo">{{/if}}
      <span class="brand-name">{{brand.companyName}}</span>
    </div>
    <div class="invoice-title">INVOICE</div>
  </div>

  <div class="meta-grid">
    <div class="meta-block">
      <h4>Invoice Number</h4>
      <p class="value-lg">{{invoice.invoiceNumber}}</p>
    </div>
    <div class="meta-block" style="text-align: right;">
      <h4>Issue Date</h4>
      <p class="value-lg">{{format.date(invoice.issueDate)}}</p>
    </div>
    <div class="meta-block">
      <h4>Due Date</h4>
      <p class="value-lg">{{format.date(invoice.dueDate)}}</p>
    </div>
    <div class="meta-block" style="text-align: right;">
      <h4>Payment Terms</h4>
      <p class="value-lg">{{invoice.paymentTerms}}</p>
    </div>
  </div>

  <div class="details-row">
    <div class="details-box">
      <h4>From</h4>
      <p><strong>{{brand.companyName}}</strong></p>
      {{#if brand.address}}<p>{{brand.address}}</p>{{/if}}
      {{#if brand.email}}<p>{{brand.email}}</p>{{/if}}
      {{#if brand.phone}}<p>{{brand.phone}}</p>{{/if}}
      {{#if brand.taxId}}<p>Tax ID: {{brand.taxId}}</p>{{/if}}
    </div>
    <div class="details-box" style="text-align: right;">
      <h4>To</h4>
      <p><strong>{{invoice.clientName}}</strong></p>
      {{#if invoice.clientCompany}}<p>{{invoice.clientCompany}}</p>{{/if}}
      {{#if invoice.clientAddress}}<p>{{invoice.clientAddress}}</p>{{/if}}
      {{#if invoice.clientEmail}}<p>{{invoice.clientEmail}}</p>{{/if}}
    </div>
  </div>

  <table class="line-items">
    <thead>
      <tr>
        <th>Description</th>
        <th>Qty</th>
        <th>Unit Price</th>
        <th>Total</th>
      </tr>
    </thead>
    <tbody>
      {{#each invoice.lineItems}}
      <tr>
        <td>{{this.description}}</td>
        <td>{{this.quantity}}</td>
        <td>{{format.currency(this.unitPrice)}}</td>
        <td>{{format.currency(this.total)}}</td>
      </tr>
      {{/each}}
    </tbody>
  </table>

  <div class="totals">
    <div class="row"><span>Subtotal</span><span>{{format.currency(invoice.subtotal)}}</span></div>
    <div class="row"><span>Tax ({{invoice.taxRate}}%)</span><span>{{format.currency(invoice.taxAmount)}}</span></div>
    {{#if invoice.discountAmount}}<div class="row"><span>Discount</span><span>-{{format.currency(invoice.discountAmount)}}</span></div>{{/if}}
    <div class="row total"><span>Total</span><span>{{format.currency(invoice.total)}}</span></div>
  </div>

  {{#if invoice.rateIntelligence}}
  <div class="rate-insight">
    <strong>Market Rate Insight</strong>
    Your rate: {{format.currency(invoice.rateIntelligence.userRate)}} | Market range: {{format.currency(invoice.rateIntelligence.marketRangeMin)}} - {{format.currency(invoice.rateIntelligence.marketRangeMax)}}. {{invoice.rateIntelligence.recommendation}}
  </div>
  {{/if}}

  {{#if invoice.notes}}
  <div class="notes-section">
    <strong>Notes</strong>
    {{invoice.notes}}
  </div>
  {{/if}}

  ${QUANTIS_FOOTER}
</div>
</body>
</html>`,

  // ━━━ INVESTOR SNAPSHOT ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  investor_snapshot_v2: `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Investor Snapshot — {{report.analysisParams.idea}}</title>
<style>
  ${SHARED_RESET_CSS}
  .page { max-width: 794px; margin: 0 auto; padding: 40px; min-height: 1100px; page-break-after: always; }
  .page:last-child { page-break-after: auto; }
  .header { margin-bottom: 32px; }
  .header h1 { font-size: 28px; font-weight: 800; color: #1a1a2e; margin-bottom: 4px; }
  .header .tagline { font-size: 15px; color: #64748b; }
  .section-title { font-size: 13px; text-transform: uppercase; letter-spacing: 1.5px; color: #64748b; margin-bottom: 12px; padding-bottom: 6px; border-bottom: 1px solid #e2e8f0; }
  .summary { font-size: 15px; color: #334155; line-height: 1.7; margin-bottom: 32px; }
  .metric-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 32px; }
  .metric-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 20px; text-align: center; }
  .metric-box .label { font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #64748b; margin-bottom: 6px; }
  .metric-box .value { font-size: 24px; font-weight: 700; color: #1a1a2e; }
  .metric-box .confidence { font-size: 11px; color: #94a3b8; margin-top: 4px; }
  .stress-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 32px; }
  .stress-item { border-radius: 8px; padding: 14px; text-align: center; }
  .stress-item .stress-label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #fff; opacity: 0.85; }
  .stress-item .stress-score { font-size: 22px; font-weight: 700; color: #fff; }
  .projections-table { margin-bottom: 32px; }
  .projections-table th { background: #f8fafc; padding: 10px 14px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b; text-align: right; border-bottom: 2px solid #e2e8f0; }
  .projections-table th:first-child { text-align: left; }
  .projections-table td { padding: 10px 14px; font-size: 14px; color: #334155; border-bottom: 1px solid #f1f5f9; text-align: right; font-variant-numeric: tabular-nums; }
  .projections-table td:first-child { text-align: left; font-weight: 500; }
  .risk-card { background: #fff7ed; border: 1px solid #fed7aa; border-radius: 8px; padding: 16px; margin-bottom: 12px; }
  .risk-card .risk-name { font-size: 15px; font-weight: 600; color: #9a3412; margin-bottom: 4px; }
  .risk-card .risk-severity { font-size: 12px; color: #c2410c; margin-bottom: 6px; }
  .risk-card .risk-mitigation { font-size: 13px; color: #78350f; }
  .badge-footer { margin-top: 40px; padding: 16px; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; text-align: center; font-size: 13px; color: #166534; }
</style>
</head>
<body>

<!-- Page 1 -->
<div class="page">
  <div class="header">
    <h1>{{report.analysisParams.idea}}</h1>
    <div class="tagline">{{report.analysisParams.location}} &middot; Investor Snapshot</div>
  </div>

  <div class="section-title">Executive Summary</div>
  <div class="summary">
    {{report.executiveSummary.headline}}<br><br>
    {{report.executiveSummary.recommendation}}
  </div>

  <div class="section-title">Key Metrics</div>
  <div class="metric-grid">
    <div class="metric-box">
      <div class="label">Market Size</div>
      <div class="value">{{format.currency(report.marketAnalysis.marketSize)}}</div>
      <div class="confidence">{{report.metadata.confidenceTier}} confidence</div>
    </div>
    <div class="metric-box">
      <div class="label">Revenue Month 12</div>
      <div class="value">{{format.currency(report.financials.monthlyProfit)}}</div>
      <div class="confidence">{{report.metadata.confidenceTier}} confidence</div>
    </div>
    <div class="metric-box">
      <div class="label">Break-Even Month</div>
      <div class="value">{{report.financials.breakEvenMonth}}</div>
      <div class="confidence">{{report.metadata.confidenceTier}} confidence</div>
    </div>
    <div class="metric-box">
      <div class="label">LTV:CAC Ratio</div>
      <div class="value">{{report.financials.unitEconomics.ltvCacRatio}}</div>
      <div class="confidence">{{report.metadata.confidenceTier}} confidence</div>
    </div>
  </div>

  <div class="section-title">Stress Map</div>
  <div class="stress-grid">
    <div class="stress-item" style="background: #3b82f6;">
      <div class="stress-label">Viability</div>
      <div class="stress-score">{{report.executiveSummary.viabilityScore}}</div>
    </div>
    <div class="stress-item" style="background: #f59e0b;">
      <div class="stress-label">Risk</div>
      <div class="stress-score">{{report.riskAssessment.overallRisk}}</div>
    </div>
    <div class="stress-item" style="background: #10b981;">
      <div class="stress-label">Confidence</div>
      <div class="stress-score">{{format.percent(report.metadata.overallConfidence)}}</div>
    </div>
    <div class="stress-item" style="background: #8b5cf6;">
      <div class="stress-label">Growth</div>
      <div class="stress-score">{{report.marketAnalysis.growthRate}}</div>
    </div>
  </div>
</div>

<!-- Page 2 -->
<div class="page">
  <div class="section-title">Financial Projections</div>
  <table class="projections-table">
    <thead>
      <tr>
        <th>Month</th>
        <th>Revenue</th>
      </tr>
    </thead>
    <tbody>
      {{#each report.financials.revenueProjections}}
      <tr>
        <td>Month {{this.month}}</td>
        <td>{{format.currency(this.revenue)}}</td>
      </tr>
      {{/each}}
    </tbody>
  </table>

  <div class="section-title">Top Risk Factors</div>
  {{#each report.riskAssessment.topRisks}}
  <div class="risk-card">
    <div class="risk-name">{{this.risk}}</div>
    <div class="risk-severity">Probability: {{this.probability}} | Impact: {{this.impact}}</div>
    <div class="risk-mitigation">Mitigation: {{this.mitigation}}</div>
  </div>
  {{/each}}

  <div class="badge-footer">
    Validated with AIWMC Quantis &middot; Dual AI Engine &middot; {{format.percent(report.metadata.overallConfidence)}} Confidence
  </div>
</div>
</body>
</html>`,

  // ━━━ EXECUTIVE SUMMARY ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  executive_summary_v1: `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Executive Summary — {{report.analysisParams.idea}}</title>
<style>
  ${SHARED_RESET_CSS}
  .exec-page { max-width: 794px; margin: 0 auto; padding: 40px; }
  .exec-header { margin-bottom: 32px; padding-bottom: 20px; border-bottom: 3px solid #1a1a2e; }
  .exec-header h1 { font-size: 26px; font-weight: 800; color: #1a1a2e; margin-bottom: 4px; }
  .exec-header .location { font-size: 14px; color: #64748b; }
  .section-label { font-size: 12px; text-transform: uppercase; letter-spacing: 1.5px; color: #64748b; margin-bottom: 10px; }
  .overview { font-size: 15px; color: #334155; line-height: 1.75; margin-bottom: 32px; }
  .kpi-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 32px; }
  .kpi-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; }
  .kpi-card .kpi-label { font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #64748b; margin-bottom: 4px; }
  .kpi-card .kpi-value { font-size: 20px; font-weight: 700; color: #1a1a2e; }
  .action-box { background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 20px; margin-bottom: 32px; }
  .action-box .action-label { font-size: 12px; text-transform: uppercase; letter-spacing: 1px; color: #1e40af; margin-bottom: 8px; }
  .action-box .action-text { font-size: 15px; color: #1e3a5f; line-height: 1.6; }
  .confidence-badge { text-align: center; padding: 12px; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; font-size: 13px; color: #166534; margin-bottom: 16px; }
</style>
</head>
<body>
<div class="exec-page">
  <div class="exec-header">
    <h1>{{report.analysisParams.idea}}</h1>
    <div class="location">{{report.analysisParams.location}}</div>
  </div>

  <div class="section-label">Overview</div>
  <div class="overview">
    {{report.executiveSummary.headline}}<br><br>
    {{report.executiveSummary.recommendation}}
  </div>

  <div class="section-label">Key Metrics</div>
  <div class="kpi-grid">
    <div class="kpi-card">
      <div class="kpi-label">Startup Investment</div>
      <div class="kpi-value">{{format.currency(report.financials.startupInvestment)}}</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Monthly Profit</div>
      <div class="kpi-value">{{format.currency(report.financials.monthlyProfit)}}</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Monthly Expenses</div>
      <div class="kpi-value">{{format.currency(report.financials.monthlyExpenses)}}</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Break-Even Month</div>
      <div class="kpi-value">{{report.financials.breakEvenMonth}}</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Viability Score</div>
      <div class="kpi-value">{{report.executiveSummary.viabilityScore}}/100</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Risk Level</div>
      <div class="kpi-value">{{report.executiveSummary.riskLevel}}</div>
    </div>
  </div>

  {{#if report.executiveSummary.keyFindings}}
  <div class="section-label">Top Action Item</div>
  <div class="action-box">
    <div class="action-label">Priority Recommendation</div>
    <div class="action-text">{{report.executiveSummary.recommendation}}</div>
  </div>
  {{/if}}

  <div class="confidence-badge">
    AIWMC Quantis &middot; {{report.metadata.confidenceTier}} confidence ({{format.percent(report.metadata.overallConfidence)}}) &middot; Engine {{report.metadata.engineVersion}}
  </div>

  ${QUANTIS_FOOTER}
</div>
</body>
</html>`,
};
