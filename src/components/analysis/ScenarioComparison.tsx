import React, { useMemo } from 'react';
import { TrendingUp, TrendingDown, Minus, FileDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { breakEvenMonthsForDisplay } from '@/lib/break-even';
import { cn } from '@/lib/utils';
import { QuantisMath } from '@/lib/quantis-math';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area,
} from 'recharts';

export interface SavedScenario {
  id: string;
  name: string;
  scenario_type: 'base' | 'optimistic' | 'pessimistic' | 'custom';
  params: Record<string, any>;
  output: Record<string, any> | null;
  monte_carlo_result?: Record<string, any> | null;
  confidence_score: number | null;
  is_pinned: boolean;
  created_at: string;
}

interface ScenarioComparisonProps {
  scenarios: SavedScenario[];
  metrics?: string[];
  onExportPDF?: () => void;
}

const SCENARIO_COLORS = ['hsl(var(--primary))', 'hsl(210, 70%, 55%)', 'hsl(150, 60%, 45%)', 'hsl(35, 80%, 55%)'];
const SCENARIO_TYPE_STYLES: Record<string, string> = {
  base: 'bg-primary/10 text-primary border-primary/30',
  optimistic: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30',
  pessimistic: 'bg-destructive/10 text-destructive border-destructive/30',
  custom: 'bg-accent text-accent-foreground border-border',
};

const DEFAULT_METRICS = [
  'revenue_month_6',
  'revenue_month_12',
  'break_even_month',
  'net_margin',
  'gross_margin',
  'survival_probability',
  'monthly_profit',
  'ltv_cac_ratio',
  'cac_payback_months',
  'roi_year_1',
];

const METRIC_LABELS: Record<string, string> = {
  revenue_month_6: 'Revenue Month 6',
  revenue_month_12: 'Revenue Month 12',
  break_even_month: 'Break-even Month',
  net_margin: 'Operating Margin (%)',
  gross_margin: 'Gross Margin (%)',
  survival_probability: 'Survival Probability (%)',
  monthly_profit: 'Monthly Profit ($)',
  ltv_cac_ratio: 'LTV:CAC Ratio',
  cac_payback_months: 'CAC Payback (months)',
  roi_year_1: 'ROI Year 1 (%)',
};

// Higher is better for these metrics (used for best/worst coloring)
const HIGHER_IS_BETTER = new Set([
  'revenue_month_6', 'revenue_month_12', 'net_margin', 'gross_margin',
  'survival_probability', 'monthly_profit', 'ltv_cac_ratio', 'roi_year_1',
]);

function extractMetric(scenario: SavedScenario, metric: string): number | null {
  const o = scenario.output;
  if (!o) return null;

  const fa = o.financial_analysis || o;
  const base = fa?.scenarios?.base || {};
  const ue = fa?.unit_economics || {};
  const ret = fa?.returns || {};
  const mc = scenario.monte_carlo_result || o.monte_carlo || {};

  switch (metric) {
    case 'revenue_month_6': {
      const monthly = base.revenue || fa?.mrr || 0;
      const growth = (scenario.params?.monthly_growth_rate || 0.05);
      return QuantisMath.round(QuantisMath.multiply(monthly, QuantisMath.compound(1, growth, 5)));
    }
    case 'revenue_month_12': {
      const monthly = base.revenue || fa?.mrr || 0;
      const growth = (scenario.params?.monthly_growth_rate || 0.05);
      return QuantisMath.round(QuantisMath.multiply(monthly, QuantisMath.compound(1, growth, 11)));
    }
    case 'break_even_month': return breakEvenMonthsForDisplay(fa);
    case 'net_margin': return base.net_margin ?? null;
    case 'gross_margin': return base.gross_margin ?? null;
    case 'survival_probability': return mc?.probabilityPositive != null ? QuantisMath.round(QuantisMath.multiply(mc.probabilityPositive, 100)) : null;
    case 'monthly_profit': return base.net_profit ?? null;
    case 'ltv_cac_ratio': return ue?.ltv_cac_ratio ?? null;
    case 'cac_payback_months': return ue?.cac_payback_months ?? null;
    case 'roi_year_1': return ret?.roi_year_1 ?? null;
    default: return null;
  }
}

function formatValue(metric: string, value: number | null): string {
  if (value === null) return '—';
  if (metric.includes('margin') || metric.includes('probability') || metric === 'roi_year_1')
    return `${value.toFixed(1)}%`;
  if (metric.includes('revenue') || metric === 'monthly_profit')
    return `$${value.toLocaleString()}`;
  if (metric === 'ltv_cac_ratio') return `${value.toFixed(1)}x`;
  if (metric.includes('month')) return value >= 999 ? 'N/A (unprofitable)' : `${QuantisMath.round(value)} mo`;
  return String(value);
}

