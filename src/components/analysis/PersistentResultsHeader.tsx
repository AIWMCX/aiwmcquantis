import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { ArrowLeft, Download, Zap, CheckCircle2, Clock, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TrafficLightBadge } from '@/components/ui/TrafficLightBadge';
import { cn } from '@/lib/utils';
import type { BusinessAnalysisResult } from '@/types/analysis';
import { useAuditFreshness } from '@/components/analysis/LastAuditedBadge';

interface PersistentResultsHeaderProps {
  result: BusinessAnalysisResult;
  currentStep: number;
  onStepChange: (step: number) => void;
  onBack?: () => void;
  /** Primary export action — Stage 4 (Reports Consolidation): the 3-5 page Decision Memo, now the default. */
  onExportPDF?: () => void;
  /** Secondary export action — the pre-existing, unchanged detailed/appendix report. */
  onExportFullReport?: () => void;
  onNewAnalysis?: () => void;
  isGeneratingPdf?: boolean;
  analysisTime?: number;
  engineVersion?: string;
  consensusScore?: number;
}

interface KPIChipProps {
  label: string;
  value: string | React.ReactNode;
  color?: 'green' | 'yellow' | 'red' | 'neutral';
  warning?: boolean;
  isFirst?: boolean;
}

function KPIChip({ label, value, color = 'neutral', warning, isFirst }: KPIChipProps) {
  const colorClasses = {
    green: 'text-[var(--q-status-green)]',
    yellow: 'text-[var(--q-status-yellow)]',
    red: 'text-[var(--q-status-red)]',
    neutral: 'text-foreground',
  };

  return (
    <div
      className={cn(
        'flex flex-col items-center gap-0.5 px-3 sm:px-4',
        !isFirst && 'border-l border-border'
      )}
    >
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
        {label}
      </span>
      <div className={cn('text-sm sm:text-base font-semibold flex items-center gap-1', colorClasses[color])}>
        {warning && <span className="text-[var(--q-status-yellow)]">⚠</span>}
        {value}
      </div>
    </div>
  );
}

function useCountUp(target: number, duration = 800): number {
  const [value, setValue] = useState(0);

  useEffect(() => {
    const startTime = Date.now();
    const startValue = value;
    const diff = target - startValue;

    const tick = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(startValue + diff * eased);

      if (progress < 1) {
        requestAnimationFrame(tick);
      }
    };

    requestAnimationFrame(tick);
  }, [target, duration]);

  return value;
}

// Stage 1 dashboard IA compression (2026-09-27): this is the Decision's
// tabbed shell (target: Overview / Model / Scenarios / Risks / Evidence /
// Report). Previously 3 steps ("Verdict & Risk Intelligence" / "Levers Lab" /
// "Red Flags & Action Plan") -- expanded to 6 without rewriting the content
// underneath, just re-slicing it across more tabs (see
// AccuracyTransparentResults.tsx's currentStep switch).
const steps = [
  { id: 1, title: 'Overview' },
  { id: 2, title: 'Model' },
  { id: 3, title: 'Scenarios' },
  { id: 4, title: 'Risks' },
  { id: 5, title: 'Evidence' },
  { id: 6, title: 'Report' },
];

