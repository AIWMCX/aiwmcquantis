import React, { useMemo } from 'react';
import { BENCHMARK_DATABASE } from '@/lib/benchmark-calibrator';
import type { BusinessAnalysisResult } from '@/types/analysis';
import { cn } from '@/lib/utils';

type QoEVerdict = 'STRUCTURAL' | 'CONDITIONAL' | 'COSMETIC';

interface QoEFlag {
  type: 'structural' | 'concern';
  text: string;
}

interface QoEResult {
  verdict: QoEVerdict;
  flags: QoEFlag[];
  structuralCount: number;
}

function findP50(industry: string, param: string): number {
  return BENCHMARK_DATABASE.find(b => b.industryType === industry && b.parameter === param)?.p50 ?? 0;
}

function classifyQoE(result: BusinessAnalysisResult): QoEResult {
  const industry = result.metadata.industry_detected || 'service_business';
  const gm = result.financial_analysis?.scenarios?.base?.gross_margin ?? 0;
  const ltvCac = result.financial_analysis?.unit_economics?.ltv_cac_ratio ?? 0;
  const be = result.financial_analysis?.returns?.payback_period_months ?? result.financial_analysis?.payback_period_months ?? 99;
  const arpu = result.financial_analysis?.inputs?.price_per_unit ?? 0;
  const churn = (result.financial_analysis?.inputs?.churn_rate ?? 0) * 100;

  const gmP50 = findP50(industry, 'gross_margin');
  const beP50 = findP50(industry, 'break_even_months');
  const arpuP50 = findP50(industry, 'avg_ticket_size');
  const churnP75 = BENCHMARK_DATABASE.find(b => b.industryType === industry && b.parameter === 'churn_rate')?.p75 ?? 15;

  const flags: QoEFlag[] = [];
  let structural = 0;

  if (ltvCac > 10) { structural++; flags.push({ type: 'structural', text: `LTV:CAC ${ltvCac.toFixed(1)}× — durable customer economics` }); }
  if (gm > gmP50) { structural++; flags.push({ type: 'structural', text: `Gross margin ${gm.toFixed(0)}% exceeds industry median ${gmP50}%` }); }
  // be < 999 is an explicit sentinel guard, not incidental: relying on
  // "beP50 will never reach 999" alone is fragile against a misconfigured
  // benchmark row — see payback-sentinel-guard-live-scan.test.ts.
  if (be > 0 && be < 999 && be <= beP50) { structural++; flags.push({ type: 'structural', text: `Break-even Mo.${be} beats industry median Mo.${beP50}` }); }
  if (arpu > arpuP50) { structural++; flags.push({ type: 'structural', text: `ARPU $${arpu.toLocaleString()} beats industry median $${arpuP50}` }); }

  // Concerns
  if (churn > churnP75) flags.push({ type: 'concern', text: `Churn ${churn.toFixed(1)}% exceeds p75 (${churnP75}%) — verify retention system` });
  if (churn === 0) flags.push({ type: 'concern', text: 'Zero churn assumption is unrealistic for any subscription model' });

  const concernCount = flags.filter(f => f.type === 'concern').length;
  const verdict: QoEVerdict = structural >= 3 && concernCount === 0 ? 'STRUCTURAL'
    : structural >= 2 ? 'CONDITIONAL' : 'COSMETIC';

  return { verdict, flags, structuralCount: structural };
}

const VERDICT_CONFIG: Record<QoEVerdict, { color: string; bg: string; border: string; icon: string; label: string; description: string }> = {
  STRUCTURAL: {
    color: 'text-[var(--q-status-green)]',
    bg: 'bg-[var(--q-status-green-bg)]',
    border: 'border-l-[var(--q-status-green)]',
    icon: '✅',
    label: 'Structural',
    description: 'Profitability is driven by genuine unit economics: high LTV:CAC, above-median gross margin, and efficient break-even. These drivers compound over time.',
  },
  CONDITIONAL: {
    color: 'text-[var(--q-status-yellow)]',
    bg: 'bg-[var(--q-status-yellow-bg)]',
    border: 'border-l-[var(--q-status-yellow)]',
    icon: '⚠',
    label: 'Conditional',
    description: 'Profitability has structural elements but depends on assumptions that should be stress-tested. Review flagged metrics before presenting to investors.',
  },
  COSMETIC: {
    color: 'text-[var(--q-status-red)]',
    bg: 'bg-[var(--q-status-red-bg)]',
    border: 'border-l-[var(--q-status-red)]',
    icon: '⚡',
    label: 'Cosmetic',
    description: 'Projected profitability depends on optimistic assumptions that diverge from industry benchmarks. Adjust inputs to industry medians and verify the model still works.',
  },
};

interface QualityOfEarningsProps {
  result: BusinessAnalysisResult;
}

export function QualityOfEarnings({ result }: QualityOfEarningsProps) {
  const qoe = useMemo(() => classifyQoE(result), [result]);
  const cfg = VERDICT_CONFIG[qoe.verdict];

  return (
    <div className={cn('q-card border-l-[3px] p-4 space-y-3', cfg.border)}>
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-[var(--q-text-primary)]" style={{ fontFamily: 'var(--q-font-heading)' }}>
          Quality of Earnings
        </h4>
        <span className={cn(
          'px-2.5 py-1 rounded-full text-[10px] font-bold border flex items-center gap-1',
          cfg.color,
          cfg.bg,
        )}>
          {cfg.icon} {cfg.label.toUpperCase()}
        </span>
      </div>

      <div className="space-y-1.5">
        {qoe.flags.map((flag, i) => (
          <div key={i} className="flex items-start gap-2 text-xs text-[var(--q-text-secondary)] leading-relaxed">
            <span className="shrink-0 mt-0.5">{flag.type === 'structural' ? '✅' : '⚠'}</span>
            <span>{flag.text}</span>
          </div>
        ))}
      </div>

      <p className="text-[11px] text-[var(--q-text-tertiary)] leading-relaxed border-t border-[var(--q-border-subtle)] pt-2">
        {cfg.description}
      </p>
    </div>
  );
}
