import { useCallback, useRef, useState, useEffect } from 'react';
import type { BusinessAnalysisResult } from '@/types/analysis';
import { logger } from '@/lib/logger';
import { trackActivationEvent } from '@/lib/activationTracking';
import { logExportStart, logExportComplete } from '@/lib/exportJobs';
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  pdf,
  Font,
  Image,
} from '@react-pdf/renderer';
import React from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  lookupBenchmark,
  formatBenchmarkValue,
  type BenchmarkContext,
  type BenchmarkMetric,
  type BenchmarkResult,
} from '@/services/benchmark-lookup';
import {
  CLIENT_TO_SERVER_METRIC,
  serverRecordToResult,
  type ServerBenchmarkRecord,
} from '@/components/analysis/BenchmarkCitations';
import { deriveReportVerdict, deriveDegradedFlags } from './pdf-verdict';
import { BENCHMARK_COUNT_DISPLAY } from '@/config/canonical-facts';
import { buildBenchmarkCitationsSummary } from './pdf-benchmark-summary';
import { computeVerdict } from '@/lib/verdict';
import {
  selectCriticalAssumptions,
  selectWhatBreaksFirst,
  selectNextActions,
  computeRunwayLabel,
  normalizePercent,
  PROBABILITY_LABEL,
} from '@/lib/decision-memo-data';
import {
  QUALITY_STATUS_LABEL,
  QUALITY_STATUS_COLOR,
  QUALITY_STATUS_IS_EVALUATED,
  sourceCoverageColor,
} from './pdf-quality-dimensions';

interface PdfBenchmarkRow {
  label: string;
  metric: BenchmarkMetric;
  userValue?: number;
  bench: BenchmarkResult;
}

// ============================================
// BRANDING CONFIGURATION
// ============================================

export interface BrandingConfig {
  companyName: string;
  logoUrl?: string;
  primaryColor: string;
  accentColor: string;
  footerText?: string;
  headerText?: string;
  hideQuantisBranding: boolean;
}

const defaultBranding: BrandingConfig = {
  companyName: 'AIWMC Quantis',
  primaryColor: '#3b82f6',
  accentColor: '#22c55e',
  hideQuantisBranding: false,
};

// ============================================
// FONT CONFIGURATION - Using Built-in Helvetica
// ============================================
// Note: @react-pdf/renderer only supports .ttf fonts, not .woff2
// Using built-in Helvetica for maximum reliability

// Hyphenation callback to prevent text wrapping issues
Font.registerHyphenationCallback(word => [word]);

// Create colors with branding support
const createColors = (branding: BrandingConfig) => ({
  background: '#0f172a',
  cardBg: '#1e293b',
  border: '#334155',
  primary: branding.primaryColor || '#3b82f6',
  accent: branding.accentColor || '#22c55e',
  textPrimary: '#f1f5f9',
  textSecondary: '#94a3b8',
  textMuted: '#64748b',
  success: '#22c55e',
  warning: '#f59e0b',
  danger: '#ef4444',
});

// Default colors for static styles
const colors = createColors(defaultBranding);

// Built-in font families (no external loading required)
const fontFamily = 'Helvetica';
const fontFamilyBold = 'Helvetica-Bold';

// Styles for the PDF
const styles = StyleSheet.create({
  page: {
    backgroundColor: colors.background,
    padding: 40,
    fontFamily,
    color: colors.textPrimary,
    fontSize: 10,
    lineHeight: 1.4,
  },
  coverPage: {
    backgroundColor: colors.background,
    padding: 50,
    fontFamily,
    color: colors.textPrimary,
    lineHeight: 1.3,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    height: '100%',
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoText: {
    fontSize: 42,
    fontFamily: 'Helvetica-Bold',
    letterSpacing: 6,
    color: colors.primary,
    lineHeight: 1,
    marginBottom: 6,
  },
  logoSubtext: {
    fontSize: 11,
    letterSpacing: 3,
    color: colors.textSecondary,
    lineHeight: 1.2,
    textTransform: 'uppercase',
  },
  coverTitleSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  reportType: {
    fontSize: 10,
    letterSpacing: 4,
    color: colors.textMuted,
    marginBottom: 20,
    textTransform: 'uppercase',
  },
  coverTitle: {
    fontSize: 28,
    fontFamily: 'Helvetica-Bold',
    color: colors.textPrimary,
    lineHeight: 1.15,
    marginBottom: 12,
    textAlign: 'center',
    maxWidth: 400,
  },
  coverSubtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    lineHeight: 1.25,
    marginBottom: 20,
    textAlign: 'center',
  },
  industryBadge: {
    paddingVertical: 6,
    paddingHorizontal: 18,
    backgroundColor: colors.cardBg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 4,
  },
  industryBadgeText: {
    fontSize: 10,
    letterSpacing: 2,
    color: colors.primary,
    textTransform: 'uppercase',
  },
  coverMetrics: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 30,
    marginTop: 30,
  },
  coverMetricBox: {
    alignItems: 'center',
    padding: 16,
    backgroundColor: colors.cardBg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 6,
    minWidth: 140,
  },
  coverMetricLabel: {
    fontSize: 9,
    color: colors.textSecondary,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  coverMetricValue: {
    fontSize: 20,
    fontFamily: 'Helvetica-Bold',
    color: colors.textPrimary,
    lineHeight: 1.1,
  },
  // GTM-audit item #7 (2026-08-25): quality-dimensions breakdown, ported
  // from the orphaned (never-imported) ReportCoverPage.tsx into this
  // file's actual react-pdf primitives.
  qualityDimensionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
    marginTop: 16,
  },
  qualityDimensionChip: {
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: colors.cardBg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 5,
    minWidth: 90,
  },
  qualityDimensionLabel: {
    fontSize: 7.5,
    color: colors.textSecondary,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  qualityDimensionValue: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    textAlign: 'center',
  },
  coverFooter: {
    alignItems: 'center',
    paddingTop: 30,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  confidentialNotice: {
    fontSize: 9,
    letterSpacing: 3,
    color: colors.textMuted,
    marginBottom: 8,
  },
  copyright: {
    fontSize: 8,
    color: colors.textMuted,
  },
  pageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 24,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginBottom: 20,
  },
  pageHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    width: 380,
    maxWidth: 380,
    paddingRight: 12,
  },
  pageHeaderTitleWrap: {
    width: 230,
    flexShrink: 0,
    overflow: 'hidden',
  },
  pageHeaderSectionWrap: {
    width: 118,
    flexShrink: 0,
    overflow: 'hidden',
  },
  pageHeaderTitle: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: colors.textSecondary,
    lineHeight: 1.2,
  },
  pageHeaderSection: {
    fontSize: 9,
    color: colors.primary,
    fontFamily: 'Helvetica-Bold',
    lineHeight: 1.2,
  },
  pageHeaderLogo: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    letterSpacing: 1.5,
    color: colors.primary,
    width: 88,
    textAlign: 'right',
    flexShrink: 0,
    lineHeight: 1.1,
  },
  pageFooter: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    fontSize: 8,
    color: colors.textMuted,
  },
  sectionTitle: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    color: colors.textPrimary,
    lineHeight: 1.2,
    marginTop: 20,
    marginBottom: 12,
    paddingBottom: 6,
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
  },
  verdictBanner: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: colors.cardBg,
    borderWidth: 2,
    borderRadius: 6,
    marginBottom: 20,
  },
  verdictLabel: {
    fontSize: 9,
    letterSpacing: 2,
    color: colors.textMuted,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  verdictText: {
    fontSize: 26,
    fontFamily: 'Helvetica-Bold',
    letterSpacing: 3,
    lineHeight: 1.1,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  metricCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: colors.cardBg,
    padding: 16,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  metricCardLabel: {
    fontSize: 9,
    color: colors.textMuted,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 1,
    lineHeight: 1.2,
  },
  metricCardValue: {
    fontSize: 18,
    fontFamily: 'Helvetica-Bold',
    color: colors.textPrimary,
    lineHeight: 1.15,
  },
  paragraph: {
    fontSize: 10,
    lineHeight: 1.6,
    color: colors.textSecondary,
    marginBottom: 12,
  },
  highlightBox: {
    backgroundColor: colors.cardBg,
    padding: 14,
    borderRadius: 6,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
    marginBottom: 14,
  },
  highlightText: {
    fontSize: 10,
    color: colors.textSecondary,
    lineHeight: 1.5,
  },
  table: {
    marginBottom: 20,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: colors.border,
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
  },
  tableHeaderCell: {
    padding: 10,
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: colors.textPrimary,
    flex: 1,
    lineHeight: 1.3,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tableRowTotal: {
    flexDirection: 'row',
    backgroundColor: '#1e3a5f',
  },
  tableCell: {
    padding: 8,
    fontSize: 9,
    color: colors.textSecondary,
    flex: 1,
    lineHeight: 1.35,
  },
  tableCellBold: {
    padding: 8,
    fontSize: 9,
    color: colors.textPrimary,
    fontFamily: 'Helvetica-Bold',
    flex: 1,
    lineHeight: 1.35,
  },
  textRight: {
    textAlign: 'right',
  },
  textCenter: {
    textAlign: 'center',
  },
  listItem: {
    flexDirection: 'row',
    marginBottom: 10,
    alignItems: 'flex-start',
  },
  listBullet: {
    width: 20,
    height: 20,
    backgroundColor: colors.primary,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  listBulletText: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: colors.textPrimary,
  },
  listText: {
    flex: 1,
    fontSize: 10,
    color: colors.textSecondary,
    lineHeight: 1.5,
    paddingTop: 2,
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: 16,
    paddingLeft: 36,
    position: 'relative',
  },
  timelineNumber: {
    position: 'absolute',
    left: 0,
    width: 28,
    height: 28,
    backgroundColor: colors.primary,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timelineNumberText: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    color: colors.textPrimary,
  },
  timelineContent: {
    flex: 1,
    backgroundColor: colors.cardBg,
    padding: 14,
    borderRadius: 6,
    borderLeftWidth: 2,
    borderLeftColor: colors.primary,
  },
  timelineTitle: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    color: colors.textPrimary,
    marginBottom: 6,
  },
  timelineDesc: {
    fontSize: 10,
    color: colors.textSecondary,
    marginBottom: 6,
    lineHeight: 1.4,
  },
  timelineMeta: {
    flexDirection: 'row',
    gap: 20,
    fontSize: 9,
    color: colors.textMuted,
  },
  disclaimer: {
    backgroundColor: colors.cardBg,
    padding: 14,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  disclaimerText: {
    fontSize: 8,
    color: colors.textMuted,
    lineHeight: 1.7,
    fontStyle: 'italic',
  },
  marketSizeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
    gap: 12,
  },
  marketSizeItem: {
    flex: 1,
    alignItems: 'center',
  },
  marketSizeCircle: {
    padding: 18,
    borderWidth: 2,
    borderColor: colors.primary,
    borderRadius: 10,
    alignItems: 'center',
    width: '100%',
  },
  marketSizeLabel: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    color: colors.primary,
    marginBottom: 4,
  },
  marketSizeValue: {
    fontSize: 9,
    color: colors.textPrimary,
    fontFamily: 'Helvetica-Bold',
    textAlign: 'center',
  },
  marketSizeDesc: {
    fontSize: 7,
    color: colors.textMuted,
    marginTop: 4,
    textAlign: 'center',
  },
  separator: {
    color: colors.border,
    marginHorizontal: 6,
    flexShrink: 0,
  },
  highlightBoxSuccess: {
    backgroundColor: colors.cardBg,
    padding: 14,
    borderRadius: 6,
    borderLeftWidth: 3,
    borderLeftColor: colors.success,
    marginBottom: 14,
  },
  highlightLabelSuccess: {
    fontSize: 9,
    color: colors.success,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontFamily: 'Helvetica-Bold',
  },
  emptyText: {
    fontSize: 10,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
});

// ============================================
// HELPER FUNCTIONS
// ============================================

const formatCurrency = (value: number | undefined | null): string => {
  const safeValue = typeof value === 'number' && !isNaN(value) ? value : 0;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(safeValue);
};

const formatNumber = (value: number | undefined | null): string => {
  const safeValue = typeof value === 'number' && !isNaN(value) ? value : 0;
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  }).format(safeValue);
};

const formatKey = (key: string): string => {
  return key.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
};

