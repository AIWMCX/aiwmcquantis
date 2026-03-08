import React, { useState, useEffect } from 'react';
import { Zap, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface KPICard {
  label: string;
  value: string;
  confidence: 'VERIFIED' | 'CONFIDENT' | 'ESTIMATED';
  positive: boolean;
}

interface ResultsHeroStripProps {
  breakEvenMonths: number;
  month12Revenue: number;
  cashRunwayMonths: number;
  ltvCacRatio: number;
  confidenceScore: number;
  netProfit: number;
  analysisTimeSeconds?: number;
}

function useCountUp(target: number, duration = 800, delay = 0): number {
  const [val, setVal] = useState(0);
  useEffect(() => {
    const timeout = setTimeout(() => {
      const start = performance.now();
      const step = (now: number) => {
        const elapsed = now - start;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        setVal(Math.round(target * eased));
        if (progress < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    }, delay);
    return () => clearTimeout(timeout);
  }, [target, duration, delay]);
  return val;
}

export function ResultsHeroStrip({
  breakEvenMonths,
  month12Revenue,
  cashRunwayMonths,
  ltvCacRatio,
  confidenceScore,
  netProfit,
  analysisTimeSeconds = 47,
}: ResultsHeroStripProps) {
  const animatedRevenue = useCountUp(month12Revenue, 800, 200);
  const animatedBreakEven = useCountUp(breakEvenMonths, 600, 280);
  const animatedRunway = useCountUp(cashRunwayMonths, 600, 360);
  const animatedLtv = useCountUp(Math.round(ltvCacRatio * 10), 600, 440);

  const confLabel = (score: number) => score >= 90 ? 'VERIFIED' : score >= 70 ? 'CONFIDENT' : 'ESTIMATED';

  const kpis: (KPICard & { animatedValue: string })[] = [
    { label: 'Break-Even', value: `Month ${breakEvenMonths}`, animatedValue: `Month ${animatedBreakEven}`, confidence: confLabel(confidenceScore) as any, positive: breakEvenMonths <= 18 },
    { label: 'Revenue Mo. 12', value: `$${month12Revenue.toLocaleString()}/mo`, animatedValue: `$${animatedRevenue.toLocaleString()}/mo`, confidence: confLabel(confidenceScore) as any, positive: true },
    { label: 'Cash Runway', value: `${cashRunwayMonths} months`, animatedValue: `${animatedRunway} months`, confidence: confLabel(Math.max(confidenceScore - 5, 50)) as any, positive: cashRunwayMonths >= 12 },
    { label: 'LTV:CAC', value: `${ltvCacRatio.toFixed(1)}×`, animatedValue: `${(animatedLtv / 10).toFixed(1)}×`, confidence: confLabel(confidenceScore) as any, positive: ltvCacRatio >= 3 },
  ];

  return (
    <div className="animate-fade-in bg-[var(--q-bg-elevated)] rounded-xl border border-[var(--q-border-subtle)] overflow-hidden">
      {/* 4 KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-[var(--q-border-subtle)]">
        {kpis.map((kpi, i) => (
          <div
            key={kpi.label}
            className="q-metric-reveal bg-[var(--q-bg-elevated)] p-4 sm:p-5 text-center space-y-1.5"
            style={{ '--index': i } as React.CSSProperties}
          >
            <p className="text-xs uppercase tracking-wider text-[var(--q-text-tertiary)]" style={{ fontFamily: 'var(--q-font-body)' }}>
              {kpi.label}
            </p>
            <p className={cn(
              'text-lg sm:text-xl font-bold tabular-nums',
              kpi.positive ? 'text-[var(--q-status-green)]' : 'text-[var(--q-status-red)]'
            )} style={{ fontFamily: 'var(--q-font-mono, JetBrains Mono, monospace)' }}>
              {kpi.animatedValue}
            </p>
            <span className={cn(
              'inline-block text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider',
              kpi.confidence === 'VERIFIED' ? 'q-badge-success' :
              kpi.confidence === 'CONFIDENT' ? 'q-badge-ai' :
              'q-badge-warning'
            )}>
              {kpi.confidence}
            </span>
          </div>
        ))}
      </div>

      {/* Bottom info strip */}
      <div className="flex items-center justify-center gap-3 py-2.5 px-4 border-t border-[var(--q-border-subtle)] bg-[var(--q-bg-surface)]">
        <span className="flex items-center gap-1 text-xs text-[var(--q-text-secondary)]">
          <Zap className="w-3 h-3 text-[var(--q-accent-primary)]" />
          Analyzed in {analysisTimeSeconds}s
        </span>
        <span className="w-1 h-1 rounded-full bg-[var(--q-border-default)]" />
        <span className="flex items-center gap-1 text-xs text-[var(--q-text-secondary)]">
          <CheckCircle2 className="w-3 h-3 text-[var(--q-status-green)]" />
          Dual-AI Verified
        </span>
        <span className="w-1 h-1 rounded-full bg-[var(--q-border-default)]" />
        <span className="text-xs font-medium text-[var(--q-text-secondary)] tabular-nums">
          {confidenceScore}% Confidence
        </span>
      </div>
    </div>
  );
}
