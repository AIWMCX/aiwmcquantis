import React, { useEffect, useState, useRef } from 'react';
import { cn } from '@/lib/utils';
import { BENCHMARK_DATABASE } from '@/lib/benchmark-calibrator';
import type { BusinessAnalysisResult } from '@/types/analysis';
import { Globe, TrendingUp, Wallet, Settings } from 'lucide-react';

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
    marketScore: Math.round(clamp(marketScore)),
    marginScore: Math.round(clamp(marginScore)),
    capitalScore: Math.round(clamp(capitalScore)),
    operationsScore: Math.round(clamp(operationsScore)),
    overallRiskIndex: Math.round(clamp(overallRiskIndex)),
    explanations,
    recommendations,
  };
}

// ─── 5-Tier Color System ───

interface ScoreStyle {
  text: string;
  bar: string;
  bg: string;
  border: string;
  label: string;
}

function getScoreStyle(score: number): ScoreStyle {
  if (score <= 30) {
    return {
      text: 'text-[var(--q-status-red)]',
      bar: 'bg-[var(--q-status-red)]',
      bg: 'bg-[var(--q-status-red-bg)]',
      border: 'border-l-[var(--q-status-red)]',
      label: 'Critical',
    };
  }
  if (score <= 50) {
    return {
      text: 'text-[var(--q-status-orange)]',
      bar: 'bg-[var(--q-status-orange)]',
      bg: 'bg-[var(--q-status-orange-bg)]',
      border: 'border-l-[var(--q-status-orange)]',
      label: 'At Risk',
    };
  }
  if (score <= 70) {
    return {
      text: 'text-[var(--q-status-yellow)]',
      bar: 'bg-[var(--q-status-yellow)]',
      bg: 'bg-[var(--q-status-yellow-bg)]',
      border: 'border-l-[var(--q-status-yellow)]',
      label: 'Moderate',
    };
  }
  if (score <= 85) {
    return {
      text: 'text-[#6EE7B7]',
      bar: 'bg-[#6EE7B7]',
      bg: 'bg-[rgba(16,185,129,0.06)]',
      border: 'border-l-[#6EE7B7]',
      label: 'Good',
    };
  }
  return {
    text: 'text-[var(--q-status-green)]',
    bar: 'bg-[var(--q-status-green)]',
    bg: 'bg-[var(--q-status-green-bg)]',
    border: 'border-l-[var(--q-status-green)]',
    label: 'Excellent',
  };
}

function getRiskTierLabel(index: number): { label: string; style: ScoreStyle } {
  // For risk index, lower is better (inverted from scores)
  if (index <= 30) return { label: 'Low Risk', style: getScoreStyle(100) };
  if (index <= 50) return { label: 'Moderate', style: getScoreStyle(65) };
  if (index <= 70) return { label: 'Elevated', style: getScoreStyle(45) };
  return { label: 'Critical', style: getScoreStyle(20) };
}

// ─── Animated Counter Hook ───

