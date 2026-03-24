import React, { useMemo, useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { SCENARIO_CONFIGS, type ScenarioId } from './ScenarioBar';

interface RevenueChartProps {
  baseRevenue: number;
  margin: number;
  months?: number;
  activeScenario?: ScenarioId;
}

function generateData(baseRevenue: number, multiplier: number, volatility: number, months: number) {
  const data = [];
  for (let m = 1; m <= months; m++) {
    const growth = 1 + (m / months) * 0.5 * multiplier;
    const base = baseRevenue * growth * multiplier;
    const p10 = base * (1 - volatility);
    const p25 = base * (1 - volatility * 0.5);
    const p75 = base * (1 + volatility * 0.5);
    const p90 = base * (1 + volatility);
    data.push({
      month: m,
      base: Math.round(base),
      p10: Math.round(p10),
      p25: Math.round(p25),
      p75: Math.round(p75),
      p90: Math.round(p90),
      // Outer band
      corridor: [Math.round(p10), Math.round(p90)] as [number, number],
      // Inner band (p25-p75) — the "likely" range
      innerBand: [Math.round(p25), Math.round(p75)] as [number, number],
    });
  }
  return data;
}

const formatCurrency = (v: number) => {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}K`;
  return `$${v}`;
};

export function RevenueChart({ baseRevenue, margin, months = 36, activeScenario = 'base' }: RevenueChartProps) {
  const config = SCENARIO_CONFIGS.find(s => s.id === activeScenario) ?? SCENARIO_CONFIGS[0];
  const [prevData, setPrevData] = useState<any[] | null>(null);
  const [showGhost, setShowGhost] = useState(false);

  const data = useMemo(
    () => generateData(baseRevenue, config.multiplier, config.volatility, months),
    [baseRevenue, config.multiplier, config.volatility, months]
  );

  // Ghost line effect on scenario change
  useEffect(() => {
    if (prevData && activeScenario !== 'base') {
      setShowGhost(true);
      const timer = setTimeout(() => setShowGhost(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [activeScenario]);

  useEffect(() => {
    setPrevData(data);
  }, [data]);

  // Merge ghost data if available
  const chartData = useMemo(() => {
    if (!showGhost || !prevData) return data;
    return data.map((d, i) => ({
      ...d,
      ghost: prevData[i]?.base ?? d.base,
    }));
  }, [data, prevData, showGhost]);

  return (
    <div className="h-[280px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
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
            formatter={(value: number, name: string) => {
              if (name === 'corridor' || name === 'innerBand' || name === 'ghost') return [null, null];
              return [formatCurrency(value), 'Baseline'];
            }}
            labelFormatter={(label) => `Month ${label}`}
            contentStyle={{
              background: 'var(--q-bg-surface)',
              border: '1px solid var(--q-border-default)',
              borderRadius: 'var(--q-radius-md)',
              fontSize: 12,
            }}
          />
          {/* Outer band: p10-p90 */}
          <Area
            type="monotone"
            dataKey="corridor"
            fill="var(--q-chart-corridor-fill)"
            stroke="none"
            fillOpacity={1}
            isAnimationActive={true}
            animationDuration={700}
            animationBegin={400}
          />
          {/* Inner band: p25-p75 — the "likely" range */}
          <Area
            type="monotone"
            dataKey="innerBand"
            fill="var(--q-chart-corridor-fill)"
            stroke="none"
            fillOpacity={2}
            isAnimationActive={true}
            animationDuration={700}
            animationBegin={400}
          />
          {/* Ghost line from previous scenario */}
          {showGhost && (
            <Area
              type="monotone"
              dataKey="ghost"
              stroke="var(--q-text-tertiary)"
              strokeWidth={1}
              strokeDasharray="4 4"
              fill="none"
              dot={false}
              isAnimationActive={false}
              opacity={0.4}
            />
          )}
          {/* Baseline */}
          <Area
            type="monotone"
            dataKey="base"
            stroke="var(--q-chart-1)"
            strokeWidth={2}
            fill="none"
            dot={false}
            isAnimationActive={true}
            animationDuration={700}
            animationBegin={400}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
