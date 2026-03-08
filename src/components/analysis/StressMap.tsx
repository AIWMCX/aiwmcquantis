import React, { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { BENCHMARK_DATABASE } from '@/lib/benchmark-calibrator';
import type { BusinessAnalysisResult } from '@/types/analysis';

// ─── Types ───

export interface StressMapProps {
  marketScore: number;
  marginScore: number;
  capitalScore: number;
  operationsScore: number;
  overallRiskIndex: number;
  explanations: {
    market: string;
    margin: string;
    capital: string;
    operations: string;
  };
  recommendations: {
    market: string;
    margin: string;
    capital: string;
    operations: string;
  };
  onBlockClick?: (block: 'market' | 'margin' | 'capital' | 'operations') => void;
}

// ─── Scoring Logic ───

function clamp(v: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, v));
}

function linearMap(value: number, inMin: number, inMax: number): number {
  if (inMax === inMin) return 50;
  return clamp(((value - inMin) / (inMax - inMin)) * 100);
}

function getBenchmarkP50(industryType: string, param: string): number {
  const entry = BENCHMARK_DATABASE.find(
    b => b.industryType === industryType && b.parameter === param
  );
  return entry?.p50 ?? 0;
}

export function calculateStressScores(result: BusinessAnalysisResult): StressMapProps {
  const industry = result.metadata?.industry_detected || 'service_business';

  // Margin Score: gross margin vs benchmark p50
  const grossMargin = result.financial_analysis?.scenarios?.base?.gross_margin ?? 0;
  const benchmarkMargin = getBenchmarkP50(industry, 'gross_margin') || 50;
  const marginScore = clamp((grossMargin / benchmarkMargin) * 70 + 15);

  // Capital Score: runway months (< 3 = 0, > 18 = 100)
  const totalInvestment = result.financial_analysis?.startup_investment?.total ?? 0;
  const monthlyExpenses = result.financial_analysis?.monthly_expenses?.total ?? 1;
  const monthlyProfit = result.financial_analysis?.scenarios?.base?.net_profit ?? 0;
  const burnRate = Math.max(monthlyExpenses - (result.financial_analysis?.mrr ?? 0), 1);
  const runwayMonths = monthlyProfit >= 0 ? 24 : totalInvestment / burnRate;
  const capitalScore = linearMap(runwayMonths, 3, 18);

  // Market Score: LTV/CAC ratio (< 1 = 0, > 3 = 100)
  const ltvCacRatio = result.financial_analysis?.unit_economics?.ltv_cac_ratio ?? 0;
  const marketScore = linearMap(ltvCacRatio, 1, 3);

  // Operations Score: burn rate + payroll as % of revenue
  const revenue = result.financial_analysis?.mrr ?? 1;
  const payroll = result.financial_analysis?.monthly_expenses?.breakdown?.salaries ?? 0;
  const payrollPct = (payroll / Math.max(revenue, 1)) * 100;
  const burnRatio = burnRate / Math.max(revenue, 1);
  const opsFromPayroll = payrollPct < 30 ? 80 : payrollPct < 50 ? 60 : payrollPct < 70 ? 40 : 20;
  const opsFromBurn = burnRatio < 0.3 ? 80 : burnRatio < 0.6 ? 60 : burnRatio < 1 ? 40 : 20;
  const operationsScore = clamp((opsFromPayroll * 0.5 + opsFromBurn * 0.5));

  // Overall: weighted average, inverted (high score = low risk → high riskIndex = bad)
  const healthScore = marketScore * 0.30 + marginScore * 0.25 + capitalScore * 0.25 + operationsScore * 0.20;
  const overallRiskIndex = clamp(100 - healthScore);

  // Explanations
  const explanations = {
    market: ltvCacRatio >= 3
      ? `Strong unit economics with ${ltvCacRatio.toFixed(1)}x LTV:CAC`
      : ltvCacRatio >= 1
      ? `LTV:CAC at ${ltvCacRatio.toFixed(1)}x — room for improvement`
      : `LTV:CAC below 1x — acquisition costs exceed lifetime value`,
    margin: grossMargin >= benchmarkMargin
      ? `Margins at ${grossMargin.toFixed(0)}% exceed industry median of ${benchmarkMargin.toFixed(0)}%`
      : `Margins at ${grossMargin.toFixed(0)}% are below industry median of ${benchmarkMargin.toFixed(0)}%`,
    capital: runwayMonths >= 18
      ? `Strong runway of ${Math.round(runwayMonths)}+ months`
      : runwayMonths >= 6
      ? `${Math.round(runwayMonths)} months runway — monitor cash flow`
      : `Only ${Math.round(runwayMonths)} months runway — critical`,
    operations: payrollPct < 40
      ? `Lean operations with ${payrollPct.toFixed(0)}% payroll ratio`
      : `Payroll at ${payrollPct.toFixed(0)}% of revenue — consider optimizing`,
  };

  const recommendations = {
    market: ltvCacRatio < 3
      ? `→ Reduce CAC through organic channels or increase retention`
      : `→ Maintain acquisition efficiency, explore new channels`,
    margin: grossMargin < benchmarkMargin
      ? `→ Renegotiate supplier costs or adjust pricing upward`
      : `→ Protect margins as you scale — avoid discounting`,
    capital: runwayMonths < 12
      ? `→ Secure additional funding or reduce monthly burn`
      : `→ Deploy capital strategically into growth levers`,
    operations: payrollPct > 40
      ? `→ Automate repetitive tasks, consider fractional hires`
      : `→ Invest in key hires to support growth phase`,
  };

  return {
    marketScore: Math.round(marketScore),
    marginScore: Math.round(marginScore),
    capitalScore: Math.round(capitalScore),
    operationsScore: Math.round(operationsScore),
    overallRiskIndex: Math.round(overallRiskIndex),
    explanations,
    recommendations,
  };
}