const getScoreColor = (score: number): string => {
  if (score >= 70) return colors.success;
  if (score >= 50) return colors.warning;
  return colors.danger;
};

const getProfitColor = (profit: number): string => {
  return profit >= 0 ? colors.success : colors.danger;
};

const getProbColor = (p: string): string => {
  const pLower = String(p || '').toLowerCase();
  if (pLower.includes('high') || pLower.includes('высок')) return colors.danger;
  if (pLower.includes('med') || pLower.includes('средн')) return colors.warning;
  return colors.success;
};

// ============================================
// DATA SANITIZATION - Defensive Data Preparation
// ============================================

interface SafeResult extends BusinessAnalysisResult {
  _sanitized: true;
}

function prepareSafeResult(result: BusinessAnalysisResult): SafeResult {
  const defaultBreakdown = {
    rent_deposit: 0,
    equipment: 0,
    inventory: 0,
    legal: 0,
    marketing_initial: 0,
    working_capital: 0,
  };

  const defaultExpenseBreakdown = {
    rent: 0,
    utilities: 0,
    salaries: 0,
    inventory_replenishment: 0,
    marketing: 0,
    other: 0,
  };

  const defaultScenarioMetrics = {
    revenue: 0,
    variable_costs: 0,
    fixed_costs: 0,
    gross_profit: 0,
    net_profit: 0,
    gross_margin: 0,
    net_margin: 0,
  };

  return {
    ...result,
    _sanitized: true,
    confidence_score: result.confidence_score ?? 0,
    data_sources: Array.isArray(result.data_sources) ? result.data_sources : [],
    limitations: Array.isArray(result.limitations) ? result.limitations : [],
    financial_analysis: {
      ...result.financial_analysis,
      startup_investment: {
        total: result.financial_analysis?.startup_investment?.total ?? 0,
        breakdown: {
          ...defaultBreakdown,
          ...(result.financial_analysis?.startup_investment?.breakdown || {}),
        },
        reasoning: result.financial_analysis?.startup_investment?.reasoning || '',
      },
      monthly_expenses: {
        total: result.financial_analysis?.monthly_expenses?.total ?? 0,
        variable_costs: result.financial_analysis?.monthly_expenses?.variable_costs,
        fixed_costs: result.financial_analysis?.monthly_expenses?.fixed_costs,
        breakdown: {
          ...defaultExpenseBreakdown,
          ...(result.financial_analysis?.monthly_expenses?.breakdown || {}),
        },
      },
      scenarios: result.financial_analysis?.scenarios ? {
        pessimistic: { ...defaultScenarioMetrics, ...result.financial_analysis.scenarios.pessimistic },
        base: { ...defaultScenarioMetrics, ...result.financial_analysis.scenarios.base },
        optimistic: { ...defaultScenarioMetrics, ...result.financial_analysis.scenarios.optimistic },
      } : undefined,
      unit_economics: result.financial_analysis?.unit_economics ? {
        contribution_margin: result.financial_analysis.unit_economics.contribution_margin ?? 0,
        contribution_margin_ratio: result.financial_analysis.unit_economics.contribution_margin_ratio ?? 0,
        cac: result.financial_analysis.unit_economics.cac ?? 0,
        cac_payback_months: result.financial_analysis.unit_economics.cac_payback_months ?? 0,
        ltv: result.financial_analysis.unit_economics.ltv ?? 0,
        ltv_cac_ratio: result.financial_analysis.unit_economics.ltv_cac_ratio ?? 0,
      } : undefined,
      mrr: result.financial_analysis?.mrr ?? 0,
      returns: result.financial_analysis?.returns ? {
        payback_period_months: result.financial_analysis.returns.payback_period_months ?? 0,
        roi_year_1: result.financial_analysis.returns.roi_year_1 ?? 0,
        roi_year_3: result.financial_analysis.returns.roi_year_3 ?? 0,
        npv_3_years: result.financial_analysis.returns.npv_3_years ?? 0,
      } : undefined,
      monthly_profit: result.financial_analysis?.monthly_profit,
      payback_period_months: result.financial_analysis?.payback_period_months,
      monthly_revenue: result.financial_analysis?.monthly_revenue,
    },
    business_plan: {
      executive_summary: result.business_plan?.executive_summary || 'No executive summary available',
      product_description: result.business_plan?.product_description || 'Not specified',
      target_audience: result.business_plan?.target_audience || 'Not specified',
      competitive_advantages: result.business_plan?.competitive_advantages || 'Not identified',
      operations: result.business_plan?.operations || 'Not defined',
      risks: Array.isArray(result.business_plan?.risks) ? result.business_plan.risks : [],
      launch_steps: Array.isArray(result.business_plan?.launch_steps) ? result.business_plan.launch_steps : [],
    },
    market_analysis: {
      market_size: {
        tam: result.market_analysis?.market_size?.tam || 'N/A',
        sam: result.market_analysis?.market_size?.sam || 'N/A',
        som: result.market_analysis?.market_size?.som || 'N/A',
      },
      trends: Array.isArray(result.market_analysis?.trends) ? result.market_analysis.trends : [],
      competition: {
        main_competitors: Array.isArray(result.market_analysis?.competition?.main_competitors) 
          ? result.market_analysis.competition.main_competitors 
          : [],
        competitive_landscape: result.market_analysis?.competition?.competitive_landscape || 'Not analyzed',
        market_gaps: result.market_analysis?.competition?.market_gaps || 'Not identified',
      },
      barriers_to_entry: result.market_analysis?.barriers_to_entry || 'Not analyzed',
      growth_opportunities: result.market_analysis?.growth_opportunities || 'Not identified',
    },
    marketing_plan: {
      positioning: result.marketing_plan?.positioning || 'Not defined',
      pricing_strategy: result.marketing_plan?.pricing_strategy || 'Not defined',
      channels: Array.isArray(result.marketing_plan?.channels) ? result.marketing_plan.channels : [],
      cac: result.marketing_plan?.cac ?? 0,
      ltv: result.marketing_plan?.ltv ?? 0,
      first_3_months_plan: result.marketing_plan?.first_3_months_plan || 'Not specified',
    },
    metadata: {
      idea: result.metadata?.idea || 'Business Analysis',
      location: result.metadata?.location || 'Location not specified',
      industry_detected: result.metadata?.industry_detected || undefined,
      location_cost_multiplier: result.metadata?.location_cost_multiplier,
      generated_at: result.metadata?.generated_at || new Date().toISOString(),
      model: result.metadata?.model || 'AI Model',
      version: result.metadata?.version || '1.0',
    },
  };
}

// ============================================
// CREATE EXECUTIVE REPORT
// ============================================

// ============================================
// CROSS-SECTION RECONCILIATION (Handbook §19 item 4)
// ============================================
// Read-only pre-render check. Never modifies values — only produces a list of
// detected contradictions that are surfaced on the Accuracy Notice page.
function detectPdfContradictions(financial: any): string[] {
  const flags: string[] = [];
  try {
    const s = financial?.scenarios;
    if (!s) return flags;

    const baseRevenue  = s.base?.revenue  ?? 0;
    const baseProfit   = s.base?.net_profit ?? 0;
    const optRevenue   = s.optimistic?.revenue  ?? 0;
    const optProfit    = s.optimistic?.net_profit ?? 0;
    const pessRevenue  = s.pessimistic?.revenue  ?? 0;
    const pessProfit   = s.pessimistic?.net_profit ?? 0;

    // Scenario monotonicity: optimistic revenue higher but profit lower
    if (optRevenue > baseRevenue && optProfit < baseProfit) {
      flags.push('Detected: optimistic scenario shows higher revenue than base but lower profit — scenario driver logic may be inconsistent.');
    }
    // Scenario monotonicity: base revenue higher but profit lower than pessimistic
    if (baseRevenue > pessRevenue && baseProfit < pessProfit) {
      flags.push('Detected: base scenario shows higher revenue than pessimistic but lower profit — scenario driver logic may be inconsistent.');
    }

    // KPI card vs base scenario cross-check (>10% relative divergence triggers flag)
    const displayProfit = financial.monthly_profit ?? 0;
    if (Math.abs(baseProfit) > 100 && Math.abs(displayProfit) > 100) {
      const relDiff = Math.abs(baseProfit - displayProfit) / Math.max(Math.abs(baseProfit), Math.abs(displayProfit));
      if (relDiff > 0.10) {
        flags.push('Detected: monthly profit on KPI card differs from scenario base profit by more than 10% — cross-section mismatch present in this report.');
      }
    }
  } catch {
    // never crash PDF generation
  }
  return flags;
}

// GTM-audit item #3 (2026-08-25): react-pdf auto-paginates content that
// overflows a single <Page> element into additional physical PDF pages.
// This report previously hardcoded a literal 'Page N of 10' string per
// <Page> element -- wrong on two counts at once: it never accounted for
// overflow (a "page" whose content wraps becomes 2+ physical pages, all
// showing the SAME hardcoded label), and the hardcoded numbers themselves
// were already wrong before any overflow happened (they jumped straight
// from "Page 8 of 10" to "Page 10 of 10", never printing a "9" at all,
// while the literal "10" total didn't match the 8 actual <Page> elements
// either). `render` + `fixed` is react-pdf's built-in mechanism for a
// footer that's recomputed per ACTUAL physical page and repeated across
// a single element's overflow -- the only way to make this number true.
const pageNumFooter = () =>
  React.createElement(Text, {
    render: ({ pageNumber, totalPages }: { pageNumber: number; totalPages: number }) =>
      `Page ${pageNumber} of ${totalPages}`,
    fixed: true,
  });

// Exported (2026-08-25) specifically so pdf-render-smoke.test.ts can call
// @react-pdf/renderer's pdf().toBuffer() against real output -- this is
// the only kind of test that can catch a react-pdf-specific runtime error
// (e.g. an unregistered font-family/style combination), which it already
// has once. Not part of the hook's intended public API otherwise; callers
// should use usePdfExport()'s generatePdf().
// Phase 7 (Paid Decision Workflow Validation, 2026-08-30): a paid founder/
// consultant engagement hands the same trusted verdict + numbers to a named
// decision-maker, framed around a specific decision question and with
// consultant notes attached. Rather than building a parallel document
// template (the existing report is already the closest thing to a decision
// memo -- verdict, benchmark citations, branding), this reuses the real
// report and adds one optional page. All fields optional; omitting this
// param produces byte-identical output to before, so the free/self-serve
// export path is unaffected.
export interface EngagementMemoContext {
  preparedFor?: string;
  decisionQuestion?: string;
  consultantNotes?: string;
}

// Stage 4 (Reports Consolidation): 'memo' is the new default export -- a
// 3-5 page Decision Memo. 'full' is the pre-existing, unchanged detailed
// report (the "17-page report" / appendix), still fully available as a
// secondary option. See createDecisionMemoReport() below.
export type PdfVariant = 'memo' | 'full';