export function ScenarioComparison({ scenarios, metrics, onExportPDF }: ScenarioComparisonProps) {
  const displayMetrics = metrics ?? DEFAULT_METRICS;
  const baseScenario = scenarios.find(s => s.scenario_type === 'base') || scenarios[0];

  // Build revenue projection chart data
  const chartData = useMemo(() => {
    const months = 12;
    return Array.from({ length: months }, (_, i) => {
      const point: Record<string, any> = { month: i + 1 };
      scenarios.forEach((s, idx) => {
        const rev = s.output?.financial_analysis?.scenarios?.base?.revenue || s.output?.financial_analysis?.mrr || 0;
        const growth = s.params?.monthly_growth_rate || 0.05;
        point[`s${idx}`] = QuantisMath.round(QuantisMath.multiply(rev, QuantisMath.compound(1, growth, i)));
        // Monte Carlo corridor
        const mc = s.monte_carlo_result || s.output?.monte_carlo;
        if (mc?.percentiles) {
          point[`s${idx}_p10`] = QuantisMath.round(QuantisMath.multiply(mc.percentiles.p10 || QuantisMath.multiply(rev, 0.7), QuantisMath.compound(1, QuantisMath.multiply(growth, 0.5), i)));
          point[`s${idx}_p90`] = QuantisMath.round(QuantisMath.multiply(mc.percentiles.p90 || QuantisMath.multiply(rev, 1.3), QuantisMath.compound(1, QuantisMath.multiply(growth, 1.5), i)));
        }
      });
      return point;
    });
  }, [scenarios]);

  return (
    <div className="space-y-4">
      {/* Comparison Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left p-3 text-xs font-medium text-muted-foreground min-w-[160px]">Metric</th>
                {scenarios.map((s, idx) => (
                  <th key={s.id} className="text-center p-3 min-w-[130px]">
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-xs font-semibold text-foreground">{s.name}</span>
                      <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0', SCENARIO_TYPE_STYLES[s.scenario_type])}>
                        {s.scenario_type}
                      </Badge>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {displayMetrics.map(metric => {
                const values = scenarios.map(s => extractMetric(s, metric));
                const numericValues = values.filter((v): v is number => v !== null);
                const higherBetter = HIGHER_IS_BETTER.has(metric);
                const best = numericValues.length > 0 ? (higherBetter ? Math.max(...numericValues) : Math.min(...numericValues)) : null;
                const worst = numericValues.length > 0 ? (higherBetter ? Math.min(...numericValues) : Math.max(...numericValues)) : null;
                const baseValue = baseScenario ? extractMetric(baseScenario, metric) : null;

                return (
                  <tr key={metric} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                    <td className="p-3 text-xs font-medium text-foreground">{METRIC_LABELS[metric] || metric}</td>
                    {values.map((val, idx) => {
                      const isBest = val !== null && val === best && numericValues.length > 1;
                      const isWorst = val !== null && val === worst && numericValues.length > 1 && best !== worst;
                      const delta = val !== null && baseValue !== null && scenarios[idx] !== baseScenario
                        ? QuantisMath.toNumber(QuantisMath.multiply(QuantisMath.divide(QuantisMath.subtract(val, baseValue), QuantisMath.abs(baseValue || 1)), 100))
                        : null;

                      return (
                        <td
                          key={idx}
                          className={cn(
                            'p-3 text-center text-xs tabular-nums',
                            isBest && 'bg-emerald-500/5',
                            isWorst && 'bg-destructive/5'
                          )}
                        >
                          <span className="font-semibold text-foreground">{formatValue(metric, val)}</span>
                          {delta !== null && delta !== 0 && (
                            <span className={cn(
                              'ml-1 inline-flex items-center text-[10px]',
                              (higherBetter ? delta > 0 : delta < 0) ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive'
                            )}>
                              {delta > 0 ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
                              {QuantisMath.toNumber(QuantisMath.abs(delta)).toFixed(0)}%
                            </span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Revenue Projection Chart */}
      <div className="rounded-xl border border-border bg-card p-4">
        <h3 className="text-sm font-semibold text-foreground mb-3">Monthly Revenue Projection</h3>
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} className="fill-muted-foreground" label={{ value: 'Month', position: 'insideBottom', offset: -2, fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} className="fill-muted-foreground" tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
              <Tooltip
                contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }}
                formatter={(value: number, name: string) => {
                  const idx = parseInt(name.replace('s', ''));
                  return [`$${value.toLocaleString()}`, scenarios[idx]?.name || name];
                }}
              />
              <Legend formatter={(value: string) => {
                const idx = parseInt(value.replace('s', ''));
                return scenarios[idx]?.name || value;
              }} />
              {scenarios.map((s, idx) => {
                const mc = s.monte_carlo_result || s.output?.monte_carlo;
                return (
                  <React.Fragment key={s.id}>
                    {mc?.percentiles && (
                      <Area
                        dataKey={`s${idx}_p90`}
                        stroke="none"
                        fill={SCENARIO_COLORS[idx]}
                        fillOpacity={0.08}
                        name={`_corridor_${idx}`}
                        legendType="none"
                      />
                    )}
                    <Line
                      type="monotone"
                      dataKey={`s${idx}`}
                      stroke={SCENARIO_COLORS[idx]}
                      strokeWidth={2}
                      dot={false}
                      name={`s${idx}`}
                    />
                  </React.Fragment>
                );
              })}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Export button */}
      {onExportPDF && (
        <Button onClick={onExportPDF} variant="outline" size="sm" className="gap-1.5 text-xs">
          <FileDown className="w-3.5 h-3.5" /> Export Comparison as PDF
        </Button>
      )}
    </div>
  );
}
