import { useCallback, useRef, useState, useEffect } from 'react';
import type { BusinessAnalysisResult } from '@/types/analysis';
import { logger } from '@/lib/logger';
import { trackActivationEvent } from '@/lib/activationTracking';
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
    maxWidth: 380,
    paddingRight: 16,
  },
  pageHeaderTitleWrap: {
    width: 210,
    flexShrink: 0,
  },
  pageHeaderSectionWrap: {
    flexShrink: 0,
  },
  pageHeaderTitle: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: colors.textSecondary,
    lineHeight: 1.2,
  },
  pageHeaderSection: {
    fontSize: 10,
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

const createExecutiveReport = (rawResult: BusinessAnalysisResult, branding: BrandingConfig = defaultBranding) => {
  // Sanitize data to ensure all fields have safe defaults
  const result = prepareSafeResult(rawResult);
  
  // Create branded colors
  const brandedColors = createColors(branding);
  
  const financial = result.financial_analysis;
  const monthlyProfit = financial.scenarios?.base?.net_profit ?? financial.monthly_profit ?? 0;
  const paybackMonths = financial.returns?.payback_period_months ?? financial.payback_period_months ?? 0;
  const monthlyRevenue = financial.mrr ?? financial.monthly_revenue?.realistic ?? 0;

  const getVerdict = () => {
    if (result.confidence_score >= 75 && monthlyProfit > 0 && paybackMonths <= 18) {
      return { text: 'VIABLE', color: brandedColors.success };
    } else if (result.confidence_score >= 50 && monthlyProfit > 0) {
      return { text: 'NEEDS REFINEMENT', color: brandedColors.warning };
    } else {
      return { text: 'HIGH RISK', color: brandedColors.danger };
    }
  };

  const verdict = getVerdict();
  const generatedDate = new Date(result.metadata.generated_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  const currentDate = new Date().toLocaleDateString('en-US');
  const currentYear = new Date().getFullYear();

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
        branding.logoUrl 
          ? React.createElement(Image, { src: branding.logoUrl, style: { width: 180, height: 60, marginBottom: 10, objectFit: 'contain' } })
          : React.createElement(Text, { style: brandedLogoText }, displayBrandName),
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
            React.createElement(Text, { style: styles.coverMetricLabel }, 'Confidence Score'),
            React.createElement(Text, { style: { ...styles.coverMetricValue, color: getScoreColor(result.confidence_score) } }, `${result.confidence_score}%`)
          ),
          React.createElement(
            View,
            { style: styles.coverMetricBox },
            React.createElement(Text, { style: styles.coverMetricLabel }, 'Analysis Date'),
            React.createElement(Text, { style: styles.coverMetricValue }, generatedDate)
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
          React.createElement(Text, { style: styles.pageHeaderTitle }, result.metadata.idea),
          React.createElement(Text, { style: styles.separator }, ' | '),
          React.createElement(Text, { style: { ...styles.pageHeaderSection, color: brandedColors.primary } }, 'Executive Summary')
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
          React.createElement(Text, { style: styles.metricCardLabel }, 'Monthly Net Profit'),
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
        React.createElement(Text, null, 'Page 2 of 10')
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
          React.createElement(Text, { style: styles.pageHeaderTitle }, result.metadata.idea),
          React.createElement(Text, { style: styles.separator }, ' | '),
          React.createElement(Text, { style: { ...styles.pageHeaderSection, color: brandedColors.primary } }, 'Financial Analysis')
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
        React.createElement(Text, null, 'Page 3 of 10')
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
          React.createElement(Text, { style: styles.pageHeaderTitle }, result.metadata.idea),
          React.createElement(Text, { style: styles.separator }, ' | '),
          React.createElement(Text, { style: { ...styles.pageHeaderSection, color: brandedColors.primary } }, 'Scenario Analysis')
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
            React.createElement(Text, { style: styles.tableCell }, 'Net Profit'),
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
            React.createElement(Text, { style: styles.tableCell }, 'Net Margin'),
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
            React.createElement(Text, { style: styles.metricCardValue }, `${formatNumber(financial.unit_economics.cac_payback_months)} months`)
          )
        )
      ),
      React.createElement(
        View,
        { style: styles.pageFooter },
        React.createElement(Text, null, `CONFIDENTIAL | ${displayBrandName} | ${currentDate}`),
        React.createElement(Text, null, ''),
        React.createElement(Text, null, 'Page 4 of 10')
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
          React.createElement(Text, { style: styles.pageHeaderTitle }, result.metadata.idea),
          React.createElement(Text, { style: styles.separator }, ' | '),
          React.createElement(Text, { style: { ...styles.pageHeaderSection, color: brandedColors.primary } }, 'Market Analysis')
        ),
        React.createElement(Text, { style: brandedHeaderLogo }, showQuantisBranding ? 'Quantis' : brandName.substring(0, 15))
      ),
      React.createElement(Text, { style: { ...styles.sectionTitle, borderBottomColor: brandedColors.primary } }, 'Market Size Analysis'),
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
        React.createElement(Text, null, 'Page 5 of 10')
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
          React.createElement(Text, { style: styles.pageHeaderTitle }, result.metadata.idea),
          React.createElement(Text, { style: styles.separator }, ' | '),
          React.createElement(Text, { style: { ...styles.pageHeaderSection, color: brandedColors.primary } }, 'Risk Assessment')
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
        React.createElement(Text, null, 'Page 6 of 10')
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
          React.createElement(Text, { style: styles.pageHeaderTitle }, result.metadata.idea),
          React.createElement(Text, { style: styles.separator }, ' | '),
          React.createElement(Text, { style: { ...styles.pageHeaderSection, color: brandedColors.primary } }, 'Action Plan')
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
        React.createElement(Text, null, 'Page 7 of 10')
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
          React.createElement(Text, { style: styles.pageHeaderTitle }, result.metadata.idea),
          React.createElement(Text, { style: styles.separator }, ' | '),
          React.createElement(Text, { style: { ...styles.pageHeaderSection, color: brandedColors.primary } }, 'Appendix')
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
        React.createElement(Text, null, 'Page 10 of 10')
      )
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

  const generatePdf = useCallback(async (result: BusinessAnalysisResult, customBranding?: BrandingConfig) => {
    setIsGenerating(true);
    
    try {
      // Validate result object has minimum required data
      if (!result) {
        throw new Error('VALIDATION_ERROR: No analysis result provided');
      }
      
      if (!result.metadata) {
        throw new Error('VALIDATION_ERROR: Analysis result missing metadata');
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
      const filename = `${brandPrefix}_Executive_Report_${sanitizedIdea}_${date}.pdf`;

      // Generate PDF blob using @react-pdf/renderer with timeout
      const doc = createExecutiveReport(result, activeBranding);
      
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
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('PDF generation failed:', errorMessage, error);
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
