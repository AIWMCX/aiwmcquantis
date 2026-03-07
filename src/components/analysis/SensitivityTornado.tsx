import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from 'recharts';
import { Activity, ArrowDown, ArrowUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface TornadoVariable {
  variable: string;
  baseValue: number;
  profitAtMinus20: number;
  profitAtPlus20: number;
  profitSwing: number;
  sensitivity: number;
  direction: 'positive' | 'negative' | 'mixed';
  recommendation: string;
}

interface SensitivityTornadoProps {
  tornado: TornadoVariable[];
  mostSensitiveVariable: string;
  leastSensitiveVariable: string;
  summary: string;
}

export function SensitivityTornado({ tornado, mostSensitiveVariable, summary }: SensitivityTornadoProps) {
  if (!tornado || tornado.length === 0) return null;

  // Compute base profit as the average midpoint across all variables
  const baseProfit = useMemo(() => {
    const sum = tornado.reduce((acc, v) => acc + (v.profitAtMinus20 + v.profitAtPlus20) / 2, 0);
    return Math.round(sum / tornado.length);
  }, [tornado]);

  // Transform to delta-from-base for proper tornado rendering
  const chartData = useMemo(() => {
    return tornado.map(v => {
      const negativeDelta = v.profitAtMinus20 - baseProfit; // typically negative
      const positiveDelta = v.profitAtPlus20 - baseProfit;  // typically positive
      return {
        name: v.variable,
        negativeDelta,
        positiveDelta,
        low: v.profitAtMinus20,
        high: v.profitAtPlus20,
        range: Math.abs(v.profitAtPlus20 - v.profitAtMinus20),
      };
    });
  }, [tornado, baseProfit]);

  return (
    <div className="section-card space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Activity className="w-5 h-5 text-primary" />
          Sensitivity Analysis
        </h3>
        <Badge variant="outline" className="text-xs">
          ±20% sweep
        </Badge>
      </div>
      
      <p className="text-sm text-muted-foreground">{summary}</p>

      {/* Tornado Chart — deltas from base profit */}
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} layout="vertical" margin={{ left: 100, right: 20, top: 10, bottom: 10 }}>
            <XAxis 
              type="number" 
              tickFormatter={(v) => {
                const abs = Math.abs(v);
                return `${v < 0 ? '-' : '+'}$${(abs / 1000).toFixed(0)}k`;
              }}
              tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
            />
            <YAxis 
              type="category" 
              dataKey="name" 
              width={90}
              tick={{ fontSize: 12, fill: 'hsl(var(--foreground))' }}
            />
            <Tooltip 
              formatter={(value: number, name: string) => {
                const label = name === 'negativeDelta' ? 'At −20%' : 'At +20%';
                const actual = baseProfit + value;
                return [`$${actual.toLocaleString()}`, label];
              }}
              labelStyle={{ color: 'hsl(var(--foreground))' }}
              contentStyle={{ 
                borderRadius: '8px', 
                border: '1px solid hsl(var(--border))',
                background: 'hsl(var(--card))',
                color: 'hsl(var(--foreground))',
              }}
            />
            <ReferenceLine x={0} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" label={{ value: `Base: $${baseProfit.toLocaleString()}`, position: 'top', fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} />
            {/* Negative delta bar (goes left from 0) */}
            <Bar dataKey="negativeDelta" name="negativeDelta" radius={[4, 0, 0, 4]}>
              {chartData.map((_, index) => (
                <Cell key={index} fill="hsl(var(--destructive) / 0.7)" />
              ))}
            </Bar>
            {/* Positive delta bar (goes right from 0) */}
            <Bar dataKey="positiveDelta" name="positiveDelta" radius={[0, 4, 4, 0]}>
              {chartData.map((_, index) => (
                <Cell key={index} fill="hsl(var(--primary) / 0.7)" />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Caption */}
      {mostSensitiveVariable && (
        <p className="text-xs text-muted-foreground text-center">
          <span className="font-semibold text-foreground">{mostSensitiveVariable}</span> has the highest impact on profitability. Focus optimization here first.
        </p>
      )}

      {/* Variable details */}
      <div className="space-y-2">
        {tornado.slice(0, 3).map((v, i) => (
          <div key={v.variable} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-muted-foreground w-5">#{i + 1}</span>
              <div>
                <p className="text-sm font-medium text-foreground">{v.variable}</p>
                <p className="text-xs text-muted-foreground">{v.recommendation}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 text-right">
              <div className="text-xs tabular-nums">
                <span className="text-destructive flex items-center gap-0.5">
                  <ArrowDown className="w-3 h-3" />
                  ${v.profitAtMinus20.toLocaleString()}
                </span>
                <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5">
                  <ArrowUp className="w-3 h-3" />
                  ${v.profitAtPlus20.toLocaleString()}
                </span>
              </div>
              <Badge 
                variant={v.sensitivity >= 0.7 ? 'destructive' : 'outline'}
                className="text-xs tabular-nums"
              >
                {Math.round(v.sensitivity * 100)}%
              </Badge>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
