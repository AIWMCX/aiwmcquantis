import React, { useState, useEffect } from 'react';
import { Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatPaybackDisplay } from '@/lib/formatPayback';

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
    { label: 'Month 12', value: `$${month12Revenue.toLocaleString()}/mo`, animatedValue: `$${animatedRevenue.toLocaleString()}/mo`, confidence: confLabel(confidenceScore) as any, positive: true },
    { label: 'Cash Runway', value: `${cashRunwayMonths} months`, animatedValue: `${animatedRunway} months`, confidence: confLabel(Math.max(confidenceScore - 5, 50)) as any, positive: cashRunwayMonths >= 12 },
    { label: 'LTV:CAC', value: `${ltvCacRatio.toFixed(1)}×`, animatedValue: `${(animatedLtv / 10).toFixed(1)}×`, confidence: confLabel(confidenceScore) as any, positive: ltvCacRatio >= 3 },
  ];

  return (
    <div className="q-results-hero-strip animate-fade-in rounded-xl border border-[var(--q-border-subtle)] bg-[var(--q-bg-surface)] p-5 sm:p-6 space-y-5">
      {/* Headline */}
      <div className="space-y-1">
        <h2 className="text-lg sm:text-xl font-bold text-[var(--q-text-primary)]" style={{ fontFamily: 'var(--q-font-heading)' }}>
          Business validated in {analysisTimeSeconds} seconds
        </h2>
        <p className="text-sm text-[var(--q-text-tertiary)] flex items-center gap-1.5">
          <Zap className="w-3.5 h-3.5 text-[var(--q-accent-primary)]" />
          Dual-AI Consensus · GPT-4o mini + Gemini · {confidenceScore}% Agreement
        </p>
      </div>

      {/* 4 KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {kpis.map((kpi, i) => (
          <div
            key={kpi.label}
            className="q-metric-reveal p-3 sm:p-4 rounded-xl bg-[var(--q-bg-elevated)] border border-[var(--q-border-default)] text-center space-y-1"
            style={{ animationDelay: `${200 + i * 80}ms` }}
          >
            <p className="text-label-sm uppercase tracking-wide">{kpi.label}</p>
            <p className={cn(
              'text-metric-md',
              kpi.positive ? 'text-[var(--q-status-green)]' : 'text-[var(--q-status-red)]'
            )}>
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
    </div>
  );
}
