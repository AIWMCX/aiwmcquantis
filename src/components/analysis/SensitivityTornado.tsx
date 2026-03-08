import React, { useMemo, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  Cell, ReferenceLine,
} from 'recharts';
import { Activity, ArrowDown, ArrowUp, ChevronDown, ChevronUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

// ── Legacy interface (backward compat) ──

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

// ── New interface ──

export interface SensitivityItem {
  paramName: string;
  lowValue: number;
  highValue: number;
  paramLow: number;
  paramHigh: number;
  impact: number;
}

export interface TornadoChartProps {
  baseValue: number;
  title: string;
  unit: string;
  sensitivities: SensitivityItem[];
  maxBars?: number;
}

// ── Legacy props ──

interface LegacySensitivityTornadoProps {
  tornado: TornadoVariable[];
  mostSensitiveVariable: string;
  leastSensitiveVariable?: string;
  summary: string;
}

type SensitivityTornadoProps =
  | (TornadoChartProps & { tornado?: never; summary?: string; mostSensitiveVariable?: string; leastSensitiveVariable?: string })
  | (LegacySensitivityTornadoProps & { sensitivities?: never; baseValue?: never; title?: never; unit?: never; maxBars?: never });

// ── calculateSensitivities utility ──

export function calculateSensitivities(
  params: Record<string, number>,
  outputFn: (p: Record<string, number>) => number,
  paramKeys: string[],
  shockPct: number = 20,
): SensitivityItem[] {
  const baseOutput = outputFn(params);

  return paramKeys.map((key) => {
    const baseVal = params[key] ?? 0;
    const delta = baseVal * (shockPct / 100);
    const lowParam = baseVal - delta;
    const highParam = baseVal + delta;

    const lowOutput = outputFn({ ...params, [key]: lowParam });
    const highOutput = outputFn({ ...params, [key]: highParam });

    return {
      paramName: key,
      lowValue: lowOutput,
      highValue: highOutput,
      paramLow: lowParam,
      paramHigh: highParam,
      impact: Math.abs(highOutput - lowOutput),
    };
  }).sort((a, b) => b.impact - a.impact);
}

// ── Helpers ──

function formatDelta(value: number, unit: string): string {
  const abs = Math.abs(value);
  const sign = value >= 0 ? '+' : '-';
  if (unit === '$' || unit === '€' || unit === '£') {
    if (abs >= 1_000_000) return `${sign}${unit}${(abs / 1_000_000).toFixed(1)}M`;
    if (abs >= 1_000) return `${sign}${unit}${(abs / 1_000).toFixed(0)}k`;
    return `${sign}${unit}${abs.toFixed(0)}`;
  }
  return `${sign}${abs.toFixed(1)}${unit}`;
}

function formatParam(value: number): string {
  if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (Math.abs(value) >= 1_000) return `${(value / 1_000).toFixed(1)}k`;
  return value.toFixed(value % 1 === 0 ? 0 : 2);
}

// ── Component ──

export function SensitivityTornado(props: SensitivityTornadoProps) {
  const [expanded, setExpanded] = useState(false);

  // Normalize to new format
  const normalized = useMemo(() => {
    if ('sensitivities' in props && props.sensitivities) {
      const sorted = [...props.sensitivities].sort((a, b) => b.impact - a.impact);
      const max = props.maxBars ?? 8;
      return {
        baseValue: props.baseValue,
        title: props.title,
        unit: props.unit,
        items: sorted.slice(0, max),
        maxBars: max,
        summary: '',
        mostSensitive: sorted[0]?.paramName ?? '',
      };
    }

    // Legacy
    const t = props.tornado ?? [];
    const base = t.length > 0
      ? Math.round(t.reduce((a, v) => a + (v.profitAtMinus20 + v.profitAtPlus20) / 2, 0) / t.length)
      : 0;

    const converted: SensitivityItem[] = t.map((v) => ({
      paramName: v.variable,
      lowValue: v.profitAtMinus20,
      highValue: v.profitAtPlus20,
      paramLow: v.baseValue * 0.8,
      paramHigh: v.baseValue * 1.2,
      impact: Math.abs(v.profitAtPlus20 - v.profitAtMinus20),
    })).sort((a, b) => b.impact - a.impact);

    return {
      baseValue: base,
      title: 'Sensitivity Analysis',
      unit: '$',
      items: converted.slice(0, 8),
      maxBars: 8,
      summary: props.summary,
      mostSensitive: props.mostSensitiveVariable,
    };
  }, [props]);

  const { baseValue, title, unit, items, summary, mostSensitive } = normalized;

  if (items.length === 0) return null;

  const chartData = items.map((s) => ({
    name: s.paramName,
    negativeDelta: s.lowValue - baseValue,
    positiveDelta: s.highValue - baseValue,
    low: s.lowValue,
    high: s.highValue,
    paramLow: s.paramLow,
    paramHigh: s.paramHigh,
    range: s.impact,
  }));

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    const item = chartData.find((d) => d.name === label);
    if (!item) return null;
    return (
      <div className="rounded-lg border border-border bg-card p-3 shadow-lg text-sm">
        <p className="font-semibold text-foreground mb-1">{label}</p>
        <div className="space-y-0.5">
          <p className="text-destructive">
            At {formatParam(item.paramLow)}: {formatDelta(item.negativeDelta, unit)} from base
          </p>
          <p className="text-primary">
            At {formatParam(item.paramHigh)}: {formatDelta(item.positiveDelta, unit)} from base
          </p>
          <p className="text-muted-foreground text-xs mt-1">
            Total swing: {formatDelta(item.range, unit)}
          </p>
        </div>
      </div>
    );
  };

  return (
    <div className="section-card space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Activity className="w-5 h-5 text-primary" />
          {title}
        </h3>
        <Badge variant="outline" className="text-xs">±20% sweep</Badge>
      </div>

      {summary && <p className="text-sm text-muted-foreground">{summary}</p>}

      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ left: 110, right: 30, top: 20, bottom: 10 }}
          >
            <XAxis
              type="number"
              tickFormatter={(v) => formatDelta(v, unit)}
              tick={{ fontSize: 11, fill: 'currentColor' }}
              className="text-muted-foreground"
            />
            <YAxis
              type="category"
              dataKey="name"
              width={100}
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
                value: `Base: ${unit === '$' ? '$' : ''}${baseValue.toLocaleString()}${unit !== '$' ? unit : ''}`,
                position: 'top',
                fill: 'currentColor',
                fontSize: 11,
              }}
            />
            <Bar dataKey="negativeDelta" name="Downside" radius={[4, 0, 0, 4]}>
              {chartData.map((_, i) => (
                <Cell key={i} className="fill-destructive" opacity={0.75} />
              ))}
            </Bar>
            <Bar dataKey="positiveDelta" name="Upside" radius={[0, 4, 4, 0]}>
              {chartData.map((_, i) => (
                <Cell key={i} className="fill-primary" opacity={0.75} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-destructive/75" />
          ← Downside scenario
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-primary/75" />
          Upside scenario →
        </span>
      </div>

      {mostSensitive && (
        <p className="text-xs text-muted-foreground text-center">
          <span className="font-semibold text-foreground">{mostSensitive}</span>{' '}
          has the highest impact on profitability. Focus optimization here first.
        </p>
      )}

      {/* Expandable detail cards */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors mx-auto"
      >
        {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        {expanded ? 'Hide details' : `Show top ${Math.min(items.length, 3)} variables`}
      </button>

      {expanded && (
        <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
          {items.slice(0, 3).map((s, i) => (
            <div key={s.paramName} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-muted-foreground w-5">#{i + 1}</span>
                <p className="text-sm font-medium text-foreground">{s.paramName}</p>
              </div>
              <div className="flex items-center gap-3 text-right">
                <div className="text-xs tabular-nums">
                  <span className="text-destructive flex items-center gap-0.5">
                    <ArrowDown className="w-3 h-3" />
                    {formatDelta(s.lowValue - baseValue, unit)}
                  </span>
                  <span className="text-primary flex items-center gap-0.5">
                    <ArrowUp className="w-3 h-3" />
                    {formatDelta(s.highValue - baseValue, unit)}
                  </span>
                </div>
                <Badge
                  variant={s.impact > (baseValue * 0.3) ? 'destructive' : 'outline'}
                  className="text-xs tabular-nums"
                >
                  {formatDelta(s.impact, unit)}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