function useCountUp(target: number, duration: number = 600, delay: number = 0): number {
  const [value, setValue] = useState(0);
  const startTimeRef = useRef<number | null>(null);
  const rafRef = useRef<number>();

  useEffect(() => {
    const timeout = setTimeout(() => {
      const animate = (timestamp: number) => {
        if (startTimeRef.current === null) {
          startTimeRef.current = timestamp;
        }
        const elapsed = timestamp - startTimeRef.current;
        const progress = Math.min(elapsed / duration, 1);
        // Ease-out cubic
        const eased = 1 - Math.pow(1 - progress, 3);
        setValue(Math.round(target * eased));

        if (progress < 1) {
          rafRef.current = requestAnimationFrame(animate);
        }
      };
      rafRef.current = requestAnimationFrame(animate);
    }, delay);

    return () => {
      clearTimeout(timeout);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [target, duration, delay]);

  return value;
}

// ─── Block Config ───

const BLOCKS: { key: 'market' | 'margin' | 'capital' | 'operations'; title: string; Icon: React.ElementType }[] = [
  { key: 'market', title: 'MARKET', Icon: Globe },
  { key: 'margin', title: 'MARGIN', Icon: TrendingUp },
  { key: 'capital', title: 'CAPITAL', Icon: Wallet },
  { key: 'operations', title: 'OPERATIONS', Icon: Settings },
];

// ─── Ring Gauge Component ───

interface RingGaugeProps {
  value: number;
  label: string;
  style: ScoreStyle;
}

function RingGauge({ value, label, style }: RingGaugeProps) {
  const radius = 90;
  const circumference = 2 * Math.PI * radius; // ~565
  const animatedValue = useCountUp(value, 1000, 300);
  const [offset, setOffset] = useState(circumference);

  useEffect(() => {
    const timeout = setTimeout(() => {
      const targetOffset = circumference - (circumference * value) / 100;
      setOffset(targetOffset);
    }, 300);
    return () => clearTimeout(timeout);
  }, [value, circumference]);

  // Get stroke color based on risk level (inverted - lower risk = green)
  const getStrokeColor = () => {
    if (value <= 30) return 'var(--q-status-green)';
    if (value <= 50) return 'var(--q-status-green-light)';
    if (value <= 70) return 'var(--q-status-yellow)';
    if (value <= 85) return 'var(--q-status-orange)';
    return 'var(--q-status-red)';
  };

  return (
    <div className="relative w-48 h-48 mx-auto">
      <svg viewBox="0 0 200 200" className="w-full h-full -rotate-90">
        {/* Background ring */}
        <circle
          cx="100"
          cy="100"
          r={radius}
          fill="none"
          strokeWidth="12"
          className="stroke-[var(--q-bg-overlay)]"
        />
        {/* Animated score ring */}
        <circle
          cx="100"
          cy="100"
          r={radius}
          fill="none"
          strokeWidth="12"
          strokeLinecap="round"
          stroke={getStrokeColor()}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-[stroke-dashoffset] duration-1000 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-metric-lg font-mono text-[var(--q-text-primary)]">
          {animatedValue}
        </span>
        <span className={cn('text-xs font-semibold uppercase tracking-wider mt-1', style.text)}>
          {label}
        </span>
      </div>
    </div>
  );
}

// ─── Block Card Component ───

interface BlockCardProps {
  block: typeof BLOCKS[number];
  score: number;
  explanation: string;
  recommendation: string;
  index: number;
  onClick?: () => void;
}

function BlockCard({ block, score, explanation, recommendation, index, onClick }: BlockCardProps) {
  const style = getScoreStyle(score);
  const animatedScore = useCountUp(score, 600, 300 + index * 200);
  const [barWidth, setBarWidth] = useState(0);
  const Icon = block.Icon;

  useEffect(() => {
    const timeout = setTimeout(() => {
      setBarWidth(score);
    }, 300 + index * 200);
    return () => clearTimeout(timeout);
  }, [score, index]);

  return (
    <button
      onClick={onClick}
      style={{ '--index': index } as React.CSSProperties}
      className={cn(
        'q-card q-stagger relative rounded-[var(--q-radius-lg)] border bg-[var(--q-bg-elevated)] p-4 text-left overflow-hidden',
        'transition-all hover:shadow-lg hover:scale-[1.02]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--q-accent-primary)]',
        'border-l-[3px]',
        style.border
      )}
    >
      {/* Header row */}
      <div className="flex items-center justify-between mb-3">
        <span className="flex items-center gap-2 text-label text-[var(--q-text-secondary)]">
          <Icon className="w-4 h-4" />
          {block.title}
        </span>
        <span className={cn('text-metric-sm font-mono', style.text)}>
          {animatedScore}
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-2 w-full rounded-full bg-[var(--q-bg-overlay)] mb-3 overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all duration-600 ease-out', style.bar)}
          style={{ width: `${barWidth}%` }}
        />
      </div>

      {/* Explanation */}
      <p className="text-xs text-[var(--q-text-secondary)] leading-relaxed line-clamp-2 mb-1.5">
        {explanation}
      </p>

      {/* Recommendation */}
      <p className="text-[11px] text-[var(--q-text-muted)] italic line-clamp-1">
        {recommendation}
      </p>

      {/* Status indicator */}
      <div className={cn('absolute top-2 right-2 w-2 h-2 rounded-full', style.bar)} />
    </button>
  );
}

// ─── Main Component ───

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
  const { label, style } = getRiskTierLabel(overallRiskIndex);
  const scores: Record<string, number> = {
    market: marketScore,
    margin: marginScore,
    capital: capitalScore,
    operations: operationsScore,
  };

  return (
    <div className="q-card rounded-xl border border-[var(--q-border-default)] bg-[var(--q-bg-surface)] p-6 space-y-6 relative overflow-hidden">
      {/* Header */}
      <h3 className="text-h2 text-center text-[var(--q-text-primary)]">
        RISK ASSESSMENT
      </h3>

      {/* Animated background mesh */}
      <div className="absolute inset-0 opacity-[0.02] pointer-events-none stress-mesh" />

      {/* Risk Index Ring Gauge */}
      <div className="q-metric-reveal">
        <RingGauge value={overallRiskIndex} label={label} style={style} />
      </div>

      {/* 2×2 Grid of Block Cards */}
      <div className="grid grid-cols-2 gap-2">
        {BLOCKS.map((block, index) => (
          <BlockCard
            key={block.key}
            block={block}
            score={scores[block.key]}
            explanation={explanations[block.key]}
            recommendation={recommendations[block.key]}
            index={index}
            onClick={() => onBlockClick?.(block.key)}
          />
        ))}
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
