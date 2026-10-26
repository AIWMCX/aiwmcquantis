import React, { useMemo } from 'react';
import { TrendingUp, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { BusinessAnalysisResult } from '@/types/analysis';

interface CashFlowVisualizationProps {
  result: BusinessAnalysisResult;
}

export function CashFlowVisualization({ result }: CashFlowVisualizationProps) {
  const cashFlowData = useMemo(() => {
    const investment = result.financial_analysis?.startup_investment?.total ?? 0;
    const monthlyProfit = result.financial_analysis?.scenarios?.base?.net_profit ?? 0;
    const monthlyRevenue = result.financial_analysis?.mrr ?? 0;
    const monthlyExpenses = result.financial_analysis?.monthly_expenses?.total ?? 0;

    // Build 12-month cash-flow projection
    const months: Array<{
      month: number;
      cashBalance: number;
      revenue: number;
      expenses: number;
      netCashFlow: number;
      isBreakEven: boolean;
    }> = [];

    let cumulativeCash = investment;
    let breakEvenMonth = 0;

    for (let m = 1; m <= 12; m++) {
      // Simple growth model: ~3% monthly growth applied to revenue
      const growthFactor = Math.pow(1.03, m - 1);
      const rev = monthlyRevenue * growthFactor;
      const exp = monthlyExpenses;
      const netCash = rev - exp;
      cumulativeCash += netCash;

      const isBreakEven = netCash >= 0 && !breakEvenMonth;
      if (isBreakEven) breakEvenMonth = m;

      months.push({
        month: m,
        cashBalance: cumulativeCash,
        revenue: rev,
        expenses: exp,
        netCashFlow: netCash,
        isBreakEven,
      });
    }

    // Cash runway (months until cash runs out, if losing money)
    let runwayMonths = 36;
    if (monthlyProfit < 0 && investment > 0) {
      runwayMonths = Math.max(1, Math.floor(investment / Math.abs(monthlyProfit)));
    }

    const minCash = Math.min(...months.map(m => m.cashBalance));
    const maxCash = Math.max(...months.map(m => m.cashBalance));

    return { months, breakEvenMonth, runwayMonths, investment, minCash, maxCash };
  }, [result]);

  const { months, breakEvenMonth, runwayMonths, investment, minCash, maxCash } = cashFlowData;
  const chartHeight = 120;
  const range = maxCash - minCash || 1;

  const getY = (value: number) => {
    return chartHeight - ((value - minCash) / range) * chartHeight;
  };

  const pathD = months
    .map((m, i) => {
      const x = (i / (months.length - 1)) * 100;
      const y = getY(m.cashBalance);
      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
    })
    .join(' ');

  const isHealthy = runwayMonths >= 12;
  const isCaution = runwayMonths >= 6 && runwayMonths < 12;

  return (
    <div className="space-y-4">
      {/* Key metrics strip */}
      <div className="grid grid-cols-3 gap-3">
        <div className="p-3 rounded-lg" style={{ background: 'var(--q-bg-input)', border: '1px solid var(--q-border-subtle)' }}>
          <div className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: 'var(--q-text-disabled)' }}>
            Initial Capital
          </div>
          <div className="text-lg font-bold mt-1" style={{ fontFamily: "'JetBrains Mono', monospace", color: 'var(--q-text-primary)' }}>
            ${investment.toLocaleString('en-US')}
          </div>
        </div>
        <div className="p-3 rounded-lg" style={{ background: 'var(--q-bg-input)', border: '1px solid var(--q-border-subtle)' }}>
          <div className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: 'var(--q-text-disabled)' }}>
            Break-Even
          </div>
          <div className={cn('text-lg font-bold mt-1')} style={{ fontFamily: "'JetBrains Mono', monospace", color: breakEvenMonth > 0 ? 'var(--q-status-green)' : 'var(--q-status-yellow)' }}>
            {breakEvenMonth > 0 ? `Month ${breakEvenMonth}` : '12+ mo'}
          </div>
        </div>
        <div className="p-3 rounded-lg" style={{ background: 'var(--q-bg-input)', border: '1px solid var(--q-border-subtle)' }}>
          <div className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: 'var(--q-text-disabled)' }}>
            Cash Runway
          </div>
          <div className="flex items-center gap-1.5 mt-1">
            {isHealthy ? (
              <CheckCircle2 className="w-4 h-4" style={{ color: 'var(--q-status-green)' }} />
            ) : isCaution ? (
              <AlertTriangle className="w-4 h-4" style={{ color: 'var(--q-status-yellow)' }} />
            ) : (
              <AlertTriangle className="w-4 h-4" style={{ color: 'var(--q-status-red)' }} />
            )}
            <span className="text-lg font-bold" style={{
              fontFamily: "'JetBrains Mono', monospace",
              color: isHealthy ? 'var(--q-status-green)' : isCaution ? 'var(--q-status-yellow)' : 'var(--q-status-red)',
            }}>
              {runwayMonths >= 36 ? '36+' : runwayMonths} mo
            </span>
          </div>
        </div>
      </div>

      {/* Cash balance chart */}
      <div className="p-4 rounded-lg" style={{ background: 'var(--q-bg-input)', border: '1px solid var(--q-border-subtle)' }}>
        <div className="flex items-center justify-between mb-3">
          <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--q-text-tertiary)' }}>
            12-Month Cash Balance Projection
          </span>
          <TrendingUp className="w-4 h-4" style={{ color: 'var(--q-accent-primary)' }} />
        </div>
        <svg viewBox={`0 0 100 ${chartHeight}`} className="w-full" style={{ height: chartHeight }} preserveAspectRatio="none">
          {/* Zero line */}
          {minCash < 0 && maxCash > 0 && (
            <line
              x1={0} y1={getY(0)} x2={100} y2={getY(0)}
              stroke="var(--q-status-red)" strokeWidth={0.3} strokeDasharray="2,2"
            />
          )}
          {/* Area fill */}
          <path
            d={`${pathD} L 100 ${chartHeight} L 0 ${chartHeight} Z`}
            fill="var(--q-accent-primary)" opacity={0.08}
          />
          {/* Line */}
          <path d={pathD} fill="none" stroke="var(--q-accent-primary)" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
          {/* Break-even marker */}
          {breakEvenMonth > 0 && (
            <circle
              cx={((breakEvenMonth - 1) / 11) * 100}
              cy={getY(months[breakEvenMonth - 1]?.cashBalance ?? 0)}
              r={2.5}
              fill="var(--q-status-green)"
            />
          )}
        </svg>
        {/* X-axis labels */}
        <div className="flex justify-between mt-2">
          {[1, 3, 6, 9, 12].map(m => (
            <span key={m} className="text-[9px] font-mono" style={{ color: 'var(--q-text-disabled)' }}>
              M{m}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