export const createExecutiveReport = (rawResult: BusinessAnalysisResult, branding: BrandingConfig = defaultBranding, benchmarkRows: PdfBenchmarkRow[] = [], engagementContext?: EngagementMemoContext) => {
  // Sanitize data to ensure all fields have safe defaults
  const result = prepareSafeResult(rawResult);

  // GTM-audit item #2 (2026-08-25): a failed AI narrator step previously
  // produced a normal-looking report with no indication anything had
  // failed. Flag derivation (isDegraded/integrityBlocked) is extracted
  // into pdf-verdict.ts's deriveDegradedFlags() -- see its own comment
  // for the 2026-08-29 fix to a real bug this extraction caught (the
  // `used_fallback` flag was being read from the wrong path and was
  // always false in production).
  const { isDegraded, integrityBlocked } = deriveDegradedFlags(rawResult);

  // GTM-audit item #7 (2026-08-25): the cover previously showed a single
  // "Confidence Score" -- a 40/30/20/10 blend of input completeness, data
  // quality, validation-rule score, and industry relevance -- under a
  // label a reader reasonably (and incorrectly) reads as forecast
  // accuracy. quality_dimensions decomposes that blend into separately-
  // labeled, honestly-derived signals; it's already computed server-side
  // for every analysis (supabase/functions/_shared/quality-dimensions.ts)
  // but was never wired into the PDF that actually ships. Older stored
  // reports generated before this field existed won't have it -- qd stays
  // undefined and the cover falls back to the legacy blended number under
  // an unambiguous label that doesn't claim forecast accuracy either.
  const qd = result.validation?.quality_dimensions;

  // Cross-section reconciliation check (handbook §19 item 4) — read-only, surfaces contradictions in Accuracy Notice
  const reconciliationFlags = detectPdfContradictions(result.financial_analysis);
  if (isDegraded) {
    reconciliationFlags.push(
      'AI narrative generation failed for this analysis — the executive summary, market analysis, risk assessment, and action plan below were produced by the deterministic engine\'s standard template, not written by an AI model for this specific business. Financial figures are unaffected and remain fully calculated.'
    );
  }
  if (integrityBlocked) {
    const blockIssues = (((rawResult as any)?.report_integrity_issues ?? []) as Array<{ message?: string }>)
      .map((i) => i.message)
      .filter((m): m is string => Boolean(m));
    reconciliationFlags.push(
      `This report failed a critical financial-accounting check and should be reviewed before use.${blockIssues.length ? ' ' + blockIssues.join(' ') : ''}`
    );
  }

  // Create branded colors
  const brandedColors = createColors(branding);

  const financial = result.financial_analysis;
  const monthlyProfit = financial.scenarios?.base?.net_profit ?? financial.monthly_profit ?? 0;
  const paybackMonths = financial.returns?.payback_period_months ?? financial.payback_period_months ?? 0;
  const monthlyRevenue = financial.mrr ?? financial.monthly_revenue?.realistic ?? 0;

  // CodeRabbit catch on PR #88: the verdict logic previously lived only as
  // an inline closure here, testable only by regex-matching this file's
  // source text (a source token can survive after the runtime behavior
  // regresses). Extracted to pdf-verdict.ts's deriveReportVerdict(), which
  // has zero @react-pdf/renderer dependency and can be called directly in
  // a real test, asserting on its actual return value.
  const toneToColor: Record<ReturnType<typeof deriveReportVerdict>['tone'], string> = {
    success: brandedColors.success,
    warning: brandedColors.warning,
    danger: brandedColors.danger,
  };
  const getVerdict = () => {
    const v = deriveReportVerdict({
      confidenceScore: result.confidence_score,
      monthlyProfit,
      paybackMonths,
      isDegraded,
      integrityBlocked,
    });
    return { text: v.text, color: toneToColor[v.tone] };
  };

  const verdict = getVerdict();
  const generatedDate = new Date(result.metadata.generated_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  const currentDate = new Date().toLocaleDateString('en-US');
  const currentYear = new Date().getFullYear();
  const truncatePdfHeaderText = (value: string, maxChars: number): string => {
    const normalized = String(value || '').replace(/\s+/g, ' ').trim();
    return normalized.length > maxChars ? `${normalized.slice(0, Math.max(0, maxChars - 1))}…` : normalized;
  };
  const headerIdea = truncatePdfHeaderText(result.metadata.idea, 58);
  const headerSection = (value: string) => truncatePdfHeaderText(value, 22);

  const investmentBreakdown = Object.entries(financial.startup_investment.breakdown || {});
  const expenseBreakdown = Object.entries(financial.monthly_expenses.breakdown || {});
  const trends = result.market_analysis?.trends || [];
  const risks = result.business_plan.risks || [];
  const launchSteps = result.business_plan.launch_steps || [];
  const dataSources = result.data_sources || [];
  const limitations = result.limitations || [];

  // Branding text values
  const brandName = branding.companyName || 'AIWMC Quantis';
  const brandSubtitle = branding.headerText || 'AI Business Intelligence Platform';
  const footerText = branding.footerText || `${brandName} - ${brandSubtitle}`;
  const showQuantisBranding = !branding.hideQuantisBranding;
  const displayBrandName = showQuantisBranding ? brandName : brandName.replace('AIWMC Quantis', brandName);

  // Dynamic branded styles
  const brandedLogoText = { ...styles.logoText, color: brandedColors.primary };
  const brandedHeaderLogo = { ...styles.pageHeaderLogo, color: brandedColors.primary };
  const brandedIndustryBadgeText = { ...styles.industryBadgeText, color: brandedColors.primary };

  const hasEngagementContext = !!(
    engagementContext &&
    (engagementContext.preparedFor || engagementContext.decisionQuestion || engagementContext.consultantNotes)
  );
  const engagementMemoPage = hasEngagementContext
    ? React.createElement(
        Page,
        { size: 'A4', style: styles.page },
        React.createElement(
          View,
          { style: { borderWidth: 2, borderColor: brandedColors.primary, borderRadius: 6, padding: 20, marginTop: 40 } },
          React.createElement(Text, { style: { fontSize: 14, fontFamily: 'Helvetica-Bold', color: brandedColors.primary, marginBottom: 14 } }, 'DECISION MEMO'),
          engagementContext?.preparedFor
            ? React.createElement(Text, { style: { fontSize: 10, color: styles.paragraph.color, marginBottom: 10 } },
                `Prepared for: ${engagementContext.preparedFor}`)
            : null,
          engagementContext?.decisionQuestion
            ? React.createElement(
                View,
                { style: { marginBottom: 14 } },
                React.createElement(Text, { style: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: styles.paragraph.color, marginBottom: 4 } }, 'Decision under review'),
                React.createElement(Text, { style: { fontSize: 10, lineHeight: 1.6, color: styles.paragraph.color } }, engagementContext.decisionQuestion)
              )
            : null,
          engagementContext?.consultantNotes
            ? React.createElement(
                View,
                null,
                React.createElement(Text, { style: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: styles.paragraph.color, marginBottom: 4 } }, 'Reviewer notes'),
                React.createElement(Text, { style: { fontSize: 10, lineHeight: 1.6, color: styles.paragraph.color } }, engagementContext.consultantNotes)
              )
            : null,
          React.createElement(
            View,
            { style: { marginTop: 20, borderTopWidth: 1, borderTopColor: brandedColors.primary, paddingTop: 10 } },
            React.createElement(Text, { style: { fontSize: 8, color: styles.paragraph.color } },
              'The numbers and verdict that follow are produced by the same deterministic engine and AI-safety checks as every Quantis report — this memo adds decision framing on top, it does not alter the underlying calculation.')
          )
        ),
        React.createElement(
          View,
          { style: styles.pageFooter },
          React.createElement(Text, null, `CONFIDENTIAL | ${displayBrandName} | ${currentDate}`),
          React.createElement(Text, null, ''),
          React.createElement(Text, null, 'Decision Memo')
        )
      )
    : null;

  return React.createElement(
    Document,
    null,
    // Cover Page
    React.createElement(
      Page,
      { size: 'A4', style: styles.coverPage },
      React.createElement(
        View,
        { style: styles.logoSection },
        (() => {
          const url = branding.logoUrl?.trim();
          // Only embed logos served over http(s) — data: URLs and bad refs blow up @react-pdf
          const isSafeLogo = !!url && /^https?:\/\//i.test(url);
          return isSafeLogo
            ? React.createElement(Image, { src: url!, style: { width: 180, height: 60, marginBottom: 10, objectFit: 'contain' } })
            : React.createElement(Text, { style: brandedLogoText }, displayBrandName);
        })(),
        React.createElement(Text, { style: styles.logoSubtext }, brandSubtitle)
      ),
      React.createElement(
        View,
        { style: styles.coverTitleSection },
        React.createElement(Text, { style: styles.reportType }, 'BUSINESS FEASIBILITY ANALYSIS'),
        React.createElement(Text, { style: styles.coverTitle }, result.metadata.idea),
        React.createElement(Text, { style: styles.coverSubtitle }, result.metadata.location),
        result.metadata.industry_detected && React.createElement(
          View,
          { style: styles.industryBadge },
          React.createElement(Text, { style: brandedIndustryBadgeText }, result.metadata.industry_detected.toUpperCase())
        ),
        React.createElement(
          View,
          { style: styles.coverMetrics },
          React.createElement(
            View,
            { style: styles.coverMetricBox },
            React.createElement(Text, { style: styles.coverMetricLabel }, qd ? 'Input Completeness' : 'Analysis Quality Index (legacy)'),
            React.createElement(Text, {
              style: { ...styles.coverMetricValue, color: getScoreColor(qd ? qd.input_completeness : result.confidence_score) },
            }, `${qd ? qd.input_completeness : result.confidence_score}%`)
          ),
          qd && React.createElement(
            View,
            { style: styles.coverMetricBox },
            React.createElement(Text, { style: styles.coverMetricLabel }, 'Source Coverage'),
            React.createElement(Text, {
              style: { ...styles.coverMetricValue, color: sourceCoverageColor(qd.source_coverage) },
            }, `${qd.source_coverage}%`)
          ),
          React.createElement(
            View,
            { style: styles.coverMetricBox },
            React.createElement(Text, { style: styles.coverMetricLabel }, 'Analysis Date'),
            React.createElement(Text, { style: styles.coverMetricValue }, generatedDate)
          )
        ),
        // Quality dimensions -- replaces the single blended score with
        // separately-labeled reconciliation checks. Only rendered when the
        // engine populated them (older stored reports won't have this).
        qd && React.createElement(
          View,
          { style: styles.qualityDimensionsRow },
          [
            ['Benchmark Match', qd.benchmark_match_quality],
            ['Scenario Check', qd.scenario_reconciliation],
            ['Narrative Check', qd.narrative_reconciliation],
            ['Formula Check', qd.formula_reconciliation],
            ['Outcome Calibration', qd.outcome_calibration],
          ].map(([label, status]) =>
            React.createElement(
              View,
              {
                key: label,
                style: {
                  ...styles.qualityDimensionChip,
                  borderStyle: QUALITY_STATUS_IS_EVALUATED[status as keyof typeof QUALITY_STATUS_IS_EVALUATED] ? 'solid' : 'dashed',
                },
              },
              React.createElement(Text, { style: styles.qualityDimensionLabel }, label),
              (() => {
                // Real bug caught by a render smoke test (2026-08-25):
                // qualityDimensionValue's base font is Helvetica-Bold.
                // Combining that with fontStyle:'italic' asks react-pdf
                // for a "Helvetica-Bold + italic" variant that isn't a
                // registered standard-14 font, and it throws
                // "Could not resolve font" -- which would have crashed
                // EVERY PDF export, since outcome_calibration is
                // unconditionally NOT_AVAILABLE today (no outcome-
                // ingestion system exists yet), so this code path runs on
                // every single analysis. Switching the font FAMILY (not
                // just style) for the not-evaluated case keeps each
                // combination a real standard font: Helvetica-Bold+normal,
                // or plain Helvetica+italic (= Helvetica-Oblique).
                const evaluated = QUALITY_STATUS_IS_EVALUATED[status as keyof typeof QUALITY_STATUS_IS_EVALUATED];
                return React.createElement(Text, {
                  style: {
                    ...styles.qualityDimensionValue,
                    color: QUALITY_STATUS_COLOR[status as keyof typeof QUALITY_STATUS_COLOR],
                    fontFamily: evaluated ? 'Helvetica-Bold' : 'Helvetica',
                    fontStyle: evaluated ? 'normal' : 'italic',
                  },
                }, QUALITY_STATUS_LABEL[status as keyof typeof QUALITY_STATUS_LABEL]);
              })()
            )
          )
        )
      ),
      React.createElement(
        View,
        { style: styles.coverFooter },
        React.createElement(Text, { style: styles.confidentialNotice }, 'CONFIDENTIAL - FOR INTERNAL USE ONLY'),
        React.createElement(Text, { style: styles.copyright }, `${footerText} | All Rights Reserved | ${currentYear}`)
      )
    ),
    // Decision Memo (Phase 7, optional — only when engagementContext is provided)
    engagementMemoPage,
    // Accuracy Notice
    React.createElement(
      Page,
      { size: 'A4', style: styles.page },
      React.createElement(
        View,
        { style: { backgroundColor: '#fffbeb', borderWidth: 2, borderColor: '#f59e0b', borderRadius: 6, padding: 20, marginTop: 40 } },
        React.createElement(Text, { style: { fontSize: 14, fontFamily: 'Helvetica-Bold', color: '#92400e', marginBottom: 10 } }, 'ACCURACY NOTICE'),
        React.createElement(Text, { style: { fontSize: 10, lineHeight: 1.6, color: '#78350f', marginBottom: 8 } },
          'This report is generated by an AI-assisted financial modeling engine. While core calculations are deterministic, the following limitations apply to this version:'
        ),
        React.createElement(Text, { style: { fontSize: 10, lineHeight: 1.6, color: '#78350f', marginBottom: 4 } },
          '•  Scenario projections (optimistic/base/pessimistic) may not yet reflect fully reconciled driver dependencies.'
        ),
        React.createElement(Text, { style: { fontSize: 10, lineHeight: 1.6, color: '#78350f', marginBottom: 4 } },
          '•  Benchmark comparisons use engine-derived values and may not represent direct industry observations for all metrics.'
        ),
        React.createElement(Text, { style: { fontSize: 10, lineHeight: 1.6, color: '#78350f', marginBottom: 4 } },
          '•  Cross-section reconciliation (narrative vs. KPI cards vs. tables) is partially implemented. The executive summary is firewall-checked; other narrative sections are not yet covered.'
        ),
        React.createElement(Text, { style: { fontSize: 10, lineHeight: 1.6, color: '#78350f', marginBottom: 12 } },
          '•  Confidence scores reflect input coverage grading, not empirically calibrated forecast accuracy.'
        ),
        React.createElement(Text, { style: { fontSize: 10, fontFamily: 'Helvetica-Bold', lineHeight: 1.6, color: '#78350f' } },
          'Users should independently verify all material financial assumptions before making investment or operational decisions. This report is a structured pre-mortem, not a guarantee of future results.'
        ),
        reconciliationFlags.length > 0
          ? React.createElement(
              View,
              { style: { marginTop: 16, borderTopWidth: 1, borderTopColor: '#f59e0b', paddingTop: 12 } },
              React.createElement(Text, { style: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: '#92400e', marginBottom: 6 } }, 'Contradictions detected in this report:'),
              ...reconciliationFlags.map((flag) =>
                React.createElement(Text, { style: { fontSize: 10, lineHeight: 1.6, color: '#78350f', marginBottom: 4 }, key: flag }, `⚠  ${flag}`)
              )
            )
          : null
      ),
      React.createElement(
        View,
        { style: styles.pageFooter },
        React.createElement(Text, null, `CONFIDENTIAL | ${displayBrandName} | ${currentDate}`),
        React.createElement(Text, null, ''),
        React.createElement(Text, null, 'Accuracy Notice')
      )
    ),
    // Executive Summary Page
    React.createElement(
      Page,
      { size: 'A4', style: styles.page },
      React.createElement(
        View,
        { style: styles.pageHeader },
        React.createElement(
          View,
          { style: styles.pageHeaderLeft },
          React.createElement(View, { style: styles.pageHeaderTitleWrap },
            React.createElement(Text, ({ style: styles.pageHeaderTitle, maxLines: 1 } as any), headerIdea)
          ),
          React.createElement(Text, { style: styles.separator }, ' | '),
          React.createElement(View, { style: styles.pageHeaderSectionWrap },
            React.createElement(Text, ({ style: { ...styles.pageHeaderSection, color: brandedColors.primary }, maxLines: 1 } as any), headerSection('Executive Summary'))
          )
        ),
        React.createElement(Text, { style: brandedHeaderLogo }, showQuantisBranding ? 'Quantis' : brandName.substring(0, 15))
      ),
      React.createElement(
        View,
        { style: { ...styles.verdictBanner, borderColor: verdict.color } },
        React.createElement(Text, { style: styles.verdictLabel }, 'Investment Verdict'),
        React.createElement(Text, { style: { ...styles.verdictText, color: verdict.color } }, verdict.text)
      ),
      React.createElement(Text, { style: { ...styles.sectionTitle, borderBottomColor: brandedColors.primary } }, 'Key Financial Indicators'),
      React.createElement(
        View,
        { style: styles.metricsGrid },
        React.createElement(
          View,
          { style: styles.metricCard },
          React.createElement(Text, { style: styles.metricCardLabel }, 'Total Investment Required'),
          React.createElement(Text, { style: styles.metricCardValue }, formatCurrency(financial.startup_investment.total))
        ),
        React.createElement(
          View,
          { style: styles.metricCard },
          React.createElement(Text, { style: styles.metricCardLabel }, 'Monthly Revenue (MRR)'),
          React.createElement(Text, { style: styles.metricCardValue }, formatCurrency(monthlyRevenue))
        ),
        React.createElement(
          View,
          { style: styles.metricCard },
          React.createElement(Text, { style: styles.metricCardLabel }, 'Monthly Operating Profit'),
          React.createElement(Text, { style: { ...styles.metricCardValue, color: getProfitColor(monthlyProfit) } }, formatCurrency(monthlyProfit))
        ),
        React.createElement(
          View,
          { style: styles.metricCard },
          React.createElement(Text, { style: styles.metricCardLabel }, 'Payback Period'),
          React.createElement(Text, { style: {
            ...styles.metricCardValue,
            color: monthlyProfit <= 0 ? brandedColors.danger : brandedColors.textPrimary
          } }, monthlyProfit <= 0 ? 'N/A (unprofitable)' : paybackMonths >= 999 ? 'N/A (unprofitable)' : paybackMonths < 12 ? `${paybackMonths} months` : `${(paybackMonths / 12).toFixed(1)} years`)
        )
      ),
      React.createElement(Text, { style: { ...styles.sectionTitle, borderBottomColor: brandedColors.primary } }, 'Business Overview'),
      React.createElement(Text, { style: styles.paragraph }, result.business_plan.executive_summary),
      React.createElement(Text, { style: { ...styles.sectionTitle, borderBottomColor: brandedColors.primary } }, 'Target Market'),
      React.createElement(
        View,
        { style: { ...styles.highlightBox, borderLeftColor: brandedColors.primary } },
        React.createElement(Text, { style: styles.highlightText }, result.business_plan.target_audience)
      ),
        React.createElement(
        View,
        { style: styles.pageFooter },
        React.createElement(Text, null, `CONFIDENTIAL | ${displayBrandName} | ${currentDate}`),
        React.createElement(Text, null, ''),
        pageNumFooter()
      )
    ),
    // Financial Analysis Page
    React.createElement(
      Page,
      { size: 'A4', style: styles.page },
      React.createElement(
        View,
        { style: styles.pageHeader },
        React.createElement(
          View,
          { style: styles.pageHeaderLeft },
          React.createElement(View, { style: styles.pageHeaderTitleWrap },
            React.createElement(Text, ({ style: styles.pageHeaderTitle, maxLines: 1 } as any), headerIdea)
          ),
          React.createElement(Text, { style: styles.separator }, ' | '),
          React.createElement(View, { style: styles.pageHeaderSectionWrap },
            React.createElement(Text, ({ style: { ...styles.pageHeaderSection, color: brandedColors.primary }, maxLines: 1 } as any), headerSection('Financial Analysis'))
          )
        ),
        React.createElement(Text, { style: brandedHeaderLogo }, showQuantisBranding ? 'Quantis' : brandName.substring(0, 15))
      ),
      React.createElement(Text, { style: { ...styles.sectionTitle, borderBottomColor: brandedColors.primary } }, 'Initial Investment Breakdown'),
      React.createElement(
        View,
        { style: styles.table },
        React.createElement(
          View,
          { style: { ...styles.tableHeader, borderBottomColor: brandedColors.primary } },
          React.createElement(Text, { style: styles.tableHeaderCell }, 'Category'),
          React.createElement(Text, { style: { ...styles.tableHeaderCell, ...styles.textRight } }, 'Amount'),
          React.createElement(Text, { style: { ...styles.tableHeaderCell, ...styles.textRight } }, '% of Total')
        ),
        ...investmentBreakdown.map(([key, value]) => {
          const numValue = typeof value === 'number' ? value : 0;
          const total = financial.startup_investment.total || 1;
          return React.createElement(
            View,
            { key, style: styles.tableRow },
            React.createElement(Text, { style: styles.tableCell }, formatKey(key)),
            React.createElement(Text, { style: { ...styles.tableCell, ...styles.textRight } }, formatCurrency(numValue)),
            React.createElement(Text, { style: { ...styles.tableCell, ...styles.textRight } }, `${formatNumber((numValue / total) * 100)}%`)
          );
        }),
        React.createElement(
          View,
          { style: styles.tableRowTotal },
          React.createElement(Text, { style: styles.tableCellBold }, 'Total Investment'),
          React.createElement(Text, { style: { ...styles.tableCellBold, ...styles.textRight } }, formatCurrency(financial.startup_investment.total)),
          React.createElement(Text, { style: { ...styles.tableCellBold, ...styles.textRight } }, '100%')
        )
      ),
      React.createElement(Text, { style: { ...styles.sectionTitle, borderBottomColor: brandedColors.primary } }, 'Monthly Operating Expenses'),
      React.createElement(
        View,
        { style: styles.table },
        React.createElement(
          View,
          { style: { ...styles.tableHeader, borderBottomColor: brandedColors.primary } },
          React.createElement(Text, { style: styles.tableHeaderCell }, 'Expense Category'),
          React.createElement(Text, { style: { ...styles.tableHeaderCell, ...styles.textRight } }, 'Monthly Cost'),
          React.createElement(Text, { style: { ...styles.tableHeaderCell, ...styles.textRight } }, 'Annual Cost')
        ),
        ...expenseBreakdown.map(([key, value]) => {
          const numValue = typeof value === 'number' ? value : 0;
          return React.createElement(
            View,
            { key, style: styles.tableRow },
            React.createElement(Text, { style: styles.tableCell }, formatKey(key)),
            React.createElement(Text, { style: { ...styles.tableCell, ...styles.textRight } }, formatCurrency(numValue)),
            React.createElement(Text, { style: { ...styles.tableCell, ...styles.textRight } }, formatCurrency(numValue * 12))
          );
        }),
        React.createElement(
          View,
          { style: styles.tableRowTotal },
          React.createElement(Text, { style: styles.tableCellBold }, 'Total Monthly'),
          React.createElement(Text, { style: { ...styles.tableCellBold, ...styles.textRight } }, formatCurrency(financial.monthly_expenses.total)),
          React.createElement(Text, { style: { ...styles.tableCellBold, ...styles.textRight } }, formatCurrency(financial.monthly_expenses.total * 12))
        )
      ),
      React.createElement(
        View,
        { style: styles.pageFooter },
        React.createElement(Text, null, `CONFIDENTIAL | ${displayBrandName} | ${currentDate}`),
        React.createElement(Text, null, ''),
        pageNumFooter()
      )
    ),
    // Scenario Analysis Page
    React.createElement(
      Page,
      { size: 'A4', style: styles.page },
      React.createElement(
        View,
        { style: styles.pageHeader },
        React.createElement(
          View,
          { style: styles.pageHeaderLeft },
          React.createElement(View, { style: styles.pageHeaderTitleWrap },
            React.createElement(Text, ({ style: styles.pageHeaderTitle, maxLines: 1 } as any), headerIdea)
          ),
          React.createElement(Text, { style: styles.separator }, ' | '),
          React.createElement(View, { style: styles.pageHeaderSectionWrap },
            React.createElement(Text, ({ style: { ...styles.pageHeaderSection, color: brandedColors.primary }, maxLines: 1 } as any), headerSection('Scenario Analysis'))
          )
        ),
        React.createElement(Text, { style: brandedHeaderLogo }, showQuantisBranding ? 'Quantis' : brandName.substring(0, 15))
      ),
      financial.scenarios && React.createElement(
        View,
        null,
        React.createElement(Text, { style: { ...styles.sectionTitle, borderBottomColor: brandedColors.primary } }, 'Three-Scenario Financial Model'),
        React.createElement(
          View,
          { style: styles.table },
          React.createElement(
            View,
            { style: { ...styles.tableHeader, borderBottomColor: brandedColors.primary } },
            React.createElement(Text, { style: styles.tableHeaderCell }, 'Metric'),
            React.createElement(Text, { style: { ...styles.tableHeaderCell, ...styles.textRight, color: brandedColors.danger } }, 'Pessimistic'),
            React.createElement(Text, { style: { ...styles.tableHeaderCell, ...styles.textRight, color: brandedColors.primary } }, 'Base Case'),
            React.createElement(Text, { style: { ...styles.tableHeaderCell, ...styles.textRight, color: brandedColors.success } }, 'Optimistic')
          ),
          React.createElement(
            View,
            { style: styles.tableRow },
            React.createElement(Text, { style: styles.tableCell }, 'Monthly Revenue'),
            React.createElement(Text, { style: { ...styles.tableCell, ...styles.textRight } }, formatCurrency(financial.scenarios.pessimistic.revenue)),
            React.createElement(Text, { style: { ...styles.tableCell, ...styles.textRight } }, formatCurrency(financial.scenarios.base.revenue)),
            React.createElement(Text, { style: { ...styles.tableCell, ...styles.textRight } }, formatCurrency(financial.scenarios.optimistic.revenue))
          ),
          React.createElement(
            View,
            { style: styles.tableRow },
            React.createElement(Text, { style: styles.tableCell }, 'Gross Profit'),
            React.createElement(Text, { style: { ...styles.tableCell, ...styles.textRight } }, formatCurrency(financial.scenarios.pessimistic.gross_profit)),
            React.createElement(Text, { style: { ...styles.tableCell, ...styles.textRight } }, formatCurrency(financial.scenarios.base.gross_profit)),
            React.createElement(Text, { style: { ...styles.tableCell, ...styles.textRight } }, formatCurrency(financial.scenarios.optimistic.gross_profit))
          ),
          React.createElement(
            View,
            { style: styles.tableRow },
            React.createElement(Text, { style: styles.tableCell }, 'Operating Profit'),
            React.createElement(Text, { style: { ...styles.tableCell, ...styles.textRight, color: getProfitColor(financial.scenarios.pessimistic.net_profit) } }, formatCurrency(financial.scenarios.pessimistic.net_profit)),
            React.createElement(Text, { style: { ...styles.tableCell, ...styles.textRight, color: getProfitColor(financial.scenarios.base.net_profit) } }, formatCurrency(financial.scenarios.base.net_profit)),
            React.createElement(Text, { style: { ...styles.tableCell, ...styles.textRight, color: getProfitColor(financial.scenarios.optimistic.net_profit) } }, formatCurrency(financial.scenarios.optimistic.net_profit))
          ),
          React.createElement(
            View,
            { style: styles.tableRow },
            React.createElement(Text, { style: styles.tableCell }, 'Gross Margin'),
            React.createElement(Text, { style: { ...styles.tableCell, ...styles.textRight } }, `${formatNumber(financial.scenarios.pessimistic.gross_margin)}%`),
            React.createElement(Text, { style: { ...styles.tableCell, ...styles.textRight } }, `${formatNumber(financial.scenarios.base.gross_margin)}%`),
            React.createElement(Text, { style: { ...styles.tableCell, ...styles.textRight } }, `${formatNumber(financial.scenarios.optimistic.gross_margin)}%`)
          ),
          React.createElement(
            View,
            { style: styles.tableRow },
            React.createElement(Text, { style: styles.tableCell }, 'Operating Margin'),
            React.createElement(Text, { style: { ...styles.tableCell, ...styles.textRight } }, `${formatNumber(financial.scenarios.pessimistic.net_margin)}%`),
            React.createElement(Text, { style: { ...styles.tableCell, ...styles.textRight } }, `${formatNumber(financial.scenarios.base.net_margin)}%`),
            React.createElement(Text, { style: { ...styles.tableCell, ...styles.textRight } }, `${formatNumber(financial.scenarios.optimistic.net_margin)}%`)
          )
        )
      ),
      !financial.scenarios && React.createElement(
        View,
        { style: { ...styles.highlightBox, borderLeftColor: brandedColors.primary } },
        React.createElement(Text, { style: styles.highlightText }, 'Scenario analysis data not available for this analysis.')
      ),
      financial.unit_economics && React.createElement(
        View,
        null,
        React.createElement(Text, { style: { ...styles.sectionTitle, borderBottomColor: brandedColors.primary } }, 'Unit Economics'),
        React.createElement(
          View,
          { style: styles.metricsGrid },
          React.createElement(
            View,
            { style: styles.metricCard },
            React.createElement(Text, { style: styles.metricCardLabel }, 'Customer Acquisition Cost (CAC)'),
            React.createElement(Text, { style: styles.metricCardValue }, formatCurrency(financial.unit_economics.cac))
          ),
          React.createElement(
            View,
            { style: styles.metricCard },
            React.createElement(Text, { style: styles.metricCardLabel }, 'Lifetime Value (LTV)'),
            React.createElement(Text, { style: styles.metricCardValue }, formatCurrency(financial.unit_economics.ltv))
          ),
          React.createElement(
            View,
            { style: styles.metricCard },
            React.createElement(Text, { style: styles.metricCardLabel }, 'LTV:CAC Ratio'),
            React.createElement(Text, { style: { ...styles.metricCardValue, color: financial.unit_economics.ltv_cac_ratio >= 3 ? brandedColors.success : financial.unit_economics.ltv_cac_ratio >= 1 ? brandedColors.warning : brandedColors.danger } }, `${formatNumber(financial.unit_economics.ltv_cac_ratio)}x`)
          ),
          React.createElement(
            View,
            { style: styles.metricCard },
            React.createElement(Text, { style: styles.metricCardLabel }, 'CAC Payback'),
            React.createElement(Text, { style: styles.metricCardValue }, financial.unit_economics.cac_payback_months >= 999 ? 'N/A (unprofitable)' : `${formatNumber(financial.unit_economics.cac_payback_months)} months`)
          )
        )
      ),
      React.createElement(
        View,
        { style: styles.pageFooter },
        React.createElement(Text, null, `CONFIDENTIAL | ${displayBrandName} | ${currentDate}`),
        React.createElement(Text, null, ''),
        pageNumFooter()
      )
    ),
    // Market Analysis Page
    React.createElement(
      Page,
      { size: 'A4', style: styles.page },
      React.createElement(
        View,
        { style: styles.pageHeader },
        React.createElement(
          View,
          { style: styles.pageHeaderLeft },
          React.createElement(View, { style: styles.pageHeaderTitleWrap },
            React.createElement(Text, ({ style: styles.pageHeaderTitle, maxLines: 1 } as any), headerIdea)
          ),
          React.createElement(Text, { style: styles.separator }, ' | '),
          React.createElement(View, { style: styles.pageHeaderSectionWrap },
            React.createElement(Text, ({ style: { ...styles.pageHeaderSection, color: brandedColors.primary }, maxLines: 1 } as any), headerSection('Market Analysis'))
          )
        ),
        React.createElement(Text, { style: brandedHeaderLogo }, showQuantisBranding ? 'Quantis' : brandName.substring(0, 15))
      ),
      React.createElement(Text, { style: { ...styles.sectionTitle, borderBottomColor: brandedColors.primary } }, 'Market Size Analysis'),
      React.createElement(
        View,
        { style: { ...styles.disclaimer, marginBottom: 12 } },
        React.createElement(Text, {}, 'AI-modeled estimate — not derived from the deterministic financial engine or a direct market-data benchmark. Treat as a starting hypothesis to validate, not a verified figure.')
      ),
      React.createElement(
        View,
        { style: styles.marketSizeContainer },
        React.createElement(
          View,
          { style: styles.marketSizeItem },
          React.createElement(
            View,
            { style: { ...styles.marketSizeCircle, borderColor: brandedColors.primary } },
            React.createElement(Text, { style: { ...styles.marketSizeLabel, color: brandedColors.primary } }, 'TAM'),
            React.createElement(Text, { style: styles.marketSizeValue }, result.market_analysis.market_size.tam),
            React.createElement(Text, { style: styles.marketSizeDesc }, 'Total Addressable Market')
          )
        ),
        React.createElement(
          View,
          { style: styles.marketSizeItem },
          React.createElement(
            View,
            { style: { ...styles.marketSizeCircle, borderColor: brandedColors.primary } },
            React.createElement(Text, { style: { ...styles.marketSizeLabel, color: brandedColors.primary } }, 'SAM'),
            React.createElement(Text, { style: styles.marketSizeValue }, result.market_analysis.market_size.sam),
            React.createElement(Text, { style: styles.marketSizeDesc }, 'Serviceable Addressable')
          )
        ),
        React.createElement(
          View,
          { style: styles.marketSizeItem },
          React.createElement(
            View,
            { style: { ...styles.marketSizeCircle, borderColor: brandedColors.accent } },
            React.createElement(Text, { style: { ...styles.marketSizeLabel, color: brandedColors.accent } }, 'SOM'),
            React.createElement(Text, { style: styles.marketSizeValue }, result.market_analysis.market_size.som),
            React.createElement(Text, { style: styles.marketSizeDesc }, 'Serviceable Obtainable')
          )
        )
      ),
      React.createElement(Text, { style: { ...styles.sectionTitle, borderBottomColor: brandedColors.primary } }, 'Key Market Trends'),
      React.createElement(
        View,
        { style: { marginBottom: 20 } },
        trends.length > 0
          ? trends.map((trend, i) =>
              React.createElement(
                View,
                { key: i, style: styles.listItem },
                React.createElement(
                  View,
                  { style: { ...styles.listBullet, backgroundColor: brandedColors.primary } },
                  React.createElement(Text, { style: styles.listBulletText }, String(i + 1))
                ),
                React.createElement(Text, { style: styles.listText }, String(trend))
              )
            )
          : React.createElement(Text, { style: styles.emptyText }, 'No trends data available')
      ),
      React.createElement(Text, { style: { ...styles.sectionTitle, borderBottomColor: brandedColors.primary } }, 'Competitive Landscape'),
      React.createElement(Text, { style: styles.paragraph }, result.market_analysis.competition.competitive_landscape),
      React.createElement(
        View,
        { style: { ...styles.highlightBoxSuccess, borderLeftColor: brandedColors.accent } },
        React.createElement(Text, { style: { ...styles.highlightLabelSuccess, color: brandedColors.accent } }, 'Growth Opportunities'),
        React.createElement(Text, { style: styles.highlightText }, result.market_analysis.growth_opportunities)
      ),
      React.createElement(
        View,
        { style: styles.pageFooter },
        React.createElement(Text, null, `CONFIDENTIAL | ${displayBrandName} | ${currentDate}`),
        React.createElement(Text, null, ''),
        pageNumFooter()
      )
    ),
    // Risk Assessment Page
    React.createElement(
      Page,
      { size: 'A4', style: styles.page },
      React.createElement(
        View,
        { style: styles.pageHeader },
        React.createElement(
          View,
          { style: styles.pageHeaderLeft },
          React.createElement(View, { style: styles.pageHeaderTitleWrap },
            React.createElement(Text, ({ style: styles.pageHeaderTitle, maxLines: 1 } as any), headerIdea)
          ),
          React.createElement(Text, { style: styles.separator }, ' | '),
          React.createElement(View, { style: styles.pageHeaderSectionWrap },
            React.createElement(Text, ({ style: { ...styles.pageHeaderSection, color: brandedColors.primary }, maxLines: 1 } as any), headerSection('Risk Assessment'))
          )
        ),
        React.createElement(Text, { style: brandedHeaderLogo }, showQuantisBranding ? 'Quantis' : brandName.substring(0, 15))
      ),
      React.createElement(Text, { style: { ...styles.sectionTitle, borderBottomColor: brandedColors.primary } }, 'Business Risk Matrix'),
      React.createElement(
        View,
        { style: styles.table },
        React.createElement(
          View,
          { style: { ...styles.tableHeader, borderBottomColor: brandedColors.primary } },
          React.createElement(Text, { style: styles.tableHeaderCell }, 'Risk Factor'),
          React.createElement(Text, { style: { ...styles.tableHeaderCell, ...styles.textCenter } }, 'Probability'),
          React.createElement(Text, { style: { ...styles.tableHeaderCell, ...styles.textCenter } }, 'Impact'),
          React.createElement(Text, { style: styles.tableHeaderCell }, 'Mitigation Strategy')
        ),
        risks.length > 0
          ? risks.map((risk, index) => {
              const riskObj = risk as any;
              const riskName = riskObj?.risk || riskObj?.name || 'Unknown Risk';
              const probability = riskObj?.probability || 'medium';
              const impact = riskObj?.impact || 'medium';
              const mitigation = riskObj?.mitigation || riskObj?.description || 'N/A';
              return React.createElement(
                View,
                { key: index, style: styles.tableRow },
                React.createElement(Text, { style: styles.tableCell }, String(riskName)),
                React.createElement(Text, { style: { ...styles.tableCell, ...styles.textCenter, color: getProbColor(probability) } }, String(probability).toUpperCase()),
                React.createElement(Text, { style: { ...styles.tableCell, ...styles.textCenter, color: getProbColor(impact) } }, String(impact).toUpperCase()),
                React.createElement(Text, { style: styles.tableCell }, String(mitigation))
              );
            })
          : React.createElement(
              View,
              { style: styles.tableRow },
              React.createElement(Text, { style: { ...styles.tableCell, flex: 4 } }, 'No risks identified')
            )
      ),
      React.createElement(Text, { style: { ...styles.sectionTitle, borderBottomColor: brandedColors.primary } }, 'Barriers to Entry'),
      React.createElement(Text, { style: styles.paragraph }, result.market_analysis.barriers_to_entry),
      React.createElement(
        View,
        { style: styles.pageFooter },
        React.createElement(Text, null, `CONFIDENTIAL | ${displayBrandName} | ${currentDate}`),
        React.createElement(Text, null, ''),
        pageNumFooter()
      )
    ),
    // Action Plan Page
    React.createElement(
      Page,
      { size: 'A4', style: styles.page },
      React.createElement(
        View,
        { style: styles.pageHeader },
        React.createElement(
          View,
          { style: styles.pageHeaderLeft },
          React.createElement(View, { style: styles.pageHeaderTitleWrap },
            React.createElement(Text, ({ style: styles.pageHeaderTitle, maxLines: 1 } as any), headerIdea)
          ),
          React.createElement(Text, { style: styles.separator }, ' | '),
          React.createElement(View, { style: styles.pageHeaderSectionWrap },
            React.createElement(Text, ({ style: { ...styles.pageHeaderSection, color: brandedColors.primary }, maxLines: 1 } as any), headerSection('Action Plan'))
          )
        ),
        React.createElement(Text, { style: brandedHeaderLogo }, showQuantisBranding ? 'Quantis' : brandName.substring(0, 15))
      ),
      React.createElement(Text, { style: { ...styles.sectionTitle, borderBottomColor: brandedColors.primary } }, 'Launch Timeline'),
      launchSteps.length > 0
        ? launchSteps.map((step, index) => {
            if (typeof step === 'string') {
              return React.createElement(
                View,
                { key: index, style: styles.timelineItem },
                React.createElement(
                  View,
                  { style: { ...styles.timelineNumber, backgroundColor: brandedColors.primary } },
                  React.createElement(Text, { style: styles.timelineNumberText }, String(index + 1))
                ),
                React.createElement(
                  View,
                  { style: { ...styles.timelineContent, borderLeftColor: brandedColors.primary } },
                  React.createElement(Text, { style: styles.timelineTitle }, `Step ${index + 1}`),
                  React.createElement(Text, { style: styles.timelineDesc }, String(step))
                )
              );
            }
            const stepObj = step as any;
            return React.createElement(
              View,
              { key: index, style: styles.timelineItem },
              React.createElement(
                View,
                { style: { ...styles.timelineNumber, backgroundColor: brandedColors.primary } },
                React.createElement(Text, { style: styles.timelineNumberText }, String(stepObj?.step || index + 1))
              ),
              React.createElement(
                View,
                { style: { ...styles.timelineContent, borderLeftColor: brandedColors.primary } },
                React.createElement(Text, { style: styles.timelineTitle }, String(stepObj?.title || `Step ${index + 1}`)),
                React.createElement(Text, { style: styles.timelineDesc }, String(stepObj?.description || '')),
                (stepObj?.duration || stepObj?.cost) && React.createElement(
                  View,
                  { style: styles.timelineMeta },
                  stepObj?.duration && React.createElement(Text, null, `Duration: ${stepObj.duration}`),
                  stepObj?.cost && React.createElement(Text, null, `Cost: ${formatCurrency(stepObj.cost)}`)
                )
              )
            );
          })
        : React.createElement(Text, { style: styles.emptyText }, 'No launch steps defined'),
      React.createElement(Text, { style: { ...styles.sectionTitle, borderBottomColor: brandedColors.primary } }, 'First 90 Days Marketing Plan'),
      React.createElement(Text, { style: styles.paragraph }, result.marketing_plan.first_3_months_plan),
      React.createElement(
        View,
        { style: styles.pageFooter },
        React.createElement(Text, null, `CONFIDENTIAL | ${displayBrandName} | ${currentDate}`),
        React.createElement(Text, null, ''),
        pageNumFooter()
      )
    ),
    // Benchmark Citations Page
    React.createElement(
      Page,
      { size: 'A4', style: styles.page },
      React.createElement(
        View,
        { style: styles.pageHeader },
        React.createElement(
          View,
          { style: styles.pageHeaderLeft },
          React.createElement(View, { style: styles.pageHeaderTitleWrap },
            React.createElement(Text, ({ style: styles.pageHeaderTitle, maxLines: 1 } as any), headerIdea)
          ),
          React.createElement(Text, { style: styles.separator }, ' | '),
          React.createElement(View, { style: styles.pageHeaderSectionWrap },
            React.createElement(Text, ({ style: { ...styles.pageHeaderSection, color: brandedColors.primary }, maxLines: 1 } as any), headerSection('Benchmark Citations'))
          )
        ),
        React.createElement(Text, { style: brandedHeaderLogo }, showQuantisBranding ? 'Quantis' : brandName.substring(0, 15))
      ),
      // GTM-audit item #6 (2026-08-25): this header used to read "Verified
      // Benchmarks · 97,500 benchmarks" -- conflating the TOTAL LIBRARY size
      // (97,500 rows across all 5 benchmark tables, a real but aggregate,
      // library-wide figure) with how many benchmarks were actually matched
      // for THIS report, right above a table whose own "Source · n · date"
      // column already shows the honest per-metric sample size (n=230,
      // n=180, etc.). A reader could easily read the header as "this report
      // was validated against 97,500 data points," which it never was.
      // Also hardcoded '97,500' directly, bypassing canonical-facts.ts's own
      // single-source-of-truth rule ("Never hardcode... import from here") --
      // exactly the drift class that file exists to prevent. Now imports
      // BENCHMARK_COUNT_DISPLAY and states the library size and this
      // report's actual matched count as two separate, clearly labeled facts.
      React.createElement(Text, { style: { ...styles.sectionTitle, borderBottomColor: brandedColors.primary } }, 'Verified Benchmarks'),
      React.createElement(Text, { style: styles.paragraph },
        buildBenchmarkCitationsSummary(benchmarkRows, BENCHMARK_COUNT_DISPLAY)
      ),
      React.createElement(
        View,
        { style: styles.table },
        React.createElement(
          View,
          { style: styles.tableHeader },
          React.createElement(Text, { style: styles.tableHeaderCell }, 'Metric'),
          React.createElement(Text, { style: { ...styles.tableHeaderCell, ...styles.textRight } }, 'Your value'),
          React.createElement(Text, { style: { ...styles.tableHeaderCell, ...styles.textRight } }, 'P25 – P75'),
          React.createElement(Text, { style: { ...styles.tableHeaderCell, ...styles.textRight } }, 'Median'),
          React.createElement(Text, { style: styles.tableHeaderCell }, 'Source · n · date')
        ),
        (benchmarkRows.length > 0 ? benchmarkRows : []).map((r, i) => {
          const fmt = (v?: number) => formatBenchmarkValue(r.metric, v);
          const matched = r.bench.matched;
          const range = matched ? `${fmt(r.bench.p25)} – ${fmt(r.bench.p75)}` : 'Estimated';
          const median = matched ? fmt(r.bench.p50) : '—';
          const src = matched
            ? `${r.bench.source ?? 'AIWMC'} · n=${(r.bench.sampleSize ?? 0).toLocaleString('en-US')} · ${(r.bench.dataDate ?? '').slice(0, 7)}`
            : 'Engine fallback (no direct row)';
          return React.createElement(
            View,
            { key: i, style: styles.tableRow },
            React.createElement(Text, { style: styles.tableCell }, r.label),
            React.createElement(Text, { style: { ...styles.tableCell, ...styles.textRight } }, r.userValue != null ? fmt(r.userValue) : '—'),
            React.createElement(
              Text,
              { style: { ...styles.tableCell, ...styles.textRight, color: matched ? colors.textSecondary : colors.warning } },
              range
            ),
            React.createElement(Text, { style: { ...styles.tableCell, ...styles.textRight } }, median),
            React.createElement(Text, { style: styles.tableCell }, src)
          );
        })
      ),
      React.createElement(
        View,
        { style: styles.pageFooter },
        React.createElement(Text, null, `CONFIDENTIAL | ${displayBrandName} | ${currentDate}`),
        React.createElement(Text, null, ''),
        pageNumFooter()
      )
    ),
    // Appendix Page
    React.createElement(
      Page,
      { size: 'A4', style: styles.page },
      React.createElement(
        View,
        { style: styles.pageHeader },
        React.createElement(
          View,
          { style: styles.pageHeaderLeft },
          React.createElement(View, { style: styles.pageHeaderTitleWrap },
            React.createElement(Text, ({ style: styles.pageHeaderTitle, maxLines: 1 } as any), headerIdea)
          ),
          React.createElement(Text, { style: styles.separator }, ' | '),
          React.createElement(View, { style: styles.pageHeaderSectionWrap },
            React.createElement(Text, ({ style: { ...styles.pageHeaderSection, color: brandedColors.primary }, maxLines: 1 } as any), headerSection('Appendix'))
          )
        ),
        React.createElement(Text, { style: brandedHeaderLogo }, showQuantisBranding ? 'Quantis' : brandName.substring(0, 15))
      ),
      React.createElement(Text, { style: { ...styles.sectionTitle, borderBottomColor: brandedColors.primary } }, 'Data Sources'),
      React.createElement(
        View,
        { style: { marginBottom: 20 } },
        dataSources.length > 0
          ? dataSources.map((source, i) => {
              // Sanitize internal developer references for user-facing display
              const cleanSource = String(source)
                .replace(/Kerry Industry Dataset/gi, 'Proprietary Industry Benchmark Database')
                .replace(/Kerry dataset/gi, 'proprietary industry benchmarks')
                .replace(/\(Kerry\)/gi, '(proprietary)')
                .replace(/upload Kerry dataset for enhanced accuracy/gi, 'proprietary industry benchmark database');
              return React.createElement(
                View,
                { key: i, style: styles.listItem },
                React.createElement(
                  View,
                  { style: { ...styles.listBullet, backgroundColor: brandedColors.primary } },
                  React.createElement(Text, { style: styles.listBulletText }, String(i + 1))
                ),
                React.createElement(Text, { style: styles.listText }, cleanSource)
              );
            })
          : React.createElement(Text, { style: styles.emptyText }, 'No data sources listed')
      ),
      React.createElement(Text, { style: { ...styles.sectionTitle, borderBottomColor: brandedColors.primary } }, 'Analysis Limitations'),
      React.createElement(
        View,
        { style: { marginBottom: 20 } },
        limitations.length > 0
          ? limitations.map((limitation, i) => {
              // Sanitize internal developer messages
              const cleanLimitation = String(limitation)
                .replace(/Using default benchmarks \(upload Kerry dataset for enhanced accuracy\)/gi, 'Analysis uses general industry benchmarks. Selecting your specific industry will improve accuracy.')
                .replace(/No industry-specific benchmarks applied/gi, 'General industry benchmarks applied. Specify your exact business sector for higher precision.')
                .replace(/upload Kerry dataset/gi, 'providing additional financial details')
                .replace(/Kerry dataset/gi, 'proprietary industry database');
              return React.createElement(
                View,
                { key: i, style: styles.listItem },
                React.createElement(
                  View,
                  { style: { ...styles.listBullet, backgroundColor: brandedColors.primary } },
                  React.createElement(Text, { style: styles.listBulletText }, String(i + 1))
                ),
                React.createElement(Text, { style: styles.listText }, cleanLimitation)
              );
            })
          : React.createElement(Text, { style: styles.emptyText }, 'No limitations listed')
      ),
      React.createElement(Text, { style: { ...styles.sectionTitle, borderBottomColor: brandedColors.primary } }, 'Legal Disclaimer'),
      React.createElement(
        View,
        { style: styles.disclaimer },
        React.createElement(
          Text,
          { style: styles.disclaimerText },
          `This analysis is provided for informational purposes only and does not constitute financial, investment, legal, or tax advice. The projections contained herein are based on assumptions and AI-generated estimates that may not reflect actual market conditions. Past performance is not indicative of future results. Users should consult with qualified professionals before making any business decisions. ${showQuantisBranding ? 'AIWMC Quantis and its affiliates assume' : brandName + ' assumes'} no liability for decisions made based on this analysis.`
        )
      ),
      React.createElement(
        View,
        { style: styles.pageFooter },
        React.createElement(Text, null, `CONFIDENTIAL | ${displayBrandName} | ${currentDate}`),
        React.createElement(Text, { style: { fontStyle: 'italic' } }, `${currentYear} ${footerText}. All Rights Reserved.`),
        pageNumFooter()
      )
    )
  );
};

