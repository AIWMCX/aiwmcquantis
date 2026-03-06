import React from 'react';
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

  // Prepare data for tornado chart
  const chartData = tornado.map(v => ({
    name: v.variable,
    low: v.profitAtMinus20,
    high: v.profitAtPlus20,
    range: v.profitAtPlus20 - v.profitAtMinus20,
    sensitivity: v.sensitivity,
    direction: v.direction,
    recommendation: v.recommendation,
  }));

  // Base profit (midpoint of most sensitive variable)
  const baseProfit = tornado[0] ? Math.round((tornado[0].profitAtMinus20 + tornado[0].profitAtPlus20) / 2) : 0;

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

      {/* Tornado Chart */}
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} layout="vertical" margin={{ left: 100, right: 20, top: 10, bottom: 10 }}>
            <XAxis 
              type="number" 
              tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
              domain={['dataMin - 1000', 'dataMax + 1000']}
              tick={{ fontSize: 11 }}
            />
            <YAxis 
              type="category" 
              dataKey="name" 
              width={90}
              tick={{ fontSize: 12 }}
            />
            <Tooltip 
              formatter={(value: number, name: string) => [
                `$${value.toLocaleString()}`,
                name === 'low' ? '-20%' : '+20%'
              ]}
              contentStyle={{ 
                borderRadius: '8px', 
                border: '1px solid hsl(var(--border))',
                background: 'hsl(var(--background))',
                color: 'hsl(var(--foreground))',
              }}
            />
            <ReferenceLine x={baseProfit} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" />
            <Bar dataKey="low" stackId="range" name="-20%" radius={4}>
              {chartData.map((entry, index) => (
                <Cell key={index} fill="hsl(var(--destructive) / 0.6)" />
              ))}
            </Bar>
            <Bar dataKey="high" stackId="range" name="+20%" radius={4}>
              {chartData.map((entry, index) => (
                <Cell key={index} fill="hsl(var(--primary) / 0.6)" />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

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
              <div className="text-xs">
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
