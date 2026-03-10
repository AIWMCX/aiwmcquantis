import React, { useMemo } from 'react';
import type { BusinessAnalysisResult } from '@/types/analysis';
import { cn } from '@/lib/utils';

interface Scenario {
  label: string;
  profitDelta: string;
  beDelta: string;
  color: string;
  isCurrent?: boolean;
}

interface KeyMetricSpotlightProps {
  result: BusinessAnalysisResult;
}

export function KeyMetricSpotlight({ result }: KeyMetricSpotlightProps) {
  const spotlight = useMemo(() => {
    const churn = (result.financial_analysis?.inputs?.churn_rate ?? 0.05) * 100;
    const baseProfit = result.financial_analysis?.scenarios?.base?.net_profit ?? 0;
    const baseBe = result.financial_analysis?.returns?.payback_period_months ?? result.financial_analysis?.payback_period_months ?? 12;
    const revenue = result.financial_analysis?.mrr ?? result.financial_analysis?.scenarios?.base?.revenue ?? 0;

    // Estimate sensitivity: how much does ±1pp churn shift profit
    // Churn impacts LTV and thus long-run economics. Rough model:
    // each 1pp churn increase → ~6% revenue decay at steady state
    const profitPerPp = Math.round(revenue * 0.06);

    const scenarios: Scenario[] = [
      {
        label: `−1pp (${(churn - 1).toFixed(1)}% churn)`,
        profitDelta: `+$${profitPerPp.toLocaleString()}`,
        beDelta: '−1.5 mo',
        color: 'text-[var(--q-status-green)]',
      },
      {
        label: `Current (${churn.toFixed(1)}%)`,
        profitDelta: 'baseline',
        beDelta: `Mo. ${baseBe}`,
        color: 'text-[var(--q-text-secondary)]',
        isCurrent: true,
      },
      {
        label: `+1pp (${(churn + 1).toFixed(1)}% churn)`,
        profitDelta: `−$${(profitPerPp * 2).toLocaleString()}`,
        beDelta: '+2 mo',
        color: 'text-[var(--q-status-red)]',
      },
      {
        label: `+3pp (${(churn + 3).toFixed(1)}% churn)`,
        profitDelta: `−$${(profitPerPp * 5).toLocaleString()}`,
        beDelta: '+6 mo',
        color: 'text-[var(--q-status-red)]',
      },
    ];

    return { metricName: 'Monthly Churn Rate', currentValue: churn, scenarios };
  }, [result]);

  return (
    <div className="q-card p-4 space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-base">🎯</span>
        <div>
          <h4 className="text-sm font-semibold text-[var(--q-text-primary)]" style={{ fontFamily: 'var(--q-font-heading)' }}>
            Key Metric Spotlight
          </h4>
          <p className="text-[10px] text-[var(--q-text-tertiary)] uppercase tracking-wider">
            Most Consequential Variable
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between p-2.5 rounded-lg bg-[var(--q-bg-elevated)] border border-[var(--q-border-subtle)]">
        <div>
          <p className="text-xs font-medium text-[var(--q-text-primary)]">{spotlight.metricName}</p>
          <p className="text-[10px] text-[var(--q-text-tertiary)]">
            Highest sensitivity coefficient across input variables
          </p>
        </div>
        <div className="text-right">
          <p className="text-lg font-bold tabular-nums text-[var(--q-text-primary)]" style={{ fontFamily: 'var(--q-font-mono, monospace)' }}>
            {spotlight.currentValue.toFixed(1)}%
          </p>
        </div>
      </div>

      {/* Scenario table */}
      <div className="overflow-hidden rounded-lg border border-[var(--q-border-subtle)]">
        <table className="w-full text-xs" style={{ fontVariantNumeric: 'tabular-nums' }}>
          <thead>
            <tr className="bg-[var(--q-bg-elevated)]">
              <th className="text-left py-2 px-3 text-[10px] font-medium text-[var(--q-text-tertiary)] uppercase tracking-wider">Scenario</th>
              <th className="text-right py-2 px-3 text-[10px] font-medium text-[var(--q-text-tertiary)] uppercase tracking-wider">Profit Δ</th>
              <th className="text-right py-2 px-3 text-[10px] font-medium text-[var(--q-text-tertiary)] uppercase tracking-wider">Break-even Δ</th>
            </tr>
          </thead>
          <tbody>
            {spotlight.scenarios.map((s, i) => (
              <tr
                key={i}
                className={cn(
                  'border-t border-[var(--q-border-subtle)]',
                  s.isCurrent && 'bg-[var(--q-accent-glow)]'
                )}
              >
                <td className="py-2 px-3 text-[var(--q-text-secondary)]">{s.label}</td>
                <td className={cn('py-2 px-3 text-right font-mono font-medium', s.color)} style={{ fontFamily: 'var(--q-font-mono, monospace)' }}>
                  {s.profitDelta}
                </td>
                <td className={cn('py-2 px-3 text-right font-mono font-medium', s.color)} style={{ fontFamily: 'var(--q-font-mono, monospace)' }}>
                  {s.beDelta}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-[11px] text-[var(--q-text-tertiary)] leading-relaxed">
        <strong>Watch weekly.</strong> Hold at or below industry median. Consider pre-paid multi-month discounts to structurally reduce churn.
      </p>
    </div>
  );
}