export function PersistentResultsHeader({
  result,
  currentStep,
  onStepChange,
  onBack,
  onExportPDF,
  onExportFullReport,
  onNewAnalysis,
  isGeneratingPdf,
  analysisTime = 2.4,
  engineVersion = '2.0.0',
  consensusScore = 94,
}: PersistentResultsHeaderProps) {
  const { label: auditLabel, loading: auditLoading } = useAuditFreshness();
  const financials = result.financial_analysis;
  const scenarios = financials?.scenarios;
  const baseScenario = scenarios?.base;

  // Calculate metrics - handle both number and object shapes for monthly_revenue
  const month12Profit = useMemo(() => {
    if (baseScenario?.net_profit !== undefined) {
      return baseScenario.net_profit;
    }
    const monthlyRev = financials?.monthly_revenue;
    if (typeof monthlyRev === 'number') {
      return monthlyRev;
    }
    if (monthlyRev && typeof monthlyRev === 'object' && 'realistic' in monthlyRev) {
      return monthlyRev.realistic;
    }
    return 0;
  }, [baseScenario, financials]);

  const breakEvenMonths = useMemo(() => {
    return financials?.payback_period_months ?? 99;
  }, [financials]);

  const cashRunway = useMemo(() => {
    const investment = financials?.startup_investment?.total ?? 0;
    const monthlyProfit = month12Profit;
    if (monthlyProfit >= 0) return 36;
    return Math.max(1, Math.floor(investment / Math.abs(monthlyProfit)));
  }, [financials, month12Profit]);

  const confidenceScore = result.confidence_score || 70;

  // Animated values
  const animatedProfit = useCountUp(month12Profit);
  const animatedBreakEven = useCountUp(breakEvenMonths);
  const animatedRunway = useCountUp(cashRunway);

  // Format profit display
  const formatProfit = useCallback((value: number) => {
    const absValue = Math.abs(value);
    if (absValue >= 1000) {
      return `${value < 0 ? '−' : ''}$${(absValue / 1000).toFixed(1)}k`;
    }
    return `${value < 0 ? '−' : ''}$${Math.round(absValue)}`;
  }, []);

  // Color logic
  const profitColor = month12Profit >= 0 ? 'green' : 'red';
  const breakEvenColor = breakEvenMonths <= 12 ? 'green' : breakEvenMonths <= 18 ? 'yellow' : 'red';
  const runwayColor = cashRunway >= 12 ? 'green' : cashRunway >= 6 ? 'yellow' : 'red';

  return (
    <div
      className="sticky top-0 z-[100] border-b"
      style={{
        backgroundColor: 'hsla(var(--background), 0.97)',
        backdropFilter: 'blur(16px)',
        borderColor: 'hsl(var(--border))',
        boxShadow: '0 4px 32px hsla(0, 0%, 0%, 0.5)',
      }}
    >
      {/* Main Row - 60px */}
      <div className="h-[60px] max-w-7xl mx-auto px-4 sm:px-6 flex items-center gap-3">
        {/* LEFT: Back button + Business info */}
        <div className="flex items-center gap-3 shrink-0">
          {onBack && (
            <>
              <Button
                variant="ghost"
                size="icon"
                onClick={onBack}
                className="w-8 h-8"
                aria-label="Back to form"
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <div className="w-px h-6 bg-border" />
            </>
          )}
          <div className="hidden sm:block">
            <h1 className="text-sm font-semibold text-foreground truncate max-w-[160px]">
              {result.metadata?.idea || 'Business Analysis'}
            </h1>
            <p className="text-[11px] text-muted-foreground truncate max-w-[160px]">
              {result.metadata?.location || 'Location'}
            </p>
          </div>
        </div>

        {/* CENTER: KPI Chips */}
        <div className="flex-1 flex items-center justify-center gap-0 overflow-x-auto scrollbar-hide">
          <KPIChip
            label="Mo.12 Profit"
            value={formatProfit(Math.round(animatedProfit))}
            color={profitColor}
            isFirst
          />
          <KPIChip
            label="Payback"
            value={animatedBreakEven > 24 ? 'Mo. 24+' : `Mo. ${Math.round(animatedBreakEven)}`}
            color={breakEvenColor}
          />
          <KPIChip
            label="Runway"
            value={`${Math.round(animatedRunway)} mo`}
            color={runwayColor}
            warning={cashRunway < 8}
          />
          <KPIChip
            label="Data Confidence"
            value={<TrafficLightBadge confidenceScore={confidenceScore} size="sm" showTooltip={false} />}
          />
        </div>

        {/* RIGHT: Metadata + Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Metadata pill - hidden on small screens */}
          <div className="hidden lg:flex items-center gap-1.5 text-[10px] text-muted-foreground bg-muted/50 px-2.5 py-1 rounded-full">
            <Clock className="w-3 h-3" />
            <span>{analysisTime.toFixed(1)}s</span>
            <span className="opacity-50">·</span>
            <span>v{engineVersion}</span>
            <span className="opacity-50">·</span>
            <span>{consensusScore}% AI</span>
            {!auditLoading && auditLabel && (
              <>
                <span className="opacity-50">·</span>
                <span>Audited {auditLabel}</span>
              </>
            )}
          </div>

          {/* Stage 4 (Reports Consolidation): the Decision Memo (short,
              client-meeting-ready) is now the primary/default export.
              The existing full/detailed report stays one click away as a
              clearly-labeled secondary action -- not removed, not hidden. */}
          <Button
            variant="outline"
            size="sm"
            onClick={onExportPDF}
            disabled={isGeneratingPdf}
            className="gap-1.5 h-8 px-3"
            title="Download the short Decision Memo (3-5 pages)"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Decision Memo</span>
            <span className="sm:hidden">PDF</span>
          </Button>

          {onExportFullReport && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onExportFullReport}
              disabled={isGeneratingPdf}
              className="hidden md:inline-flex gap-1.5 h-8 px-2 text-xs text-muted-foreground"
              title="Download the full detailed report"
            >
              Full Report
            </Button>
          )}

          <Button
            size="sm"
            onClick={onNewAnalysis}
            className="gap-1.5 h-8 px-3 bg-gradient-to-r from-[var(--q-accent-primary)] to-[hsl(var(--q-status-ai-hsl,240_70%_70%))]"
          >
            <Zap className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">New</span>
          </Button>
        </div>
      </div>

      {/* Wizard Tabs Row - 44px */}
      <div className="h-[44px] max-w-4xl mx-auto flex">
        {steps.map((step, idx) => {
          const isActive = currentStep === step.id;
          const isCompleted = currentStep > step.id;

          return (
            <button
              key={step.id}
              onClick={() => onStepChange(step.id)}
              className={cn(
                'flex-1 flex items-center justify-center gap-2 text-sm font-medium transition-all border-b-2',
                isActive
                  ? 'border-[var(--q-accent-primary)] bg-[var(--q-accent-primary)]/5 text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/30'
              )}
            >
              <span
                className={cn(
                  'w-5 h-5 rounded-full flex items-center justify-center text-xs font-semibold',
                  isActive
                    ? 'bg-[var(--q-accent-primary)] text-white'
                    : isCompleted
                    ? 'bg-[var(--q-status-green)]/20 text-[var(--q-status-green)]'
                    : 'bg-muted text-muted-foreground'
                )}
              >
                {isCompleted ? <CheckCircle2 className="w-3.5 h-3.5" /> : step.id}
              </span>
              <span className="hidden sm:inline">{step.title}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
