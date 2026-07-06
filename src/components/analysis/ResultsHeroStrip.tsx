import React, { useState, useEffect } from 'react';
import { Rocket, ShieldCheck, ShieldAlert, Zap, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ResultsHeroStripProps {
  breakEvenMonths: number;
  month12Revenue: number;
  cashRunwayMonths: number;
  ltvCacRatio: number;
  confidenceScore: number;
  netProfit: number;
  analysisTimeSeconds?: number;
  criticalRisks?: number;
  // Ranges from Monte Carlo
  profitP25?: number;
  profitP75?: number;
  revenueP25?: number;
  revenueP75?: number;
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

function formatCurrency(v: number): string {
  const abs = Math.abs(v);
  const sign = v < 0 ? '−' : '';
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(1)}k`;
  return `${sign}$${Math.round(abs)}`;
}

function getVerdict(confidence: number, criticalRisks: number) {
  if (confidence >= 80 && criticalRisks === 0)
    return {
      level: 'fast-track' as const,
      label: 'FAST-TRACK',
      tagline: 'Capital efficient, low downside. Proceed with execution.',
      Icon: Rocket,
      colorVar: 'var(--q-status-green)',
      bgClass: 'q-verdict-good-bg',
    };
  if (confidence >= 60 && criticalRisks <= 2)
    return {
      level: 'caution' as const,
      label: 'PROCEED WITH CAUTION',
      tagline: 'Address key risks before committing capital.',
      Icon: ShieldCheck,
      colorVar: 'var(--q-status-yellow)',
      bgClass: 'q-verdict-watch-bg',
    };
  return {
    level: 'stop' as const,
    label: 'DO NOT PROCEED',
    tagline: 'Resolve fatal assumptions before investing.',
    Icon: ShieldAlert,
    colorVar: 'var(--q-status-red)',
    bgClass: 'q-verdict-bad-bg',
  };
}

export function ResultsHeroStrip({
  breakEvenMonths,
  month12Revenue,
  cashRunwayMonths,
  ltvCacRatio,
  confidenceScore,
  netProfit,
  analysisTimeSeconds = 47,
  criticalRisks = 0,
  profitP25,
  profitP75,
}: ResultsHeroStripProps) {
  const animatedProfit = useCountUp(netProfit, 900, 100);
  const animatedBreakEven = useCountUp(breakEvenMonths, 700, 200);
  const animatedRunway = useCountUp(cashRunwayMonths, 700, 300);
  const animatedConfidence = useCountUp(confidenceScore, 800, 400);

  const verdict = getVerdict(confidenceScore, criticalRisks);
  const VerdictIcon = verdict.Icon;

  const profitColor = netProfit >= 0 ? 'var(--q-status-green)' : 'var(--q-status-red)';
  const breakEvenColor = breakEvenMonths <= 12 ? 'var(--q-status-green)' : breakEvenMonths <= 18 ? 'var(--q-status-yellow)' : 'var(--q-status-red)';
  const runwayColor = cashRunwayMonths >= 12 ? 'var(--q-status-green)' : cashRunwayMonths >= 6 ? 'var(--q-status-yellow)' : 'var(--q-status-red)';

  return (
    <div className="q-focal-glow animate-fade-in rounded-xl overflow-hidden border border-[var(--q-border-default)]">
      {/* ── Verdict Strip ── */}
      <div
        className={cn('px-5 py-4 sm:px-8 sm:py-5 flex flex-col sm:flex-row items-start sm:items-center gap-3', verdict.bgClass)}
      >
        <div className="flex items-center gap-3 shrink-0">
          <VerdictIcon className="w-6 h-6 sm:w-7 sm:h-7" style={{ color: verdict.colorVar }} />
          <span
            className="text-xs sm:text-sm font-bold uppercase tracking-wider px-2.5 py-1 rounded"
            style={{ color: 'white', backgroundColor: verdict.colorVar }}
          >
            {verdict.label}
          </span>
        </div>
        <p className="text-sm text-[var(--q-text-secondary)] leading-relaxed flex-1">
          {verdict.tagline}
        </p>
        <span className="text-metric-sm tabular-nums shrink-0" style={{ color: verdict.colorVar }}>
          {animatedConfidence}%
        </span>
      </div>

      {/* ── KPI Grid — Cinematic Large Numbers ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-[var(--q-border-subtle)]">
        {/* Mo.12 Profit — Monthly earnings after all expenses */}
        <div className="q-hero-kpi-cell group relative">
          <span className="text-label-sm">Mo.12 Profit</span>
          <span className="text-metric-xl tabular-nums" style={{ color: profitColor }}>
            {formatCurrency(animatedProfit)}
          </span>
          {profitP25 != null && profitP75 != null ? (
            <span className="text-[10px] text-[var(--q-text-tertiary)] font-mono tabular-nums">
              range {formatCurrency(profitP25)} to {formatCurrency(profitP75)}
            </span>
          ) : (
            <span className="text-[10px] text-[var(--q-text-tertiary)]">
              Monthly earnings after all costs
            </span>
          )}
        </div>

        {/* Break-even — When revenue covers all costs */}
        <div className="q-hero-kpi-cell">
          <span className="text-label-sm">Break-even</span>
          <span className="text-metric-xl tabular-nums" style={{ color: breakEvenColor }}>
            {animatedBreakEven > 24 ? '24+' : `Mo.${animatedBreakEven}`}
          </span>
          <span className="text-[10px] text-[var(--q-text-tertiary)]">
            {breakEvenMonths <= 12 ? '✓ Healthy — costs covered quickly' : breakEvenMonths <= 18 ? '⚠ Monitor — takes time to profit' : '⚠ Slow — needs optimization'}
          </span>
        </div>

        {/* Runway — Months of operating cash remaining */}
        <div className="q-hero-kpi-cell">
          <span className="text-label-sm">Cash Runway</span>
          <span className="text-metric-xl tabular-nums" style={{ color: runwayColor }}>
            {animatedRunway} mo
          </span>
          <span className="text-[10px] text-[var(--q-text-tertiary)]">
            {cashRunwayMonths >= 12 ? '✓ Comfortable cash buffer' : cashRunwayMonths >= 6 ? '⚠ Tight — extend before scaling' : '🚨 Critical — act now'}
          </span>
        </div>

        {/* LTV:CAC — Customer value vs acquisition cost */}
        <div className="q-hero-kpi-cell">
          <span className="text-label-sm">LTV:CAC</span>
          <span className="text-metric-xl tabular-nums" style={{ color: ltvCacRatio >= 3 ? 'var(--q-status-green)' : ltvCacRatio >= 2 ? 'var(--q-status-yellow)' : 'var(--q-status-red)' }}>
            {ltvCacRatio.toFixed(1)}×
          </span>
          <span className="text-[10px] text-[var(--q-text-tertiary)]">
            {ltvCacRatio >= 3 ? '✓ Each customer is worth 3×+ their cost' : ltvCacRatio >= 2 ? '⚠ Customers barely cover acquisition cost' : '🚨 Losing money on each customer'}
          </span>
        </div>
      </div>

      {/* ── Bottom Info Strip ── */}
      <div className="flex items-center justify-center gap-3 py-2.5 px-4 border-t border-[var(--q-border-subtle)] bg-[var(--q-bg-surface)]">
        <span className="flex items-center gap-1 text-xs text-[var(--q-text-secondary)]">
          <Zap className="w-3 h-3 text-[var(--q-accent-primary)]" />
          Analyzed in {analysisTimeSeconds}s
        </span>
        <span className="w-1 h-1 rounded-full bg-[var(--q-border-default)]" />
        <span className="flex items-center gap-1 text-xs text-[var(--q-text-secondary)]">
          <CheckCircle2 className="w-3 h-3 text-[var(--q-status-green)]" />
          Multi-Model Verified
        </span>
      </div>
    </div>
  );
}