// ============================================
// DECISION MEMO (Stage 4, Reports Consolidation)
// ============================================
// A 3-5 page, client-meeting-ready alternative to the report above. Every
// figure below is read from the SAME sanitized result / financial fields
// createExecutiveReport already reads (prepareSafeResult, financial
// destructuring, deriveDegradedFlags, detectPdfContradictions,
// buildBenchmarkCitationsSummary) plus the SAME dashboard selectors
// DecisionSummary.tsx uses (decision-memo-data.ts) -- no second
// calculation path exists for any number in this document. The Assessment
// section deliberately uses computeVerdict() from lib/verdict.ts (the
// same function that drives the on-screen "Decision" tab), not the
// separate deriveReportVerdict() tone used by the legacy/full report's
// cover banner below -- so the memo's headline is byte-identical to what
// the user already saw on the result page before exporting.
export const createDecisionMemoReport = (
  rawResult: BusinessAnalysisResult,
  branding: BrandingConfig = defaultBranding,
  benchmarkRows: PdfBenchmarkRow[] = [],
  engagementContext?: EngagementMemoContext,
) => {
  const result = prepareSafeResult(rawResult);
  const brandedColors = createColors(branding);
  const { isDegraded, integrityBlocked } = deriveDegradedFlags(rawResult);
  const reconciliationFlags = detectPdfContradictions(result.financial_analysis);
  if (isDegraded) {
    reconciliationFlags.push(
      'AI narrative generation failed for this analysis — figures below remain fully calculated by the deterministic engine.'
    );
  }
  if (integrityBlocked) {
    reconciliationFlags.push('This report failed a critical financial-accounting check and should be reviewed before use.');
  }

  const financial = result.financial_analysis;
  const monthlyProfit = financial.scenarios?.base?.net_profit ?? financial.monthly_profit ?? 0;
  const paybackMonths = financial.returns?.payback_period_months ?? financial.payback_period_months ?? 0;
  const monthlyRevenue = financial.mrr ?? financial.monthly_revenue?.realistic ?? 0;
  const runwayLabel = computeRunwayLabel(financial, monthlyProfit);

  // Reuse the exact dashboard verdict — not a new vocabulary.
  const verdict = computeVerdict(rawResult);
  const verdictToneColor: Record<typeof verdict.tone, string> = {
    pass: brandedColors.success,
    caution: brandedColors.warning,
    fail: brandedColors.danger,
  };
  const verdictColor = verdictToneColor[verdict.tone];

  const criticalAssumptions = selectCriticalAssumptions(rawResult, 5);
  const breaksFirst = selectWhatBreaksFirst(rawResult, 3);
  const nextActions = selectNextActions(rawResult, breaksFirst, 3);
  const risks = result.business_plan.risks || [];
  const pessimistic = financial.scenarios?.pessimistic;

  const generatedDate = new Date(result.metadata.generated_at).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
  const currentDate = new Date().toLocaleDateString('en-US');
  const brandName = branding.companyName || 'AIWMC Quantis';
  const showQuantisBranding = !branding.hideQuantisBranding;
  const displayBrandName = showQuantisBranding ? brandName : brandName.replace('AIWMC Quantis', brandName);
  const footerText = branding.footerText || `${brandName} - ${branding.headerText || 'AI Business Intelligence Platform'}`;
  const brandedHeaderLogo = { ...styles.pageHeaderLogo, color: brandedColors.primary };
  const truncatePdfHeaderText = (value: string, maxChars: number): string => {
    const normalized = String(value || '').replace(/\s+/g, ' ').trim();
    return normalized.length > maxChars ? `${normalized.slice(0, Math.max(0, maxChars - 1))}…` : normalized;
  };
  const headerIdea = truncatePdfHeaderText(result.metadata.idea, 58);
  const headerSection = (value: string) => truncatePdfHeaderText(value, 22);

  const pageHeader = (sectionLabel: string) => React.createElement(
    View,
    { style: styles.pageHeader },
    React.createElement(
      View,
      { style: styles.pageHeaderLeft },
      React.createElement(View, { style: styles.pageHeaderTitleWrap },
        React.createElement(Text, ({ style: styles.pageHeaderTitle, maxLines: 1 } as any), headerIdea)
      ),
      React.createElement(Text, { style: styles.separator }, ' | '),
      React.createElement(View, { style: styles.pageHeaderSectionWrap },
        React.createElement(Text, ({ style: { ...styles.pageHeaderSection, color: brandedColors.primary }, maxLines: 1 } as any), headerSection(sectionLabel))
      )
    ),
    React.createElement(Text, { style: brandedHeaderLogo }, showQuantisBranding ? 'Quantis' : brandName.substring(0, 15))
  );
  const pageFooter = (label: string) => React.createElement(
    View,
    { style: styles.pageFooter },
    React.createElement(Text, null, `CONFIDENTIAL | ${displayBrandName} | ${currentDate}`),
    React.createElement(Text, null, ''),
    label === 'last' ? pageNumFooter() : React.createElement(Text, null, label)
  );

  const sectionHeading = (title: string) =>
    React.createElement(Text, { style: { ...styles.sectionTitle, borderBottomColor: brandedColors.primary } }, title);

  return React.createElement(
    Document,
    null,
    // Page 1 — Decision, Assessment, Financial consequence
    React.createElement(
      Page,
      { size: 'A4', style: styles.page },
      pageHeader('Decision Memo'),
      React.createElement(Text, { style: { fontSize: 9, letterSpacing: 2, color: brandedColors.textMuted, marginBottom: 4, textTransform: 'uppercase' } }, 'DECISION MEMO'),
      React.createElement(Text, { style: { fontSize: 16, fontFamily: 'Helvetica-Bold', color: brandedColors.textPrimary, marginBottom: 6, lineHeight: 1.25 } }, result.metadata.idea),
      React.createElement(Text, { style: { fontSize: 10, color: brandedColors.textSecondary, marginBottom: 4 } }, result.metadata.location),
      engagementContext?.decisionQuestion && React.createElement(Text, { style: { fontSize: 10, color: brandedColors.textSecondary, marginBottom: 4 } }, `Decision under review: ${engagementContext.decisionQuestion}`),
      engagementContext?.preparedFor && React.createElement(Text, { style: { fontSize: 9, color: brandedColors.textMuted, marginBottom: 10 } }, `Prepared for: ${engagementContext.preparedFor}`),

      sectionHeading('Assessment'),
      React.createElement(
        View,
        { style: { ...styles.verdictBanner, borderColor: verdictColor } },
        React.createElement(Text, { style: styles.verdictLabel }, verdict.toneLabel),
        React.createElement(Text, { style: { fontSize: 16, fontFamily: 'Helvetica-Bold', color: verdictColor, textAlign: 'center', lineHeight: 1.3 } }, verdict.headline),
        React.createElement(Text, { style: { fontSize: 10, color: brandedColors.textSecondary, marginTop: 8, textAlign: 'center' } }, verdict.subline)
      ),

      sectionHeading('Financial Consequence'),
      React.createElement(
        View,
        { style: styles.metricsGrid },
        React.createElement(
          View, { style: styles.metricCard },
          React.createElement(Text, { style: styles.metricCardLabel }, 'Monthly Revenue'),
          React.createElement(Text, { style: styles.metricCardValue }, formatCurrency(monthlyRevenue))
        ),
        React.createElement(
          View, { style: styles.metricCard },
          React.createElement(Text, { style: styles.metricCardLabel }, 'Monthly Profit'),
          React.createElement(Text, { style: { ...styles.metricCardValue, color: getProfitColor(monthlyProfit) } }, formatCurrency(monthlyProfit))
        ),
        React.createElement(
          View, { style: styles.metricCard },
          React.createElement(Text, { style: styles.metricCardLabel }, 'Payback Period'),
          React.createElement(Text, { style: styles.metricCardValue }, monthlyProfit <= 0 || paybackMonths >= 999 ? 'N/A (unprofitable)' : paybackMonths < 12 ? `${paybackMonths} months` : `${(paybackMonths / 12).toFixed(1)} years`)
        ),
        React.createElement(
          View, { style: styles.metricCard },
          React.createElement(Text, { style: styles.metricCardLabel }, 'Cash Runway'),
          React.createElement(Text, { style: { ...styles.metricCardValue, fontSize: 11 } }, runwayLabel)
        )
      ),
      reconciliationFlags.length > 0 && React.createElement(
        View,
        { style: { backgroundColor: '#fffbeb', borderWidth: 1, borderColor: '#f59e0b', borderRadius: 6, padding: 10, marginTop: 6 } },
        ...reconciliationFlags.map((flag) =>
          React.createElement(Text, { key: flag, style: { fontSize: 8, color: '#78350f', lineHeight: 1.5, marginBottom: 2 } }, `⚠  ${flag}`)
        )
      ),
      pageFooter('Page 1')
    ),

    // Page 2 — Critical assumptions, Downside case, What changes the answer
    React.createElement(
      Page,
      { size: 'A4', style: styles.page },
      pageHeader('Assumptions & Downside'),
      sectionHeading('Critical Assumptions'),
      criticalAssumptions.length > 0
        ? React.createElement(
            View,
            { style: { marginBottom: 16 } },
            ...criticalAssumptions.map((d, i) =>
              React.createElement(
                View,
                { key: d.id ?? i, style: styles.listItem },
                React.createElement(
                  View, { style: { ...styles.listBullet, backgroundColor: brandedColors.primary } },
                  React.createElement(Text, { style: styles.listBulletText }, String(i + 1))
                ),
                React.createElement(
                  View, { style: { flex: 1 } },
                  React.createElement(Text, { style: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: brandedColors.textPrimary } }, `${d.metric_name}: ${d.current_value} → ${d.target_value}`),
                  React.createElement(Text, { style: styles.listText }, d.why_it_matters || d.explanation)
                )
              )
            )
          )
        : React.createElement(Text, { style: styles.emptyText }, 'Not available for this analysis.'),

      sectionHeading('Downside Case'),
      pessimistic
        ? React.createElement(
            View,
            { style: styles.metricsGrid },
            React.createElement(
              View, { style: styles.metricCard },
              React.createElement(Text, { style: styles.metricCardLabel }, 'Pessimistic Revenue'),
              React.createElement(Text, { style: styles.metricCardValue }, formatCurrency(pessimistic.revenue))
            ),
            React.createElement(
              View, { style: styles.metricCard },
              React.createElement(Text, { style: styles.metricCardLabel }, 'Pessimistic Net Profit'),
              React.createElement(Text, { style: { ...styles.metricCardValue, color: getProfitColor(pessimistic.net_profit) } }, formatCurrency(pessimistic.net_profit))
            ),
            React.createElement(
              View, { style: styles.metricCard },
              React.createElement(Text, { style: styles.metricCardLabel }, 'Pessimistic Net Margin'),
              React.createElement(Text, { style: styles.metricCardValue }, `${formatNumber(pessimistic.net_margin)}%`)
            )
          )
        : React.createElement(Text, { style: styles.emptyText }, 'Pessimistic scenario not modeled for this analysis.'),

      sectionHeading('What Changes the Answer'),
      // Lighter treatment: reuses the same assumption_graph.criticalPath /
      // risk_analysis fallback DecisionSummary.tsx's "What breaks first"
      // renders — no new sensitivity/breakpoint calculation is performed
      // here. If neither exists on this result, this section states that
      // plainly rather than inventing a number.
      breaksFirst
        ? React.createElement(
            View,
            null,
            ...breaksFirst.items.map((item: any, i: number) =>
              React.createElement(
                View, { key: i, style: { marginBottom: 8, flexDirection: 'row' } },
                React.createElement(Text, { style: { fontSize: 9, color: brandedColors.textMuted, marginRight: 6 } }, `${i + 1}.`),
                breaksFirst.source === 'assumption_graph'
                  ? React.createElement(Text, { style: { fontSize: 10, color: brandedColors.textSecondary, flex: 1 } },
                      `${item.assumption} — breaks below ${item.breakingThreshold} (currently ${item.currentValue})`)
                  : React.createElement(Text, { style: { fontSize: 10, color: brandedColors.textSecondary, flex: 1 } },
                      `${item.label} → resulting profit ${formatCurrency(item.resulting_profit)}${item.probability ? ` (${PROBABILITY_LABEL[item.probability] ?? item.probability} probability)` : ''}`)
              )
            )
          )
        : React.createElement(Text, { style: styles.emptyText }, 'Sensitivity data not available for this analysis.'),
      pageFooter('Page 2')
    ),

    // Page 3 — Risks, Recommended validation, Financial summary
    React.createElement(
      Page,
      { size: 'A4', style: styles.page },
      pageHeader('Risks & Next Steps'),
      sectionHeading('Risks'),
      risks.length > 0
        ? React.createElement(
            View,
            { style: { marginBottom: 16 } },
            ...risks.slice(0, 6).map((risk: any, i: number) => {
              const riskName = risk?.risk || risk?.name || 'Unknown Risk';
              const mitigation = risk?.mitigation || risk?.description;
              return React.createElement(
                View,
                { key: i, style: styles.highlightBox },
                React.createElement(Text, { style: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: brandedColors.textPrimary, marginBottom: 4 } }, String(riskName)),
                mitigation && React.createElement(Text, { style: styles.highlightText }, `Mitigation: ${mitigation}`)
              );
            })
          )
        : React.createElement(Text, { style: styles.emptyText }, 'No risks listed for this analysis.'),

      sectionHeading('Recommended Validation / Next Action'),
      nextActions.length > 0
        ? React.createElement(
            View,
            { style: { marginBottom: 16 } },
            ...nextActions.map((action, i) =>
              React.createElement(
                View,
                { key: i, style: styles.listItem },
                React.createElement(
                  View, { style: { ...styles.listBullet, backgroundColor: brandedColors.accent } },
                  React.createElement(Text, { style: styles.listBulletText }, String(i + 1))
                ),
                React.createElement(Text, { style: styles.listText }, action)
              )
            )
          )
        : React.createElement(Text, { style: styles.emptyText }, 'Not available for this analysis.'),

      sectionHeading('Financial Summary'),
      React.createElement(
        View,
        { style: styles.table },
        React.createElement(
          View, { style: styles.tableHeader },
          React.createElement(Text, { style: styles.tableHeaderCell }, 'Metric'),
          React.createElement(Text, { style: { ...styles.tableHeaderCell, ...styles.textRight } }, 'Value')
        ),
        [
          ['Total Investment Required', formatCurrency(financial.startup_investment.total)],
          ['Monthly Revenue (MRR)', formatCurrency(monthlyRevenue)],
          ['Monthly Operating Profit', formatCurrency(monthlyProfit)],
          ['Payback Period', monthlyProfit <= 0 || paybackMonths >= 999 ? 'N/A (unprofitable)' : paybackMonths < 12 ? `${paybackMonths} months` : `${(paybackMonths / 12).toFixed(1)} years`],
          ['Gross Margin (base case)', `${formatNumber(normalizePercent(financial.scenarios?.base?.gross_margin))}%`],
        ].map(([label, value], i) =>
          React.createElement(
            View, { key: i, style: styles.tableRow },
            React.createElement(Text, { style: styles.tableCellBold }, label),
            React.createElement(Text, { style: { ...styles.tableCell, ...styles.textRight } }, value)
          )
        )
      ),

      sectionHeading('Evidence & Methodology'),
      React.createElement(Text, { style: styles.paragraph },
        buildBenchmarkCitationsSummary(benchmarkRows, BENCHMARK_COUNT_DISPLAY)
      ),
      React.createElement(Text, { style: { fontSize: 8, color: brandedColors.textMuted, fontStyle: 'italic', marginTop: 4 } },
        `Analysis date: ${generatedDate}. This memo summarizes the same deterministic engine output as the Full Report — see the Full Report for benchmark-by-benchmark detail, scenario tables, market analysis, and full risk register.`
      ),
      pageFooter('last')
    )
  );
};

