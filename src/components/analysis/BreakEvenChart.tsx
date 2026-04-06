import React, { useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceDot,
} from 'recharts';

interface BreakEvenChartProps {
  startupInvestment: number;
  monthlyProfit: number;
  months?: number;
}

interface DataPoint {
  month: number;
  optimistic: number;
  realistic: number;
  pessimistic: number;
}

export function BreakEvenChart({ startupInvestment, monthlyProfit, months = 36 }: BreakEvenChartProps) {
  const { data, breakEvenMonth } = useMemo(() => {
    const points: DataPoint[] = [];
    let beMonth: number | null = null;
    const investment = startupInvestment || 50000;
    const profit = monthlyProfit || 3000;

    for (let m = 0; m <= months; m++) {
      const realistic = -investment + profit * m;
      const optimistic = -investment + profit * 1.3 * m;
      const pessimistic = -investment + profit * 0.6 * m;
      points.push({ month: m, optimistic, realistic, pessimistic });
      if (beMonth === null && realistic >= 0) beMonth = m;
    }
    return { data: points, breakEvenMonth: beMonth };
  }, [startupInvestment, monthlyProfit, months]);

  const formatY = (v: number) =>
    v >= 0 ? `$${(v / 1000).toFixed(0)}K` : `-$${(Math.abs(v) / 1000).toFixed(0)}K`;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3
          className="text-sm font-semibold text-[var(--q-text-primary)]"
          style={{ fontFamily: 'var(--q-font-heading)' }}
        >
          Break-Even Timeline
        </h3>
        {breakEvenMonth !== null && (
          <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-[var(--q-status-green)]/10 text-[var(--q-status-green)]">
            Month {breakEvenMonth}: You stop losing money
          </span>
        )}
      </div>

      <ResponsiveContainer width="100%" height={260}>
        <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="gradNeg" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(var(--destructive))" stopOpacity={0.08} />
              <stop offset="100%" stopColor="hsl(var(--destructive))" stopOpacity={0.02} />
            </linearGradient>
            <linearGradient id="gradPos" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--q-status-green)" stopOpacity={0.15} />
              <stop offset="100%" stopColor="var(--q-status-green)" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--q-border-default)" opacity={0.4} />
          <XAxis
            dataKey="month"
            tick={{ fontSize: 11, fill: 'var(--q-text-tertiary)' }}
            tickLine={false}
            axisLine={{ stroke: 'var(--q-border-default)' }}
            label={{ value: 'Months', position: 'insideBottomRight', offset: -5, fontSize: 10, fill: 'var(--q-text-tertiary)' }}
          />
          <YAxis
            tickFormatter={formatY}
            tick={{ fontSize: 11, fill: 'var(--q-text-tertiary)' }}
            tickLine={false}
            axisLine={false}
            width={55}
          />
          <Tooltip
            formatter={(value: number, name: string) => [formatY(value), name.charAt(0).toUpperCase() + name.slice(1)]}
            labelFormatter={(label) => `Month ${label}`}
            contentStyle={{
              background: 'var(--q-bg-surface)',
              border: '1px solid var(--q-border-default)',
              borderRadius: '8px',
              fontSize: '12px',
            }}
          />
          <ReferenceLine y={0} stroke="var(--q-text-tertiary)" strokeDasharray="4 4" strokeWidth={1.5} />

          {/* Pessimistic */}
          <Area
            type="monotone"
            dataKey="pessimistic"
            stroke="hsl(var(--destructive))"
            strokeWidth={1}
            strokeDasharray="4 4"
            fill="none"
            dot={false}
          />
          {/* Optimistic */}
          <Area
            type="monotone"
            dataKey="optimistic"
            stroke="var(--q-status-green)"
            strokeWidth={1}
            strokeDasharray="4 4"
            fill="none"
            dot={false}
          />
          {/* Realistic — primary line */}
          <Area
            type="monotone"
            dataKey="realistic"
            stroke="var(--q-accent-primary)"
            strokeWidth={2.5}
            fill="url(#gradPos)"
            dot={false}
            activeDot={{ r: 4, fill: 'var(--q-accent-primary)' }}
          />

          {/* Break-even dot */}
          {breakEvenMonth !== null && (
            <ReferenceDot
              x={breakEvenMonth}
              y={0}
              r={6}
              fill="var(--q-accent-primary)"
              stroke="var(--q-bg-surface)"
              strokeWidth={2}
            />
          )}
        </AreaChart>
      </ResponsiveContainer>

      <div className="flex items-center justify-center gap-5 text-[11px] text-[var(--q-text-tertiary)]">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-0.5 rounded" style={{ background: 'var(--q-status-green)' }} /> Optimistic
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-0.5 rounded" style={{ background: 'var(--q-accent-primary)' }} /> Realistic
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-0.5 rounded" style={{ background: 'hsl(var(--destructive))' }} /> Pessimistic
        </span>
      </div>
    </div>
  );
}
