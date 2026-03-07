import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, ReferenceLine, LabelList } from 'recharts';
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
  const baseProfit = useMemo(() => {
    if (!tornado || tornado.length === 0) return 0;
    const sum = tornado.reduce((acc, v) => acc + (v.profitAtMinus20 + v.profitAtPlus20) / 2, 0);
    return Math.round(sum / tornado.length);
  }, [tornado]);

  const chartData = useMemo(() => {
    if (!tornado || tornado.length === 0) return [];
    return tornado.map(v => {
      const negativeDelta = v.profitAtMinus20 - baseProfit;
      const positiveDelta = v.profitAtPlus20 - baseProfit;
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

  if (!tornado || tornado.length === 0) return null;

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    const item = chartData.find(d => d.name === label);
    if (!item) return null;
    return (
      <div className="rounded-lg border border-border bg-card p-3 shadow-lg">
        <p className="font-semibold text-foreground text-sm mb-1">{label}</p>
        <p className="text-sm text-destructive">At −20%: ${item.low.toLocaleString()}</p>
        <p className="text-sm text-primary">At +20%: ${item.high.toLocaleString()}</p>
        <p className="text-xs text-muted-foreground mt-1">Swing: ${item.range.toLocaleString()}</p>
      </div>
    );
  };

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

      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} layout="vertical" margin={{ left: 100, right: 20, top: 20, bottom: 10 }}>
            <XAxis 
              type="number" 
              tickFormatter={(v) => {
                const abs = Math.abs(v);
                if (abs >= 1000) return `${v < 0 ? '-' : '+'}$${(abs / 1000).toFixed(0)}k`;
                return `${v < 0 ? '-' : '+'}$${abs}`;
              }}
              tick={{ fontSize: 11, fill: 'currentColor' }}
              className="text-muted-foreground"
            />
            <YAxis 
              type="category" 
              dataKey="name" 
              width={90}
              tick={{ fontSize: 12, fill: 'currentColor' }}
              className="text-foreground"
            />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine 
              x={0} 
              stroke="currentColor" 
              strokeDasharray="3 3" 
              className="text-muted-foreground"
              label={{ 
                value: `Base: $${baseProfit.toLocaleString()}`, 
                position: 'top', 
                fill: 'currentColor', 
                fontSize: 11,
                className: 'text-muted-foreground'
              }} 
            />
            <Bar dataKey="negativeDelta" name="At −20%" radius={[4, 0, 0, 4]}>
              {chartData.map((_, index) => (
                <Cell key={index} fill="#ef4444" opacity={0.75} />
              ))}
            </Bar>
            <Bar dataKey="positiveDelta" name="At +20%" radius={[0, 4, 4, 0]}>
              {chartData.map((_, index) => (
                <Cell key={index} fill="#3b82f6" opacity={0.75} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {mostSensitiveVariable && (
        <p className="text-xs text-muted-foreground text-center">
          <span className="font-semibold text-foreground">{mostSensitiveVariable}</span> has the highest impact on profitability. Focus optimization here first.
        </p>
      )}

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
