import React, { useState, useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { cn } from '@/lib/utils';

type ScenarioTab = 'base' | 'recession' | 'rent_2x' | 'best_case';

interface RevenueChartProps {
  baseRevenue: number;
  margin: number;
  months?: number;
}

const SCENARIO_CONFIGS: { id: ScenarioTab; label: string; multiplier: number; volatility: number }[] = [
  { id: 'base', label: 'Base', multiplier: 1, volatility: 0.15 },
  { id: 'recession', label: 'Recession', multiplier: 0.7, volatility: 0.25 },
  { id: 'rent_2x', label: 'Rent ×2', multiplier: 0.85, volatility: 0.18 },
  { id: 'best_case', label: 'Best Case', multiplier: 1.4, volatility: 0.12 },
];

function generateData(baseRevenue: number, multiplier: number, volatility: number, months: number) {
  const data = [];
  for (let m = 1; m <= months; m++) {
    const growth = 1 + (m / months) * 0.5 * multiplier;
    const base = baseRevenue * growth * multiplier;
    const p10 = base * (1 - volatility);
    const p90 = base * (1 + volatility);
    data.push({
      month: m,
      base: Math.round(base),
      p10: Math.round(p10),
      p90: Math.round(p90),
      corridor: [Math.round(p10), Math.round(p90)] as [number, number],
    });
  }
  return data;
}

const formatCurrency = (v: number) => {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}K`;
  return `$${v}`;
};

export function RevenueChart({ baseRevenue, margin, months = 36 }: RevenueChartProps) {
  const [activeTab, setActiveTab] = useState<ScenarioTab>('base');

  const config = SCENARIO_CONFIGS.find(s => s.id === activeTab)!;
  const data = useMemo(
    () => generateData(baseRevenue, config.multiplier, config.volatility, months),
    [baseRevenue, config.multiplier, config.volatility, months]
  );

  return (
    <div className="space-y-3">
      {/* Scenario tabs */}
      <div className="flex gap-1">
        {SCENARIO_CONFIGS.map(s => (
          <button
            key={s.id}
            onClick={() => setActiveTab(s.id)}
            className={cn(
              'px-3 py-1.5 rounded-[var(--q-radius-md)] text-xs font-medium transition-all duration-[var(--q-duration-fast)]',
              activeTab === s.id
                ? 'bg-[var(--q-accent-glow)] text-[var(--q-accent-primary)] border border-[var(--q-accent-primary)]/30'
                : 'text-[var(--q-text-tertiary)] hover:text-[var(--q-text-secondary)] hover:bg-[var(--q-bg-elevated)]'
            )}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Chart */}
      <div className="h-[280px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--q-border-subtle)" />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 11, fill: 'var(--q-text-tertiary)' }}
              tickLine={false}
              axisLine={{ stroke: 'var(--q-border-subtle)' }}
              label={{ value: 'Month', position: 'insideBottomRight', offset: -5, fontSize: 10, fill: 'var(--q-text-tertiary)' }}
            />
            <YAxis
              tickFormatter={formatCurrency}
              tick={{ fontSize: 11, fill: 'var(--q-text-tertiary)' }}
              tickLine={false}
              axisLine={false}
              width={55}
            />
            <Tooltip
              formatter={(value: number) => [formatCurrency(value), '']}
              labelFormatter={(label) => `Month ${label}`}
              contentStyle={{
                background: 'var(--q-bg-surface)',
                border: '1px solid var(--q-border-default)',
                borderRadius: 'var(--q-radius-md)',
                fontSize: 12,
              }}
            />
            {/* Confidence corridor */}
            <Area
              type="monotone"
              dataKey="corridor"
              fill="var(--q-chart-corridor-fill)"
              stroke="none"
              fillOpacity={1}
              isAnimationActive={true}
              animationDuration={700}
              animationBegin={700}
            />
            {/* Base line */}
            <Area
              type="monotone"
              dataKey="base"
              stroke="var(--q-chart-1)"
              strokeWidth={2}
              fill="none"
              dot={false}
              isAnimationActive={true}
              animationDuration={700}
              animationBegin={700}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