// ─── Helpers ───

function getRiskTier(index: number) {
  if (index <= 30) return { label: 'Low Risk', colorClass: 'text-emerald-500', strokeClass: 'stroke-emerald-500', bgGradient: 'from-emerald-500/5 to-emerald-500/10' };
  if (index <= 60) return { label: 'Moderate Risk', colorClass: 'text-amber-500', strokeClass: 'stroke-amber-500', bgGradient: 'from-amber-500/5 to-amber-500/10' };
  if (index <= 80) return { label: 'High Risk', colorClass: 'text-orange-500', strokeClass: 'stroke-orange-500', bgGradient: 'from-orange-500/5 to-orange-500/10' };
  return { label: 'Critical Risk', colorClass: 'text-destructive', strokeClass: 'stroke-destructive', bgGradient: 'from-destructive/5 to-destructive/10' };
}

function getBlockColor(score: number) {
  if (score >= 86) return 'bg-emerald-500';
  if (score >= 66) return 'bg-lime-500';
  if (score >= 41) return 'bg-amber-500';
  return 'bg-destructive';
}

function getBlockBorder(score: number) {
  if (score >= 66) return 'border-emerald-500/20';
  if (score >= 41) return 'border-amber-500/20';
  return 'border-destructive/20';
}

const BLOCKS: { key: 'market' | 'margin' | 'capital' | 'operations'; title: string; icon: string }[] = [
  { key: 'market', title: 'Market', icon: '🌍' },
  { key: 'margin', title: 'Margin', icon: '📊' },
  { key: 'capital', title: 'Capital', icon: '💰' },
  { key: 'operations', title: 'Operations', icon: '⚙️' },
];

// ─── Component ───

export function StressMap({
  marketScore,
  marginScore,
  capitalScore,
  operationsScore,
  overallRiskIndex,
  explanations,
  recommendations,
  onBlockClick,
}: StressMapProps) {
  const [animatedOffset, setAnimatedOffset] = useState(283);
  const tier = getRiskTier(overallRiskIndex);

  const circumference = 2 * Math.PI * 45; // ~283
  const targetOffset = circumference - (circumference * overallRiskIndex) / 100;

  useEffect(() => {
    const raf = requestAnimationFrame(() => setAnimatedOffset(targetOffset));
    return () => cancelAnimationFrame(raf);
  }, [targetOffset]);

  const scores: Record<string, number> = { market: marketScore, margin: marginScore, capital: capitalScore, operations: operationsScore };

  return (
    <div className={cn('rounded-xl border border-border bg-gradient-to-br p-5 space-y-5 relative overflow-hidden', tier.bgGradient)}>
      {/* Animated background mesh */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none stress-mesh" />

      {/* Risk Index Gauge */}
      <div className="flex flex-col items-center gap-2">
        <div className="relative w-32 h-32">
          <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
            <circle cx="50" cy="50" r="45" fill="none" strokeWidth="8" className="stroke-muted/30" />
            <circle
              cx="50" cy="50" r="45"
              fill="none"
              strokeWidth="8"
              strokeLinecap="round"
              className={cn('transition-all duration-1000 ease-out', tier.strokeClass)}
              strokeDasharray={circumference}
              strokeDashoffset={animatedOffset}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={cn('text-3xl font-black tabular-nums', tier.colorClass)}>{overallRiskIndex}</span>
            <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Risk</span>
          </div>
        </div>
        <span className={cn('text-sm font-semibold', tier.colorClass)}>{tier.label}</span>
      </div>

      {/* 2×2 Grid */}
      <div className="grid grid-cols-2 gap-3">
        {BLOCKS.map(({ key, title, icon }) => {
          const score = scores[key];
          return (
            <button
              key={key}
              onClick={() => onBlockClick?.(key)}
              className={cn(
                'rounded-lg border bg-card p-3 text-left transition-all hover:shadow-md hover:scale-[1.01] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                getBlockBorder(score)
              )}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-foreground flex items-center gap-1.5">
                  <span>{icon}</span> {title}
                </span>
                <span className={cn('text-lg font-black tabular-nums', score >= 66 ? 'text-emerald-600 dark:text-emerald-400' : score >= 41 ? 'text-amber-600 dark:text-amber-400' : 'text-destructive')}>
                  {score}
                </span>
              </div>
              {/* Progress bar */}
              <div className="h-1.5 w-full rounded-full bg-muted/40 mb-2">
                <div
                  className={cn('h-full rounded-full transition-all duration-700 ease-out', getBlockColor(score))}
                  style={{ width: `${score}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground leading-snug line-clamp-2">{explanations[key]}</p>
              <p className="text-[11px] text-muted-foreground/70 italic mt-1 line-clamp-1">{recommendations[key]}</p>
            </button>
          );
        })}
      </div>

      {/* CSS keyframes for background mesh */}
      <style>{`
        @keyframes stressMesh {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        .stress-mesh {
          background: linear-gradient(135deg, hsl(var(--primary) / 0.3), transparent, hsl(var(--accent) / 0.3));
          background-size: 200% 200%;
          animation: stressMesh 8s ease infinite;
        }
      `}</style>
    </div>
  );
}