// ============================================
// PDF EXPORT HOOK
// ============================================

const PDF_GENERATION_TIMEOUT = 45000; // 45 seconds timeout

// Helper to fetch branding from database
async function fetchBrandingSettings(): Promise<BrandingConfig | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('branding_settings')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error || !data) return null;

    return {
      companyName: data.company_name || 'AIWMC Quantis',
      logoUrl: data.logo_url || undefined,
      primaryColor: data.primary_color || '#3b82f6',
      accentColor: data.accent_color || '#22c55e',
      footerText: data.footer_text || undefined,
      headerText: data.header_text || undefined,
      hideQuantisBranding: data.hide_quantis_branding || false,
    };
  } catch (error) {
    logger.error('Failed to fetch branding settings:', error);
    return null;
  }
}

export function usePdfExport() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [branding, setBranding] = useState<BrandingConfig | null>(null);
  const reportRef = useRef<HTMLDivElement>(null);

  // Fetch branding on mount
  useEffect(() => {
    fetchBrandingSettings().then(setBranding);
  }, []);

  const generatePdf = useCallback(async (result: BusinessAnalysisResult, customBranding?: BrandingConfig, engagementContext?: EngagementMemoContext, variant: PdfVariant = 'memo') => {
    setIsGenerating(true);
    let exportJobId: string | null = null;

    try {
      // Validate result object has minimum required data
      if (!result) {
        throw new Error('VALIDATION_ERROR: No analysis result provided');
      }
      
      if (!result.financial_analysis) {
        throw new Error('VALIDATION_ERROR: Analysis result missing financial data');
      }

      // Use custom branding, or fetched branding, or default
      const activeBranding = customBranding || branding || defaultBranding;

      // Generate filename with branding
      const brandPrefix = activeBranding.hideQuantisBranding && activeBranding.companyName
        ? activeBranding.companyName.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 15)
        : 'Quantis';
      const sanitizedIdea = (result.metadata?.idea || 'Business_Analysis')
        .replace(/[^a-zA-Z0-9]/g, '_')
        .substring(0, 30);
      const date = new Date().toISOString().split('T')[0];
      const reportLabel = variant === 'full' ? 'Executive_Report' : 'Decision_Memo';
      const filename = `${brandPrefix}_${reportLabel}_${sanitizedIdea}_${date}.pdf`;

      // Persist a "My Documents" row so the user has a visible history of
      // this download even before Supabase Storage upload lands (Wave 2 of
      // this feature). Best-effort — never blocks the download itself.
      const analysisIdForJob =
        (result.metadata as { analysis_id?: string; id?: string } | undefined)?.analysis_id ??
        (result.metadata as { analysis_id?: string; id?: string } | undefined)?.id ??
        (result as unknown as { id?: string }).id ??
        null;
      exportJobId = await logExportStart({
        analysisId: analysisIdForJob,
        filename,
        kind: 'pdf_report',
      });

      // Pre-fetch benchmark citations so the PDF can render P25–P75, source, n, date
      const meta: any = result.metadata || {};
      const fin: any = result.financial_analysis || {};
      const benchContext: BenchmarkContext = {
        sector: meta.industry_detected || meta.selected_industry || meta.sector,
        businessModel: meta.business_model,
        country: meta.country,
        cityTier: meta.city_tier,
        stage: meta.company_stage || 'idea',
        size: meta.size_bucket,
      };
      const monthlyRev = typeof fin?.monthly_revenue === 'number'
        ? fin.monthly_revenue
        : (fin?.monthly_revenue?.realistic ?? fin?.mrr ?? 0);
      const netProfit = fin?.scenarios?.base?.net_profit ?? fin?.monthly_profit ?? 0;
      const grossMargin = fin?.scenarios?.base?.gross_margin;
      const ltvCac = fin?.unit_economics?.ltv_cac_ratio;
      // Bug found via Handbook §19 five-analysis audit (2026-07-12): this was
      // reading fin.payback_period_months (INVESTMENT payback) into a
      // variable named cacPayback, then labeling it "CAC Payback" for the
      // benchmark lookup below — the wrong metric under the wrong label.
      // Also had no guard against the 999 sentinel, so an unavailable
      // investment payback rendered as "999 mo · Engine fallback" in the
      // Benchmark Citations PDF page even though the Unit Economics section
      // on the same report correctly showed "N/A (unprofitable)".
      const cacPaybackMonths = fin?.unit_economics?.cac_payback_months;
      const desired: Array<{ label: string; metric: BenchmarkMetric; userValue?: number }> = [
        { label: 'Gross Margin', metric: 'gross_margin', userValue: typeof grossMargin === 'number' ? (grossMargin > 1 ? grossMargin / 100 : grossMargin) : undefined },
        { label: 'Operating Margin', metric: 'operating_margin', userValue: monthlyRev > 0 ? netProfit / monthlyRev : undefined },
        { label: 'LTV : CAC', metric: 'ltv_cac_ratio', userValue: typeof ltvCac === 'number' ? ltvCac : undefined },
        { label: 'CAC Payback', metric: 'cac_payback', userValue: typeof cacPaybackMonths === 'number' && cacPaybackMonths < 999 ? cacPaybackMonths : undefined },
      ];
      // P0-5 (Handbook §19, 2026-07-12 audit): prefer the server's own
      // benchmark match (result.metadata.benchmarks — the same data "Live
      // Benchmark Block" renders) over a fresh client-side RPC lookup, for
      // any metric the server covers. Before this fix, the PDF's "Verified
      // Benchmarks" table always re-queried a separate client-side table
      // with a different row count, independent of the server's own match
      // for the same metric — the exact static-vs-live contradiction found
      // in the July 11 landlord-tenant report.
      const serverBenchmarks = (meta.benchmarks as ServerBenchmarkRecord[] | undefined) ?? [];
      // Fail-soft benchmark lookups — never let a benchmark network error kill PDF generation
      const benchSettled = await Promise.allSettled(
        desired.map((d) => {
          const serverKey = CLIENT_TO_SERVER_METRIC[d.metric] ?? d.metric;
          const serverRec = serverBenchmarks.find((r) => r.metric === serverKey);
          return serverRec
            ? Promise.resolve(serverRecordToResult(serverRec, d.metric))
            : lookupBenchmark(d.metric, benchContext);
        })
      );
      const benchmarkRows: PdfBenchmarkRow[] = desired.map((d, i) => ({
        ...d,
        bench: benchSettled[i].status === 'fulfilled'
          ? (benchSettled[i] as PromiseFulfilledResult<BenchmarkResult>).value
          : ({ status: 'no_match', metric: d.metric } as unknown as BenchmarkResult),
      }));

      // Generate PDF blob using @react-pdf/renderer with timeout.
      // Stage 4 (Reports Consolidation): 'memo' (the new default) produces
      // the short Decision Memo; 'full' produces the existing, unchanged
      // detailed/"appendix" report. Both read the same result object and
      // the same benchmarkRows computed above -- no second data-fetch path.
      const doc = variant === 'full'
        ? createExecutiveReport(result, activeBranding, benchmarkRows, engagementContext)
        : createDecisionMemoReport(result, activeBranding, benchmarkRows, engagementContext);

      const blobPromise = pdf(doc).toBlob();
      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('PDF_TIMEOUT: Generation took too long')), PDF_GENERATION_TIMEOUT)
      );
      
      const blob = await Promise.race([blobPromise, timeoutPromise]);
      
      // Create download link and trigger download
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      void trackActivationEvent('pdf_exported', {
        idea: result.metadata?.idea?.slice(0, 50),
        variant,
      });
      void logExportComplete(exportJobId, 'succeeded');

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('PDF generation failed:', errorMessage, error);
      void logExportComplete(exportJobId, 'failed', errorMessage);
      throw error;
    } finally {
      setIsGenerating(false);
    }
  }, [branding]);

  // Refresh branding settings
  const refreshBranding = useCallback(async () => {
    const newBranding = await fetchBrandingSettings();
    setBranding(newBranding);
  }, []);

  return { generatePdf, isGenerating, reportRef, branding, refreshBranding };
}
