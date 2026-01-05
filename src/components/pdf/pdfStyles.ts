import React from 'react';

// Professional Dark Theme Color Palette
const colors = {
  bgPrimary: '#0f172a',      // slate-900
  bgSecondary: '#1e293b',    // slate-800
  bgTertiary: '#334155',     // slate-700
  accent: '#3b82f6',         // blue-500
  accentDark: '#1e3a5f',     // dark blue
  positive: '#22c55e',       // green-500
  negative: '#ef4444',       // red-500
  warning: '#f59e0b',        // amber-500
  textPrimary: '#f1f5f9',    // slate-100
  textSecondary: '#94a3b8',  // slate-400
  textMuted: '#64748b',      // slate-500
  border: '#334155',         // slate-700
  borderLight: '#475569',    // slate-600
};

// Currency and number formatters
export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

export const formatNumber = (value: number): string => {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  }).format(value);
};

// CSS-in-JS styles for PDF
export const pdfStyles: Record<string, React.CSSProperties> = {
  // Page Layout
  page: {
    backgroundColor: colors.bgPrimary,
    color: colors.textPrimary,
    padding: '40px',
    minHeight: '297mm',
    pageBreakAfter: 'always',
    position: 'relative',
  },
  
  // Cover Page
  coverPage: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    minHeight: '297mm',
    padding: '60px 40px',
  },
  
  logoSection: {
    textAlign: 'center' as const,
    marginBottom: '40px',
  },
  
  logoText: {
    fontSize: '48px',
    fontWeight: '800',
    letterSpacing: '8px',
    color: colors.accent,
    marginBottom: '8px',
  },
  
  logoSubtext: {
    fontSize: '14px',
    letterSpacing: '4px',
    color: colors.textSecondary,
    textTransform: 'uppercase' as const,
  },
  
  coverTitleSection: {
    textAlign: 'center' as const,
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
  },
  
  reportType: {
    fontSize: '12px',
    letterSpacing: '6px',
    color: colors.textMuted,
    marginBottom: '24px',
    textTransform: 'uppercase' as const,
  },
  
  coverTitle: {
    fontSize: '36px',
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: '16px',
    lineHeight: 1.2,
  },
  
  coverSubtitle: {
    fontSize: '20px',
    color: colors.textSecondary,
    marginBottom: '24px',
  },
  
  industryBadge: {
    display: 'inline-block',
    padding: '8px 24px',
    backgroundColor: colors.bgSecondary,
    border: `1px solid ${colors.border}`,
    borderRadius: '4px',
    fontSize: '12px',
    letterSpacing: '2px',
    color: colors.accent,
  },
  
  coverMetrics: {
    display: 'flex',
    justifyContent: 'center',
    gap: '40px',
    marginTop: '40px',
  },
  
  coverMetricBox: {
    textAlign: 'center' as const,
    padding: '20px 32px',
    backgroundColor: colors.bgSecondary,
    border: `1px solid ${colors.border}`,
    borderRadius: '8px',
  },
  
  coverMetricLabel: {
    fontSize: '12px',
    color: colors.textSecondary,
    marginBottom: '8px',
    textTransform: 'uppercase' as const,
    letterSpacing: '1px',
  },
  
  coverMetricValue: {
    fontSize: '24px',
    fontWeight: '700',
    color: colors.textPrimary,
  },
  
  coverFooter: {
    textAlign: 'center' as const,
    paddingTop: '40px',
    borderTop: `1px solid ${colors.border}`,
  },
  
  confidentialNotice: {
    fontSize: '11px',
    letterSpacing: '4px',
    color: colors.textMuted,
    marginBottom: '12px',
  },
  
  copyright: {
    fontSize: '10px',
    color: colors.textMuted,
  },
  
  // Page Header & Footer
  pageHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: '16px',
    borderBottom: `1px solid ${colors.border}`,
    marginBottom: '24px',
  },
  
  pageHeaderLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  
  pageHeaderTitle: {
    fontSize: '12px',
    fontWeight: '600',
    color: colors.textSecondary,
  },
  
  pageHeaderSeparator: {
    color: colors.border,
  },
  
  pageHeaderSection: {
    fontSize: '12px',
    color: colors.accent,
    fontWeight: '500',
  },
  
  pageHeaderLogo: {
    fontSize: '14px',
    fontWeight: '700',
    letterSpacing: '2px',
    color: colors.accent,
  },
  
  pageFooter: {
    position: 'absolute' as const,
    bottom: '40px',
    left: '40px',
    right: '40px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: '16px',
    borderTop: `1px solid ${colors.border}`,
    fontSize: '10px',
    color: colors.textMuted,
  },
  
  footerLeft: {},
  footerCenter: {},
  footerRight: {},
  footerCopyright: {
    fontStyle: 'italic' as const,
  },
  
  // Section Styles
  sectionTitle: {
    fontSize: '16px',
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: '24px',
    marginBottom: '16px',
    paddingBottom: '8px',
    borderBottom: `2px solid ${colors.accent}`,
    display: 'inline-block',
  },
  
  paragraph: {
    fontSize: '12px',
    lineHeight: 1.7,
    color: colors.textSecondary,
    marginBottom: '16px',
  },
  
  // Verdict Banner
  verdictBanner: {
    textAlign: 'center' as const,
    padding: '24px',
    backgroundColor: colors.bgSecondary,
    border: '2px solid',
    borderRadius: '8px',
    marginBottom: '24px',
  },
  
  verdictLabel: {
    fontSize: '11px',
    letterSpacing: '3px',
    color: colors.textMuted,
    marginBottom: '8px',
    textTransform: 'uppercase' as const,
  },
  
  verdictText: {
    fontSize: '32px',
    fontWeight: '800',
    letterSpacing: '4px',
  },
  
  // Metrics Grid
  metricsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '16px',
    marginBottom: '24px',
  },
  
  metricCard: {
    backgroundColor: colors.bgSecondary,
    padding: '20px',
    borderRadius: '8px',
    border: `1px solid ${colors.border}`,
  },
  
  metricCardLabel: {
    fontSize: '11px',
    color: colors.textMuted,
    marginBottom: '8px',
    textTransform: 'uppercase' as const,
    letterSpacing: '1px',
  },
  
  metricCardValue: {
    fontSize: '24px',
    fontWeight: '700',
    color: colors.textPrimary,
  },
  
  metricsRow: {
    display: 'flex',
    gap: '24px',
    marginBottom: '24px',
    flexWrap: 'wrap' as const,
  },
  
  metricInline: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  
  metricInlineLabel: {
    fontSize: '12px',
    color: colors.textSecondary,
  },
  
  metricInlineValue: {
    fontSize: '14px',
    fontWeight: '600',
    color: colors.textPrimary,
  },
  
  // Assessment Grid
  assessmentGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    marginBottom: '24px',
  },
  
  assessmentItem: {
    backgroundColor: colors.bgSecondary,
    padding: '16px',
    borderRadius: '8px',
    borderLeft: `4px solid ${colors.accent}`,
  },
  
  assessmentLabel: {
    fontSize: '11px',
    color: colors.accent,
    marginBottom: '8px',
    textTransform: 'uppercase' as const,
    letterSpacing: '1px',
  },
  
  assessmentValue: {
    fontSize: '12px',
    color: colors.textSecondary,
    lineHeight: 1.6,
  },
  
  // Tables
  table: {
    width: '100%',
    borderCollapse: 'collapse' as const,
    marginBottom: '24px',
    fontSize: '11px',
  },
  
  tableHeader: {
    backgroundColor: colors.bgTertiary,
    padding: '12px',
    textAlign: 'left' as const,
    fontWeight: '600',
    color: colors.textPrimary,
    borderBottom: `2px solid ${colors.accent}`,
  },
  
  tableCell: {
    padding: '10px 12px',
    borderBottom: `1px solid ${colors.border}`,
    color: colors.textSecondary,
    verticalAlign: 'top' as const,
  },
  
  // Charts
  chartSection: {
    marginTop: '24px',
    marginBottom: '24px',
  },
  
  chartTitle: {
    fontSize: '13px',
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: '16px',
    textTransform: 'uppercase' as const,
    letterSpacing: '1px',
  },
  
  barChartContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  
  barRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  
  barLabel: {
    width: '100px',
    fontSize: '11px',
    color: colors.textSecondary,
  },
  
  barTrack: {
    flex: 1,
    height: '24px',
    backgroundColor: colors.bgSecondary,
    borderRadius: '4px',
    overflow: 'hidden',
  },
  
  barFill: {
    height: '100%',
    borderRadius: '4px',
    transition: 'width 0.3s ease',
  },
  
  barValue: {
    width: '100px',
    textAlign: 'right' as const,
    fontSize: '12px',
    fontWeight: '600',
  },
  
  // Market Size
  marketSizeContainer: {
    display: 'flex',
    justifyContent: 'space-around',
    marginBottom: '24px',
    gap: '16px',
  },
  
  marketSizeItem: {
    flex: 1,
    textAlign: 'center' as const,
  },
  
  marketSizeCircle: {
    padding: '24px',
    border: `3px solid ${colors.accent}`,
    borderRadius: '50%',
    aspectRatio: '1',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    maxWidth: '150px',
    margin: '0 auto',
  },
  
  marketSizeLabel: {
    fontSize: '14px',
    fontWeight: '700',
    color: colors.accent,
    marginBottom: '4px',
  },
  
  marketSizeValue: {
    fontSize: '11px',
    color: colors.textPrimary,
    fontWeight: '600',
    textAlign: 'center' as const,
  },
  
  marketSizeDesc: {
    fontSize: '9px',
    color: colors.textMuted,
    marginTop: '4px',
    textAlign: 'center' as const,
  },
  
  // Lists
  listContainer: {
    marginBottom: '24px',
  },
  
  listItem: {
    display: 'flex',
    gap: '12px',
    marginBottom: '12px',
    alignItems: 'flex-start',
  },
  
  listBullet: {
    width: '24px',
    height: '24px',
    backgroundColor: colors.accent,
    color: colors.textPrimary,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '11px',
    fontWeight: '600',
    flexShrink: 0,
  },
  
  listText: {
    fontSize: '12px',
    color: colors.textSecondary,
    lineHeight: 1.6,
    paddingTop: '2px',
  },
  
  // Highlight Boxes
  highlightBox: {
    backgroundColor: colors.bgSecondary,
    padding: '16px',
    borderRadius: '8px',
    borderLeft: `4px solid ${colors.accent}`,
  },
  
  highlightLabel: {
    fontSize: '11px',
    color: colors.accent,
    marginBottom: '8px',
    textTransform: 'uppercase' as const,
    letterSpacing: '1px',
    fontWeight: '600',
  },
  
  highlightText: {
    fontSize: '12px',
    color: colors.textSecondary,
    lineHeight: 1.6,
  },
  
  // Risk Summary
  riskSummaryGrid: {
    display: 'flex',
    gap: '16px',
    marginTop: '24px',
  },
  
  riskSummaryCard: {
    flex: 1,
    backgroundColor: colors.bgSecondary,
    padding: '16px',
    borderRadius: '8px',
    border: '2px solid',
    textAlign: 'center' as const,
  },
  
  riskSummaryLabel: {
    fontSize: '10px',
    color: colors.textMuted,
    marginBottom: '8px',
    textTransform: 'uppercase' as const,
  },
  
  riskSummaryValue: {
    fontSize: '28px',
    fontWeight: '700',
  },
  
  // Timeline
  timelineContainer: {
    position: 'relative' as const,
    marginBottom: '24px',
    paddingLeft: '40px',
  },
  
  timelineItem: {
    display: 'flex',
    marginBottom: '20px',
    position: 'relative' as const,
  },
  
  timelineNumber: {
    position: 'absolute' as const,
    left: '-40px',
    width: '32px',
    height: '32px',
    backgroundColor: colors.accent,
    color: colors.textPrimary,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '14px',
    fontWeight: '700',
  },
  
  timelineContent: {
    flex: 1,
    backgroundColor: colors.bgSecondary,
    padding: '16px',
    borderRadius: '8px',
    borderLeft: `3px solid ${colors.accent}`,
  },
  
  timelineTitle: {
    fontSize: '14px',
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: '8px',
  },
  
  timelineDesc: {
    fontSize: '12px',
    color: colors.textSecondary,
    marginBottom: '8px',
    lineHeight: 1.5,
  },
  
  timelineMeta: {
    display: 'flex',
    gap: '24px',
    fontSize: '11px',
    color: colors.textMuted,
  },
  
  // Appendix
  disclaimer: {
    backgroundColor: colors.bgSecondary,
    padding: '16px',
    borderRadius: '8px',
    fontSize: '10px',
    color: colors.textMuted,
    lineHeight: 1.8,
    fontStyle: 'italic' as const,
    border: `1px solid ${colors.border}`,
  },
  
  metadataSection: {
    marginTop: '24px',
    padding: '16px',
    backgroundColor: colors.bgSecondary,
    borderRadius: '8px',
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '12px',
  },
  
  metadataItem: {
    fontSize: '11px',
    color: colors.textSecondary,
  },
  
  metadataLabel: {
    color: colors.textMuted,
    marginRight: '8px',
  },
};
